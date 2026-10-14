import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id: projectId } = await params;

    const notes = await prisma.internalNote.findMany({
      where: { projectId },
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ notes });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: projectId } = await params;
    const body = await request.json();

    if (!body.content?.trim()) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    const note = await prisma.internalNote.create({
      data: {
        projectId,
        rfqId: body.rfqId || undefined,
        userId: user.id,
        content: body.content,
      },
      include: { user: { select: { fullName: true, email: true } } },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
