"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

import { useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { role, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: t("dashboard"), href: "/" },
    { label: t("projects"), href: "/projects" },
    ...(role === "ADMIN" ? [
      { label: t("suppliers"), href: "/suppliers" }
    ] : []),
    { label: t("settings"), href: "/settings" }
  ];

  const roleLabels = {
    "ADMIN": t("roleAdmin"),
    "INTERNAL_SALES": "Internal Sales",
    "FIELD_SALES": "Field Sales"
  };

  const currentRoleLabel = role ? roleLabels[role] : "";

  return (
    <>
      <div className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ""}`} onClick={() => setIsOpen(false)}></div>
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.header}>
          <div>
            <div className={styles.logo}>Supplier<span className={styles.accent}>RFQ</span></div>
            <div className={styles.role}>{currentRoleLabel}</div>
          </div>
          <button className={styles.hamburgerBtn} onClick={() => setIsOpen(!isOpen)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        <nav className={`${styles.nav} ${isOpen ? styles.navOpen : ""}`}>
          <ul>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <li key={item.href} className={isActive ? styles.active : ""}>
                  <Link href={item.href} onClick={() => setIsOpen(false)}>
                    <span className={styles.dot}>•</span> {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={`${styles.footer} ${isOpen ? styles.footerOpen : ""}`}>
          <div className={styles.userEmail}>{role?.toLowerCase()}@supplier-rfq.com</div>
          <button className={styles.logoutBtn} onClick={logout}>{t("logout")}</button>
        </div>
      </aside>
    </>
  );
}
