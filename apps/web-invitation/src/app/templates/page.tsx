'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCatalogTemplates, filterAvailableTemplates, CatalogTemplateItem } from '@/catalog';
import { fetchPublicTemplateAvailability } from '@/api/client';
import { ThemeToggle } from '@/components/theme-toggle';
import { getTemplateOrderUrl, getGeneralContactUrl } from '@/utils/contact';
import './templates.css';

export default function PublicTemplatesPage() {
  const [templates, setTemplates] = useState<CatalogTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const allTemplates = getCatalogTemplates();
    fetchPublicTemplateAvailability()
      .then((availability) => {
        if (cancelled) return;
        if (availability && availability.length > 0) {
          setTemplates(filterAvailableTemplates(allTemplates, availability));
        } else {
          setTemplates([]);
        }
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);
  const navContactUrl = getGeneralContactUrl('Halo IRVITE.ID, saya ingin konsultasi undangan digital.');
  const footerContactUrl = getGeneralContactUrl('Halo IRVITE.ID, saya butuh bantuan memilih template undangan.');

  return (
    <div className="cat-page">
      {/* Navigation */}
      <header className="cat-nav">
        <div className="cat-nav__inner">
          <Link href="/" className="cat-nav__brand">
            IRVITE<span className="cat-nav__brand-gold">.ID</span>
          </Link>

          <nav className="cat-nav__actions" aria-label="Navigasi Utama">
            <Link href="/" className="cat-nav__link">
              Beranda
            </Link>
            <Link href="/templates" className="cat-nav__link" style={{ color: 'var(--cat-gold)' }}>
              Katalog
            </Link>
            {navContactUrl ? (
              <a
                href={navContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cat-nav__link"
              >
                Kontak
              </a>
            ) : (
              <span className="cat-nav__link" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                Kontak
              </span>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Hero */}
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

      {/* Grid */}
      <main className="cat-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--cat-muted, #8b949e)' }}>
            <p>Memuat katalog template...</p>
          </div>
        ) : templates.length === 0 ? (
          <div id="catalog-empty-state" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--cat-muted, #8b949e)' }}>
            <p>Katalog template saat ini belum tersedia.</p>
          </div>
        ) : (
          <div className="cat-grid" role="list">
            {templates.map((tpl) => {
            const orderUrl = getTemplateOrderUrl(tpl.displayName);

            return (
              <article key={tpl.slug} className="cat-card" role="listitem">
                <div className="cat-card__preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tpl.thumbnailPath}
                    alt={`Pratinjau desain ${tpl.displayName}`}
                    className="cat-card__img"
                    loading="lazy"
                    width={600}
                    height={900}
                  />
                  <span className="cat-card__overlay-badge">Tersedia</span>
                </div>

                <div className="cat-card__body">
                  <span className="cat-card__category">{tpl.category}</span>
                  <h2 className="cat-card__title">{tpl.displayName}</h2>
                  <p className="cat-card__desc">{tpl.shortDescription}</p>

                  <div className="cat-card__actions">
                    <a
                      id={`demo-${tpl.slug}`}
                      href={tpl.demoPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cat-btn cat-btn--demo"
                      aria-label={`Buka demo ${tpl.displayName} di tab baru`}
                    >
                      Lihat Demo
                    </a>

                    {orderUrl ? (
                      <a
                        id={`order-${tpl.slug}`}
                        href={orderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cat-btn cat-btn--order"
                        aria-label={`Pesan template ${tpl.displayName} via WhatsApp`}
                      >
                        Pilih Template
                      </a>
                    ) : (
                      <button
                        type="button"
                        id={`order-${tpl.slug}`}
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
          <h2 className="cat-assistance__title">Butuh Bantuan Memilih?</h2>
          <p className="cat-assistance__desc">
            Tim kami siap membantu merekomendasikan tema yang paling cocok untuk konsep pernikahan Anda.
          </p>
          {footerContactUrl ? (
            <a
              href={footerContactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cat-btn cat-btn--order"
              style={{ padding: '0.75rem 2rem' }}
            >
              Konsultasi Gratis via WhatsApp
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="cat-btn cat-btn--order"
              style={{ padding: '0.75rem 2rem', opacity: 0.5, cursor: 'not-allowed' }}
              title="Layanan WhatsApp sedang disiapkan"
            >
              Konsultasi via WhatsApp
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
