"use client";

import Topbar from "../../../../components/Topbar";
import styles from "./page.module.css";
import Link from "next/link";
import { useLanguage } from "../../../../context/LanguageContext";
import ItemAttachments from "../../../../components/ItemAttachments";
import { useTodayLocal } from "@/hooks/useTodayLocal";
import { isPastLocalDate } from "@/lib/dates";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
}

interface Item {
  key: number;
  name: string;
  description: string;
  decorationMethod: string;
  tiers: string[];
  files: PendingFile[];
}

const newItem = (): Item => ({
  key: Date.now() + Math.random(),
  name: "",
  description: "",
  decorationMethod: "Laser Engraving",
  tiers: ["", "", ""],
  files: [],
});

export default function CreateProjectPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [customerRef, setCustomerRef] = useState("");
  const [quoteDeadline, setQuoteDeadline] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const today = useTodayLocal();
  const [internalDesc, setInternalDesc] = useState("");
  const [items, setItems] = useState<Item[]>(() => [newItem()]);

  const handleAddItem = () => {
    setItems([...items, newItem()]);
  };

  const handleRemoveItem = (idx: number) => {
    items[idx].files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setItems(items.filter((_, i) => i !== idx));
  };

  const addItemFiles = (idx: number, picked: File[]) => {
    const pending = picked.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, files: [...item.files, ...pending] } : item)));
  };

  const removeItemFile = (idx: number, fileId: string) => {
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const target = item.files.find((f) => f.id === fileId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return { ...item, files: item.files.filter((f) => f.id !== fileId) };
    }));
  };

  const uploadItemFiles = async (
    projectId: string,
    createdItems: { id: string; sortOrder: number }[],
    submitted: Item[]
  ): Promise<boolean> => {
    const uploads = submitted.flatMap((item, idx) => {
      const created = createdItems.find((c) => c.sortOrder === idx);
      if (!created) return [];
      return item.files.map(async (f) => {
        const formData = new FormData();
        formData.append("file", f.file);
        formData.append("projectId", projectId);
        formData.append("projectItemId", created.id);
        formData.append("visibleToSupplier", "true");
        const res = await fetch("/api/attachments", { method: "POST", body: formData });
        return res.ok;
      });
    });
    const results = await Promise.all(uploads);
    return results.every(Boolean);
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

  const handleCancel = () => {
    const hasInput =
      [title, customerRef, quoteDeadline, deliveryDate, internalDesc].some((v) => v.trim()) ||
      items.some((i) => i.name.trim() || i.description.trim() || i.tiers.some(Boolean) || i.files.length > 0);
    if (hasInput && !confirm(t("discardProjectConfirm"))) return;
    items.forEach((i) => i.files.forEach((f) => URL.revokeObjectURL(f.previewUrl)));
    router.push("/projects");
  };

  const handleSaveAndProceed = async () => {
    const projectId = await saveProject();
    if (projectId) {
      router.push(`/projects/${projectId}/suppliers`);
    }
  };

  const saveProject = async (): Promise<string | null> => {
    if (!title.trim()) { alert(t("titleRequired")); return null; }
    if (isPastLocalDate(quoteDeadline)) { alert(t("deadlineInPast")); return null; }
    if (isPastLocalDate(deliveryDate)) { alert(t("deliveryInPast")); return null; }
    if (quoteDeadline && deliveryDate && deliveryDate < quoteDeadline) { alert(t("deliveryBeforeDeadline")); return null; }
    if (!items.some((i) => i.name.trim())) { alert(t("itemRequired")); return null; }

    const submitted = items.filter((i) => i.name.trim());

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
          items: submitted
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
        const projectId: string | null = data.project?.id || null;
        if (projectId && submitted.some((i) => i.files.length > 0)) {
          const allUploaded = await uploadItemFiles(projectId, data.project.items || [], submitted);
          if (!allUploaded) alert(t("someUploadsFailed"));
        }
        return projectId;
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
        <button className={styles.btnSecondary} onClick={handleCancel} disabled={saving}>
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
              <input type="date" min={today || undefined} value={quoteDeadline} onChange={(e) => setQuoteDeadline(e.target.value)} />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("deliveryDate")}</label>
              <input type="date" min={(quoteDeadline > today ? quoteDeadline : today) || undefined} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
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

              <ItemAttachments
                files={item.files.map((f) => ({ id: f.id, fileName: f.file.name, mimeType: f.file.type, url: f.previewUrl }))}
                onAdd={(picked) => addItemFiles(index, picked)}
                onRemove={(fileId) => removeItemFile(index, fileId)}
                busy={saving}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
