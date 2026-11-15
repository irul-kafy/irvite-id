'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRupiah, PLATFORM_FEE_PER_TICKET } from '@/lib/ticketing-store';

const PARTNERSHIP_TEXT = {
  ID: {
    services: 'Layanan',
    ticketService: 'Tiket Event',
    ticketServiceDesc: 'Katalog & E-Ticket Pembeli',
    invitationService: 'Undangan Pernikahan',
    invitationServiceDesc: 'Desain Eksklusif & RSVP Digital',
    loginPanel: 'Masuk Panel EO',
    createEventNow: 'Buat Event Sekarang',
    badge: 'PARTNERSHIP PENYELENGGARA EVENT • IRVITE.ID',
    heroTitle: 'Semua Kebutuhan Penjualan Tiket & Operasional Acara dalam Satu Ekosistem',
    heroDesc: 'Solusi terpadu untuk konser musik, festival, seminar, dan acara kampus. Dari penjualan tiket online otomatis (QRIS & Virtual Account), scanner gerbang smartphone panitia tanpa sewa alat, tiket gelang fisik 300 DPI tahan air, hingga pencairan dana H+1 acara.',
    consultBtn: 'Konsultasi & Daftarkan Event Sekarang',
    adminLoginBtn: 'Masuk ke Web Admin EO',
    stats: [
      { title: 'Rp 3.000 Flat', desc: 'Per tiket terjual (Rp 0 untuk event gratis)' },
      { title: 'Settlement H+1', desc: 'Pencairan otomatis ke rekening resmi panitia' },
      { title: '0 Alat Khusus', desc: 'Scan tiket cukup pakai smartphone panitia' },
      { title: '100% Anti-Duplikat', desc: 'Enkripsi QR unik & validasi gate real-time' },
    ],
    pillarsBadge: '3 PILAR UTAMA OPERASIONAL ACARA',
    pillarsTitle: 'Ekosistem Lengkap dari Penjualan Tiket hingga Hari-H Venue',
    pillar1Title: '1. Sistem Ticketing & Pembayaran Otomatis',
    pillar1Desc: 'Buka penjualan tiket multi-tier (Early Bird, Presale, VIP) dengan metode pembayaran lengkap QRIS, GoPay, OVO, ShopeePay, dan Virtual Account semua bank. E-ticket QR langsung dikirim otomatis via WhatsApp & Email penonton.',
    pillar1Tags: ['Multi-Tier Kuota', 'QRIS & Virtual Account', 'Pengiriman WhatsApp Instan', 'Dashboard Real-Time'],
    pillar2Title: '2. Scanner Gerbang Masuk via Smartphone Gratis',
    pillar2Desc: 'Lupakan biaya sewa alat scanner barcode jutaan rupiah. Seluruh staf panitia di gerbang pintu masuk cukup menggunakan smartphone masing-masing untuk validasi tiket QR. Terkoneksi cloud real-time sehingga 1 tiket mustahil digunakan dua kali.',
    pillar2Tags: ['Tanpa Biaya Sewa Scanner', 'Support Multi-Pintu Masuk', 'Validasi Super Cepat (<0.5 Detik)', 'Deteksi Tiket Ganda'],
    pillar3Title: '3. Tiket Gelang Fisik (Wristband) 300 DPI Tahan Air',
    pillar3Desc: 'Untuk konser musik dan festival berkapasitas besar, kami menyediakan tiket gelang Tyvek dan Lanyard VIP tahan sobek, tahan air, dengan cetakan barcode/QR presisi tinggi 300 DPI siap pakai dan siap kirim ke seluruh kota Indonesia.',
    pillar3Tags: ['Bahan Tyvek Anti-Sobek', 'Tahan Air & Keringat', 'Barcode / QR Presisi 300 DPI', 'Pengiriman ke Seluruh Indonesia'],
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
        a: 'Dana hasil penjualan tiket dicairkan otomatis pada H+1 setelah acara selesai (maksimal 1x24 jam kerja) langsung ke rekening resmi panitia atau rekening penanggung jawab setelah proses rekonsiliasi data gerbang selesai.',
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
    services: 'Services',
    ticketService: 'Event Tickets',
    ticketServiceDesc: 'Catalog & Buyer E-Tickets',
    invitationService: 'Digital Invitations',
    invitationServiceDesc: 'Exclusive Designs & Online RSVP',
    loginPanel: 'Organizer Portal',
    createEventNow: 'Create Event Now',
    badge: 'EVENT ORGANIZER PARTNERSHIP • IRVITE.ID',
    heroTitle: 'All Ticket Sales & Event Operational Needs in One Unified Ecosystem',
    heroDesc: 'Integrated solutions for concerts, festivals, conferences, and university events. From automated online ticketing (QRIS & Virtual Accounts), free smartphone gate scanner with zero hardware rentals, waterproof 300 DPI physical wristbands, to D+1 revenue settlements.',
    consultBtn: 'Consult & Register Event Now',
    adminLoginBtn: 'Log in to Organizer Admin',
    stats: [
      { title: 'IDR 3,000 Flat', desc: 'Per ticket sold (IDR 0 for free events)' },
      { title: 'Settlement D+1', desc: 'Automatic payout to organizer bank account' },
      { title: '0 Hardware', desc: 'Scan tickets easily with staff smartphones' },
      { title: '100% Anti-Duplicate', desc: 'Unique QR encryption & real-time gate validation' },
    ],
    pillarsBadge: '3 CORE OPERATIONAL PILLARS',
    pillarsTitle: 'Complete Ecosystem from Ticket Presale to Venue Gate Day',
    pillar1Title: '1. Automated Ticketing & Payments',
    pillar1Desc: 'Launch multi-tier ticket sales (Early Bird, Presale, VIP) with instant payment channels including QRIS and Virtual Accounts across all banks. Dynamic QR E-tickets delivered automatically via WhatsApp & Email.',
    pillar1Tags: ['Multi-Tier Quotas', 'QRIS & Virtual Accounts', 'Instant WhatsApp Delivery', 'Real-Time Dashboard'],
    pillar2Title: '2. Free Smartphone Gate Entrance Scanner',
    pillar2Desc: 'Eliminate expensive scanner rental fees. Gate staff use their own smartphones to validate QR tickets. Cloud-synced in real-time to guarantee 100% protection against duplicate or fraudulent entries.',
    pillar2Tags: ['Zero Rental Costs', 'Multi-Gate Support', 'Sub-second Validation (<0.5s)', 'Duplicate Detection'],
    pillar3Title: '3. Waterproof 300 DPI Physical Wristbands',
    pillar3Desc: 'For large-scale music concerts and festivals, we provide tamper-proof, waterproof Tyvek wristbands and VIP Lanyards featuring high-definition 300 DPI barcodes, delivered directly to your venue.',
    pillar3Tags: ['Tear-Proof Tyvek Material', 'Waterproof & Sweatproof', 'Precision 300 DPI Barcodes', 'Nationwide Delivery'],
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
  // Navigation & Language Switcher State (Synced with /tiket)
  const [currentLang, setCurrentLang] = useState<'ID' | 'EN'>('ID');
  const [servicesMenuOpen, setServicesMenuOpen] = useState<boolean>(false);
  const [langMenuOpen, setLangMenuOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Revenue Simulator State
  const [ticketPrice, setTicketPrice] = useState<number>(150000);
  const [estimatedSold, setEstimatedSold] = useState<number>(350);
  const [feeBearer, setFeeBearer] = useState<'buyer' | 'organizer'>('buyer');

  // Quick Inquiry Form State
  const [orgName, setOrgName] = useState<string>('');
  const [eventName, setEventName] = useState<string>('');
  const [attendeeCount, setAttendeeCount] = useState<string>('300 - 500');
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

  const grossTicketSales = ticketPrice * estimatedSold;
  const totalPlatformFee = ticketPrice > 0 ? PLATFORM_FEE_PER_TICKET * estimatedSold : 0;
  const netOrganizerPayout =
    feeBearer === 'buyer' ? grossTicketSales : Math.max(0, grossTicketSales - totalPlatformFee);
  const buyerCheckoutPrice =
    feeBearer === 'buyer' && ticketPrice > 0 ? ticketPrice + PLATFORM_FEE_PER_TICKET : ticketPrice;

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
        paddingBottom: '5rem',
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
          max-width: 1720px;
          margin: 0 auto;
          padding-left: clamp(1rem, 3.2vw, 3rem);
          padding-right: clamp(1rem, 3.2vw, 3rem);
          box-sizing: border-box;
        }
        .irv-header-logo-img {
          height: 22px;
          width: auto;
          object-fit: contain;
          display: block;
        }
        .irv-hero-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        .irv-pillars-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .irv-simulator-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 2rem;
        }
        .irv-form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
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
          .irv-hero-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
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
          .irv-header-logo-img {
            height: 18px;
          }
          .irv-hero-stats-grid {
            grid-template-columns: 1fr;
          }
          .irv-form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* 1. STICKY TOP NAVBAR */}
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
            minHeight: '62px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.25rem',
            paddingTop: '0.65rem',
            paddingBottom: '0.65rem',
          }}
        >
          {/* Left Group: Brand Logo + Layanan Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link href="/partnership" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <img
                src="/irvite-logo.png"
                alt="IRVITE.ID"
                className="irv-header-logo-img"
              />
            </Link>

            {/* Layanan Dropdown Button (Desktop) */}
            <div className="irv-header-desktop-nav" style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setServicesMenuOpen((prev) => !prev);
                  setLangMenuOpen(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: servicesMenuOpen ? '#f1f5f9' : 'transparent',
                  border: 'none',
                  padding: '0.4rem 0.65rem',
                  borderRadius: '8px',
                  color: '#0d253f',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                aria-expanded={servicesMenuOpen}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0d253f"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
                <span>{t.services}</span>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0d253f"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: servicesMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.18s ease',
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {servicesMenuOpen && (
                <>
                  <div
                    onClick={() => setServicesMenuOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 65 }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: 0,
                      minWidth: '240px',
                      background: '#ffffff',
                      borderRadius: '12px',
                      boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16)',
                      border: '1px solid #e2e8f0',
                      padding: '0.45rem',
                      zIndex: 70,
                    }}
                  >
                    <div
                      style={{
                        padding: '0.35rem 0.65rem 0.5rem',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {currentLang === 'EN' ? 'Platform Ecosystem' : 'Ekosistem Platform'}
                    </div>

                    {/* 1. Tiket Event */}
                    <Link
                      href="/tiket"
                      onClick={() => setServicesMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.7rem',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: '#1e293b',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        marginBottom: '0.2rem',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1b3b2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                          <path d="M13 5v2" />
                          <path d="M13 17v2" />
                          <path d="M13 11v2" />
                        </svg>
                        <div>
                          <div>{t.ticketService}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                            {t.ticketServiceDesc}
                          </div>
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>

                    {/* 2. Undangan Pernikahan */}
                    <Link
                      href="/undangan"
                      onClick={() => setServicesMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.7rem',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: '#1e293b',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H17.5C20 5 22 7 22 9.5V17Z" />
                          <path d="m2 7 10 7 10-7" />
                        </svg>
                        <div>
                          <div>{t.invitationService}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                            {t.invitationServiceDesc}
                          </div>
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Group (Desktop): Language ID/EN + Masuk Panel EO + Buat Event Sekarang */}
          <div className="irv-header-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Language Selector Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setLangMenuOpen((prev) => !prev);
                  setServicesMenuOpen(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: langMenuOpen ? '#f1f5f9' : 'transparent',
                  border: 'none',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '8px',
                  color: '#0d253f',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                aria-label="Pilih Bahasa"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d253f" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <path d="M12 3a14.5 14.5 0 0 1 0 18 14.5 14.5 0 0 1 0-18" />
                </svg>
                <span>{currentLang}</span>
                <svg
                  width="13"
                  height="13"
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
                      top: 'calc(100% + 8px)',
                      right: 0,
                      minWidth: '175px',
                      background: '#ffffff',
                      borderRadius: '12px',
                      boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16)',
                      border: '1px solid #e2e8f0',
                      padding: '0.45rem',
                      zIndex: 70,
                    }}
                  >
                    {/* Option 1: ID */}
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
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: currentLang === 'ID' ? '#edf4f0' : 'transparent',
                        color: currentLang === 'ID' ? '#1b3b2b' : '#334155',
                        fontWeight: currentLang === 'ID' ? 800 : 600,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🇮🇩</span>
                        <span>Indonesia (ID)</span>
                      </span>
                      {currentLang === 'ID' && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1b3b2b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>

                    {/* Option 2: EN */}
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
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: currentLang === 'EN' ? '#edf4f0' : 'transparent',
                        color: currentLang === 'EN' ? '#1b3b2b' : '#334155',
                        fontWeight: currentLang === 'EN' ? 800 : 600,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginTop: '0.15rem',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🇬🇧</span>
                        <span>English (EN)</span>
                      </span>
                      {currentLang === 'EN' && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1b3b2b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Masuk Panel EO Button (Links to Web Admin login) */}
            <a
              href="https://irvite-admin.vercel.app/login"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.05rem',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#0d253f',
                fontSize: '0.86rem',
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              <span>{t.loginPanel}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </a>

            {/* Buat Event Sekarang CTA Button */}
            <a
              href="#daftar-event"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.15rem',
                borderRadius: '10px',
                border: 'none',
                background: '#1b3b2b',
                color: '#ffffff',
                fontSize: '0.86rem',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(27, 59, 43, 0.25)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#13281e')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#1b3b2b')}
            >
              <span>{t.createEventNow}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                borderRadius: '8px',
                padding: '0.5rem',
                color: '#0d253f',
                cursor: 'pointer',
              }}
            >
              {mobileMenuOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                left: '1rem',
                right: '1rem',
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.15rem',
                boxShadow: '0 20px 48px rgba(15, 23, 42, 0.22)',
                border: '1px solid #e2e8f0',
                zIndex: 70,
              }}
            >
              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
                <a
                  href="#daftar-event"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    background: '#1b3b2b',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                  }}
                >
                  {t.createEventNow}
                </a>

                <a
                  href="https://irvite-admin.vercel.app/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.7rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0d253f',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    textDecoration: 'none',
                  }}
                >
                  {t.loginPanel} ↗
                </a>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'grid', gap: '0.65rem' }}>
                <Link
                  href="/tiket"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0',
                    textDecoration: 'none',
                    color: '#1e293b',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                  }}
                >
                  <span>🎟️ {t.ticketService}</span>
                  <span style={{ color: '#94a3b8' }}>›</span>
                </Link>

                <Link
                  href="/undangan"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0',
                    textDecoration: 'none',
                    color: '#1e293b',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                  }}
                >
                  <span>💍 {t.invitationService}</span>
                  <span style={{ color: '#94a3b8' }}>›</span>
                </Link>
              </div>

              {/* Mobile Language Switcher */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  {currentLang === 'EN' ? 'Language' : 'Bahasa'}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentLang('ID');
                      if (typeof window !== 'undefined') window.localStorage.setItem('irvite_lang', 'ID');
                    }}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.6rem',
                      borderRadius: '8px',
                      border: currentLang === 'ID' ? '1.5px solid #1b3b2b' : '1px solid #cbd5e1',
                      background: currentLang === 'ID' ? '#edf4f0' : '#ffffff',
                      color: currentLang === 'ID' ? '#1b3b2b' : '#475569',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    🇮🇩 Indonesia
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentLang('EN');
                      if (typeof window !== 'undefined') window.localStorage.setItem('irvite_lang', 'EN');
                    }}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.6rem',
                      borderRadius: '8px',
                      border: currentLang === 'EN' ? '1.5px solid #1b3b2b' : '1px solid #cbd5e1',
                      background: currentLang === 'EN' ? '#edf4f0' : '#ffffff',
                      color: currentLang === 'EN' ? '#1b3b2b' : '#475569',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    🇬🇧 English
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* 2. MAIN B2B CONTENT */}
      <main className="irv-part-container" style={{ paddingTop: '1.75rem' }}>
        {/* HERO SECTION (Executive B2B Positioning) */}
        <section
          style={{
            background: 'linear-gradient(135deg, #11291d 0%, #1b3b2b 55%, #244b37 100%)',
            borderRadius: '24px',
            padding: 'clamp(2rem, 4vw, 3.5rem)',
            color: '#ffffff',
            marginBottom: '2rem',
            boxShadow: '0 20px 48px rgba(17, 41, 29, 0.16)',
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
              width: '450px',
              height: '450px',
              background: 'radial-gradient(circle, rgba(197, 160, 89, 0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ maxWidth: '880px', position: 'relative', zIndex: 2 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.74rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#e5c170',
                background: 'rgba(229, 193, 112, 0.12)',
                border: '1px solid rgba(229, 193, 112, 0.28)',
                padding: '0.35rem 0.85rem',
                borderRadius: '999px',
                marginBottom: '1rem',
              }}
            >
              <span>{t.badge}</span>
            </span>

            <h1
              style={{
                fontSize: 'clamp(1.95rem, 3.8vw, 3rem)',
                fontWeight: 900,
                lineHeight: 1.15,
                margin: '0 0 1.15rem 0',
                letterSpacing: '-0.02em',
                color: '#ffffff',
              }}
            >
              {t.heroTitle}
            </h1>

            <p
              style={{
                fontSize: 'clamp(0.96rem, 1.4vw, 1.12rem)',
                color: '#d1e3d9',
                lineHeight: 1.65,
                margin: '0 0 2rem 0',
                maxWidth: '780px',
              }}
            >
              {t.heroDesc}
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
              <a
                href="#daftar-event"
                style={{
                  padding: '0.9rem 1.65rem',
                  borderRadius: '12px',
                  background: '#c5a059',
                  color: '#11291d',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 16px rgba(197, 160, 89, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>{t.consultBtn}</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>

              <a
                href="https://irvite-admin.vercel.app/login"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.9rem 1.45rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1.5px solid rgba(255, 255, 255, 0.22)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>{t.adminLoginBtn}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </a>
            </div>

            {/* 4 Stat Highlights in Hero */}
            <div className="irv-hero-stats-grid">
              {t.stats.map((stat) => (
                <div
                  key={stat.title}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '14px',
                    padding: '0.9rem 1.05rem',
                  }}
                >
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.2rem' }}>
                    {stat.title}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#c5d9ce', lineHeight: 1.4 }}>
                    {stat.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3 CONCRETE SOLUTION PILLARS */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 1.75rem' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#1b3b2b',
                background: '#edf5f0',
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                display: 'inline-block',
                marginBottom: '0.5rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {t.pillarsBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              {t.pillarsTitle}
            </h2>
          </div>

          <div className="irv-pillars-grid">
            {/* Pilar 1: Automated Ticketing */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '1.75rem',
                border: '1.5px solid #d5e4dc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#edf5f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1b3b2b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: '0 0 0.65rem 0', color: '#0f172a' }}>
                  {t.pillar1Title}
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
                  {t.pillar1Desc}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {t.pillar1Tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#1b3b2b',
                      background: '#edf5f0',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                    }}
                  >
                    ✓ {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Pilar 2: Smartphone Gate Scanner */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '1.75rem',
                border: '1.5px solid #d5e4dc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#edf5f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1b3b2b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: '0 0 0.65rem 0', color: '#0f172a' }}>
                  {t.pillar2Title}
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
                  {t.pillar2Desc}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {t.pillar2Tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#1b3b2b',
                      background: '#edf5f0',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                    }}
                  >
                    ✓ {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Pilar 3: Waterproof Wristband */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '1.75rem',
                border: '1.5px solid #d5e4dc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#edf5f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="7" />
                    <polyline points="12 9 12 12 13.5 13.5" />
                    <path d="M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, margin: '0 0 0.65rem 0', color: '#0f172a' }}>
                  {t.pillar3Title}
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
                  {t.pillar3Desc}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {t.pillar3Tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#8f6f2d',
                      background: '#fbf7ee',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
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
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: 'clamp(1.75rem, 3.5vw, 2.75rem)',
            border: '1.5px solid #d5e4dc',
            marginBottom: '2.5rem',
            boxShadow: '0 12px 36px rgba(15, 23, 42, 0.05)',
          }}
        >
          <div style={{ maxWidth: '680px', marginBottom: '2rem' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#1b3b2b',
                background: '#edf5f0',
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                display: 'inline-block',
                marginBottom: '0.5rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {t.simBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.45rem, 2.4vw, 1.95rem)', fontWeight: 800, margin: '0 0 0.45rem 0', color: '#0f172a' }}>
              {t.simTitle}
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.55, margin: 0 }}>
              {t.simDesc}
            </p>
          </div>

          <div className="irv-simulator-grid">
            {/* Input Controls */}
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                    {t.ticketPriceLabel}
                  </label>
                  <strong style={{ fontSize: '0.92rem', color: '#1b3b2b' }}>{formatRupiah(ticketPrice)}</strong>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                    {t.ticketSoldLabel}
                  </label>
                  <strong style={{ fontSize: '0.92rem', color: '#1b3b2b' }}>
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
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.45rem', color: '#334155' }}>
                  {t.feeSchemeLabel}
                </label>
                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => setFeeBearer('buyer')}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: feeBearer === 'buyer' ? '2px solid #1b3b2b' : '1px solid #cbd5e1',
                      background: feeBearer === 'buyer' ? '#edf5f0' : '#ffffff',
                      color: feeBearer === 'buyer' ? '#1b3b2b' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>{t.feePaidByBuyer}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>{t.feePaidByBuyerSub}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeeBearer('organizer')}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: feeBearer === 'organizer' ? '2px solid #1b3b2b' : '1px solid #cbd5e1',
                      background: feeBearer === 'organizer' ? '#edf5f0' : '#ffffff',
                      color: feeBearer === 'organizer' ? '#1b3b2b' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>{t.feeAbsorbedByOrg}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>{t.feeAbsorbedByOrgSub}</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Output Calculation Result */}
            <div
              style={{
                background: '#f8faf9',
                borderRadius: '18px',
                padding: '1.5rem',
                border: '1.5px solid #d5e4dc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.88rem' }}>
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
                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                      ({feeBearer === 'buyer' ? t.paidByBuyerTag : t.deductedFromEoTag})
                    </span>
                  </strong>
                </div>
              </div>

              <div
                style={{
                  borderTop: '1.5px dashed #bfd4c8',
                  paddingTop: '1rem',
                  marginTop: '1.25rem',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2d6a4f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t.netPayoutTitle}
                </div>
                <div style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.1rem)', fontWeight: 900, color: '#1b3b2b', marginTop: '0.2rem' }}>
                  {formatRupiah(netOrganizerPayout)}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.35rem' }}>
                  {t.payoutNote}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4-STEP ONBOARDING & FINANCIAL TRUST */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 1.75rem' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#1b3b2b',
                background: '#edf5f0',
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                display: 'inline-block',
                marginBottom: '0.5rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {t.stepsBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              {t.stepsTitle}
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2rem',
            }}
          >
            {t.steps.map((st) => (
              <div
                key={st.step}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.35rem',
                  border: '1.5px solid #d5e4dc',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#1b3b2b',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.85rem',
                  }}
                >
                  {st.step}
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.4rem', color: '#0f172a' }}>
                  {st.title}
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                  {st.desc}
                </p>
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
                  borderRadius: '16px',
                  padding: '1.25rem',
                  border: '1px solid #bfd4c8',
                }}
              >
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#13281e', marginBottom: '0.25rem' }}>
                  {card.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#476355', lineHeight: 1.5 }}>
                  {card.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* QUICK INQUIRY FORM SECTION (Daftar Event / Konsultasi) */}
        <section
          id="daftar-event"
          style={{
            background: 'linear-gradient(135deg, #1b3b2b 0%, #11291d 100%)',
            borderRadius: '24px',
            padding: 'clamp(2rem, 3.5vw, 3rem)',
            color: '#ffffff',
            marginBottom: '2.5rem',
            boxShadow: '0 16px 40px rgba(17, 41, 29, 0.18)',
          }}
        >
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#e5c170',
                  background: 'rgba(229, 193, 112, 0.15)',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '999px',
                  display: 'inline-block',
                  marginBottom: '0.5rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {t.formBadge}
              </span>
              <h2 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, margin: '0 0 0.5rem', color: '#ffffff' }}>
                {t.formTitle}
              </h2>
              <p style={{ fontSize: '0.94rem', color: '#c5d9ce', margin: 0 }}>
                {t.formDesc}
              </p>
            </div>

            <form
              onSubmit={handleSendInquiry}
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: 'clamp(1.5rem, 2.5vw, 2.2rem)',
                color: '#0f172a',
                display: 'grid',
                gap: '1.15rem',
              }}
            >
              <div className="irv-form-grid">
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
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
                      padding: '0.7rem 0.95rem',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
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
                      padding: '0.7rem 0.95rem',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div className="irv-form-grid">
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                    {t.categoryLabel}
                  </label>
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.95rem',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
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
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
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
                      padding: '0.7rem 0.95rem',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                  {t.attendeeLabel}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {['< 200', '200 - 500', '500 - 1.000', '1.000 - 3.000', '> 3.000'].map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setAttendeeCount(tier)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: '8px',
                        border: attendeeCount === tier ? '1.5px solid #1b3b2b' : '1px solid #cbd5e1',
                        background: attendeeCount === tier ? '#edf5f0' : '#ffffff',
                        color: attendeeCount === tier ? '#1b3b2b' : '#475569',
                        fontWeight: 700,
                        fontSize: '0.82rem',
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
                  padding: '0.95rem 1.5rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#1b3b2b',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.96rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(27, 59, 43, 0.3)',
                  transition: 'background 0.15s ease',
                  marginTop: '0.5rem',
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
        <section style={{ maxWidth: '880px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#1b3b2b',
                background: '#edf5f0',
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                display: 'inline-block',
                marginBottom: '0.5rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {t.faqBadge}
            </span>
            <h2 style={{ fontSize: 'clamp(1.4rem, 2.2vw, 1.8rem)', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              {t.faqTitle}
            </h2>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {t.faqList.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={item.q}
                  style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1.5px solid #d5e4dc',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '1.1rem 1.35rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      background: 'transparent',
                      border: 'none',
                      color: '#0f172a',
                      fontWeight: 800,
                      fontSize: '0.94rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{item.q}</span>
                    <svg
                      width="16"
                      height="16"
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
                        padding: '0 1.35rem 1.2rem',
                        fontSize: '0.88rem',
                        color: '#475569',
                        lineHeight: 1.6,
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '0.85rem',
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
