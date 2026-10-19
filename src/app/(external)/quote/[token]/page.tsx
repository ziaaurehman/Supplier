"use client";

import styles from "./page.module.css";
import { use, useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "../../../../context/LanguageContext";
import ItemAttachments from "../../../../components/ItemAttachments";
import { useTodayLocal } from "@/hooks/useTodayLocal";
import { isPastLocalDate } from "@/lib/dates";

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
  attachments: { id: string; fileName: string; mimeType: string | null; signedUrl: string | null }[];
}

interface ExistingQuote {
  projectItemId: string;
  currency: string;
  setupCost: string | number;
  decorationCost: string | number;
  decorationCostType: string;
  freightCost: string | number;
  sampleCost: string | number | null;
  leadTimeDays: number | null;
  minimumOrderQty: number | null;
  priceValidUntil: string | null;
  comment: string | null;
  priceTiers: { id: string; quantity: number; unitPrice: string | number }[];
}

interface RfqData {
  preview?: boolean;
  rfqId: string;
  status: string;
  sentAt: string | null;
  respondedAt: string | null;
  declineReason: string | null;
  declineReasonText: string | null;
  projectNumber: string;
  deadlinePassed: boolean;
  supplierId: string;
  supplierName: string;
  supplierLanguage: string;
  projectTitle: string;
  quoteDeadline: string | null;
  items: ProjectItem[];
  existingQuotes: ExistingQuote[];
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
  uploadedBySupplier: boolean;
  signedUrl?: string | null;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  content: string;
  senderType: string;
  senderName: string | null;
  createdAt: string;
  isNew: boolean;
}

type Tab = "quote" | "messages" | "files";
type QuoteState = "open" | "quoted" | "declined" | "closed";

const DECLINE_REASON_KEYS: { value: string; key: string }[] = [
  { value: "not_in_range", key: "reasonNotInRange" },
  { value: "quantity_too_small", key: "reasonQtyTooSmall" },
  { value: "deadline_not_feasible", key: "reasonDeadlineNotFeasible" },
  { value: "no_capacity", key: "reasonNoCapacity" },
  { value: "other", key: "reasonOther" },
];

const str = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(Number(v)));

export default function SupplierQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t, language, setLanguage } = useLanguage();
  type TKey = Parameters<typeof t>[0];
  const [rfq, setRfq] = useState<RfqData | null>(null);
  const readOnly = !!rfq?.preview;
  const today = useTodayLocal();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("quote");
  const [revising, setRevising] = useState(false);
  const [banner, setBanner] = useState<"" | "submitted" | "updated">("");

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

  const [counterOffers, setCounterOffers] = useState<CounterOffer[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messagesSeen, setMessagesSeen] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const firstNewRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const resetForm = useCallback((data: RfqData) => {
    const quotes = data.existingQuotes || [];
    const byItem = new Map(quotes.map((q) => [q.projectItemId, q]));
    setPriceTiers(
      data.items.flatMap((item) =>
        item.quantityTiers.map((qt) => {
          const existing = byItem.get(item.id)?.priceTiers.find((pt) => pt.quantity === qt.quantity);
          return { projectItemId: item.id, quantity: qt.quantity, unitPrice: existing ? str(existing.unitPrice) : "" };
        })
      )
    );
    const first = quotes[0];
    setCurrency(first?.currency || "EUR");
    setSetupCost(first ? str(first.setupCost) : "");
    setDecorationCost(first ? str(first.decorationCost) : "");
    setDecorationCostType(first?.decorationCostType || "per_unit");
    setFreightCost(first ? str(first.freightCost) : "");
    setSampleCost(first ? str(first.sampleCost) : "");
    setLeadTimeDays(first?.leadTimeDays ? String(first.leadTimeDays) : "");
    setMinimumOrderQty(first?.minimumOrderQty ? String(first.minimumOrderQty) : "");
    setPriceValidUntil(first?.priceValidUntil ? first.priceValidUntil.slice(0, 10) : "");
    setComment(first?.comment || "");
  }, []);

  const loadRfq = useCallback(async () => {
    const res = await fetch(`/api/rfqs/${token}`);
    if (!res.ok) throw new Error("invalid");
    const data: RfqData = await res.json();
    setRfq(data);
    resetForm(data);
    return data;
  }, [token, resetForm]);

  useEffect(() => {
    if (window.location.hash === "#messages") setTab("messages");

    loadRfq()
      .then((data) => {
        if (data.supplierLanguage === "de" || data.supplierLanguage === "en") setLanguage(data.supplierLanguage);
      })
      .catch(() => setError("invalidLink"))
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
      .then((data) => setChatMessages(data.messages || []))
      .catch(() => {});
  }, [token, loadRfq, setLanguage]);

  const newCount = chatMessages.filter((m) => m.isNew).length;

  useEffect(() => {
    if (tab !== "messages") return;
    setMessagesSeen(true);
    (firstNewRef.current ?? threadEndRef.current)?.scrollIntoView({ block: "nearest" });
  }, [tab, chatMessages.length]);

  const formatDate = (iso: string | null, withTime = false) =>
    iso
      ? new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
          ...(withTime ? {} : { timeZone: "UTC" }),
        }).format(new Date(iso))
      : "";

  const money = (v: string | number | null | undefined, cur: string) =>
    v === null || v === undefined || v === ""
      ? "—"
      : new Intl.NumberFormat(language === "de" ? "de-DE" : "en-GB", { style: "currency", currency: cur || "EUR" }).format(Number(v));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert(t("fileSizeLimit"));
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/rfqs/${token}/attachments`, { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) setFiles((prev) => [...prev, data.attachment]);
      else alert(data.error || t("uploadFailed"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSendMessage = async () => {
    if (readOnly || !msgText.trim()) return;
    setSendingMsg(true);
    try {
      const res = await fetch(`/api/rfqs/${token}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msgText.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages((prev) => [...prev, data.message]);
        setMsgText("");
      } else {
        alert(data.error || t("error"));
      }
    } finally {
      setSendingMsg(false);
    }
  };

  const handleCounterOfferRespond = async (coId: string, action: "accept" | "decline") => {
    if (readOnly) return;
    const res = await fetch(`/api/rfqs/${token}/counter-offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterOfferId: coId, action }),
    });
    if (res.ok) {
      setCounterOffers((prev) => prev.filter((co) => co.id !== coId));
    } else {
      const data = await res.json();
      alert(data.error || t("error"));
    }
  };

  const updateTierPrice = (itemId: string, qty: number, value: string) => {
    setPriceTiers((prev) =>
      prev.map((pt) => (pt.projectItemId === itemId && pt.quantity === qty ? { ...pt, unitPrice: value } : pt))
    );
  };

  const handleSubmit = async () => {
    if (readOnly || !rfq) return;
    if (isPastLocalDate(priceValidUntil)) { alert(t("priceValidInPast")); return; }
    if (!priceTiers.some((pt) => pt.unitPrice && Number(pt.unitPrice) > 0)) { alert(t("enterAtLeastOnePrice")); return; }

    const wasQuoted = rfq.status === "quoted";
    setSubmitting(true);
    try {
      const quotes = rfq.items.map((item) => ({
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
        priceTiers: priceTiers
          .filter((pt) => pt.projectItemId === item.id && pt.unitPrice && Number(pt.unitPrice) > 0)
          .map((pt) => ({ quantity: pt.quantity, unitPrice: Number(pt.unitPrice) })),
      })).filter((q) => q.priceTiers.length > 0);

      const res = await fetch(`/api/rfqs/${token}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: quotes }),
      });
      if (res.ok) {
        await loadRfq();
        setRevising(false);
        setBanner(wasQuoted ? "updated" : "submitted");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const data = await res.json();
        alert(data.error || t("error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (readOnly) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rfqs/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason, reasonText: declineText || null }),
      });
      if (res.ok) {
        await loadRfq();
        setShowDeclineForm(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const data = await res.json();
        alert(data.error || t("error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}><p className={styles.subtitle}>{t("loading")}</p></div>
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h2 className={styles.title}>{t("error")}</h2>
          <p className={styles.subtitle}>{t("linkInvalidOrExpired")}</p>
        </div>
      </div>
    );
  }

  const quoteState: QuoteState =
    rfq.status === "declined" ? "declined" : rfq.status === "quoted" ? "quoted" : rfq.deadlinePassed ? "closed" : "open";
  const showForm = !readOnly ? quoteState === "open" || (quoteState === "quoted" && revising) : quoteState === "open";
  const canRevise = quoteState === "quoted" && !rfq.deadlinePassed && !readOnly;
  const deadline = formatDate(rfq.quoteDeadline);
  const declineReasonKey = DECLINE_REASON_KEYS.find((r) => r.value === rfq.declineReason)?.key;

  const statusPill = {
    open: { label: t("statusAwaitingQuote"), cls: styles.pillOpen },
    quoted: { label: t("statusQuoteSubmitted"), cls: styles.pillQuoted },
    declined: { label: t("declined"), cls: styles.pillDeclined },
    closed: { label: t("statusDeadlinePassed"), cls: styles.pillClosed },
  }[quoteState];

  const statusText = (() => {
    switch (quoteState) {
      case "open":
        return deadline ? t("quoteDueBy").replace("{date}", deadline) : t("quoteDueNoDate");
      case "quoted": {
        const submitted = t("quoteSubmittedOn").replace("{date}", formatDate(rfq.respondedAt, true));
        const next = rfq.deadlinePassed ? t("quoteLocked") : deadline ? t("canReviseUntil").replace("{date}", deadline) : t("canRevise");
        return `${submitted} ${next}`;
      }
      case "declined":
        return t("declinedOn").replace("{date}", formatDate(rfq.respondedAt, true));
      case "closed":
        return t("deadlinePassedNoQuote");
    }
  })();

  const quotesByItem = new Map(rfq.existingQuotes.map((q) => [q.projectItemId, q]));
  const summaryTerms = rfq.existingQuotes[0];
  const firstNewId = chatMessages.find((m) => m.isNew)?.id;
  const tierQuantity = (tierId: string) =>
    rfq.existingQuotes.flatMap((q) => q.priceTiers).find((pt) => pt.id === tierId)?.quantity;

  return (
    <div className={styles.container}>
      <div className={styles.langToggle} role="group" aria-label="Language">
        {(["en", "de"] as const).map((lng) => (
          <button
            key={lng}
            type="button"
            className={language === lng ? styles.langActive : ""}
            onClick={() => setLanguage(lng)}
            aria-pressed={language === lng}
          >
            {lng.toUpperCase()}
          </button>
        ))}
      </div>

      {readOnly && (
        <div className={styles.previewBanner} role="status">
          <strong>{t("previewModeTitle")}</strong>
          <span>{t("previewModeMsg")}</span>
        </div>
      )}

      <div className={styles.statusCard}>
        <div className={styles.statusTop}>
          <div className={styles.statusHeading}>
            <div className={styles.eyebrow}>{rfq.projectNumber} · {rfq.supplierName}</div>
            <h1 className={styles.statusTitle}>{rfq.projectTitle}</h1>
          </div>
          <span className={`${styles.pill} ${statusPill.cls}`}>{statusPill.label}</span>
        </div>
        <p className={styles.statusText}>{statusText}</p>
        {quoteState === "declined" && declineReasonKey && (
          <p className={styles.statusMeta}>
            <strong>{t("reason")}:</strong> {t(declineReasonKey as TKey)}
            {rfq.declineReasonText ? ` — ${rfq.declineReasonText}` : ""}
          </p>
        )}
        {deadline && quoteState !== "declined" && (
          <p className={styles.statusMeta}><strong>{t("thDeadline")}:</strong> {deadline}</p>
        )}
      </div>

      {banner && (
        <div className={styles.successBanner} role="status">
          {banner === "updated" ? t("quoteUpdatedBanner") : t("quoteSubmittedBanner")}
        </div>
      )}

      <div className={styles.tabs} role="tablist">
        {([
          ["quote", t("tabQuote"), 0],
          ["messages", t("tabMessages"), messagesSeen ? 0 : newCount],
          ["files", t("tabFiles"), files.length],
        ] as [Tab, string, number][]).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`${styles.tab} ${tab === key ? styles.tabActive : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
            {count > 0 && (
              <span className={`${styles.tabBadge} ${key === "messages" ? styles.tabBadgeAlert : ""}`}>
                {key === "messages" ? t("newMessagesCount").replace("{count}", String(count)) : count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "quote" && (
        <>
          {counterOffers.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.sectionTitle}>{t("counterOffersTitle")}</h3>
              {counterOffers.map((co) => (
                <div key={co.id} className={styles.counterOffer}>
                  <div className={styles.counterOfferDate}>{t("received")} {formatDate(co.createdAt, true)}</div>
                  {co.message && <p className={styles.counterOfferMsg}>{co.message}</p>}
                  <div className={styles.counterOfferGrid}>
                    {Object.entries(co.unitPrices).map(([tierId, price]) => {
                      const qty = tierQuantity(tierId);
                      return (
                        <div key={tierId}>
                          {qty ? t("unitPriceLabel").replace("{qty}", String(qty)) : t("unitPrice")}: <strong>{money(price, currency)}</strong>
                        </div>
                      );
                    })}
                    {co.setupCost != null && <div>{t("setupCosts")}: <strong>{money(co.setupCost, currency)}</strong></div>}
                    {co.decorationCost != null && <div>{t("decorationCosts")}: <strong>{money(co.decorationCost, currency)}</strong></div>}
                    {co.freightCost != null && <div>{t("freightCosts")}: <strong>{money(co.freightCost, currency)}</strong></div>}
                  </div>
                  <div className={styles.counterOfferActions}>
                    <button type="button" className={styles.btnAccept} onClick={() => handleCounterOfferRespond(co.id, "accept")} disabled={readOnly}>
                      {t("accept")}
                    </button>
                    <button type="button" className={styles.btnReject} onClick={() => handleCounterOfferRespond(co.id, "decline")} disabled={readOnly}>
                      {t("decline")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {rfq.items.map((item) => {
            const quote = quotesByItem.get(item.id);
            return (
              <div key={item.id} className={styles.card}>
                <h3 className={styles.sectionTitle}>{item.name}</h3>
                {item.description && <p>{item.description}</p>}
                {item.decorationMethod && <p><strong>{t("decoMethod")}:</strong> {item.decorationMethod}</p>}
                <ItemAttachments
                  files={(item.attachments || []).map((a) => ({ id: a.id, fileName: a.fileName, mimeType: a.mimeType, url: a.signedUrl }))}
                />

                <hr className={styles.divider} />

                {showForm ? (
                  <>
                    <h3 className={styles.sectionTitle}>{t("pricingTiers")}</h3>
                    <div className={styles.pricingGrid}>
                      {item.quantityTiers.map((qt) => (
                        <div key={qt.id} className={styles.tierBox}>
                          <label>{t("unitPriceLabel").replace("{qty}", String(qt.quantity))}</label>
                          <div className={styles.inputWrapper}>
                            <span className={styles.currency}>{currency === "EUR" ? "€" : "$"}</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={priceTiers.find((pt) => pt.projectItemId === item.id && pt.quantity === qt.quantity)?.unitPrice || ""}
                              onChange={(e) => updateTierPrice(item.id, qt.quantity, e.target.value)}
                              disabled={readOnly}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className={styles.sectionTitle}>{t("yourQuote")}</h3>
                    <table className={styles.summaryTable}>
                      <thead>
                        <tr><th>{t("quantity")}</th><th>{t("unitPrice")}</th></tr>
                      </thead>
                      <tbody>
                        {item.quantityTiers.map((qt) => {
                          const tier = quote?.priceTiers.find((pt) => pt.quantity === qt.quantity);
                          return (
                            <tr key={qt.id}>
                              <td>{qt.quantity.toLocaleString(language === "de" ? "de-DE" : "en-GB")}</td>
                              <td>{tier ? money(tier.unitPrice, quote!.currency) : <span className={styles.muted}>{t("notQuoted")}</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            );
          })}

          {showForm && (
            <>
              <div className={styles.card}>
                <h3 className={styles.sectionTitle}>{t("costsAndTerms")}</h3>
                <div className={styles.additionalCosts}>
                  <div className={styles.inputGroup}>
                    <label>{t("currency")}</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={readOnly}>
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                  {([
                    [t("setupCosts"), setupCost, setSetupCost],
                    [t("decorationCosts"), decorationCost, setDecorationCost],
                  ] as [string, string, (v: string) => void][]).map(([label, value, set]) => (
                    <div key={label} className={styles.inputGroup}>
                      <label>{label}</label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.currency}>{currency === "EUR" ? "€" : "$"}</span>
                        <input type="number" step="0.01" min="0" placeholder="0.00" value={value} onChange={(e) => set(e.target.value)} disabled={readOnly} />
                      </div>
                    </div>
                  ))}
                  <div className={styles.inputGroup}>
                    <label>{t("decorationType")}</label>
                    <select value={decorationCostType} onChange={(e) => setDecorationCostType(e.target.value)} disabled={readOnly}>
                      <option value="per_unit">{t("perUnit")}</option>
                      <option value="flat_rate">{t("flatRate")}</option>
                    </select>
                  </div>
                  {([
                    [t("freightCosts"), freightCost, setFreightCost],
                    [t("sampleCosts"), sampleCost, setSampleCost],
                  ] as [string, string, (v: string) => void][]).map(([label, value, set]) => (
                    <div key={label} className={styles.inputGroup}>
                      <label>{label}</label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.currency}>{currency === "EUR" ? "€" : "$"}</span>
                        <input type="number" step="0.01" min="0" placeholder="0.00" value={value} onChange={(e) => set(e.target.value)} disabled={readOnly} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.card}>
                <h3 className={styles.sectionTitle}>{t("additionalInfo")}</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.inputGroup}>
                    <label>{t("leadTime")} ({t("workingDays")})</label>
                    <input type="number" min="1" placeholder="14" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} disabled={readOnly} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>{t("moq")}</label>
                    <input type="number" min="1" placeholder="100" value={minimumOrderQty} onChange={(e) => setMinimumOrderQty(e.target.value)} disabled={readOnly} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>{t("validUntil")}</label>
                    <input type="date" min={today || undefined} value={priceValidUntil} onChange={(e) => setPriceValidUntil(e.target.value)} disabled={readOnly} />
                  </div>
                </div>
                <div className={styles.inputGroupFull}>
                  <label>{t("commentsAlternatives")}</label>
                  <textarea rows={3} placeholder={t("commentsPlaceholder")} value={comment} onChange={(e) => setComment(e.target.value)} disabled={readOnly}></textarea>
                </div>
              </div>

              {showDeclineForm && quoteState === "open" && (
                <div className={styles.card}>
                  <h3 className={styles.sectionTitle}>{t("declineReasonTitle")}</h3>
                  <div className={styles.inputGroup} style={{ marginBottom: "1rem" }}>
                    <select value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}>
                      {DECLINE_REASON_KEYS.map((r) => (
                        <option key={r.value} value={r.value}>{t(r.key as TKey)}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.inputGroupFull}>
                    <textarea rows={2} placeholder={t("declineReasonPlaceholder")} value={declineText} onChange={(e) => setDeclineText(e.target.value)}></textarea>
                  </div>
                  <div className={styles.inlineActions}>
                    <button type="button" className={styles.btnDecline} onClick={handleDecline} disabled={submitting || readOnly}>
                      {submitting ? t("declining") : t("confirmDecline")}
                    </button>
                    <button type="button" className={styles.btnGhost} onClick={() => setShowDeclineForm(false)}>
                      {t("cancel")}
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.actions}>
                {quoteState === "open" && !showDeclineForm && (
                  <button type="button" className={styles.btnDecline} onClick={() => setShowDeclineForm(true)} disabled={readOnly}>
                    {t("declineQuote")}
                  </button>
                )}
                {revising && (
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => { resetForm(rfq); setRevising(false); }}
                    disabled={submitting}
                  >
                    {t("cancel")}
                  </button>
                )}
                <button type="button" className={styles.btnSubmit} onClick={handleSubmit} disabled={submitting || readOnly}>
                  {submitting ? t("submitting") : revising ? t("updateQuote") : t("submitQuote")}
                </button>
              </div>
            </>
          )}

          {!showForm && quoteState === "quoted" && summaryTerms && (
            <div className={styles.card}>
              <h3 className={styles.sectionTitle}>{t("costsAndTerms")}</h3>
              <dl className={styles.termsGrid}>
                <div><dt>{t("currency")}</dt><dd>{summaryTerms.currency}</dd></div>
                <div><dt>{t("setupCosts")}</dt><dd>{money(summaryTerms.setupCost, summaryTerms.currency)}</dd></div>
                <div>
                  <dt>{t("decorationCosts")}</dt>
                  <dd>
                    {money(summaryTerms.decorationCost, summaryTerms.currency)}{" "}
                    <span className={styles.muted}>({summaryTerms.decorationCostType === "per_unit" ? t("perUnit") : t("flatRate")})</span>
                  </dd>
                </div>
                <div><dt>{t("freightCosts")}</dt><dd>{money(summaryTerms.freightCost, summaryTerms.currency)}</dd></div>
                <div><dt>{t("sampleCosts")}</dt><dd>{money(summaryTerms.sampleCost, summaryTerms.currency)}</dd></div>
                <div><dt>{t("leadTime")}</dt><dd>{summaryTerms.leadTimeDays ? `${summaryTerms.leadTimeDays} ${t("workingDays")}` : "—"}</dd></div>
                <div><dt>{t("moq")}</dt><dd>{summaryTerms.minimumOrderQty ?? "—"}</dd></div>
                <div><dt>{t("validUntil")}</dt><dd>{formatDate(summaryTerms.priceValidUntil) || "—"}</dd></div>
              </dl>
              {summaryTerms.comment && (
                <div className={styles.summaryComment}>
                  <dt>{t("commentsAlternatives")}</dt>
                  <dd>{summaryTerms.comment}</dd>
                </div>
              )}
              {canRevise && (
                <div className={styles.actions}>
                  <button type="button" className={styles.btnSubmit} onClick={() => { setBanner(""); setRevising(true); }}>
                    {t("reviseQuote")}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "messages" && (
        <div className={styles.card} id="messages">
          <h3 className={styles.sectionTitle}>{t("messagesTitle")}</h3>
          <div className={styles.thread}>
            {chatMessages.length === 0 ? (
              <div className={styles.threadEmpty}>{t("noMessagesSupplier")}</div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id}>
                  {msg.id === firstNewId && (
                    <div className={styles.newDivider} ref={firstNewRef}><span>{t("newMessagesDivider")}</span></div>
                  )}
                  <div className={`${styles.bubble} ${msg.senderType === "supplier" ? styles.bubbleOwn : styles.bubbleOther}`}>
                    <div className={styles.bubbleMeta}>
                      <strong>{msg.senderType === "supplier" ? t("you") : msg.senderName || t("buyer")}</strong>
                      <span>{formatDate(msg.createdAt, true)}</span>
                      {msg.isNew && <span className={styles.newPill}>{t("newBadge")}</span>}
                    </div>
                    <div className={styles.bubbleText}>{msg.content}</div>
                  </div>
                </div>
              ))
            )}
            <div ref={threadEndRef} />
          </div>
          <div className={styles.composer}>
            <textarea
              rows={2}
              placeholder={t("typeMessage")}
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              disabled={readOnly}
            />
            <button
              type="button"
              className={styles.btnSend}
              onClick={handleSendMessage}
              disabled={readOnly || sendingMsg || !msgText.trim()}
            >
              {sendingMsg ? "…" : t("send")}
            </button>
          </div>
          <p className={styles.hint}>{t("buyerNotifiedHint")}</p>
        </div>
      )}

      {tab === "files" && (
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>{t("fileAttachments")}</h3>
          {([
            [t("sharedByBuyer"), files.filter((f) => !f.uploadedBySupplier)],
            [t("yourFiles"), files.filter((f) => f.uploadedBySupplier)],
          ] as [string, UploadedFile[]][]).map(([label, group]) => (
            <div key={label} className={styles.fileSection}>
              <div className={styles.fileSectionTitle}>{label}</div>
              {group.length === 0 ? (
                <p className={styles.hint}>{t("noFilesYet")}</p>
              ) : (
                <ul className={styles.fileList}>
                  {group.map((f) => (
                    <li key={f.id}>
                      <span>{f.fileName}</span>
                      <span className={styles.muted}>{formatDate(f.createdAt, true)}</span>
                      {f.signedUrl && (
                        <a href={f.signedUrl} target="_blank" rel="noopener noreferrer">{t("download")}</a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <label className={`${styles.uploadBtn} ${readOnly ? styles.uploadBtnDisabled : ""}`}>
            {uploading ? t("uploading") : t("uploadFile")}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" hidden onChange={handleFileUpload} disabled={uploading || readOnly} />
          </label>
          <span className={styles.hint}>{t("fileTypes")}</span>
        </div>
      )}
    </div>
  );
}
