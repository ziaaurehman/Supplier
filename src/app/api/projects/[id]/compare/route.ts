import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        items: {
          include: {
            quantityTiers: { orderBy: { sortOrder: "asc" } },
          },
          orderBy: { sortOrder: "asc" },
        },
        rfqs: {
          include: {
            supplier: { select: { id: true, name: true } },
            quotes: {
              include: {
                priceTiers: true,
                counterOffers: { orderBy: { createdAt: "asc" } },
              },
            },
          },
        },
      },
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const comparison = project.items.map((item) => {
      const tiers = item.quantityTiers;

      const supplierQuotes = project.rfqs.map((rfq) => {
        const quote = rfq.quotes.find((q) => q.projectItemId === item.id);
        if (!quote) {
          return {
            supplierId: rfq.supplier.id,
            supplierName: rfq.supplier.name,
            rfqStatus: rfq.status,
            declineReason: rfq.declineReason,
            quote: null,
            totals: null,
          };
        }

        const totals = tiers.map((tier) => {
          const priceTier = quote.priceTiers.find(
            (pt) => pt.quantity === tier.quantity
          );
          if (!priceTier) return { quantity: tier.quantity, total: null, unitTotal: null };

          const unitPrice = Number(priceTier.unitPrice);
          const setupCost = Number(quote.setupCost);
          const freightCost = Number(quote.freightCost);
          const sampleCost = Number(quote.sampleCost || 0);
          const decorationCost = Number(quote.decorationCost);
          const decoTotal =
            quote.decorationCostType === "per_unit"
              ? decorationCost * tier.quantity
              : decorationCost;

          const total =
            unitPrice * tier.quantity +
            setupCost +
            decoTotal +
            freightCost +
            sampleCost;

          return {
            quantity: tier.quantity,
            unitPrice,
            total: Math.round(total * 100) / 100,
            unitTotal: Math.round((total / tier.quantity) * 100) / 100,
          };
        });

        return {
          supplierId: rfq.supplier.id,
          supplierName: rfq.supplier.name,
          rfqStatus: rfq.status,
          quote: {
            id: quote.id,
            currency: quote.currency,
            setupCost: Number(quote.setupCost),
            decorationCost: Number(quote.decorationCost),
            decorationCostType: quote.decorationCostType,
            freightCost: Number(quote.freightCost),
            sampleCost: Number(quote.sampleCost || 0),
            leadTimeDays: quote.leadTimeDays,
            minimumOrderQty: quote.minimumOrderQty,
            priceValidUntil: quote.priceValidUntil,
            isWinner: quote.isWinner,
            comment: quote.comment,
            alternativeProduct: quote.alternativeProduct,
            counterOffers: quote.counterOffers.map((co) => ({
              ...co,
              setupCost: co.setupCost ? Number(co.setupCost) : null,
              decorationCost: co.decorationCost ? Number(co.decorationCost) : null,
              freightCost: co.freightCost ? Number(co.freightCost) : null,
            })),
            priceTiers: quote.priceTiers.map((pt) => ({
              id: pt.id,
              quantity: pt.quantity,
              unitPrice: Number(pt.unitPrice),
            })),
          },
          totals,
        };
      });

      return {
        item: { id: item.id, name: item.name },
        tiers: tiers.map((t) => t.quantity),
        supplierQuotes,
      };
    });

    return NextResponse.json({
      project: {
        id: project.id,
        projectNumber: project.projectNumber,
        title: project.title,
        quoteDeadline: project.quoteDeadline,
        status: project.status,
      },
      comparison,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
