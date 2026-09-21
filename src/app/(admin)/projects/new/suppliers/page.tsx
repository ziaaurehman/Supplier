"use client";

import Topbar from "../../../../../components/Topbar";
import styles from "./page.module.css";
import Link from "next/link";
import { useLanguage } from "../../../../../context/LanguageContext";

export default function SupplierSelectionPage() {
  const { t } = useLanguage();

  return (
    <div>
      <Topbar title="Select Suppliers" subtitle="Choose who will receive this enquiry" backUrl="/projects/new">
        <Link href="/projects">
          <button className={styles.btnSecondary}>{t("saveDraft")}</button>
        </Link>
        <Link href="/projects/1">
          <button className={styles.btnPrimary}>{t("sendRFQs")}</button>
        </Link>
      </Topbar>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.filterBar}>
            <input 
              type="text" 
              placeholder="Search supplier name..." 
              className={styles.searchInput}
            />
            <select className={styles.filterSelect}>
              <option>Category: All</option>
              <option>Category: Water Bottles</option>
              <option>Category: Lanyards</option>
              <option>Category: Apparel</option>
            </select>
          </div>

          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "40px" }}></th>
                  <th>{t("thSupplierName")}</th>
                  <th>{t("thCategories")}</th>
                  <th>{t("thLanguage")}</th>
                  <th>Last Used</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><input type="checkbox" defaultChecked /></td>
                  <td><strong>Acme Promos GmbH</strong></td>
                  <td><span className={styles.tag}>Water Bottles</span></td>
                  <td>German</td>
                  <td>2 days ago</td>
                </tr>
                <tr>
                  <td><input type="checkbox" defaultChecked /></td>
                  <td><strong>Printify Europe</strong></td>
                  <td><span className={styles.tag}>Apparel</span> <span className={styles.tag}>Water Bottles</span></td>
                  <td>English</td>
                  <td>1 week ago</td>
                </tr>
                <tr>
                  <td><input type="checkbox" /></td>
                  <td><strong>Lanyard Kings</strong></td>
                  <td><span className={styles.tag}>Lanyards</span></td>
                  <td>English</td>
                  <td>1 month ago</td>
                </tr>
                <tr>
                  <td><input type="checkbox" defaultChecked /></td>
                  <td><strong>Global Merch</strong></td>
                  <td><span className={styles.tag}>Bags</span> <span className={styles.tag}>Water Bottles</span></td>
                  <td>English</td>
                  <td>3 days ago</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
