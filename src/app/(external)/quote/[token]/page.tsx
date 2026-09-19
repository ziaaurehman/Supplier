"use client";

import styles from "./page.module.css";
import { use, useState } from "react";
import Link from "next/link";
import { useLanguage } from "../../../../context/LanguageContext";

export default function SupplierQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [isDeclined, setIsDeclined] = useState(false);
  const { t } = useLanguage();

  if (isDeclined) {
    return (
      <div className={styles.card}>
        <h2 className={styles.title}>{t("quoteDeclined")}</h2>
        <p className={styles.subtitle}>{t("quoteDeclinedMsg")}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("quoteFormTitle")}</h1>
        <p className={styles.subtitle}>{t("quoteFormSubtitle")}</p>
        <div className={styles.deadlineBox}>
          <strong>{t("thDeadline")}:</strong> Oct 15, 2026
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>{t("itemDetails")}</h3>
        <p><strong>{t("itemName")}:</strong> Stainless Steel Bottle 500ml</p>
        <p><strong>{t("decoMethod")}:</strong> Laser Engraving</p>
        <p><strong>{t("internalNote")}:</strong> Please quote for matte black finish.</p>
        
        <hr className={styles.divider} />

        <h3 className={styles.sectionTitle}>{t("pricingTiers")}</h3>
        
        <div className={styles.pricingGrid}>
          {/* 150 Tier */}
          <div className={styles.tierBox}>
            <label>Unit Price (150 pcs)</label>
            <div className={styles.inputWrapper}>
              <span className={styles.currency}>€</span>
              <input type="number" placeholder="0.00" />
            </div>
          </div>
          
          {/* 250 Tier */}
          <div className={styles.tierBox}>
            <label>Unit Price (250 pcs)</label>
            <div className={styles.inputWrapper}>
              <span className={styles.currency}>€</span>
              <input type="number" placeholder="0.00" />
            </div>
          </div>

          {/* 500 Tier */}
          <div className={styles.tierBox}>
            <label>Unit Price (500 pcs)</label>
            <div className={styles.inputWrapper}>
              <span className={styles.currency}>€</span>
              <input type="number" placeholder="0.00" />
            </div>
          </div>
        </div>

        <div className={styles.additionalCosts}>
          <div className={styles.inputGroup}>
            <label>{t("setupCosts")}</label>
            <div className={styles.inputWrapper}>
              <span className={styles.currency}>€</span>
              <input type="number" placeholder="0.00" />
            </div>
          </div>
          
          <div className={styles.inputGroup}>
            <label>{t("freightCosts")}</label>
            <div className={styles.inputWrapper}>
              <span className={styles.currency}>€</span>
              <input type="number" placeholder="0.00" />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Additional Information</h3>
        
        <div className={styles.infoGrid}>
          <div className={styles.inputGroup}>
            <label>{t("leadTime")}</label>
            <input type="number" placeholder="e.g. 14" />
          </div>
          <div className={styles.inputGroup}>
            <label>{t("validUntil")}</label>
            <input type="date" />
          </div>
        </div>

        <div className={styles.inputGroupFull}>
          <label>Comments / Alternative Proposals</label>
          <textarea rows={3} placeholder="Any additional information..."></textarea>
        </div>
        
        <div className={styles.inputGroupFull}>
          <label>Attachments (Data sheet, photo)</label>
          <input type="file" />
        </div>
      </div>

      <div className={styles.actions}>
        <button 
          className={styles.btnDecline}
          onClick={() => setIsDeclined(true)}
        >
          {t("declineQuote")}
        </button>
        <Link href={`/quote/overview/${token}`}>
          <button className={styles.btnSubmit}>{t("submitQuote")}</button>
        </Link>
      </div>
    </div>
  );
}
