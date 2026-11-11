'use client';

import React, { useState, useEffect } from 'react';
import type { PublicWishItem } from '../../types/public-invitation';
import styles from './wishes-section.module.css';

export interface WishesSectionProps {
  uniqueCode?: string;
  eventSlug?: string;
  defaultName?: string;
  initialWishes?: PublicWishItem[];
  title?: string;
  description?: string;
  className?: string;
  variant?: 'light' | 'dark' | 'balinese' | 'aetheria' | 'ranah-cinta' | 'sekar-kedaton' | 'auto';
}

function formatWishDate(dateStr?: string): string {
  if (!dateStr) return 'Baru saja';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const diffMs = Date.now() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay < 7) return `${diffDay} hari lalu`;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function WishesSection({
  uniqueCode,
  eventSlug,
  defaultName = '',
  initialWishes = [],
  title = 'Untaian Doa & Pesan Restu',
  description = 'Tuliskan doa tulus dan harapan terbaik Anda untuk mengiringi hari bahagia kedua mempelai.',
  className,
  variant = 'light',
}: WishesSectionProps) {
  const [items, setItems] = useState<PublicWishItem[]>(initialWishes);
  const [name, setName] = useState(defaultName);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (initialWishes && initialWishes.length > 0) {
      setItems(initialWishes);
    }
  }, [initialWishes]);

  useEffect(() => {
    if (defaultName && !name) {
      setName(defaultName);
    }
  }, [defaultName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanMsg = message.trim();

    if (!cleanName || !cleanMsg) {
      setAlert({ type: 'error', message: 'Mohon isi nama dan pesan ucapan Anda.' });
      return;
    }

    setSubmitting(true);
    setAlert(null);

    const targetUrl = uniqueCode
      ? `/api-proxy/invitations/public/${encodeURIComponent(uniqueCode)}/wishes`
      : eventSlug
      ? `/api-proxy/events/public/${encodeURIComponent(eventSlug)}/wishes`
      : null;

    try {
      let created: PublicWishItem | null = null;
      if (targetUrl) {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: cleanName, message: cleanMsg }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Gagal mengirimkan ucapan');
        }

        created = await res.json();
      }

      const newWish: PublicWishItem = {
        id: created?.id || `local-${Date.now()}`,
        name: cleanName,
        message: cleanMsg,
        createdAt: created?.createdAt || new Date().toISOString(),
      };

      setItems((prev) => [newWish, ...prev]);
      setMessage('');
      setAlert({
        type: 'success',
        message: 'Terima kasih! Untaian doa restu Anda telah terkirim.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      setAlert({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  let themeClass = styles.light;
  if (variant === 'dark') {
    themeClass = styles.dark;
  } else if (variant === 'balinese') {
    themeClass = styles.balinese;
  } else if (variant === 'aetheria') {
    themeClass = styles.aetheria;
  } else if (variant === 'ranah-cinta') {
    themeClass = styles.ranahCinta;
  } else if (variant === 'sekar-kedaton') {
    themeClass = styles.sekarKedaton;
  }

  return (
    <section className={`${styles.section} ${themeClass} ${className || ''}`} id="wishes">
      <div className={styles.header}>
        <div className={styles.ornament} aria-hidden="true">
          <span>✧</span>
          <span>✦</span>
          <span>✧</span>
        </div>
        <span className={styles.eyebrow}>Doa &amp; Restu</span>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
        <div className={styles.counterBadge}>
          <span>💌</span>
          <span>{items.length} Doa Restu Masuk</span>
        </div>
      </div>

      <div className={styles.formCard}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label htmlFor="wish-name" className={styles.label}>
                Nama Anda / Tamu Kehormatan
              </label>
              <span className={styles.charCount}>{name.length}/120</span>
            </div>
            <input
              id="wish-name"
              type="text"
              className={styles.input}
              placeholder="Contoh: Budi Santoso &amp; Pasangan"
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label htmlFor="wish-msg" className={styles.label}>
                Untaian Doa &amp; Pesan Restu
              </label>
              <span className={styles.charCount}>{message.length}/500</span>
            </div>
            <textarea
              id="wish-msg"
              className={styles.textarea}
              placeholder="Tuliskan ucapan selamat dan doa tulus untuk kedua mempelai..."
              maxLength={500}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting || !name.trim() || !message.trim()}
          >
            {submitting ? 'Mengirimkan Doa…' : 'Kirim Untaian Doa Restu'}
            <span aria-hidden="true">↗</span>
          </button>

          {alert && (
            <div
              className={`${styles.alert} ${
                alert.type === 'success' ? styles.alertSuccess : styles.alertError
              }`}
              role="alert"
            >
              {alert.message}
            </div>
          )}
        </form>
      </div>

      <div className={styles.feedHeaderRow}>
        <h3 className={styles.feedTitle}>
          <span>📖</span>
          <span>Buku Doa Tamu</span>
        </h3>
        <span className={styles.counterBadge}>{items.length} pesan</span>
      </div>

      <div className={styles.feedList} aria-label="Daftar ucapan dan doa">
        {items.length > 0 ? (
          items.map((item) => {
            const initial = (item.name || 'T').charAt(0).toUpperCase();
            const dateText = item.dateLabel || formatWishDate(item.createdAt);
            return (
              <article key={item.id} className={styles.feedCard}>
                <span className={styles.quoteWatermark} aria-hidden="true">
                  “
                </span>
                <div className={styles.cardHeader}>
                  <div className={styles.avatar}>{initial}</div>
                  <div className={styles.authorInfo}>
                    <strong className={styles.authorName}>{item.name}</strong>
                    <span className={styles.timeAgo}>
                      <span aria-hidden="true">🕒</span>
                      {dateText}
                    </span>
                  </div>
                </div>
                <p className={styles.message}>{item.message}</p>
              </article>
            );
          })
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">
              🕊️
            </span>
            <p className={styles.emptyTitle}>Belum ada untaian doa</p>
            <p className={styles.emptyDesc}>
              Jadilah yang pertama menitipkan doa restu dan ucapan selamat untuk mengiringi langkah kedua mempelai.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default WishesSection;
