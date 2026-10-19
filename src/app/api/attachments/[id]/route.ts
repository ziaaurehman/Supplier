import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { deleteFile } from "@/lib/supabase/storage";

async function loadEditableAttachment(id: string, user: { id: string; role: string }) {
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { project: { select: { createdBy: true } } },
  });
  if (!attachment) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (attachment.uploadedBySupplier) {
    return { error: NextResponse.json({ error: "Supplier files cannot be changed" }, { status: 403 }) };
  }
  if (user.role === "FIELD_SALES" && attachment.project?.createdBy !== user.id) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { attachment };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { error } = await loadEditableAttachment(id, user);
    if (error) return error;

    const body = await request.json();
    if (typeof body.visibleToSupplier !== "boolean") {
      return NextResponse.json({ error: "visibleToSupplier must be true or false" }, { status: 400 });
    }
    const updated = await prisma.attachment.update({
      where: { id },
      data: { visibleToSupplier: body.visibleToSupplier },
    });
    return NextResponse.json({ attachment: updated });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const { attachment, error } = await loadEditableAttachment(id, user);
    if (error) return error;

    await deleteFile(attachment.fileUrl);
    await prisma.attachment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
