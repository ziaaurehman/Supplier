"use client";

import styles from "./page.module.css";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login, isLoading, role } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (role) {
    router.push("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = await login(email, password);
    if (result.error) {
      setError(result.error);
    }
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

        {error && (
          <div className={styles.errorBox}>{error}</div>
        )}

        <form onSubmit={handleSubmit} className={styles.buttonGroup}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">{t("emailAddr")}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@supplier-rfq.com"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className={styles.input}
            />
          </div>

          <button
            type="submit"
            className={`${styles.btn} ${styles.btnAdmin}`}
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : t("welcomeBack")}
          </button>
        </form>
      </div>
    </div>
  );
}
