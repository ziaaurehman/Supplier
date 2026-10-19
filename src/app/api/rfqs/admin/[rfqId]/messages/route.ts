import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notifySupplierOfMessage } from "@/lib/messageNotifications";

async function loadAccessibleRfq(rfqId: string, user: { id: string; role: string }) {
  const rfq = await prisma.rfq.findUnique({
    where: { id: rfqId },
    select: { id: true, project: { select: { createdBy: true } } },
  });
  if (!rfq) return null;
  if (user.role === "FIELD_SALES" && rfq.project.createdBy !== user.id) return null;
  return rfq;
}

function errorResponse(e: unknown) {
  const message = e instanceof Error ? e.message : "Internal error";
  if (message === "Unauthorized" || message === "Forbidden") {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ rfqId: string }> }
) {
  try {
    const user = await requireUser(["ADMIN", "INTERNAL_SALES", "FIELD_SALES"]);
    const { rfqId } = await params;
    if (!(await loadAccessibleRfq(rfqId, user))) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { rfqId },
      include: { sender: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });

    const unreadIds = messages.filter((m) => m.senderType === "supplier" && !m.readAt).map((m) => m.id);
    if (unreadIds.length > 0) {
      await prisma.message.updateMany({ where: { id: { in: unreadIds } }, data: { readAt: new Date() } });
    }

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        senderType: m.senderType,
        senderName: m.sender?.fullName || m.sender?.email || null,
        createdAt: m.createdAt,
        isNew: unreadIds.includes(m.id),
      })),
    });
  } catch (e: unknown) {
    return errorResponse(e);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ rfqId: string }> }
) {
  try {
    const user = await requireUser(["ADMIN", "INTERNAL_SALES", "FIELD_SALES"]);
    const { rfqId } = await params;
    if (!(await loadAccessibleRfq(rfqId, user))) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }

    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "Message content required" }, { status: 400 });
    }

    const msg = await prisma.message.create({
      data: {
        rfqId,
        senderType: "internal",
        senderUserId: user.id,
        content,
      },
    });

    after(() => notifySupplierOfMessage(msg.id));

    return NextResponse.json({
      message: {
        id: msg.id,
        content: msg.content,
        senderType: msg.senderType,
        senderName: user.fullName,
        createdAt: msg.createdAt,
        isNew: false,
      },
    }, { status: 201 });
  } catch (e: unknown) {
    return errorResponse(e);
  }
}
