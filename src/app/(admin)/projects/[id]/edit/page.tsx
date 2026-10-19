"use client";

import Topbar from "../../../../../components/Topbar";
import styles from "./page.module.css";
import { useLanguage } from "../../../../../context/LanguageContext";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import ItemAttachments, { type ItemFile } from "../../../../../components/ItemAttachments";
import { useTodayLocal } from "@/hooks/useTodayLocal";
import { isPastLocalDate } from "@/lib/dates";

interface ApiAttachment {
  id: string;
  projectItemId: string | null;
  fileName: string;
  mimeType: string | null;
  signedUrl: string | null;
}

const toItemFile = (a: ApiAttachment): ItemFile => ({
  id: a.id,
  fileName: a.fileName,
  mimeType: a.mimeType,
  url: a.signedUrl,
});

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
  const [original, setOriginal] = useState({ quoteDeadline: "", deliveryDate: "" });
  const today = useTodayLocal();
  const [internalDesc, setInternalDesc] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [itemFiles, setItemFiles] = useState<Record<string, ItemFile[]>>({});
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/attachments?projectId=${id}`)
      .then((r) => r.json())
      .then((data) => {
        const grouped: Record<string, ItemFile[]> = {};
        for (const a of (data.attachments || []) as ApiAttachment[]) {
          if (!a.projectItemId) continue;
          (grouped[a.projectItemId] ||= []).push(toItemFile(a));
        }
        Object.values(grouped).forEach((list) => list.reverse());
        setItemFiles(grouped);
      })
      .catch(() => {});
  }, [id]);

  const handleAddItemFiles = async (itemId: string, picked: File[]) => {
    setUploadingItem(itemId);
    try {
      for (const file of picked) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", id);
        formData.append("projectItemId", itemId);
        formData.append("visibleToSupplier", "true");
        const res = await fetch("/api/attachments", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) {
          alert(`${file.name}: ${data.error || t("uploadFailed")}`);
          continue;
        }
        setItemFiles((prev) => ({ ...prev, [itemId]: [...(prev[itemId] || []), toItemFile(data.attachment)] }));
      }
    } finally {
      setUploadingItem(null);
    }
  };

  const handleRemoveItemFile = async (itemId: string, fileId: string) => {
    if (!confirm(t("removeFileConfirm"))) return;
    const res = await fetch(`/api/attachments/${fileId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || t("error"));
      return;
    }
    setItemFiles((prev) => ({ ...prev, [itemId]: (prev[itemId] || []).filter((f) => f.id !== fileId) }));
  };

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const p = data.project;
        setTitle(p.title);
        setCustomerRef(p.customerReference || "");
        setQuoteDeadline(p.quoteDeadline ? p.quoteDeadline.split("T")[0] : "");
        setDeliveryDate(p.deliveryDate ? p.deliveryDate.split("T")[0] : "");
        setOriginal({
          quoteDeadline: p.quoteDeadline ? p.quoteDeadline.split("T")[0] : "",
          deliveryDate: p.deliveryDate ? p.deliveryDate.split("T")[0] : "",
        });
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
    const deadlineChanged = quoteDeadline !== original.quoteDeadline;
    const deliveryChanged = deliveryDate !== original.deliveryDate;
    if (deadlineChanged && isPastLocalDate(quoteDeadline)) { alert(t("deadlineInPast")); return; }
    if (deliveryChanged && isPastLocalDate(deliveryDate)) { alert(t("deliveryInPast")); return; }
    if ((deadlineChanged || deliveryChanged) && quoteDeadline && deliveryDate && deliveryDate < quoteDeadline) {
      alert(t("deliveryBeforeDeadline"));
      return;
    }
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

  // Keep an already-past saved date valid in the picker; new picks must be today or later.
  const minFor = (saved: string, floor = "") => {
    if (!today) return undefined;
    const base = saved && saved < today ? saved : today;
    return floor > base ? floor : base;
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
              <input type="date" min={minFor(original.quoteDeadline)} value={quoteDeadline} onChange={(e) => setQuoteDeadline(e.target.value)} />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("deliveryDate")}</label>
              <input type="date" min={minFor(original.deliveryDate, quoteDeadline)} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
          </div>

          <div className={styles.inputGroupFull}>
            <label>{t("internalDesc")}</label>
            <textarea rows={3} value={internalDesc} onChange={(e) => setInternalDesc(e.target.value)}></textarea>
          </div>
        </div>

        <div className={styles.formContainer}>
          <h2 className={styles.sectionTitle}>{t("lineItems")}</h2>
          {items.map((item, index) => (
            <div key={item.key} className={styles.itemCard} style={{ marginTop: index > 0 ? "1rem" : "0" }}>
              <div className={styles.itemHeader}>{t("item")} {index + 1}: {item.name}</div>
              <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                {item.decorationMethod} | {t("quantityTiers")}: {item.tiers.filter(Boolean).join(" / ")}
              </p>
              {item.id && (
                <ItemAttachments
                  files={itemFiles[item.id] || []}
                  onAdd={(picked) => handleAddItemFiles(item.id!, picked)}
                  onRemove={(fileId) => handleRemoveItemFile(item.id!, fileId)}
                  busy={uploadingItem === item.id}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
