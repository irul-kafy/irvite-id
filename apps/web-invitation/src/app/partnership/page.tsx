'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const PARTNERSHIP_TEXT = {
  ID: {
    navTicketCatalog: 'Katalog Tiket',
    navSolutions: 'Detail Solusi & Fitur',
    loginPanel: 'Masuk Panel EO',
    createEventNow: 'Daftar Event Sekarang',
    badge: 'PARTNERSHIP PENYELENGGARA EVENT • IRVITE.ID',
    heroTitle: 'Semua Kebutuhan Penjualan Tiket & Operasional Acara dalam Satu Ekosistem',
    heroDesc: 'Solusi terpadu untuk konser musik, festival, seminar, dan acara kampus. Dari penjualan tiket online otomatis (QRIS & Virtual Account), scanner gerbang smartphone panitia tanpa sewa alat, tiket gelang fisik 300 DPI tahan air, hingga pencairan dana H+1 acara.',
    consultBtn: 'Konsultasi & Daftarkan Event',
    viewSolutionsBtn: 'Lihat Detail 3 Solusi & Gate Scanner →',
    adminLoginBtn: 'Masuk ke Web Admin EO',
    stats: [
      { title: 'Rp 3.000 Flat', desc: 'Per tiket terjual (Rp 0 untuk event gratis)' },
      { title: 'Settlement H+1', desc: 'Pencairan otomatis ke rekening resmi panitia' },
      { title: '0 Alat Khusus', desc: 'Scan tiket cukup pakai smartphone panitia' },
      { title: '100% Anti-Duplikat', desc: 'Enkripsi QR unik & validasi gate real-time' },
    ],
    // Quick Solutions Section
    solutionsBadge: '3 PILAR UTAMA OPERASIONAL ACARA',
    solutionsTitle: 'Ekosistem Lengkap dari Penjualan Tiket hingga Hari-H Venue',
    solutionsSubtitle: 'Dirancang khusus agar panitia hemat biaya, operasional gerbang cepat, dan penonton nyaman.',
    pillar1Title: '1. Sistem Ticketing & Pembayaran Otomatis',
    pillar1Desc: 'Buka penjualan tiket multi-tier (Early Bird, Presale, VIP) dengan metode pembayaran lengkap QRIS dan Virtual Account. E-ticket QR langsung dikirim otomatis via WhatsApp & Email penonton.',
    pillar1Tags: ['Multi-Tier Kuota', 'QRIS & Virtual Account', 'Pengiriman WhatsApp Instan'],
    pillar2Title: '2. Scanner Gerbang Masuk via Smartphone Gratis',
    pillar2Desc: 'Lupakan biaya sewa alat barcode jutaan rupiah. Staf panitia di pintu masuk cukup menggunakan smartphone masing-masing untuk validasi tiket QR secepat kilat (<0.5 detik).',
    pillar2Tags: ['0 Biaya Sewa Scanner', 'Support Multi-Pintu Masuk', 'Validasi Super Cepat (<0.5 Detik)'],
    pillar3Title: '3. Tiket Gelang Fisik (Wristband) 300 DPI Tahan Air',
    pillar3Desc: 'Untuk konser musik dan festival besar, kami sediakan tiket gelang Tyvek anti-sobek dan Lanyard VIP dengan cetakan barcode presisi 300 DPI siap pakai dan siap kirim ke venue acara Anda.',
    pillar3Tags: ['Bahan Tyvek Anti-Sobek', 'Tahan Air & Keringat', 'Barcode Presisi 300 DPI'],
    exploreSolutionsPrompt: 'Ingin melihat visual mockup e-ticket, tampilan scanner HP panitia, spesifikasi gelang Tyvek, dan kalkulator simulasi keuntungan EO?',
    exploreSolutionsBtn: 'Buka Halaman Detail Solusi & Simulasi Pendapatan →',
    // Quick Inquiry Form
    formBadge: 'KONSULTASI & PENDAFTARAN ACARA',
    formTitle: 'Siap Menjual Tiket Event Anda Hari Ini?',
    formDesc: 'Isi formulir ringkas di bawah. Tim Partnership kami akan langsung menghubungi Anda via WhatsApp dalam waktu kurang dari 15 menit.',
    orgLabel: 'Nama Penyelenggara / Organisasi *',
    orgPlaceholder: 'Contoh: BEM UI / Soundwave Live',
    eventNameLabel: 'Nama Acara *',
    eventNamePlaceholder: 'Contoh: Jazz Night 2026 / AI Summit',
    categoryLabel: 'Kategori Acara',
    categories: [
      { value: 'Konser Musik / Festival', label: 'Konser Musik / Festival' },
      { value: 'Seminar & Edukasi', label: 'Seminar & Edukasi' },
      { value: 'Workshop / Bootcamp', label: 'Workshop / Bootcamp' },
      { value: 'Acara Kampus / Sekolah', label: 'Acara Kampus / Sekolah' },
      { value: 'Olahraga & Komunitas', label: 'Olahraga & Komunitas' },
    ],
    waLabel: 'Nomor WhatsApp Penanggung Jawab *',
    waPlaceholder: 'Contoh: 08123456789',
    attendeeLabel: 'Estimasi Jumlah Penonton',
    attendeeUnit: 'Penonton',
    submitBtn: 'Kirim Pengajuan via WhatsApp Sekarang →',
    // FAQ
    faqBadge: 'FAQ PENYELENGGARA',
    faqTitle: 'Pertanyaan yang Sering Diajukan Event Organizer',
    faqList: [
      {
        q: 'Berapa lama proses pembuatan event sampai link penjualan aktif?',
        a: 'Kurang dari 30 menit! Tim kami akan memverifikasi data acara dan langsung mengaktifkan halaman penjualan resmi di katalog IRVITE.ID lengkap dengan pembayaran QRIS dan Virtual Account.',
      },
      {
        q: 'Apakah ada potongan komisi persentase dari hasil penjualan tiket?',
        a: 'Sama sekali tidak ada komisi persentase. IRVITE.ID menggunakan skema biaya flat Rp 3.000 per tiket berbayar yang terjual. Biaya ini pun fleksibel: bisa dibebankan kepada pembeli saat checkout atau diserap oleh panitia.',
      },
      {
        q: 'Bagaimana jika acara kami gratis (tiket Rp 0) untuk seminar kampus?',
        a: 'Untuk event gratis (tiket Rp 0), biaya platform adalah Rp 0 (100% Gratis). Panitia tetap mendapatkan sistem registrasi, e-ticket QR, dan akses scanner gerbang tanpa biaya sepeser pun.',
      },
      {
        q: 'Bagaimana prosedur dan jadwal pencairan dana hasil penjualan tiket?',
        a: 'Dana hasil penjualan tiket dicairkan otomatis pada H+1 setelah acara selesai (maksimal 1x24 jam kerja) langsung ke rekening resmi panitia setelah proses rekonsiliasi data gerbang selesai.',
      },
      {
        q: 'Berapa banyak panitia yang bisa menggunakan scanner tiket di gerbang?',
        a: 'Tidak terbatas. Setiap staf panitia gerbang dapat menggunakan smartphone masing-masing (Android / iPhone) cukup dengan login akun panitia gate scanner. Sistem terhubung secara real-time dan anti-duplikasi.',
      },
      {
        q: 'Apakah IRVITE.ID juga melayani pencetakan tiket gelang fisik (wristband)?',
        a: 'Ya! Kami menyediakan paket tiket gelang Tyvek tahan air dan Lanyard VIP dengan barcode/QR presisi 300 DPI siap pakai dan siap kirim ke venue acara Anda di seluruh Indonesia.',
      },
    ],
  },
  EN: {
    navTicketCatalog: 'Ticket Catalog',
    navSolutions: 'Solutions & Features',
    loginPanel: 'Organizer Portal',
    createEventNow: 'Register Event Now',
    badge: 'EVENT ORGANIZER PARTNERSHIP • IRVITE.ID',
    heroTitle: 'All Ticket Sales & Event Operational Needs in One Unified Ecosystem',
    heroDesc: 'Integrated solutions for concerts, festivals, conferences, and campus events. From automated online ticketing (QRIS & Virtual Accounts), free smartphone gate scanner with zero hardware rentals, waterproof 300 DPI physical wristbands, to D+1 revenue settlements.',
    consultBtn: 'Consult & Register Event',
    viewSolutionsBtn: 'Explore 3 Solutions & Gate Scanner →',
    adminLoginBtn: 'Log in to Organizer Admin',
    stats: [
      { title: 'IDR 3,000 Flat', desc: 'Per ticket sold (IDR 0 for free events)' },
      { title: 'Settlement D+1', desc: 'Automatic payout to organizer bank account' },
      { title: '0 Hardware', desc: 'Scan tickets easily with staff smartphones' },
      { title: '100% Anti-Duplicate', desc: 'Unique QR encryption & real-time gate validation' },
    ],
    // Quick Solutions Section
    solutionsBadge: '3 CORE OPERATIONAL PILLARS',
    solutionsTitle: 'Complete Ecosystem from Ticket Presale to Venue Gate Day',
    solutionsSubtitle: 'Engineered specifically for low fees, rapid entrance check-in, and guest satisfaction.',
    pillar1Title: '1. Automated Ticketing & Payments',
    pillar1Desc: 'Launch multi-tier ticket sales (Early Bird, Presale, VIP) with instant payment channels including QRIS and Virtual Accounts. Dynamic QR E-tickets delivered automatically via WhatsApp & Email.',
    pillar1Tags: ['Multi-Tier Quotas', 'QRIS & Virtual Accounts', 'Instant WhatsApp Delivery'],
    pillar2Title: '2. Free Smartphone Gate Entrance Scanner',
    pillar2Desc: 'Eliminate expensive scanner rental fees. Gate staff use their own smartphones to validate QR tickets in sub-second speed (<0.5s) with 100% anti-duplicate protection.',
    pillar2Tags: ['0 Scanner Rental Cost', 'Multi-Gate Support', 'Sub-second Validation (<0.5s)'],
    pillar3Title: '3. Waterproof 300 DPI Physical Wristbands',
    pillar3Desc: 'For large-scale music concerts and festivals, we provide tamper-proof, waterproof Tyvek wristbands and VIP Lanyards featuring high-definition 300 DPI barcodes delivered directly to your venue.',
    pillar3Tags: ['Tear-Proof Tyvek Material', 'Waterproof & Sweatproof', 'Precision 300 DPI Barcodes'],
    exploreSolutionsPrompt: 'Want to view visual e-ticket mockups, phone scanner interface, wristband specifications, and organizer revenue simulation?',
    exploreSolutionsBtn: 'Open Detailed Solutions & Revenue Simulator →',
    // Quick Inquiry Form
    formBadge: 'QUICK CONSULTATION FORM',
    formTitle: 'Ready to Sell Tickets for Your Event Today?',
    formDesc: 'Fill in the short form below. Our Partnership team will reach out to you via WhatsApp in under 15 minutes.',
    orgLabel: 'Organizer / Institution Name *',
    orgPlaceholder: 'E.g., BEM UI / Soundwave Live',
    eventNameLabel: 'Event Name *',
    eventNamePlaceholder: 'E.g., Jazz Night 2026 / AI Summit',
    categoryLabel: 'Event Category',
    categories: [
      { value: 'Konser Musik / Festival', label: 'Music Concert / Festival' },
      { value: 'Seminar & Edukasi', label: 'Seminar & Education' },
      { value: 'Workshop / Bootcamp', label: 'Workshop / Bootcamp' },
      { value: 'Acara Kampus / Sekolah', label: 'Campus / School Event' },
      { value: 'Olahraga & Komunitas', label: 'Sports & Community' },
    ],
    waLabel: 'PIC WhatsApp Number *',
    waPlaceholder: 'E.g., 08123456789',
    attendeeLabel: 'Estimated Attendees',
    attendeeUnit: 'Attendees',
    submitBtn: 'Submit Inquiry via WhatsApp Now →',
    // FAQ
    faqBadge: 'ORGANIZER FAQ',
    faqTitle: 'Frequently Asked Questions by Event Organizers',
    faqList: [
      {
        q: 'How long does it take from event setup until tickets go live?',
        a: 'Under 30 minutes! Our team verifies event information and immediately publishes the official event page on IRVITE.ID with QRIS and Virtual Accounts ready.',
      },
      {
        q: 'Is there any percentage commission deducted from ticket sales?',
        a: 'Absolutely zero percentage cut. IRVITE.ID uses a flat fee of IDR 3,000 per paid ticket sold. This fee can either be passed to buyers or absorbed by the organizer.',
      },
      {
        q: 'What if our event is free (IDR 0 ticket price) for campus seminars?',
        a: 'For free events (IDR 0), the platform fee is IDR 0 (100% Free). Organizers receive registration system, dynamic QR e-tickets, and gate scanner access at zero cost.',
      },
      {
        q: 'What is the procedure and timeline for ticket sales payout settlement?',
        a: 'Revenue is settled automatically on D+1 after event conclusion (maximum 1x24 business hours) directly to the verified organizer bank account upon gate reconciliation.',
      },
      {
        q: 'How many staff members can use the gate scanner simultaneously?',
        a: 'Unlimited. Every entrance staff member can use their own smartphone (Android / iPhone) simply by logging into the gate scanner tool. Everything is synced real-time with zero collision.',
      },
      {
        q: 'Does IRVITE.ID also provide physical wristband printing?',
        a: 'Yes! We offer waterproof Tyvek wristband and VIP Lanyard packages with precision 300 DPI barcodes ready for deployment anywhere in Indonesia.',
      },
    ],
  },
};

export default function ClientPartnershipPage() {
  const [currentLang, setCurrentLang] = useState<'ID' | 'EN'>('ID');
  const [langMenuOpen, setLangMenuOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Quick Inquiry Form State
  const [orgName, setOrgName] = useState<string>('');
  const [eventName, setEventName] = useState<string>('');
  const [attendeeCount, setAttendeeCount] = useState<string>('200 - 500');
  const [organizerWa, setOrganizerWa] = useState<string>('');
  const [eventCategory, setEventCategory] = useState<string>('Konser Musik / Festival');

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedLang = window.localStorage.getItem('irvite_lang');
        if (savedLang === 'ID' || savedLang === 'EN') {
          setCurrentLang(savedLang);
        }
      } catch {
        // Ignore storage error
      }
    }
  }, []);

  const t = PARTNERSHIP_TEXT[currentLang];

  function handleSendInquiry(e: React.FormEvent) {
    e.preventDefault();
    const isEn = currentLang === 'EN';
    const message = isEn
      ? `Hello IRVITE.ID Partnership Team,\n\nI would like to consult & register our event:\n- Organizer: ${orgName || '-'}\n- Event Name: ${eventName || '-'}\n- Category: ${eventCategory}\n- Estimated Attendees: ${attendeeCount}\n- PIC Contact: ${organizerWa || '-'}\n\nPlease share information on starting ticket sales with IRVITE.ID. Thank you!`
      : `Halo Tim Partnership IRVITE.ID,\n\nSaya ingin konsultasi & mendaftarkan event kami:\n- Nama Penyelenggara: ${orgName || '-'}\n- Nama Acara: ${eventName || '-'}\n- Kategori: ${eventCategory}\n- Estimasi Penonton: ${attendeeCount}\n- Kontak Penanggung Jawab: ${organizerWa || '-'}\n\nMohon informasi pembukaan penjualan tiket di IRVITE.ID. Terima kasih!`;
    const url = `https://wa.me/6281234567890?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      className="irv-part-page-root"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f6f9f7',
        color: '#0f172a',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        paddingBottom: '3.5rem',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .irv-part-page-root,
        .irv-part-page-root h1,
        .irv-part-page-root h2,
        .irv-part-page-root h3,
        .irv-part-page-root p {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
        .irv-part-container {
          width: 100%;
          max-width: 1360px;
          margin: 0 auto;
          padding-left: clamp(0.75rem, 2.5vw, 2rem);
          padding-right: clamp(0.75rem, 2.5vw, 2rem);
          box-sizing: border-box;
        }
        .irv-header-logo-img {
          height: 22px;
          width: auto;
          object-fit: contain;
          display: block;
        }
        .irv-hero-split-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 2rem;
          align-items: center;
        }
        .irv-hero-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }
        .irv-solutions-teaser-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }
        .irv-form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .irv-header-desktop-nav {
          display: flex;
        }
        .irv-header-mobile-toggle {
          display: none;
        }
        @media (max-width: 1024px) {
          .irv-hero-split-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .irv-solutions-teaser-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 767px) {
          .irv-header-desktop-nav {
            display: none !important;
          }
          .irv-header-mobile-toggle {
            display: inline-flex !important;
          }
          .irv-header-logo-img {
            height: 18px;
          }
          .irv-hero-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }
          .irv-form-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          /* Ergonomic Mobile Sizing */
          .irv-hero-card {
            padding: 1.25rem 1rem !important;
            border-radius: 16px !important;
          }
          .irv-hero-title {
            font-size: clamp(1.25rem, 5.2vw, 1.6rem) !important;
            line-height: 1.22 !important;
            margin-bottom: 0.75rem !important;
          }
          .irv-hero-desc {
            font-size: 0.82rem !important;
            line-height: 1.45 !important;
            margin-bottom: 1.15rem !important;
          }
          .irv-hero-cta-group {
            flex-direction: column !important;
            gap: 0.65rem !important;
            margin-bottom: 1.25rem !important;
          }
          .irv-hero-cta-btn {
            width: 100% !important;
            justify-content: center !important;
            padding: 0.75rem 1rem !important;
            font-size: 0.85rem !important;
          }
          .irv-dashboard-preview {
            padding: 1rem !important;
            border-radius: 14px !important;
          }
        }
      `}</style>

      {/* 1. STICKY TOP NAVBAR (B2B Organizer Header - Clean & Focused, NO Layanan Dropdown) */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 60,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div
          className="irv-part-container"
          style={{
            minHeight: '58px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
          }}
        >
          {/* Left: Brand Logo + Primary B2B Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link href="/partnership" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <img
                src="/irvite-logo.png"
                alt="IRVITE.ID"
                className="irv-header-logo-img"
              />
            </Link>

            {/* Direct Links (Desktop): Detail Solusi & Katalog Tiket */}
            <div className="irv-header-desktop-nav" style={{ alignItems: 'center', gap: '0.75rem' }}>
              <Link
                href="/partnership/solusi"
                style={{
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  color: '#1b3b2b',
                  textDecoration: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  background: 'rgba(27, 59, 43, 0.06)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>✨ {t.navSolutions}</span>
              </Link>

              <Link
                href="/tiket"
                style={{
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  color: '#475569',
                  textDecoration: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                }}
              >
                {t.navTicketCatalog}
              </Link>
            </div>
          </div>

          {/* Right Group (Desktop): Language ID/EN + Masuk Panel EO + Daftar Event */}
          <div className="irv-header-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Language Selector Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setLangMenuOpen((prev) => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background: langMenuOpen ? '#f1f5f9' : 'transparent',
                  border: 'none',
                  padding: '0.35rem 0.55rem',
                  borderRadius: '8px',
                  color: '#0d253f',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                aria-label="Pilih Bahasa"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d253f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <path d="M12 3a14.5 14.5 0 0 1 0 18 14.5 14.5 0 0 1 0-18" />
                </svg>
                <span>{currentLang}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0d253f"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: langMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.18s ease',
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {langMenuOpen && (
                <>
                  <div
                    onClick={() => setLangMenuOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 65 }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      minWidth: '160px',
                      background: '#ffffff',
                      borderRadius: '10px',
                      boxShadow: '0 10px 28px rgba(15, 23, 42, 0.15)',
                      border: '1px solid #e2e8f0',
                      padding: '0.35rem',
                      zIndex: 70,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentLang('ID');
                        if (typeof window !== 'undefined') window.localStorage.setItem('irvite_lang', 'ID');
                        setLangMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.65rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: currentLang === 'ID' ? '#edf4f0' : 'transparent',
                        color: currentLang === 'ID' ? '#1b3b2b' : '#334155',
                        fontWeight: currentLang === 'ID' ? 800 : 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span>🇮🇩 Indonesia (ID)</span>
                      {currentLang === 'ID' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1b3b2b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentLang('EN');
                        if (typeof window !== 'undefined') window.localStorage.setItem('irvite_lang', 'EN');
                        setLangMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.65rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: currentLang === 'EN' ? '#edf4f0' : 'transparent',
                        color: currentLang === 'EN' ? '#1b3b2b' : '#334155',
                        fontWeight: currentLang === 'EN' ? 800 : 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginTop: '0.1rem',
                      }}
                    >
                      <span>🇬🇧 English (EN)</span>
                      {currentLang === 'EN' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1b3b2b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Masuk Panel EO Button */}
            <a
              href="https://irvite-admin.vercel.app/login"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#0d253f',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#1b3b2b';
                e.currentTarget.style.color = '#1b3b2b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.color = '#0d253f';
              }}
            >
              <span>{t.loginPanel}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </a>

            {/* Daftar Event CTA Button */}
            <a
              href="#daftar-event"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                border: 'none',
                background: '#1b3b2b',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(27, 59, 43, 0.2)',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#13281e')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#1b3b2b')}
            >
              <span>{t.createEventNow}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <div className="irv-header-mobile-toggle">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Buka Menu"
              style={{
                background: mobileMenuOpen ? '#f1f5f9' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                padding: '0.4rem',
                color: '#0d253f',
                cursor: 'pointer',
              }}
            >
              {mobileMenuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Popover Card */}
        {mobileMenuOpen && (
          <>
            <div
              onClick={() => setMobileMenuOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 65, background: 'rgba(15, 23, 42, 0.4)' }}
            />
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: '0.75rem',
                right: '0.75rem',
                background: '#ffffff',
                borderRadius: '14px',
                padding: '1rem',
                boxShadow: '0 16px 40px rgba(15, 23, 42, 0.2)',
                border: '1px solid #e2e8f0',
                zIndex: 70,
              }}
            >
              <div style={{ display: 'grid', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <a
                  href="#daftar-event"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: '#1b3b2b',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    textDecoration: 'none',
                  }}
                >
                  {t.createEventNow}
                </a>

                <Link
                  href="/partnership/solusi"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    background: '#edf5f0',
                    border: '1px solid #c5d9ce',
                    color: '#1b3b2b',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    textDecoration: 'none',
                  }}
                >
                  ✨ {t.navSolutions} ➔
                </Link>

                <a
                  href="https://irvite-admin.vercel.app/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0d253f',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    textDecoration: 'none',
                  }}
                >
                  {t.loginPanel} ↗
                </a>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link
                  href="/tiket"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    textDecoration: 'none',
                    color: '#334155',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                  }}
                >
                  🎟️ {t.navTicketCatalog}
                </Link>

                {/* Mobile Language Switcher Buttons */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentLang('ID');
                      if (typeof window !== 'undefined') window.localStorage.setItem('irvite_lang', 'ID');
                    }}
                    style={{
                      padding: '0.3rem 0.55rem',
                      borderRadius: '6px',
                      border: currentLang === 'ID' ? '1.5px solid #1b3b2b' : '1px solid #cbd5e1',
                      background: currentLang === 'ID' ? '#edf4f0' : '#ffffff',
                      color: currentLang === 'ID' ? '#1b3b2b' : '#64748b',
                      fontWeight: 800,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                    }}
                  >
                    🇮🇩 ID
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentLang('EN');
                      if (typeof window !== 'undefined') window.localStorage.setItem('irvite_lang', 'EN');
                    }}
                    style={{
                      padding: '0.3rem 0.55rem',
                      borderRadius: '6px',
                      border: currentLang === 'EN' ? '1.5px solid #1b3b2b' : '1px solid #cbd5e1',
                      background: currentLang === 'EN' ? '#edf4f0' : '#ffffff',
                      color: currentLang === 'EN' ? '#1b3b2b' : '#64748b',
                      fontWeight: 800,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                    }}
                  >
                    🇬🇧 EN
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* 2. MAIN B2B CONTENT (Compact, High-Converting & Ergonomic for Mobile) */}
      <main className="irv-part-container" style={{ paddingTop: '1.25rem' }}>
        {/* HERO SECTION */}
        <section
          className="irv-hero-card"
          style={{
            background: 'linear-gradient(135deg, #11291d 0%, #1b3b2b 55%, #244b37 100%)',
            borderRadius: '20px',
            padding: 'clamp(1.5rem, 3.2vw, 2.75rem)',
            color: '#ffffff',
            marginBottom: '1.75rem',
            boxShadow: '0 16px 40px rgba(17, 41, 29, 0.14)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Ambient Decorative Glow */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-20%',
              right: '-10%',
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(197, 160, 89, 0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div className="irv-hero-split-grid" style={{ position: 'relative', zIndex: 2 }}>
            {/* Left Column: Headline, CTAs, 4 Quick Stat Cards */}
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#e5c170',
                  background: 'rgba(229, 193, 112, 0.12)',
                  border: '1px solid rgba(229, 193, 112, 0.28)',
                  padding: '0.25rem 0.7rem',
                  borderRadius: '999px',
                  marginBottom: '0.75rem',
                }}
              >
                <span>{t.badge}</span>
              </span>

              <h1
                className="irv-hero-title"
                style={{
                  fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
                  fontWeight: 900,
                  lineHeight: 1.18,
                  margin: '0 0 0.85rem 0',
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                }}
              >
                {t.heroTitle}
              </h1>

              <p
                className="irv-hero-desc"
                style={{
                  fontSize: 'clamp(0.85rem, 1.2vw, 0.96rem)',
                  color: '#d1e3d9',
                  lineHeight: 1.55,
                  margin: '0 0 1.5rem 0',
                  maxWidth: '680px',
                }}
              >
                {t.heroDesc}
              </p>

              {/* CTAs */}
              <div className="irv-hero-cta-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.75rem' }}>
                <a
                  href="#daftar-event"
                  className="irv-hero-cta-btn"
                  style={{
                    padding: '0.75rem 1.35rem',
                    borderRadius: '10px',
                    background: '#c5a059',
                    color: '#11291d',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(197, 160, 89, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  <span>{t.consultBtn}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>

                <Link
                  href="/partnership/solusi"
                  className="irv-hero-cta-btn"
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1.5px solid rgba(255, 255, 255, 0.28)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  <span>{t.viewSolutionsBtn}</span>
                </Link>
              </div>

              {/* 4 Stat Highlights (Compact 2x2 on mobile, 4 columns on desktop) */}
              <div className="irv-hero-stats-grid">
                {t.stats.map((stat) => (
                  <div
                    key={stat.title}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '0.65rem 0.75rem',
                    }}
                  >
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.15rem' }}>
                      {stat.title}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#c5d9ce', lineHeight: 1.35 }}>
                      {stat.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Organizer Live Command Center Mockup (Glassmorphism Preview) */}
            <div
              className="irv-dashboard-preview"
              style={{
                background: 'rgba(13, 37, 27, 0.7)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                border: '1.5px solid rgba(197, 160, 89, 0.3)',
                padding: '1.15rem',
                boxShadow: '0 20px 48px rgba(0, 0, 0, 0.3)',
              }}
            >
              {/* Card Header: Live pulse & Event name */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', paddingBottom: '0.65rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '999px',
                      background: '#10b981',
                      boxShadow: '0 0 6px #10b981',
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.05em', color: '#6ee7b7', textTransform: 'uppercase' }}>
                    LIVE EVENT DASHBOARD
                  </span>
                </div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: 'rgba(255,255,255,0.08)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  Web Admin EO
                </span>
              </div>

              {/* Event Title */}
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.2rem' }}>
                JAKARTA INDIE SOUNDWAVE 2026
              </div>
              <div style={{ fontSize: '0.72rem', color: '#c5a059', fontWeight: 600, marginBottom: '0.95rem' }}>
                24 Agu 2026 • Stadion Madya GBK, Jakarta
              </div>

              {/* Sales Metrics with Glowing Progress Bar */}
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '0.85rem', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Tiket Terjual (65.7% Kuota)</span>
                  <strong style={{ fontSize: '0.88rem', color: '#ffffff' }}>888 / 1.350</strong>
                </div>
                {/* Progress Bar */}
                <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.6rem' }}>
                  <div style={{ width: '65.7%', height: '100%', background: 'linear-gradient(90deg, #c5a059 0%, #10b981 100%)', borderRadius: '999px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Estimasi Omzet Penjualan</span>
                  <strong style={{ fontSize: '1rem', color: '#e5c170', fontWeight: 900 }}>Rp 132.450.000</strong>
                </div>
              </div>

              {/* Live Gate Check-in Micro-Feed */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                  Aktivitas Scanner Pintu Masuk
                </div>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.4rem 0.65rem', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#34d399', background: 'rgba(16, 185, 129, 0.2)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>✓ VALID</span>
                      <span style={{ fontSize: '0.74rem', color: '#ffffff', fontWeight: 600 }}>Rian Pratama (Presale 1)</span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#a7f3d0' }}>Gate 01 • Baru saja</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '0.4rem 0.65rem', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#34d399', background: 'rgba(16, 185, 129, 0.2)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>✓ VALID</span>
                      <span style={{ fontSize: '0.74rem', color: '#ffffff', fontWeight: 600 }}>Sarah Amalia (VIP Pass)</span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Gate 02 VIP • 12 dtk lalu</span>
                  </div>
                </div>
              </div>

              {/* Physical Wristband Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: 'rgba(197, 160, 89, 0.1)', border: '1px solid rgba(197, 160, 89, 0.22)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: '#e5c170', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>🎟️</span>
                  <span>Tiket Gelang Tyvek:</span>
                </span>
                <span style={{ fontSize: '0.7rem', color: '#ffffff', fontWeight: 800 }}>
                  1.350 Pcs Ready di Venue
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 3 CONCISE SOLUTIONS OVERVIEW (TEASER & HIGHLIGHT CARDS) */}
        <section style={{ marginBottom: '2rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 1.35rem' }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#1b3b2b',
                background: '#edf5f0',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                display: 'inline-block',
                marginBottom: '0.4rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {t.solutionsBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.3rem, 2.2vw, 1.75rem)', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#0f172a' }}>
              {t.solutionsTitle}
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
              {t.solutionsSubtitle}
            </p>
          </div>

          <div className="irv-solutions-teaser-grid">
            {/* Pilar 1 Summary Card */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.25rem',
                border: '1.5px solid #d5e4dc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#edf5f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.75rem',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1b3b2b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.4rem 0', color: '#0f172a' }}>
                  {t.pillar1Title}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: '0 0 0.85rem 0' }}>
                  {t.pillar1Desc}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {t.pillar1Tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#1b3b2b',
                      background: '#edf5f0',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '5px',
                    }}
                  >
                    ✓ {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Pilar 2 Summary Card */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.25rem',
                border: '1.5px solid #d5e4dc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#edf5f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.75rem',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1b3b2b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.4rem 0', color: '#0f172a' }}>
                  {t.pillar2Title}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: '0 0 0.85rem 0' }}>
                  {t.pillar2Desc}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {t.pillar2Tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#1b3b2b',
                      background: '#edf5f0',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '5px',
                    }}
                  >
                    ✓ {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Pilar 3 Summary Card */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.25rem',
                border: '1.5px solid #d5e4dc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#edf5f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.75rem',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="7" />
                    <polyline points="12 9 12 12 13.5 13.5" />
                    <path d="M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.4rem 0', color: '#0f172a' }}>
                  {t.pillar3Title}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: '0 0 0.85rem 0' }}>
                  {t.pillar3Desc}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {t.pillar3Tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#8f6f2d',
                      background: '#fbf7ee',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '5px',
                    }}
                  >
                    ✓ {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Dedicated Sub-Page Callout Banner (Eliminates excessive scrolling on main page!) */}
          <div
            style={{
              marginTop: '1.25rem',
              background: 'linear-gradient(135deg, #edf5f0 0%, #ffffff 100%)',
              border: '1.5px solid #a7f3d0',
              borderRadius: '14px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.35rem' }}>📱</span>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#13281e' }}>
                  {t.exploreSolutionsPrompt}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#476355', marginTop: '2px' }}>
                  Termasuk panduan penggunaan scanner multi-pintu, spesifikasi cetak barcode 300 DPI, dan alur pencairan dana H+1.
                </div>
              </div>
            </div>

            <Link
              href="/partnership/solusi"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1.15rem',
                borderRadius: '8px',
                background: '#1b3b2b',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.82rem',
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(27, 59, 43, 0.25)',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#13281e')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#1b3b2b')}
            >
              <span>{t.exploreSolutionsBtn}</span>
            </Link>
          </div>
        </section>

        {/* QUICK INQUIRY FORM SECTION (Daftar Event / Konsultasi - Immediately Accessible!) */}
        <section
          id="daftar-event"
          style={{
            background: 'linear-gradient(135deg, #1b3b2b 0%, #11291d 100%)',
            borderRadius: '20px',
            padding: 'clamp(1.5rem, 3vw, 2.5rem)',
            color: '#ffffff',
            marginBottom: '2rem',
            boxShadow: '0 16px 40px rgba(17, 41, 29, 0.16)',
          }}
        >
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#e5c170',
                  background: 'rgba(229, 193, 112, 0.15)',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '999px',
                  display: 'inline-block',
                  marginBottom: '0.4rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {t.formBadge}
              </span>
              <h2 style={{ fontSize: 'clamp(1.35rem, 2.3vw, 1.85rem)', fontWeight: 800, margin: '0 0 0.35rem', color: '#ffffff' }}>
                {t.formTitle}
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#c5d9ce', margin: 0 }}>
                {t.formDesc}
              </p>
            </div>

            <form
              onSubmit={handleSendInquiry}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: 'clamp(1.15rem, 2.2vw, 1.75rem)',
                color: '#0f172a',
                display: 'grid',
                gap: '0.95rem',
              }}
            >
              <div className="irv-form-grid">
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
                    {t.orgLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={t.orgPlaceholder}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
                    {t.eventNameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder={t.eventNamePlaceholder}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div className="irv-form-grid">
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
                    {t.categoryLabel}
                  </label>
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      background: '#ffffff',
                    }}
                  >
                    {t.categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
                    {t.waLabel}
                  </label>
                  <input
                    type="tel"
                    required
                    value={organizerWa}
                    onChange={(e) => setOrganizerWa(e.target.value)}
                    placeholder={t.waPlaceholder}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
                  {t.attendeeLabel}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {['< 200', '200 - 500', '500 - 1.000', '1.000 - 3.000', '> 3.000'].map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setAttendeeCount(tier)}
                      style={{
                        padding: '0.35rem 0.7rem',
                        borderRadius: '6px',
                        border: attendeeCount === tier ? '1.5px solid #1b3b2b' : '1px solid #cbd5e1',
                        background: attendeeCount === tier ? '#edf5f0' : '#ffffff',
                        color: attendeeCount === tier ? '#1b3b2b' : '#475569',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      {tier} {t.attendeeUnit}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#1b3b2b',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 12px rgba(27, 59, 43, 0.28)',
                  transition: 'background 0.15s ease',
                  marginTop: '0.35rem',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#13281e')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#1b3b2b')}
              >
                <span>{t.submitBtn}</span>
              </button>
            </form>
          </div>
        </section>

        {/* FAQ ACCORDION SECTION */}
        <section style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.35rem' }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#1b3b2b',
                background: '#edf5f0',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                display: 'inline-block',
                marginBottom: '0.4rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {t.faqBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.25rem, 2vw, 1.6rem)', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              {t.faqTitle}
            </h2>
          </div>

          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {t.faqList.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={item.q}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1.5px solid #d5e4dc',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '0.9rem 1.15rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      background: 'transparent',
                      border: 'none',
                      color: '#0f172a',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{item.q}</span>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#1b3b2b"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.18s ease',
                        flexShrink: 0,
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        padding: '0 1.15rem 1rem',
                        fontSize: '0.82rem',
                        color: '#475569',
                        lineHeight: 1.55,
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '0.75rem',
                      }}
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
