"use client";

import Topbar from "../../../../../components/Topbar";
import styles from "./page.module.css";
import Link from "next/link";
import { useLanguage } from "../../../../../context/LanguageContext";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

interface Contact {
  key: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export default function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [erpId, setErpId] = useState("");
  const [language, setLanguage] = useState("de");
  const [categoriesText, setCategoriesText] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    fetch(`/api/suppliers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const s = data.supplier;
        setName(s.name);
        setErpId(s.externalSupplierId || "");
        setLanguage(s.language);
        setCategoriesText(s.categories.map((c: { category: { name: string } }) => c.category.name).join(", "));
        setContacts(
          s.contacts.map((c: { firstName: string; lastName: string; email: string; phone: string | null; isPrimary: boolean }, i: number) => ({
            key: i,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone || "",
            isPrimary: c.isPrimary,
          }))
        );
      })
      .catch(() => alert("Failed to load supplier"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddContact = () => {
    setContacts([...contacts, { key: Date.now(), firstName: "", lastName: "", email: "", phone: "", isPrimary: false }]);
  };

  const handleRemoveContact = (idx: number) => {
    setContacts(contacts.filter((_, i) => i !== idx));
  };

  const updateContact = (idx: number, field: keyof Contact, value: string | boolean) => {
    setContacts(contacts.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("Company name is required");
    setSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          externalSupplierId: erpId.trim() || null,
          language,
          categoryNames: categoriesText.split(",").map((c) => c.trim()).filter(Boolean),
          contacts: contacts.map((c) => ({
            firstName: c.firstName.trim(),
            lastName: c.lastName.trim(),
            email: c.email.trim(),
            phone: c.phone.trim() || null,
            isPrimary: c.isPrimary,
          })),
        }),
      });
      if (res.ok) {
        router.push("/suppliers");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update supplier");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Topbar title="Edit Supplier" subtitle="Loading..." backUrl="/suppliers" />
        <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Edit Supplier" subtitle={`Editing ${name}`} backUrl="/suppliers">
        <Link href="/suppliers">
          <button className={styles.btnSecondary}>{t("cancel")}</button>
        </Link>
        <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : t("saveSupplier")}
        </button>
      </Topbar>

      <div className={styles.content}>
        <div className={styles.formContainer}>
          <h2 className={styles.sectionTitle}>{t("companyDetails")}</h2>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>{t("companyName")}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("erpId")}</label>
              <input type="text" value={erpId} onChange={(e) => setErpId(e.target.value)} />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("defaultLang")}</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="de">German</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label>{t("productCats")}</label>
              <input type="text" value={categoriesText} onChange={(e) => setCategoriesText(e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.formContainer}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t("contactPersons")}</h2>
            <button className={styles.btnSecondary} onClick={handleAddContact}>{t("addContact")}</button>
          </div>

          {contacts.map((contact, index) => (
            <div key={contact.key} className={styles.contactCard} style={{ marginTop: index > 0 ? "1rem" : "0", position: "relative" }}>
              {index > 0 && (
                <button
                  onClick={() => handleRemoveContact(index)}
                  style={{ position: "absolute", top: "1.25rem", right: "1.5rem", background: "none", border: "none", color: "var(--danger-color, #ef4444)", cursor: "pointer" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              )}
              <div className={styles.grid}>
                <div className={styles.inputGroup}>
                  <label>{t("firstName")}</label>
                  <input type="text" value={contact.firstName} onChange={(e) => updateContact(index, "firstName", e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <label>{t("lastName")}</label>
                  <input type="text" value={contact.lastName} onChange={(e) => updateContact(index, "lastName", e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <label>{t("emailAddr")}</label>
                  <input type="email" value={contact.email} onChange={(e) => updateContact(index, "email", e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <label>{t("phoneNum")}</label>
                  <input type="tel" value={contact.phone} onChange={(e) => updateContact(index, "phone", e.target.value)} />
                </div>
              </div>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={contact.isPrimary} onChange={(e) => updateContact(index, "isPrimary", e.target.checked)} />
                {t("primaryContact")}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
