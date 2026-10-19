"use client";

import Topbar from "../../components/Topbar";
import styles from "./page.module.css";
import { useLanguage } from "../../context/LanguageContext";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  userName: string;
  createdAt: string;
}

interface DashboardData {
  totalProjects: number;
  activeRfqs: number;
  quotesReceived: number;
  recentActivity: Activity[];
}

const ACTION_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  project_created:    { icon: "📁", color: "#3b82f6", bg: "#eff6ff" },
  rfqs_sent:          { icon: "📤", color: "#3b82f6", bg: "#eff6ff" },
  rfq_opened:         { icon: "👁", color: "#8b5cf6", bg: "#f5f3ff" },
  quote_submitted:    { icon: "✅", color: "#10b981", bg: "#ecfdf5" },
  quote_revised:      { icon: "🔁", color: "#6366f1", bg: "#eef2ff" },
  rfq_declined:       { icon: "✗",  color: "#ef4444", bg: "#fef2f2" },
  counter_offer_sent: { icon: "↩",  color: "#f59e0b", bg: "#fffbeb" },
  quote_edited:       { icon: "✏",  color: "#6366f1", bg: "#eef2ff" },
  winner_selected:    { icon: "🏆", color: "#059669", bg: "#ecfdf5" },
  attachment_uploaded: { icon: "📎", color: "#64748b", bg: "#f8fafc" },
  supplier_file_uploaded: { icon: "📄", color: "#0369a1", bg: "#f0f9ff" },
  supplier_created:   { icon: "🏢", color: "#0369a1", bg: "#f0f9ff" },
  user_created:       { icon: "👤", color: "#7c3aed", bg: "#f5f3ff" },
  project_cancelled:  { icon: "⊘",  color: "#ef4444", bg: "#fef2f2" },
  project_deleted:    { icon: "🗑", color: "#ef4444", bg: "#fef2f2" },
};

const ACTION_LABEL_KEYS: Record<string, string> = {
  rfqs_sent: "actionRfqsSent",
  rfq_opened: "actionRfqOpened",
  quote_submitted: "actionQuoteSubmitted",
  quote_revised: "actionQuoteRevised",
  rfq_declined: "actionRfqDeclined",
  counter_offer_sent: "actionCounterOfferSent",
  quote_edited: "actionQuoteEdited",
  winner_selected: "actionWinnerSelected",
  attachment_uploaded: "actionFileUploaded",
  supplier_file_uploaded: "actionSupplierFileUploaded",
  project_created: "actionProjectCreated",
  supplier_created: "actionSupplierCreated",
  user_created: "actionUserCreated",
  project_cancelled: "actionProjectCancelled",
  project_deleted: "actionProjectDeleted",
};

const DECLINE_REASON_KEYS: Record<string, string> = {
  not_in_range: "reasonNotInRange",
  quantity_too_small: "reasonQtyTooSmall",
  deadline_not_feasible: "reasonDeadlineNotFeasible",
  no_capacity: "reasonNoCapacity",
  other: "reasonOther",
};

const SUPPLIER_ACTIONS = new Set(["rfq_opened", "quote_submitted", "quote_revised", "rfq_declined", "supplier_file_uploaded"]);

function buildDescription(a: Activity, t: (key: string) => string): string {
  const user = a.userName || (SUPPLIER_ACTIONS.has(a.action) ? t("supplierExternal") : t("system"));
  const d = a.details || {};
  const supplier = d.supplierName ? String(d.supplierName) : null;

  switch (a.action) {
    case "project_created":
      return `${user} created project "${d.title || ""}"`;
    case "project_cancelled":
      return `${user} cancelled project ${d.projectNumber || ""}`;
    case "project_deleted":
      return `${user} deleted project ${d.projectNumber || ""}`;
    case "rfqs_sent":
      return `${user} sent RFQs to ${d.supplierCount || 0} supplier${Number(d.supplierCount) !== 1 ? "s" : ""}`;
    case "rfq_opened":
      return supplier ? `${supplier} opened the RFQ` : `${user} opened the RFQ`;
    case "quote_submitted":
      return supplier
        ? `${supplier} submitted a quote with ${d.itemCount || 0} item${Number(d.itemCount) !== 1 ? "s" : ""}`
        : `${user} submitted a quote with ${d.itemCount || 0} item${Number(d.itemCount) !== 1 ? "s" : ""}`;
    case "quote_revised":
      return `${supplier || user} revised their quote`;
    case "rfq_declined": {
      const reasonLabel = d.reason && DECLINE_REASON_KEYS[String(d.reason)]
        ? t(DECLINE_REASON_KEYS[String(d.reason)])
        : d.reasonText ? String(d.reasonText) : "";
      const actor = supplier || user;
      return `${actor} declined the RFQ${reasonLabel ? " — " + reasonLabel : ""}`;
    }
    case "quote_edited":
      return `${user} edited a quote`;
    case "winner_selected":
      return `${user} selected a winning quote`;
    case "counter_offer_sent":
      return `${user} sent a counter offer`;
    case "supplier_file_uploaded":
      return `${supplier || user} uploaded "${d.fileName || "file"}"`;
    case "attachment_uploaded":
      return `${user} uploaded "${d.fileName || "file"}"`;
    case "user_created":
      return `${user} created user ${d.email || ""}`;
    case "supplier_created":
      return `${user} added a new supplier`;
    default:
      return `${user} — ${a.action.replace(/_/g, " ")}`;
  }
}

function relativeTime(dateStr: string, t: (key: string) => string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return t("justNow");
  if (diffSec < 3600) return t("minutesAgo").replace("{n}", String(Math.floor(diffSec / 60)));
  if (diffSec < 86400) return t("hoursAgo").replace("{n}", String(Math.floor(diffSec / 3600)));
  const days = Math.floor(diffSec / 86400);
  if (days <= 30) return t("daysAgo").replace("{n}", String(days));
  return new Date(dateStr).toLocaleDateString();
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

  const tAny = t as (key: string) => string;

  return (
    <div>
      <Topbar title={t("dashboardTitle")} subtitle={t("dashboardSubtitle")}>
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
            <Link
              href="/projects"
              className={`${styles.btnPrimary} ${styles.fullWidth} ${styles.marginTop}`}
              style={{ display: "block", textAlign: "center", textDecoration: "none" }}
            >
              {t("viewReport")}
            </Link>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <h3>{t("recentActivity")}</h3>
          </div>

          {!data?.recentActivity?.length ? (
            <div className={styles.emptyState}>{t("noRecentActivity")}</div>
          ) : (
            <div className={styles.timeline}>
              {data.recentActivity.map((a, i) => {
                const meta = ACTION_ICONS[a.action] || { icon: "•", color: "#64748b", bg: "#f8fafc" };
                const isLast = i === data.recentActivity.length - 1;

                return (
                  <div key={a.id} className={styles.timelineItem}>
                    <div className={styles.timelineLeft}>
                      <div
                        className={styles.timelineIcon}
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {meta.icon}
                      </div>
                      {!isLast && <div className={styles.timelineLine} />}
                    </div>

                    <div className={styles.timelineBody}>
                      <p className={styles.timelineDesc}>
                        {buildDescription(a, tAny)}
                      </p>
                      <span className={styles.timelineTime}>
                        {relativeTime(a.createdAt, tAny)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
