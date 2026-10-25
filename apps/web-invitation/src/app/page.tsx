import Link from 'next/link';
import { getCatalogTemplates, filterAvailableTemplates, CatalogTemplateItem } from '../catalog';
import { fetchPublicTemplateAvailability } from '../api/client';
import { LandingNavbar } from '../components/landing-navbar';
import { PublicTemplateShowcase } from '../components/public-template-showcase';
import './landing.css';
import { getGeneralContactUrl } from '../utils/contact';

// ── Contact Messages ─────────────────────────────────────────────────────────
const MSG_GENERAL = 'Halo IRVITE.ID, saya tertarik dengan layanan undangan digitalnya.';
const MSG_BASIC = 'Halo IRVITE.ID, saya ingin memesan Paket Umum untuk undangan digital.';
const MSG_PREMIUM = 'Halo IRVITE.ID, saya ingin memesan Paket Eksklusif dengan Tim Scanner di venue.';

// ── SVG Icons ──────────────────────────────────────────────────────────────────
function IconWA({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.5 3.5A11.8 11.8 0 0 0 12.08 0C5.53 0 .2 5.33.2 11.88c0 2.09.55 4.13 1.59 5.93L.1 24l6.34-1.66a11.87 11.87 0 0 0 5.63 1.43h.01c6.55 0 11.87-5.33 11.87-11.88 0-3.17-1.22-6.15-3.46-8.39Zm-8.42 18.27h-.01a9.84 9.84 0 0 1-5.02-1.38l-.36-.21-3.76.99 1-3.67-.24-.38a9.83 9.83 0 0 1-1.51-5.24c0-5.46 4.45-9.9 9.91-9.9a9.82 9.82 0 0 1 7 2.9 9.83 9.83 0 0 1 2.89 7c0 5.46-4.45 9.9-9.9 9.9Zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47a8.9 8.9 0 0 1-1.65-2.05c-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.91-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.87 1.21 3.07c.15.2 2.09 3.19 5.06 4.47.71.3 1.26.49 1.69.63.71.23 1.35.2 1.86.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

const TESTIMONIALS = [
  {
    quote:
      'Tim IRVITE.ID luar biasa. QR Scanner berjalan mulus dan undangannya cantik banget—banyak yang tanya pesan di mana.',
    name: 'Anisa & Ridwan',
    event: 'Ballroom Kota Jakarta · Agustus 2026',
  },
  {
    quote:
      'Paket Eksklusif sangat worth it. Setiap tamu punya link dengan namanya sendiri, rasanya benar-benar VIP.',
    name: 'Dita & Bagas',
    event: 'Garden Party, Bandung · Juli 2026',
  },
  {
    quote:
      'Prosesnya benar-benar terima beres. Beberapa hari kemudian undangan sudah jadi dan siap dibagikan.',
    name: 'Mega & Fauzan',
    event: 'Resepsi Surabaya · September 2026',
  },
];

// ── Hero Section ───────────────────────────────────────────────────────────────
function HeroSection() {
  const heroImage =
    'https://images.unsplash.com/photo-1650377509454-1bbd8392e122?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1400';

  return (
    <section className="hero shell" id="top">
      <div className="hero-copy">
        <p className="eyebrow">Undangan digital premium Indonesia</p>
        <h1>
          Hari bahagia Anda,
          <em> kami buat berkesan.</em>
        </h1>
        <p className="lead">
          Dari desain elegan, link personal per tamu, hingga tim scanner di venue.
          Semua kami urus dengan rapi—Anda tinggal menikmati momen.
        </p>
        <div className="hero-actions">
          <a id="hero-catalog-btn" className="button primary" href="#katalog">
            Lihat katalog <span aria-hidden="true">↘</span>
          </a>
          {getGeneralContactUrl(MSG_GENERAL) ? (
            <a
              id="hero-wa-btn"
              href={getGeneralContactUrl(MSG_GENERAL)!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Konsultasi via WhatsApp <span aria-hidden="true">→</span>
            </a>
          ) : (
            <button
              type="button"
              id="hero-wa-btn"
              disabled
              className="text-link"
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
              title="Kontak belum dikonfigurasi"
            >
              Konsultasi via WhatsApp <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
        <div className="trust">
          <strong>4.9/5</strong>
          <span>Dipercaya pasangan di berbagai kota Indonesia</span>
        </div>
      </div>
      <div className="hero-visual">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage}
          alt="Pasangan pengantin Indonesia dalam busana tradisional"
        />
      </div>
    </section>
  );
}

// ── Feature Strip ──────────────────────────────────────────────────────────────
function FeatureStrip() {
  const items = [
    'Konsultasi gratis',
    'Tim profesional',
    'Scanner on-site',
    'Laporan real-time',
    'QR unik per tamu',
  ];

  return (
    <section className="feature-strip" aria-label="Keunggulan layanan">
      <div className="shell feature-row">
        {items.map((item, index) => (
          <span key={item}>
            <b>{String(index + 1).padStart(2, '0')}</b> {item}
          </span>
        ))}
      </div>
    </section>
  );
}

// ── Catalog Section ────────────────────────────────────────────────────────────
function CatalogSection({ templates }: { templates: CatalogTemplateItem[] }) {
  return (
    <section className="section catalog-section shell" id="katalog">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Katalog desain</p>
          <h2>Temukan desain yang terasa personal.</h2>
        </div>
        <p>
          Setiap template dirancang dengan presisi dan dapat disesuaikan dengan
          identitas pernikahan Anda.
        </p>
      </div>

      <PublicTemplateShowcase templates={templates} />

      <Link
        id="view-all-templates-btn"
        className="button outline centered"
        href="/templates"
      >
        Lihat semua template <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}

// ── Packages Section ───────────────────────────────────────────────────────────
function PackagesSection() {
  return (
    <section className="section packages" id="paket">
      <div className="shell">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Paket layanan</p>
            <h2>Pilih yang tepat, tanpa biaya tersembunyi.</h2>
          </div>
          <p>Dua paket yang jelas untuk kebutuhan yang berbeda.</p>
        </div>
        <div className="package-grid">
          <article className="package-card">
            <p className="package-label">Paket Umum</p>
            <h3>Satu link, semua tamu</h3>
            <p className="package-desc">
              Praktis untuk undangan yang simpel dan tetap berkelas.
            </p>
            <ul>
              <li>
                <span className="icon" aria-hidden="true">✓</span> 1 link publik untuk semua tamu
              </li>
              <li>
                <span className="icon" aria-hidden="true">✓</span> Desain template eksklusif
              </li>
              <li>
                <span className="icon" aria-hidden="true">✓</span> Form RSVP standar
              </li>
              <li>
                <span className="icon" aria-hidden="true">✓</span> Informasi acara, maps, dan galeri
              </li>
              <li>
                <span className="icon" aria-hidden="true">✓</span> Tanpa QR Code per tamu
              </li>
            </ul>
            {getGeneralContactUrl(MSG_BASIC) ? (
              <a
                id="pkg-basic-wa"
                className="button outline"
                href={getGeneralContactUrl(MSG_BASIC)!}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconWA className="wa-icon" />
                Pesan paket ini
              </a>
            ) : (
              <button
                type="button"
                id="pkg-basic-wa"
                disabled
                className="button outline"
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                title="Kontak belum dikonfigurasi"
              >
                <IconWA className="wa-icon" />
                Pesan paket ini
              </button>
            )}
          </article>

          <article className="package-card featured">
            <span className="recommended">Paling diminati</span>
            <p className="package-label">Paket Eksklusif</p>
            <h3>Personal, sampai ke setiap tamu</h3>
            <p className="package-desc">
              Pengalaman premium dengan scanner profesional di venue.
            </p>
            <ul>
              <li>
                <span className="icon" aria-hidden="true">✓</span> Link personal dengan nama tamu
              </li>
              <li>
                <span className="icon" aria-hidden="true">✓</span> QR Code eksklusif per tamu
              </li>
              <li>
                <span className="icon" aria-hidden="true">✓</span> Tim scanner hadir di venue
              </li>
              <li>
                <span className="icon" aria-hidden="true">✓</span> Dashboard dan laporan real-time
              </li>
              <li>
                <span className="icon" aria-hidden="true">✓</span> Semua fitur desain premium
              </li>
            </ul>
            {getGeneralContactUrl(MSG_PREMIUM) ? (
              <a
                id="pkg-premium-wa"
                className="button primary exclusive-cta"
                href={getGeneralContactUrl(MSG_PREMIUM)!}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconWA className="wa-icon" />
                Pesan paket eksklusif
              </a>
            ) : (
              <button
                type="button"
                id="pkg-premium-wa"
                disabled
                className="button primary exclusive-cta"
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                title="Kontak belum dikonfigurasi"
              >
                <IconWA className="wa-icon" />
                Pesan paket eksklusif
              </button>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}

// ── Process (Cara Kerja) Section ───────────────────────────────────────────────
function ProcessSection() {
  const steps = [
    ['01', 'Pilih desain', 'Pilih dari katalog atau konsultasikan desain custom bersama tim kami.'],
    ['02', 'Kirim data tamu', 'Kirimkan data via WhatsApp atau template Excel yang kami siapkan.'],
    ['03', 'Terima beres', 'Undangan siap dibagikan, dan tim kami hadir untuk paket eksklusif.'],
  ];

  return (
    <section className="section process shell" id="cara-kerja">
      {/* Anchor helper for backward compatibility */}
      <span id="alur" style={{ display: 'none' }} />
      <div className="section-heading">
        <div>
          <p className="eyebrow">Cara kerja</p>
          <h2>Ringkas prosesnya. Tenang menjalaninya.</h2>
        </div>
        <p>Dari konsultasi hingga hari H, kami mendampingi di setiap langkah.</p>
      </div>
      <div className="steps">
        {steps.map(([num, title, body]) => (
          <article key={num}>
            <span className="step-number">{num}</span>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

// ── Testimonials Section ───────────────────────────────────────────────────────
function TestimonialsSection() {
  return (
    <section className="section testimonials">
      <div className="shell">
        <p className="eyebrow">Cerita klien</p>
        <h2>Kepercayaan yang kami jaga.</h2>
        <div className="quote-grid">
          {TESTIMONIALS.map((item) => (
            <figure key={item.name}>
              <div className="stars" aria-label="5 dari 5 bintang">★★★★★</div>
              <blockquote>“{item.quote}”</blockquote>
              <figcaption>
                <strong>{item.name}</strong>
                <span>{item.event}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA Section ──────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="cta shell">
      <p className="eyebrow">Mulai dari sini</p>
      <h2>Siap membuat undangan yang tak terlupakan?</h2>
      <p>Konsultasikan kebutuhan Anda. Gratis, tanpa komitmen.</p>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        {getGeneralContactUrl(MSG_GENERAL) ? (
          <a
            id="cta-banner-wa"
            className="button light"
            href={getGeneralContactUrl(MSG_GENERAL)!}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconWA className="wa-icon" />
            Mulai konsultasi gratis
          </a>
        ) : (
          <button
            type="button"
            id="cta-banner-wa"
            disabled
            className="button light"
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
            title="Kontak belum dikonfigurasi"
          >
            <IconWA className="wa-icon" />
            Mulai konsultasi gratis
          </button>
        )}
        <Link
          id="cta-banner-catalog"
          href="/templates"
          className="button outline"
          style={{ color: 'var(--white)', borderColor: 'rgba(255,255,255,0.4)' }}
        >
          Lihat Semua Katalog
        </Link>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer>
      <div className="shell footer-inner">
        <div>
          <a className="brand light-brand" href="#top">
            IRVITE<span>.ID</span>
          </a>
          <p>
            Layanan undangan digital premium<br />
            untuk momen pernikahan Anda.
          </p>
        </div>
        <div className="footer-links">
          <a href="#katalog">Katalog</a>
          <a href="#paket">Paket</a>
          <a href="#cara-kerja">Cara kerja</a>
          {getGeneralContactUrl(MSG_GENERAL) ? (
            <a
              href={getGeneralContactUrl(MSG_GENERAL)!}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          ) : (
            <span style={{ opacity: 0.5, cursor: 'not-allowed' }}>WhatsApp</span>
          )}
        </div>
        <p className="copyright">© {new Date().getFullYear()} IRVITE.ID</p>
      </div>
    </footer>
  );
}

// ── Floating WhatsApp FAB ──────────────────────────────────────────────────────
function WaFab() {
  const fabUrl = getGeneralContactUrl(MSG_GENERAL);
  if (!fabUrl) return null;

  return (
    <a
      id="wa-fab"
      href={fabUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="wa-fab"
      aria-label="Hubungi kami via WhatsApp"
    >
      <IconWA />
      <span>Hubungi Kami</span>
    </a>
  );
}

// ── Root Page ──────────────────────────────────────────────────────────────────
export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const availability = await fetchPublicTemplateAvailability();
  const allTemplates = getCatalogTemplates();
  const templates =
    availability && availability.length > 0
      ? filterAvailableTemplates(allTemplates, availability)
      : [];

  return (
    <main>
      <LandingNavbar />
      <HeroSection />
      <FeatureStrip />
      <CatalogSection templates={templates} />
      <PackagesSection />
      <ProcessSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
      <WaFab />
    </main>
  );
}
