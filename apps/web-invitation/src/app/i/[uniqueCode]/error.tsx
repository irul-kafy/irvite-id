'use client';

import styles from './invitation-state.module.css';

export default function Error({ retry }: { retry: () => void }) {
  return (
    <main className={styles.surface}>
      <div className={styles.card} role="alert">
        <span className={styles.brand}>irvite.id</span>
        <h1 className={styles.heading}>Undangan belum dapat dimuat</h1>
        <p className={styles.description}>Periksa koneksi internet Anda, lalu coba kembali beberapa saat lagi.</p>
        <button type="button" className={styles.retry} onClick={() => retry()}>Coba lagi</button>
      </div>
    </main>
  );
}
