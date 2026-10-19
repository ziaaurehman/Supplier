import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignedUrls } from "@/lib/supabase/storage";
import { getCurrentUser } from "@/lib/auth";
import { isDeadlinePassed } from "@/lib/dates";

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
                attachments: {
                  where: { visibleToSupplier: true, uploadedBySupplier: false },
                  orderBy: { createdAt: "asc" },
                },
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

    // A signed-in team member opening the link is previewing it, not the supplier responding.
    const staffViewer = await getCurrentUser().catch(() => null);
    const preview = !!staffViewer;

    if (rfq.status === "sent" && !preview) {
      await prisma.rfq.update({
        where: { id: rfq.id },
        data: { status: "opened", openedAt: new Date() },
      });

      await prisma.auditLog.create({
        data: {
          action: "rfq_opened",
          entityType: "rfq",
          entityId: rfq.id,
          details: { supplierId: rfq.supplierId, supplierName: rfq.supplier.name },
        },
      });
    }

    const unreadMessages = await prisma.message.count({
      where: { rfqId: rfq.id, senderType: "internal", readAt: null },
    });

    const urls = await getSignedUrls(
      rfq.project.items.flatMap((i) => i.attachments.map((a) => a.fileUrl))
    );
    const items = rfq.project.items.map(({ attachments, ...item }) => ({
      ...item,
      attachments: attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        mimeType: a.mimeType,
        signedUrl: urls.get(a.fileUrl) ?? null,
      })),
    }));

    return NextResponse.json({
      preview,
      rfqId: rfq.id,
      status: rfq.status === "sent" && !preview ? "opened" : rfq.status,
      sentAt: rfq.sentAt,
      respondedAt: rfq.respondedAt,
      declineReason: rfq.declineReason,
      declineReasonText: rfq.declineReasonText,
      projectNumber: rfq.project.projectNumber,
      deadlinePassed: isDeadlinePassed(rfq.project.quoteDeadline),
      unreadMessages,
      supplierId: rfq.supplier.id,
      supplierName: rfq.supplier.name,
      supplierLanguage: rfq.supplier.language,
      projectTitle: rfq.project.title,
      quoteDeadline: rfq.project.quoteDeadline,
      items,
      existingQuotes: rfq.quotes,
      canSubmit:
        rfq.status !== "declined" &&
        !isDeadlinePassed(rfq.project.quoteDeadline),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
