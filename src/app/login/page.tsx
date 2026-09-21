"use client";

import styles from "./page.module.css";
import { useAuth, Role } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();

  const handleLogin = (role: Role) => {
    login(role);
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.logo}>
          <div className={styles.icon}>S</div>
          <span className={styles.title}>SupplierRFQ</span>
        </div>
        
        <h2 className={styles.welcomeText}>{t("welcomeBack")}</h2>
        <p className={styles.subtitle}>{t("loginSubtitle")}</p>

        <div className={styles.buttonGroup}>
          <button 
            className={`${styles.btn} ${styles.btnAdmin}`}
            onClick={() => handleLogin("ADMIN")}
          >
            {t("loginAdmin")}
          </button>
          
          <button 
            className={`${styles.btn} ${styles.btnInternal}`}
            onClick={() => handleLogin("INTERNAL_SALES")}
          >
            {t("loginInternal")}
          </button>
          
          <button 
            className={`${styles.btn} ${styles.btnField}`}
            onClick={() => handleLogin("FIELD_SALES")}
          >
            {t("loginField")}
          </button>
        </div>
      </div>
    </div>
  );
}
