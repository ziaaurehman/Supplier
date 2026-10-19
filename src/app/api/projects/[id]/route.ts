import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isPastDateForServer } from "@/lib/dates";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: {
        id,
        ...(user.role === "FIELD_SALES" && { createdBy: user.id }),
      },
      include: {
        items: {
          include: { quantityTiers: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
        rfqs: {
          include: {
            supplier: { include: { contacts: true } },
            quotes: { include: { priceTiers: true } },
            _count: { select: { messages: { where: { senderType: "supplier", readAt: null } } } },
          },
        },
        creator: { select: { fullName: true, email: true } },
        attachments: true,
      },
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      project: {
        id: project.id,
        projectNumber: project.projectNumber,
        title: project.title,
        customerReference: project.customerName,
        quoteDeadline: project.quoteDeadline,
        deliveryDate: project.requestedDeliveryDate,
        status: project.status,
        internalDescription: project.internalDescription,
        items: project.items,
        rfqs: project.rfqs.map(({ _count, ...rfq }) => ({ ...rfq, unreadCount: _count.messages })),
        creator: project.creator,
        attachments: project.attachments,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(["ADMIN", "INTERNAL_SALES"]);
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.project.findUnique({
      where: { id },
      select: { quoteDeadline: true, requestedDeliveryDate: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const toYmd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
    const newDeadline: string | null = body.quoteDeadline || null;
    const newDelivery: string | null = body.deliveryDate || body.requestedDeliveryDate || null;
    const deadlineChanged = !!newDeadline && newDeadline !== toYmd(existing.quoteDeadline);
    const deliveryChanged = !!newDelivery && newDelivery !== toYmd(existing.requestedDeliveryDate);

    if (deadlineChanged && isPastDateForServer(newDeadline)) {
      return NextResponse.json({ error: "Quote deadline cannot be in the past" }, { status: 400 });
    }
    if (deliveryChanged && isPastDateForServer(newDelivery)) {
      return NextResponse.json({ error: "Delivery date cannot be in the past" }, { status: 400 });
    }
    const effectiveDeadline = newDeadline ?? toYmd(existing.quoteDeadline);
    const effectiveDelivery = newDelivery ?? toYmd(existing.requestedDeliveryDate);
    if (
      (deadlineChanged || deliveryChanged) &&
      effectiveDeadline && effectiveDelivery && effectiveDelivery < effectiveDeadline
    ) {
      return NextResponse.json({ error: "Delivery date cannot be before the quote deadline" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.title) updateData.title = body.title;
    if (body.customerReference !== undefined || body.customerName !== undefined) {
      updateData.customerName = body.customerReference ?? body.customerName;
    }
    if (body.quoteDeadline) updateData.quoteDeadline = new Date(body.quoteDeadline);
    if (body.deliveryDate || body.requestedDeliveryDate) {
      updateData.requestedDeliveryDate = new Date(body.deliveryDate || body.requestedDeliveryDate);
    }
    if (body.internalDescription !== undefined) {
      updateData.internalDescription = body.internalDescription;
    }
    if (body.status) updateData.status = body.status;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ project });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(["ADMIN"]);
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, projectNumber: true, status: true },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (project.status === "cancelled") {
      await prisma.project.delete({ where: { id } });
    } else {
      await prisma.project.update({
        where: { id },
        data: { status: "cancelled" },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: project.status === "cancelled" ? "project_deleted" : "project_cancelled",
        entityType: "project",
        entityId: id,
        details: { projectNumber: project.projectNumber },
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
