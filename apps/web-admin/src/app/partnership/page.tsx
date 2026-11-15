'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const PLATFORM_FEE = 3000;

function formatRp(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

const SOP_BABAK = [
  {
    id: 'babak-1',
    badge: 'Babak 1: Pemanasan & Profil Acara',
    title: 'Sambutan Hangat & Identifikasi Kebutuhan EO',
    script:
      'Halo Kak! Salam hangat dari tim Kemitraan IRVITE.ID. Terima kasih sudah tertarik mendaftarkan event Kakak. Boleh diinfokan nama acara, rencana tanggal pelaksanaan, lokasi kota/venue, serta estimasi kuota penontonnya Kak?',
  },
  {
    id: 'babak-2',
    badge: 'Babak 2: Format Tiket Digital & Opsi Gelang Fisik',
    title: 'Penjelasan Fee Flat Rp 3.000/Tiket & Atribut Gate',
    script:
      'Siap Kak! Di IRVITE.ID biaya platform sangat transparan, hanya Flat Rp 3.000/tiket tanpa potongan persentase (untuk event gratis Rp 0). Apakah nantinya Kakak cukup menggunakan E-Ticket QR di HP pengunjung + Free Web Gate Scanner kami, atau membutuhkan produksi Gelang Tiket Fisik (Tyvek/Lanyard QR 300 DPI)?',
  },
  {
    id: 'babak-3',
    badge: 'Babak 3: Closing Data & Aktivasi Katalog H+0',
    title: 'Penerbitan Halaman Event & Rekening Payout H+1',
    script:
      'Mantap Kak, tim kami siap bantu tayangkan halaman penjualan tiket Kakak hari ini! Mohon kirimkan: (1) Poster rasio 16:9, (2) Daftar kategori/tier harga & kuota tiket, serta (3) Nomor rekening resmi EO untuk pencairan dana otomatis H+1 setelah acara selesai.',
  },
];

export default function IrvitePartnershipPage() {
  const [ticketPrice, setTicketPrice] = useState<number>(150000);
  const [ticketQuota, setTicketQuota] = useState<number>(500);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const grossRevenue = ticketPrice * ticketQuota;
  const totalPlatformFee = ticketPrice > 0 ? PLATFORM_FEE * ticketQuota : 0;
  const buyerTotalPerTicket = ticketPrice > 0 ? ticketPrice + PLATFORM_FEE : 0;

  function handleCopyScript(id: string, text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2200);
  }

  return (
    <div className="irv-partner-root">
      <style>{`
        .irv-partner-root {
          min-height: 100vh;
          background-color: #edf4f0;
          color: #13261c;
          font-family: var(--font-plus-jakarta, 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif);
          padding-bottom: 64px;
        }
        .irv-partner-topbar {
          max-width: 1120px;
          margin: 0 auto;
          padding: 28px 24px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .irv-partner-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 16px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(27, 59, 43, 0.14);
          color: #1b3b2b;
          font-size: 0.85rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.18s ease;
        }
        .irv-partner-back:hover {
          background: #1b3b2b;
          color: #ffffff;
        }
        .irv-partner-container {
          max-width: 1120px;
          margin: 0 auto;
          padding: 12px 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .irv-partner-hero {
          background: #ffffff;
          border-radius: 24px;
          padding: 34px;
          border: 1px solid rgba(27, 59, 43, 0.12);
          box-shadow: 0 14px 34px -16px rgba(17, 38, 28, 0.1);
        }
        .irv-partner-grid3 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 18px;
          margin-top: 24px;
        }
        .irv-partner-card {
          background: #f4f8f5;
          border: 1px solid #d8e5de;
          border-radius: 18px;
          padding: 22px;
        }
        .irv-partner-btn-primary {
          background: #1b3b2b;
          color: #ffffff;
          padding: 12px 22px;
          border-radius: 999px;
          font-size: 0.88rem;
          font-weight: 700;
          text-decoration: none;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .irv-partner-btn-primary:hover {
          background: #11261b;
        }
        .irv-partner-btn-secondary {
          background: #edf4f0;
          color: #1b3b2b;
          padding: 12px 20px;
          border-radius: 999px;
          font-size: 0.86rem;
          font-weight: 700;
          text-decoration: none;
          border: 1px solid rgba(27, 59, 43, 0.2);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>

      <header className="irv-partner-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/gateway" className="irv-partner-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Kembali ke Beranda Utama
          </Link>
          <img src="/irvite-logo.png" alt="IRVITE.ID" style={{ height: '38px', width: 'auto' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link href="/tiket" className="irv-partner-btn-secondary">
            Lihat Katalog Event
          </Link>
          <Link href="/dashboard" className="irv-partner-btn-primary">
            Buka Panel Organizer
          </Link>
        </div>
      </header>

      <main className="irv-partner-container">
        {/* Hero Section (Exact Match with Prototype Section 4) */}
        <section className="irv-partner-hero">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ maxWidth: '640px' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#1b3b2b',
                  background: '#edf4f0',
                  padding: '5px 12px',
                  borderRadius: '999px',
                  display: 'inline-block',
                  marginBottom: '10px',
                }}
              >
                Layanan Penyelenggara Event (EO Partnership)
              </span>
              <h1 style={{ fontSize: 'clamp(1.55rem, 2.6vw, 2.15rem)', fontWeight: 800, margin: '0 0 10px' }}>
                Solusi Kemitraan EO &amp; Jual Tiket Event Terpadu
              </h1>
              <p style={{ margin: 0, color: '#4e6659', fontSize: '0.94rem', lineHeight: 1.6 }}>
                Platform lengkap untuk konser musik, festival, seminar, workshop, dan pertunjukan. Mulai dari manajemen multi-tier tiket online, Free Web Gate Scanner, produksi tiket gelang fisik (wristband), hingga pencairan dana kilat H+1.
              </p>
            </div>

            <a
              href="https://wa.me/6281288997711?text=Halo%20Tim%20Kemitraan%20IRVITE.ID,%20saya%20ingin%20mendaftarkan%20event%20baru"
              target="_blank"
              rel="noreferrer"
              className="irv-partner-btn-primary"
            >
              Daftarkan Event Anda via WhatsApp
            </a>
          </div>

          <div className="irv-partner-grid3">
            <div className="irv-partner-card">
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1b3b2b', marginBottom: '6px' }}>
                1. Fee Flat Transparan
              </div>
              <h2 style={{ fontSize: '1.22rem', fontWeight: 800, margin: '0 0 8px', color: '#11241a' }}>
                Hanya Rp 3.000 / Tiket
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#526b5e', margin: 0, lineHeight: 1.55 }}>
                Tanpa potongan persentase yang membebani EO. Event gratis Rp 0 biaya platform. Dana penjualan tiket dicairkan otomatis H+1 setelah acara selesai.
              </p>
            </div>

            <div className="irv-partner-card">
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1b3b2b', marginBottom: '6px' }}>
                2. Scanner Gate Web Kamera
              </div>
              <h2 style={{ fontSize: '1.22rem', fontWeight: 800, margin: '0 0 8px', color: '#11241a' }}>
                Tanpa Sewa Alat Scanner
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#526b5e', margin: 0, lineHeight: 1.55 }}>
                Panitia cukup membuka halaman Gate Scanner di smartphone atau webcam laptop masing-masing. Validasi QR kilat 0,2 detik dan anti-duplikasi otomatis.
              </p>
            </div>

            <div className="irv-partner-card">
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1b3b2b', marginBottom: '6px' }}>
                3. Opsi Gelang Tiket Fisik &amp; Laporan
              </div>
              <h2 style={{ fontSize: '1.22rem', fontWeight: 800, margin: '0 0 8px', color: '#11241a' }}>
                Ekspor ZIP Gelang 300 DPI
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#526b5e', margin: 0, lineHeight: 1.55 }}>
                Pantau grafik penjualan real-time di Dashboard dan unduh paket file vektor QR 300 DPI siap cetak untuk gelang tiket fisik Tyvek maupun kain lanyard.
              </p>
            </div>
          </div>
        </section>

        {/* Kalkulator Simulasi Pendapatan & Payout H+1 */}
        <section className="irv-partner-hero">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px' }}>
            Simulasi Transparansi Pendapatan &amp; Payout EO (H+1)
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#526b5e', margin: '0 0 20px' }}>
            Hitung estimasi dana bersih yang diterima penyelenggara acara tanpa potongan tersembunyi.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                Harga Tiket EO (Rp)
              </label>
              <input
                type="number"
                min={0}
                step={5000}
                value={ticketPrice}
                onChange={(e) => setTicketPrice(Math.max(0, Number(e.target.value) || 0))}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #cfe0d6',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                Target Kuota Terjual (Tiket)
              </label>
              <input
                type="number"
                min={1}
                value={ticketQuota}
                onChange={(e) => setTicketQuota(Math.max(1, Number(e.target.value) || 1))}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #cfe0d6',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ background: '#f4f8f5', padding: '14px 18px', borderRadius: '14px', border: '1px solid #d5e4dc' }}>
              <div style={{ fontSize: '0.75rem', color: '#567062', fontWeight: 700 }}>
                Harga Dibayar Pembeli / Tiket
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1b3b2b', marginTop: '2px' }}>
                {formatRp(buyerTotalPerTicket)}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#567062' }}>
                (Termasuk Fee IRVITE {formatRp(ticketPrice > 0 ? PLATFORM_FEE : 0)})
              </div>
            </div>

            <div style={{ background: '#1b3b2b', color: '#ffffff', padding: '14px 18px', borderRadius: '14px' }}>
              <div style={{ fontSize: '0.75rem', color: '#d4af37', fontWeight: 800, textTransform: 'uppercase' }}>
                Total Payout Bersih ke EO (100%)
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px' }}>
                {formatRp(grossRevenue)}
              </div>
              <div style={{ fontSize: '0.74rem', opacity: 0.85 }}>
                Fee Platform IRVITE: {formatRp(totalPlatformFee)}
              </div>
            </div>
          </div>
        </section>

        {/* SOP 3 Babak Onboarding WhatsApp EO */}
        <section className="irv-partner-hero">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px' }}>
            SOP 3 Babak Kemitraan EO via WhatsApp
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#526b5e', margin: '0 0 18px' }}>
            Alur standar tim kemitraan IRVITE.ID dalam melayani dan menayangkan event penyelenggara secara cepat di hari yang sama.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {SOP_BABAK.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#f7faf8',
                  border: '1px solid #d8e5de',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ maxWidth: '760px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8c6224', textTransform: 'uppercase' }}>
                    {item.badge}
                  </span>
                  <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#13261c', margin: '3px 0 6px' }}>
                    {item.title}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#4d6658', lineHeight: 1.55 }}>
                    &ldquo;{item.script}&rdquo;
                  </p>
                </div>

                <button
                  type="button"
                  className="irv-partner-btn-primary"
                  onClick={() => handleCopyScript(item.id, item.script)}
                  style={{ padding: '9px 16px', fontSize: '0.8rem' }}
                >
                  {copiedId === item.id ? 'Tersalin ke Clipboard' : 'Salin Template Chat'}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
