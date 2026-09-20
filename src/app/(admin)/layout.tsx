import React from "react";
import Sidebar from "../../components/Sidebar";
import styles from "./layout.module.css";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <Sidebar />
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
