"use client";

import styles from "./page.module.css";
import { use, useState, useEffect } from "react";
import { useLanguage } from "../../../../context/LanguageContext";

interface QuantityTier {
  id: string;
  quantity: number;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  decorationMethod: string | null;
  quantityTiers: QuantityTier[];
}

interface RfqData {
  rfqId: string;
  supplierId: string;
  supplierName: string;
  projectTitle: string;
  quoteDeadline: string | null;
  items: ProjectItem[];
}

interface PriceTierInput {
  projectItemId: string;
  quantity: number;
  unitPrice: string;
}

interface CounterOffer {
  id: string;
  quoteId: string;
  unitPrices: Record<string, number>;
  setupCost: number | null;
  decorationCost: number | null;
  freightCost: number | null;
  message: string | null;
  status: string;
  createdAt: string;
}

interface UploadedFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
}

const DECLINE_REASONS = [
  { value: "not_in_range", label: "Product not in our range" },
  { value: "quantity_too_small", label: "Quantity too small" },
  { value: "deadline_not_feasible", label: "Deadline not feasible" },
  { value: "no_capacity", label: "No capacity" },
  { value: "other", label: "Other" },
];

export default function SupplierQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t } = useLanguage();
  const [rfq, setRfq] = useState<RfqData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeclined, setIsDeclined] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Quote form state
  const [priceTiers, setPriceTiers] = useState<PriceTierInput[]>([]);
  const [setupCost, setSetupCost] = useState("");
  const [decorationCost, setDecorationCost] = useState("");
  const [decorationCostType, setDecorationCostType] = useState("per_unit");
  const [freightCost, setFreightCost] = useState("");
  const [sampleCost, setSampleCost] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [minimumOrderQty, setMinimumOrderQty] = useState("");
  const [priceValidUntil, setPriceValidUntil] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Decline state
  const [declineReason, setDeclineReason] = useState("not_in_range");
  const [declineText, setDeclineText] = useState("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);

  // Counter-offer state
  const [counterOffers, setCounterOffers] = useState<CounterOffer[]>([]);

  // File upload state
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Messaging state
  const [chatMessages, setChatMessages] = useState<{ id: string; content: string; senderType: string; senderName: string | null; createdAt: string }[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    fetch(`/api/rfqs/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Invalid or expired link");
        return r.json();
      })
      .then((data) => {
        setRfq(data);
        const tiers: PriceTierInput[] = [];
        data.items.forEach((item: ProjectItem) => {
          item.quantityTiers.forEach((qt) => {
            tiers.push({ projectItemId: item.id, quantity: qt.quantity, unitPrice: "" });
          });
        });
        setPriceTiers(tiers);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    fetch(`/api/rfqs/${token}/counter-offers`)
      .then((r) => r.json())
      .then((data) => setCounterOffers(data.counterOffers || []))
      .catch(() => {});

    fetch(`/api/rfqs/${token}/attachments`)
      .then((r) => r.json())
      .then((data) => setFiles(data.attachments || []))
      .catch(() => {});

    fetch(`/api/rfqs/${token}/messages`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setChatMessages(data.map((m: Record<string, unknown>) => ({
            id: m.id as string,
            content: m.content as string,
            senderType: m.senderType as string,
            senderName: (m.sender as Record<string, unknown> | null)?.fullName as string | null ?? null,
            createdAt: m.createdAt as string,
          })));
        }
      })
      .catch(() => {});
  }, [token]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/rfqs/${token}/attachments`, { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setFiles((prev) => [...prev, data.attachment]);
      } else {
        const data = await res.json();
        alert(data.error || "Upload failed");
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSendMessage = async () => {
    if (!msgText.trim()) return;
    setSendingMsg(true);
    try {
      const res = await fetch(`/api/rfqs/${token}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msgText.trim() }),
      });
      if (res.ok) {
        const msg = await res.json();
        setChatMessages((prev) => [...prev, {
          id: msg.id,
          content: msg.content,
          senderType: msg.senderType,
          senderName: null,
          createdAt: msg.createdAt,
        }]);
        setMsgText("");
      }
    } finally {
      setSendingMsg(false);
    }
  };

  const handleCounterOfferRespond = async (coId: string, action: "accept" | "decline") => {
    const res = await fetch(`/api/rfqs/${token}/counter-offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterOfferId: coId, action }),
    });
    if (res.ok) {
      setCounterOffers((prev) => prev.filter((co) => co.id !== coId));
    } else {
      const data = await res.json();
      alert(data.error || "Failed to respond");
    }
  };

  const updateTierPrice = (itemId: string, qty: number, value: string) => {
    setPriceTiers((prev) =>
      prev.map((pt) =>
        pt.projectItemId === itemId && pt.quantity === qty ? { ...pt, unitPrice: value } : pt
      )
    );
  };

  const handleSubmit = async () => {
    const hasPrices = priceTiers.some((pt) => pt.unitPrice && Number(pt.unitPrice) > 0);
    if (!hasPrices) return alert("Enter at least one unit price");

    setSubmitting(true);
    try {
      const quotes = rfq!.items.map((item) => {
        const itemTiers = priceTiers
          .filter((pt) => pt.projectItemId === item.id && pt.unitPrice && Number(pt.unitPrice) > 0)
          .map((pt) => ({ quantity: pt.quantity, unitPrice: Number(pt.unitPrice) }));
        return {
          projectItemId: item.id,
          currency,
          setupCost: Number(setupCost) || 0,
          decorationCost: Number(decorationCost) || 0,
          decorationCostType,
          freightCost: Number(freightCost) || 0,
          sampleCost: Number(sampleCost) || 0,
          leadTimeDays: leadTimeDays ? Number(leadTimeDays) : undefined,
          minimumOrderQty: minimumOrderQty ? Number(minimumOrderQty) : undefined,
          priceValidUntil: priceValidUntil || null,
          comment: comment || null,
          priceTiers: itemTiers,
        };
      });

      const res = await fetch(`/api/rfqs/${token}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: quotes }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to submit quote");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rfqs/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: declineReason,
          reasonText: declineText || null,
        }),
      });
      if (res.ok) setIsDeclined(true);
      else {
        const data = await res.json();
        alert(data.error || "Failed to decline");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Loading...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h2 className={styles.title}>Error</h2>
          <p className={styles.subtitle}>{error}</p>
        </div>
      </div>
    );
  }

  if (isDeclined) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h2 className={styles.title}>{t("quoteDeclined")}</h2>
          <p className={styles.subtitle}>{t("quoteDeclinedMsg")}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h2 className={styles.title}>Quote Submitted</h2>
          <p className={styles.subtitle}>Thank you! Your quote has been received and is being reviewed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("quoteFormTitle")}</h1>
        <p className={styles.subtitle}>{rfq?.projectTitle}</p>
        {rfq?.quoteDeadline && (
          <div className={styles.deadlineBox}>
            <strong>{t("thDeadline")}:</strong> {new Date(rfq.quoteDeadline).toLocaleDateString()}
          </div>
        )}
      </div>

      {rfq?.items.map((item) => (
        <div key={item.id} className={styles.card}>
          <h3 className={styles.sectionTitle}>{item.name}</h3>
          {item.description && <p>{item.description}</p>}
          {item.decorationMethod && <p><strong>{t("decoMethod")}:</strong> {item.decorationMethod}</p>}

          <hr className={styles.divider} />
          <h3 className={styles.sectionTitle}>{t("pricingTiers")}</h3>

          <div className={styles.pricingGrid}>
            {item.quantityTiers.map((qt) => (
              <div key={qt.id} className={styles.tierBox}>
                <label>Unit Price ({qt.quantity} pcs)</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.currency}>{currency === "EUR" ? "€" : "$"}</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={priceTiers.find((pt) => pt.projectItemId === item.id && pt.quantity === qt.quantity)?.unitPrice || ""}
                    onChange={(e) => updateTierPrice(item.id, qt.quantity, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Costs & Terms</h3>

        <div className={styles.additionalCosts}>
          <div className={styles.inputGroup}>
            <label>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: "100%", padding: "0.5rem" }}>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          <div className={styles.inputGroup}>
            <label>{t("setupCosts")}</label>
            <div className={styles.inputWrapper}>
              <span className={styles.currency}>{currency === "EUR" ? "€" : "$"}</span>
              <input type="number" step="0.01" placeholder="0.00" value={setupCost} onChange={(e) => setSetupCost(e.target.value)} />
            </div>
          </div>
          <div className={styles.inputGroup}>
            <label>Decoration Cost</label>
            <div className={styles.inputWrapper}>
              <span className={styles.currency}>{currency === "EUR" ? "€" : "$"}</span>
              <input type="number" step="0.01" placeholder="0.00" value={decorationCost} onChange={(e) => setDecorationCost(e.target.value)} />
            </div>
          </div>
          <div className={styles.inputGroup}>
            <label>Decoration Type</label>
            <select value={decorationCostType} onChange={(e) => setDecorationCostType(e.target.value)} style={{ width: "100%", padding: "0.5rem" }}>
              <option value="per_unit">Per Unit</option>
              <option value="flat_rate">Flat Rate</option>
            </select>
          </div>
          <div className={styles.inputGroup}>
            <label>{t("freightCosts")}</label>
            <div className={styles.inputWrapper}>
              <span className={styles.currency}>{currency === "EUR" ? "€" : "$"}</span>
              <input type="number" step="0.01" placeholder="0.00" value={freightCost} onChange={(e) => setFreightCost(e.target.value)} />
            </div>
          </div>
          <div className={styles.inputGroup}>
            <label>Sample Cost</label>
            <div className={styles.inputWrapper}>
              <span className={styles.currency}>{currency === "EUR" ? "€" : "$"}</span>
              <input type="number" step="0.01" placeholder="0.00" value={sampleCost} onChange={(e) => setSampleCost(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Additional Information</h3>

        <div className={styles.infoGrid}>
          <div className={styles.inputGroup}>
            <label>{t("leadTime")} (working days)</label>
            <input type="number" placeholder="e.g. 14" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} />
          </div>
          <div className={styles.inputGroup}>
            <label>MOQ</label>
            <input type="number" placeholder="e.g. 100" value={minimumOrderQty} onChange={(e) => setMinimumOrderQty(e.target.value)} />
          </div>
          <div className={styles.inputGroup}>
            <label>{t("validUntil")}</label>
            <input type="date" value={priceValidUntil} onChange={(e) => setPriceValidUntil(e.target.value)} />
          </div>
        </div>

        <div className={styles.inputGroupFull}>
          <label>Comments / Alternative Proposals</label>
          <textarea rows={3} placeholder="Any additional information..." value={comment} onChange={(e) => setComment(e.target.value)}></textarea>
        </div>
      </div>

      {counterOffers.length > 0 && (
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Counter Offers from Buyer</h3>
          {counterOffers.map((co) => (
            <div key={co.id} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 16, marginBottom: 12, background: "#fffbeb" }}>
              <div style={{ fontSize: 13, color: "#92400e", fontWeight: 600, marginBottom: 8 }}>
                Received {new Date(co.createdAt).toLocaleDateString()}
              </div>
              {co.message && <p style={{ fontSize: 14, marginBottom: 12, fontStyle: "italic" }}>{co.message}</p>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, marginBottom: 12 }}>
                {Object.entries(co.unitPrices).map(([tierId, price]) => (
                  <div key={tierId}>Tier {tierId.slice(0, 6)}...: <strong>{typeof price === "number" ? `€${price.toFixed(2)}` : String(price)}</strong></div>
                ))}
                {co.setupCost != null && <div>Setup Cost: <strong>€{co.setupCost.toFixed(2)}</strong></div>}
                {co.decorationCost != null && <div>Decoration: <strong>€{co.decorationCost.toFixed(2)}</strong></div>}
                {co.freightCost != null && <div>Freight: <strong>€{co.freightCost.toFixed(2)}</strong></div>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleCounterOfferRespond(co.id, "accept")}
                  style={{ padding: "6px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                >
                  Accept
                </button>
                <button
                  onClick={() => handleCounterOfferRespond(co.id, "decline")}
                  style={{ padding: "6px 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>File Attachments</h3>
        {files.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {files.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: 13 }}>{f.fileName}</span>
                <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--primary-color)" }}>Download</a>
              </div>
            ))}
          </div>
        )}
        <label style={{ display: "inline-block", padding: "8px 16px", background: "#f1f5f9", borderRadius: 4, cursor: uploading ? "wait" : "pointer", fontSize: 13, fontWeight: 600 }}>
          {uploading ? "Uploading..." : "+ Upload File"}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" style={{ display: "none" }} onChange={handleFileUpload} disabled={uploading} />
        </label>
        <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 8 }}>Max 10MB (PDF, JPG, PNG, GIF, WEBP)</span>
      </div>

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Messages</h3>
        <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 12, border: "1px solid #f1f5f9", borderRadius: 6, padding: chatMessages.length ? 12 : 0 }}>
          {chatMessages.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
              No messages yet. Send a question or note to the buyer.
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  marginBottom: 10,
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: msg.senderType === "supplier" ? "#e0f2fe" : "#f1f5f9",
                  marginLeft: msg.senderType === "supplier" ? 40 : 0,
                  marginRight: msg.senderType === "supplier" ? 0 : 40,
                }}
              >
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                  <strong>{msg.senderType === "supplier" ? "You" : msg.senderName || "Buyer"}</strong>
                  {" — "}
                  {new Date(msg.createdAt).toLocaleString()}
                </div>
                <div style={{ fontSize: 14 }}>{msg.content}</div>
              </div>
            ))
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <textarea
            rows={2}
            placeholder="Type a message..."
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--border-color)", borderRadius: 4, fontFamily: "inherit", fontSize: 14, resize: "vertical" }}
          />
          <button
            onClick={handleSendMessage}
            disabled={sendingMsg || !msgText.trim()}
            style={{
              padding: "8px 20px",
              background: "var(--primary-color)",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: sendingMsg || !msgText.trim() ? "default" : "pointer",
              fontWeight: 600,
              fontSize: 13,
              alignSelf: "flex-end",
              opacity: sendingMsg || !msgText.trim() ? 0.6 : 1,
            }}
          >
            {sendingMsg ? "..." : "Send"}
          </button>
        </div>
      </div>

      {showDeclineForm && (
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Decline Reason</h3>
          <div className={styles.inputGroup} style={{ marginBottom: "1rem" }}>
            <select value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} style={{ width: "100%", padding: "0.5rem" }}>
              {DECLINE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className={styles.inputGroupFull}>
            <textarea rows={2} placeholder="Additional details (optional)" value={declineText} onChange={(e) => setDeclineText(e.target.value)}></textarea>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button className={styles.btnDecline} onClick={handleDecline} disabled={submitting}>
              {submitting ? "Declining..." : "Confirm Decline"}
            </button>
            <button
              onClick={() => setShowDeclineForm(false)}
              style={{ padding: "0.75rem 1.5rem", background: "#f1f5f9", border: "none", borderRadius: "6px", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        {!showDeclineForm && (
          <button className={styles.btnDecline} onClick={() => setShowDeclineForm(true)}>
            {t("declineQuote")}
          </button>
        )}
        <button className={styles.btnSubmit} onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting..." : t("submitQuote")}
        </button>
      </div>
    </div>
  );
}
