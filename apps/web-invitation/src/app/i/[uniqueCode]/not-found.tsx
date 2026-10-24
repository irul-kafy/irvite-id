import styles from './invitation-state.module.css';

export default function NotFound() {
  return (
    <main className={styles.surface}>
      <div className={styles.card}>
        <span className={styles.brand}>irvite.id</span>
        <h1 className={styles.heading}>Undangan tidak tersedia</h1>
        <p className={styles.description}>Tautan undangan tidak ditemukan atau sudah tidak aktif. Silakan periksa kembali tautan dari pengirim.</p>
      </div>
    </main>
  );
}
