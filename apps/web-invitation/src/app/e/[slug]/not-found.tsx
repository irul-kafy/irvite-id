import React from 'react';
import styles from '../../i/[uniqueCode]/invitation-state.module.css';

export default function NotFound() {
  return (
    <main className={styles.surface}>
      <div className={styles.card}>
        <span className={styles.brand}>irvite</span>
        <h1 className={styles.heading}>Undangan tidak tersedia</h1>
        <p className={styles.description}>
          Tautan acara tidak ditemukan atau masa aktif undangan telah berakhir. Silakan periksa kembali tautan yang Anda terima.
        </p>
      </div>
    </main>
  );
}

