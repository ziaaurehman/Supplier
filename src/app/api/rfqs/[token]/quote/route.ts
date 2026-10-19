import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/email";
import { isDeadlinePassed, isPastDateForServer } from "@/lib/dates";
import { z } from "zod";

const submitQuoteSchema = z.object({
  items: z.array(
    z.object({
      projectItemId: z.string().uuid(),
      currency: z.string().default("EUR"),
      setupCost: z.number().min(0),
      decorationCost: z.number().min(0),
      decorationCostType: z.enum(["per_unit", "flat_rate"]).default("flat_rate"),
      freightCost: z.number().min(0),
      sampleCost: z.number().min(0).optional(),
      leadTimeDays: z.number().positive().nullable().optional(),
      minimumOrderQty: z.number().positive().nullable().optional(),
      priceValidUntil: z.string().nullable().optional()
        .refine((v) => !v || !isPastDateForServer(v), "Price valid until cannot be in the past"),
      alternativeProduct: z.string().nullable().optional(),
      countryOfOrigin: z.string().nullable().optional(),
      supplierItemNumber: z.string().nullable().optional(),
      comment: z.string().nullable().optional(),
      priceTiers: z.array(
        z.object({
          quantity: z.number().positive(),
          unitPrice: z.number().positive(),
        })
      ).min(1),
    })
  ).min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const rfq = await prisma.rfq.findUnique({
      where: { token },
      include: {
        project: { select: { quoteDeadline: true } },
        supplier: { select: { name: true } },
      },
    });

    if (!rfq) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    if (rfq.tokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }
    if (isDeadlinePassed(rfq.project.quoteDeadline)) {
      return NextResponse.json({ error: "Quote deadline has passed" }, { status: 400 });
    }
    if (rfq.status === "declined") {
      return NextResponse.json({ error: "This RFQ was declined" }, { status: 400 });
    }

    const body = await request.json();
    const data = submitQuoteSchema.parse(body);

    const projectItemIds = new Set(
      (await prisma.projectItem.findMany({ where: { projectId: rfq.projectId }, select: { id: true } })).map((i) => i.id)
    );
    if (data.items.some((item) => !projectItemIds.has(item.projectItemId))) {
      return NextResponse.json({ error: "Item does not belong to this request" }, { status: 400 });
    }

    // Revisions update quotes in place (matching price rows by quantity) so that counter-offers
    // and their price references survive; open counter-offers are marked superseded.
    const { quotes, isRevision } = await prisma.$transaction(async (tx) => {
      const existing = await tx.quote.findMany({ where: { rfqId: rfq.id }, include: { priceTiers: true } });
      const existingByItem = new Map(existing.map((q) => [q.projectItemId, q]));
      const submittedItemIds = new Set(data.items.map((i) => i.projectItemId));

      const saved = [];
      for (const item of data.items) {
        const fields = {
          currency: item.currency,
          setupCost: item.setupCost,
          decorationCost: item.decorationCost,
          decorationCostType: item.decorationCostType,
          freightCost: item.freightCost,
          sampleCost: item.sampleCost ?? 0,
          leadTimeDays: item.leadTimeDays ?? null,
          minimumOrderQty: item.minimumOrderQty ?? null,
          priceValidUntil: item.priceValidUntil ? new Date(item.priceValidUntil) : null,
          alternativeProduct: item.alternativeProduct ?? null,
          countryOfOrigin: item.countryOfOrigin ?? null,
          supplierItemNumber: item.supplierItemNumber ?? null,
          comment: item.comment ?? null,
        };
        const current = existingByItem.get(item.projectItemId);

        if (!current) {
          saved.push(await tx.quote.create({
            data: {
              rfqId: rfq.id,
              projectItemId: item.projectItemId,
              ...fields,
              priceTiers: { create: item.priceTiers.map((tier) => ({ quantity: tier.quantity, unitPrice: tier.unitPrice })) },
            },
            include: { priceTiers: true },
          }));
          continue;
        }

        await tx.quote.update({ where: { id: current.id }, data: { ...fields, submittedAt: new Date() } });
        const submittedQuantities = new Set(item.priceTiers.map((tier) => tier.quantity));
        for (const tier of item.priceTiers) {
          const match = current.priceTiers.find((pt) => pt.quantity === tier.quantity);
          if (match) {
            await tx.quotePriceTier.update({ where: { id: match.id }, data: { unitPrice: tier.unitPrice } });
          } else {
            await tx.quotePriceTier.create({ data: { quoteId: current.id, quantity: tier.quantity, unitPrice: tier.unitPrice } });
          }
        }
        await tx.quotePriceTier.deleteMany({
          where: { quoteId: current.id, quantity: { notIn: [...submittedQuantities] } },
        });
        saved.push(await tx.quote.findUniqueOrThrow({ where: { id: current.id }, include: { priceTiers: true } }));
      }

      const droppedIds = existing.filter((q) => !submittedItemIds.has(q.projectItemId)).map((q) => q.id);
      if (droppedIds.length > 0) {
        await tx.quote.deleteMany({ where: { id: { in: droppedIds } } });
      }

      if (existing.length > 0) {
        await tx.counterOffer.updateMany({
          where: { quoteId: { in: existing.map((q) => q.id) }, status: "pending" },
          data: { status: "superseded", respondedAt: new Date() },
        });
      }

      return { quotes: saved, isRevision: existing.length > 0 };
    });

    await prisma.rfq.update({
      where: { id: rfq.id },
      data: { status: "quoted", respondedAt: new Date() },
    });

    const projectRfqs = await prisma.rfq.findMany({
      where: { projectId: rfq.projectId },
      select: { status: true },
    });
    const allResponded = projectRfqs.every((r) => r.status === "quoted" || r.status === "declined");
    const hasQuote = projectRfqs.some((r) => r.status === "quoted");
    if (hasQuote) {
      await prisma.project.update({
        where: { id: rfq.projectId },
        data: { status: allResponded ? "completed" : "quoting" },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: isRevision ? "quote_revised" : "quote_submitted",
        entityType: "rfq",
        entityId: rfq.id,
        details: { supplierId: rfq.supplierId, supplierName: rfq.supplier.name, itemCount: quotes.length },
      },
    });

    const fullRfq = await prisma.rfq.findUnique({
      where: { id: rfq.id },
      include: {
        supplier: true,
        project: { select: { title: true, projectNumber: true } },
      },
    });
    if (fullRfq) {
      const admins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "INTERNAL_SALES"] }, isActive: true },
        select: { email: true },
      });
      after(() =>
        sendNotificationEmail(isRevision ? "quote_revised" : "quote_submitted", {
          projectTitle: fullRfq.project.title,
          projectNumber: fullRfq.project.projectNumber,
          supplierName: fullRfq.supplier.name,
          notifyEmails: admins.map((u) => u.email),
        })
      );
    }

    return NextResponse.json({ success: true, quotes });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message || "Validation error", details: e.errors }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
