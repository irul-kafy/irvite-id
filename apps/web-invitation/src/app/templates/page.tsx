import React from 'react';
import Link from 'next/link';
import { getCatalogTemplates, filterAvailableTemplates } from '@/catalog';
import { fetchPublicTemplateAvailability, fetchPublicTemplatePackages } from '@/api/client';
import type { CatalogTemplateItem } from '@/catalog/template-catalog.types';
import { ThemeToggle } from '@/components/theme-toggle';
import { getTemplateOrderUrl, getGeneralContactUrl } from '@/utils/contact';
import './templates.css';

export const dynamic = 'force-dynamic';

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

function IconSparkles({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

export default async function PublicTemplatesPage() {
  const [availability, packages] = await Promise.all([fetchPublicTemplateAvailability(), fetchPublicTemplatePackages()]);
  const allTemplates = getCatalogTemplates();
  const builtInTemplates =
    availability && availability.length > 0
      ? filterAvailableTemplates(allTemplates, availability)
      : [];
  const templates: CatalogTemplateItem[] = [
    ...builtInTemplates,
    ...packages.map((item, index): CatalogTemplateItem => ({
      themeCode: item.themeCode,
      slug: item.id,
      displayName: item.name,
      category: 'Koleksi Kustom',
      shortDescription: 'Warna, tipografi, dan dekorasi pilihan untuk hari istimewa Anda.',
      thumbnailPath: /^\/templates\/assets\/[0-9a-f-]{36}\/file$/i.test(item.previewImageUrl ?? '') ? `/api-proxy${item.previewImageUrl}` : '',
      demoPath: `/templates/custom/${item.id}`,
      sortOrder: 100 + index,
      availability: 'AVAILABLE',
    })),
  ];

  const navContactUrl = getGeneralContactUrl('Halo IRVITE.ID, saya ingin konsultasi undangan digital.');
  const footerContactUrl = getGeneralContactUrl('Halo IRVITE.ID, saya butuh bantuan memilih template undangan.');

  return (
    <div className="cat-page">
      {/* Floating Pill Navigation */}
      <header className="cat-nav" aria-label="Navigasi Utama">
        <div className="cat-nav__inner">
          <Link href="/" className="cat-nav__brand" aria-label="IRVITE.ID Beranda">
            IRVITE<span className="cat-nav__brand-gold">.ID</span>
          </Link>

          <nav className="cat-nav__actions" aria-label="Navigasi Menu">
            <div className="cat-nav__links-group">
              <Link href="/" className="cat-nav__link">
                Beranda
              </Link>
              <Link href="/templates" className="cat-nav__link cat-nav__link--active" aria-current="page">
                Katalog
              </Link>
              <Link href="/#paket" className="cat-nav__link">
                Paket
              </Link>
              <Link href="/#cara-kerja" className="cat-nav__link">
                Cara Kerja
              </Link>
            </div>

            <ThemeToggle />

            {navContactUrl ? (
              <a
                id="cat-nav-wa-cta"
                href={navContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cat-nav__cta"
              >
                <IconWA style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>Konsultasi</span>
              </a>
            ) : null}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="cat-hero">
        <span className="cat-hero__badge">Koleksi Terkurasi</span>
        <h1 className="cat-hero__title">
          Katalog Desain Undangan <em>Digital</em>
        </h1>
        <p className="cat-hero__subtitle">
          Pilih desain undangan pernikahan yang mewakili estetika hari bahagia Anda.
          Setiap template dirancang khusus oleh desainer profesional, siap pakai, responsif, dan elegan.
        </p>
      </section>

      {/* Catalog Grid */}
      <main className="cat-container">
        {templates.length === 0 ? (
          <div id="catalog-empty-state">
            <div className="cat-empty__icon">
              <IconSparkles style={{ width: 28, height: 28 }} />
            </div>
            <h2 className="cat-empty__title">Katalog Sedang Diselaraskan</h2>
            <p className="cat-empty__desc">
              Katalog template saat ini belum tersedia secara publik. Kami sedang menyelaraskan desain eksklusif terbaru untuk Anda.
            </p>
            {navContactUrl && (
              <a
                href={navContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cat-btn cat-btn--order"
                style={{ padding: '0.75rem 1.75rem' }}
              >
                <IconWA style={{ width: 17, height: 17, flexShrink: 0 }} />
                Konsultasikan Desain via WhatsApp
              </a>
            )}
          </div>
        ) : (
          <div className="cat-grid" role="list">
            {templates.map((tpl) => {
              const orderUrl = getTemplateOrderUrl(tpl.displayName);

              return (
                <article key={tpl.slug} className="cat-card" role="listitem">
                  <div className="cat-card__preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {tpl.thumbnailPath ? (
                      <img
                        src={tpl.thumbnailPath}
                        alt={'Pratinjau desain ' + tpl.displayName}
                        className="cat-card__img"
                        loading="lazy"
                        width={600}
                        height={750}
                      />
                    ) : (
                      <div
                        className="cat-card__img"
                        style={{
                          minHeight: 280,
                          display: 'grid',
                          placeItems: 'center',
                          padding: '2rem',
                          fontFamily: 'var(--serif)',
                          fontSize: '2rem',
                          background: 'linear-gradient(145deg, #352a2d, #57373d)',
                          color: '#fffdf9',
                        }}
                      >
                        {tpl.displayName}
                      </div>
                    )}
                    <span className="cat-card__overlay-badge">Tersedia</span>
                  </div>

                  <div className="cat-card__body">
                    <span className="cat-card__category">{tpl.category}</span>
                    <h2 className="cat-card__title">{tpl.displayName}</h2>
                    <p className="cat-card__desc">{tpl.shortDescription}</p>

                    <div className="cat-card__actions">
                      <a
                        id={'demo-' + tpl.slug}
                        href={tpl.demoPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cat-btn cat-btn--demo"
                        aria-label={'Buka demo ' + tpl.displayName + ' di tab baru'}
                      >
                        Lihat Demo
                      </a>

                      {orderUrl ? (
                        <a
                          id={'order-' + tpl.slug}
                          href={orderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cat-btn cat-btn--order"
                          aria-label={'Pesan template ' + tpl.displayName + ' via WhatsApp'}
                        >
                          Pilih Template
                        </a>
                      ) : (
                        <button
                          type="button"
                          id={'order-' + tpl.slug}
                          disabled
                          className="cat-btn cat-btn--order"
                          style={{ opacity: 0.5, cursor: 'not-allowed' }}
                          title="Pemesanan WhatsApp sementara tidak tersedia"
                        >
                          Pilih Template
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Assistance Footer */}
      <footer className="cat-assistance">
        <div className="cat-assistance__inner">
          <span className="cat-assistance__badge">Konsultasi Desain</span>
          <h2 className="cat-assistance__title">Butuh Bantuan Memilih?</h2>
          <p className="cat-assistance__desc">
            Tim kami siap membantu merekomendasikan tema dan tata letak yang paling harmonis untuk konsep pernikahan Anda.
          </p>
          {footerContactUrl ? (
            <a
              href={footerContactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cat-btn cat-btn--order"
              style={{ padding: '0.85rem 2.25rem', fontSize: '0.9rem' }}
            >
              <IconWA style={{ width: 18, height: 18, flexShrink: 0 }} />
              Konsultasi Gratis via WhatsApp
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="cat-btn cat-btn--order"
              style={{ padding: '0.85rem 2.25rem', opacity: 0.5, cursor: 'not-allowed' }}
              title="Layanan WhatsApp sedang disiapkan"
            >
              Konsultasi via WhatsApp
            </button>
          )}

          <div className="cat-assistance__copyright">
            © {new Date().getFullYear()} IRVITE.ID · Seluruh Hak Cipta Dilindungi
          </div>
        </div>
      </footer>
    </div>
  );
}
