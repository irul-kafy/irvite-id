'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatRupiah, PLATFORM_FEE_PER_TICKET } from '@/lib/ticketing-store';

export default function ClientPartnershipPage() {
  const [ticketPrice, setTicketPrice] = useState<number>(150000);
  const [estimatedSold, setEstimatedSold] = useState<number>(300);
  const [feeBearer, setFeeBearer] = useState<'buyer' | 'organizer'>('buyer');
  const [currentLang, setCurrentLang] = useState<'id' | 'en'>('id');
  const [langDropdownOpen, setLangDropdownOpen] = useState<boolean>(false);

  // Inquiry Form State
  const [orgName, setOrgName] = useState<string>('');
  const [eventName, setEventName] = useState<string>('');
  const [expectedAudience, setExpectedAudience] = useState<string>('300 - 500 orang');
  const [contactWhatsapp, setContactWhatsapp] = useState<string>('');

  const grossTicketSales = ticketPrice * estimatedSold;
  const totalPlatformFee = ticketPrice > 0 ? PLATFORM_FEE_PER_TICKET * estimatedSold : 0;
  const netOrganizerPayout =
    feeBearer === 'buyer' ? grossTicketSales : Math.max(0, grossTicketSales - totalPlatformFee);
  const buyerCheckoutPrice =
    feeBearer === 'buyer' && ticketPrice > 0 ? ticketPrice + PLATFORM_FEE_PER_TICKET : ticketPrice;

  function handleInquirySubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = encodeURIComponent(
      `Halo Tim Partnership IRVITE.ID,\n\nSaya ingin mengajukan kerjasama pembukaan penjualan tiket event:\n` +
        `• Penyelenggara: ${orgName.trim() || '-'}\n` +
        `• Nama Event: ${eventName.trim() || '-'}\n` +
        `• Estimasi Penonton: ${expectedAudience}\n` +
        `• WhatsApp Kontak: ${contactWhatsapp.trim() || '-'}\n\n` +
        `Mohon informasi langkah pendaftaran dan pembuatan halaman event kami. Terima kasih!`,
    );
    window.open(`https://wa.me/6281234567890?text=${message}`, '_blank');
  }

  return (
    <div
      className="irv-part-root"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8faf9',
        color: '#0f172a',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .irv-part-root,
        .irv-part-root h1,
        .irv-part-root h2,
        .irv-part-root h3,
        .irv-part-root p {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
        .irv-part-container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding-left: clamp(1rem, 3.2vw, 2.5rem);
          padding-right: clamp(1rem, 3.2vw, 2.5rem);
          box-sizing: border-box;
        }
        /* Top Micro-Bar (Slim Top Switcher) */
        .irv-part-top-microbar {
          background: #ffffff;
          border-bottom: 1px solid #e8edf3;
          font-size: 0.78rem;
          min-height: 34px;
        }
        .irv-part-top-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 34px;
          padding-top: 0.2rem;
          padding-bottom: 0.2rem;
        }
        .irv-part-top-tabs {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .irv-part-top-tab {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.65rem;
          border-radius: 6px;
          color: #475569;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.78rem;
          transition: all 0.15s ease;
        }
        .irv-part-top-tab:hover {
          color: #0d253f;
          background: #f1f5f9;
        }
        .irv-part-top-tab.is-active {
          color: #0d253f;
          font-weight: 800;
          background: #eef4ff;
        }
        /* Main Navbar */
        .irv-part-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.25rem;
          padding-top: 0.85rem;
          padding-bottom: 0.85rem;
        }
        .irv-header-logo-img {
          height: 22px;
          width: auto;
          object-fit: contain;
          display: block;
        }
        .irv-part-nav-links {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .irv-part-nav-link {
          color: #334155;
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 600;
          transition: color 0.15s ease;
        }
        .irv-part-nav-link:hover {
          color: #0d253f;
        }
        /* 3-Column Pillar Cards */
        .irv-part-pillars-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.5rem;
        }
        /* 2-Column Calculator & Steps Grid */
        .irv-part-calc-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(320px, 1fr);
          gap: 1.75rem;
        }
        @media (max-width: 1024px) {
          .irv-part-pillars-grid {
            grid-template-columns: 1fr;
          }
          .irv-part-calc-grid {
            grid-template-columns: 1fr;
          }
          .irv-part-nav-links {
            display: none;
          }
        }
        @media (max-width: 767px) {
          .irv-header-logo-img {
            height: 18px;
          }
          .irv-part-top-inner {
            flex-wrap: wrap;
            gap: 0.25rem;
            padding-top: 0.35rem;
            padding-bottom: 0.35rem;
          }
          .irv-part-top-badge {
            display: none !important;
          }
        }
      `}</style>

      {/* 1. TOP SLIM MICRO-BAR (Switch between Tiket Event, Undangan Pernikahan, and Pusat Penyelenggara EO) */}
      <div className="irv-part-top-microbar">
        <div className="irv-part-container irv-part-top-inner">
          {/* Left: Dual Switch Tabs (Tiket Event & Undangan Pernikahan) */}
          <div className="irv-part-top-tabs">
            <Link href="/tiket" className="irv-part-top-tab">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 0 0 5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.5a2.5 2.5 0 0 0 0-5V7z" />
              </svg>
              <span>{currentLang === 'id' ? 'Tiket Event' : 'Event Tickets'}</span>
            </Link>

            <Link href="/undangan" className="irv-part-top-tab">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>{currentLang === 'id' ? 'Undangan Pernikahan' : 'Wedding Invitation'}</span>
            </Link>
          </div>

          {/* Right: Active Organizer Tag */}
          <div
            className="irv-part-top-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#1b3b2b',
              fontWeight: 800,
              fontSize: '0.74rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '999px', background: '#16a34a' }} />
            <span>{currentLang === 'id' ? 'Pusat Penyelenggara / EO' : 'Organizer Center / EO'}</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER (Logo + Nav Links + Language + Masuk Panel Organizer + Buat Event) */}
      <header
        style={{
          width: '100%',
          background: '#ffffff',
          borderBottom: '1px solid #e8edf3',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div className="irv-part-container irv-part-header-inner">
          {/* Left: Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link href="/partnership" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <img
                src="/irvite-logo.png"
                alt="IRVITE.ID"
                className="irv-header-logo-img"
              />
            </Link>

            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                color: '#64748b',
                background: '#f1f5f9',
                padding: '0.24rem 0.6rem',
                borderRadius: '999px',
                border: '1px solid #e2e8f0',
              }}
            >
              FOR ORGANIZERS
            </span>
          </div>

          {/* Center Nav Links (Desktop) */}
          <nav className="irv-part-nav-links" aria-label="Navigasi Kemitraan">
            <a href="#fitur" className="irv-part-nav-link">
              {currentLang === 'id' ? 'Solusi Ticketing' : 'Solutions'}
            </a>
            <a href="#simulasi" className="irv-part-nav-link">
              {currentLang === 'id' ? 'Simulasi Pendapatan' : 'Pricing Simulator'}
            </a>
            <a href="#alur" className="irv-part-nav-link">
              {currentLang === 'id' ? 'Alur Kerjasama' : 'Workflow'}
            </a>
            <a href="#form-daftar" className="irv-part-nav-link">
              {currentLang === 'id' ? 'Daftar Event' : 'Register Event'}
            </a>
          </nav>

          {/* Right Actions: Language Switcher + Masuk Panel Organizer (Web Admin) + Buat Event CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Language Selector (Strictly 2 Languages: ID & EN) */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setLangDropdownOpen((prev) => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: '#0d253f',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: 'transparent',
                  border: 'none',
                  padding: '0.3rem 0.4rem',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d253f" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <path d="M12 3a14.5 14.5 0 0 1 0 18 14.5 14.5 0 0 1 0-18" />
                </svg>
                <span>{currentLang.toUpperCase()}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0d253f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {langDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '0.35rem',
                    background: '#ffffff',
                    borderRadius: '10px',
                    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.15)',
                    border: '1px solid #e2e8f0',
                    padding: '0.35rem',
                    minWidth: '160px',
                    zIndex: 100,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentLang('id');
                      setLangDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: currentLang === 'id' ? '#f1f5f9' : 'transparent',
                      color: '#0d253f',
                      fontWeight: currentLang === 'id' ? 800 : 600,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>🇮🇩 Indonesia</span>
                    {currentLang === 'id' && <span style={{ color: '#1b3b2b', fontWeight: 900 }}>✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentLang('en');
                      setLangDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: currentLang === 'en' ? '#f1f5f9' : 'transparent',
                      color: '#0d253f',
                      fontWeight: currentLang === 'en' ? 800 : 600,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>🇬🇧 English</span>
                    {currentLang === 'en' && <span style={{ color: '#1b3b2b', fontWeight: 900 }}>✓</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Masuk Panel Organizer (Dedicated Creator Access - Web Admin) */}
            <a
              href="https://irvite-admin.vercel.app/login"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.54rem 1rem',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#0d253f',
                fontSize: '0.84rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              <span>{currentLang === 'id' ? 'Masuk Panel EO' : 'Organizer Login'}</span>
            </a>

            {/* Buat Event CTA */}
            <a
              href="#form-daftar"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.54rem 1.15rem',
                borderRadius: '8px',
                border: 'none',
                background: '#1b3b2b',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(27, 59, 43, 0.2)',
              }}
            >
              <span>{currentLang === 'id' ? 'Buat Event' : 'Create Event'}</span>
            </a>
          </div>
        </div>
      </header>

      {/* MAIN BODY CONTENT */}
      <main className="irv-part-container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
        {/* 1. HERO SECTION (B2B Value Proposition) */}
        <section
          style={{
            background: 'linear-gradient(135deg, #0f2419 0%, #1b3b2b 55%, #2d5a43 100%)',
            borderRadius: '24px',
            padding: ' clamp(2rem, 4.5vw, 3.5rem) clamp(1.5rem, 3.8vw, 3.2rem)',
            color: '#ffffff',
            marginBottom: '3rem',
            boxShadow: '0 20px 48px rgba(15, 36, 25, 0.16)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Stage Lighting Atmosphere */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-20%',
              right: '-10%',
              width: '450px',
              height: '450px',
              background: 'radial-gradient(circle, rgba(245, 196, 67, 0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ maxWidth: '820px', position: 'relative', zIndex: 2 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.32rem 0.85rem',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#f5c443',
                fontSize: '0.76rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '1rem',
              }}
            >
              <span>✦</span>
              <span>{currentLang === 'id' ? 'Kemitraan Event Organizer & Promotor' : 'Event Organizer & Promoter Partnership'}</span>
            </div>

            <h1
              style={{
                margin: '0 0 1rem 0',
                fontSize: 'clamp(1.9rem, 3.6vw, 2.85rem)',
                fontWeight: 900,
                letterSpacing: '-0.025em',
                lineHeight: 1.18,
                color: '#ffffff',
              }}
            >
              {currentLang === 'id'
                ? 'Semua Kebutuhan Penjualan Tiket & Operasional Acara dalam Satu Ekosistem'
                : 'All Event Ticketing & Venue Operations in One Seamless Ecosystem'}
            </h1>

            <p
              style={{
                margin: '0 0 1.85rem 0',
                fontSize: 'clamp(0.92rem, 1.4vw, 1.08rem)',
                color: '#e2efe8',
                lineHeight: 1.6,
                maxWidth: '720px',
              }}
            >
              {currentLang === 'id'
                ? 'Kelola penjualan tiket online instan dengan QRIS & Virtual Account, validasi check-in via smartphone panitia di gerbang masuk, hingga cetak tiket gelang fisik barcode 300 DPI. Tanpa biaya tersembunyi, transparan, dan pencairan dana H+1.'
                : 'Manage online ticket sales with instant QRIS & Virtual Accounts, gate validation via smartphone, and 300 DPI barcode wristband production. Zero hidden fees, fully transparent, with next-day settlement.'}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
              <a
                href="#form-daftar"
                style={{
                  padding: '0.85rem 1.65rem',
                  borderRadius: '12px',
                  background: '#f5c443',
                  color: '#0f2419',
                  fontWeight: 900,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(245, 196, 67, 0.35)',
                }}
              >
                {currentLang === 'id' ? 'Mulai Buat Event Sekarang' : 'Start Your Event Now'}
              </a>

              <a
                href="https://wa.me/6281234567890?text=Halo%20Tim%20Partnership%20IRVITE.ID,%20saya%20ingin%20konsultasi%20pembukaan%20tiket%20event."
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.85rem 1.45rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1.5px solid rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                }}
              >
                <span>{currentLang === 'id' ? 'Konsultasi via WhatsApp' : 'Chat with Partner Team'}</span>
                <span style={{ fontSize: '1rem' }}>→</span>
              </a>
            </div>
          </div>
        </section>

        {/* 2. THREE CORE VALUE PILLARS (Clean SVG Cards) */}
        <section id="fitur" style={{ marginBottom: '3.5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 2.25rem' }}>
            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 800,
                color: '#1b3b2b',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {currentLang === 'id' ? 'FITUR EKOSISTEM UNGGULAN' : 'CORE ECOSYSTEM FEATURES'}
            </span>
            <h2
              style={{
                margin: '0.4rem 0 0.6rem 0',
                fontSize: 'clamp(1.5rem, 2.5vw, 1.95rem)',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.02em',
              }}
            >
              {currentLang === 'id'
                ? 'Solusi Lengkap untuk Segala Skala Acara'
                : 'Engineered for Concerts, Seminars, & Festivals'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.92rem', color: '#64748b' }}>
              {currentLang === 'id'
                ? 'Dirancang agar panitia fokus pada kesuksesan panggung tanpa terbebani kerumitan teknis tiket.'
                : 'Designed so organizers can focus on production without technical friction.'}
            </p>
          </div>

          <div className="irv-part-pillars-grid">
            {/* Pillar 1: Multi-Tier Online Ticketing */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '1.85rem',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#edf4f0',
                    color: '#1b3b2b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>

                <h3 style={{ margin: '0 0 0.65rem 0', fontSize: '1.18rem', fontWeight: 800, color: '#0f172a' }}>
                  {currentLang === 'id' ? 'Penjualan Tiket & Multi-Tier Otomatis' : 'Automated Multi-Tier Ticketing'}
                </h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.55 }}>
                  {currentLang === 'id'
                    ? 'Dukungan tiket Presale 1, Presale 2, Reguler, hingga VIP Deck dengan pembatasan kuota otomatis. Pembeli membayar langsung via QRIS dan Virtual Account instan.'
                    : 'Manage Early Bird, Presale, and VIP passes with automatic quota control. Direct instant payments via QRIS & Virtual Accounts.'}
                </p>
              </div>

              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1b3b2b' }}>
                ✓ {currentLang === 'id' ? 'E-Ticket QR otomatis terkirim ke WhatsApp & Email' : 'Auto-delivered QR pass via WhatsApp & Email'}
              </div>
            </div>

            {/* Pillar 2: Mobile Gate Scanner */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '1.85rem',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#edf4f0',
                    color: '#1b3b2b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                    <rect x="7" y="7" width="10" height="10" rx="1" />
                  </svg>
                </div>

                <h3 style={{ margin: '0 0 0.65rem 0', fontSize: '1.18rem', fontWeight: 800, color: '#0f172a' }}>
                  {currentLang === 'id' ? 'Mobile Gate Scanner Tanpa Sewa Alat' : 'Smartphone Gate Check-In Scanner'}
                </h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.55 }}>
                  {currentLang === 'id'
                    ? 'Staf gerbang cukup memakai kamera smartphone untuk scan tiket penonton. Sistem mendeteksi tiket valid, tiket palsu, dan langsung memblokir tiket yang sudah pernah masuk.'
                    : 'Staff can scan attendees using any smartphone camera. Real-time validation prevents double-entry and forged tickets.'}
                </p>
              </div>

              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1b3b2b' }}>
                ✓ {currentLang === 'id' ? 'Bisa dipakai multi-staf secara bersamaan di banyak pintu' : 'Multi-staff concurrent check-in across gates'}
              </div>
            </div>

            {/* Pillar 3: Physical Wristband Printing */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '1.85rem',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: '#edf4f0',
                    color: '#1b3b2b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="6" cy="6" r="3" />
                    <circle cx="6" cy="18" r="3" />
                    <line x1="20" y1="4" x2="8.12" y2="15.88" />
                    <line x1="14.47" y1="14.48" x2="20" y2="20" />
                    <line x1="8.12" y1="8.12" x2="12" y2="12" />
                  </svg>
                </div>

                <h3 style={{ margin: '0 0 0.65rem 0', fontSize: '1.18rem', fontWeight: 800, color: '#0f172a' }}>
                  {currentLang === 'id' ? 'Tiket Gelang Fisik (Wristband 300 DPI)' : 'Physical 300 DPI Event Wristbands'}
                </h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.55 }}>
                  {currentLang === 'id'
                    ? 'Ekosistem terintegrasi untuk produksi tiket gelang Tyvek anti-air, Lanyard VIP, dan Thermal Bracelet dengan barcode/QR presisi tinggi untuk penukaran tiket di hari-H.'
                    : 'Integrated waterproof Tyvek, VIP Lanyards, and Thermal wristband production with high-resolution serial barcodes.'}
                </p>
              </div>

              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1b3b2b' }}>
                ✓ {currentLang === 'id' ? 'File vektor siap cetak & opsi cetak terima beres' : 'Ready-to-print vector files and full production'}
              </div>
            </div>
          </div>
        </section>

        {/* 3. REVENUE SIMULATOR & STEP WORKFLOW GRID */}
        <div id="simulasi" className="irv-part-calc-grid" style={{ marginBottom: '3.5rem' }}>
          {/* Left: Interactive Revenue & Payout Calculator */}
          <section
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '2rem',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#1b3b2b',
                  background: '#edf4f0',
                  padding: '0.28rem 0.65rem',
                  borderRadius: '999px',
                  marginBottom: '0.45rem',
                }}
              >
                {currentLang === 'id' ? 'SIMULATOR PENDAPATAN EO' : 'REVENUE ESTIMATOR'}
              </span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                {currentLang === 'id' ? 'Hitung Estimasi Pencairan Dana Acara Anda' : 'Calculate Your Ticket Revenue Payout'}
              </h2>
            </div>

            <div style={{ display: 'grid', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {currentLang === 'id' ? 'Harga Tiket per Orang (Rp)' : 'Ticket Price (IDR)'}
                </label>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(Math.max(0, Number(e.target.value) || 0))}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.95rem',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '1rem',
                    fontWeight: 700,
                    boxSizing: 'border-box',
                    color: '#0f172a',
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                    {currentLang === 'id' ? 'Target Tiket Terjual' : 'Target Tickets Sold'}
                  </label>
                  <strong style={{ fontSize: '0.92rem', color: '#1b3b2b' }}>{estimatedSold} Tiket</strong>
                </div>
                <input
                  type="range"
                  min={20}
                  max={3000}
                  step={10}
                  value={estimatedSold}
                  onChange={(e) => setEstimatedSold(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#1b3b2b', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.45rem' }}>
                  {currentLang === 'id' ? 'Skema Biaya Layanan Platform (Rp 3.000 / tiket)' : 'Platform Fee Allocation (IDR 3,000 / ticket)'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                  <button
                    type="button"
                    onClick={() => setFeeBearer('buyer')}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: feeBearer === 'buyer' ? '2px solid #1b3b2b' : '1px solid #cbd5e1',
                      background: feeBearer === 'buyer' ? '#edf4f0' : '#ffffff',
                      color: feeBearer === 'buyer' ? '#1b3b2b' : '#475569',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    {currentLang === 'id' ? 'Ditanggung Pembeli' : 'Charged to Buyer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeeBearer('organizer')}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: feeBearer === 'organizer' ? '2px solid #1b3b2b' : '1px solid #cbd5e1',
                      background: feeBearer === 'organizer' ? '#edf4f0' : '#ffffff',
                      color: feeBearer === 'organizer' ? '#1b3b2b' : '#475569',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    {currentLang === 'id' ? 'Diserap Panitia (All-In)' : 'Absorbed by Organizer'}
                  </button>
                </div>
              </div>

              {/* Calculator Output Breakdown */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '16px',
                  padding: '1.25rem 1.45rem',
                  border: '1.5px solid #e2e8f0',
                  marginTop: '0.5rem',
                }}
              >
                <div style={{ display: 'grid', gap: '0.55rem', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>{currentLang === 'id' ? 'Harga Bayar Penonton:' : 'Buyer Price:'}</span>
                    <strong>{formatRupiah(buyerCheckoutPrice)} / tiket</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>{currentLang === 'id' ? 'Total Penjualan Kotor:' : 'Gross Ticket Sales:'}</span>
                    <strong>{formatRupiah(grossTicketSales)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>{currentLang === 'id' ? 'Total Biaya Platform:' : 'Platform Fee Total:'}</span>
                    <strong>
                      {formatRupiah(totalPlatformFee)} ({feeBearer === 'buyer' ? 'Dibayar Pembeli' : 'Dipotong dari EO'})
                    </strong>
                  </div>
                  <div
                    style={{
                      borderTop: '1.5px dashed #cbd5e1',
                      paddingTop: '0.85rem',
                      marginTop: '0.35rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>
                      {currentLang === 'id' ? 'Estimasi Bersih Diterima EO (H+1):' : 'Net Payout to Organizer (H+1):'}
                    </span>
                    <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1b3b2b' }}>
                      {formatRupiah(netOrganizerPayout)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right: 4-Step Organizer Flow */}
          <section
            id="alur"
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '2rem',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
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
                  marginBottom: '0.45rem',
                }}
              >
                {currentLang === 'id' ? 'ALUR KERJASAMA MUDAH' : '4-STEP ONBOARDING'}
              </span>
              <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                {currentLang === 'id' ? '4 Langkah Mudah Buka Penjualan Tiket' : 'Launch Ticket Sales in 4 Simple Steps'}
              </h2>

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {[
                  {
                    step: '01',
                    title: currentLang === 'id' ? 'Daftarkan Acara & Venue' : 'Submit Event & Venue Details',
                    desc: currentLang === 'id' ? 'Isi nama acara, jadwal, lokasi gedung/stadion, dan nama panitia.' : 'Provide concert date, location, venue, and organizer profile.',
                  },
                  {
                    step: '02',
                    title: currentLang === 'id' ? 'Tentukan Kategori & Kuota Tiket' : 'Configure Ticket Tiers & Pricing',
                    desc: currentLang === 'id' ? 'Atur tier Presale, Reguler, dan VIP sesuai strategi penjualan Anda.' : 'Set tier pricing and inventory quotas for early birds and VIPs.',
                  },
                  {
                    step: '03',
                    title: currentLang === 'id' ? 'Sebarkan Link Penjualan Resmi' : 'Share Official Ticket Link',
                    desc: currentLang === 'id' ? 'Promosikan link resmi ke calon penonton dengan pembayaran instan otomatis.' : 'Publish official ticket sales link across your promotional channels.',
                  },
                  {
                    step: '04',
                    title: currentLang === 'id' ? 'Scan di Lokasi & Dana Cair H+1' : 'Gate Check-In & H+1 Payout',
                    desc: currentLang === 'id' ? 'Validasi tiket penonton via HP dan terima transfer pencairan dana H+1 acara.' : 'Scan attendees seamlessly at the door and receive next-day payout.',
                  },
                ].map((s) => (
                  <div
                    key={s.step}
                    style={{
                      display: 'flex',
                      gap: '0.85rem',
                      padding: '0.75rem 0.95rem',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: '#1b3b2b',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '0.76rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {s.step}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>{s.title}</div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.15rem' }}>{s.desc}</div>
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
                borderRadius: '12px',
                background: '#1b3b2b',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.88rem',
                textDecoration: 'none',
                marginTop: '1.25rem',
              }}
            >
              {currentLang === 'id' ? 'Konsultasi Pembukaan Tiket Sekarang →' : 'Consult with Our Team on WhatsApp →'}
            </a>
          </section>
        </div>

        {/* 4. QUICK INQUIRY REGISTRATION FORM */}
        <section
          id="form-daftar"
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: 'clamp(1.75rem, 3.5vw, 2.75rem)',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 12px 36px rgba(15, 23, 42, 0.05)',
            maxWidth: '780px',
            margin: '0 auto 3rem',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 800,
                color: '#1b3b2b',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {currentLang === 'id' ? 'FORMULIR PENGAJUAN KEMITRAAN' : 'PARTNERSHIP APPLICATION'}
            </span>
            <h2 style={{ margin: '0.35rem 0 0.55rem', fontSize: '1.55rem', fontWeight: 800, color: '#0f172a' }}>
              {currentLang === 'id' ? 'Daftarkan Event Anda Bersama IRVITE' : 'Register Your Event with IRVITE'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
              {currentLang === 'id'
                ? 'Isi formulir ringkas ini, tim kemitraan kami akan segera menghubungi Anda dalam waktu 1x24 jam.'
                : 'Complete this brief form, and our partner team will connect with you within 24 hours.'}
            </p>
          </div>

          <form onSubmit={handleInquirySubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {currentLang === 'id' ? 'Nama Panitia / Organisasi / Komunitas' : 'Organization / Organizer Name'}
              </label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder={currentLang === 'id' ? 'Contoh: BEM Universitas Indonesia / Soundwave Organizer' : 'e.g. Acme Productions'}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.95rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {currentLang === 'id' ? 'Nama Acara / Konser / Seminar' : 'Event Title / Concert Name'}
              </label>
              <input
                type="text"
                required
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder={currentLang === 'id' ? 'Contoh: Jakarta Indie Soundwave Festival 2026' : 'e.g. Jakarta Indie Music Fest 2026'}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.95rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {currentLang === 'id' ? 'Estimasi Jumlah Penonton' : 'Estimated Attendees'}
                </label>
                <select
                  value={expectedAudience}
                  onChange={(e) => setExpectedAudience(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.95rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                >
                  <option value="Di bawah 200 orang">&lt; 200 orang</option>
                  <option value="200 - 500 orang">200 - 500 orang</option>
                  <option value="500 - 1.500 orang">500 - 1.500 orang</option>
                  <option value="1.500 - 5.000 orang">1.500 - 5.000 orang</option>
                  <option value="Lebih dari 5.000 orang">&gt; 5.000 orang (Festival)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {currentLang === 'id' ? 'Nomor WhatsApp Penanggung Jawab' : 'Contact WhatsApp Number'}
                </label>
                <input
                  type="tel"
                  required
                  value={contactWhatsapp}
                  onChange={(e) => setContactWhatsapp(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.95rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.9rem 1.25rem',
                borderRadius: '12px',
                border: 'none',
                background: '#1b3b2b',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                marginTop: '0.5rem',
                boxShadow: '0 4px 14px rgba(27, 59, 43, 0.25)',
              }}
            >
              {currentLang === 'id' ? 'Kirim Pengajuan via WhatsApp Resmi →' : 'Submit Application via Official WhatsApp →'}
            </button>
          </form>
        </section>

        {/* 5. FAQ SECTION */}
        <section style={{ maxWidth: '820px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem' }}>
            {currentLang === 'id' ? 'Pertanyaan Umum Penyelenggara (FAQ)' : 'Frequently Asked Questions (FAQ)'}
          </h2>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {[
              {
                q: currentLang === 'id' ? '1. Kapan dana hasil penjualan tiket dicairkan ke panitia?' : '1. When are ticket sales payouts settled?',
                a: currentLang === 'id' ? 'Pencairan dana penuh langsung ditransfer ke rekening resmi panitia/lembaga pada H+1 setelah seluruh rangkaian acara selesai dengan rekonsiliasi otomatis.' : 'Settlement payouts are transferred to the verified organizer bank account on D+1 after the event completes.',
              },
              {
                q: currentLang === 'id' ? '2. Apakah acara non-komersial / gratis dikenakan biaya?' : '2. Are free or non-commercial events charged any fee?',
                a: currentLang === 'id' ? 'Gratis (Rp 0). Biaya platform Rp 3.000 hanya berlaku untuk tiket berbayar yang berhasil terjual. Event non-komersial bebas biaya.' : 'Zero fee (IDR 0). The flat platform fee of IDR 3,000 only applies to paid tickets sold.',
              },
              {
                q: currentLang === 'id' ? '3. Berapa banyak staf yang bisa memakai scanner tiket di gerbang?' : '3. How many staff can use the gate scanner simultaneously?',
                a: currentLang === 'id' ? 'Tidak terbatas. Anda bisa membagikan akun scanner kepada puluhan staf untuk berjaga di berbagai pintu masuk (VIP, Gate Utama, Festival) tanpa bentrok data.' : 'Unlimited concurrent staff across multiple entrance gates without collision.',
              },
            ].map((faq) => (
              <div
                key={faq.q}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.25rem 1.45rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                  {faq.q}
                </div>
                <div style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.55 }}>
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
          padding: '2rem 0',
          textAlign: 'center',
          fontSize: '0.82rem',
          color: '#64748b',
        }}
      >
        <div className="irv-part-container">
          <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
            IRVITE.ID • Unified Event &amp; Digital Invitation Ecosystem
          </div>
          <div>© 2026 IRVITE. All rights reserved. Platform tiket acara &amp; undangan digital resmi.</div>
        </div>
      </footer>
    </div>
  );
}
