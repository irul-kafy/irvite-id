'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRupiah, PLATFORM_FEE_PER_TICKET } from '@/lib/ticketing-store';
import { isTicketingEnabled } from '@/config/features';

const SOLUTIONS_TEXT = {
  ID: {
    backToSummary: 'Ringkasan Partnership',
    navTicketCatalog: 'Katalog Tiket',
    loginPanel: 'Masuk Panel EO',
    registerNow: 'Daftar Event Sekarang',
    breadcrumb: 'PARTNERSHIP • DETAIL SOLUSI & SIMULASI',
    pageTitle: 'Solusi Lengkap Ticketing, Gate Scanner & Gelang Konser',
    pageDesc: 'Eksplorasi mendalam 3 pilar operasional acara IRVITE.ID: dari sistem tiket online otomatis, scanner gerbang via smartphone gratis, tiket gelang fisik 300 DPI tahan air, hingga kalkulator proyeksi pencairan dana H+1.',
    // 3 Pillars
    pillarsBadge: '3 PILAR UTAMA OPERASIONAL ACARA',
    pillarsTitle: 'Teknologi Terintegrasi dari Presale hingga Hari-H Venue',
    pillar1Title: '1. Sistem Ticketing & Pembayaran Otomatis',
    pillar1Desc: 'Buka penjualan tiket multi-tier (Early Bird, Presale, VIP) dengan metode pembayaran lengkap QRIS, GoPay, OVO, ShopeePay, dan Virtual Account semua bank. E-ticket QR langsung dikirim otomatis via WhatsApp & Email penonton.',
    pillar1Tags: ['Multi-Tier Kuota', 'QRIS & Virtual Account', 'Pengiriman WhatsApp Instan', 'Dashboard Real-Time'],
    pillar1Highlights: [
      'Checkout cepat tanpa wajib buat akun yang rumit bagi pembeli tiket.',
      'QR Code dinamis terenkripsi anti-pemalsuan dan anti-screenshot berulang.',
      'Notifikasi WhatsApp instan dengan lampiran e-ticket PDF beresolusi tinggi.',
      'Sistem kuota otomatis: tiket langsung ditutup saat kuota tier habis.',
    ],
    pillar2Title: '2. Scanner Gerbang Masuk via Smartphone Gratis',
    pillar2Desc: 'Lupakan biaya sewa alat scanner barcode jutaan rupiah. Seluruh staf panitia di gerbang pintu masuk cukup menggunakan smartphone masing-masing untuk validasi tiket QR. Terkoneksi cloud real-time sehingga 1 tiket mustahil digunakan dua kali.',
    pillar2Tags: ['Tanpa Biaya Sewa Scanner', 'Support Multi-Pintu Masuk', 'Validasi Super Cepat (<0.5 Detik)', 'Deteksi Tiket Ganda'],
    pillar2Highlights: [
      'Cukup buka link scanner di browser HP panitia (Android / iPhone).',
      'Scan super kilat (<0.5 detik) mencegah antrean mengular di gerbang pintu masuk.',
      'Indikator visual & getar: Hijau untuk Valid, Merah mencolok jika Tiket Sudah Dipakai.',
      'Sinkronisasi multi-gate real-time: jika tiket di-scan di Gate 1, Gate 2 langsung menolak.',
    ],
    pillar3Title: '3. Tiket Gelang Fisik (Wristband) 300 DPI Tahan Air',
    pillar3Desc: 'Untuk konser musik dan festival berkapasitas besar, kami menyediakan tiket gelang Tyvek dan Lanyard VIP tahan sobek, tahan air, dengan cetakan barcode/QR presisi tinggi 300 DPI siap pakai dan siap kirim ke seluruh kota Indonesia.',
    pillar3Tags: ['Bahan Tyvek Anti-Sobek', 'Tahan Air & Keringat', 'Barcode / QR Presisi 300 DPI', 'Pengiriman ke Seluruh Indonesia'],
    pillar3Highlights: [
      'Bahan Tyvek berserat rapat: anti-sobek dan sekali pakai (perekat tamper-evident).',
      'Tahan air, hujan, dan keringat penonton festival outdoor seharian penuh.',
      'Resolusi cetak 300 DPI ultra-tajam menjamin scanner gerbang membaca barcode 100% akurat.',
      'Pilihan kain tenun VIP Lanyard dengan one-way barrel lock untuk akses backstage eksklusif.',
    ],
    // Simulator
    simBadge: 'SIMULASI PENDAPATAN EO',
    simTitle: 'Hitung Estimasi Penjualan & Pencairan Dana Bersih Anda',
    simDesc: 'Gunakan kalkulator transparan ini untuk memproyeksikan potensi pendapatan dan memilih skema pembebanan biaya platform terbaik bagi acara Anda.',
    ticketPriceLabel: 'Harga Tiket Satuan (Rp)',
    ticketSoldLabel: 'Estimasi Tiket Terjual:',
    soldUnit: 'Tiket',
    feeSchemeLabel: 'Skema Biaya Layanan (Flat Rp 3.000 / Tiket)',
    feePaidByBuyer: 'Dibayar Pembeli',
    feePaidByBuyerSub: 'EO terima 100% harga tiket',
    feeAbsorbedByOrg: 'Diserap Panitia',
    feeAbsorbedByOrgSub: 'Harga tiket all-in bersih',
    buyerPayPerTicket: 'Harga Bayar per Pembeli:',
    grossSalesLabel: 'Total Penjualan Kotor',
    platformFeeLabel: 'Biaya Platform Flat (Rp 3.000):',
    paidByBuyerTag: 'Dibayar Pembeli',
    deductedFromEoTag: 'Dipotong dari EO',
    netPayoutTitle: 'ESTIMASI PENCAIRAN DANA BERSIH EO (H+1)',
    payoutNote: '*Pencairan diproses otomatis maksimal 1x24 jam kerja setelah acara selesai.',
    // Steps & Trust
    stepsBadge: 'ALUR KERJASAMA PENYELENGGARA',
    stepsTitle: '4 Langkah Mudah dari Pendaftaran hingga Pencairan',
    steps: [
      {
        step: '01',
        title: 'Hubungi Tim & Kirim Detail Acara',
        desc: 'Kirimkan poster acara, tanggal, lokasi venue, dan nomor rekening penampung panitia via WhatsApp.',
      },
      {
        step: '02',
        title: 'Atur Kategori Tier & Kuota',
        desc: 'Tentukan kategori tiket (Presale, Early Bird, VIP) dan kuota masing-masing di dashboard admin.',
      },
      {
        step: '03',
        title: 'Sebarkan Link Penjualan Resmi',
        desc: 'Link event langsung aktif dan dapat dibagikan di Instagram, TikTok, atau website resmi panitia.',
      },
      {
        step: '04',
        title: 'Scan di Gate & Settlement H+1',
        desc: 'Validasi tiket di gerbang via smartphone panitia. Dana bersih langsung cair H+1 ke rekening panitia.',
      },
    ],
    trustCards: [
      {
        title: '🛡️ SOP Pencairan H+1 Otomatis',
        desc: 'Pencairan dana langsung ke rekening panitia terdaftar maksimal 1x24 jam setelah acara selesai dengan rekapitulasi audit otomatis.',
      },
      {
        title: '🔒 Proteksi Anti-Fraud & Duplikasi',
        desc: 'Setiap barcode/QR dienkripsi unik per tiket. Tiket yang sudah di-scan tidak akan bisa digunakan kembali di gerbang mana pun.',
      },
      {
        title: '⚖️ Kebijakan Garansi Refund Resmi',
        desc: 'Jika terjadi pembatalan acara akibat keadaan kahar (force majeure), IRVITE.ID menyediakan alur refund resmi yang aman untuk pembeli.',
      },
    ],
    bottomCtaTitle: 'Siap Menggunakan Ekosistem IRVITE.ID untuk Acara Anda?',
    bottomCtaDesc: 'Daftarkan event Anda sekarang juga. Tim kami akan menyiapkan sistem ticketing dan scanner gerbang dalam waktu 30 menit.',
    bottomCtaRegisterBtn: 'Daftarkan Event Sekarang (Isi Form) →',
    bottomCtaWaBtn: 'Konsultasi Cepat via WhatsApp',
  },
  EN: {
    backToSummary: 'Partnership Overview',
    navTicketCatalog: 'Ticket Catalog',
    loginPanel: 'Organizer Portal',
    registerNow: 'Register Event Now',
    breadcrumb: 'PARTNERSHIP • DETAILED SOLUTIONS & SIMULATION',
    pageTitle: 'Complete Ticketing, Gate Scanner & Wristbands Solutions',
    pageDesc: 'Deep dive into IRVITE.ID’s 3 operational pillars: automated online ticketing, zero-hardware smartphone gate scanner, waterproof 300 DPI physical wristbands, and net payout simulation.',
    // 3 Pillars
    pillarsBadge: '3 CORE OPERATIONAL PILLARS',
    pillarsTitle: 'Integrated Technology from Presale to Venue Gate Day',
    pillar1Title: '1. Automated Ticketing & Payments',
    pillar1Desc: 'Launch multi-tier ticket sales (Early Bird, Presale, VIP) with instant payment channels including QRIS and Virtual Accounts across all banks. Dynamic QR E-tickets delivered automatically via WhatsApp & Email.',
    pillar1Tags: ['Multi-Tier Quotas', 'QRIS & Virtual Accounts', 'Instant WhatsApp Delivery', 'Real-Time Dashboard'],
    pillar1Highlights: [
      'Rapid checkout without forcing buyers through tedious account registrations.',
      'Dynamic encrypted QR code preventing counterfeits and repeated screenshot use.',
      'Instant WhatsApp notifications with high-definition downloadable ticket passes.',
      'Automated seat/quota management: tiers automatically close once capacity is reached.',
    ],
    pillar2Title: '2. Free Smartphone Gate Entrance Scanner',
    pillar2Desc: 'Eliminate expensive scanner rental fees. Gate staff use their own smartphones to validate QR tickets. Cloud-synced in real-time to guarantee 100% protection against duplicate or fraudulent entries.',
    pillar2Tags: ['Zero Rental Costs', 'Multi-Gate Support', 'Sub-second Validation (<0.5s)', 'Duplicate Detection'],
    pillar2Highlights: [
      'Simply open the secure scanner link in mobile browser on staff phones (Android / iOS).',
      'Sub-second scan validation (<0.5s) eliminates bottlenecks at high-traffic venue gates.',
      'Clear visual & vibration cues: Green for Valid, high-contrast Red for Already Used.',
      'Instant cloud synchronization: if a ticket is checked in at Gate 1, Gate 2 rejects it immediately.',
    ],
    pillar3Title: '3. Waterproof 300 DPI Physical Wristbands',
    pillar3Desc: 'For large-scale music concerts and festivals, we provide tamper-proof, waterproof Tyvek wristbands and VIP Lanyards featuring high-definition 300 DPI barcodes, delivered directly to your venue.',
    pillar3Tags: ['Tear-Proof Tyvek Material', 'Waterproof & Sweatproof', 'Precision 300 DPI Barcodes', 'Nationwide Delivery'],
    pillar3Highlights: [
      'High-density Tyvek fibers: tear-proof and single-use with tamper-evident adhesive closures.',
      'Impervious to water, rain, and sweat throughout intense multi-day outdoor festivals.',
      'Ultra-crisp 300 DPI printing ensures gate scanners achieve a 100% first-pass read rate.',
      'VIP woven fabric lanyards with one-way barrel locks for prestigious backstage access.',
    ],
    // Simulator
    simBadge: 'ORGANIZER REVENUE SIMULATOR',
    simTitle: 'Calculate Your Estimated Sales & Net Payout',
    simDesc: 'Use this transparent calculator to project your gross revenue and select the most favorable platform fee structure for your event.',
    ticketPriceLabel: 'Unit Ticket Price (IDR)',
    ticketSoldLabel: 'Estimated Tickets Sold:',
    soldUnit: 'Tickets',
    feeSchemeLabel: 'Platform Fee Structure (Flat IDR 3,000 / Ticket)',
    feePaidByBuyer: 'Paid by Buyer',
    feePaidByBuyerSub: 'Organizer receives 100% nominal price',
    feeAbsorbedByOrg: 'Absorbed by Organizer',
    feeAbsorbedByOrgSub: 'All-inclusive ticket price for buyers',
    buyerPayPerTicket: 'Buyer Checkout Price per Ticket:',
    grossSalesLabel: 'Gross Ticket Sales',
    platformFeeLabel: 'Flat Platform Fee (IDR 3,000):',
    paidByBuyerTag: 'Paid by Buyer',
    deductedFromEoTag: 'Deducted from Organizer',
    netPayoutTitle: 'ESTIMATED NET ORGANIZER PAYOUT (D+1)',
    payoutNote: '*Payout is automatically processed within 1x24 business hours after event completion.',
    // Steps & Trust
    stepsBadge: 'ORGANIZER WORKFLOW',
    stepsTitle: '4 Simple Steps from Onboarding to Settlement',
    steps: [
      {
        step: '01',
        title: 'Contact Team & Submit Event Details',
        desc: 'Send your event poster, date, venue location, and designated organizer bank account via WhatsApp.',
      },
      {
        step: '02',
        title: 'Configure Ticket Tiers & Quotas',
        desc: 'Set up ticket tiers (Presale, Early Bird, VIP) and individual seat quotas in your admin dashboard.',
      },
      {
        step: '03',
        title: 'Distribute Official Ticketing Link',
        desc: 'Your event link goes live instantly and can be shared on Instagram, TikTok, or your official website.',
      },
      {
        step: '04',
        title: 'Gate Scan & D+1 Settlement',
        desc: 'Validate tickets at gates using staff smartphones. Full net payout transferred D+1 directly to your account.',
      },
    ],
    trustCards: [
      {
        title: '🛡️ Automated D+1 Settlement SOP',
        desc: 'Direct fund transfer to verified organizer accounts within 1x24 hours after event completion with automatic audit reconciliation.',
      },
      {
        title: '🔒 Anti-Fraud & Anti-Duplicate Protection',
        desc: 'Each QR is uniquely encrypted per ticket. Checked-in tickets can never be reused across any gate entrance.',
      },
      {
        title: '⚖️ Official Refund Guarantee Policy',
        desc: 'In case of event cancellation due to force majeure, IRVITE provides a secure, structured refund flow for attendees.',
      },
    ],
    bottomCtaTitle: 'Ready to Deploy IRVITE.ID Ecosystem for Your Event?',
    bottomCtaDesc: 'Register your event today. Our partnership team will have your ticketing system and gate scanner operational in under 30 minutes.',
    bottomCtaRegisterBtn: 'Register Event Now (Fill Form) →',
    bottomCtaWaBtn: 'Quick WhatsApp Consultation',
  },
};

export default function PartnershipSolusiPage() {
  useEffect(() => {
    if (!isTicketingEnabled()) {
      window.location.replace('/');
    }
  }, []);

  const [currentLang, setCurrentLang] = useState<'ID' | 'EN'>('ID');
  const [langMenuOpen, setLangMenuOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Revenue Simulator State
  const [ticketPrice, setTicketPrice] = useState<number>(150000);
  const [estimatedSold, setEstimatedSold] = useState<number>(350);
  const [feeBearer, setFeeBearer] = useState<'buyer' | 'organizer'>('buyer');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedLang = window.localStorage.getItem('irvite_lang');
        if (savedLang === 'ID' || savedLang === 'EN') {
          setCurrentLang(savedLang);
        }
      } catch {
        // Ignore
      }
    }
  }, []);

  const t = SOLUTIONS_TEXT[currentLang];

  const grossTicketSales = ticketPrice * estimatedSold;
  const totalPlatformFee = ticketPrice > 0 ? PLATFORM_FEE_PER_TICKET * estimatedSold : 0;
  const netOrganizerPayout =
    feeBearer === 'buyer' ? grossTicketSales : Math.max(0, grossTicketSales - totalPlatformFee);
  const buyerCheckoutPrice =
    feeBearer === 'buyer' && ticketPrice > 0 ? ticketPrice + PLATFORM_FEE_PER_TICKET : ticketPrice;

  return (
    <div
      className="irv-solusi-page-root"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f6f9f7',
        color: '#0f172a',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        paddingBottom: '4rem',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .irv-solusi-page-root,
        .irv-solusi-page-root h1,
        .irv-solusi-page-root h2,
        .irv-solusi-page-root h3,
        .irv-solusi-page-root p {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
        .irv-solusi-container {
          width: 100%;
          max-width: 1360px;
          margin: 0 auto;
          padding-left: clamp(0.75rem, 2.5vw, 2rem);
          padding-right: clamp(0.75rem, 2.5vw, 2rem);
          box-sizing: border-box;
        }
        .irv-pillars-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }
        .irv-simulator-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 1.5rem;
        }
        .irv-trust-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .irv-header-desktop-nav {
          display: flex;
        }
        .irv-header-mobile-toggle {
          display: none;
        }
        @media (max-width: 1024px) {
          .irv-pillars-grid {
            grid-template-columns: 1fr;
          }
          .irv-simulator-grid {
            grid-template-columns: 1fr;
          }
          .irv-trust-grid {
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
          /* Ergonomic Mobile Sizing */
          .irv-solusi-hero {
            padding: 1.25rem 1rem !important;
            border-radius: 14px !important;
          }
          .irv-solusi-hero h1 {
            font-size: clamp(1.25rem, 5.2vw, 1.55rem) !important;
            line-height: 1.22 !important;
          }
          .irv-solusi-hero p {
            font-size: 0.82rem !important;
            line-height: 1.45 !important;
          }
          .irv-pillar-card {
            padding: 1.15rem 1rem !important;
            border-radius: 14px !important;
          }
          .irv-mockup-wrapper {
            margin-bottom: 0.85rem !important;
          }
          .irv-sim-section {
            padding: 1.25rem 1rem !important;
            border-radius: 16px !important;
          }
        }
      `}</style>

      {/* 1. STICKY TOP NAVBAR (B2B Pure Navbar - No Layanan Dropdown) */}
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
          className="irv-solusi-container"
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
          {/* Left: Brand Logo + Back link to Partnership */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link href="/partnership" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <img
                src="/irvite-logo.png"
                alt="IRVITE.ID"
                style={{ height: '22px', width: 'auto', objectFit: 'contain' }}
              />
            </Link>

            <div className="irv-header-desktop-nav" style={{ alignItems: 'center', gap: '0.85rem' }}>
              <Link
                href="/partnership"
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#1b3b2b',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  background: '#edf5f0',
                }}
              >
                <span>← {t.backToSummary}</span>
              </Link>

              <Link
                href="/tiket"
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: '#475569',
                  textDecoration: 'none',
                  padding: '0.3rem 0.5rem',
                }}
              >
                {t.navTicketCatalog}
              </Link>
            </div>
          </div>

          {/* Right Group (Desktop): Language Selector + Panel EO + Daftar Event */}
          <div className="irv-header-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Language Selector */}
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
                  borderRadius: '6px',
                  color: '#0d253f',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <span>🌐 {currentLang}</span>
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
                      minWidth: '150px',
                      background: '#ffffff',
                      borderRadius: '8px',
                      boxShadow: '0 10px 24px rgba(15, 23, 42, 0.15)',
                      border: '1px solid #e2e8f0',
                      padding: '0.3rem',
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
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: currentLang === 'ID' ? '#edf4f0' : 'transparent',
                        color: currentLang === 'ID' ? '#1b3b2b' : '#334155',
                        fontWeight: currentLang === 'ID' ? 800 : 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      🇮🇩 ID
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
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: currentLang === 'EN' ? '#edf4f0' : 'transparent',
                        color: currentLang === 'EN' ? '#1b3b2b' : '#334155',
                        fontWeight: currentLang === 'EN' ? 800 : 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginTop: '0.1rem',
                      }}
                    >
                      🇬🇧 EN
                    </button>
                  </div>
                </>
              )}
            </div>

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
              }}
            >
              <span>{t.loginPanel}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </a>

            <Link
              href="/partnership#daftar-event"
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
              }}
            >
              <span>{t.registerNow}</span>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <div className="irv-header-mobile-toggle">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Menu"
              style={{
                background: mobileMenuOpen ? '#f1f5f9' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                padding: '0.4rem',
                color: '#0d253f',
                cursor: 'pointer',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
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
                borderRadius: '12px',
                padding: '1rem',
                boxShadow: '0 16px 36px rgba(15, 23, 42, 0.2)',
                border: '1px solid #e2e8f0',
                zIndex: 70,
              }}
            >
              <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '0.8rem' }}>
                <Link
                  href="/partnership"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    background: '#edf5f0',
                    color: '#1b3b2b',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    textDecoration: 'none',
                  }}
                >
                  ← {t.backToSummary}
                </Link>

                <Link
                  href="/partnership#daftar-event"
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
                  {t.registerNow}
                </Link>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link
                  href="/tiket"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ textDecoration: 'none', color: '#475569', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  🎟️ {t.navTicketCatalog}
                </Link>

                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentLang('ID');
                      if (typeof window !== 'undefined') window.localStorage.setItem('irvite_lang', 'ID');
                    }}
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '5px',
                      border: currentLang === 'ID' ? '1.5px solid #1b3b2b' : '1px solid #cbd5e1',
                      background: currentLang === 'ID' ? '#edf5f0' : '#ffffff',
                      color: currentLang === 'ID' ? '#1b3b2b' : '#64748b',
                      fontWeight: 800,
                      fontSize: '0.72rem',
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
                      padding: '0.25rem 0.5rem',
                      borderRadius: '5px',
                      border: currentLang === 'EN' ? '1.5px solid #1b3b2b' : '1px solid #cbd5e1',
                      background: currentLang === 'EN' ? '#edf4f0' : '#ffffff',
                      color: currentLang === 'EN' ? '#1b3b2b' : '#64748b',
                      fontWeight: 800,
                      fontSize: '0.72rem',
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

      {/* 2. MAIN SOLUTIONS DEEP-DIVE CONTENT */}
      <main className="irv-solusi-container" style={{ paddingTop: '1.25rem' }}>
        {/* Breadcrumb & Page Header */}
        <section
          className="irv-solusi-hero"
          style={{
            background: 'linear-gradient(135deg, #11291d 0%, #1b3b2b 100%)',
            borderRadius: '18px',
            padding: 'clamp(1.5rem, 3vw, 2.5rem)',
            color: '#ffffff',
            marginBottom: '1.75rem',
            boxShadow: '0 12px 32px rgba(17, 41, 29, 0.14)',
          }}
        >
          <div style={{ maxWidth: '820px' }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#e5c170',
                background: 'rgba(229, 193, 112, 0.12)',
                border: '1px solid rgba(229, 193, 112, 0.28)',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                marginBottom: '0.65rem',
              }}
            >
              {t.breadcrumb}
            </span>

            <h1
              style={{
                fontSize: 'clamp(1.5rem, 2.8vw, 2.2rem)',
                fontWeight: 900,
                lineHeight: 1.2,
                margin: '0 0 0.65rem 0',
                color: '#ffffff',
              }}
            >
              {t.pageTitle}
            </h1>

            <p
              style={{
                fontSize: 'clamp(0.85rem, 1.2vw, 0.95rem)',
                color: '#d1e3d9',
                lineHeight: 1.55,
                margin: '0 0 1.25rem 0',
              }}
            >
              {t.pageDesc}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
              <Link
                href="/partnership#daftar-event"
                style={{
                  padding: '0.65rem 1.15rem',
                  borderRadius: '8px',
                  background: '#c5a059',
                  color: '#11291d',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  textDecoration: 'none',
                }}
              >
                {t.bottomCtaRegisterBtn}
              </Link>
              <a
                href="#simulasi-finansial"
                style={{
                  padding: '0.65rem 1.15rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1.5px solid rgba(255, 255, 255, 0.25)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  textDecoration: 'none',
                }}
              >
                Hitung Simulasi Pendapatan ↓
              </a>
            </div>
          </div>
        </section>

        {/* 3 CONCRETE SOLUTION PILLARS WITH RICH VISUAL MOCKUPS & SPECS */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 1.5rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#1b3b2b',
                background: '#edf5f0',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                display: 'inline-block',
                marginBottom: '0.35rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {t.pillarsBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.35rem, 2.3vw, 1.85rem)', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              {t.pillarsTitle}
            </h2>
          </div>

          <div className="irv-pillars-grid">
            {/* Pilar 1: Automated Ticketing + E-Ticket Pass Mockup */}
            <div
              className="irv-pillar-card"
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '1.5rem',
                border: '1.5px solid #d5e4dc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#edf5f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.85rem',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1b3b2b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.4rem 0', color: '#0f172a' }}>
                  {t.pillar1Title}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: '0 0 0.85rem 0' }}>
                  {t.pillar1Desc}
                </p>

                {/* Visual Mockup: Digital Concert E-Ticket Pass (Ergonomic Scale) */}
                <div
                  className="irv-mockup-wrapper"
                  style={{
                    background: 'linear-gradient(135deg, #0d251e 0%, #1b3b2b 100%)',
                    borderRadius: '12px',
                    padding: '0.85rem',
                    color: '#ffffff',
                    position: 'relative',
                    overflow: 'hidden',
                    marginBottom: '1rem',
                    border: '1px solid rgba(197, 160, 89, 0.35)',
                    boxShadow: '0 6px 20px rgba(17, 41, 29, 0.12)',
                  }}
                >
                  {/* Perforated Notches */}
                  <div style={{ position: 'absolute', top: '50%', left: '-7px', transform: 'translateY(-50%)', width: '14px', height: '14px', borderRadius: '50%', background: '#ffffff' }} />
                  <div style={{ position: 'absolute', top: '50%', right: '-7px', transform: 'translateY(-50%)', width: '14px', height: '14px', borderRadius: '50%', background: '#ffffff' }} />

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#e5c170', letterSpacing: '0.04em' }}>
                      IRVITE CONCERT PASS
                    </span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, background: '#c5a059', color: '#11291d', padding: '0.12rem 0.4rem', borderRadius: '4px' }}>
                      VIP ACCESS
                    </span>
                  </div>

                  {/* Body & QR Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.65rem', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
                        INDIE SOUNDWAVE
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#c5d9ce', marginTop: '2px' }}>
                        Rian Pratama • Gate 01 VIP
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: 700, marginTop: '3px' }}>
                        ✓ LUNAS via QRIS Instant
                      </div>
                    </div>
                    {/* QR Code SVG Miniature */}
                    <div style={{ background: '#ffffff', padding: '0.3rem', borderRadius: '5px', flexShrink: 0 }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="#0d251e">
                        <rect x="2" y="2" width="6" height="6" rx="1" fill="#0d251e" />
                        <rect x="4" y="4" width="2" height="2" fill="#ffffff" />
                        <rect x="16" y="2" width="6" height="6" rx="1" fill="#0d251e" />
                        <rect x="18" y="4" width="2" height="2" fill="#ffffff" />
                        <rect x="2" y="16" width="6" height="6" rx="1" fill="#0d251e" />
                        <rect x="4" y="18" width="2" height="2" fill="#ffffff" />
                        <rect x="10" y="3" width="3" height="3" fill="#0d251e" />
                        <rect x="10" y="8" width="4" height="3" fill="#0d251e" />
                        <rect x="15" y="10" width="3" height="4" fill="#0d251e" />
                        <rect x="10" y="14" width="3" height="3" fill="#0d251e" />
                        <rect x="15" y="16" width="7" height="6" fill="#0d251e" />
                      </svg>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px dashed rgba(255,255,255,0.2)', paddingTop: '0.35rem', fontSize: '0.65rem', color: '#a7f3d0' }}>
                    ⚡ Terkirim otomatis ke WhatsApp penonton dlm 0.8 dtk
                  </div>
                </div>

                {/* Feature Bullet Points */}
                <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.85rem' }}>
                  {t.pillar1Highlights.map((pt, pIdx) => (
                    <div key={pIdx} style={{ fontSize: '0.76rem', color: '#334155', display: 'flex', gap: '0.4rem', lineHeight: 1.4 }}>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>•</span>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
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

            {/* Pilar 2: Smartphone Gate Scanner + Phone Camera Mockup */}
            <div
              className="irv-pillar-card"
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '1.5rem',
                border: '1.5px solid #d5e4dc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#edf5f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.85rem',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1b3b2b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.4rem 0', color: '#0f172a' }}>
                  {t.pillar2Title}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: '0 0 0.85rem 0' }}>
                  {t.pillar2Desc}
                </p>

                {/* Visual Mockup: Smartphone Gate Scanner Device Frame */}
                <div
                  className="irv-mockup-wrapper"
                  style={{
                    background: '#0f172a',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    color: '#ffffff',
                    marginBottom: '1rem',
                    border: '1.5px solid #334155',
                    boxShadow: '0 6px 20px rgba(15, 23, 42, 0.15)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', paddingBottom: '0.3rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>GATE SCANNER CAMERA</span>
                    </div>
                    <span style={{ fontSize: '0.62rem', color: '#64748b' }}>HP Panitia</span>
                  </div>

                  <div
                    style={{
                      background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.9) 80%)',
                      border: '1.5px solid rgba(16, 185, 129, 0.4)',
                      borderRadius: '8px',
                      padding: '0.65rem',
                      textAlign: 'center',
                      position: 'relative',
                      marginBottom: '0.4rem',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ position: 'absolute', top: '35%', left: '10%', right: '10%', height: '2px', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                    <div style={{ fontSize: '0.65rem', color: '#6ee7b7', fontWeight: 700, marginBottom: '0.25rem' }}>
                      [ TARGET TIKET QR TERDETEKSI ]
                    </div>
                    <div style={{ background: '#10b981', color: '#064e3b', borderRadius: '6px', padding: '0.35rem 0.55rem', fontWeight: 900, fontSize: '0.78rem', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.35)' }}>
                      ✓ VALID — SILAKAN MASUK
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#ffffff', fontWeight: 700, marginTop: '0.25rem' }}>
                      Rian Pratama • Presale 1 • Gate 01
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: '#94a3b8' }}>
                    <span>Speed: <strong>0.3 dtk/scan</strong></span>
                    <span>Anti-Tiket Ganda: <strong style={{ color: '#34d399' }}>100% Aktif</strong></span>
                  </div>
                </div>

                {/* Feature Bullet Points */}
                <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.85rem' }}>
                  {t.pillar2Highlights.map((pt, pIdx) => (
                    <div key={pIdx} style={{ fontSize: '0.76rem', color: '#334155', display: 'flex', gap: '0.4rem', lineHeight: 1.4 }}>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>•</span>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
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

            {/* Pilar 3: Waterproof Wristband + Tactile Wristbands Display Mockup */}
            <div
              className="irv-pillar-card"
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                padding: '1.5rem',
                border: '1.5px solid #d5e4dc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#edf5f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.85rem',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="7" />
                    <polyline points="12 9 12 12 13.5 13.5" />
                    <path d="M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.4rem 0', color: '#0f172a' }}>
                  {t.pillar3Title}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: '0 0 0.85rem 0' }}>
                  {t.pillar3Desc}
                </p>

                {/* Visual Mockup: Tactile Festival Wristbands Display */}
                <div
                  className="irv-mockup-wrapper"
                  style={{
                    background: '#f8faf9',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    border: '1.5px solid #d5e4dc',
                  }}
                >
                  {/* Band 1: Tyvek Concert Standard */}
                  <div
                    style={{
                      background: 'linear-gradient(90deg, #1b3b2b 0%, #25573e 70%, #d97706 100%)',
                      borderRadius: '6px',
                      padding: '0.45rem 0.65rem',
                      color: '#ffffff',
                      marginBottom: '0.45rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 3px 10px rgba(27, 59, 43, 0.14)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#fef08a' }}>
                        TYVEK CONCERT WRISTBAND
                      </div>
                      <div style={{ fontSize: '0.6rem', opacity: 0.9 }}>
                        Waterproof • Serat Anti-Sobek #08819
                      </div>
                    </div>
                    {/* Miniature Barcode Lines */}
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center', background: '#ffffff', padding: '0.15rem 0.3rem', borderRadius: '3px' }}>
                      <span style={{ width: '2px', height: '14px', background: '#000' }} />
                      <span style={{ width: '3px', height: '14px', background: '#000' }} />
                      <span style={{ width: '1px', height: '14px', background: '#000' }} />
                      <span style={{ width: '3px', height: '14px', background: '#000' }} />
                      <span style={{ width: '2px', height: '14px', background: '#000' }} />
                    </div>
                  </div>

                  {/* Band 2: VIP Woven Fabric Lanyard */}
                  <div
                    style={{
                      background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 75%, #c5a059 100%)',
                      borderRadius: '6px',
                      padding: '0.45rem 0.65rem',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 3px 10px rgba(15, 23, 42, 0.1)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#e5c170' }}>
                        VIP WOVEN FABRIC LANYARD
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#cbd5e1' }}>
                        Kain Tenun Mewah • One-Way Barrel Lock
                      </div>
                    </div>
                    <span style={{ fontSize: '0.58rem', fontWeight: 800, background: '#c5a059', color: '#11291d', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>
                      VIP PASS
                    </span>
                  </div>

                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, marginTop: '0.45rem', textAlign: 'center' }}>
                    ✓ Cetak Barcode 300 DPI Siap Kirim ke Seluruh Indonesia
                  </div>
                </div>

                {/* Feature Bullet Points */}
                <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.85rem' }}>
                  {t.pillar3Highlights.map((pt, pIdx) => (
                    <div key={pIdx} style={{ fontSize: '0.76rem', color: '#334155', display: 'flex', gap: '0.4rem', lineHeight: 1.4 }}>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>•</span>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
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
        </section>

        {/* REVENUE CALCULATOR FOR EO (Interactive Simulator) */}
        <section
          id="simulasi-finansial"
          className="irv-sim-section"
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: 'clamp(1.5rem, 3vw, 2.5rem)',
            border: '1.5px solid #d5e4dc',
            marginBottom: '2.5rem',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ maxWidth: '640px', marginBottom: '1.5rem' }}>
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
              {t.simBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.35rem, 2.2vw, 1.8rem)', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#0f172a' }}>
              {t.simTitle}
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
              {t.simDesc}
            </p>
          </div>

          <div className="irv-simulator-grid">
            {/* Input Controls */}
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                    {t.ticketPriceLabel}
                  </label>
                  <strong style={{ fontSize: '0.9rem', color: '#1b3b2b' }}>{formatRupiah(ticketPrice)}</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1000000}
                  step={10000}
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#1b3b2b', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                    {t.ticketSoldLabel}
                  </label>
                  <strong style={{ fontSize: '0.9rem', color: '#1b3b2b' }}>
                    {estimatedSold} {t.soldUnit}
                  </strong>
                </div>
                <input
                  type="range"
                  min={20}
                  max={3000}
                  step={20}
                  value={estimatedSold}
                  onChange={(e) => setEstimatedSold(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#1b3b2b', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                  {t.feeSchemeLabel}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setFeeBearer('buyer')}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: feeBearer === 'buyer' ? '2px solid #1b3b2b' : '1px solid #cbd5e1',
                      background: feeBearer === 'buyer' ? '#edf5f0' : '#ffffff',
                      color: feeBearer === 'buyer' ? '#1b3b2b' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>{t.feePaidByBuyer}</div>
                    <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>{t.feePaidByBuyerSub}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeeBearer('organizer')}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: feeBearer === 'organizer' ? '2px solid #1b3b2b' : '1px solid #cbd5e1',
                      background: feeBearer === 'organizer' ? '#edf5f0' : '#ffffff',
                      color: feeBearer === 'organizer' ? '#1b3b2b' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>{t.feeAbsorbedByOrg}</div>
                    <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>{t.feeAbsorbedByOrgSub}</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Output Calculation Result */}
            <div
              style={{
                background: '#f8faf9',
                borderRadius: '16px',
                padding: '1.25rem',
                border: '1.5px solid #d5e4dc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'grid', gap: '0.6rem', fontSize: '0.84rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>{t.buyerPayPerTicket}</span>
                  <strong>{formatRupiah(buyerCheckoutPrice)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>
                    {t.grossSalesLabel} ({estimatedSold} {t.soldUnit}):
                  </span>
                  <strong>{formatRupiah(grossTicketSales)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>{t.platformFeeLabel}</span>
                  <strong>
                    {formatRupiah(totalPlatformFee)}{' '}
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                      ({feeBearer === 'buyer' ? t.paidByBuyerTag : t.deductedFromEoTag})
                    </span>
                  </strong>
                </div>
              </div>

              <div
                style={{
                  borderTop: '1.5px dashed #bfd4c8',
                  paddingTop: '0.85rem',
                  marginTop: '1rem',
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#2d6a4f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t.netPayoutTitle}
                </div>
                <div style={{ fontSize: 'clamp(1.4rem, 2.2vw, 1.95rem)', fontWeight: 900, color: '#1b3b2b', marginTop: '0.15rem' }}>
                  {formatRupiah(netOrganizerPayout)}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {t.payoutNote}
                </div>
              </div>

              {/* Savings Comparison vs Percentage Commission */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #edf5f0 0%, #ffffff 100%)',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  border: '1.5px solid #a7f3d0',
                  marginTop: '0.85rem',
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                  💡 KEUNTUNGAN FLAT RP 3.000 VS KOMISI 5%
                </div>
                <div style={{ fontSize: '0.74rem', color: '#334155', lineHeight: 1.4, marginBottom: '0.35rem' }}>
                  Jika platform komisi 5% (Rp {((ticketPrice * 0.05)).toLocaleString('id-ID')}/tiket), potongan mencapai <strong>Rp {((ticketPrice * 0.05 * estimatedSold)).toLocaleString('id-ID')}</strong>.
                </div>
                {ticketPrice >= 70000 && (
                  <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', borderRadius: '6px', padding: '0.35rem 0.55rem', fontWeight: 800, fontSize: '0.78rem' }}>
                    💰 Bersama IRVITE, Anda Menghemat {formatRupiah(Math.max(0, (ticketPrice * 0.05 - 3000) * estimatedSold))}!
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 4-STEP ONBOARDING & FINANCIAL TRUST */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 1.5rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#1b3b2b',
                background: '#edf5f0',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                display: 'inline-block',
                marginBottom: '0.35rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {t.stepsBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.35rem, 2.3vw, 1.85rem)', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              {t.stepsTitle}
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {t.steps.map((st) => (
              <div
                key={st.step}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  padding: '1.15rem',
                  border: '1.5px solid #d5e4dc',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 3px 12px rgba(15, 23, 42, 0.03)',
                }}
              >
                <div>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#1b3b2b',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.65rem',
                    }}
                  >
                    {st.step}
                  </div>
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 800, margin: '0 0 0.35rem', color: '#0f172a' }}>
                    {st.title}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.45, margin: 0 }}>
                    {st.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Financial Trust & Guarantees */}
          <div className="irv-trust-grid">
            {t.trustCards.map((card) => (
              <div
                key={card.title}
                style={{
                  background: '#edf5f0',
                  borderRadius: '14px',
                  padding: '1.15rem',
                  border: '1px solid #bfd4c8',
                }}
              >
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#13281e', marginBottom: '0.2rem' }}>
                  {card.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#476355', lineHeight: 1.45 }}>
                  {card.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BOTTOM CONVERSION CTA BANNER */}
        <section
          style={{
            background: 'linear-gradient(135deg, #1b3b2b 0%, #11291d 100%)',
            borderRadius: '18px',
            padding: 'clamp(1.5rem, 3vw, 2.25rem)',
            color: '#ffffff',
            textAlign: 'center',
            boxShadow: '0 16px 40px rgba(17, 41, 29, 0.16)',
          }}
        >
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.35rem, 2.3vw, 1.85rem)', fontWeight: 800, margin: '0 0 0.5rem', color: '#ffffff' }}>
              {t.bottomCtaTitle}
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#d1e3d9', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
              {t.bottomCtaDesc}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <Link
                href="/partnership#daftar-event"
                style={{
                  padding: '0.8rem 1.5rem',
                  borderRadius: '10px',
                  background: '#c5a059',
                  color: '#11291d',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(197, 160, 89, 0.35)',
                }}
              >
                {t.bottomCtaRegisterBtn}
              </Link>

              <a
                href="https://wa.me/6281234567890?text=Halo%20Tim%20Partnership%20IRVITE.ID,%20saya%20ingin%20konsultasi%20mengenai%20fitur%20ticketing%20dan%20gate%20scanner."
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.8rem 1.35rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1.5px solid rgba(255, 255, 255, 0.28)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                }}
              >
                {t.bottomCtaWaBtn}
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
