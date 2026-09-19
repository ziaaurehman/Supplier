"use client";

import Topbar from "../../components/Topbar";
import styles from "./page.module.css";
import { useLanguage } from "../../context/LanguageContext";
import Link from "next/link";

export default function Dashboard() {
  const { t } = useLanguage();

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
          {/* Card 1 */}
          <div className={styles.card}>
            <h2>142</h2>
            <p className={styles.cardTitle}>{t("totalProjects").toUpperCase()}</p>
          </div>

          {/* Card 2 */}
          <div className={styles.card}>
            <h2>38</h2>
            <p className={styles.cardTitle}>{t("activeRFQs").toUpperCase()}</p>
          </div>

          {/* Card 3 */}
          <div className={styles.card}>
            <h2>15</h2>
            <p className={styles.cardTitle}>{t("quotesReceived").toUpperCase()}</p>
          </div>

          {/* Card 4 - Action */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>{t("monthlySummary")}</p>
            <select className={`${styles.select} ${styles.fullWidth} ${styles.marginTop}`}>
              <option>August 2026</option>
              <option>September 2026</option>
            </select>
            <button className={`${styles.btnPrimary} ${styles.fullWidth} ${styles.marginTop}`}>
              {t("viewReport")}
            </button>
          </div>
        </div>

        {/* Empty State Table */}
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <h3>{t("recentActivity")}</h3>
            <input type="text" placeholder="Search..." className={styles.searchInput} />
          </div>
          <div className={styles.emptyState}>
            {t("noRecentActivity")}
          </div>
        </div>
      </div>
    </div>
  );
}
