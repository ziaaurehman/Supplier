import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const respondSchema = z.object({
  counterOfferId: z.string().uuid(),
  action: z.enum(["accept", "decline", "counter"]),
  unitPrices: z.record(z.string(), z.number().positive()).optional(),
  setupCost: z.number().min(0).optional(),
  decorationCost: z.number().min(0).optional(),
  freightCost: z.number().min(0).optional(),
  message: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const rfq = await prisma.rfq.findUnique({
      where: { token },
      include: {
        quotes: {
          include: {
            counterOffers: { orderBy: { createdAt: "asc" } },
            priceTiers: true,
          },
        },
      },
    });
    if (!rfq) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

    const pendingOffers = rfq.quotes.flatMap((q) =>
      q.counterOffers
        .filter((co) => co.status === "pending" && co.offeredByInternal)
        .map((co) => ({
          ...co,
          quoteId: q.id,
          setupCost: co.setupCost ? Number(co.setupCost) : null,
          decorationCost: co.decorationCost ? Number(co.decorationCost) : null,
          freightCost: co.freightCost ? Number(co.freightCost) : null,
        }))
    );

    return NextResponse.json({ counterOffers: pendingOffers });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const rfq = await prisma.rfq.findUnique({ where: { token } });
    if (!rfq) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    if (rfq.tokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    const body = await request.json();
    const data = respondSchema.parse(body);

    const counterOffer = await prisma.counterOffer.findUnique({
      where: { id: data.counterOfferId },
      include: { quote: true },
    });

    if (!counterOffer || counterOffer.status !== "pending") {
      return NextResponse.json({ error: "Counter offer not found or already responded" }, { status: 404 });
    }

    if (data.action === "accept") {
      await prisma.counterOffer.update({
        where: { id: data.counterOfferId },
        data: { status: "accepted", respondedAt: new Date() },
      });

      const prices = counterOffer.unitPrices as Record<string, number>;
      await Promise.all(
        Object.entries(prices).map(([tierId, price]) =>
          prisma.quotePriceTier.update({
            where: { id: tierId },
            data: { unitPrice: price },
          })
        )
      );
      if (counterOffer.setupCost != null) {
        await prisma.quote.update({
          where: { id: counterOffer.quoteId },
          data: {
            setupCost: counterOffer.setupCost,
            ...(counterOffer.decorationCost != null && { decorationCost: counterOffer.decorationCost }),
            ...(counterOffer.freightCost != null && { freightCost: counterOffer.freightCost }),
          },
        });
      }
    } else if (data.action === "decline") {
      await prisma.counterOffer.update({
        where: { id: data.counterOfferId },
        data: { status: "declined", respondedAt: new Date() },
      });
    } else if (data.action === "counter") {
      await prisma.counterOffer.update({
        where: { id: data.counterOfferId },
        data: { status: "countered", respondedAt: new Date() },
      });

      await prisma.counterOffer.create({
        data: {
          quoteId: counterOffer.quoteId,
          offeredByInternal: false,
          unitPrices: data.unitPrices || {},
          setupCost: data.setupCost,
          decorationCost: data.decorationCost,
          freightCost: data.freightCost,
          message: data.message,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: e.errors }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
