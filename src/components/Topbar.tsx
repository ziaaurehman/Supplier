import React from "react";
import styles from "./Topbar.module.css";
import Link from "next/link";

interface TopbarProps {
  title: string;
  subtitle?: string;
  backUrl?: string;
  children?: React.ReactNode; // For filters and action buttons
}

export default function Topbar({ title, subtitle, backUrl, children }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.titleContainer}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {backUrl && (
            <Link href={backUrl} style={{ textDecoration: "none", color: "var(--text-light)", fontSize: "1.25rem", paddingBottom: "2px" }}>
              ←
            </Link>
          )}
          <h1 className={styles.title}>{title}</h1>
        </div>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      
      {children && (
        <div className={styles.actions}>
          {children}
        </div>
      )}
    </header>
  );
}
