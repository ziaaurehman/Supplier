"use client";

import styles from "./page.module.css";
import Link from "next/link";
import { use } from "react";
import { useLanguage } from "../../../../../context/LanguageContext";

export default function SupplierEnquiriesOverview({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t } = useLanguage();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("welcomeBack")}, Acme Promos GmbH</h1>
        <p className={styles.subtitle}>{t("overviewSubtitle")}</p>
      </div>

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>{t("actionRequired")}</h3>
        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("thProject")}</th>
                <th>{t("customerRef")}</th>
                <th>{t("thDeadline")}</th>
                <th>{t("thAction")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>150 Water Bottles with logo</strong></td>
                <td>Ref: #P-2026-001</td>
                <td><span className={styles.deadlineUrgent}>Oct 15, 2026</span></td>
                <td>
                  <Link href={`/quote/${token}`}>
                    <button className={styles.btnPrimary}>{t("submitQuote")}</button>
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>{t("pastEnquiries")}</h3>
        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("thProject")}</th>
                <th>{t("customerRef")}</th>
                <th>{t("yourAction")}</th>
                <th>{t("thStatus")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>500 Custom Lanyards</strong></td>
                <td>Ref: #P-2026-002</td>
                <td>{t("quotedOn")} Oct 01</td>
                <td><span className={styles.statusLost}>{t("closed")}</span></td>
              </tr>
              <tr>
                <td><strong>1000 Premium Notebooks</strong></td>
                <td>Ref: #P-2026-003</td>
                <td>{t("quotedOn")} Sep 20</td>
                <td><span className={styles.statusWon}>{t("won")}</span></td>
              </tr>
              <tr>
                <td><strong>100 Organic Cotton T-Shirts</strong></td>
                <td>Ref: #P-2026-004</td>
                <td>{t("declined")}</td>
                <td><span className={styles.statusLost}>{t("closed")}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
