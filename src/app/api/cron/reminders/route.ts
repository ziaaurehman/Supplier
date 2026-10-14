import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";

const MAX_REMINDERS = 2;
const REMINDER_DAYS = [3, 6];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    const pendingRfqs = await prisma.rfq.findMany({
      where: {
        status: { in: ["sent", "opened"] },
        reminderCount: { lt: MAX_REMINDERS },
        sentAt: { not: null },
        tokenExpiresAt: { gt: now },
      },
      include: {
        supplier: { include: { contacts: true } },
        project: {
          select: {
            title: true,
            projectNumber: true,
            quoteDeadline: true,
            requestedDeliveryDate: true,
            items: { select: { name: true } },
          },
        },
      },
    });

    let sent = 0;
    for (const rfq of pendingRfqs) {
      if (!rfq.sentAt) continue;

      const daysSinceSent = Math.floor(
        (now.getTime() - rfq.sentAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const nextReminderDay = REMINDER_DAYS[rfq.reminderCount];
      if (!nextReminderDay || daysSinceSent < nextReminderDay) continue;

      if (rfq.project.quoteDeadline && new Date(rfq.project.quoteDeadline) < now) continue;

      const primaryContact = rfq.supplier.contacts.find((c) => c.isPrimary) || rfq.supplier.contacts[0];
      if (!primaryContact) continue;

      const result = await sendReminderEmail(
        {
          supplierName: rfq.supplier.name,
          contactEmail: primaryContact.email,
          contactFirstName: primaryContact.firstName,
          projectTitle: rfq.project.title,
          projectNumber: rfq.project.projectNumber,
          itemNames: rfq.project.items.map((i) => i.name),
          quoteDeadline: rfq.project.quoteDeadline?.toISOString() ?? null,
          requestedDeliveryDate: rfq.project.requestedDeliveryDate?.toISOString() ?? null,
          token: rfq.token,
          language: rfq.supplier.language || "de",
        },
        rfq.reminderCount + 1
      );

      if (result.success) {
        await prisma.rfq.update({
          where: { id: rfq.id },
          data: {
            reminderCount: rfq.reminderCount + 1,
            lastReminderAt: now,
          },
        });
        sent++;
      }
    }

    return NextResponse.json({ checked: pendingRfqs.length, remindersSent: sent });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
