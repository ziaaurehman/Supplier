"use client";

import styles from "./page.module.css";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useLanguage } from "../../../../../context/LanguageContext";

interface PendingRfq {
  token: string;
  projectTitle: string;
  projectNumber: string;
  customerReference: string | null;
  quoteDeadline: string | null;
  status: string;
}

interface PastRfq {
  token: string;
  projectTitle: string;
  projectNumber: string;
  status: string;
  isWinner: boolean;
}

interface OverviewData {
  supplierName: string;
  pending: PendingRfq[];
  past: PastRfq[];
}

export default function SupplierEnquiriesOverview({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t } = useLanguage();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/rfqs/overview/${token}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Loading...</h1>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Invalid link</h1>
          <p className={styles.subtitle}>This link is no longer valid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("welcomeBack")}, {data.supplierName}</h1>
        <p className={styles.subtitle}>{t("overviewSubtitle")}</p>
      </div>

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>{t("actionRequired")}</h3>
        {data.pending.length === 0 ? (
          <p style={{ color: "#94a3b8", padding: "1rem 0" }}>No pending enquiries at this time.</p>
        ) : (
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
                {data.pending.map((rfq) => (
                  <tr key={rfq.token}>
                    <td><strong>{rfq.projectTitle}</strong></td>
                    <td>Ref: {rfq.projectNumber}</td>
                    <td>
                      {rfq.quoteDeadline ? (
                        <span className={styles.deadlineUrgent}>
                          {new Date(rfq.quoteDeadline).toLocaleDateString()}
                        </span>
                      ) : "—"}
                    </td>
                    <td>
                      <Link href={`/quote/${rfq.token}`}>
                        <button className={styles.btnPrimary}>{t("submitQuote")}</button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>{t("pastEnquiries")}</h3>
        {data.past.length === 0 ? (
          <p style={{ color: "#94a3b8", padding: "1rem 0" }}>No past enquiries.</p>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("thProject")}</th>
                  <th>{t("customerRef")}</th>
                  <th>{t("thStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {data.past.map((rfq) => (
                  <tr key={rfq.token}>
                    <td><strong>{rfq.projectTitle}</strong></td>
                    <td>Ref: {rfq.projectNumber}</td>
                    <td>
                      {rfq.status === "quoted" && rfq.isWinner && <span className={styles.statusWon}>{t("won")}</span>}
                      {rfq.status === "quoted" && !rfq.isWinner && <span className={styles.statusLost}>{t("closed")}</span>}
                      {rfq.status === "declined" && <span className={styles.statusLost}>{t("declined")}</span>}
                      {rfq.status === "expired" && <span className={styles.statusLost}>Expired</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
