"use client";

import Topbar from "../../../../components/Topbar";
import styles from "./page.module.css";
import Link from "next/link";
import { useLanguage } from "../../../../context/LanguageContext";

export default function CreateSupplierPage() {
  const { t } = useLanguage();

  return (
    <div>
      <Topbar title={t("addSupplierTitle")} subtitle={t("addSupplierSubtitle")}>
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
            <button className={styles.btnSecondary}>{t("addContact")}</button>
          </div>

          <div className={styles.contactCard}>
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
              <input type="checkbox" defaultChecked />
              {t("primaryContact")}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
