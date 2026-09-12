 'use client';

import { useEffect, useState } from 'react';
import { ThemeToggle } from '../components/theme-toggle';
import './landing.css';

// ── WhatsApp config ────────────────────────────────────────────────────────────
const WA_NUMBER = '6281234567890';
const WA_MSG_GENERAL = encodeURIComponent(
  'Halo IRVITE.ID, saya tertarik dengan layanan undangan digitalnya.'
);
const WA_MSG_BASIC = encodeURIComponent(
  'Halo IRVITE.ID, saya ingin memesan Paket Umum untuk undangan digital.'
);
const WA_MSG_PREMIUM = encodeURIComponent(
  'Halo IRVITE.ID, saya ingin memesan Paket Eksklusif dengan Tim Scanner di venue.'
);
const waLink  = (msg: string) => `https://wa.me/${WA_NUMBER}?text=${msg}`;

// ── SVG Icons ──────────────────────────────────────────────────────────────────

function IconWA({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.528 5.855L.057 23.943l6.294-1.446A11.946 11.946 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.6a9.571 9.571 0 0 1-4.886-1.338l-.35-.207-3.735.857.92-3.63-.228-.373A9.572 9.572 0 0 1 2.4 12C2.4 6.703 6.703 2.4 12 2.4S21.6 6.703 21.6 12 17.297 21.6 12 21.6z"/>
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="8" fill="currentColor" fillOpacity="0.15"/>
      <path d="M5.5 9l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 1l1.545 3.13L12 4.635l-2.5 2.435.59 3.43L7 8.885l-3.09 1.615.59-3.43L2 4.635l3.455-.505L7 1z"/>
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2l7 3v5c0 4.418-3.134 7.5-7 8.5C6.134 17.5 3 14.418 3 10V5l7-3z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconScan({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 7V4.5A1.5 1.5 0 0 1 3.5 3H6M14 3h2.5A1.5 1.5 0 0 1 18 4.5V7M2 13v2.5A1.5 1.5 0 0 0 3.5 17H6M14 17h2.5A1.5 1.5 0 0 0 18 15.5V13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="4" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconDesign({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconData({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M3 8h14M7 12h1M7 15h1M10.5 12h2.5M10.5 15h1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconTeam({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 17c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M13 4c1.657 0 3 1.343 3 3s-1.343 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18 17c0-2.5-1.8-4.5-4-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconQR({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <rect x="4" y="4" width="3" height="3" fill="currentColor"/>
      <rect x="11" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <rect x="13" y="4" width="3" height="3" fill="currentColor"/>
      <rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <rect x="4" y="13" width="3" height="3" fill="currentColor"/>
      <rect x="11" y="11" width="3" height="3" fill="currentColor" opacity="0.6"/>
      <rect x="15" y="11" width="3" height="3" fill="currentColor" opacity="0.6"/>
      <rect x="11" y="15" width="3" height="3" fill="currentColor" opacity="0.6"/>
      <rect x="15" y="15" width="3" height="3" fill="currentColor" opacity="0.6"/>
    </svg>
  );
}

function IconLink({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.5 11.5a4.5 4.5 0 0 0 6.364 0l2-2a4.5 4.5 0 0 0-6.364-6.364l-1 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M11.5 8.5a4.5 4.5 0 0 0-6.364 0l-2 2a4.5 4.5 0 0 0 6.364 6.364l1-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconReport({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M6 7h8M6 10h8M6 13h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M14 13l1.5 1.5L18 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Template catalog data ──────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: 'verdant',
    name: 'Verdant Estate',
    desc: 'Elegan emerald & gold. Cocok untuk pernikahan mewah di kebun atau ballroom.',
    badge: 'Paling Populer',
    bg: 'linear-gradient(160deg, #1e3a2f 0%, #2d5a3d 50%, #1a2f25 100%)',
    accentBg: 'rgba(180,151,90,0.4)',
    archBg: 'rgba(180,151,90,0.2)',
  },
  {
    id: 'midnight',
    name: 'Midnight Editorial',
    desc: 'Obsidian slate & champagne. Dramatis dan modern untuk venue eksklusif.',
    badge: 'Premium Dark',
    bg: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0c1320 100%)',
    accentBg: 'rgba(148,163,184,0.3)',
    archBg: 'rgba(148,163,184,0.15)',
  },
  {
    id: 'botanical',
    name: 'Botanical Romance',
    desc: 'Kain linen & terrakota. Natural, hangat, penuh karakter botanis.',
    badge: 'Artisan',
    bg: 'linear-gradient(160deg, #7c4522 0%, #a05c2d 50%, #6b3a1a 100%)',
    accentBg: 'rgba(196,139,88,0.4)',
    archBg: 'rgba(196,139,88,0.2)',
  },
  {
    id: 'classic',
    name: 'Classic Elegance',
    desc: 'Warm stone & ivory. Timeless dan mudah dicintai semua kalangan.',
    badge: 'Terlaris',
    bg: 'linear-gradient(160deg, #4a3728 0%, #6b4f3a 50%, #3d2c20 100%)',
    accentBg: 'rgba(200,170,130,0.35)',
    archBg: 'rgba(200,170,130,0.2)',
  },
  {
    id: 'minimal',
    name: 'Modern Minimal',
    desc: 'Putih bersih & geometris. Kontemporer, fresh, dan sangat estetik.',
    badge: 'Baru',
    bg: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    accentBg: 'rgba(100,149,237,0.3)',
    archBg: 'rgba(100,149,237,0.15)',
  },
  {
    id: 'romantic',
    name: 'Romantic Garden',
    desc: 'Rose blush & crimson. Lembut, romantis, sempurna untuk taman bunga.',
    badge: 'Favorit',
    bg: 'linear-gradient(160deg, #4a1028 0%, #6d1a38 50%, #3d0d20 100%)',
    accentBg: 'rgba(244,63,94,0.35)',
    archBg: 'rgba(244,63,94,0.2)',
  },
] as const;

// ── Testimonials ───────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    id: 1,
    quote: 'Tim IRVITE.ID luar biasa! QR Scanner-nya berjalan mulus, tamu datang dan langsung ter-scan. Undangannya juga cantik banget, banyak yang tanya pesan dimana.',
    name: 'Anisa & Ridwan',
    role: 'Pernikahan di Ballroom Kota Jakarta, Agustus 2026',
    avatar: 'AR',
    color: 'linear-gradient(135deg, #c9a84c, #9a7530)',
  },
  {
    id: 2,
    quote: 'Paket Eksklusif sangat worth it. Setiap tamu punya link dengan namanya sendiri, berasa VIP. Tim di venue super profesional dan laporan kehadirannya akurat.',
    name: 'Dita & Bagas',
    role: 'Pernikahan Garden Party, Bandung, Juli 2026',
    avatar: 'DB',
    color: 'linear-gradient(135deg, #059669, #047857)',
  },
  {
    id: 3,
    quote: 'Prosesnya benar-benar "terima beres". Kami tinggal kirim data via WhatsApp, beberapa hari kemudian undangan sudah jadi dan siap dibagikan. Sangat rekomendasikan!',
    name: 'Mega & Fauzan',
    role: 'Pernikahan Resepsi, Surabaya, September 2026',
    avatar: 'MF',
    color: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
  },
] as const;

// ── Scroll reveal hook ─────────────────────────────────────────────────────────

function useReveal() {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      document.querySelectorAll('.lp-reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    );
    document.querySelectorAll('.lp-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ── Navbar ─────────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`} aria-label="Main navigation">
      <div className="lp-nav__brand">
        <img src="/logo.png" alt="IRVITE" className="lp-nav__logo-img" />
      </div>
      <ul className="lp-nav__links">
        <li><a href="#katalog" className="lp-nav__link">Katalog</a></li>
        <li><a href="#paket" className="lp-nav__link">Paket</a></li>
        <li><a href="#alur" className="lp-nav__link">Cara Kerja</a></li>
      </ul>
      <div className="lp-nav__actions">
        <ThemeToggle />
        <a
          id="nav-wa-cta"
          href={waLink(WA_MSG_GENERAL)}
          target="_blank"
          rel="noreferrer"
          className="lp-nav__cta"
        >
          <IconWA style={{ width: 15, height: 15 }} />
          WhatsApp Kami
        </a>
      </div>
    </nav>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section id="home" className="lp-hero">
      <div className="lp-hero__content">
        <div className="lp-hero__eyebrow">
          <span className="lp-hero__eyebrow-dot" aria-hidden="true" />
          Layanan Undangan Digital Premium Indonesia
        </div>

        <h1 className="lp-hero__title">
          Undangan Digital<br />
          <em>Premium &amp; Eksklusif</em>
        </h1>

        <p className="lp-hero__subtitle">
          Kami urus segalanya — dari desain elegan, link personal per tamu, hingga
          tim scanner di venue. <strong className="lp-hero__terima-beres">Terima Beres.</strong>
        </p>

        <div className="lp-hero__ctas">
          <a id="hero-catalog-btn" href="#katalog" className="lp-btn lp-btn--silver">
            <svg className="lp-btn__icon" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="2" y="2" width="6" height="6" rx="1.5" fill="currentColor"/>
              <rect x="10" y="2" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
              <rect x="2" y="10" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
              <rect x="10" y="10" width="6" height="6" rx="1.5" fill="currentColor"/>
            </svg>
            Lihat Katalog Desain
          </a>
          <a
            id="hero-wa-btn"
            href={waLink(WA_MSG_GENERAL)}
            target="_blank"
            rel="noreferrer"
            className="lp-btn lp-btn--outline"
          >
            <IconWA className="lp-btn__icon" />
            Konsultasi via WhatsApp
          </a>
        </div>
      </div>

      <div className="lp-hero__scroll" aria-hidden="true">
        <div className="lp-hero__scroll-line" />
        <span className="lp-hero__scroll-text">Scroll</span>
      </div>
    </section>
  );
}

// ── Trust Bar ──────────────────────────────────────────────────────────────────

function TrustBar() {
  const items = [
    { icon: IconShield, text: 'Konsultasi Gratis' },
    { icon: IconTeam,   text: 'Tim Profesional Berpengalaman' },
    { icon: IconScan,   text: 'Scanner On-Site Tersedia' },
    { icon: IconReport, text: 'Laporan Kehadiran Real-time' },
    { icon: IconQR,     text: 'QR Code Unik Per Tamu' },
  ];
  return (
    <div className="lp-trust" role="complementary" aria-label="Keunggulan layanan">
      <div className="lp-trust__inner">
        {items.map(({ icon: Icon, text }) => (
          <div key={text} className="lp-trust__item">
            <Icon className="lp-trust__item-icon" />
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Packages ───────────────────────────────────────────────────────────────────

function PackagesSection() {
  const basicFeatures = [
    { icon: IconLink,   text: <>1 Link publik untuk disebarkan ke <strong>semua tamu</strong></> },
    { icon: IconDesign, text: <>Desain template eksklusif pilihan Anda</> },
    { icon: IconCheck,  text: <>Form RSVP standar (hadir / tidak hadir)</> },
    { icon: IconCheck,  text: <>Informasi acara lengkap (tanggal, lokasi, maps)</> },
    { icon: IconCheck,  text: <>Galeri foto</> },
    { icon: IconCheck,  text: <>Tanpa QR Code per tamu</> },
  ];
  const premiumFeatures = [
    { icon: IconLink,   text: <><strong>Link unik per tamu</strong> — nama tamu tercantum di amplop digital</> },
    { icon: IconQR,     text: <><strong>QR Code eksklusif</strong> sebagai akses masuk per tamu</> },
    { icon: IconTeam,   text: <><strong>Tim Scanner di Venue <span className="lp-package__star-tag">INCLUDED</span></strong> — kami datang ke venue, scan &amp; data tamu secara real-time</> },
    { icon: IconReport, text: <><strong>Laporan kehadiran</strong> lengkap pasca acara</> },
    { icon: IconDesign, text: <>Semua fitur desain premium + customisasi nama tamu</> },
    { icon: IconScan,   text: <>Dashboard pemantauan scanner real-time di hari H</> },
  ];

  return (
    <section id="paket" className="lp-section lp-section--cream">
      <div className="lp-container lp-packages">
        <div className="lp-packages__header">
          <div className="lp-reveal">
            <p className="lp-section-label">Paket Layanan</p>
            <h2 className="lp-section-title lp-section-title--dark">
              Pilih Paket yang <em>Tepat</em> untuk Anda
            </h2>
          </div>
          <div className="lp-reveal lp-reveal--delay-1" style={{ marginTop: '0.875rem' }}>
            <p className="lp-section-desc">
              Dua paket dirancang untuk memenuhi kebutuhan berbeda — dari yang simpel hingga pengalaman pernikahan yang benar-benar <em>memorable.</em>
            </p>
          </div>
        </div>

        <div className="lp-packages__grid">
          {/* Basic Card */}
          <div className="lp-package-card lp-package-card--basic lp-reveal">
            <div className="lp-package__badge lp-package__badge--basic">
              <IconLink style={{ width: 13, height: 13 }} />
              Paket Umum
            </div>
            <h3 className="lp-package__name">Paket Umum</h3>
            <p className="lp-package__tagline">Satu link, semua tamu</p>
            <div className="lp-package__divider" />
            <ul className="lp-package__features">
              {basicFeatures.map((f, i) => (
                <li key={i} className="lp-package__feature">
                  <f.icon className="lp-package__feature-icon lp-package__feature-icon--check" />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            <a
              id="pkg-basic-wa"
              href={waLink(WA_MSG_BASIC)}
              target="_blank"
              rel="noreferrer"
              className="lp-btn lp-btn--outline-silver lp-package__cta"
            >
              <IconWA className="lp-btn__icon" />
              Pesan Paket Ini
            </a>
          </div>

          {/* Premium Card */}
          <div className="lp-package-card lp-package-card--premium lp-reveal lp-reveal--delay-2">
            <div className="lp-package__recommended">Direkomendasikan</div>
            <div className="lp-package__badge lp-package__badge--premium">
              <IconQR style={{ width: 13, height: 13 }} />
              Paket Eksklusif
            </div>
            <h3 className="lp-package__name">Paket Eksklusif</h3>
            <p className="lp-package__tagline">Per tamu + Scanner di venue</p>
            <div className="lp-package__divider" />
            <ul className="lp-package__features">
              {premiumFeatures.map((f, i) => (
                <li key={i} className="lp-package__feature">
                  <f.icon className="lp-package__feature-icon lp-package__feature-icon--gold" />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            <a
              id="pkg-premium-wa"
              href={waLink(WA_MSG_PREMIUM)}
              target="_blank"
              rel="noreferrer"
              className="lp-btn lp-btn--silver lp-package__cta"
            >
              <IconWA className="lp-btn__icon" />
              Pesan Paket Eksklusif
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Template Catalog ───────────────────────────────────────────────────────────

function CatalogSection() {
  return (
    <section id="katalog" className="lp-section lp-section--cream-2">
      <div className="lp-container lp-catalog">
        <div className="lp-catalog__header">
          <div className="lp-reveal">
            <p className="lp-section-label">Katalog Desain</p>
            <h2 className="lp-section-title lp-section-title--dark">
              Temukan Desain <em>Impian</em> Anda
            </h2>
          </div>
          <div className="lp-reveal lp-reveal--delay-1" style={{ marginTop: '0.875rem' }}>
            <p className="lp-section-desc" style={{ marginInline: 'auto' }}>
              Setiap template dirancang dengan presisi oleh tim desainer kami — elegan, responsif, dan dapat dikustomisasi sesuai identitas pernikahan Anda.
            </p>
          </div>
        </div>

        <div className="lp-catalog__grid">
          {TEMPLATES.map((t, i) => (
            <div
              key={t.id}
              className={`lp-template-card lp-reveal lp-reveal--delay-${(i % 3) + 1}`}
            >
              <div className="lp-template-card__preview" style={{ background: t.bg }}>
                <div className="lp-template-card__preview-inner">
                  <div className="lp-template-card__arch">
                    <div
                      className="lp-template-card__arch-fill"
                      style={{ background: t.archBg }}
                    />
                  </div>
                  <p className="lp-template-card__mock-name">Budi &amp; Sari</p>
                  <p className="lp-template-card__mock-date">12 · Oktober · 2026</p>
                </div>
                <div className="lp-template-card__badge">{t.badge}</div>
              </div>
              <div className="lp-template-card__info">
                <h3 className="lp-template-card__name">{t.name}</h3>
                <p className="lp-template-card__desc">{t.desc}</p>
                <div className="lp-template-card__actions">
                  <a
                    id={`catalog-demo-${t.id}`}
                    href="#katalog"
                    className="lp-btn lp-btn--outline-silver lp-btn--sm"
                  >
                    Lihat Demo
                  </a>
                  <a
                    id={`catalog-order-${t.id}`}
                    href={waLink(encodeURIComponent(
                      `Halo IRVITE.ID, saya tertarik dengan desain ${t.name}. Boleh info lebih lanjut?`
                    ))}
                    target="_blank"
                    rel="noreferrer"
                    className="lp-btn lp-btn--silver lp-btn--sm"
                  >
                    Pesan Desain Ini
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lp-reveal" style={{ textAlign: 'center' }}>
          <a
            id="catalog-all-wa"
            href={waLink(WA_MSG_GENERAL)}
            target="_blank"
            rel="noreferrer"
            className="lp-btn lp-btn--outline-silver"
          >
            <IconWA className="lp-btn__icon" />
            Tanyakan Desain Lainnya
          </a>
        </div>
      </div>
    </section>
  );
}

// ── How It Works ───────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const steps = [
    {
      n: '01',
      Icon: IconDesign,
      title: 'Pilih Desain',
      desc: <>Pilih template dari katalog kami, atau konsultasikan <strong>desain custom</strong> via WhatsApp. Kami siap membantu.</>,
    },
    {
      n: '02',
      Icon: IconData,
      title: 'Kirim Data Tamu',
      desc: <>Kirimkan data tamu via WhatsApp atau template Excel kami. <strong>Kami yang input, kami yang siapkan.</strong></>,
    },
    {
      n: '03',
      Icon: IconTeam,
      title: 'Terima Beres & Kami di Hari H',
      desc: <>Undangan siap disebar. Untuk Paket Eksklusif, <strong>tim kami hadir di venue</strong> dengan sistem scanner real-time.</>,
    },
  ];

  return (
    <section id="alur" className="lp-section lp-section--cream">
      <div className="lp-container lp-hiw">
        <div className="lp-hiw__header">
          <div className="lp-reveal">
            <p className="lp-section-label">Cara Kerja</p>
            <h2 className="lp-section-title lp-section-title--dark">
              Alur Pemesanan yang <em>Mudah</em>
            </h2>
          </div>
          <div className="lp-reveal lp-reveal--delay-1" style={{ marginTop: '0.875rem' }}>
            <p className="lp-section-desc" style={{ marginInline: 'auto' }}>
              Dari konsultasi hingga hari H, kami pastikan perjalanan Anda bebas stres dan penuh kesenangan.
            </p>
          </div>
        </div>

        <div className="lp-hiw__steps">
          {steps.map((step, i) => {
            const Icon = step.Icon;
            return (
              <div
                key={step.n}
                className={`lp-hiw__step lp-reveal lp-reveal--delay-${i + 1}`}
              >
                <div className="lp-hiw__step-num">{step.n}</div>
                <Icon className="lp-hiw__step-icon" />
                <h3 className="lp-hiw__step-title">{step.title}</h3>
                <p className="lp-hiw__step-desc">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ───────────────────────────────────────────────────────────────

function TestimonialsSection() {
  return (
    <section className="lp-section lp-section--dark lp-proof">
      <div className="lp-container">
        <div className="lp-proof__header">
          <div className="lp-reveal">
            <p className="lp-section-label">Testimoni Klien</p>
            <h2 className="lp-section-title lp-section-title--light">
              Kepercayaan yang <em>Membanggakan</em>
            </h2>
          </div>
        </div>
        <div className="lp-proof__grid">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.id}
              className={`lp-proof-card lp-reveal lp-reveal--delay-${i + 1}`}
            >
              <div className="lp-proof-card__stars" aria-label="Rating 5 bintang">
                {Array.from({ length: 5 }, (_, j) => <IconStar key={j} />)}
              </div>
              <blockquote className="lp-proof-card__quote">&quot;{t.quote}&quot;</blockquote>
              <div className="lp-proof-card__author">
                <div
                  className="lp-proof-card__avatar"
                  style={{ background: t.color }}
                  aria-hidden="true"
                >
                  {t.avatar}
                </div>
                <div>
                  <div className="lp-proof-card__author-name">{t.name}</div>
                  <div className="lp-proof-card__author-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Banner ─────────────────────────────────────────────────────────────────

function CTABanner() {
  return (
    <div className="lp-cta-banner">
      <div className="lp-cta-banner__inner">
        <div className="lp-cta-banner__content lp-reveal">
          <h2 className="lp-cta-banner__title">
            Siap Membuat Undangan yang <em>Tak Terlupakan?</em>
          </h2>
          <p className="lp-cta-banner__sub">
            Konsultasikan kebutuhan Anda sekarang. Gratis, tanpa komitmen, dan kami akan memandu Anda menemukan paket yang paling sesuai.
          </p>
          <div className="lp-cta-banner__ctas">
            <a
              id="cta-banner-wa"
              href={waLink(WA_MSG_GENERAL)}
              target="_blank"
              rel="noreferrer"
              className="lp-btn lp-btn--silver"
            >
              <IconWA className="lp-btn__icon" />
              Mulai Konsultasi Gratis
            </a>
            <a
              id="cta-banner-catalog"
              href="#katalog"
              className="lp-btn lp-btn--outline"
            >
              Lihat Semua Katalog
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="lp-footer" aria-label="Site footer">
      <div className="lp-footer__inner">
        <div className="lp-footer__top">
          <div>
            <div className="lp-footer__brand-name">IRVITE.ID</div>
            <p className="lp-footer__brand-desc">
              Layanan undangan digital premium &amp; terima beres untuk momen pernikahan Anda.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <ul className="lp-footer__links">
              <li><a href="#home"    className="lp-footer__link">Beranda</a></li>
              <li><a href="#katalog" className="lp-footer__link">Katalog</a></li>
              <li><a href="#paket"   className="lp-footer__link">Paket</a></li>
              <li><a href="#alur"    className="lp-footer__link">Cara Kerja</a></li>
              <li>
                <a
                  href={waLink(WA_MSG_GENERAL)}
                  target="_blank"
                  rel="noreferrer"
                  className="lp-footer__link"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div className="lp-footer__bottom">
          <p className="lp-footer__copy">
            &copy; {new Date().getFullYear()} IRVITE.ID. All rights reserved.
          </p>
          <ul className="lp-footer__legal">
            <li><a href="#" className="lp-footer__legal-link">Kebijakan Privasi</a></li>
            <li><a href="#" className="lp-footer__legal-link">Syarat &amp; Ketentuan</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

// ── Floating WhatsApp FAB ──────────────────────────────────────────────────────

function WaFab() {
  return (
    <a
      id="wa-fab"
      href={waLink(WA_MSG_GENERAL)}
      target="_blank"
      rel="noreferrer"
      className="lp-wa-fab"
      aria-label="Hubungi kami via WhatsApp"
    >
      <IconWA className="lp-wa-fab__icon" />
      <span className="lp-wa-fab__label">Hubungi Kami</span>
    </a>
  );
}

// ── Root Page ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  useReveal();

  return (
    <>
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <TrustBar />
        <PackagesSection />
        <CatalogSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <CTABanner />
      </main>
      <Footer />
      <WaFab />
    </>
  );
}
