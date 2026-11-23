'use client';

import React from 'react';
import { formatRupiah, PublicTicketingEvent } from '../types';

export const TICKET_CATEGORIES = [
  'Semua',
  'Konser Musik',
  'Seminar & Edukasi',
  'Workshop',
  'Standup Comedy',
] as const;

interface TicketCatalogSectionProps {
  events: PublicTicketingEvent[];
  loading: boolean;
  loadError: string | null;
  searchQuery: string;
  selectedCategory: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (category: string) => void;
  onRetry: () => void;
  onOpenCheckout: (event: PublicTicketingEvent) => void;
}

export function TicketCatalogSection({
  events,
  loading,
  loadError,
  searchQuery,
  selectedCategory,
  onSearchChange,
  onCategoryChange,
  onRetry,
  onOpenCheckout,
}: TicketCatalogSectionProps) {
  return (
    <section aria-labelledby="catalog-heading">
      <div
        style={{
          background: 'var(--tkt-surface)',
          border: '1px solid var(--tkt-border)',
          borderRadius: 'var(--tkt-radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--tkt-shadow-sm)',
        }}
      >
        <h1
          id="catalog-heading"
          style={{
            margin: '0 0 0.45rem 0',
            fontSize: 'clamp(1.35rem, 2.5vw, 1.85rem)',
            fontWeight: 800,
            color: 'var(--tkt-text-primary)',
          }}
        >
          Temukan dan beli tiket acara publik
        </h1>
        <p
          style={{
            margin: '0 0 1.25rem 0',
            fontSize: '0.92rem',
            color: 'var(--tkt-text-secondary)',
            lineHeight: 1.5,
          }}
        >
          Pembelian tiket praktis tanpa wajib membuat akun. Pilih acara, lengkapi data pemesan, dan dapatkan pesanan resmi secara langsung.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nama acara, penyelenggara, atau kota..."
            aria-label="Cari acara tiket"
            style={{
              flex: '1 1 260px',
              padding: '0.65rem 0.9rem',
              borderRadius: 'var(--tkt-radius-sm)',
              border: '1px solid var(--tkt-border-strong)',
              fontSize: '0.88rem',
              background: 'var(--tkt-surface)',
              color: 'var(--tkt-text-primary)',
            }}
          />
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {TICKET_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={`irv-tkt-btn ${selectedCategory === cat ? 'irv-tkt-btn--primary' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadError && (
        <div className="irv-tkt-alert-error" role="alert">
          <div>
            <strong style={{ display: 'block', marginBottom: '0.2rem' }}>
              Gagal memuat data acara
            </strong>
            <span style={{ fontSize: '0.875rem' }}>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="irv-tkt-btn"
            style={{
              borderColor: 'var(--tkt-danger-border)',
              color: 'var(--tkt-danger)',
            }}
          >
            Coba lagi
          </button>
        </div>
      )}

      {loading && !loadError && (
        <div
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            color: 'var(--tkt-text-secondary)',
            fontSize: '0.95rem',
          }}
        >
          Memuat daftar acara dari server...
        </div>
      )}

      {!loading && !loadError && events.length === 0 && (
        <div
          style={{
            background: 'var(--tkt-surface)',
            border: '1px solid var(--tkt-border)',
            borderRadius: 'var(--tkt-radius-lg)',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            marginTop: '1.25rem',
          }}
        >
          <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.15rem' }}>
            Belum ada acara tiket yang tersedia
          </h2>
          <p
            style={{
              margin: '0 0 1rem 0',
              color: 'var(--tkt-text-secondary)',
              fontSize: '0.9rem',
            }}
          >
            Tidak ada acara yang sesuai dengan pencarian saat ini, atau data belum ditambahkan.
          </p>
          <button type="button" onClick={onRetry} className="irv-tkt-btn">
            Muat ulang katalog
          </button>
        </div>
      )}

      {!loading && !loadError && events.length > 0 && (
        <div className="irv-tkt-grid">
          {events.map((ev) => {
            const totalRemaining = ev.tiers.reduce(
              (acc, t) => acc + t.remainingQuota,
              0,
            );
            return (
              <article key={ev.id} className="irv-tkt-card">
                <div className="irv-tkt-banner">
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: 'rgba(255, 255, 255, 0.16)',
                      padding: '0.22rem 0.6rem',
                      borderRadius: 'var(--tkt-radius-sm)',
                      marginBottom: '0.55rem',
                    }}
                  >
                    {ev.category}
                  </span>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      lineHeight: 1.3,
                    }}
                  >
                    {ev.title}
                  </h2>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      opacity: 0.9,
                      marginTop: '0.35rem',
                    }}
                  >
                    Penyelenggara: {ev.organizerName}
                  </div>
                </div>

                <div className="irv-tkt-card-body">
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--tkt-text-secondary)',
                      display: 'grid',
                      gap: '0.3rem',
                    }}
                  >
                    <div>
                      <strong>Jadwal:</strong>{' '}
                      {ev.dateLabel || ev.eventDate} ({ev.eventTime})
                    </div>
                    <div>
                      <strong>Lokasi:</strong> {ev.venueName}, {ev.city}
                    </div>
                    <div>
                      <strong>Sisa kuota:</strong>{' '}
                      {totalRemaining.toLocaleString('id-ID')} tiket
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid var(--tkt-border)',
                      paddingTop: '0.85rem',
                      marginTop: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--tkt-text-muted)',
                        }}
                      >
                        Harga mulai
                      </div>
                      <div
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          color: 'var(--tkt-text-primary)',
                        }}
                      >
                        {formatRupiah(ev.startingPrice)}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={totalRemaining <= 0}
                      onClick={() => onOpenCheckout(ev)}
                      className="irv-tkt-btn irv-tkt-btn--primary"
                    >
                      {totalRemaining > 0 ? 'Pesan tiket' : 'Tiket habis'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
