"use client";

import Topbar from "../../../components/Topbar";
import styles from "./page.module.css";
import Link from "next/link";
import { useLanguage } from "../../../context/LanguageContext";

export default function SuppliersPage() {
  const { t } = useLanguage();

  return (
    <div>
      <Topbar title={t("suppliersTitle")} subtitle={t("suppliersSubtitle")}>
        <button className={styles.btnSecondary}>{t("importCsv")}</button>
        <Link href="/suppliers/new">
          <button className={styles.btnPrimary}>{t("addSupplier")}</button>
        </Link>
      </Topbar>

      <div className={styles.content}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("companyName")}</th>
                <th>{t("thContacts")}</th>
                <th>{t("emailAddr")}</th>
                <th>{t("thCategories")}</th>
                <th>{t("thStatus")}</th>
                <th>{t("thAction")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Acme Promos GmbH</td>
                <td>Jane Doe</td>
                <td>jane@acmepromos.de</td>
                <td><span className={styles.tag}>Water Bottles</span></td>
                <td><span className={styles.statusActive}>Active</span></td>
                <td><button className={styles.actionBtn}>{t("edit")}</button></td>
              </tr>
              <tr>
                <td>Printify Europe</td>
                <td>John Smith</td>
                <td>john.smith@printify.eu</td>
                <td><span className={styles.tag}>T-Shirts</span> <span className={styles.tag}>Apparel</span></td>
                <td><span className={styles.statusActive}>Active</span></td>
                <td><button className={styles.actionBtn}>{t("edit")}</button></td>
              </tr>
              <tr>
                <td>Lanyard Kings</td>
                <td>Max Mustermann</td>
                <td>max@lanyardkings.com</td>
                <td><span className={styles.tag}>Lanyards</span></td>
                <td><span className={styles.statusInactive}>Inactive</span></td>
                <td><button className={styles.actionBtn}>{t("edit")}</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
