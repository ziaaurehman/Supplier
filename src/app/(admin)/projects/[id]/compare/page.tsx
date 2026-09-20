"use client";

import Topbar from "../../../../../components/Topbar";
import styles from "./page.module.css";
import { useLanguage } from "../../../../../context/LanguageContext";

export default function QuoteComparisonPage() {
  const { t } = useLanguage();

  return (
    <div>
      <Topbar title={t("comparisonTitle")} subtitle="Project #P-2026-001 • Deadline: Oct 15, 2026" backUrl="/projects/1">
        <button className={styles.btnSecondary}>{t("exportExcel")}</button>
      </Topbar>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.scrollWrapper}>
            <table className={styles.compareTable}>
              <thead>
                <tr>
                  <th className={styles.rowLabel}>Criteria</th>
                  <th className={styles.supplierCol}>
                    <div className={styles.supplierName}>Acme Promos GmbH</div>
                    <div className={styles.supplierStatus}>Quoted on Oct 10</div>
                  </th>
                  <th className={styles.supplierCol}>
                    <div className={styles.supplierName}>Printify Europe</div>
                    <div className={styles.supplierStatus}>Quoted on Oct 11</div>
                  </th>
                  <th className={styles.supplierCol}>
                    <div className={styles.supplierName}>Lanyard Kings</div>
                    <div className={styles.supplierDeclined}>{t("declined")}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* 150 Tier */}
                <tr className={styles.sectionRow}>
                  <td colSpan={4}>Quantity: 150 units</td>
                </tr>
                <tr>
                  <td className={styles.rowLabel}>Unit Price (Net)</td>
                  <td>€ 4.50</td>
                  <td className={styles.highlightLowest}>€ 4.10</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td className={styles.rowLabel}>{t("setupCosts")}</td>
                  <td>€ 45.00</td>
                  <td>€ 60.00</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td className={styles.rowLabel}>{t("freightCosts")}</td>
                  <td>€ 15.00</td>
                  <td>€ 12.00</td>
                  <td>-</td>
                </tr>
                <tr className={styles.totalRow}>
                  <td className={styles.rowLabel}>{t("totalCost")} (150 units)</td>
                  <td>€ 735.00 <span className={styles.unitCalc}>(€ 4.90/ea)</span></td>
                  <td className={styles.highlightLowest}>€ 687.00 <span className={styles.unitCalc}>(€ 4.58/ea)</span></td>
                  <td>-</td>
                </tr>

                {/* 250 Tier */}
                <tr className={styles.sectionRow}>
                  <td colSpan={4}>Quantity: 250 units</td>
                </tr>
                <tr>
                  <td className={styles.rowLabel}>Unit Price (Net)</td>
                  <td className={styles.highlightLowest}>€ 3.80</td>
                  <td>€ 3.90</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td className={styles.rowLabel}>{t("setupCosts")}</td>
                  <td>€ 45.00</td>
                  <td>€ 60.00</td>
                  <td>-</td>
                </tr>
                <tr>
                  <td className={styles.rowLabel}>{t("freightCosts")}</td>
                  <td>€ 15.00</td>
                  <td>€ 18.00</td>
                  <td>-</td>
                </tr>
                <tr className={styles.totalRow}>
                  <td className={styles.rowLabel}>{t("totalCost")} (250 units)</td>
                  <td className={styles.highlightLowest}>€ 1010.00 <span className={styles.unitCalc}>(€ 4.04/ea)</span></td>
                  <td>€ 1053.00 <span className={styles.unitCalc}>(€ 4.21/ea)</span></td>
                  <td>-</td>
                </tr>

                {/* Other Info */}
                <tr className={styles.sectionRow}>
                  <td colSpan={4}>Terms & Information</td>
                </tr>
                <tr>
                  <td className={styles.rowLabel}>{t("leadTime")}</td>
                  <td>14 working days</td>
                  <td>21 working days</td>
                  <td>No capacity</td>
                </tr>
                <tr>
                  <td className={styles.rowLabel}>{t("validUntil")}</td>
                  <td>Nov 30, 2026</td>
                  <td>Dec 31, 2026</td>
                  <td>-</td>
                </tr>
                
                {/* Actions */}
                <tr className={styles.actionRow}>
                  <td></td>
                  <td><button className={styles.btnPrimary}>{t("markWinner")}</button></td>
                  <td><button className={styles.btnOutline}>{t("markWinner")}</button></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
