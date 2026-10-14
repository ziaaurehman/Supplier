"use client";

import Topbar from "../../components/Topbar";
import styles from "./page.module.css";
import { useLanguage } from "../../context/LanguageContext";
import Link from "next/link";
import { useEffect, useState } from "react";

interface DashboardData {
  totalProjects: number;
  activeRfqs: number;
  quotesReceived: number;
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    details: Record<string, unknown> | null;
    userName: string;
    createdAt: string;
  }[];
}

export default function Dashboard() {
  const { t } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  return (
    <div>
      <Topbar
        title={t("dashboardTitle")}
        subtitle={t("dashboardSubtitle")}
      >
        <Link href="/projects/new">
          <button className={styles.btnPrimary}>{t("newProject")}</button>
        </Link>
      </Topbar>

      <div className={styles.content}>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2>{data?.totalProjects ?? "—"}</h2>
            <p className={styles.cardTitle}>{t("totalProjects").toUpperCase()}</p>
          </div>

          <div className={styles.card}>
            <h2>{data?.activeRfqs ?? "—"}</h2>
            <p className={styles.cardTitle}>{t("activeRFQs").toUpperCase()}</p>
          </div>

          <div className={styles.card}>
            <h2>{data?.quotesReceived ?? "—"}</h2>
            <p className={styles.cardTitle}>{t("quotesReceived").toUpperCase()}</p>
          </div>

          <div className={styles.card}>
            <p className={styles.cardTitle}>{t("monthlySummary")}</p>
            <Link href="/projects" className={`${styles.btnPrimary} ${styles.fullWidth} ${styles.marginTop}`} style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
              {t("viewReport")}
            </Link>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <h3>{t("recentActivity")}</h3>
          </div>
          {!data?.recentActivity?.length ? (
            <div className={styles.emptyState}>
              {t("noRecentActivity")}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 15px", borderBottom: "1px solid #e2e8f0", fontSize: "0.8rem", color: "#64748b" }}>Action</th>
                  <th style={{ textAlign: "left", padding: "10px 15px", borderBottom: "1px solid #e2e8f0", fontSize: "0.8rem", color: "#64748b" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "10px 15px", borderBottom: "1px solid #e2e8f0", fontSize: "0.8rem", color: "#64748b" }}>User</th>
                  <th style={{ textAlign: "left", padding: "10px 15px", borderBottom: "1px solid #e2e8f0", fontSize: "0.8rem", color: "#64748b" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentActivity.map((a) => (
                  <tr key={a.id}>
                    <td style={{ padding: "10px 15px", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>{a.action}</td>
                    <td style={{ padding: "10px 15px", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>{a.entityType}</td>
                    <td style={{ padding: "10px 15px", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>{a.userName}</td>
                    <td style={{ padding: "10px 15px", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
