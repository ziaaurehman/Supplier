import styles from "./loading.module.css";

export default function Loading() {
  return (
    <div className={styles.wrapper} aria-busy="true" aria-live="polite">
      <div className={styles.topbar}>
        <div className={`${styles.block} ${styles.title}`} />
        <div className={`${styles.block} ${styles.subtitle}`} />
      </div>
      <div className={styles.content}>
        <div className={styles.cards}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${styles.block} ${styles.card}`} />
          ))}
        </div>
        <div className={`${styles.block} ${styles.panel}`} />
      </div>
    </div>
  );
}
