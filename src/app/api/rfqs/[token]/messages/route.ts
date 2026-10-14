import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json(messages);
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

    const body = await request.json();
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "Message content required" }, { status: 400 });
    }

    const msg = await prisma.message.create({
      data: {
        rfqId: rfq.id,
        senderType: "supplier",
        content: body.content,
      },
    });

    return NextResponse.json(msg, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
