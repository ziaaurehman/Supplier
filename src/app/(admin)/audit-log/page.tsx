"use client";

import Topbar from "../../../components/Topbar";
import { useLanguage } from "../../../context/LanguageContext";
import { useEffect, useState, type ReactNode } from "react";

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

const ACTION_COLORS: Record<string, string> = {
  rfqs_sent: "#3b82f6",
  rfq_opened: "#8b5cf6",
  quote_submitted: "#10b981",
  quote_revised: "#6366f1",
  rfq_declined: "#ef4444",
  counter_offer_sent: "#f59e0b",
  winner_selected: "#059669",
  quote_edited: "#6366f1",
  attachment_uploaded: "#64748b",
  supplier_file_uploaded: "#0369a1",
  project_created: "#3b82f6",
  supplier_created: "#0369a1",
  user_created: "#7c3aed",
  project_cancelled: "#ef4444",
  project_deleted: "#ef4444",
};

const ENTITY_LABEL_KEYS: Record<string, string> = {
  project: "entityProject",
  rfq: "entityRfq",
  quote: "entityQuote",
  user: "entityUser",
  attachment: "entityAttachment",
  supplier: "entitySupplier",
};

const DECLINE_REASON_KEYS: Record<string, string> = {
  not_in_range: "reasonNotInRange",
  quantity_too_small: "reasonQtyTooSmall",
  deadline_not_feasible: "reasonDeadlineNotFeasible",
  no_capacity: "reasonNoCapacity",
  other: "reasonOther",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "roleAdmin",
  INTERNAL_SALES: "roleInternalSales",
  FIELD_SALES: "roleFieldSales",
};

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "2px 8px",
  borderRadius: 4,
  fontSize: 12,
  background: "#f1f5f9",
  color: "#475569",
  whiteSpace: "nowrap" as const,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#94a3b8",
  fontWeight: 500,
  textTransform: "uppercase" as const,
  letterSpacing: "0.03em",
};

function DetailChip({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <span style={chipStyle}>
      <span style={labelStyle}>{label}</span>
      {value}
    </span>
  );
}

function FormatDetails({ details, action, t }: { details: Record<string, unknown> | null; action: string; t: (key: string) => string }): ReactNode {
  if (!details) return <span style={{ color: "#cbd5e1" }}>—</span>;
  const d = details;

  switch (action) {
    case "project_created":
      return d.title ? <DetailChip label={t("projectTitle") + ":"} value={String(d.title)} /> : "—";

    case "project_cancelled":
    case "project_deleted":
      return d.projectNumber ? <DetailChip label={t("thProjectRef") + ":"} value={String(d.projectNumber)} /> : "—";

    case "rfqs_sent":
      return d.supplierCount
        ? <DetailChip label={t("suppliers") + ":"} value={`${d.supplierCount}`} />
        : "—";

    case "rfq_opened":
      return d.supplierName
        ? <DetailChip label={t("supplierLabel") + ":"} value={String(d.supplierName)} />
        : <span style={{ fontSize: 13, color: "#64748b" }}>{t("rfqOpened")}</span>;

    case "quote_submitted":
    case "quote_revised":
      return (
        <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {d.supplierName ? <DetailChip label={t("supplierLabel") + ":"} value={String(d.supplierName)} /> : null}
          {d.itemCount ? <DetailChip label={t("lineItems") + ":"} value={`${d.itemCount}`} /> : null}
        </span>
      );

    case "rfq_declined": {
      const chips: ReactNode[] = [];
      if (d.supplierName) chips.push(<DetailChip key="s" label={t("supplierLabel") + ":"} value={String(d.supplierName)} />);
      if (d.reason) {
        const reasonKey = DECLINE_REASON_KEYS[String(d.reason)];
        if (reasonKey) chips.push(<DetailChip key="r" label={t("reason") + ":"} value={t(reasonKey)} />);
      } else if (d.reasonText) {
        chips.push(<DetailChip key="r" label={t("reason") + ":"} value={String(d.reasonText)} />);
      }
      return chips.length
        ? <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>{chips}</span>
        : "—";
    }

    case "quote_edited": {
      const changes = d.changes;
      if (changes && typeof changes === "object") {
        const keys = Object.keys(changes);
        return (
          <span style={{ fontSize: 13, color: "#64748b" }}>
            {keys.length} {keys.length === 1 ? "field" : "fields"} updated
          </span>
        );
      }
      return "—";
    }

    case "winner_selected":
      return d.supplierName
        ? <DetailChip label={t("supplierLabel") + ":"} value={String(d.supplierName)} />
        : "—";

    case "counter_offer_sent":
      return <span style={{ fontSize: 13, color: "#64748b" }}>{t("actionCounterOfferSent")}</span>;

    case "supplier_file_uploaded":
      return (
        <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {d.supplierName ? <DetailChip label={t("supplierLabel") + ":"} value={String(d.supplierName)} /> : null}
          {d.fileName ? <DetailChip label={t("attachFile") + ":"} value={String(d.fileName)} /> : null}
        </span>
      );
    case "attachment_uploaded":
      return d.fileName
        ? <DetailChip label={t("attachFile") + ":"} value={String(d.fileName)} />
        : "—";

    case "user_created": {
      return (
        <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {d.email ? <DetailChip label={t("emailAddr") + ":"} value={String(d.email)} /> : null}
          {d.role ? (
            <DetailChip
              label={t("role") + ":"}
              value={ROLE_LABELS[String(d.role)] ? t(ROLE_LABELS[String(d.role)]) : String(d.role).replace(/_/g, " ")}
            />
          ) : null}
        </span>
      );
    }

    case "supplier_created":
      return d.companyName
        ? <DetailChip label={t("supplierLabel") + ":"} value={String(d.companyName)} />
        : "—";

    default: {
      const entries = Object.entries(d);
      if (entries.length === 0) return <span style={{ color: "#cbd5e1" }}>—</span>;
      return (
        <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {entries.slice(0, 2).map(([k, v]) => (
            <DetailChip key={k} label={k.replace(/([A-Z])/g, " $1").trim() + ":"} value={String(v)} />
          ))}
        </span>
      );
    }
  }
}

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

  const tAny = t as (key: string) => string;

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
                    {(() => {
                      if (log.user?.fullName) return log.user.fullName;
                      const isSupplierAction = ["rfq_opened", "quote_submitted", "quote_revised", "rfq_declined", "supplier_file_uploaded"].includes(log.action);
                      if (!isSupplierAction) return <span style={{ color: "#94a3b8" }}>{t("system")}</span>;
                      const details = log.details as Record<string, unknown> | null;
                      const name = details?.supplierName ? String(details.supplierName) : null;
                      if (name) {
                        return (
                          <span>
                            {name}
                            <span style={{ color: "#94a3b8", fontSize: 11, marginLeft: 4 }}>
                              ({t("external" as Parameters<typeof t>[0])})
                            </span>
                          </span>
                        );
                      }
                      return <span style={{ color: "#94a3b8" }}>{t("supplierExternal")}</span>;
                    })()}
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
                    {ENTITY_LABEL_KEYS[log.entityType]
                      ? t(ENTITY_LABEL_KEYS[log.entityType] as Parameters<typeof t>[0])
                      : log.entityType}
                  </td>
                  <td style={{ padding: "10px 16px", maxWidth: 340 }}>
                    <FormatDetails details={log.details} action={log.action} t={tAny} />
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
