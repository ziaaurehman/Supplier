import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile, getSignedUrls } from "@/lib/supabase/storage";
import { requireUser } from "@/lib/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File type not supported" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be under 10MB" }, { status: 400 });
    }

    if (projectItemId) {
      const item = await prisma.projectItem.findUnique({
        where: { id: projectItemId },
        select: { projectId: true },
      });
      if (!item || (projectId && item.projectId !== projectId)) {
        return NextResponse.json({ error: "Item does not belong to this project" }, { status: 400 });
      }
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

    return NextResponse.json(
      { attachment: { ...attachment, signedUrl: result.url } },
      { status: 201 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const projectItemId = searchParams.get("projectItemId");

    if (!projectId && !projectItemId) {
      return NextResponse.json({ error: "projectId or projectItemId required" }, { status: 400 });
    }

    if (user.role === "FIELD_SALES") {
      const owned = projectId
        ? await prisma.project.count({ where: { id: projectId, createdBy: user.id } })
        : await prisma.projectItem.count({ where: { id: projectItemId!, project: { createdBy: user.id } } });
      if (owned === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const attachments = await prisma.attachment.findMany({
      where: {
        ...(projectId && { projectId }),
        ...(projectItemId && { projectItemId }),
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
