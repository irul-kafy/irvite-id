import styles from './invitation-state.module.css';

export default function Loading() {
  return (
    <main className={styles.surface} role="status" aria-busy="true">
      <div className={styles.card}>
        <span className={styles.brand}>irvite.id</span>
        <p className={styles.description}>Memuat undangan...</p>
        <span className={styles.pulse} aria-hidden="true" />
      </div>
    </main>
  );
}
