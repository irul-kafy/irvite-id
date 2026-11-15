'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const DEFAULT_INVITATION_ORIGIN =
  process.env.NEXT_PUBLIC_INVITATION_ORIGIN ||
  (process.env.NODE_ENV === 'production' ? 'https://irvite.id' : 'http://localhost:3002');

interface EmailCorrectionResult {
  orderCode: string;
  ticketCodes: string[];
  buyerName: string;
  eventTitle: string;
  previousEmail: string;
  updatedEmail: string;
  correctedAt: string;
  message: string;
}

export default function IrviteGatewayPage() {
  const [activeModal, setActiveModal] = useState<'none' | 'cs' | 'partnership'>('none');

  // CS 5-Second Typo Email Correction State
  const [lookupCode, setLookupCode] = useState('ORD-IRV-2026-8821');
  const [newEmail, setNewEmail] = useState('rizky.pratama@gmail.com');
  const [csLoading, setCsLoading] = useState(false);
  const [csError, setCsError] = useState<string | null>(null);
  const [csSuccess, setCsSuccess] = useState<EmailCorrectionResult | null>(null);

  async function handleCorrectEmail(e: React.FormEvent) {
    e.preventDefault();
    setCsError(null);
    setCsSuccess(null);
    setCsLoading(true);

    try {
      const res = await fetch('/api/ticketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'correct-email',
          lookupCode,
          newEmail,
          correctedBy: 'Self-Service & CS Gateway',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Gagal memperbarui alamat email.');
      }
      setCsSuccess(data);
    } catch (err) {
      setCsError(err instanceof Error ? err.message : 'Terjadi kendala saat menghubungi server.');
    } finally {
      setCsLoading(false);
    }
  }

  return (
    <div className="irv-gateway-root">
      <style>{`
        .irv-gateway-root {
          min-height: 100vh;
          width: 100%;
          background-color: #edf4f0;
          color: #162920;
          font-family: var(--font-plus-jakarta, 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 24px 32px;
          box-sizing: border-box;
        }
        .irv-gateway-main {
          max-width: 920px;
          width: 100%;
          margin: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .irv-gateway-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 40px;
        }
        .irv-gateway-logo {
          height: 54px;
          width: auto;
          object-fit: contain;
          display: block;
          margin-bottom: 22px;
          filter: drop-shadow(0 2px 6px rgba(18, 38, 28, 0.06));
        }
        .irv-gateway-title {
          font-size: clamp(1.75rem, 3.2vw, 2.35rem);
          font-weight: 800;
          letter-spacing: -0.025em;
          color: #13261c;
          margin: 0 0 12px;
          line-height: 1.2;
        }
        .irv-gateway-subtitle {
          font-size: clamp(0.95rem, 1.5vw, 1.06rem);
          color: #4a6356;
          max-width: 580px;
          line-height: 1.65;
          margin: 0;
          font-weight: 500;
        }
        .irv-gateway-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          width: 100%;
        }
        .irv-gateway-card {
          background: #ffffff;
          border: 1.5px solid rgba(27, 59, 43, 0.1);
          border-radius: 22px;
          padding: 26px 26px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          text-align: left;
          box-shadow: 0 10px 28px -12px rgba(20, 46, 33, 0.08);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.2s ease;
        }
        .irv-gateway-card:hover {
          transform: translateY(-3px);
          border-color: #1b3b2b;
          box-shadow: 0 18px 36px -14px rgba(20, 46, 33, 0.15);
        }
        .irv-gateway-card-left {
          display: flex;
          align-items: center;
          gap: 18px;
          min-width: 0;
        }
        .irv-gateway-icon-box {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: #eff5f1;
          border: 1px solid rgba(27, 59, 43, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .irv-gateway-card-title {
          font-size: 1.18rem;
          font-weight: 800;
          color: #12241b;
          margin: 0 0 5px;
          letter-spacing: -0.015em;
        }
        .irv-gateway-card-desc {
          font-size: 0.91rem;
          color: #566e61;
          margin: 0;
          line-height: 1.45;
          font-weight: 500;
        }
        .irv-gateway-arrow {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: #1b3b2b;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background-color 0.2s ease, transform 0.2s ease;
        }
        .irv-gateway-card:hover .irv-gateway-arrow {
          background: #12291e;
          transform: translate(2px, -2px);
        }
        .irv-gateway-footer {
          margin-top: 48px;
          text-align: center;
          font-size: 0.82rem;
          color: #5b7366;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          flex-wrap: wrap;
        }
        .irv-gateway-footer a {
          color: #1b3b2b;
          font-weight: 700;
          text-decoration: none;
        }
        .irv-gateway-footer a:hover {
          text-decoration: underline;
        }

        /* Modal Overlay */
        .irv-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(13, 27, 20, 0.56);
          backdrop-filter: blur(5px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .irv-modal-box {
          background: #ffffff;
          border-radius: 24px;
          max-width: 640px;
          width: 100%;
          padding: 32px;
          box-shadow: 0 28px 60px -15px rgba(10, 25, 18, 0.35);
          border: 1px solid rgba(27, 59, 43, 0.14);
          max-height: 90vh;
          overflow-y: auto;
        }
        .irv-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }
        .irv-modal-badge {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 5px 11px;
          border-radius: 999px;
          background: #edf4f0;
          color: #1b3b2b;
          margin-bottom: 8px;
        }
        .irv-modal-title {
          font-size: 1.4rem;
          font-weight: 800;
          color: #13261c;
          margin: 0;
        }
        .irv-modal-close {
          background: #f2f6f4;
          border: none;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          cursor: pointer;
          color: #2c4438;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .irv-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1.5px solid #d5e2da;
          font-size: 0.92rem;
          color: #13261c;
          background: #fbfdfc;
          box-sizing: border-box;
          outline: none;
        }
        .irv-input:focus {
          border-color: #1b3b2b;
          background: #ffffff;
        }
        .irv-btn-primary {
          background: #1b3b2b;
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 13px 20px;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          transition: background 0.18s ease;
        }
        .irv-btn-primary:hover {
          background: #12281d;
        }
        .irv-btn-secondary {
          background: #edf4f0;
          color: #1b3b2b;
          border: 1px solid rgba(27, 59, 43, 0.2);
          border-radius: 12px;
          padding: 12px 18px;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
        }

        @media (max-width: 740px) {
          .irv-gateway-grid {
            grid-template-columns: 1fr;
          }
          .irv-gateway-card {
            padding: 20px;
          }
        }
      `}</style>

      <main className="irv-gateway-main">
        {/* Brand Identity Floating Cleanly on Soft Sage (Zero White Box, Zero Navbar) */}
        <header className="irv-gateway-brand">
          <img
            src="/irvite-logo.png"
            alt="IRVITE.ID"
            className="irv-gateway-logo"
          />
          <h1 className="irv-gateway-title">Selamat Datang di IRVITE</h1>
          <p className="irv-gateway-subtitle">
            Platform tiket event dan undangan digital untuk berbagai tipe acara. Silakan pilih menu yang ingin kamu kunjungi.
          </p>
        </header>

        {/* Strictly 2x2 Grid (2 Top, 2 Bottom) */}
        <section className="irv-gateway-grid" aria-label="Menu Utama IRVITE">
          {/* 1. Top-Left: Beli Tiket */}
          <Link href="/tiket" className="irv-gateway-card">
            <div className="irv-gateway-card-left">
              <div className="irv-gateway-icon-box" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1b3b2b" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="7" width="18" height="13" rx="2.5" />
                  <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <rect x="6.5" y="11" width="11" height="5" rx="1" fill="#d4af37" stroke="none" />
                  <line x1="6.5" y1="13.5" x2="17.5" y2="13.5" stroke="#1b3b2b" strokeWidth="1.4" />
                </svg>
              </div>
              <div>
                <h2 className="irv-gateway-card-title">Beli Tiket</h2>
                <p className="irv-gateway-card-desc">Cari event yang ingin kamu tonton.</p>
              </div>
            </div>
            <div className="irv-gateway-arrow" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </div>
          </Link>

          {/* 2. Top-Right: Undangan Pernikahan (Direct Untouched Connection to web-invitation) */}
          <a
            href={DEFAULT_INVITATION_ORIGIN}
            className="irv-gateway-card"
            data-testid="gateway-wedding-invitation-link"
          >
            <div className="irv-gateway-card-left">
              <div className="irv-gateway-icon-box" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9.5" cy="12" r="5" stroke="#d4af37" />
                  <circle cx="14.5" cy="12" r="5" stroke="#1b3b2b" />
                </svg>
              </div>
              <div>
                <h2 className="irv-gateway-card-title">Undangan Pernikahan</h2>
                <p className="irv-gateway-card-desc">
                  Buat undangan digital impianmu dengan tema eksklusif.
                </p>
              </div>
            </div>
            <div className="irv-gateway-arrow" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </div>
          </a>

          {/* 3. Bottom-Left: Partnership */}
          <button
            type="button"
            onClick={() => setActiveModal('partnership')}
            className="irv-gateway-card"
          >
            <div className="irv-gateway-card-left">
              <div className="irv-gateway-icon-box" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1b3b2b" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="3" width="14" height="18" rx="2" />
                  <line x1="8.5" y1="8" x2="15.5" y2="8" />
                  <line x1="8.5" y1="11.5" x2="15.5" y2="11.5" />
                  <line x1="8.5" y1="15" x2="12" y2="15" />
                  <circle cx="14.5" cy="15.5" r="2" fill="#d4af37" stroke="none" />
                </svg>
              </div>
              <div>
                <h2 className="irv-gateway-card-title">Partnership</h2>
                <p className="irv-gateway-card-desc">Daftarkan eventmu di IRVITE.</p>
              </div>
            </div>
            <div className="irv-gateway-arrow" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </div>
          </button>

          {/* 4. Bottom-Right: Customer Services */}
          <button
            type="button"
            onClick={() => setActiveModal('cs')}
            className="irv-gateway-card"
          >
            <div className="irv-gateway-card-left">
              <div className="irv-gateway-icon-box" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1b3b2b" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
                  <rect x="3" y="13" width="4" height="6" rx="1.5" fill="#d4af37" stroke="#1b3b2b" />
                  <rect x="17" y="13" width="4" height="6" rx="1.5" fill="#d4af37" stroke="#1b3b2b" />
                  <path d="M19 19v1a2 2 0 0 1-2 2h-4" />
                </svg>
              </div>
              <div>
                <h2 className="irv-gateway-card-title">Customer Services</h2>
                <p className="irv-gateway-card-desc">Pengaduan jika ada kendala pembelian.</p>
              </div>
            </div>
            <div className="irv-gateway-arrow" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </div>
          </button>
        </section>
      </main>

      <footer className="irv-gateway-footer">
        <span>IRVITE.ID Unified Event &amp; Digital Invitation Ecosystem</span>
        <span>•</span>
        <Link href="/tiket">Katalog Event</Link>
        <span>•</span>
        <Link href="/partnership">Partnership EO</Link>
        <span>•</span>
        <Link href="/dashboard">Panel Organizer &amp; Admin</Link>
      </footer>

      {/* PARTNERSHIP EO MODAL */}
      {activeModal === 'partnership' && (
        <div className="irv-modal-backdrop" onClick={() => setActiveModal('none')}>
          <div className="irv-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="irv-modal-header">
              <div>
                <span className="irv-modal-badge">Kemitraan Event Organizer</span>
                <h2 className="irv-modal-title">Daftarkan Eventmu di IRVITE.ID</h2>
              </div>
              <button
                type="button"
                className="irv-modal-close"
                onClick={() => setActiveModal('none')}
                aria-label="Tutup"
              >
                X
              </button>
            </div>

            <p style={{ color: '#4d6658', fontSize: '0.94rem', lineHeight: 1.6, marginTop: 0 }}>
              Kelola penjualan tiket konser, seminar, workshop, maupun pertunjukan dalam satu ekosistem terpadu dengan pencairan dana transparan.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                gap: '12px',
                margin: '20px 0',
              }}
            >
              <div style={{ background: '#f4f8f5', padding: '16px', borderRadius: '14px', border: '1px solid #dce8e0' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#567062', textTransform: 'uppercase' }}>
                  Biaya Layanan Flat
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1b3b2b', margin: '4px 0' }}>
                  Rp 3.000 / Tiket
                </div>
                <div style={{ fontSize: '0.82rem', color: '#567062' }}>
                  Event gratis Rp 0 biaya platform. Tanpa potongan persentase tersembunyi.
                </div>
              </div>

              <div style={{ background: '#f4f8f5', padding: '16px', borderRadius: '14px', border: '1px solid #dce8e0' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#567062', textTransform: 'uppercase' }}>
                  Gate Check-In
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1b3b2b', margin: '4px 0' }}>
                  QR Gate Scanner
                </div>
                <div style={{ fontSize: '0.82rem', color: '#567062' }}>
                  Validasi tiket instan via kamera HP atau webcam laptop anti-duplikasi.
                </div>
              </div>

              <div style={{ background: '#f4f8f5', padding: '16px', borderRadius: '14px', border: '1px solid #dce8e0' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#567062', textTransform: 'uppercase' }}>
                  Opsi Atribut Fisik
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1b3b2b', margin: '4px 0' }}>
                  Tiket Gelang QR
                </div>
                <div style={{ fontSize: '0.82rem', color: '#567062' }}>
                  Tersedia produksi wristband lanyard tyvek/satin tahan air untuk konser.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '24px' }}>
              <Link href="/partnership" className="irv-btn-primary">
                Halaman Lengkap Partnership &amp; Kalkulator EO
              </Link>
              <Link href="/dashboard" className="irv-btn-secondary">
                Buka Panel Organizer &amp; Buat Event
              </Link>
              <Link href="/tiket" className="irv-btn-secondary">
                Lihat Katalog Event Publik
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER SERVICES & 5-SECOND EMAIL CORRECTION MODAL */}
      {activeModal === 'cs' && (
        <div className="irv-modal-backdrop" onClick={() => setActiveModal('none')}>
          <div className="irv-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="irv-modal-header">
              <div>
                <span className="irv-modal-badge">Pusat Bantuan Pembeli Tiket</span>
                <h2 className="irv-modal-title">Customer Services &amp; Koreksi Email Instan</h2>
              </div>
              <button
                type="button"
                className="irv-modal-close"
                onClick={() => setActiveModal('none')}
                aria-label="Tutup"
              >
                X
              </button>
            </div>

            <p style={{ color: '#4d6658', fontSize: '0.92rem', lineHeight: 1.6, marginTop: 0 }}>
              Salah ketik alamat email saat membeli tiket (misalnya <code>@gmial.com</code>)? Perbaiki langsung dalam 5 detik dan sistem akan mengirim ulang E-Ticket secara instan.
            </p>

            <form
              onSubmit={handleCorrectEmail}
              style={{
                background: '#f5f9f7',
                border: '1px solid #d7e5dd',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '18px',
              }}
            >
              <div style={{ marginBottom: '14px' }}>
                <label
                  htmlFor="cs-lookup-code"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#1b3b2b' }}
                >
                  Kode Pesanan atau Kode E-Ticket
                </label>
                <input
                  id="cs-lookup-code"
                  className="irv-input"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                  placeholder="Contoh: ORD-IRV-2026-8821 atau IRV-TKT-2026-8821"
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="cs-new-email"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#1b3b2b' }}
                >
                  Alamat Email Baru yang Benar
                </label>
                <input
                  id="cs-new-email"
                  type="email"
                  className="irv-input"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nama@gmail.com"
                  required
                />
              </div>

              <button type="submit" className="irv-btn-primary" disabled={csLoading} style={{ width: '100%' }}>
                {csLoading ? 'Memproses Koreksi & Mengirim Ulang...' : 'Perbaiki Email & Kirim Ulang E-Ticket Sekarang'}
              </button>

              {csError && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  {csError}
                </div>
              )}

              {csSuccess && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '14px',
                    borderRadius: '12px',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: '4px' }}>
                    E-TICKET BERHASIL DIKIRIM ULANG
                  </div>
                  <div>{csSuccess.message}</div>
                  <div style={{ marginTop: '6px', fontSize: '0.8rem', opacity: 0.9 }}>
                    Pemesan: <strong>{csSuccess.buyerName}</strong> • Tiket: <strong>{csSuccess.ticketCodes.join(', ')}</strong>
                  </div>
                </div>
              )}
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <span style={{ fontSize: '0.84rem', color: '#567062' }}>
                Butuh bantuan tim Customer Care secara langsung?
              </span>
              <a
                href="https://wa.me/6281288997711?text=Halo%20CS%20IRVITE.ID,%20saya%20membutuhkan%20bantuan%20pembelian%20tiket"
                target="_blank"
                rel="noreferrer"
                className="irv-btn-secondary"
              >
                Hubungi WhatsApp Resmi CS
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
