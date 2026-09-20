"use client";

import styles from "./page.module.css";
import { useAuth, Role } from "../../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();

  const handleLogin = (role: Role) => {
    login(role);
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.logo}>
          <div className={styles.icon}>S</div>
          <span className={styles.title}>SupplierRFQ</span>
        </div>
        
        <h2 className={styles.welcomeText}>Welcome back</h2>
        <p className={styles.subtitle}>Select a role below to sign in (Mock Auth)</p>

        <div className={styles.buttonGroup}>
          <button 
            className={`${styles.btn} ${styles.btnAdmin}`}
            onClick={() => handleLogin("ADMIN")}
          >
            Login as Admin
          </button>
          
          <button 
            className={`${styles.btn} ${styles.btnInternal}`}
            onClick={() => handleLogin("INTERNAL_SALES")}
          >
            Login as Internal Sales
          </button>
          
          <button 
            className={`${styles.btn} ${styles.btnField}`}
            onClick={() => handleLogin("FIELD_SALES")}
          >
            Login as Field Sales
          </button>
        </div>
      </div>
    </div>
  );
}
