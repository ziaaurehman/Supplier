import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile, getSignedUrls } from "@/lib/supabase/storage";
import { notifyStaffOfSupplierFile } from "@/lib/messageNotifications";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const rfq = await prisma.rfq.findUnique({ where: { token }, include: { supplier: { select: { name: true } } } });
    if (!rfq) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    if (rfq.tokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File type not supported" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be under 10MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "bin";
    const path = `supplier/${rfq.projectId}/${rfq.supplierId}/${Date.now()}.${ext}`;

    const result = await uploadFile(path, buffer, file.type);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const attachment = await prisma.attachment.create({
      data: {
        projectId: rfq.projectId,
        rfqId: rfq.id,
        fileName: file.name,
        fileUrl: path,
        fileSize: buffer.length,
        mimeType: file.type,
        visibleToSupplier: true,
        uploadedBySupplier: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "supplier_file_uploaded",
        entityType: "attachment",
        entityId: attachment.id,
        details: { fileName: file.name, supplierName: rfq.supplier.name, projectId: rfq.projectId },
      },
    });
    after(() => notifyStaffOfSupplierFile(attachment.id));

    return NextResponse.json(
      { attachment: { ...attachment, signedUrl: result.url } },
      { status: 201 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const rfq = await prisma.rfq.findUnique({ where: { token } });
    if (!rfq) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

    const attachments = await prisma.attachment.findMany({
      where: {
        OR: [
          { rfqId: rfq.id, visibleToSupplier: true },
          { projectId: rfq.projectId, projectItemId: null, visibleToSupplier: true, uploadedBySupplier: false },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const urls = await getSignedUrls(attachments.map((a) => a.fileUrl));
    const withUrls = attachments.map((a) => ({ ...a, signedUrl: urls.get(a.fileUrl) ?? null }));

    return NextResponse.json({ attachments: withUrls });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
