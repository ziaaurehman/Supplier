"use client";

import Topbar from "../../../components/Topbar";
import styles from "./page.module.css";
import { useLanguage } from "../../../context/LanguageContext";
import { useAuth } from "../../../context/AuthContext";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { role, user } = useAuth();

  const roleLabels: Record<string, string> = {
    "ADMIN": "Super Admin",
    "INTERNAL_SALES": "Internal Sales",
    "FIELD_SALES": "Field Sales"
  };

  const currentRoleLabel = role ? roleLabels[role] : "User";

  const [emailFrom, setEmailFrom] = useState("");
  const [sendingDomain, setSendingDomain] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);

  useEffect(() => {
    if (role === "ADMIN") {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => {
          if (data.settings) {
            setEmailFrom(data.settings.emailFrom || "");
            setSendingDomain(data.settings.sendingDomain || "");
            setCompanyName(data.settings.companyName || "");
          }
        })
        .catch(() => {});
    }
  }, [role]);

  const handleSaveEmail = async () => {
    setSavingEmail(true);
    setEmailSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailFrom, sendingDomain, companyName }),
      });
      if (res.ok) setEmailSaved(true);
      else alert("Failed to save settings");
    } finally {
      setSavingEmail(false);
      setTimeout(() => setEmailSaved(false), 3000);
    }
  };

  return (
    <div>
      <Topbar title={t("settingsTitle")} subtitle={t("settingsSubtitle")} />

      <div className={styles.content}>
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>{t("profileSettings")}</h2>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>{t("fullName")}</label>
              <input type="text" defaultValue={user?.fullName || currentRoleLabel} readOnly />
            </div>
            <div className={styles.inputGroup}>
              <label>{t("emailAddr")}</label>
              <input type="email" defaultValue={user?.email || ""} readOnly />
            </div>
            <div className={styles.inputGroup}>
              <label>Role</label>
              <input type="text" defaultValue={currentRoleLabel} readOnly />
            </div>
          </div>
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

        {role === "ADMIN" && (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>{t("emailConfig")}</h2>
            <div className={styles.grid}>
              <div className={styles.inputGroup}>
                <label>Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="My Company GmbH"
                />
              </div>
              <div className={styles.inputGroup}>
                <label>{t("sendingDomain")}</label>
                <input
                  type="text"
                  value={sendingDomain}
                  onChange={(e) => setSendingDomain(e.target.value)}
                  placeholder="yourdomain.com"
                />
              </div>
              <div className={styles.inputGroup}>
                <label>From Email Address</label>
                <input
                  type="email"
                  value={emailFrom}
                  onChange={(e) => setEmailFrom(e.target.value)}
                  placeholder="rfq@yourdomain.com"
                />
              </div>
            </div>
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <button
                className={styles.btnPrimary}
                onClick={handleSaveEmail}
                disabled={savingEmail}
              >
                {savingEmail ? "Saving..." : t("saveEmail")}
              </button>
              {emailSaved && (
                <span style={{ color: "#059669", fontSize: 13, fontWeight: 600 }}>Saved!</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
