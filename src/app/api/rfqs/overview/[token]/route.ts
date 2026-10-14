import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const rfq = await prisma.rfq.findUnique({
      where: { token },
      include: { supplier: true },
    });

    if (!rfq) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const allRfqs = await prisma.rfq.findMany({
      where: { supplierId: rfq.supplierId },
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            title: true,
            customerName: true,
            quoteDeadline: true,
          },
        },
        quotes: { select: { id: true, isWinner: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const pending = allRfqs.filter((r) => ["sent", "opened"].includes(r.status));
    const past = allRfqs.filter((r) => !["sent", "opened"].includes(r.status));

    return NextResponse.json({
      supplierName: rfq.supplier.name,
      pending: pending.map((r) => ({
        token: r.token,
        projectTitle: r.project.title,
        projectNumber: r.project.projectNumber,
        customerReference: r.project.customerName,
        quoteDeadline: r.project.quoteDeadline,
        status: r.status,
      })),
      past: past.map((r) => ({
        token: r.token,
        projectTitle: r.project.title,
        projectNumber: r.project.projectNumber,
        status: r.status,
        isWinner: r.quotes.some((q) => q.isWinner),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
