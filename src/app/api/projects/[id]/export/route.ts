import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const winnerOnly = searchParams.get("winner") === "true";

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        items: {
          include: { quantityTiers: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
        rfqs: {
          include: {
            supplier: true,
            quotes: {
              where: winnerOnly ? { isWinner: true } : {},
              include: { priceTiers: true },
            },
          },
        },
      },
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const rows: Record<string, string | number>[] = [];

    for (const rfq of project.rfqs) {
      for (const quote of rfq.quotes) {
        const item = project.items.find((i) => i.id === quote.projectItemId);
        if (!item) continue;

        for (const tier of quote.priceTiers) {
          const unitPrice = Number(tier.unitPrice);
          const setupCost = Number(quote.setupCost);
          const freightCost = Number(quote.freightCost);
          const sampleCost = Number(quote.sampleCost || 0);
          const decorationCost = Number(quote.decorationCost);
          const decoTotal =
            quote.decorationCostType === "per_unit"
              ? decorationCost * tier.quantity
              : decorationCost;
          const total = unitPrice * tier.quantity + setupCost + decoTotal + freightCost + sampleCost;

          rows.push({
            "Project": project.projectNumber,
            "Item": item.name,
            "Supplier": rfq.supplier.name,
            "Quantity": tier.quantity,
            "Unit Price": unitPrice,
            "Setup Cost": setupCost,
            "Decoration Cost": decorationCost,
            "Decoration Type": quote.decorationCostType,
            "Freight Cost": freightCost,
            "Sample Cost": sampleCost,
            "Total Cost": Math.round(total * 100) / 100,
            "Unit Total": Math.round((total / tier.quantity) * 100) / 100,
            "Lead Time (Days)": quote.leadTimeDays || "",
            "MOQ": quote.minimumOrderQty || "",
            "Price Valid Until": quote.priceValidUntil ? new Date(quote.priceValidUntil).toISOString().split("T")[0] : "",
            "Winner": quote.isWinner ? "Yes" : "No",
            "Currency": quote.currency,
          });
        }
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No quotes to export" }, { status: 404 });
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((h) => {
          const val = String(row[h] ?? "");
          return val.includes(",") ? `"${val}"` : val;
        }).join(",")
      ),
    ];

    return new NextResponse(csvLines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${project.projectNumber}-quotes.csv"`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
