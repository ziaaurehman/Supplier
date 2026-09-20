"use client";

import Topbar from "../../../../../components/Topbar";
import styles from "./page.module.css";
import Link from "next/link";
import { useLanguage } from "../../../../../context/LanguageContext";
import { useState } from "react";

export default function EditProjectPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState([1]);

  const handleAddItem = () => {
    setItems([...items, Date.now()]);
  };

  const handleRemoveItem = (indexToRemove: number) => {
    setItems(items.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div>
      <Topbar title="Edit Project" subtitle="Update project details" backUrl="/projects">
        <Link href="/projects">
          <button className={styles.btnSecondary}>{t("cancel")}</button>
        </Link>
        <Link href="/projects/new/suppliers">
          <button className={styles.btnPrimary}>{t("saveProceed")}</button>
        </Link>
      </Topbar>

      <div className={styles.content}>
        <div className={styles.formContainer}>
          <h2 className={styles.sectionTitle}>{t("projectDetails")}</h2>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>{t("thTitle")}</label>
              <input type="text" placeholder="e.g. 150 Water Bottles with logo" />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("customerRef")}</label>
              <input type="text" placeholder="Enter customer name" />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("thDeadline")}</label>
              <input type="date" />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("deliveryDate")}</label>
              <input type="date" />
            </div>
          </div>
          
          <div className={styles.inputGroupFull}>
            <label>{t("internalDesc")}</label>
            <textarea rows={3} placeholder="Add any internal notes here..."></textarea>
          </div>
        </div>

        <div className={styles.formContainer}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t("lineItems")}</h2>
            <button className={styles.btnSecondary} onClick={handleAddItem}>{t("addItem")}</button>
          </div>

          {items.map((item, index) => (
            <div key={item} className={styles.itemCard} style={{ marginTop: index > 0 ? "1rem" : "0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <div className={styles.itemHeader} style={{ marginBottom: 0 }}>Item {index + 1}</div>
                {index > 0 && (
                  <button 
                    onClick={() => handleRemoveItem(index)}
                    style={{ background: "none", border: "none", color: "var(--danger-color, #ef4444)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    title="Remove Item"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                  </button>
                )}
              </div>
              <div className={styles.grid}>
                <div className={styles.inputGroup}>
                  <label>{t("itemName")}</label>
                  <input type="text" placeholder="e.g. Stainless Steel Bottle 500ml" />
                </div>
                <div className={styles.inputGroup}>
                  <label>{t("decoMethod")}</label>
                  <select>
                    <option>Laser Engraving</option>
                    <option>Screen Print</option>
                    <option>UV Print</option>
                  </select>
                </div>
              </div>
              
              <div className={styles.inputGroupFull}>
                <label>{t("itemDesc")}</label>
                <textarea rows={2} placeholder="Color, material preference, etc."></textarea>
              </div>

              <div className={styles.tiersContainer}>
                <label>{t("quantityTiers")}</label>
                <div className={styles.tierGrid}>
                  <input type="number" placeholder="Tier 1 (e.g. 150)" />
                  <input type="number" placeholder="Tier 2 (e.g. 250)" />
                  <input type="number" placeholder="Tier 3 (e.g. 500)" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
