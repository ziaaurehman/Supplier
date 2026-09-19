"use client";

import Topbar from "../../../../components/Topbar";
import styles from "./page.module.css";
import Link from "next/link";
import { useLanguage } from "../../../../context/LanguageContext";

export default function CreateProjectPage() {
  const { t } = useLanguage();

  return (
    <div>
      <Topbar title={t("createProjectTitle")} subtitle={t("createProjectSubtitle")}>
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
            <button className={styles.btnSecondary}>{t("addItem")}</button>
          </div>

          <div className={styles.itemCard}>
            <div className={styles.itemHeader}>Item 1</div>
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
        </div>
      </div>
    </div>
  );
}
