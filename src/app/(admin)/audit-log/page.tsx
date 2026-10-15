"use client";

import Topbar from "../../../components/Topbar";
import { useLanguage } from "../../../context/LanguageContext";
import { useEffect, useState } from "react";

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: { fullName: string; email: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_LABEL_KEYS: Record<string, string> = {
  rfqs_sent: "actionRfqsSent",
  rfq_opened: "actionRfqOpened",
  quote_submitted: "actionQuoteSubmitted",
  rfq_declined: "actionRfqDeclined",
  counter_offer_sent: "actionCounterOfferSent",
  quote_edited: "actionQuoteEdited",
  winner_selected: "actionWinnerSelected",
  attachment_uploaded: "actionFileUploaded",
  project_created: "actionProjectCreated",
  supplier_created: "actionSupplierCreated",
};

const ACTION_COLORS: Record<string, string> = {
  rfqs_sent: "#3b82f6",
  rfq_opened: "#8b5cf6",
  quote_submitted: "#10b981",
  rfq_declined: "#ef4444",
  counter_offer_sent: "#f59e0b",
  winner_selected: "#059669",
  quote_edited: "#6366f1",
  attachment_uploaded: "#64748b",
};

export default function AuditLogPage() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (filterAction) params.set("action", filterAction);

    fetch(`/api/audit-logs?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || []);
        setPagination(data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filterAction]);

  return (
    <div>
      <Topbar title={t("auditLog")} subtitle={t("auditLogSubtitle")} />

      <div style={{ padding: 40 }}>
        <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            style={{
              padding: "6px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: 4,
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            <option value="">{t("allActions")}</option>
            {Object.entries(ACTION_LABEL_KEYS).map(([key, labelKey]) => (
              <option key={key} value={key}>{t(labelKey as Parameters<typeof t>[0])}</option>
            ))}
          </select>
          {pagination && (
            <span style={{ fontSize: 13, color: "#64748b", alignSelf: "center" }}>
              {pagination.total} {t("entries")}
            </span>
          )}
        </div>

        <div
          style={{
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border-color, #e2e8f0)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[t("thTime"), t("thUserCol"), t("thActionCol"), t("thEntity"), t("thDetails")].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#64748b",
                      borderBottom: "1px solid var(--border-color, #e2e8f0)",
                      background: "#fafafa",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                    {t("loading")}
                  </td>
                </tr>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                    {t("noAuditLogs")}
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid var(--border-color, #f1f5f9)" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13, color: "#64748b", whiteSpace: "nowrap" }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 13 }}>
                    {log.user?.fullName || <span style={{ color: "#94a3b8" }}>{t("system")}</span>}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        background: `${ACTION_COLORS[log.action] || "#64748b"}15`,
                        color: ACTION_COLORS[log.action] || "#64748b",
                      }}
                    >
                      {ACTION_LABEL_KEYS[log.action] ? t(ACTION_LABEL_KEYS[log.action] as Parameters<typeof t>[0]) : log.action}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 13, color: "#64748b" }}>
                    {log.entityType}
                    {log.entityId && (
                      <span style={{ fontSize: 11, marginLeft: 4, color: "#94a3b8" }}>
                        {log.entityId.slice(0, 8)}...
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: "#94a3b8", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {log.details ? JSON.stringify(log.details).slice(0, 80) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              style={{
                padding: "6px 14px",
                border: "1px solid #e2e8f0",
                borderRadius: 4,
                background: page === 1 ? "#f8fafc" : "#fff",
                cursor: page === 1 ? "default" : "pointer",
                fontSize: 13,
                fontFamily: "inherit",
              }}
            >
              {t("previous")}
            </button>
            <span style={{ alignSelf: "center", fontSize: 13, color: "#64748b" }}>
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
              disabled={page === pagination.totalPages}
              style={{
                padding: "6px 14px",
                border: "1px solid #e2e8f0",
                borderRadius: 4,
                background: page === pagination.totalPages ? "#f8fafc" : "#fff",
                cursor: page === pagination.totalPages ? "default" : "pointer",
                fontSize: 13,
                fontFamily: "inherit",
              }}
            >
              {t("next")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
