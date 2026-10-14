import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const rfq = await prisma.rfq.findUnique({
      where: { token },
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            title: true,
            customerName: true,
            quoteDeadline: true,
            requestedDeliveryDate: true,
            items: {
              include: {
                quantityTiers: { orderBy: { sortOrder: "asc" } },
              },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        supplier: { select: { id: true, name: true, language: true } },
        quotes: { include: { priceTiers: true } },
      },
    });

    if (!rfq) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

    if (rfq.tokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "This link has expired" }, { status: 410 });
    }

    if (rfq.status === "sent") {
      await prisma.rfq.update({
        where: { id: rfq.id },
        data: { status: "opened", openedAt: new Date() },
      });

      await prisma.auditLog.create({
        data: {
          action: "rfq_opened",
          entityType: "rfq",
          entityId: rfq.id,
          details: { supplierId: rfq.supplierId },
        },
      });
    }

    return NextResponse.json({
      rfqId: rfq.id,
      supplierId: rfq.supplier.id,
      supplierName: rfq.supplier.name,
      supplierLanguage: rfq.supplier.language,
      projectTitle: rfq.project.title,
      quoteDeadline: rfq.project.quoteDeadline,
      items: rfq.project.items,
      existingQuotes: rfq.quotes,
      canSubmit:
        rfq.status !== "declined" &&
        (!rfq.project.quoteDeadline || new Date(rfq.project.quoteDeadline) >= new Date()),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
