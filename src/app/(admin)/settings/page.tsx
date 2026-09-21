"use client";

import Topbar from "../../../components/Topbar";
import styles from "./page.module.css";
import { useLanguage } from "../../../context/LanguageContext";
import { useAuth } from "../../../context/AuthContext";

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { role } = useAuth();

  const roleLabels = {
    "ADMIN": "Super Admin",
    "INTERNAL_SALES": "Internal Sales",
    "FIELD_SALES": "Field Sales"
  };
  
  const currentRoleLabel = role ? roleLabels[role] : "User";
  const defaultEmail = role ? `${role.toLowerCase()}@supplier-rfq.com` : "user@supplier-rfq.com";

  return (
    <div>
      <Topbar title={t("settingsTitle")} subtitle={t("settingsSubtitle")} />

      <div className={styles.content}>
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>{t("profileSettings")}</h2>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>{t("fullName")}</label>
              <input type="text" defaultValue={currentRoleLabel} />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("emailAddr")}</label>
              <input type="email" defaultValue={defaultEmail} />
            </div>
          </div>
          <button className={styles.btnPrimary}>{t("saveProfile")}</button>
        </div>

        {role === "ADMIN" && (
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
        )}

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
