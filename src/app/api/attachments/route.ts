import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile, getSignedUrl } from "@/lib/supabase/storage";
import { requireUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;
    const projectItemId = formData.get("projectItemId") as string | null;
    const rfqId = formData.get("rfqId") as string | null;
    const quoteId = formData.get("quoteId") as string | null;
    const visibleToSupplier = formData.get("visibleToSupplier") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "bin";
    const path = `${projectId || "general"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const result = await uploadFile(path, buffer, file.type);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const attachment = await prisma.attachment.create({
      data: {
        projectId,
        projectItemId,
        rfqId,
        quoteId,
        fileName: file.name,
        fileUrl: path,
        fileSize: buffer.length,
        mimeType: file.type,
        visibleToSupplier,
        uploadedBySupplier: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "attachment_uploaded",
        entityType: "attachment",
        entityId: attachment.id,
        details: { fileName: file.name, projectId },
      },
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const projectItemId = searchParams.get("projectItemId");

    if (!projectId && !projectItemId) {
      return NextResponse.json({ error: "projectId or projectItemId required" }, { status: 400 });
    }

    const attachments = await prisma.attachment.findMany({
      where: {
        ...(projectId && { projectId }),
        ...(projectItemId && { projectItemId }),
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
