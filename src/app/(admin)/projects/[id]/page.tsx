"use client";

import Topbar from "../../../../components/Topbar";
import styles from "./page.module.css";
import Link from "next/link";
import { use } from "react";
import { useLanguage } from "../../../../context/LanguageContext";

export default function ProjectDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();

  return (
    <div>
      <Topbar title="Project #P-2026-001" subtitle="150 Water Bottles with logo • Deadline: Oct 15, 2026">
        <Link href={`/projects/${id}/compare`}>
          <button className={styles.btnPrimary}>{t("compareQuotes")}</button>
        </Link>
      </Topbar>

      <div className={styles.content}>
        <div className={styles.grid}>
          {/* Left Column: Suppliers & Status */}
          <div className={styles.column}>
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>{t("supplierStatus")}</h2>
              <ul className={styles.supplierList}>
                <li className={styles.supplierItem}>
                  <div className={styles.supplierInfo}>
                    <strong>Acme Promos GmbH</strong>
                    <span>Sent: Oct 10, 14:00</span>
                  </div>
                  <span className={styles.statusQuoted}>{t("quoted")}</span>
                </li>
                <li className={styles.supplierItem}>
                  <div className={styles.supplierInfo}>
                    <strong>Printify Europe</strong>
                    <span>Opened: Oct 10, 15:30</span>
                  </div>
                  <span className={styles.statusQuoted}>{t("quoted")}</span>
                </li>
                <li className={styles.supplierItem}>
                  <div className={styles.supplierInfo}>
                    <strong>Lanyard Kings</strong>
                    <span>Declined: Oct 11, 09:15</span>
                  </div>
                  <span className={styles.statusDeclined}>{t("declined")}</span>
                </li>
                <li className={styles.supplierItem}>
                  <div className={styles.supplierInfo}>
                    <strong>Global Merch</strong>
                    <span>Sent: Oct 10, 14:00</span>
                  </div>
                  <span className={styles.statusPending}>{t("pending")}</span>
                </li>
              </ul>
            </div>
            
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>{t("projectDetails")}</h2>
              <p><strong>{t("thCustomer")}:</strong> Acme Corp</p>
              <p><strong>{t("deliveryDate")}:</strong> Nov 01, 2026</p>
              <p><strong>{t("itemName")}:</strong> Stainless Steel Bottle 500ml</p>
              <p><strong>{t("decoMethod")}:</strong> Laser Engraving</p>
              <p><strong>{t("quantityTiers")}:</strong> 150 / 250 / 500</p>
            </div>
          </div>

          {/* Right Column: Messaging Hub */}
          <div className={styles.column}>
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>{t("messagingNotes")}</h2>
              
              <div className={styles.chatBox}>
                
                {/* External Message from Supplier */}
                <div className={styles.messageGroup}>
                  <div className={styles.messageHeader}>
                    <strong>Jane Doe (Acme Promos GmbH)</strong>
                    <span>Oct 11, 10:20</span>
                  </div>
                  <div className={styles.messageBubble}>
                    Can we offer a 600ml bottle instead? The 500ml is out of stock until December.
                  </div>
                </div>

                {/* Internal Note */}
                <div className={`${styles.messageGroup} ${styles.internalNote}`}>
                  <div className={styles.messageHeader}>
                    <strong>Super Admin</strong>
                    <span className={styles.internalBadge}>{t("internalNote")}</span>
                    <span>Oct 11, 10:30</span>
                  </div>
                  <div className={styles.messageBubble}>
                    Called customer. They are okay with 600ml as long as the price stays under €5.00 net.
                  </div>
                </div>

                {/* External Message to Supplier */}
                <div className={`${styles.messageGroup} ${styles.outgoing}`}>
                  <div className={styles.messageHeader}>
                    <strong>Super Admin (You)</strong>
                    <span>Oct 11, 10:35</span>
                  </div>
                  <div className={styles.messageBubble}>
                    Yes, 600ml is acceptable. Please submit your quote for the 600ml option and leave a comment in the form.
                  </div>
                </div>

              </div>

              <div className={styles.replyBox}>
                <div className={styles.tabs}>
                  <button className={`${styles.tab} ${styles.activeTab}`}>{t("replySupplier")}</button>
                  <button className={`${styles.tab} ${styles.internalTab}`}>{t("addInternalNote")}</button>
                </div>
                <select className={styles.replySelect}>
                  <option>To: Acme Promos GmbH</option>
                  <option>To: Printify Europe</option>
                  <option>To: Global Merch</option>
                </select>
                <textarea rows={3} placeholder="Type your message..." className={styles.replyTextarea}></textarea>
                <div className={styles.replyActions}>
                  <button className={styles.btnSecondary}>{t("attachFile")}</button>
                  <button className={styles.btnPrimary}>{t("sendMessage")}</button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
