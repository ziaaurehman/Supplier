import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "RFQ Platform <rfq@yourdomain.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
// Local development only: deliver to the Mailpit test inbox instead of Resend.
const DEV_INBOX_URL = process.env.EMAIL_DEV_INBOX_URL;

type DeliveryResult = { success: boolean; error?: string };

function esc(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseAddress(address: string) {
  const match = address.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match ? { Name: match[1], Email: match[2] } : { Name: "", Email: address.trim() };
}

async function deliver(message: { to: string | string[]; subject: string; html: string }): Promise<DeliveryResult> {
  const to = Array.isArray(message.to) ? message.to : [message.to];
  if (to.length === 0) return { success: true };
  try {
    if (DEV_INBOX_URL) {
      const res = await fetch(`${DEV_INBOX_URL}/api/v1/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: parseAddress(FROM),
          To: to.map((Email) => ({ Email })),
          Subject: message.subject,
          HTML: message.html,
        }),
      });
      return res.ok ? { success: true } : { success: false, error: `Dev inbox responded ${res.status}` };
    }
    const result = await resend.emails.send({ from: FROM, to, subject: message.subject, html: message.html });
    return result.error ? { success: false, error: result.error.message } : { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Email send failed" };
  }
}

interface RfqEmailData {
  supplierName: string;
  contactEmail: string;
  contactFirstName: string;
  projectTitle: string;
  projectNumber: string;
  itemNames: string[];
  quoteDeadline: string | null;
  requestedDeliveryDate: string | null;
  token: string;
  language: string;
}

interface NotificationData {
  projectTitle: string;
  projectNumber: string;
  supplierName: string;
  notifyEmails: string[];
}

const templates = {
  rfq: {
    de: (data: RfqEmailData) => ({
      subject: `Preisanfrage: ${data.projectTitle} (${data.projectNumber})`,
      html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f4f4f5">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">
  <div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e4e4e7">
    <h2 style="color:#18181b;margin:0 0 8px">Preisanfrage</h2>
    <p style="color:#71717a;margin:0 0 24px;font-size:14px">${esc(data.projectNumber)} &mdash; ${esc(data.projectTitle)}</p>

    <p>Sehr geehrte/r ${esc(data.contactFirstName)},</p>
    <p>wir bitten Sie um ein Angebot f&uuml;r folgende Artikel:</p>

    <ul style="padding-left:20px;color:#3f3f46">
      ${data.itemNames.map((n) => `<li>${esc(n)}</li>`).join("")}
    </ul>

    ${data.quoteDeadline ? `<p><strong>Angebotsfrist:</strong> ${new Date(data.quoteDeadline).toLocaleDateString("de-DE")}</p>` : ""}
    ${data.requestedDeliveryDate ? `<p><strong>Gew&uuml;nschter Liefertermin:</strong> ${new Date(data.requestedDeliveryDate).toLocaleDateString("de-DE")}</p>` : ""}

    <div style="margin:32px 0;text-align:center">
      <a href="${APP_URL}/quote/${data.token}"
         style="background:#16ADE1;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
        Angebot abgeben
      </a>
    </div>

    <p style="color:#71717a;font-size:13px">
      Falls Sie nicht anbieten k&ouml;nnen, k&ouml;nnen Sie dies ebenfalls &uuml;ber den Link mitteilen.
    </p>
  </div>
  <p style="text-align:center;color:#a1a1aa;font-size:12px;margin-top:16px">
    Diese E-Mail wurde automatisch versendet. Bitte antworten Sie nicht direkt auf diese Nachricht.
  </p>
</div>
</body></html>`,
    }),
    en: (data: RfqEmailData) => ({
      subject: `Request for Quote: ${data.projectTitle} (${data.projectNumber})`,
      html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f4f4f5">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">
  <div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e4e4e7">
    <h2 style="color:#18181b;margin:0 0 8px">Request for Quote</h2>
    <p style="color:#71717a;margin:0 0 24px;font-size:14px">${esc(data.projectNumber)} &mdash; ${esc(data.projectTitle)}</p>

    <p>Dear ${esc(data.contactFirstName)},</p>
    <p>We would like to request a quote for the following items:</p>

    <ul style="padding-left:20px;color:#3f3f46">
      ${data.itemNames.map((n) => `<li>${esc(n)}</li>`).join("")}
    </ul>

    ${data.quoteDeadline ? `<p><strong>Quote deadline:</strong> ${new Date(data.quoteDeadline).toLocaleDateString("en-GB")}</p>` : ""}
    ${data.requestedDeliveryDate ? `<p><strong>Requested delivery date:</strong> ${new Date(data.requestedDeliveryDate).toLocaleDateString("en-GB")}</p>` : ""}

    <div style="margin:32px 0;text-align:center">
      <a href="${APP_URL}/quote/${data.token}"
         style="background:#16ADE1;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
        Submit Quote
      </a>
    </div>

    <p style="color:#71717a;font-size:13px">
      If you are unable to quote, you can also indicate this via the link above.
    </p>
  </div>
  <p style="text-align:center;color:#a1a1aa;font-size:12px;margin-top:16px">
    This email was sent automatically. Please do not reply directly to this message.
  </p>
</div>
</body></html>`,
    }),
  },
  reminder: {
    de: (data: RfqEmailData, reminderNumber: number) => ({
      subject: `Erinnerung: Preisanfrage ${data.projectNumber} – ${data.projectTitle}`,
      html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f4f4f5">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">
  <div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e4e4e7">
    <h2 style="color:#18181b;margin:0 0 8px">Erinnerung: Preisanfrage</h2>
    <p style="color:#71717a;margin:0 0 24px;font-size:14px">${esc(data.projectNumber)} &mdash; ${esc(data.projectTitle)}</p>

    <p>Sehr geehrte/r ${esc(data.contactFirstName)},</p>
    <p>wir m&ouml;chten Sie freundlich an unsere Preisanfrage erinnern${reminderNumber >= 2 ? " (letzte Erinnerung)" : ""}.</p>

    ${data.quoteDeadline ? `<p><strong>Angebotsfrist:</strong> ${new Date(data.quoteDeadline).toLocaleDateString("de-DE")}</p>` : ""}

    <div style="margin:32px 0;text-align:center">
      <a href="${APP_URL}/quote/${data.token}"
         style="background:#16ADE1;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
        Angebot abgeben
      </a>
    </div>
  </div>
</div>
</body></html>`,
    }),
    en: (data: RfqEmailData, reminderNumber: number) => ({
      subject: `Reminder: Quote Request ${data.projectNumber} – ${data.projectTitle}`,
      html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f4f4f5">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">
  <div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e4e4e7">
    <h2 style="color:#18181b;margin:0 0 8px">Reminder: Quote Request</h2>
    <p style="color:#71717a;margin:0 0 24px;font-size:14px">${esc(data.projectNumber)} &mdash; ${esc(data.projectTitle)}</p>

    <p>Dear ${esc(data.contactFirstName)},</p>
    <p>This is a friendly reminder about our quote request${reminderNumber >= 2 ? " (final reminder)" : ""}.</p>

    ${data.quoteDeadline ? `<p><strong>Quote deadline:</strong> ${new Date(data.quoteDeadline).toLocaleDateString("en-GB")}</p>` : ""}

    <div style="margin:32px 0;text-align:center">
      <a href="${APP_URL}/quote/${data.token}"
         style="background:#16ADE1;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
        Submit Quote
      </a>
    </div>
  </div>
</div>
</body></html>`,
    }),
  },
};

export async function sendRfqEmail(data: RfqEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const lang = data.language === "de" ? "de" : "en";
    const template = templates.rfq[lang](data);

    return await deliver({ to: data.contactEmail, subject: template.subject, html: template.html });
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Email send failed" };
  }
}

export async function sendReminderEmail(
  data: RfqEmailData,
  reminderNumber: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const lang = data.language === "de" ? "de" : "en";
    const template = templates.reminder[lang](data, reminderNumber);

    return await deliver({ to: data.contactEmail, subject: template.subject, html: template.html });
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Email send failed" };
  }
}

export async function sendNotificationEmail(
  type: "quote_submitted" | "quote_revised" | "quote_declined",
  data: NotificationData
): Promise<void> {
  if (data.notifyEmails.length === 0) return;

  const copy = {
    quote_submitted: { subject: "Quote received", badge: "Quote Received", action: "submitted a quote", color: "#10B981" },
    quote_revised: { subject: "Quote updated", badge: "Quote Updated", action: "revised their quote", color: "#6366F1" },
    quote_declined: { subject: "Quote declined", badge: "RFQ Declined", action: "declined the RFQ", color: "#EF4444" },
  }[type];
  const subject = `${copy.subject}: ${data.supplierName} — ${data.projectNumber}`;
  const action = copy.action;
  const color = copy.color;

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f4f4f5">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">
  <div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e4e4e7">
    <div style="display:inline-block;padding:4px 12px;border-radius:4px;background:${color}15;color:${color};font-size:13px;font-weight:600;margin-bottom:16px">
      ${copy.badge}
    </div>
    <h2 style="color:#18181b;margin:0 0 8px">${esc(data.projectTitle)}</h2>
    <p style="color:#71717a;margin:0 0 16px;font-size:14px">${esc(data.projectNumber)}</p>
    <p><strong>${esc(data.supplierName)}</strong> has ${action} for this project.</p>
    <div style="margin:24px 0;text-align:center">
      <a href="${APP_URL}/projects"
         style="background:#16ADE1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
        View Projects
      </a>
    </div>
  </div>
</div>
</body></html>`;

  await deliver({ to: data.notifyEmails, subject, html });
}

function messagePreview(content: string): string {
  const trimmed = content.length > 600 ? `${content.slice(0, 600)}…` : content;
  return esc(trimmed).replace(/\n/g, "<br>");
}

function emailShell(inner: string, footer: string): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f4f4f5">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">
  <div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e4e4e7">${inner}</div>
  <p style="text-align:center;color:#a1a1aa;font-size:12px;margin-top:16px">${footer}</p>
</div>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<div style="margin:28px 0 8px;text-align:center">
      <a href="${href}" style="background:#16ADE1;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">${label}</a>
    </div>`;
}

function quoteBlock(content: string): string {
  return `<div style="border-left:3px solid #16ADE1;background:#f8fafc;padding:12px 16px;margin:16px 0;color:#3f3f46;font-size:14px;line-height:1.5">${messagePreview(content)}</div>`;
}

export async function sendSupplierMessageEmail(data: {
  to: string;
  contactFirstName: string;
  language: string;
  projectTitle: string;
  projectNumber: string;
  senderName: string | null;
  content: string;
  token: string;
}): Promise<DeliveryResult> {
  const link = `${APP_URL}/quote/${data.token}#messages`;
  const de = data.language === "de";
  const subject = de
    ? `Neue Nachricht zu Ihrer Anfrage ${data.projectNumber} – ${data.projectTitle}`
    : `New message about ${data.projectNumber} – ${data.projectTitle}`;
  const from = data.senderName ? esc(data.senderName) : de ? "Unser Einkaufsteam" : "Our purchasing team";
  const inner = de
    ? `<h2 style="color:#18181b;margin:0 0 8px">Neue Nachricht</h2>
    <p style="color:#71717a;margin:0 0 24px;font-size:14px">${esc(data.projectNumber)} &mdash; ${esc(data.projectTitle)}</p>
    <p>Sehr geehrte/r ${esc(data.contactFirstName)},</p>
    <p>${from} hat Ihnen eine Nachricht zu dieser Anfrage gesendet:</p>
    ${quoteBlock(data.content)}
    ${button(link, "Ansehen &amp; antworten")}`
    : `<h2 style="color:#18181b;margin:0 0 8px">New message</h2>
    <p style="color:#71717a;margin:0 0 24px;font-size:14px">${esc(data.projectNumber)} &mdash; ${esc(data.projectTitle)}</p>
    <p>Dear ${esc(data.contactFirstName)},</p>
    <p>${from} sent you a message about this request:</p>
    ${quoteBlock(data.content)}
    ${button(link, "View &amp; reply")}`;
  const footer = de
    ? "Bitte antworten Sie über den Link oben – Antworten auf diese E-Mail werden nicht gelesen."
    : "Please reply using the link above — replies to this email are not monitored.";
  return deliver({ to: data.to, subject, html: emailShell(inner, footer) });
}

export async function sendStaffMessageEmail(data: {
  to: string[];
  supplierName: string;
  projectTitle: string;
  projectNumber: string;
  projectId: string;
  rfqId: string;
  content: string;
}): Promise<DeliveryResult> {
  const link = `${APP_URL}/projects/${data.projectId}?rfq=${data.rfqId}#messages`;
  const subject = `New message from ${data.supplierName} — ${data.projectNumber}`;
  const inner = `<h2 style="color:#18181b;margin:0 0 8px">New supplier message</h2>
    <p style="color:#71717a;margin:0 0 24px;font-size:14px">${esc(data.projectNumber)} &mdash; ${esc(data.projectTitle)}</p>
    <p><strong>${esc(data.supplierName)}</strong> sent a message:</p>
    ${quoteBlock(data.content)}
    ${button(link, "Open conversation")}`;
  return deliver({ to: data.to, subject, html: emailShell(inner, "You are receiving this because you created this project or took part in the conversation.") });
}

export async function sendStaffFileEmail(data: {
  to: string[];
  supplierName: string;
  projectTitle: string;
  projectNumber: string;
  projectId: string;
  fileName: string;
}): Promise<DeliveryResult> {
  const link = `${APP_URL}/projects/${data.projectId}#attachments`;
  const subject = `New file from ${data.supplierName} — ${data.projectNumber}`;
  const inner = `<h2 style="color:#18181b;margin:0 0 8px">New supplier document</h2>
    <p style="color:#71717a;margin:0 0 24px;font-size:14px">${esc(data.projectNumber)} &mdash; ${esc(data.projectTitle)}</p>
    <p><strong>${esc(data.supplierName)}</strong> uploaded a file:</p>
    <p style="background:#f8fafc;border:1px solid #e4e4e7;border-radius:6px;padding:10px 14px;font-size:14px">${esc(data.fileName)}</p>
    ${button(link, "View project files")}`;
  return deliver({ to: data.to, subject, html: emailShell(inner, "You are receiving this because you created this project or took part in the conversation.") });
}
