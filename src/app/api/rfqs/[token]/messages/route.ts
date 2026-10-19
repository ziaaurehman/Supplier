import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notifyStaffOfMessage } from "@/lib/messageNotifications";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const rfq = await prisma.rfq.findUnique({ where: { token } });
    if (!rfq) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

    const messages = await prisma.message.findMany({
      where: { rfqId: rfq.id },
      include: { sender: { select: { fullName: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Staff previewing the supplier page must not mark messages as read by the supplier.
    const preview = !!(await getCurrentUser().catch(() => null));
    const unreadIds = messages.filter((m) => m.senderType === "internal" && !m.readAt).map((m) => m.id);
    if (!preview && unreadIds.length > 0) {
      await prisma.message.updateMany({ where: { id: { in: unreadIds } }, data: { readAt: new Date() } });
    }

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        senderType: m.senderType,
        senderName: m.sender?.fullName ?? null,
        createdAt: m.createdAt,
        isNew: unreadIds.includes(m.id),
      })),
    });
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
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "Message content required" }, { status: 400 });
    }

    const msg = await prisma.message.create({
      data: {
        rfqId: rfq.id,
        senderType: "supplier",
        content,
      },
    });

    after(() => notifyStaffOfMessage(msg.id));

    return NextResponse.json({
      message: {
        id: msg.id,
        content: msg.content,
        senderType: msg.senderType,
        senderName: null,
        createdAt: msg.createdAt,
        isNew: false,
      },
    }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
