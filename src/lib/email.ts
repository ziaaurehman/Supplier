import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "RFQ Platform <rfq@yourdomain.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
    <p style="color:#71717a;margin:0 0 24px;font-size:14px">${data.projectNumber} &mdash; ${data.projectTitle}</p>

    <p>Sehr geehrte/r ${data.contactFirstName},</p>
    <p>wir bitten Sie um ein Angebot f&uuml;r folgende Artikel:</p>

    <ul style="padding-left:20px;color:#3f3f46">
      ${data.itemNames.map((n) => `<li>${n}</li>`).join("")}
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
    <p style="color:#71717a;margin:0 0 24px;font-size:14px">${data.projectNumber} &mdash; ${data.projectTitle}</p>

    <p>Dear ${data.contactFirstName},</p>
    <p>We would like to request a quote for the following items:</p>

    <ul style="padding-left:20px;color:#3f3f46">
      ${data.itemNames.map((n) => `<li>${n}</li>`).join("")}
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
    <p style="color:#71717a;margin:0 0 24px;font-size:14px">${data.projectNumber} &mdash; ${data.projectTitle}</p>

    <p>Sehr geehrte/r ${data.contactFirstName},</p>
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
    <p style="color:#71717a;margin:0 0 24px;font-size:14px">${data.projectNumber} &mdash; ${data.projectTitle}</p>

    <p>Dear ${data.contactFirstName},</p>
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

    const result = await resend.emails.send({
      from: FROM,
      to: data.contactEmail,
      subject: template.subject,
      html: template.html,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true };
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

    const result = await resend.emails.send({
      from: FROM,
      to: data.contactEmail,
      subject: template.subject,
      html: template.html,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Email send failed" };
  }
}

export async function sendNotificationEmail(
  type: "quote_submitted" | "quote_declined",
  data: NotificationData
): Promise<void> {
  if (data.notifyEmails.length === 0) return;

  const subject =
    type === "quote_submitted"
      ? `Quote received: ${data.supplierName} — ${data.projectNumber}`
      : `Quote declined: ${data.supplierName} — ${data.projectNumber}`;

  const action = type === "quote_submitted" ? "submitted a quote" : "declined the RFQ";
  const color = type === "quote_submitted" ? "#10B981" : "#EF4444";

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f4f4f5">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">
  <div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e4e4e7">
    <div style="display:inline-block;padding:4px 12px;border-radius:4px;background:${color}15;color:${color};font-size:13px;font-weight:600;margin-bottom:16px">
      ${type === "quote_submitted" ? "Quote Received" : "RFQ Declined"}
    </div>
    <h2 style="color:#18181b;margin:0 0 8px">${data.projectTitle}</h2>
    <p style="color:#71717a;margin:0 0 16px;font-size:14px">${data.projectNumber}</p>
    <p><strong>${data.supplierName}</strong> has ${action} for this project.</p>
    <div style="margin:24px 0;text-align:center">
      <a href="${APP_URL}/projects"
         style="background:#16ADE1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
        View Projects
      </a>
    </div>
  </div>
</div>
</body></html>`;

  try {
    await resend.emails.send({
      from: FROM,
      to: data.notifyEmails,
      subject,
      html,
    });
  } catch {
    // Notification failures are non-critical
  }
}
