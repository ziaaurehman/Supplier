"use client";

import Topbar from "../../../components/Topbar";
import styles from "./page.module.css";
import Link from "next/link";
import { useLanguage } from "../../../context/LanguageContext";
import { useEffect, useState, useRef } from "react";

interface Supplier {
  id: string;
  name: string;
  language: string;
  isActive: boolean;
  contacts: { firstName: string; lastName: string; email: string; isPrimary: boolean }[];
  categories: { category: { name: string } }[];
}

export default function SuppliersPage() {
  const { t } = useLanguage();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSuppliers = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/suppliers?${params}`)
      .then((r) => r.json())
      .then((data) => setSuppliers(data.suppliers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/suppliers/import", { method: "POST", body: formData });
    const data = await res.json();
    if (res.ok) {
      alert(t("importedSuppliers").replace("{count}", data.imported).replace("{skipped}", data.skipped));
      fetchSuppliers();
    } else {
      alert(data.error || t("importFailed"));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div>
      <Topbar title={t("suppliersTitle")} subtitle={t("suppliersSubtitle")}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleCsvImport}
        />
        <button className={styles.btnSecondary} onClick={() => window.open("/api/suppliers/export", "_blank")}>
          {t("exportCsv")}
        </button>
        <button className={styles.btnSecondary} onClick={() => fileInputRef.current?.click()}>
          {t("importCsv")}
        </button>
        <Link href="/suppliers/new">
          <button className={styles.btnPrimary}>{t("addSupplier")}</button>
        </Link>
      </Topbar>

      <div className={styles.content}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder={t("searchSuppliers")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.emptyState}>{t("loading")}</div>
          ) : suppliers.length === 0 ? (
            <div className={styles.emptyState}>{t("noSuppliersYet")}</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("companyName")}</th>
                  <th>{t("thContacts")}</th>
                  <th>{t("emailAddr")}</th>
                  <th>{t("thCategories")}</th>
                  <th>{t("thStatus")}</th>
                  <th>{t("thAction")}</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => {
                  const primary = s.contacts.find((c) => c.isPrimary) || s.contacts[0];
                  return (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{primary ? `${primary.firstName} ${primary.lastName}` : "—"}</td>
                      <td>{primary?.email || "—"}</td>
                      <td>
                        {s.categories.map((sc) => (
                          <span key={sc.category.name} className={styles.tag}>{sc.category.name}</span>
                        ))}
                      </td>
                      <td>
                        <span className={s.isActive ? styles.statusActive : styles.statusInactive}>
                          {s.isActive ? t("active") : t("inactive")}
                        </span>
                      </td>
                      <td>
                        <Link href={`/suppliers/${s.id}/edit`}>
                          <button className={styles.actionBtn}>{t("edit")}</button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
