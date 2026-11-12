/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './QrisGiftCard.module.css';

export type QrisThemeVariant =
  | 'royal-velvet'
  | 'sekar-kedaton'
  | 'swarga-dewata'
  | 'ranah-cinta'
  | 'opaline-nocturne'
  | 'aetheria';

export interface QrisGiftCardProps {
  qrisUrl?: string | null;
  coupleName?: string;
  theme: QrisThemeVariant;
  className?: string;
}

const THEME_CLASS_MAP: Record<QrisThemeVariant, string> = {
  'royal-velvet': styles.themeRoyalVelvet,
  'sekar-kedaton': styles.themeSekarKedaton,
  'swarga-dewata': styles.themeSwargaDewata,
  'ranah-cinta': styles.themeRanahCinta,
  'opaline-nocturne': styles.themeOpalineNocturne,
  aetheria: styles.themeAetheria,
};

export function QrisGiftCard({
  qrisUrl,
  coupleName,
  theme,
  className = '',
}: QrisGiftCardProps) {
  const [zoomed, setZoomed] = useState(false);

  const safeQrisUrl = qrisUrl ? qrisUrl.trim() : '';

  const handleClose = useCallback(() => {
    setZoomed(false);
  }, []);

  useEffect(() => {
    if (!zoomed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomed(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomed]);

  if (!safeQrisUrl) {
    return null;
  }

  const themeClass = THEME_CLASS_MAP[theme] || styles.themeRoyalVelvet;
  const displayName = coupleName?.trim() || 'Mempelai';

  return (
    <>
      <div
        className={`${styles.qrisCard} ${themeClass} ${className}`.trim()}
        data-testid="qris-gift-card"
      >
        <div className={styles.badgeRow}>
          <span className={styles.qrisLogoMark}>QRIS</span>
          <span>AMPLOP DIGITAL NON-TUNAI</span>
        </div>

        <h4 className={styles.heading}>Scan Barcode QRIS</h4>
        <p className={styles.coupleLabel}>a.n. {displayName}</p>

        <div
          className={styles.qrFrame}
          onClick={() => setZoomed(true)}
          role="button"
          tabIndex={0}
          aria-label={`Perbesar barcode QRIS ${displayName}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setZoomed(true);
            }
          }}
        >
          <img
            src={safeQrisUrl}
            alt={`Barcode QRIS Amplop Digital ${displayName}`}
            className={styles.qrImage}
            loading="lazy"
          />
        </div>

        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => setZoomed(true)}
          >
            <span aria-hidden="true">🔍</span>
            <span>Perbesar QRIS</span>
          </button>

          <a
            href={safeQrisUrl}
            download={`QRIS-${displayName.replace(/[^a-zA-Z0-9_-]/g, '-')}.png`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.actionBtn}
          >
            <span aria-hidden="true">⬇️</span>
            <span>Unduh Gambar QRIS</span>
          </a>
        </div>

        <p className={styles.supportNote}>
          Mendukung BCA Mobile, Livin&apos; Mandiri, BRImo, BNI, GoPay, OVO, DANA,
          ShopeePay &amp; seluruh aplikasi QRIS (bisa scan langsung atau unggah
          dari galeri HP).
        </p>
      </div>

      {zoomed && (
        <div
          className={styles.modalBackdrop}
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau Penuh Barcode QRIS ${displayName}`}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={handleClose}
              aria-label="Tutup tampilan QRIS"
            >
              ×
            </button>

            <h3 className={styles.modalTitle}>Amplop Digital QRIS</h3>
            <p className={styles.modalSub}>a.n. {displayName}</p>

            <div className={styles.modalImageWrap}>
              <img
                src={safeQrisUrl}
                alt={`Barcode QRIS ${displayName}`}
                className={styles.modalImage}
              />
            </div>

            <a
              href={safeQrisUrl}
              download={`QRIS-${displayName.replace(/[^a-zA-Z0-9_-]/g, '-')}.png`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.modalDownloadBtn}
            >
              <span>⬇️</span>
              <span>Simpan ke Galeri HP untuk Scan m-Banking</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
}

