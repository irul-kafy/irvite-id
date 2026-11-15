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

  // Self-service Buyer Email Correction state
  const [lookupCode, setLookupCode] = useState('IRV-TKT-2026-8821');
  const [newEmail, setNewEmail] = useState('');
  const [csSubmitting, setCsSubmitting] = useState(false);
  const [csFeedback, setCsFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // If user navigated from /templates to /#cara-kerja or /#paket, forward smoothly to /undangan#...
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash;
      if (hash === '#cara-kerja' || hash === '#paket' || hash === '#katalog' || hash === '#alur') {
        router.replace(`/undangan${hash}`);
      }
    }
  }, [router]);

  async function handleEmailCorrection(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupCode.trim() || !newEmail.trim()) return;
    setCsSubmitting(true);
    setCsFeedback(null);
    try {
      const res = await fetch('/api/ticketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'correct-email',
          lookupCode: lookupCode.trim(),
          newEmail: newEmail.trim(),
          correctedBy: 'Self-Service Buyer Portal',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCsFeedback({
          type: 'error',
          text: data?.message || 'Gagal memperbarui email pesanan.',
        });
      } else {
        setCsFeedback({
          type: 'success',
          text:
            data?.message ||
            'Email berhasil diperbarui dan E-Ticket telah dikirim ulang secara instan.',
        });
        setNewEmail('');
      }
    } catch {
      setCsFeedback({
        type: 'error',
        text: 'Terjadi gangguan jaringan saat menghubungi server.',
      });
    } finally {
      setCsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#edf4f0',
        color: '#13281e',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '2.75rem 1.25rem 2rem',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <style>{`
        .irv-gw-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.25rem;
          width: 100%;
          max-width: 840px;
          margin: 0 auto;
        }
        @media (max-width: 680px) {
          .irv-gw-grid {
            grid-template-columns: 1fr;
          }
        }
        .irv-gw-card {
          background: #ffffff;
          border: 1.5px solid #d5e4dc;
          border-radius: 22px;
          padding: 1.5rem 1.65rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.15rem;
          text-decoration: none;
          color: #13281e;
          box-shadow: 0 12px 30px rgba(19, 40, 30, 0.05);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          cursor: pointer;
          text-align: left;
          width: 100%;
        }
        .irv-gw-card:hover {
          transform: translateY(-3px);
          border-color: #1b3b2b;
          box-shadow: 0 18px 38px rgba(27, 59, 43, 0.11);
        }
        .irv-gw-icon-box {
          width: 54px;
          height: 54px;
          border-radius: 15px;
          background: #edf4f0;
          border: 1px solid #cfe0d6;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1b3b2b;
          flex-shrink: 0;
        }
        .irv-gw-arrow {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: #1b3b2b;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background-color 0.2s ease, transform 0.2s ease;
        }
        .irv-gw-card:hover .irv-gw-arrow {
          background: #b58d3d;
          transform: translate(2px, -2px);
        }
      `}</style>

      {/* Main Centered Content (No Top Navbar) */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '920px',
          margin: '0 auto',
        }}
      >
        {/* Official Transparent PNG Logo Floating Directly on Soft Sage Background */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: '2.4rem',
          }}
        >
          <img
            src="/irvite-logo.png"
            alt="IRVITE.ID Official Logo"
            style={{
              height: '68px',
              width: 'auto',
              objectFit: 'contain',
              marginBottom: '1.15rem',
              display: 'block',
            }}
          />
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.45rem)',
              fontWeight: 800,
              color: '#13281e',
              letterSpacing: '-0.025em',
              margin: '0 0 0.6rem 0',
              lineHeight: 1.2,
            }}
          >
            Selamat Datang di IRVITE
          </h1>
          <p
            style={{
              fontSize: 'clamp(0.95rem, 1.8vw, 1.06rem)',
              color: '#436052',
              maxWidth: '580px',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Platform tiket event dan undangan digital untuk berbagai tipe acara.
            Silakan pilih menu yang ingin kamu kunjungi.
          </p>
        </div>

        {/* 2x2 Symmetrical Action Grid (2 Top, 2 Bottom) */}
        <div className="irv-gw-grid" role="navigation" aria-label="Menu Utama IRVITE">
          {/* 1. Top-Left: Beli Tiket */}
          <Link href="/tiket" className="irv-gw-card" id="gw-card-beli-tiket">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.05rem' }}>
              <div className="irv-gw-icon-box">
                <IconTicketCard />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '1.14rem',
                    fontWeight: 800,
                    color: '#13281e',
                    marginBottom: '0.25rem',
                  }}
                >
                  Beli Tiket
                </div>
                <div style={{ fontSize: '0.88rem', color: '#4d6a5b', lineHeight: 1.45 }}>
                  Cari event yang ingin kamu tonton.
                </div>
              </div>
            </div>
            <div className="irv-gw-arrow" aria-hidden="true">
              <IconArrowUpRight />
            </div>
          </Link>

          {/* 2. Top-Right: Undangan Pernikahan (Direct link to untouched Wedding Invitation Web at /undangan) */}
          <Link href="/undangan" className="irv-gw-card" id="gw-card-undangan">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.05rem' }}>
              <div
                className="irv-gw-icon-box"
                style={{ color: '#9a7328', background: '#f8f4eb', borderColor: '#e8dec5' }}
              >
                <IconWeddingRings />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '1.14rem',
                    fontWeight: 800,
                    color: '#13281e',
                    marginBottom: '0.25rem',
                  }}
                >
                  Undangan Pernikahan
                </div>
                <div style={{ fontSize: '0.88rem', color: '#4d6a5b', lineHeight: 1.45 }}>
                  Buat undangan digital impianmu dengan tema eksklusif.
                </div>
              </div>
            </div>
            <div className="irv-gw-arrow" aria-hidden="true">
              <IconArrowUpRight />
            </div>
          </Link>

          {/* 3. Bottom-Left: Partnership */}
          <Link href="/partnership" className="irv-gw-card" id="gw-card-partnership">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.05rem' }}>
              <div className="irv-gw-icon-box">
                <IconPartnershipBriefcase />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '1.14rem',
                    fontWeight: 800,
                    color: '#13281e',
                    marginBottom: '0.25rem',
                  }}
                >
                  Partnership
                </div>
                <div style={{ fontSize: '0.88rem', color: '#4d6a5b', lineHeight: 1.45 }}>
                  Daftarkan eventmu di IRVITE.
                </div>
              </div>
            </div>
            <div className="irv-gw-arrow" aria-hidden="true">
              <IconArrowUpRight />
            </div>
          </Link>

          {/* 4. Bottom-Right: Customer Services */}
          <button
            type="button"
            onClick={() => setCsModalOpen(true)}
            className="irv-gw-card"
            id="gw-card-customer-services"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.05rem' }}>
              <div className="irv-gw-icon-box">
                <IconCustomerSupport />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '1.14rem',
                    fontWeight: 800,
                    color: '#13281e',
                    marginBottom: '0.25rem',
                  }}
                >
                  Customer Services
                </div>
                <div style={{ fontSize: '0.88rem', color: '#4d6a5b', lineHeight: 1.45 }}>
                  Pengaduan jika ada kendala pembelian.
                </div>
              </div>
            </div>
            <div className="irv-gw-arrow" aria-hidden="true">
              <IconArrowUpRight />
            </div>
          </button>
        </div>
      </main>

      {/* Pure Client Footer (ZERO Admin Console Links) */}
      <footer
        style={{
          textAlign: 'center',
          marginTop: '2.5rem',
          fontSize: '0.82rem',
          color: '#5a7667',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.85rem',
        }}
      >
        <span>© {new Date().getFullYear()} IRVITE.ID • Platform Tiket Event &amp; Undangan Digital</span>
        <span>•</span>
        <Link href="/tiket" style={{ color: '#1b3b2b', fontWeight: 700, textDecoration: 'none' }}>
          Beli Tiket
        </Link>
        <span>•</span>
        <Link href="/undangan" style={{ color: '#1b3b2b', fontWeight: 700, textDecoration: 'none' }}>
          Undangan Pernikahan
        </Link>
        <span>•</span>
        <Link href="/templates" style={{ color: '#1b3b2b', fontWeight: 700, textDecoration: 'none' }}>
          Katalog Desain
        </Link>
        <span>•</span>
        <Link href="/partnership" style={{ color: '#1b3b2b', fontWeight: 700, textDecoration: 'none' }}>
          Partnership EO
        </Link>
      </footer>

      {/* Customer Services Modal */}
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
              background: '#ffffff',
              borderRadius: '22px',
              maxWidth: '540px',
              width: '100%',
              padding: '1.85rem',
              border: '1px solid #d5e4dc',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#1b3b2b',
                    background: '#edf4f0',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '999px',
                    marginBottom: '0.5rem',
                  }}
                >
                  PUSAT BANTUAN PEMBELI TIKET &amp; UNDANGAN
                </span>
                <h2 id="modal-cs-title" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#13281e' }}>
                  Customer Services IRVITE
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCsModalOpen(false)}
                style={{
                  background: '#edf4f0',
                  border: 'none',
                  borderRadius: '10px',
                  width: '34px',
                  height: '34px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: '#1b3b2b',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#4d6a5b', lineHeight: 1.55, margin: '0.75rem 0 1.15rem' }}>
              Salah ketik alamat email saat membeli tiket atau belum menerima E-Ticket QR Pass? Perbaiki email pesanan Anda secara instan di bawah ini atau hubungi tim CS WhatsApp kami.
            </p>

            {/* Buyer Self-Service Typo Email Correction */}
            <form
              onSubmit={handleEmailCorrection}
              style={{
                background: '#f6faf8',
                border: '1px solid #d5e4dc',
                borderRadius: '16px',
                padding: '1.15rem',
                marginBottom: '1.15rem',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#13281e', marginBottom: '0.65rem' }}>
                Koreksi Typo Email &amp; Kirim Ulang E-Ticket Instan
              </div>
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#436052', marginBottom: '0.25rem' }}>
                    Kode Tiket / Kode Order (Contoh: IRV-TKT-2026-8821)
                  </label>
                  <input
                    type="text"
                    value={lookupCode}
                    onChange={(e) => setLookupCode(e.target.value)}
                    placeholder="Masukkan Kode Tiket atau Order"
                    required
                    style={{
                      width: '100%',
                      padding: '0.62rem 0.8rem',
                      borderRadius: '10px',
                      border: '1px solid #c7dbd0',
                      fontSize: '0.86rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#436052', marginBottom: '0.25rem' }}>
                    Alamat Email Baru yang Benar
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="nama.anda@gmail.com"
                    required
                    style={{
                      width: '100%',
                      padding: '0.62rem 0.8rem',
                      borderRadius: '10px',
                      border: '1px solid #c7dbd0',
                      fontSize: '0.86rem',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={csSubmitting}
                  style={{
                    padding: '0.72rem 1rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#1b3b2b',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: csSubmitting ? 'wait' : 'pointer',
                  }}
                >
                  {csSubmitting ? 'Memproses & Mengirim Ulang...' : 'Perbarui Email & Kirim Ulang E-Ticket'}
                </button>
              </div>

              {csFeedback && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.65rem 0.8rem',
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: csFeedback.type === 'success' ? '#e6f4ec' : '#fdecec',
                    color: csFeedback.type === 'success' ? '#155734' : '#9b1c1c',
                    border: `1px solid ${csFeedback.type === 'success' ? '#b7e1c9' : '#f5c2c2'}`,
                  }}
                >
                  {csFeedback.text}
                </div>
              )}
            </form>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <a
                href="https://wa.me/6281234567890?text=Halo%20CS%20IRVITE.ID,%20saya%20membutuhkan%20bantuan%20terkait%20pembelian%20tiket%20/%20undangan."
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  padding: '0.78rem 1rem',
                  borderRadius: '12px',
                  background: '#edf4f0',
                  color: '#1b3b2b',
                  border: '1px solid #c8ddd1',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                Chat WhatsApp Helpdesk CS
              </a>
              <Link
                href="/tiket?tab=my-ticket"
                onClick={() => setCsModalOpen(false)}
                style={{
                  padding: '0.78rem 1.15rem',
                  borderRadius: '12px',
                  background: '#ffffff',
                  color: '#13281e',
                  border: '1px solid #d5e4dc',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  textDecoration: 'none',
                }}
              >
                Cek E-Ticket Saya
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
