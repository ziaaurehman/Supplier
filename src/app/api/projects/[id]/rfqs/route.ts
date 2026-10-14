import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { sendRfqEmail } from "@/lib/email";
import { z } from "zod";

const sendRfqsSchema = z.object({
  supplierIds: z.array(z.string().uuid()).min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(["ADMIN", "INTERNAL_SALES"]);
    const { id: projectId } = await params;
    const body = await request.json();
    const { supplierIds } = sendRfqsSchema.parse(body);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { items: { include: { quantityTiers: true } } },
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds }, isActive: true },
      include: { contacts: { where: { isPrimary: true } } },
    });

    const rfqs = await Promise.all(
      suppliers.map(async (supplier) => {
        const existing = await prisma.rfq.findUnique({
          where: {
            projectId_supplierId: { projectId, supplierId: supplier.id },
          },
        });

        if (existing) return existing;

        return prisma.rfq.create({
          data: {
            projectId,
            supplierId: supplier.id,
            status: "sent",
            sentAt: new Date(),
          },
        });
      })
    );

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "rfqs_sent" },
    });

    const rfqsWithTokens = await prisma.rfq.findMany({
      where: { projectId, supplierId: { in: supplierIds } },
      include: { supplier: { include: { contacts: true } } },
    });

    const emailResults = await Promise.allSettled(
      rfqsWithTokens.map(async (rfq) => {
        const primaryContact = rfq.supplier.contacts.find((c) => c.isPrimary) || rfq.supplier.contacts[0];
        if (!primaryContact) return { supplier: rfq.supplier.name, sent: false, error: "No contact" };

        const result = await sendRfqEmail({
          supplierName: rfq.supplier.name,
          contactEmail: primaryContact.email,
          contactFirstName: primaryContact.firstName,
          projectTitle: project.title,
          projectNumber: project.projectNumber,
          itemNames: project.items.map((i) => i.name),
          quoteDeadline: project.quoteDeadline?.toISOString() ?? null,
          requestedDeliveryDate: project.requestedDeliveryDate?.toISOString() ?? null,
          token: rfq.token,
          language: rfq.supplier.language || "de",
        });

        return { supplier: rfq.supplier.name, sent: result.success, error: result.error };
      })
    );

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "rfqs_sent",
        entityType: "project",
        entityId: projectId,
        details: { supplierCount: rfqs.length, supplierIds },
      },
    });

    return NextResponse.json({
      sent: rfqsWithTokens.length,
      rfqs: rfqsWithTokens.map((rfq) => ({
        id: rfq.id,
        supplier: rfq.supplier.name,
        token: rfq.token,
        link: `${process.env.NEXT_PUBLIC_APP_URL}/quote/${rfq.token}`,
      })),
      emailResults: emailResults.map((r) =>
        r.status === "fulfilled" ? r.value : { sent: false, error: "Failed" }
      ),
    });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: e.errors }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
