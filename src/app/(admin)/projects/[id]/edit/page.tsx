"use client";

import Topbar from "../../../../../components/Topbar";
import styles from "./page.module.css";
import { useLanguage } from "../../../../../context/LanguageContext";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

interface Item {
  key: number;
  id?: string;
  name: string;
  description: string;
  decorationMethod: string;
  tiers: string[];
}

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [customerRef, setCustomerRef] = useState("");
  const [quoteDeadline, setQuoteDeadline] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [internalDesc, setInternalDesc] = useState("");
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const p = data.project;
        setTitle(p.title);
        setCustomerRef(p.customerReference || "");
        setQuoteDeadline(p.quoteDeadline ? p.quoteDeadline.split("T")[0] : "");
        setDeliveryDate(p.deliveryDate ? p.deliveryDate.split("T")[0] : "");
        setInternalDesc(p.internalDescription || "");
        setItems(
          p.items.map((item: { id: string; name: string; description: string | null; decorationMethod: string | null; quantityTiers: { quantity: number }[] }, i: number) => ({
            key: i,
            id: item.id,
            name: item.name,
            description: item.description || "",
            decorationMethod: item.decorationMethod || "Laser Engraving",
            tiers: item.quantityTiers.length > 0
              ? item.quantityTiers.map((qt) => String(qt.quantity))
              : ["", "", ""],
          }))
        );
      })
      .catch(() => alert(t("failedLoad")))
      .finally(() => setLoading(false));
  }, [id, t]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          customerReference: customerRef.trim() || null,
          quoteDeadline: quoteDeadline || null,
          deliveryDate: deliveryDate || null,
          internalDescription: internalDesc.trim() || null,
        }),
      });
      if (res.ok) {
        router.push(`/projects/${id}`);
      } else {
        const data = await res.json();
        alert(data.error || t("failedUpdate"));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Topbar title={t("editProjectTitle")} subtitle={t("loading")} backUrl="/projects" />
        <div style={{ padding: 40, textAlign: "center" }}>{t("loading")}</div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title={t("editProjectTitle")} subtitle={t("editProjectSubtitle")} backUrl={`/projects/${id}`}>
        <button className={styles.btnSecondary} onClick={() => router.push(`/projects/${id}`)}>
          {t("cancel")}
        </button>
        <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
          {saving ? t("saving") : t("saveProceed")}
        </button>
      </Topbar>

      <div className={styles.content}>
        <div className={styles.formContainer}>
          <h2 className={styles.sectionTitle}>{t("projectDetails")}</h2>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>{t("thTitle")}</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("customerRef")}</label>
              <input type="text" value={customerRef} onChange={(e) => setCustomerRef(e.target.value)} />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("thDeadline")}</label>
              <input type="date" value={quoteDeadline} onChange={(e) => setQuoteDeadline(e.target.value)} />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("deliveryDate")}</label>
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
          </div>

          <div className={styles.inputGroupFull}>
            <label>{t("internalDesc")}</label>
            <textarea rows={3} value={internalDesc} onChange={(e) => setInternalDesc(e.target.value)}></textarea>
          </div>
        </div>

        <div className={styles.formContainer}>
          <h2 className={styles.sectionTitle}>{t("lineItemsReadOnly")}</h2>
          {items.map((item, index) => (
            <div key={item.key} className={styles.itemCard} style={{ marginTop: index > 0 ? "1rem" : "0", opacity: 0.8 }}>
              <div className={styles.itemHeader}>{t("item")} {index + 1}: {item.name}</div>
              <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                {item.decorationMethod} | {t("quantityTiers")}: {item.tiers.filter(Boolean).join(" / ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
