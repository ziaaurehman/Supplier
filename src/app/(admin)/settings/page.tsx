"use client";

import Topbar from "../../../components/Topbar";
import styles from "./page.module.css";
import { useLanguage } from "../../../context/LanguageContext";

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div>
      <Topbar title={t("settingsTitle")} subtitle={t("settingsSubtitle")} />

      <div className={styles.content}>
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>{t("profileSettings")}</h2>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>{t("fullName")}</label>
              <input type="text" defaultValue="Super Admin" />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("emailAddr")}</label>
              <input type="email" defaultValue="admin@supplier-rfq.com" />
            </div>
          </div>
          <button className={styles.btnPrimary}>{t("saveProfile")}</button>
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>{t("emailConfig")}</h2>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>{t("sendingDomain")}</label>
              <input type="text" defaultValue="rfq.supplier-rfq.com" />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("apiKey")}</label>
              <input type="password" defaultValue="************************" />
            </div>
          </div>
          <button className={styles.btnPrimary}>{t("saveEmail")}</button>
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>{t("platformLang")}</h2>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>{t("platformLang")}</label>
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value as "en" | "de")}
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
