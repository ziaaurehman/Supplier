import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

const editQuoteSchema = z.object({
  setupCost: z.number().min(0).optional(),
  decorationCost: z.number().min(0).optional(),
  decorationCostType: z.enum(["per_unit", "flat_rate"]).optional(),
  freightCost: z.number().min(0).optional(),
  sampleCost: z.number().min(0).optional(),
  leadTimeDays: z.number().positive().nullable().optional(),
  minimumOrderQty: z.number().positive().nullable().optional(),
  priceTiers: z
    .array(
      z.object({
        id: z.string().uuid(),
        unitPrice: z.number().positive(),
      })
    )
    .optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(["ADMIN", "INTERNAL_SALES"]);
    const { id: quoteId } = await params;
    const body = await request.json();
    const data = editQuoteSchema.parse(body);

    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (data.setupCost !== undefined) updateData.setupCost = data.setupCost;
    if (data.decorationCost !== undefined) updateData.decorationCost = data.decorationCost;
    if (data.decorationCostType !== undefined) updateData.decorationCostType = data.decorationCostType;
    if (data.freightCost !== undefined) updateData.freightCost = data.freightCost;
    if (data.sampleCost !== undefined) updateData.sampleCost = data.sampleCost;
    if (data.leadTimeDays !== undefined) updateData.leadTimeDays = data.leadTimeDays;
    if (data.minimumOrderQty !== undefined) updateData.minimumOrderQty = data.minimumOrderQty;

    if (Object.keys(updateData).length > 0) {
      await prisma.quote.update({ where: { id: quoteId }, data: updateData });
    }

    if (data.priceTiers) {
      await Promise.all(
        data.priceTiers.map((tier) =>
          prisma.quotePriceTier.update({
            where: { id: tier.id },
            data: { unitPrice: tier.unitPrice },
          })
        )
      );
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "quote_edited",
        entityType: "quote",
        entityId: quoteId,
        details: { changes: data },
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: e.errors }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
