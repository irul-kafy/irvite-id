'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FIXED_CATALOG_TEMPLATES,
  CATALOG_CATEGORIES,
  joinCatalogWithDbTemplates,
  DbTemplateRecord,
  JoinedCatalogTemplate,
} from './utils/catalog-registry';
import { getCanonicalTemplateDemoUrl, getTrustedInvitationOrigin } from '../../utils/url';
import './template-studio.css';

export default function TemplateCatalogPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbTemplates, setDbTemplates] = useState<DbTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasTrustedOrigin = Boolean(getTrustedInvitationOrigin());

  // Session verification and DB templates fetch
  useEffect(() => {
    let isMounted = true;

    const fetchSessionAndDbTemplates = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.status === 401) {
          router.push('/login');
          return;
        }
        if (!meRes.ok) {
          throw new Error('Failed to verify user session');
        }

        const meData = await meRes.json();
        const role = meData.user?.role;

        if (role === 'STAFF') {
          router.push('/dashboard');
          return;
        }

        const res = await fetch('/api/templates?page=1&limit=100');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.data)) {
            setDbTemplates(data.data);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'An error occurred while loading templates'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSessionAndDbTemplates();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Join catalog metadata with live DB records by themeCode
  const joinedTemplates: JoinedCatalogTemplate[] = joinCatalogWithDbTemplates(
    FIXED_CATALOG_TEMPLATES,
    dbTemplates
  );

  // Filter based on category and search query
  const filteredTemplates = joinedTemplates.filter((item) => {
    const cat = item.catalogItem;
    if (selectedCategory !== 'All' && cat.category !== selectedCategory) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      cat.displayName.toLowerCase().includes(q) ||
      cat.themeCode.toLowerCase().includes(q) ||
      cat.category.toLowerCase().includes(q) ||
      cat.shortDescription.toLowerCase().includes(q)
    );
  });

  const handleUseTemplate = (item: JoinedCatalogTemplate) => {
    if (!item.canUse || !item.matchedDbTemplate) return;
    router.push(`/events/create?templateId=${encodeURIComponent(item.matchedDbTemplate.id)}`);
  };

  return (
    <div className="studio-page catalog-page">
      {/* Page Header */}
      <header className="page-header catalog-header">
        <div className="page-header__left">
          <div className="catalog-header__badge">Koleksi Desain Terkurasi</div>
          <h1 className="catalog-header__title">Katalog Template Undangan</h1>
          <p className="catalog-header__subtitle">
            Pilih template undangan digital dengan tata letak presisi dan tipografi elegan.
            Setiap template terhubung langsung ke basis data produksi untuk pembuatan event.
          </p>
        </div>
      </header>

      {/* Error alert */}
      {error && (
        <div className="admin-alert admin-alert--danger" role="alert" style={{ margin: '1rem 0' }}>
          {error}
        </div>
      )}

      {/* Configuration warning if trusted invitation origin is not configured */}
      {!hasTrustedOrigin && (
        <div
          id="invitation-origin-warning"
          role="status"
          style={{
            margin: '1rem 0',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--admin-radius-sm)',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            color: '#92400e',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontWeight: 700 }}>Konfigurasi Preview:</span>
          <span>
            Origin aplikasi undangan publik (<code>NEXT_PUBLIC_INVITATION_ORIGIN</code>) belum dikonfigurasi. Tombol Preview publik dinonaktifkan untuk mencegah tautan rusak. Pemilihan template (&ldquo;Use Template&rdquo;) tetap aktif sepenuhnya.
          </span>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <section className="catalog-toolbar" aria-label="Filter katalog">
        <div className="catalog-search">
          <svg
            className="catalog-search__icon"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            type="search"
            className="catalog-search__input"
            placeholder="Cari berdasarkan nama tema, kode, atau kata kunci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Cari template"
          />
        </div>

        <div className="catalog-categories" role="tablist" aria-label="Kategori template">
          {CATALOG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat}
              className={`catalog-category-tab ${
                selectedCategory === cat ? 'catalog-category-tab--active' : ''
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Main Catalog Grid */}
      <main className="catalog-content">
        <section className="catalog-section">
          <div className="catalog-section__header">
            <h2 className="catalog-section__title">Template Produksi Tersedia</h2>
            <span className="catalog-section__count">
              {loading ? 'Memuat...' : `${filteredTemplates.length} template`}
            </span>
          </div>

          {loading ? (
            <div className="catalog-empty" style={{ padding: '3rem', textAlign: 'center' }}>
              <p>Memuat katalog template dan memeriksa kesiapan basis data...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="catalog-empty">
              <p>Tidak ada template yang cocok dengan pencarian &quot;{searchQuery}&quot;.</p>
              <button
                type="button"
                className="studio-btn studio-btn--secondary"
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="template-grid" role="list">
              {filteredTemplates.map((item) => {
                const cat = item.catalogItem;
                const demoUrl = getCanonicalTemplateDemoUrl(cat.demoPath);

                return (
                  <article
                    key={cat.slug}
                    className="template-card"
                    role="listitem"
                    aria-label={cat.displayName}
                    style={{ overflow: 'hidden' }}
                  >
                    {/* Rendered Thumbnail Header */}
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '2 / 3',
                        background: 'var(--admin-surface-inset)',
                        overflow: 'hidden',
                        borderBottom: '1px solid var(--admin-border)',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.previewImageUrl}
                        alt={`Thumbnail ${cat.displayName}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                        width={600}
                        height={900}
                      />

                      {/* Top Badges */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '0.75rem',
                          left: '0.75rem',
                          right: '0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(23, 24, 23, 0.85)',
                            color: '#FFFFFF',
                            backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                          }}
                        >
                          {cat.availability}
                        </span>

                        {/* DB Identity Readiness Badge */}
                        {item.readiness === 'SYNCED' ? (
                          <span
                            className="badge"
                            style={{
                              background: '#16a34a',
                              color: '#FFFFFF',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                            }}
                            title="Identitas template tersinkronisasi dengan database"
                          >
                            ✓ SYNCED
                          </span>
                        ) : item.readiness === 'MISSING' ? (
                          <span
                            className="badge"
                            style={{
                              background: '#d97706',
                              color: '#FFFFFF',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                            }}
                            title="Belum tersinkronisasi ke database"
                          >
                            ! MISSING
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              background: '#dc2626',
                              color: '#FFFFFF',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                            }}
                            title="Duplikasi terdeteksi di database"
                          >
                            ⚠ DUPLICATE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="template-card__body">
                      <div className="template-card__title-row">
                        <h3 className="template-card__name" title={cat.displayName}>
                          {cat.displayName}
                        </h3>
                        <span className="template-card__theme-code">{cat.themeCode}</span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--admin-accent)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '0.5rem',
                        }}
                      >
                        {cat.category}
                      </div>

                      <p className="template-card__desc">{cat.shortDescription}</p>

                      {/* Warning notice if not synced */}
                      {item.readiness !== 'SYNCED' && (
                        <div
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--admin-radius-sm)',
                            background: item.readiness === 'MISSING' ? '#fef3c7' : '#fee2e2',
                            color: item.readiness === 'MISSING' ? '#92400e' : '#991b1b',
                            fontSize: '0.75rem',
                            lineHeight: 1.4,
                            marginBottom: '0.75rem',
                          }}
                        >
                          {item.statusMessage}
                        </div>
                      )}
                    </div>

                    {/* Action Footer */}
                    <div className="template-card__actions">
                      {demoUrl ? (
                        <a
                          id={`preview-${cat.slug}`}
                          href={demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="template-card__btn template-card__btn--preview"
                          aria-label={`Buka demo publik ${cat.displayName}`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          Preview
                        </a>
                      ) : (
                        <button
                          type="button"
                          id={`preview-${cat.slug}`}
                          disabled
                          className="template-card__btn template-card__btn--preview"
                          title="Origin undangan publik belum dikonfigurasi (NEXT_PUBLIC_INVITATION_ORIGIN)"
                          style={{ opacity: 0.5, cursor: 'not-allowed' }}
                          aria-label={`Preview ${cat.displayName} dinonaktifkan: origin belum dikonfigurasi`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          Preview
                        </button>
                      )}

                      <button
                        type="button"
                        id={`use-template-${cat.slug}`}
                        className="template-card__btn template-card__btn--select"
                        onClick={() => handleUseTemplate(item)}
                        disabled={!item.canUse}
                        title={item.statusMessage}
                        style={{
                          opacity: item.canUse ? 1 : 0.5,
                          cursor: item.canUse ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Use Template
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
