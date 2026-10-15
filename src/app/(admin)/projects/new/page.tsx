"use client";

import Topbar from "../../../../components/Topbar";
import styles from "./page.module.css";
import Link from "next/link";
import { useLanguage } from "../../../../context/LanguageContext";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Item {
  key: number;
  name: string;
  description: string;
  decorationMethod: string;
  tiers: string[];
}

export default function CreateProjectPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [customerRef, setCustomerRef] = useState("");
  const [quoteDeadline, setQuoteDeadline] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [internalDesc, setInternalDesc] = useState("");
  const [items, setItems] = useState<Item[]>([
    { key: 1, name: "", description: "", decorationMethod: "Laser Engraving", tiers: ["", "", ""] },
  ]);

  const handleAddItem = () => {
    setItems([...items, { key: Date.now(), name: "", description: "", decorationMethod: "Laser Engraving", tiers: ["", "", ""] }]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: string) => {
    setItems(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const updateTier = (itemIdx: number, tierIdx: number, value: string) => {
    setItems(items.map((item, i) => {
      if (i !== itemIdx) return item;
      const tiers = [...item.tiers];
      tiers[tierIdx] = value;
      return { ...item, tiers };
    }));
  };

  const handleSaveDraft = async () => {
    await saveProject(false);
  };

  const handleSaveAndProceed = async () => {
    const projectId = await saveProject(true);
    if (projectId) {
      router.push(`/projects/${projectId}/suppliers`);
    }
  };

  const saveProject = async (proceed: boolean): Promise<string | null> => {
    if (!title.trim()) { alert(t("titleRequired")); return null; }
    if (!items.some((i) => i.name.trim())) { alert(t("itemRequired")); return null; }

    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          customerReference: customerRef.trim() || null,
          quoteDeadline: quoteDeadline || null,
          deliveryDate: deliveryDate || null,
          internalDescription: internalDesc.trim() || null,
          items: items
            .filter((i) => i.name.trim())
            .map((i, idx) => ({
              name: i.name.trim(),
              description: i.description.trim() || null,
              decorationMethod: i.decorationMethod,
              sortOrder: idx,
              quantityTiers: i.tiers
                .filter((t) => t && Number(t) > 0)
                .map((t, ti) => ({ quantity: Number(t), sortOrder: ti })),
            })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (!proceed) router.push("/projects");
        return data.project?.id || null;
      } else {
        const data = await res.json();
        alert(data.error || t("failedCreate"));
        return null;
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Topbar title={t("createProjectTitle")} subtitle={t("createProjectSubtitle")} backUrl="/projects">
        <button className={styles.btnSecondary} onClick={handleSaveDraft} disabled={saving}>
          {t("cancel")}
        </button>
        <button className={styles.btnPrimary} onClick={handleSaveAndProceed} disabled={saving}>
          {saving ? t("saving") : t("saveProceed")}
        </button>
      </Topbar>

      <div className={styles.content}>
        <div className={styles.formContainer}>
          <h2 className={styles.sectionTitle}>{t("projectDetails")}</h2>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>{t("thTitle")}</label>
              <input type="text" placeholder="e.g. 150 Water Bottles with logo" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("customerRef")}</label>
              <input type="text" placeholder="Enter customer name" value={customerRef} onChange={(e) => setCustomerRef(e.target.value)} />
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
            <textarea rows={3} placeholder="" value={internalDesc} onChange={(e) => setInternalDesc(e.target.value)}></textarea>
          </div>
        </div>

        <div className={styles.formContainer}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t("lineItems")}</h2>
            <button className={styles.btnSecondary} onClick={handleAddItem}>{t("addItem")}</button>
          </div>

          {items.map((item, index) => (
            <div key={item.key} className={styles.itemCard} style={{ marginTop: index > 0 ? "1rem" : "0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <div className={styles.itemHeader} style={{ marginBottom: 0 }}>{t("item")} {index + 1}</div>
                {index > 0 && (
                  <button
                    onClick={() => handleRemoveItem(index)}
                    style={{ background: "none", border: "none", color: "var(--danger-color, #ef4444)", cursor: "pointer" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                  </button>
                )}
              </div>
              <div className={styles.grid}>
                <div className={styles.inputGroup}>
                  <label>{t("itemName")}</label>
                  <input type="text" placeholder="e.g. Stainless Steel Bottle 500ml" value={item.name} onChange={(e) => updateItem(index, "name", e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <label>{t("decoMethod")}</label>
                  <select value={item.decorationMethod} onChange={(e) => updateItem(index, "decorationMethod", e.target.value)}>
                    <option>Laser Engraving</option>
                    <option>Screen Print</option>
                    <option>UV Print</option>
                    <option>Embroidery</option>
                    <option>Sublimation</option>
                    <option>Pad Print</option>
                  </select>
                </div>
              </div>

              <div className={styles.inputGroupFull}>
                <label>{t("itemDesc")}</label>
                <textarea rows={2} placeholder="" value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)}></textarea>
              </div>

              <div className={styles.tiersContainer}>
                <label>{t("quantityTiers")}</label>
                <div className={styles.tierGrid}>
                  {item.tiers.map((tier, ti) => (
                    <input
                      key={ti}
                      type="number"
                      placeholder={`${ti + 1}. (e.g. ${[150, 250, 500][ti]})`}
                      value={tier}
                      onChange={(e) => updateTier(index, ti, e.target.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
