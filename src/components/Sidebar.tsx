"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { role, logout } = useAuth();

  const navItems = [
    { label: t("dashboard"), href: "/" },
    { label: t("projects"), href: "/projects" },
    ...(role === "ADMIN" ? [
      { label: t("suppliers"), href: "/suppliers" },
      { label: t("settings"), href: "/settings" }
    ] : [])
  ];

  const roleLabels = {
    "ADMIN": t("roleAdmin"),
    "INTERNAL_SALES": "Internal Sales",
    "FIELD_SALES": "Field Sales"
  };

  const currentRoleLabel = role ? roleLabels[role] : "";

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>Supplier<span className={styles.accent}>RFQ</span></div>
        <div className={styles.role}>{currentRoleLabel}</div>
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
        <div className={styles.userEmail}>{role?.toLowerCase()}@supplier-rfq.com</div>
        <button className={styles.logoutBtn} onClick={logout}>{t("logout")}</button>
      </div>
    </aside>
  );
}
