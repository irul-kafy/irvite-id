'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function IconArrowUpRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1B3B2E"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17L17 7M8 7h9v9" />
    </svg>
  );
}

export function HomeGatewayClient() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash;
      if (
        hash === '#cara-kerja' ||
        hash === '#paket' ||
        hash === '#katalog' ||
        hash === '#alur'
      ) {
        router.replace(`/undangan${hash}`);
      }
    }
  }, [router]);

  return (
    <div
      className="irv-landing-gateway"
      data-canvas-width="1440"
      data-canvas-height="960"
      data-document-role="page"
      data-label="Landing IRVITE.ID"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .irv-landing-gateway {
          box-sizing: border-box;
          height: 100vh;
          min-height: 100vh;
          width: 100%;
          background: #EDF3EF;
          background-image: radial-gradient(
            ellipse 60% 40% at 50% 0%,
            #F7FAF8 0%,
            rgba(237, 243, 239, 0) 70%
          );
          padding: clamp(16px, 2.8vh, 36px) clamp(16px, 3vw, 32px) clamp(10px, 1.8vh, 20px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: clamp(12px, 2.2vh, 26px);
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          color: #17251E;
          overflow: hidden;
        }

        .irv-landing-gateway__header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: clamp(6px, 1vh, 12px);
          text-align: center;
          max-width: 640px;
        }

        .irv-landing-gateway__logo {
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 500;
          font-size: clamp(38px, 5.5vw, 64px);
          line-height: 1;
          letter-spacing: -0.03em;
          color: #1F1F1F;
        }

        .irv-landing-gateway__logo span {
          color: #C4A574;
        }

        .irv-landing-gateway__title {
          margin: 0;
          font-size: clamp(20px, 2.8vw, 30px);
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #17251E;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        .irv-landing-gateway__subtitle {
          margin: 0;
          font-size: clamp(13px, 1.6vw, 16px);
          line-height: 1.5;
          color: #41574B;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          max-width: 580px;
        }

        .irv-landing-gateway__cards {
          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: center;
          gap: clamp(14px, 2vw, 24px);
          width: 100%;
          max-width: 780px;
        }

        .irv-landing-gateway__card {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          flex: 1 1 0;
          min-width: 0;
          max-width: 375px;
          aspect-ratio: 1 / 1.08;
          height: auto;
          max-height: 48vh;
          box-sizing: border-box;
          border-radius: 24px;
          padding: clamp(18px, 2.4vh, 26px);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          gap: clamp(8px, 1.5vh, 16px);
          color: #F4F1E8;
          box-shadow: 0 18px 40px -28px rgba(15, 36, 27, 0.6);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .irv-landing-gateway__card--etiket {
          background: #15302A;
        }

        .irv-landing-gateway__card--undangan {
          background: #2A3A30;
        }

        .irv-landing-gateway__card:hover {
          transform: translateY(-5px);
          box-shadow: 0 28px 52px -26px rgba(15, 36, 27, 0.65);
        }

        .irv-landing-gateway__bgimg {
          position: absolute;
          inset: 0;
          z-index: -2;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
        }

        .irv-landing-gateway__overlay--etiket {
          position: absolute;
          inset: 0;
          z-index: -1;
          background: linear-gradient(
            to top,
            rgba(10, 26, 19, 0.95) 0%,
            rgba(10, 26, 19, 0.72) 26%,
            rgba(10, 26, 19, 0) 52%
          );
        }

        .irv-landing-gateway__overlay--undangan {
          position: absolute;
          inset: 0;
          z-index: -1;
          background: linear-gradient(
            to top,
            rgba(10, 26, 19, 0.95) 0%,
            rgba(10, 26, 19, 0.78) 32%,
            rgba(10, 26, 19, 0) 58%
          );
        }

        .irv-landing-gateway__card-copy {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .irv-landing-gateway__card-title {
          margin: 0;
          font-size: clamp(21px, 2.7vh, 25px);
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: #FFFFFF;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        .irv-landing-gateway__card-desc {
          margin: 0;
          font-size: clamp(13px, 1.6vh, 14.5px);
          line-height: 1.5;
          color: #E3EAE5;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        .irv-landing-gateway__actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px 18px;
        }

        .irv-landing-gateway__btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 40px;
          padding: 0 20px;
          border-radius: 999px;
          background: #D9BC8A;
          color: #1B3B2E;
          font-size: 13.5px;
          font-weight: 700;
          text-decoration: none;
          transition: gap 0.2s ease, filter 0.2s ease;
        }

        .irv-landing-gateway__btn:hover {
          gap: 12px;
          filter: brightness(1.07);
        }

        .irv-landing-gateway__link {
          display: flex;
          align-items: center;
          min-height: 40px;
          font-size: 13.5px;
          font-weight: 700;
          color: #F1DDB8;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .irv-landing-gateway__link:hover {
          color: #FFFFFF;
          text-decoration: underline;
        }

        .irv-landing-gateway__btn:focus-visible,
        .irv-landing-gateway__link:focus-visible {
          outline: 3px solid #F1DDB8;
          outline-offset: 3px;
        }

        .irv-landing-gateway__card-top-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 999px;
          background: rgba(217, 188, 138, 0.16);
          border: 1px solid rgba(217, 188, 138, 0.45);
          color: #F1DDB8;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          width: fit-content;
          margin-bottom: auto;
        }

        .irv-landing-gateway__btn--disabled {
          background: rgba(217, 188, 138, 0.3);
          color: rgba(27, 59, 46, 0.75);
          cursor: not-allowed;
          pointer-events: none;
          box-shadow: none;
        }

        .irv-landing-gateway__link--disabled {
          color: rgba(241, 221, 184, 0.5);
          cursor: not-allowed;
          pointer-events: none;
        }

        .irv-landing-gateway__footer {
          font-size: 12px;
          color: #41574B;
          text-align: center;
        }

        @media (max-width: 560px) {
          .irv-landing-gateway {
            height: auto;
            min-height: 100vh;
            overflow-y: auto;
            padding: 36px 16px 24px;
            gap: 20px;
            justify-content: flex-start;
          }
          .irv-landing-gateway__cards {
            flex-direction: column;
            max-width: 380px;
            gap: 16px;
          }
          .irv-landing-gateway__card {
            height: auto;
            min-height: 290px;
            flex: none;
            padding: 20px;
          }
        }
      `}</style>

      <div className="irv-landing-gateway__header">
        <div className="irv-landing-gateway__logo">
          IRVITE<span>.ID</span>
        </div>
        <h1 className="irv-landing-gateway__title">Selamat Datang di IRVITE</h1>
        <p className="irv-landing-gateway__subtitle">
          Platform e-tiket dan undangan digital untuk berbagai acara. Silakan
          pilih layanan yang ingin kamu gunakan.
        </p>
      </div>

      <div
        className="irv-landing-gateway__cards"
        role="navigation"
        aria-label="Menu Utama IRVITE"
      >
        {/* E-TIKET (NON-AKTIF / SEGERA HADIR) */}
        <div className="irv-landing-gateway__card irv-landing-gateway__card--etiket" style={{ cursor: 'default' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="irv-landing-gateway__bgimg"
            src="/images/gateway-etiket.jpg"
            alt=""
          />
          <div className="irv-landing-gateway__overlay--etiket" />

          <div className="irv-landing-gateway__card-top-badge">
            <span style={{ fontSize: '8px' }}>●</span>
            <span>Segera Hadir</span>
          </div>

          <div className="irv-landing-gateway__card-copy">
            <h2 className="irv-landing-gateway__card-title">E-Tiket</h2>
            <p className="irv-landing-gateway__card-desc">
              Cari event yang ingin kamu tonton dan terima tiket digital
              langsung di ponselmu.
            </p>
          </div>

          <div className="irv-landing-gateway__actions">
            <div
              id="gw-card-beli-tiket"
              className="irv-landing-gateway__btn irv-landing-gateway__btn--disabled"
              aria-disabled="true"
            >
              <span>Segera Hadir</span>
            </div>
            {/* Tombol 'Daftarkan Event' disembunyikan selagi E-Tiket 'Segera Hadir' */}
          </div>
        </div>

        {/* UNDANGAN + BUKU TAMU */}
        <div className="irv-landing-gateway__card irv-landing-gateway__card--undangan">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="irv-landing-gateway__bgimg"
            src="/images/gateway-undangan.jpg"
            alt=""
          />
          <div className="irv-landing-gateway__overlay--undangan" />

          <div className="irv-landing-gateway__card-copy">
            <h2 className="irv-landing-gateway__card-title">
              Undangan &amp; Buku Tamu Digital
            </h2>
            <p className="irv-landing-gateway__card-desc">
              Buat undangan dengan tema eksklusif, lengkap dengan buku tamu
              untuk kehadiran dan ucapan.
            </p>
          </div>

          <div className="irv-landing-gateway__actions">
            <Link
              id="gw-card-undangan"
              className="irv-landing-gateway__btn"
              href="/undangan"
            >
              <span>Buat Undangan</span>
              <IconArrowUpRight />
            </Link>
          </div>
        </div>
      </div>

      <div className="irv-landing-gateway__footer">© IRVITE.ID</div>
    </div>
  );
}
