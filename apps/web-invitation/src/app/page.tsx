import Link from 'next/link';
import { getCatalogTemplates, filterAvailableTemplates, CatalogTemplateItem } from '../catalog';
import { fetchPublicTemplateAvailability } from '../api/client';
import { LandingNavbar } from '../components/landing-navbar';
import { PublicTemplateShowcase } from '../components/public-template-showcase';
import { HeroPhoneShowcase } from '../components/hero-phone-showcase';
import './landing.css';
import { getGeneralContactUrl } from '../utils/contact';

// ── Contact Messages ─────────────────────────────────────────────────────────
const MSG_GENERAL = 'Halo IRVITE, saya tertarik dengan layanan undangan digitalnya.';
const MSG_BASIC = 'Halo IRVITE, saya ingin memesan Paket Esensial untuk undangan digital.';
const MSG_PREMIUM = 'Halo IRVITE, saya ingin memesan Paket Personal dengan Tim Scanner di venue.';

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

// ── Hero Section ───────────────────────────────────────────────────────────────
function HeroSection() {
  const contactUrl = getGeneralContactUrl(MSG_GENERAL);

  return (
    <section className="hero shell" id="top">
      <div className="hero-copy">
        {/* Decorative Golden Background Cincin / Arcs */}
        <svg
          className="hero-copy-arc"
          viewBox="0 0 580 660"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Primary sweeping gold arc (cincin belakang) */}
          <path
            d="M 0 160 C 80 50 170 15 280 15 C 440 180 430 460 250 640"
            stroke="rgba(197, 168, 128, 0.65)"
            strokeWidth="1.5"
          />
          {/* Secondary concentric subtle gold arc */}
          <path
            d="M 0 210 C 90 70 190 30 320 30 C 480 200 470 480 290 660"
            stroke="rgba(197, 168, 128, 0.32)"
            strokeWidth="1.2"
          />
        </svg>
        <p className="eyebrow">UNDANGAN DIGITAL, DIRANCANG DENGAN RASA</p>
        <h1>
          Momen berharga,
          <br />
          <em>disampaikan dengan</em>
          <br />
          indah.
        </h1>
        <p className="lead">
          Undangan digital yang personal, tenang, dan mudah digunakan—dari
          kesan pertama hingga tamu tiba di hari bahagia.
        </p>
        <div className="hero-actions">
          <a id="hero-catalog-btn" className="button primary" href="#katalog">
            Lihat katalog <span aria-hidden="true">→</span>
          </a>
          {contactUrl ? (
            <a
              id="hero-wa-btn"
              href={contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button outline"
            >
              <IconWA className="wa-icon" />
              <span>Konsultasi gratis</span>
            </a>
          ) : (
            <button
              type="button"
              id="hero-wa-btn"
              disabled
              className="button outline"
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
              title="Kontak belum dikonfigurasi"
            >
              <IconWA className="wa-icon" />
              <span>Konsultasi gratis</span>
            </button>
          )}
        </div>
        <div className="hero-proof" aria-label="Ringkasan layanan">
          <span>DESAIN PERSONAL</span>
          <span>PROSES TERARAH</span>
          <span>DUKUNGAN NYATA</span>
        </div>
      </div>

      <HeroPhoneShowcase />
    </section>
  );
}

// ── Feature Strip ──────────────────────────────────────────────────────────────
function FeatureStrip() {
  const items = [
    'Konsultasi gratis',
    'Desain personal',
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
          <p className="eyebrow">Katalog pilihan</p>
          <h2>Desain yang tidak terasa generik.</h2>
        </div>
        <p>
          Setiap template dibangun dari tipografi, ritme, dan detail yang bisa
          disesuaikan dengan karakter perayaan Anda.
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
            <h2>Pilih sesuai cara Anda merayakan.</h2>
          </div>
          <p>
            Lingkup yang jelas sejak awal. Kami membantu memilihkan paket
            berdasarkan kebutuhan, bukan sekadar yang paling mahal.
          </p>
        </div>
        <div className="package-grid">
          <article className="package-card">
            <p className="package-label">Paket Esensial</p>
            <h3>Satu tautan untuk semua</h3>
            <p className="package-desc">
              Undangan digital praktis dan tetap berkelas untuk dibagikan ke seluruh tamu.
            </p>
            <ul>
              <li>
                <span className="icon" aria-hidden="true">✓</span> 1 tautan publik untuk semua tamu
              </li>
              <li>
                <span className="icon" aria-hidden="true">✓</span> Pilihan desain katalog eksklusif
              </li>
              <li>
                <span className="icon" aria-hidden="true">✓</span> Form RSVP dan ucapan tamu online
              </li>
              <li>
                <span className="icon" aria-hidden="true">✓</span> Informasi acara, peta maps, dan galeri
              </li>
              <li>
                <span className="icon" aria-hidden="true">✓</span> Tanpa QR Code individual tamu
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
                Tanyakan paket ini
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
                Tanyakan paket ini
              </button>
            )}
          </article>

          <article className="package-card featured">
            <span className="recommended">Paling diminati</span>
            <p className="package-label">Paket Personal</p>
            <h3>Setiap tamu terasa istimewa</h3>
            <p className="package-desc">
              Pengalaman personal premium lengkap dengan QR per tamu dan scanner di venue.
            </p>
            <ul>
              <li>
                <span className="icon" aria-hidden="true">✓</span> Tautan personal dengan nama tamu masing-masing
              </li>
              <li>
                <span className="icon" aria-hidden="true">✓</span> QR Code eksklusif per tamu undangan
              </li>
              <li>
                <span className="icon" aria-hidden="true">✓</span> Tim scanner hadir siaga di lokasi acara
              </li>
              <li>
                <span className="icon" aria-hidden="true">✓</span> Dashboard dan laporan kehadiran real-time
              </li>
              <li>
                <span className="icon" aria-hidden="true">✓</span> Semua fitur desain dan dukungan prioritas
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
                Konsultasi paket personal
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
                Konsultasi paket personal
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
    {
      num: '01',
      title: 'Pilih template & coba isi data',
      body: 'Pilih desain dari katalog eksklusif kami, lalu coba masukkan nama pasangan, jadwal acara, lokasi, hingga foto Anda secara langsung pada layar pratinjau interaktif.',
      note: 'Live preview gratis',
    },
    {
      num: '02',
      title: 'Sesuaikan konten dalam ketentuan desain',
      body: 'Tata letak, palet warna, tipografi, dan animasi telah dikurasi sesuai ketentuan desain agar tetap berkelas—Anda cukup fokus menyesuaikan isi acara, cerita cinta, galeri foto, dan amplop digital.',
      note: 'Estetika terjaga',
    },
    {
      num: '03',
      title: 'Kirim draf & konfirmasi via WhatsApp',
      body: 'Sudah cocok dengan tampilannya? Klik tombol kirim agar draf pesanan beserta kode referensi otomatis tercatat di sistem kami dan langsung terhubung ke WhatsApp Admin.',
      note: 'Tersinkron otomatis',
    },
    {
      num: '04',
      title: 'Verifikasi admin, data tamu & publikasi',
      body: 'Tim kami memverifikasi detail undangan Anda, menyiapkan daftar tamu serta QR Code kehadiran (khusus Paket Personal), dan mengaktifkan tautan resmi yang siap dibagikan.',
      note: 'Siap dibagikan',
    },
  ];

  return (
    <section className="section process shell" id="cara-kerja">
      {/* Anchor helper for backward compatibility */}
      <span id="alur" style={{ display: 'none' }} />
      <div className="section-heading section-heading--process">
        <div>
          <p className="eyebrow">Cara kerja</p>
          <h2>Jelas prosesnya. Ringan dijalaninya.</h2>
        </div>
        <p>
          Kami memandu setiap tahap dengan alur yang sederhana, tanpa membuat Anda
          berhadapan dengan kerumitan teknis.
        </p>
      </div>
      <div className="process-list">
        {steps.map((item) => (
          <article className="process-item" key={item.num}>
            <span className="process-number">{item.num}</span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
            <small>{item.note}</small>
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
        <p className="eyebrow">Dari hari bahagia mereka</p>
        <blockquote className="testimonial-quote">
          “Yang kami terima bukan hanya undangan yang cantik. Alurnya rapi, respons timnya cepat, dan semua tamu bisa menggunakannya tanpa bingung.”
        </blockquote>
        <div className="testimonial-person">
          <span>RA</span>
          <p>
            <strong>Rania &amp; Aditya</strong>
            <small>Bandung · 2026</small>
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Final CTA Section ──────────────────────────────────────────────────────────
function CTASection() {
  const contactUrl = getGeneralContactUrl(MSG_GENERAL);

  return (
    <section className="cta shell">
      <div className="cta-content">
        <div>
          <p className="eyebrow">Mulai dari percakapan sederhana</p>
          <h2>Siap membuat kesan pertama yang berharga?</h2>
        </div>
        <div className="cta-right">
          <p>Ceritakan rencana Anda. Konsultasi awal gratis dan tidak mengikat.</p>
          <div className="cta-actions">
            {contactUrl ? (
              <a
                id="cta-banner-wa"
                className="button light"
                href={contactUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconWA className="wa-icon" />
                Mulai konsultasi
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
                Mulai konsultasi
              </button>
            )}
            <Link
              id="cta-banner-catalog"
              href="/templates"
              className="button outline"
              style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.4)', background: 'transparent' }}
            >
              Lihat katalog
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer() {
  const contactUrl = getGeneralContactUrl(MSG_GENERAL);

  return (
    <footer>
      <div className="shell footer-inner">
        <div>
          <a className="brand light-brand" href="#top">
            IRVITE
          </a>
          <p>
            Undangan digital yang dirancang untuk dikenang.<br />
            Elegan, personal, dan terpercaya.
          </p>
        </div>
        <div className="footer-links">
          <a href="#katalog">Katalog</a>
          <a href="#cara-kerja">Cara kerja</a>
          <a href="#paket">Paket</a>
          {contactUrl ? (
            <a
              href={contactUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          ) : (
            <span style={{ opacity: 0.5, cursor: 'not-allowed' }}>WhatsApp</span>
          )}
        </div>
        <p className="copyright">© {new Date().getFullYear()} IRVITE</p>
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
