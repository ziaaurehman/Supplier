"use client";

import Topbar from "../../../../../components/Topbar";
import styles from "../../new/suppliers/page.module.css";
import { useLanguage } from "../../../../../context/LanguageContext";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

interface Supplier {
  id: string;
  name: string;
  language: string;
  categories: { category: { name: string } }[];
}

export default function SupplierSelectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { t } = useLanguage();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    fetch(`/api/suppliers?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.suppliers || [];
        setSuppliers(list);
        const allCats = new Set<string>();
        list.forEach((s: Supplier) => s.categories.forEach((c) => allCats.add(c.category.name)));
        setCategories(Array.from(allCats).sort());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, category]);

  const toggleSupplier = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendRFQs = async () => {
    if (selected.size === 0) return alert("Select at least one supplier");
    setSending(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/rfqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierIds: Array.from(selected) }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.rfqs?.length) {
          alert(`RFQs sent to ${data.rfqs.length} supplier(s).\n\nDev links:\n${data.rfqs.map((l: { supplier: string; link: string }) => `${l.supplier}: ${l.link}`).join("\n")}`);
        }
        router.push(`/projects/${projectId}`);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send RFQs");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <Topbar title="Select Suppliers" subtitle="Choose who will receive this enquiry" backUrl={`/projects/${projectId}`}>
        <button className={styles.btnSecondary} onClick={() => router.push(`/projects/${projectId}`)}>
          {t("saveDraft")}
        </button>
        <button className={styles.btnPrimary} onClick={handleSendRFQs} disabled={sending}>
          {sending ? "Sending..." : t("sendRFQs")} ({selected.size})
        </button>
      </Topbar>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.filterBar}>
            <input
              type="text"
              placeholder="Search supplier name..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className={styles.filterSelect} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Category: All</option>
              {categories.map((c) => (
                <option key={c} value={c}>Category: {c}</option>
              ))}
            </select>
          </div>

          <div className={styles.tableResponsive}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading suppliers...</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}></th>
                    <th>{t("thSupplierName")}</th>
                    <th>{t("thCategories")}</th>
                    <th>{t("thLanguage")}</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggleSupplier(s.id)}
                        />
                      </td>
                      <td><strong>{s.name}</strong></td>
                      <td>
                        {s.categories.map((c) => (
                          <span key={c.category.name} className={styles.tag}>{c.category.name}</span>
                        ))}
                      </td>
                      <td>{s.language === "de" ? "German" : "English"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
