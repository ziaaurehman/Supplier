import { prisma } from "@/lib/prisma";
import { sendStaffFileEmail, sendStaffMessageEmail, sendSupplierMessageEmail } from "@/lib/email";

const THROTTLE_MS = 10 * 60 * 1000;

/**
 * A new message triggers an email when it is the recipient's only unread message in the
 * conversation; otherwise at most once per THROTTLE_MS. The timestamp update is the lock,
 * so two messages sent at the same moment cannot both send an email.
 */
async function claimSupplierSlot(rfqId: string, messageId: string): Promise<Date | null | false> {
  const previous = await prisma.rfq.findUnique({ where: { id: rfqId }, select: { supplierNotifiedAt: true } });
  const otherUnread = await prisma.message.count({
    where: { rfqId, senderType: "internal", readAt: null, id: { not: messageId } },
  });
  const now = new Date();
  const cutoff = new Date(now.getTime() - THROTTLE_MS);
  const { count } = await prisma.rfq.updateMany({
    where: otherUnread === 0
      ? { id: rfqId }
      : { id: rfqId, OR: [{ supplierNotifiedAt: null }, { supplierNotifiedAt: { lt: cutoff } }] },
    data: { supplierNotifiedAt: now },
  });
  return count === 1 ? previous?.supplierNotifiedAt ?? null : false;
}

async function claimStaffSlot(rfqId: string, messageId: string): Promise<Date | null | false> {
  const previous = await prisma.rfq.findUnique({ where: { id: rfqId }, select: { staffNotifiedAt: true } });
  const otherUnread = await prisma.message.count({
    where: { rfqId, senderType: "supplier", readAt: null, id: { not: messageId } },
  });
  const now = new Date();
  const cutoff = new Date(now.getTime() - THROTTLE_MS);
  const { count } = await prisma.rfq.updateMany({
    where: otherUnread === 0
      ? { id: rfqId }
      : { id: rfqId, OR: [{ staffNotifiedAt: null }, { staffNotifiedAt: { lt: cutoff } }] },
    data: { staffNotifiedAt: now },
  });
  return count === 1 ? previous?.staffNotifiedAt ?? null : false;
}

/** Project creator plus staff who wrote in this conversation; falls back to admins and internal sales. */
async function staffRecipients(rfqId: string, projectCreatorId: string | null): Promise<string[]> {
  const participants = await prisma.message.findMany({
    where: { rfqId, senderType: "internal", senderUserId: { not: null } },
    select: { senderUserId: true },
    distinct: ["senderUserId"],
  });
  const candidateIds = [projectCreatorId, ...participants.map((p) => p.senderUserId)]
    .filter((id): id is string => !!id);

  let recipients = await prisma.user.findMany({
    where: { id: { in: candidateIds }, isActive: true },
    select: { email: true },
  });
  if (recipients.length === 0) {
    recipients = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "INTERNAL_SALES"] }, isActive: true },
      select: { email: true },
    });
  }
  return recipients.map((r) => r.email);
}

export async function notifySupplierOfMessage(messageId: string): Promise<void> {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { fullName: true } },
        rfq: {
          include: {
            supplier: { include: { contacts: true } },
            project: { select: { title: true, projectNumber: true } },
          },
        },
      },
    });
    if (!message) return;
    const { rfq } = message;
    const contact = rfq.supplier.contacts.find((c) => c.isPrimary) || rfq.supplier.contacts[0];
    if (!contact?.email) return;

    const previous = await claimSupplierSlot(rfq.id, message.id);
    if (previous === false) return;

    const result = await sendSupplierMessageEmail({
      to: contact.email,
      contactFirstName: contact.firstName,
      language: rfq.supplier.language,
      projectTitle: rfq.project.title,
      projectNumber: rfq.project.projectNumber,
      senderName: message.sender?.fullName ?? null,
      content: message.content,
      token: rfq.token,
    });
    if (!result.success) {
      // Release the slot so the next message can retry.
      await prisma.rfq.update({ where: { id: rfq.id }, data: { supplierNotifiedAt: previous } });
      console.error(`Supplier message email failed for RFQ ${rfq.id}: ${result.error}`);
    }
  } catch (e) {
    console.error("notifySupplierOfMessage failed:", e);
  }
}

export async function notifyStaffOfMessage(messageId: string): Promise<void> {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        rfq: {
          include: {
            supplier: { select: { name: true } },
            project: { select: { id: true, title: true, projectNumber: true, createdBy: true } },
          },
        },
      },
    });
    if (!message) return;
    const { rfq } = message;

    const recipients = await staffRecipients(rfq.id, rfq.project.createdBy);
    if (recipients.length === 0) return;

    const previous = await claimStaffSlot(rfq.id, message.id);
    if (previous === false) return;

    const result = await sendStaffMessageEmail({
      to: recipients,
      supplierName: rfq.supplier.name,
      projectTitle: rfq.project.title,
      projectNumber: rfq.project.projectNumber,
      projectId: rfq.project.id,
      rfqId: rfq.id,
      content: message.content,
    });
    if (!result.success) {
      await prisma.rfq.update({ where: { id: rfq.id }, data: { staffNotifiedAt: previous } });
      console.error(`Staff message email failed for RFQ ${rfq.id}: ${result.error}`);
    }
  } catch (e) {
    console.error("notifyStaffOfMessage failed:", e);
  }
}

/** Supplier file uploads share the staff notification slot, so files and messages together send at most one email per THROTTLE_MS. */
export async function notifyStaffOfSupplierFile(attachmentId: string): Promise<void> {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        rfq: {
          include: {
            supplier: { select: { name: true } },
            project: { select: { id: true, title: true, projectNumber: true, createdBy: true } },
          },
        },
      },
    });
    const rfq = attachment?.rfq;
    if (!attachment || !rfq) return;

    const recipients = await staffRecipients(rfq.id, rfq.project.createdBy);
    if (recipients.length === 0) return;

    const previous = rfq.staffNotifiedAt;
    const cutoff = new Date(Date.now() - THROTTLE_MS);
    const { count } = await prisma.rfq.updateMany({
      where: { id: rfq.id, OR: [{ staffNotifiedAt: null }, { staffNotifiedAt: { lt: cutoff } }] },
      data: { staffNotifiedAt: new Date() },
    });
    if (count !== 1) return;

    const result = await sendStaffFileEmail({
      to: recipients,
      supplierName: rfq.supplier.name,
      projectTitle: rfq.project.title,
      projectNumber: rfq.project.projectNumber,
      projectId: rfq.project.id,
      fileName: attachment.fileName,
    });
    if (!result.success) {
      await prisma.rfq.update({ where: { id: rfq.id }, data: { staffNotifiedAt: previous } });
      console.error(`Supplier file email failed for RFQ ${rfq.id}: ${result.error}`);
    }
  } catch (e) {
    console.error("notifyStaffOfSupplierFile failed:", e);
  }
}
