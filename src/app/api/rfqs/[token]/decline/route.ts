import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/email";
import { z } from "zod";

const declineSchema = z.object({
  reason: z.enum(["not_in_range", "quantity_too_small", "deadline_not_feasible", "no_capacity", "other"]),
  reasonText: z.string().nullable().optional(),
});

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
    const data = declineSchema.parse(body);

    await prisma.rfq.update({
      where: { id: rfq.id },
      data: {
        status: "declined",
        respondedAt: new Date(),
        declineReason: data.reason,
        declineReasonText: data.reasonText,
      },
    });

    const projectRfqs = await prisma.rfq.findMany({
      where: { projectId: rfq.projectId },
      select: { status: true },
    });
    const allResponded = projectRfqs.every((r) => r.status === "quoted" || r.status === "declined");
    const hasQuote = projectRfqs.some((r) => r.status === "quoted");
    if (allResponded) {
      await prisma.project.update({
        where: { id: rfq.projectId },
        data: { status: hasQuote ? "completed" : "cancelled" },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: "rfq_declined",
        entityType: "rfq",
        entityId: rfq.id,
        details: { reason: data.reason, reasonText: data.reasonText },
      },
    });

    const fullRfq = await prisma.rfq.findUnique({
      where: { id: rfq.id },
      include: {
        supplier: true,
        project: { select: { title: true, projectNumber: true } },
      },
    });
    if (fullRfq) {
      const admins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "INTERNAL_SALES"] }, isActive: true },
        select: { email: true },
      });
      sendNotificationEmail("quote_declined", {
        projectTitle: fullRfq.project.title,
        projectNumber: fullRfq.project.projectNumber,
        supplierName: fullRfq.supplier.name,
        notifyEmails: admins.map((u) => u.email),
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: e.errors }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
