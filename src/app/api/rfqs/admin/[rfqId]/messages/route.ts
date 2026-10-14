import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ rfqId: string }> }
) {
  try {
    await requireUser(["ADMIN", "INTERNAL_SALES", "FIELD_SALES"]);
    const { rfqId } = await params;

    const messages = await prisma.message.findMany({
      where: { rfqId },
      include: { sender: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        senderType: m.senderType,
        senderName: m.sender?.fullName || m.sender?.email || null,
        createdAt: m.createdAt,
      })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ rfqId: string }> }
) {
  try {
    const user = await requireUser(["ADMIN", "INTERNAL_SALES", "FIELD_SALES"]);
    const { rfqId } = await params;

    const rfq = await prisma.rfq.findUnique({ where: { id: rfqId } });
    if (!rfq) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });

    const body = await request.json();
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "Message content required" }, { status: 400 });
    }

    const msg = await prisma.message.create({
      data: {
        rfqId,
        senderType: "internal",
        senderUserId: user.id,
        content: body.content.trim(),
      },
    });

    return NextResponse.json({
      message: {
        id: msg.id,
        content: msg.content,
        senderType: msg.senderType,
        senderName: user.fullName,
        createdAt: msg.createdAt,
      },
    }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
