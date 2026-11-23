'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRupiah, PLATFORM_FEE_PER_TICKET } from '@/app/tiket/types';
import { isTicketingEnabled } from '@/config/features';

export default function PartnershipSolusiPage() {
  useEffect(() => {
    if (!isTicketingEnabled()) {
      window.location.replace('/');
    }
  }, []);

  const [ticketPrice, setTicketPrice] = useState<number>(150000);
  const [estimatedSold, setEstimatedSold] = useState<number>(350);

  const grossSales = ticketPrice * estimatedSold;
  const totalFee =
    ticketPrice > 0 ? PLATFORM_FEE_PER_TICKET * estimatedSold : 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--tkt-bg)',
        color: 'var(--tkt-text-primary)',
        paddingBottom: '3.5rem',
      }}
    >
      <style>{`
        .irv-sol-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 clamp(0.75rem, 2.5vw, 2rem);
        }
        .irv-mockup-wrapper {
          background: var(--tkt-surface);
          border: 1px solid var(--tkt-border);
          border-radius: var(--tkt-radius-md);
          padding: 1.35rem;
          box-shadow: var(--tkt-shadow-sm);
        }
        @media (max-width: 767px) {
          .irv-mockup-wrapper {
            padding: 1rem;
          }
        }
      `}</style>

      <header
        style={{
          background: 'var(--tkt-surface)',
          borderBottom: '1px solid var(--tkt-border)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="irv-sol-container"
          style={{
            height: '66px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <Link
            href="/partnership"
            style={{
              fontWeight: 800,
              fontSize: '0.95rem',
              color: 'var(--tkt-text-primary)',
              textDecoration: 'none',
            }}
          >
            Kembali ke ringkasan kerja sama
          </Link>
          <a
            href="/partnership#daftar-event"
            style={{
              padding: '0.5rem 0.95rem',
              borderRadius: 'var(--tkt-radius-sm)',
              background: 'var(--tkt-primary)',
              color: 'var(--tkt-surface)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            Ajukan acara sekarang
          </a>
        </div>
      </header>

      <main className="irv-sol-container" style={{ paddingTop: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.65rem', fontWeight: 800 }}>
          Detail solusi operasional dan simulasi pendapatan
        </h1>
        <p
          style={{
            margin: '0 0 1.75rem 0',
            color: 'var(--tkt-text-secondary)',
            fontSize: '0.92rem',
            lineHeight: 1.55,
          }}
        >
          Rincian tiga pilar layanan penjualan tiket sistem terima beres beserta simulasi perhitungan pendapatan bersih penyelenggara.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem',
          }}
        >
          <article className="irv-mockup-wrapper">
            <h2 style={{ margin: '0 0 0.45rem 0', fontSize: '1.1rem' }}>
              Sistem Ticketing &amp; Pembayaran Otomatis
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '0.88rem',
                color: 'var(--tkt-text-secondary)',
                lineHeight: 1.5,
              }}
            >
              Penjualan tiket multi-kategori dengan konfirmasi pembayaran terverifikasi dan penerbitan kode QR otomatis.
            </p>
          </article>

          <article className="irv-mockup-wrapper">
            <h2 style={{ margin: '0 0 0.45rem 0', fontSize: '1.1rem' }}>
              Scanner Gerbang Masuk via Smartphone Gratis
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '0.88rem',
                color: 'var(--tkt-text-secondary)',
                lineHeight: 1.5,
              }}
            >
              Validasi token kode QR bertanda tangan HMAC secara langsung di server untuk mencegah tiket ganda.
            </p>
          </article>

          <article className="irv-mockup-wrapper">
            <h2 style={{ margin: '0 0 0.45rem 0', fontSize: '1.1rem' }}>
              Tiket Gelang Fisik (Wristband) 300 DPI Tahan Air
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '0.88rem',
                color: 'var(--tkt-text-secondary)',
                lineHeight: 1.5,
              }}
            >
              Dukungan pencetakan gelang penanda penonton dengan kode QR presisi tinggi untuk acara konser dan festival.
            </p>
          </article>
        </div>

        <section className="irv-mockup-wrapper" style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>
            Hitung Estimasi Penjualan &amp; Pencairan Dana Bersih Anda
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              marginTop: '1rem',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '0.3rem',
                }}
              >
                Harga tiket per orang (Rupiah)
              </label>
              <input
                type="number"
                min={0}
                value={ticketPrice}
                onChange={(e) =>
                  setTicketPrice(Math.max(0, Number(e.target.value) || 0))
                }
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--tkt-radius-sm)',
                  border: '1px solid var(--tkt-border-strong)',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '0.3rem',
                }}
              >
                Target tiket terjual
              </label>
              <input
                type="number"
                min={1}
                value={estimatedSold}
                onChange={(e) =>
                  setEstimatedSold(Math.max(1, Number(e.target.value) || 1))
                }
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--tkt-radius-sm)',
                  border: '1px solid var(--tkt-border-strong)',
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: '1.25rem',
              padding: '1rem',
              borderRadius: 'var(--tkt-radius-sm)',
              background: 'var(--tkt-surface-subtle)',
              display: 'grid',
              gap: '0.4rem',
              fontSize: '0.9rem',
            }}
          >
            <div>
              <strong>Pendapatan bersih penyelenggara:</strong>{' '}
              {formatRupiah(grossSales)}
            </div>
            <div>
              <strong>Total biaya layanan platform (dibebankan ke pembeli):</strong>{' '}
              {formatRupiah(totalFee)}
            </div>
          </div>
        </section>

        <section className="irv-mockup-wrapper">
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>
            4 Langkah Mudah dari Pendaftaran hingga Pencairan
          </h2>
          <ol
            style={{
              margin: '0.75rem 0 1.25rem 1.25rem',
              padding: 0,
              color: 'var(--tkt-text-secondary)',
              fontSize: '0.9rem',
              lineHeight: 1.65,
            }}
          >
            <li>Penyelenggara mengirim formulir pengajuan acara di halaman kerja sama.</li>
            <li>Tim IRVITE memverifikasi data dan menyiapkan halaman penjualan tiket.</li>
            <li>Penjualan tiket dibuka untuk umum dan pembayaran diverifikasi otomatis.</li>
            <li>Pemindaian kode QR di gerbang lokasi acara dan pencairan dana penjualan.</li>
          </ol>
          <a
            href="/partnership#daftar-event"
            style={{
              display: 'inline-block',
              padding: '0.65rem 1.15rem',
              borderRadius: 'var(--tkt-radius-sm)',
              background: 'var(--tkt-primary)',
              color: 'var(--tkt-surface)',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
            }}
          >
            Mulai ajukan acara Anda
          </a>
        </section>
      </main>
    </div>
  );
}
