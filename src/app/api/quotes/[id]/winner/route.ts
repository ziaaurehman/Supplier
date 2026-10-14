import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(["ADMIN", "INTERNAL_SALES"]);
    const { id: quoteId } = await params;

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { rfq: true },
    });

    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    await prisma.quote.updateMany({
      where: {
        rfq: { projectId: quote.rfq.projectId },
        projectItemId: quote.projectItemId,
      },
      data: { isWinner: false },
    });

    await prisma.quote.update({
      where: { id: quoteId },
      data: { isWinner: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "winner_selected",
        entityType: "quote",
        entityId: quoteId,
        details: {
          projectId: quote.rfq.projectId,
          supplierId: quote.rfq.supplierId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
