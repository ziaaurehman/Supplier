import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile, getSignedUrl } from "@/lib/supabase/storage";

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const quoteId = formData.get("quoteId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
        quoteId,
        fileName: file.name,
        fileUrl: path,
        fileSize: buffer.length,
        mimeType: file.type,
        visibleToSupplier: true,
        uploadedBySupplier: true,
      },
    });

    return NextResponse.json({ attachment }, { status: 201 });
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
          { projectId: rfq.projectId, visibleToSupplier: true, uploadedBySupplier: false },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const withUrls = await Promise.all(
      attachments.map(async (a) => ({
        ...a,
        signedUrl: await getSignedUrl(a.fileUrl),
      }))
    );

    return NextResponse.json({ attachments: withUrls });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
