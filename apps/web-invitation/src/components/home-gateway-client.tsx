'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function IconTicketCard() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  );
}

function IconWeddingRings() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" />
    </svg>
  );
}

function IconPartnershipBriefcase() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function IconCustomerSupport() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function IconArrowUpRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

export function HomeGatewayClient() {
  const router = useRouter();
  const [csModalOpen, setCsModalOpen] = useState(false);

  const [lookupCode, setLookupCode] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [csSubmitting, setCsSubmitting] = useState(false);
  const [csFeedback, setCsFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash;
      if (hash === '#cara-kerja' || hash === '#paket' || hash === '#katalog' || hash === '#alur') {
        router.replace(`/undangan${hash}`);
      }
    }
  }, [router]);

  async function handleVerifyOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupCode.trim() || !verifyEmail.trim()) return;
    setCsSubmitting(true);
    setCsFeedback(null);
    try {
      const res = await fetch('/api/ticketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-order',
          code: lookupCode.trim(),
          email: verifyEmail.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCsFeedback({
          type: 'error',
          text:
            data?.message ||
            'Verifikasi pesanan gagal. Pastikan kode pesanan dan alamat email sesuai.',
        });
      } else {
        const ord = data?.order;
        setCsFeedback({
          type: 'success',
          text: `Pesanan ${ord?.orderCode || lookupCode.trim()} ditemukan dengan status ${ord?.status || 'PENDING'} untuk acara ${ord?.eventTitle || '-'}.`,
        });
      }
    } catch {
      setCsFeedback({
        type: 'error',
        text: 'Terjadi gangguan jaringan saat menghubungi server. Silakan coba lagi.',
      });
    } finally {
      setCsSubmitting(false);
    }
  }

  return (
    <div className="irv-gw-root">
      <style>{`
        .irv-gw-root {
          min-height: 100vh;
          width: 100%;
          background-color: var(--tkt-surface-subtle);
          color: var(--tkt-text-primary);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.25rem 1.25rem;
          box-sizing: border-box;
        }
        .irv-gw-shell {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 clamp(0.75rem, 2.5vw, 2rem);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .irv-gw-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .irv-gw-logo {
          height: 68px;
          width: auto;
          object-fit: contain;
          margin-bottom: 1.15rem;
          display: block;
        }
        .irv-gw-title {
          font-size: clamp(1.85rem, 3.2vw, 2.55rem);
          font-weight: 800;
          color: var(--tkt-text-primary);
          letter-spacing: -0.025em;
          margin: 0 0 0.55rem 0;
          line-height: 1.2;
        }
        .irv-gw-subtitle {
          font-size: clamp(0.95rem, 1.6vw, 1.06rem);
          font-weight: 500;
          color: var(--tkt-text-secondary);
          max-width: 640px;
          margin: 0;
          line-height: 1.55;
        }
        .irv-gw-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.35rem;
          width: 100%;
        }
        @media (max-width: 680px) {
          .irv-gw-grid {
            grid-template-columns: 1fr;
          }
        }
        .irv-gw-card {
          background: var(--tkt-surface);
          border: 1.5px solid var(--tkt-border);
          border-radius: var(--tkt-radius-lg);
          padding: 1.65rem 1.85rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.25rem;
          text-decoration: none;
          color: var(--tkt-text-primary);
          box-shadow: var(--tkt-shadow-sm);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          cursor: pointer;
          text-align: left;
          width: 100%;
        }
        .irv-gw-card:hover {
          transform: translateY(-3px);
          border-color: var(--tkt-primary);
          box-shadow: var(--tkt-shadow-md);
        }
        .irv-gw-icon-box {
          width: 52px;
          height: 52px;
          border-radius: var(--tkt-radius-md);
          background: var(--tkt-surface-subtle);
          border: 1px solid var(--tkt-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--tkt-primary);
          flex-shrink: 0;
        }
        .irv-gw-card-title {
          font-size: 1.12rem;
          font-weight: 800;
          color: var(--tkt-text-primary);
          margin: 0 0 0.22rem 0;
          line-height: 1.25;
        }
        .irv-gw-card-desc {
          font-size: 0.86rem;
          font-weight: 500;
          color: var(--tkt-text-secondary);
          line-height: 1.45;
          margin: 0;
        }
        .irv-gw-arrow {
          width: 38px;
          height: 38px;
          border-radius: var(--tkt-radius-md);
          background: var(--tkt-primary);
          color: var(--tkt-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background-color 0.18s ease, transform 0.18s ease;
        }
        .irv-gw-card:hover .irv-gw-arrow {
          background: var(--tkt-accent);
          transform: translate(2px, -2px);
        }
      `}</style>

      <div className="irv-gw-shell">
        <div className="irv-gw-header">
          <img
            src="/irvite-logo.png"
            alt="Logo resmi IRVITE"
            className="irv-gw-logo"
          />
          <div role="heading" aria-level={1} className="irv-gw-title">
            Selamat datang di IRVITE
          </div>
          <div className="irv-gw-subtitle">
            Layanan penjualan tiket acara dan undangan digital terpadu. Silakan pilih menu layanan yang ingin dikunjungi.
          </div>
        </div>

        <div className="irv-gw-grid" role="navigation" aria-label="Menu utama IRVITE">
          <Link href="/tiket" className="irv-gw-card" id="gw-card-beli-tiket">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="irv-gw-icon-box">
                <IconTicketCard />
              </div>
              <div>
                <div className="irv-gw-card-title">Beli tiket acara</div>
                <div className="irv-gw-card-desc">
                  Temukan acara publik dan pesan tiket tanpa wajib membuat akun.
                </div>
              </div>
            </div>
            <div className="irv-gw-arrow" aria-hidden="true">
              <IconArrowUpRight />
            </div>
          </Link>

          <Link href="/undangan" className="irv-gw-card" id="gw-card-undangan">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                className="irv-gw-icon-box"
                style={{
                  color: 'var(--tkt-accent)',
                  background: 'var(--tkt-accent-soft)',
                  borderColor: 'var(--tkt-border)',
                }}
              >
                <IconWeddingRings />
              </div>
              <div>
                <div className="irv-gw-card-title">Undangan pernikahan</div>
                <div className="irv-gw-card-desc">
                  Buat undangan digital dengan koleksi desain eksklusif.
                </div>
              </div>
            </div>
            <div className="irv-gw-arrow" aria-hidden="true">
              <IconArrowUpRight />
            </div>
          </Link>

          <Link href="/partnership" className="irv-gw-card" id="gw-card-partnership">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="irv-gw-icon-box">
                <IconPartnershipBriefcase />
              </div>
              <div>
                <div className="irv-gw-card-title">Kerja sama penyelenggara</div>
                <div className="irv-gw-card-desc">
                  Ajukan acara Anda untuk dikelola secara terima beres oleh tim IRVITE.
                </div>
              </div>
            </div>
            <div className="irv-gw-arrow" aria-hidden="true">
              <IconArrowUpRight />
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setCsModalOpen(true)}
            className="irv-gw-card"
            id="gw-card-customer-services"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="irv-gw-icon-box">
                <IconCustomerSupport />
              </div>
              <div>
                <div className="irv-gw-card-title">Bantuan pesanan tiket</div>
                <div className="irv-gw-card-desc">
                  Periksa status pesanan tiket dengan verifikasi email pemesan.
                </div>
              </div>
            </div>
            <div className="irv-gw-arrow" aria-hidden="true">
              <IconArrowUpRight />
            </div>
          </button>
        </div>
      </div>

      {csModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-cs-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(14, 30, 22, 0.62)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            zIndex: 9999,
          }}
          onClick={() => setCsModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--tkt-surface)',
              borderRadius: 'var(--tkt-radius-lg)',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              border: '1px solid var(--tkt-border)',
              boxShadow: 'var(--tkt-shadow-md)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--tkt-primary)',
                    background: 'var(--tkt-surface-subtle)',
                    padding: '0.28rem 0.65rem',
                    borderRadius: 'var(--tkt-radius-sm)',
                    marginBottom: '0.45rem',
                  }}
                >
                  Pusat bantuan pembeli tiket
                </span>
                <div id="modal-cs-title" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--tkt-text-primary)' }}>
                  Verifikasi status pesanan
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCsModalOpen(false)}
                aria-label="Tutup dialog bantuan"
                style={{
                  background: 'var(--tkt-surface-subtle)',
                  border: '1px solid var(--tkt-border)',
                  borderRadius: 'var(--tkt-radius-sm)',
                  padding: '0.35rem 0.65rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: 'var(--tkt-primary)',
                }}
              >
                Tutup
              </button>
            </div>

            <div style={{ fontSize: '0.88rem', color: 'var(--tkt-text-secondary)', lineHeight: 1.55, margin: '0.65rem 0 1.1rem' }}>
              Masukkan kode pesanan beserta alamat email yang digunakan saat pemesanan untuk memeriksa status pembayaran dan tiket Anda.
            </div>

            <form
              onSubmit={handleVerifyOrder}
              style={{
                background: 'var(--tkt-bg)',
                border: '1px solid var(--tkt-border)',
                borderRadius: 'var(--tkt-radius-md)',
                padding: '1.1rem',
                marginBottom: '1.1rem',
              }}
            >
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--tkt-text-secondary)', marginBottom: '0.25rem' }}>
                    Kode pesanan atau kode tiket
                  </label>
                  <input
                    type="text"
                    value={lookupCode}
                    onChange={(e) => setLookupCode(e.target.value)}
                    placeholder="Masukkan kode pesanan (minimal 10 karakter)"
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.8rem',
                      borderRadius: 'var(--tkt-radius-sm)',
                      border: '1px solid var(--tkt-border-strong)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--tkt-text-secondary)', marginBottom: '0.25rem' }}>
                    Alamat email pemesan
                  </label>
                  <input
                    type="email"
                    value={verifyEmail}
                    onChange={(e) => setVerifyEmail(e.target.value)}
                    placeholder="nama@domain.com"
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.8rem',
                      borderRadius: 'var(--tkt-radius-sm)',
                      border: '1px solid var(--tkt-border-strong)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={csSubmitting}
                  style={{
                    padding: '0.7rem 1rem',
                    borderRadius: 'var(--tkt-radius-sm)',
                    border: 'none',
                    background: 'var(--tkt-primary)',
                    color: 'var(--tkt-surface)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: csSubmitting ? 'wait' : 'pointer',
                  }}
                >
                  {csSubmitting ? 'Memverifikasi pesanan...' : 'Verifikasi pesanan'}
                </button>
              </div>

              {csFeedback && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.65rem 0.8rem',
                    borderRadius: 'var(--tkt-radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background:
                      csFeedback.type === 'success'
                        ? 'var(--tkt-success-bg)'
                        : 'var(--tkt-danger-bg)',
                    color:
                      csFeedback.type === 'success'
                        ? 'var(--tkt-success)'
                        : 'var(--tkt-danger)',
                    border: `1px solid ${
                      csFeedback.type === 'success'
                        ? 'var(--tkt-success-border)'
                        : 'var(--tkt-danger-border)'
                    }`,
                  }}
                >
                  <div>{csFeedback.text}</div>
                  {csFeedback.type === 'error' && (
                    <button
                      type="button"
                      onClick={(e) => void handleVerifyOrder(e as unknown as React.FormEvent)}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--tkt-radius-sm)',
                        border: '1px solid var(--tkt-danger-border)',
                        background: 'var(--tkt-surface)',
                        color: 'var(--tkt-danger)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Coba lagi
                    </button>
                  )}
                </div>
              )}
            </form>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link
                href="/tiket"
                onClick={() => setCsModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.1rem',
                  borderRadius: 'var(--tkt-radius-sm)',
                  background: 'var(--tkt-surface-subtle)',
                  color: 'var(--tkt-text-primary)',
                  border: '1px solid var(--tkt-border)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                Buka halaman tiket
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
