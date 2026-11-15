'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatRupiah, PLATFORM_FEE_PER_TICKET } from '@/lib/ticketing-store';

function IconSparkleStar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#f5c443" stroke="#f5c443" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function ClientPartnershipPage() {
  const router = useRouter();
  const [headerSearch, setHeaderSearch] = useState<string>('');
  const [ticketPrice, setTicketPrice] = useState<number>(150000);
  const [estimatedSold, setEstimatedSold] = useState<number>(300);
  const [feeBearer, setFeeBearer] = useState<'buyer' | 'organizer'>('buyer');

  const grossTicketSales = ticketPrice * estimatedSold;
  const totalPlatformFee = ticketPrice > 0 ? PLATFORM_FEE_PER_TICKET * estimatedSold : 0;
  const netOrganizerPayout =
    feeBearer === 'buyer' ? grossTicketSales : Math.max(0, grossTicketSales - totalPlatformFee);
  const buyerCheckoutPrice =
    feeBearer === 'buyer' && ticketPrice > 0 ? ticketPrice + PLATFORM_FEE_PER_TICKET : ticketPrice;

  return (
    <div
      className="irv-client-part-root"
      style={{
        minHeight: '100vh',
        backgroundColor: '#edf4f0',
        color: '#13281e',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        paddingBottom: '4rem',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .irv-client-part-root,
        .irv-client-part-root h1,
        .irv-client-part-root h2,
        .irv-client-part-root h3,
        .irv-client-part-root p {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
        .irv-part-container {
          width: 100%;
          max-width: 1720px;
          margin: 0 auto;
          padding-left: clamp(1.25rem, 3.2vw, 3rem);
          padding-right: clamp(1.25rem, 3.2vw, 3rem);
          box-sizing: border-box;
        }
        .irv-part-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(320px, 1fr);
          gap: 2rem;
          align-items: center;
        }
        .irv-part-bottom-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(320px, 1fr);
          gap: 1.5rem;
          align-items: stretch;
        }
        @media (max-width: 1024px) {
          .irv-part-hero-grid,
          .irv-part-bottom-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      {/* 1. TOP UTILITY PROMO BAR (Daftarkan Eventmu Sekarang | Mini Apps | Tentang Kami | Cetak Tiket Gelang | Layanan Pelanggan) */}
      <div
        style={{
          width: '100%',
          background: 'linear-gradient(90deg, #0f2419 0%, #1b3b2b 35%, #2d6a4f 52%, #1b3b2b 72%, #0f2419 100%)',
          color: '#ffffff',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <div
          className="irv-part-container"
          style={{
            minHeight: '42px',
            paddingTop: '0.4rem',
            paddingBottom: '0.4rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <Link
            href="/partnership"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#f5c443',
              textDecoration: 'none',
              fontSize: '0.84rem',
              fontWeight: 800,
              letterSpacing: '0.01em',
            }}
          >
            <IconSparkleStar />
            <span>Daftarkan Eventmu Sekarang</span>
          </Link>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '1.5rem',
            }}
          >
            {[
              { href: '/tiket?tab=mini-apps', label: 'Mini Apps' },
              { href: '/tiket?tab=about', label: 'Tentang Kami' },
              { href: '/tiket?tab=wristband', label: 'Cetak Tiket Gelang' },
              { href: '/tiket?tab=support', label: 'Layanan Pelanggan' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '0.83rem',
                  fontWeight: 700,
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MAIN WHITE HEADER WITH WIDE SEARCH BAR ON TOP */}
      <header
        style={{
          width: '100%',
          background: '#ffffff',
          borderBottom: '1px solid #dce8e1',
          boxShadow: '0 4px 18px rgba(19, 40, 30, 0.04)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          marginBottom: '1.25rem',
        }}
      >
        <div
          className="irv-part-container"
          style={{
            paddingTop: '0.9rem',
            paddingBottom: '0.9rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexShrink: 0 }}>
            <Link href="/tiket" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <img
                src="/irvite-logo.png"
                alt="IRVITE.ID"
                style={{ height: '22px', width: 'auto', objectFit: 'contain' }}
              />
            </Link>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.36rem 0.75rem',
                borderRadius: '999px',
                background: '#edf4f0',
                border: '1px solid #cfe0d6',
                color: '#1b3b2b',
                fontSize: '0.75rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Beranda
            </Link>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              router.push('/tiket');
            }}
            style={{
              flex: '1 1 420px',
              display: 'flex',
              alignItems: 'center',
              background: '#ffffff',
              border: '1.5px solid #d5e4dc',
              borderRadius: '10px',
              padding: '0.28rem 0.32rem 0.28rem 1rem',
              boxShadow: 'inset 0 1px 2px rgba(19, 40, 30, 0.03)',
            }}
          >
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Cari berdasarkan artis, acara, atau nama tempat"
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '0.88rem',
                flex: 1,
                color: '#13281e',
                background: 'transparent',
                fontWeight: 500,
              }}
            />
            <button
              type="submit"
              aria-label="Cari Event"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                border: 'none',
                background: '#1b3b2b',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <IconSearch />
            </button>
          </form>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flexShrink: 0 }}>
            <Link
              href="/tiket"
              style={{
                padding: '0.58rem 1rem',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1.5px solid #d5e4dc',
                color: '#13281e',
                fontSize: '0.82rem',
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              Katalog Event
            </Link>
            <Link
              href="/tiket?tab=my-ticket"
              style={{
                padding: '0.58rem 1rem',
                borderRadius: '10px',
                background: '#edf4f0',
                border: '1.5px solid #d5e4dc',
                color: '#1b3b2b',
                fontSize: '0.82rem',
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              E-Ticket Saya
            </Link>
            <Link
              href="/tiket?auth=1"
              style={{
                padding: '0.58rem 1rem',
                borderRadius: '10px',
                background: '#1b3b2b',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              Masuk / Daftar
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content (Full-Width Widescreen) */}
      <main className="irv-part-container" style={{ paddingTop: '0.25rem', paddingBottom: '0.5rem' }}>
        {/* Hero Banner (2-Column Balanced Widescreen) */}
        <section
          style={{
            background: 'linear-gradient(135deg, #1b3b2b 0%, #0f2419 60%, #2a543f 100%)',
            borderRadius: '26px',
            padding: '2.5rem 2.5rem',
            color: '#ffffff',
            marginBottom: '1.5rem',
            boxShadow: '0 20px 45px rgba(19, 40, 30, 0.14)',
          }}
        >
          <div className="irv-part-hero-grid">
            <div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#e5c170',
                  marginBottom: '0.6rem',
                }}
              >
                IRVITE EVENT ORGANIZER PARTNERSHIP
              </span>
              <h1
                style={{
                  fontSize: 'clamp(1.75rem, 3vw, 2.45rem)',
                  fontWeight: 800,
                  margin: '0 0 0.75rem 0',
                  lineHeight: 1.2,
                }}
              >
                Kelola Penjualan Tiket Konser, Seminar, &amp; Acara Kampus Tanpa Potongan Persentase Besar
              </h1>
              <p
                style={{
                  fontSize: '0.96rem',
                  color: '#d3e4db',
                  lineHeight: 1.6,
                  margin: '0 0 1.5rem 0',
                }}
              >
                IRVITE.ID menghadirkan infrastruktur E-Ticket QR Pass instan, sistem Multi-Tier (Presale, Reguler, VIP), cetak Wristband 300 DPI siap produksi, serta pencairan dana H+1 acara secara transparan.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
                <a
                  href="https://wa.me/6281234567890?text=Halo%20Tim%20Partnership%20IRVITE.ID,%20saya%20ingin%20mendaftarkan%20event%20kami."
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '0.85rem 1.45rem',
                    borderRadius: '14px',
                    background: '#d4af37',
                    color: '#13281e',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                  }}
                >
                  Daftarkan Event via WhatsApp Sekarang
                </a>
                <Link
                  href="/tiket"
                  style={{
                    padding: '0.85rem 1.35rem',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                  }}
                >
                  Lihat Contoh Katalog &amp; E-Ticket Pass
                </Link>
              </div>
            </div>

            {/* Right Column inside Hero Banner: 2x2 Key Metric Highlights */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '0.85rem',
              }}
            >
              {[
                {
                  tag: 'BIAYA PLATFORM FLAT',
                  val: 'Rp 3.000',
                  desc: 'Per tiket berbayar terjual (Tanpa komisi %)',
                },
                {
                  tag: 'EVENT GRATIS / KAMPUS',
                  val: 'Rp 0 (Gratis)',
                  desc: 'Bebas biaya layanan untuk acara non-berbayar',
                },
                {
                  tag: 'PENCAIRAN DANA EO',
                  val: 'H+1 Otomatis',
                  desc: 'Rekonsiliasi & transfer langsung ke rekening EO',
                },
                {
                  tag: 'PRODUKSI FISIK',
                  val: '300 DPI QR',
                  desc: 'Ekspor ZIP Vektor Gelang Tyvek & Lanyard VIP',
                },
              ].map((m) => (
                <div
                  key={m.tag}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '18px',
                    padding: '1.1rem 1.15rem',
                  }}
                >
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#e5c170', letterSpacing: '0.06em' }}>
                    {m.tag}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '0.2rem 0' }}>
                    {m.val}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#cfe0d6', lineHeight: 1.4 }}>
                    {m.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4 Value Propositions (Full-Width 4-Column Row) */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '1.5rem',
              border: '1.5px solid #d5e4dc',
            }}
          >
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#9a7328', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              01 • BIAYA PLATFORM FLAT
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.45rem 0' }}>
              Rp 3.000 / Tiket Terjual
            </h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#4d6a5b', lineHeight: 1.55 }}>
              Tidak ada potongan komisi persentase yang menggerus pendapatan EO. Untuk event gratis (Rp 0), biaya layanan Rp 0.
            </p>
          </div>

          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '1.5rem',
              border: '1.5px solid #d5e4dc',
            }}
          >
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#9a7328', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              02 • PENCAIRAN CEPAT
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.45rem 0' }}>
              Settlement Dana H+1 Acara
            </h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#4d6a5b', lineHeight: 1.55 }}>
              Rekap penjualan tier otomatis dan pencairan dana langsung ke rekening resmi panitia maksimal 1x24 jam setelah acara selesai.
            </p>
          </div>

          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '1.5rem',
              border: '1.5px solid #d5e4dc',
            }}
          >
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#9a7328', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              03 • OPERASIONAL VENUE LENGKAP
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.45rem 0' }}>
              Gate Scanner &amp; Wristband 300 DPI
            </h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#4d6a5b', lineHeight: 1.55 }}>
              Validasi QR anti-duplikasi di pintu masuk serta ekspor bundel gelang tiket siap cetak untuk penukaran tiket fisik.
            </p>
          </div>

          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '1.5rem',
              border: '1.5px solid #d5e4dc',
            }}
          >
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#9a7328', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              04 • MULTI-TIER FLEKSIBEL
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.45rem 0' }}>
              Presale, Reguler, &amp; VIP Deck
            </h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#4d6a5b', lineHeight: 1.55 }}>
              Atur kuota otomatis per kategori tiket dengan indikator sisa kuota real-time dan penerbitan E-Ticket QR instan ke pembeli.
            </p>
          </div>
        </section>

        {/* Bottom 2-Column Widescreen Grid: Calculator + 3-Step Onboarding */}
        <div className="irv-part-bottom-grid">
          {/* Left: Interactive Fee & Payout Calculator */}
          <section
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '2rem',
              border: '1.5px solid #d5e4dc',
              boxShadow: '0 14px 34px rgba(19, 40, 30, 0.05)',
            }}
          >
            <div style={{ marginBottom: '1.35rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#1b3b2b',
                  background: '#edf4f0',
                  padding: '0.28rem 0.65rem',
                  borderRadius: '999px',
                  marginBottom: '0.4rem',
                }}
              >
                SIMULATOR PENDAPATAN PANITIA (EO)
              </span>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
                Hitung Estimasi Pencairan Dana Event Anda
              </h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.5rem',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Harga Tiket per Orang (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={ticketPrice}
                    onChange={(e) => setTicketPrice(Math.max(0, Number(e.target.value) || 0))}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '12px',
                      border: '1.5px solid #c5d9ce',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Target Jumlah Tiket Terjual: <strong>{estimatedSold} Tiket</strong>
                  </label>
                  <input
                    type="range"
                    min={20}
                    max={2000}
                    step={10}
                    value={estimatedSold}
                    onChange={(e) => setEstimatedSold(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#1b3b2b' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Skema Biaya Platform (Rp 3.000/tiket)
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setFeeBearer('buyer')}
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        borderRadius: '10px',
                        border: feeBearer === 'buyer' ? '2px solid #1b3b2b' : '1px solid #c5d9ce',
                        background: feeBearer === 'buyer' ? '#edf4f0' : '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Ditanggung Pembeli (EO Terima 100%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeeBearer('organizer')}
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        borderRadius: '10px',
                        border: feeBearer === 'organizer' ? '2px solid #1b3b2b' : '1px solid #c5d9ce',
                        background: feeBearer === 'organizer' ? '#edf4f0' : '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Diserap Panitia (Harga All-In)
                    </button>
                  </div>
                </div>
              </div>

              {/* Output Card */}
              <div
                style={{
                  background: '#f5faf7',
                  borderRadius: '18px',
                  padding: '1.5rem',
                  border: '1.5px solid #cfe0d6',
                }}
              >
                <div style={{ display: 'grid', gap: '0.65rem', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#4d6a5b' }}>Harga Checkout Pembeli:</span>
                    <strong>{formatRupiah(buyerCheckoutPrice)} / tiket</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#4d6a5b' }}>Total Penjualan Kotor ({estimatedSold} tiket):</span>
                    <strong>{formatRupiah(grossTicketSales)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#4d6a5b' }}>Total Biaya Platform IRVITE:</span>
                    <strong>
                      {formatRupiah(totalPlatformFee)} ({feeBearer === 'buyer' ? 'Dibayar Pembeli' : 'Dipotong dari EO'})
                    </strong>
                  </div>
                  <div
                    style={{
                      borderTop: '1.5px dashed #bfd4c8',
                      paddingTop: '0.75rem',
                      marginTop: '0.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <span style={{ fontWeight: 800, color: '#13281e' }}>Dana Bersih Diterima EO (H+1):</span>
                    <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1b3b2b' }}>
                      {formatRupiah(netOrganizerPayout)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right: 3-Step EO Onboarding & Wristband Production Info */}
          <section
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '2rem',
              border: '1.5px solid #d5e4dc',
              boxShadow: '0 14px 34px rgba(19, 40, 30, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1.25rem',
            }}
          >
            <div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#9a7328',
                  background: '#fef6e6',
                  padding: '0.28rem 0.65rem',
                  borderRadius: '999px',
                  marginBottom: '0.4rem',
                }}
              >
                ALUR KEMITRAAN EO • TAYANG HARI INI
              </span>
              <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem', fontWeight: 800 }}>
                3 Langkah Mudah Tayangkan Event Anda
              </h2>

              <div style={{ display: 'grid', gap: '0.85rem' }}>
                {[
                  {
                    step: '01',
                    title: 'Kirim Profil Acara & Poster 16:9',
                    desc: 'Hubungi tim Partnership via WhatsApp dengan nama acara, jadwal, lokasi venue, dan kategori tier tiket.',
                  },
                  {
                    step: '02',
                    title: 'Aktivasi Link Penjualan & QR Pass',
                    desc: 'Halaman event langsung aktif di katalog /tiket lengkap dengan pembayaran QRIS & Virtual Account otomatis.',
                  },
                  {
                    step: '03',
                    title: 'Gate Scanner & Settlement H+1',
                    desc: 'Gunakan Gate Scanner pada hari-H acara dan terima pencairan dana penuh ke rekening resmi panitia pada H+1.',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    style={{
                      display: 'flex',
                      gap: '0.85rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '14px',
                      background: '#f7fbf9',
                      border: '1px solid #d5e4dc',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: '#1b3b2b',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {item.step}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#13281e' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#4d6a5b', marginTop: '0.15rem', lineHeight: 1.45 }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <a
              href="https://wa.me/6281234567890?text=Halo%20Tim%20Partnership%20IRVITE.ID,%20saya%20ingin%20konsultasi%20pembukaan%20tiket%20event."
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '0.85rem 1.25rem',
                borderRadius: '14px',
                background: '#1b3b2b',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.88rem',
                textDecoration: 'none',
              }}
            >
              Konsultasi &amp; Buka Penjualan Tiket via WhatsApp →
            </a>
          </section>
        </div>
      </main>
    </div>
  );
}
