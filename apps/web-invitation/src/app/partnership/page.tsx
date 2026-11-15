'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatRupiah, PLATFORM_FEE_PER_TICKET } from '@/lib/ticketing-store';

export default function ClientPartnershipPage() {
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
      style={{
        minHeight: '100vh',
        backgroundColor: '#edf4f0',
        color: '#13281e',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        paddingBottom: '4rem',
      }}
    >
      {/* Top Client Navigation Bar */}
      <div
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '1.5rem 1.25rem 1rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.58rem 1.05rem',
              borderRadius: '999px',
              background: '#ffffff',
              border: '1.5px solid #bfd4c8',
              color: '#13281e',
              fontSize: '0.84rem',
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            ← Beranda Utama
          </Link>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img
              src="/irvite-logo.png"
              alt="IRVITE.ID"
              style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
            />
          </Link>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Link
            href="/tiket"
            style={{
              padding: '0.58rem 1.05rem',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1.5px solid #d5e4dc',
              color: '#13281e',
              fontSize: '0.84rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Lihat Katalog Tiket
          </Link>
          <a
            href="https://wa.me/6281234567890?text=Halo%20Tim%20Partnership%20IRVITE.ID,%20saya%20ingin%20mendaftarkan%20event%20di%20platform%20IRVITE."
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.58rem 1.1rem',
              borderRadius: '12px',
              background: '#1b3b2b',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            Hubungi Tim Partnership
          </a>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ maxWidth: '1080px', margin: '0 auto', padding: '0.75rem 1.25rem' }}>
        {/* Hero Banner */}
        <section
          style={{
            background: 'linear-gradient(135deg, #1b3b2b 0%, #0f2419 60%, #2a543f 100%)',
            borderRadius: '26px',
            padding: '2.75rem 2.25rem',
            color: '#ffffff',
            marginBottom: '1.75rem',
            boxShadow: '0 20px 45px rgba(19, 40, 30, 0.14)',
          }}
        >
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
              fontSize: 'clamp(1.7rem, 3.2vw, 2.5rem)',
              fontWeight: 800,
              margin: '0 0 0.75rem 0',
              lineHeight: 1.2,
              maxWidth: '720px',
            }}
          >
            Kelola Penjualan Tiket Konser, Seminar, &amp; Acara Kampus Tanpa Potongan Persentase Besar
          </h1>
          <p
            style={{
              fontSize: '0.98rem',
              color: '#d3e4db',
              maxWidth: '680px',
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
        </section>

        {/* 3 Value Propositions */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.75rem',
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
        </section>

        {/* Interactive Fee & Payout Calculator */}
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
      </main>
    </div>
  );
}
