import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/email";
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
      priceValidUntil: z.string().nullable().optional(),
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
      },
    });

    if (!rfq) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    if (rfq.tokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }
    if (rfq.project.quoteDeadline && new Date(rfq.project.quoteDeadline) < new Date()) {
      return NextResponse.json({ error: "Quote deadline has passed" }, { status: 400 });
    }
    if (rfq.status === "declined") {
      return NextResponse.json({ error: "This RFQ was declined" }, { status: 400 });
    }

    const body = await request.json();
    const data = submitQuoteSchema.parse(body);

    await prisma.quote.deleteMany({ where: { rfqId: rfq.id } });

    const quotes = await Promise.all(
      data.items.map(async (item) => {
        return prisma.quote.create({
          data: {
            rfqId: rfq.id,
            projectItemId: item.projectItemId,
            currency: item.currency,
            setupCost: item.setupCost,
            decorationCost: item.decorationCost,
            decorationCostType: item.decorationCostType,
            freightCost: item.freightCost,
            sampleCost: item.sampleCost,
            leadTimeDays: item.leadTimeDays,
            minimumOrderQty: item.minimumOrderQty,
            priceValidUntil: item.priceValidUntil
              ? new Date(item.priceValidUntil)
              : undefined,
            alternativeProduct: item.alternativeProduct,
            countryOfOrigin: item.countryOfOrigin,
            supplierItemNumber: item.supplierItemNumber,
            comment: item.comment,
            priceTiers: {
              create: item.priceTiers.map((tier) => ({
                quantity: tier.quantity,
                unitPrice: tier.unitPrice,
              })),
            },
          },
          include: { priceTiers: true },
        });
      })
    );

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
        action: "quote_submitted",
        entityType: "rfq",
        entityId: rfq.id,
        details: { supplierId: rfq.supplierId, itemCount: quotes.length },
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
      sendNotificationEmail("quote_submitted", {
        projectTitle: fullRfq.project.title,
        projectNumber: fullRfq.project.projectNumber,
        supplierName: fullRfq.supplier.name,
        notifyEmails: admins.map((u) => u.email),
      });
    }

    return NextResponse.json({ success: true, quotes });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: e.errors }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
