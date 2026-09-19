import React from "react";
import styles from "./Topbar.module.css";

interface TopbarProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode; // For filters and action buttons
}

export default function Topbar({ title, subtitle, children }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.titleContainer}>
        <h1 className={styles.title}>{title}</h1>
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
