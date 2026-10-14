import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

const counterOfferSchema = z.object({
  unitPrices: z.record(z.string(), z.number().positive()),
  setupCost: z.number().min(0).optional(),
  decorationCost: z.number().min(0).optional(),
  freightCost: z.number().min(0).optional(),
  message: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(["ADMIN", "INTERNAL_SALES"]);
    const { id: quoteId } = await params;
    const body = await request.json();
    const data = counterOfferSchema.parse(body);

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { rfq: true },
    });

    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    const counterOffer = await prisma.counterOffer.create({
      data: {
        quoteId,
        offeredByInternal: true,
        unitPrices: data.unitPrices,
        setupCost: data.setupCost,
        decorationCost: data.decorationCost,
        freightCost: data.freightCost,
        message: data.message,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "counter_offer_sent",
        entityType: "quote",
        entityId: quoteId,
        details: { counterOfferId: counterOffer.id },
      },
    });

    return NextResponse.json(counterOffer, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: e.errors }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
