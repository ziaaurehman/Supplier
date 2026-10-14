"use client";

import React, { useEffect, useState, use, useCallback } from "react";
import Topbar from "../../../../../components/Topbar";
import styles from "./page.module.css";
import { useLanguage } from "../../../../../context/LanguageContext";

interface CounterOfferData {
  id: string;
  offeredByInternal: boolean;
  status: string;
  unitPrices: Record<string, number>;
  setupCost: number | null;
  decorationCost: number | null;
  freightCost: number | null;
  message: string | null;
  createdAt: string;
}

interface TierTotal {
  quantity: number;
  unitPrice?: number;
  total: number | null;
  unitTotal: number | null;
}

interface PriceTierData {
  id: string;
  quantity: number;
  unitPrice: number;
}

interface QuoteData {
  id: string;
  currency: string;
  setupCost: number;
  decorationCost: number;
  decorationCostType: string;
  freightCost: number;
  sampleCost: number;
  leadTimeDays: number | null;
  minimumOrderQty: number | null;
  priceValidUntil: string | null;
  isWinner: boolean;
  comment: string | null;
  alternativeProduct: string | null;
  counterOffers: CounterOfferData[];
  priceTiers?: PriceTierData[];
}

interface SupplierQuote {
  supplierId: string;
  supplierName: string;
  rfqStatus: string;
  declineReason: string | null;
  quote: QuoteData | null;
  totals: TierTotal[] | null;
}

interface CompareItem {
  item: { id: string; name: string };
  tiers: number[];
  supplierQuotes: SupplierQuote[];
}

interface CompareResponse {
  project: {
    id: string;
    projectNumber: string;
    title: string;
    quoteDeadline: string | null;
  };
  comparison: CompareItem[];
}

type SortMode = "none" | "total_asc" | "lead_time" | "supplier" | "status";

export default function QuoteComparisonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingWinner, setMarkingWinner] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("none");
  const [counterOfferQuoteId, setCounterOfferQuoteId] = useState<string | null>(null);
  const [coMessage, setCoMessage] = useState("");
  const [coValues, setCoValues] = useState<Record<string, string>>({});
  const [submittingCo, setSubmittingCo] = useState(false);
  const [showNegotiationHistory, setShowNegotiationHistory] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    fetch(`/api/projects/${id}/compare`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(fetchData, [fetchData]);

  const handleMarkWinner = async (quoteId: string) => {
    setMarkingWinner(quoteId);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/winner`, { method: "POST" });
      if (res.ok) fetchData();
      else alert("Failed to mark winner");
    } finally {
      setMarkingWinner(null);
    }
  };

  const handleExport = (winnerOnly?: boolean) => {
    const url = `/api/projects/${id}/export${winnerOnly ? "?winner=true" : ""}`;
    window.open(url, "_blank");
  };

  const handleEditSave = async (quoteId: string, field: string, value: string, tierId?: string) => {
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal < 0) return;

    const payload: Record<string, unknown> = {};
    if (tierId) {
      payload.priceTiers = [{ id: tierId, unitPrice: numVal }];
    } else {
      payload[field] = numVal;
    }

    const res = await fetch(`/api/quotes/${quoteId}/edit`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setEditingCell(null);
      fetchData();
    }
  };

  const handleSendCounterOffer = async (quoteId: string, priceTiers: PriceTierData[]) => {
    setSubmittingCo(true);
    try {
      const unitPrices: Record<string, number> = {};
      priceTiers.forEach((t) => {
        const key = t.id;
        const val = parseFloat(coValues[`tier_${key}`] || "");
        if (!isNaN(val) && val > 0) unitPrices[key] = val;
      });

      if (Object.keys(unitPrices).length === 0) {
        alert("Enter at least one counter-offer price");
        return;
      }

      const payload: Record<string, unknown> = { unitPrices, message: coMessage || undefined };
      const setup = parseFloat(coValues.setupCost || "");
      if (!isNaN(setup)) payload.setupCost = setup;
      const deco = parseFloat(coValues.decorationCost || "");
      if (!isNaN(deco)) payload.decorationCost = deco;
      const freight = parseFloat(coValues.freightCost || "");
      if (!isNaN(freight)) payload.freightCost = freight;

      const res = await fetch(`/api/quotes/${quoteId}/counter-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCounterOfferQuoteId(null);
        setCoValues({});
        setCoMessage("");
        fetchData();
      } else {
        alert("Failed to send counter offer");
      }
    } finally {
      setSubmittingCo(false);
    }
  };

  const sortSuppliers = (suppliers: SupplierQuote[]): SupplierQuote[] => {
    if (sortMode === "none") return suppliers;
    return [...suppliers].sort((a, b) => {
      if (sortMode === "total_asc") {
        const aTotal = a.totals?.[0]?.total ?? Infinity;
        const bTotal = b.totals?.[0]?.total ?? Infinity;
        return aTotal - bTotal;
      }
      if (sortMode === "lead_time") {
        const aLead = a.quote?.leadTimeDays ?? Infinity;
        const bLead = b.quote?.leadTimeDays ?? Infinity;
        return aLead - bLead;
      }
      if (sortMode === "supplier") {
        return a.supplierName.localeCompare(b.supplierName);
      }
      if (sortMode === "status") {
        const order: Record<string, number> = { quoted: 0, opened: 1, sent: 2, declined: 3 };
        return (order[a.rfqStatus] ?? 4) - (order[b.rfqStatus] ?? 4);
      }
      return 0;
    });
  };

  const renderEditableCell = (
    quoteId: string,
    field: string,
    value: number | null | undefined,
    currency: string,
    tierId?: string
  ) => {
    const cellKey = `${quoteId}_${field}_${tierId || ""}`;
    const isEditing = editingCell === cellKey;

    if (isEditing) {
      return (
        <input
          type="number"
          step="0.01"
          className={styles.editInput}
          value={editValue}
          autoFocus
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => handleEditSave(quoteId, field, editValue, tierId)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleEditSave(quoteId, field, editValue, tierId);
            if (e.key === "Escape") setEditingCell(null);
          }}
        />
      );
    }

    return (
      <span
        className={styles.editableValue}
        onClick={() => {
          setEditingCell(cellKey);
          setEditValue(String(value ?? 0));
        }}
        title="Click to edit"
      >
        {value != null ? `${currency} ${value.toFixed(2)}` : "—"}
      </span>
    );
  };

  if (loading || !data) {
    return (
      <div>
        <Topbar title="Loading..." subtitle="" backUrl={`/projects/${id}`} />
        <div style={{ padding: 40, textAlign: "center" }}>Loading comparison...</div>
      </div>
    );
  }

  return (
    <div>
      <Topbar
        title={t("comparisonTitle")}
        subtitle={`Project ${data.project.projectNumber} • ${data.project.title}`}
        backUrl={`/projects/${id}`}
      >
        <button className={styles.btnSecondary} onClick={() => handleExport(true)}>
          Export Winner
        </button>
        <button className={styles.btnSecondary} onClick={() => handleExport()}>
          {t("exportExcel")}
        </button>
      </Topbar>

      <div className={styles.content}>
        <div className={styles.sortBar}>
          <span className={styles.sortLabel}>Sort by:</span>
          {(
            [
              ["none", "Default"],
              ["total_asc", "Lowest Total Cost"],
              ["lead_time", "Fastest Delivery"],
              ["supplier", "Supplier Name"],
              ["status", "Quote Status"],
            ] as [SortMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              className={`${styles.sortBtn} ${sortMode === mode ? styles.sortBtnActive : ""}`}
              onClick={() => setSortMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>

        {data.comparison.map((compItem) => {
          const allSuppliers = sortSuppliers(compItem.supplierQuotes);

          return (
            <div key={compItem.item.id} className={styles.card} style={{ marginBottom: "2rem" }}>
              <h3 style={{ margin: "16px 20px", fontSize: "1rem", fontWeight: 600 }}>
                {compItem.item.name}
              </h3>
              <div className={styles.scrollWrapper}>
                <table className={styles.compareTable}>
                  <thead>
                    <tr>
                      <th className={styles.rowLabel}>Criteria</th>
                      {allSuppliers.map((s) => (
                        <th key={s.supplierId} className={styles.supplierCol}>
                          <div className={styles.supplierName}>
                            {s.supplierName}
                            {s.quote?.isWinner && (
                              <span style={{ marginLeft: 6, color: "#10B981" }}>&#9733;</span>
                            )}
                          </div>
                          {s.rfqStatus === "quoted" && (
                            <div className={styles.supplierStatus}>Quoted</div>
                          )}
                          {s.rfqStatus === "declined" && (
                            <div className={styles.supplierDeclined}>
                              {t("declined")}
                              {s.declineReason ? ` (${s.declineReason})` : ""}
                            </div>
                          )}
                          {["sent", "opened"].includes(s.rfqStatus) && (
                            <div className={styles.supplierStatus}>Pending</div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compItem.tiers.map((qty) => {
                      const quotedTotals = allSuppliers
                        .filter((s) => s.quote && s.totals)
                        .map((s) => {
                          const tierData = s.totals!.find((tt) => tt.quantity === qty);
                          return tierData?.total ?? Infinity;
                        });
                      const lowestTotal =
                        quotedTotals.length > 0 ? Math.min(...quotedTotals) : Infinity;

                      return (
                        <React.Fragment key={qty}>
                          <tr className={styles.sectionRow}>
                            <td colSpan={allSuppliers.length + 1}>Quantity: {qty} units</td>
                          </tr>
                          <tr>
                            <td className={styles.rowLabel}>Unit Price (Net)</td>
                            {allSuppliers.map((s) => {
                              const tier = s.totals?.find((tt) => tt.quantity === qty);
                              const priceTier = s.quote?.priceTiers?.find(
                                (pt: PriceTierData) => pt.quantity === qty
                              );
                              return (
                                <td key={s.supplierId}>
                                  {s.quote && priceTier
                                    ? renderEditableCell(
                                        s.quote.id,
                                        "unitPrice",
                                        tier?.unitPrice,
                                        s.quote.currency,
                                        priceTier.id
                                      )
                                    : "—"}
                                </td>
                              );
                            })}
                          </tr>
                          <tr>
                            <td className={styles.rowLabel}>{t("setupCosts")}</td>
                            {allSuppliers.map((s) => (
                              <td key={s.supplierId}>
                                {s.quote
                                  ? renderEditableCell(
                                      s.quote.id,
                                      "setupCost",
                                      s.quote.setupCost,
                                      s.quote.currency
                                    )
                                  : "—"}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className={styles.rowLabel}>Decoration</td>
                            {allSuppliers.map((s) => (
                              <td key={s.supplierId}>
                                {s.quote
                                  ? renderEditableCell(
                                      s.quote.id,
                                      "decorationCost",
                                      s.quote.decorationCost,
                                      s.quote.currency
                                    )
                                  : "—"}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className={styles.rowLabel}>{t("freightCosts")}</td>
                            {allSuppliers.map((s) => (
                              <td key={s.supplierId}>
                                {s.quote
                                  ? renderEditableCell(
                                      s.quote.id,
                                      "freightCost",
                                      s.quote.freightCost,
                                      s.quote.currency
                                    )
                                  : "—"}
                              </td>
                            ))}
                          </tr>
                          {allSuppliers.some(
                            (s) => s.quote && s.quote.sampleCost > 0
                          ) && (
                            <tr>
                              <td className={styles.rowLabel}>Sample Cost</td>
                              {allSuppliers.map((s) => (
                                <td key={s.supplierId}>
                                  {s.quote
                                    ? renderEditableCell(
                                        s.quote.id,
                                        "sampleCost",
                                        s.quote.sampleCost,
                                        s.quote.currency
                                      )
                                    : "—"}
                                </td>
                              ))}
                            </tr>
                          )}
                          <tr className={styles.totalRow}>
                            <td className={styles.rowLabel}>
                              {t("totalCost")} ({qty} units)
                            </td>
                            {allSuppliers.map((s) => {
                              const tier = s.totals?.find((tt) => tt.quantity === qty);
                              const isLowest =
                                tier?.total != null &&
                                tier.total === lowestTotal &&
                                lowestTotal < Infinity;
                              return (
                                <td
                                  key={s.supplierId}
                                  className={isLowest ? styles.highlightLowest : ""}
                                >
                                  {tier?.total != null ? (
                                    <>
                                      {s.quote?.currency} {tier.total.toFixed(2)}{" "}
                                      <span className={styles.unitCalc}>
                                        ({s.quote?.currency} {tier.unitTotal?.toFixed(2)}/ea)
                                      </span>
                                    </>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        </React.Fragment>
                      );
                    })}

                    <tr className={styles.sectionRow}>
                      <td colSpan={allSuppliers.length + 1}>Terms & Information</td>
                    </tr>
                    <tr>
                      <td className={styles.rowLabel}>{t("leadTime")}</td>
                      {allSuppliers.map((s) => (
                        <td key={s.supplierId}>
                          {s.quote?.leadTimeDays
                            ? `${s.quote.leadTimeDays} working days`
                            : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className={styles.rowLabel}>MOQ</td>
                      {allSuppliers.map((s) => (
                        <td key={s.supplierId}>{s.quote?.minimumOrderQty || "—"}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className={styles.rowLabel}>{t("validUntil")}</td>
                      {allSuppliers.map((s) => (
                        <td key={s.supplierId}>
                          {s.quote?.priceValidUntil
                            ? new Date(s.quote.priceValidUntil).toLocaleDateString()
                            : "—"}
                        </td>
                      ))}
                    </tr>
                    {allSuppliers.some((s) => s.quote?.comment) && (
                      <tr>
                        <td className={styles.rowLabel}>Comments</td>
                        {allSuppliers.map((s) => (
                          <td key={s.supplierId} style={{ fontSize: 13, color: "#64748b" }}>
                            {s.quote?.comment || "—"}
                          </td>
                        ))}
                      </tr>
                    )}

                    {/* Counter Offer History */}
                    {allSuppliers.some(
                      (s) => s.quote?.counterOffers && s.quote.counterOffers.length > 0
                    ) && (
                      <>
                        <tr className={styles.sectionRow}>
                          <td colSpan={allSuppliers.length + 1}>Negotiation History</td>
                        </tr>
                        <tr>
                          <td className={styles.rowLabel}>Counter Offers</td>
                          {allSuppliers.map((s) => {
                            const cos = s.quote?.counterOffers || [];
                            if (cos.length === 0) return <td key={s.supplierId}>—</td>;

                            return (
                              <td key={s.supplierId}>
                                <button
                                  className={styles.linkBtn}
                                  onClick={() =>
                                    setShowNegotiationHistory(
                                      showNegotiationHistory === s.quote!.id
                                        ? null
                                        : s.quote!.id
                                    )
                                  }
                                >
                                  {cos.length} offer{cos.length !== 1 ? "s" : ""} (
                                  {cos.filter((c) => c.status === "pending").length} pending)
                                </button>
                                {showNegotiationHistory === s.quote!.id && (
                                  <div className={styles.negotiationHistory}>
                                    {cos.map((co, idx) => (
                                      <div key={co.id} className={styles.coItem}>
                                        <div className={styles.coHeader}>
                                          <span className={styles.coFrom}>
                                            {co.offeredByInternal ? "You" : s.supplierName}
                                          </span>
                                          <span
                                            className={`${styles.coStatus} ${styles[`co_${co.status}`]}`}
                                          >
                                            {co.status}
                                          </span>
                                        </div>
                                        <div className={styles.coDetails}>
                                          {Object.entries(co.unitPrices).map(([, price]) => (
                                            <span key={`${co.id}-${idx}`}>
                                              {s.quote?.currency} {Number(price).toFixed(2)}
                                            </span>
                                          ))}
                                        </div>
                                        {co.message && (
                                          <p className={styles.coMsg}>{co.message}</p>
                                        )}
                                        <div className={styles.coDate}>
                                          {new Date(co.createdAt).toLocaleDateString()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </>
                    )}

                    <tr className={styles.actionRow}>
                      <td></td>
                      {allSuppliers.map((s) => (
                        <td key={s.supplierId}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {s.quote && s.rfqStatus === "quoted" && (
                              <>
                                <button
                                  className={
                                    s.quote.isWinner ? styles.btnPrimary : styles.btnOutline
                                  }
                                  onClick={() =>
                                    !s.quote!.isWinner && handleMarkWinner(s.quote!.id)
                                  }
                                  disabled={
                                    markingWinner === s.quote.id || s.quote.isWinner
                                  }
                                >
                                  {s.quote.isWinner ? "Winner" : t("markWinner")}
                                </button>
                                {!s.quote.isWinner && (
                                  <button
                                    className={styles.btnCounterOffer}
                                    onClick={() => {
                                      setCounterOfferQuoteId(
                                        counterOfferQuoteId === s.quote!.id
                                          ? null
                                          : s.quote!.id
                                      );
                                      setCoValues({});
                                      setCoMessage("");
                                    }}
                                  >
                                    Counter Offer
                                  </button>
                                )}
                              </>
                            )}
                          </div>

                          {counterOfferQuoteId === s.quote?.id && (
                            <div className={styles.counterOfferForm}>
                              <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>
                                Counter Offer to {s.supplierName}
                              </h4>
                              {compItem.tiers.map((qty) => {
                                const priceTier = s.quote?.priceTiers?.find(
                                  (pt: PriceTierData) => pt.quantity === qty
                                );
                                if (!priceTier) return null;
                                return (
                                  <div key={qty} className={styles.coInputRow}>
                                    <label>{qty} pcs</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder={priceTier.unitPrice.toString()}
                                      value={coValues[`tier_${priceTier.id}`] || ""}
                                      onChange={(e) =>
                                        setCoValues((prev) => ({
                                          ...prev,
                                          [`tier_${priceTier.id}`]: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                );
                              })}
                              <div className={styles.coInputRow}>
                                <label>Setup</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder={s.quote?.setupCost?.toString()}
                                  value={coValues.setupCost || ""}
                                  onChange={(e) =>
                                    setCoValues((prev) => ({
                                      ...prev,
                                      setupCost: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <textarea
                                className={styles.coTextarea}
                                rows={2}
                                placeholder="Message to supplier..."
                                value={coMessage}
                                onChange={(e) => setCoMessage(e.target.value)}
                              />
                              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                                <button
                                  className={styles.btnPrimary}
                                  style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
                                  onClick={() =>
                                    handleSendCounterOffer(
                                      s.quote!.id,
                                      (s.quote?.priceTiers || []) as PriceTierData[]
                                    )
                                  }
                                  disabled={submittingCo}
                                >
                                  {submittingCo ? "Sending..." : "Send"}
                                </button>
                                <button
                                  className={styles.btnSecondary}
                                  style={{ padding: "8px 12px", fontSize: 13 }}
                                  onClick={() => setCounterOfferQuoteId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {data.comparison.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
            No quotes received yet. Waiting for suppliers to respond.
          </div>
        )}
      </div>
    </div>
  );
}
