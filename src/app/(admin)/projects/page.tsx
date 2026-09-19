"use client";

import Topbar from "../../../components/Topbar";
import Link from "next/link";
import styles from "./page.module.css";
import { useLanguage } from "../../../context/LanguageContext";

export default function ProjectsPage() {
  const { t } = useLanguage();

  return (
    <div>
      <Topbar title={t("projectsTitle")} subtitle={t("projectsSubtitle")}>
        <Link href="/projects/new">
          <button className={styles.btnPrimary}>{t("newProject")}</button>
        </Link>
      </Topbar>

      <div className={styles.content}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("thProjectRef")}</th>
                <th>{t("thTitle")}</th>
                <th>{t("thCustomer")}</th>
                <th>{t("thDeadline")}</th>
                <th>{t("thStatus")}</th>
                <th>{t("thAction")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>#P-2026-001</td>
                <td>
                  <Link href="/projects/1">
                    <strong style={{ cursor: "pointer", color: "var(--text-dark)" }}>150 Water Bottles with logo</strong>
                  </Link>
                </td>
                <td>Acme Corp</td>
                <td>Oct 15, 2026</td>
                <td><span className={styles.statusSent}>{t("statusSent")}</span></td>
                <td>
                  <Link href="/projects/1/compare">
                    <button className={styles.actionBtn}>{t("compareQuotes")}</button>
                  </Link>
                </td>
              </tr>
              <tr>
                <td>#P-2026-002</td>
                <td>500 Custom Lanyards</td>
                <td>TechConf Inc</td>
                <td>Oct 20, 2026</td>
                <td><span className={styles.statusDraft}>{t("statusDraft")}</span></td>
                <td>
                  <button className={styles.actionBtn}>{t("edit")}</button>
                </td>
              </tr>
              <tr>
                <td>#P-2026-003</td>
                <td>
                  <Link href="/projects/1">
                    <strong style={{ cursor: "pointer", color: "var(--text-dark)" }}>1000 Premium Notebooks</strong>
                  </Link>
                </td>
                <td>Global Bank</td>
                <td>Nov 01, 2026</td>
                <td><span className={styles.statusComplete}>{t("statusComplete")}</span></td>
                <td>
                  <Link href="/projects/1">
                    <button className={styles.actionBtn}>{t("view")}</button>
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
