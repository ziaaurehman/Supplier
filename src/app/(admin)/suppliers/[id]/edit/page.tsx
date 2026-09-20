"use client";

import Topbar from "../../../../../components/Topbar";
import styles from "./page.module.css";
import Link from "next/link";
import { useLanguage } from "../../../../../context/LanguageContext";
import { useState } from "react";

export default function EditSupplierPage() {
  const { t } = useLanguage();
  const [contacts, setContacts] = useState([1]);

  const handleAddContact = () => {
    setContacts([...contacts, Date.now()]);
  };

  const handleRemoveContact = (indexToRemove: number) => {
    setContacts(contacts.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div>
      <Topbar title="Edit Supplier" subtitle="Update supplier details" backUrl="/suppliers">
        <Link href="/suppliers">
          <button className={styles.btnSecondary}>{t("cancel")}</button>
        </Link>
        <Link href="/suppliers">
          <button className={styles.btnPrimary}>{t("saveSupplier")}</button>
        </Link>
      </Topbar>

      <div className={styles.content}>
        <div className={styles.formContainer}>
          <h2 className={styles.sectionTitle}>{t("companyDetails")}</h2>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>{t("companyName")}</label>
              <input type="text" placeholder="e.g. Acme Promos GmbH" />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("erpId")}</label>
              <input type="text" placeholder="e.g. ERP-9923" />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("defaultLang")}</label>
              <select>
                <option>English</option>
                <option>German</option>
                <option>French</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label>{t("productCats")}</label>
              <input type="text" placeholder="e.g. Water Bottles, Apparel, Pens" />
            </div>
          </div>
        </div>

        <div className={styles.formContainer}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t("contactPersons")}</h2>
            <button className={styles.btnSecondary} onClick={handleAddContact}>{t("addContact")}</button>
          </div>

          {contacts.map((contact, index) => (
            <div key={contact} className={styles.contactCard} style={{ marginTop: index > 0 ? "1rem" : "0", position: "relative" }}>
              {index > 0 && (
                <button 
                  onClick={() => handleRemoveContact(index)}
                  style={{ position: "absolute", top: "1.25rem", right: "1.5rem", background: "none", border: "none", color: "var(--danger-color, #ef4444)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  title="Remove Contact"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              )}
              <div className={styles.grid}>
                <div className={styles.inputGroup}>
                  <label>{t("firstName")}</label>
                  <input type="text" placeholder="Jane" />
                </div>
                <div className={styles.inputGroup}>
                  <label>{t("lastName")}</label>
                  <input type="text" placeholder="Doe" />
                </div>
                <div className={styles.inputGroup}>
                  <label>{t("emailAddr")}</label>
                  <input type="email" placeholder="jane@acmepromos.de" />
                </div>
                <div className={styles.inputGroup}>
                  <label>{t("phoneNum")}</label>
                  <input type="tel" placeholder="+49 123 456789" />
                </div>
              </div>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" defaultChecked={index === 0} />
                {t("primaryContact")}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
