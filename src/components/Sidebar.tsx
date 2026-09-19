"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";
import { useLanguage } from "../context/LanguageContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { label: t("dashboard"), href: "/" },
    { label: t("projects"), href: "/projects" },
    { label: t("suppliers"), href: "/suppliers" },
    { label: t("settings"), href: "/settings" },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>Supplier<span className={styles.accent}>RFQ</span></div>
        <div className={styles.role}>{t("roleAdmin")}</div>
      </div>

      <nav className={styles.nav}>
        <ul>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <li key={item.href} className={isActive ? styles.active : ""}>
                <Link href={item.href}>
                  <span className={styles.dot}>•</span> {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.footer}>
        <div className={styles.userEmail}>admin@supplier-rfq.com</div>
        <button className={styles.logoutBtn}>{t("logout")}</button>
      </div>
    </aside>
  );
}
