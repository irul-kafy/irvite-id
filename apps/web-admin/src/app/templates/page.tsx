'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FIXED_CATALOG_TEMPLATES,
  CATALOG_CATEGORIES,
  joinCatalogWithDbTemplates,
  DbTemplateRecord,
  JoinedCatalogTemplate,
  isBuiltInCatalogTemplate,
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [updatingStatusTheme, setUpdatingStatusTheme] = useState<string | null>(null);

  // Permanent Delete Modal State
  const [templateToDelete, setTemplateToDelete] = useState<DbTemplateRecord | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
        if (isMounted) setUserRole(role);

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

  // Filter based on category and search query for catalog templates
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

  // Dynamic / Custom templates (non-built-in records from DB)
  const dynamicTemplates = dbTemplates.filter(
    (t) => !isBuiltInCatalogTemplate(t.themeCode)
  );

  const filteredDynamicTemplates = dynamicTemplates.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.themeCode && t.themeCode.toLowerCase().includes(q))
    );
  });

  const handleStatusChange = async (templateId: string, themeCode: string, newStatus: string) => {
    setUpdatingStatusTheme(themeCode);
    try {
      const res = await fetch('/api/templates/' + encodeURIComponent(templateId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setDbTemplates((prev) =>
          prev.map((t) => (t.id === templateId ? { ...t, status: newStatus } : t))
        );
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Gagal mengubah status template');
      }
    } catch {
      alert('Terjadi kesalahan saat mengubah status template');
    } finally {
      setUpdatingStatusTheme(null);
    }
  };

  const handleUseTemplate = (item: JoinedCatalogTemplate) => {
    if (!item.canUse || !item.matchedDbTemplate) return;
    router.push(`/events/create?templateId=${encodeURIComponent(item.matchedDbTemplate.id)}`);
  };

  const handlePermanentDelete = async () => {
    if (!templateToDelete || deleteConfirmInput !== 'DELETE') return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(templateToDelete.id)}/permanent`, {
        method: 'DELETE',
        headers: {
          origin: window.location.origin,
        },
      });
      if (res.ok) {
        setDbTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id));
        setTemplateToDelete(null);
        setDeleteConfirmInput('');
      } else {
        const err = await res.json().catch(() => ({}));
        setDeleteError(err.message || 'Gagal menghapus template secara permanen');
      }
    } catch {
      setDeleteError('Terjadi kesalahan jaringan saat menghapus template');
    } finally {
      setIsDeleting(false);
    }
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
      <section className="catalog-toolbar catalog-filter-bar" aria-label="Filter katalog">
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

        <div className="catalog-categories catalog-category-tabs" role="tablist" aria-label="Kategori template">
          {CATALOG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat}
              className={`catalog-category-tab catalog-tab ${
                selectedCategory === cat ? 'catalog-category-tab--active catalog-tab--active' : ''
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
                const dbUsageCount = item.matchedDbTemplate?.eventUsageCount ?? 0;

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
                      className="template-card__thumbnail-container"
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '2 / 3',
                        background: 'var(--admin-surface-inset)',
                        overflow: 'hidden',
                        borderBottom: '1px solid var(--admin-border)',
                      }}
                    >
                      {/* Subtle fallback placeholder behind image */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--admin-text-muted)',
                          zIndex: 0,
                          padding: '1rem',
                          textAlign: 'center',
                        }}
                        aria-hidden="true"
                      >
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                        <span style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>{cat.displayName}</span>
                      </div>

                      {/* Preview Image with CSS-based styling */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.previewImageUrl}
                        alt={`Thumbnail template ${cat.displayName}`}
                        loading="lazy"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'top center',
                          zIndex: 1,
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />

                      {/* Header Badges */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '0.75rem',
                          left: '0.75rem',
                          right: '0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          zIndex: 2,
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span
                            className="template-card__badge"
                            style={{
                              background: 'rgba(15, 23, 42, 0.75)',
                              color: '#ffffff',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              backdropFilter: 'blur(4px)',
                              fontSize: '0.7rem',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                            title="Built-in system template"
                          >
                            System
                          </span>
                          {cat.badge && (
                            <span className="template-card__badge template-card__badge--highlight">
                              {cat.badge}
                            </span>
                          )}
                          {cat.isPhotoOptional && (
                            <span className="template-card__badge template-card__badge--outline">
                              Non-Foto
                            </span>
                          )}
                        </div>

                        {/* Database Sync Status Badge */}
                        {item.readiness === 'SYNCED' ? (
                          <span
                            className="badge badge-success"
                            style={{
                              background: '#16a34a',
                              color: '#FFFFFF',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                            }}
                            title="Tersinkronisasi dengan database"
                          >
                            ✓ SYNCED
                          </span>
                        ) : item.readiness === 'MISSING' ? (
                          <span
                            className="badge"
                            style={{
                              background: '#ca8a04',
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
                          marginBottom: '0.25rem',
                        }}
                      >
                        {cat.category}
                      </div>

                      {/* Event Usage Count */}
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--admin-text-secondary)',
                          marginBottom: '0.5rem',
                        }}
                      >
                        Used in {dbUsageCount} {dbUsageCount === 1 ? 'event' : 'events'}
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

                    {/* SUPER_ADMIN Lifecycle Controls (Built-in template: Archive mechanism only) */}
                    {userRole === 'SUPER_ADMIN' && item.matchedDbTemplate && (
                      <div
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: 'var(--admin-surface-inset)',
                          borderTop: '1px solid var(--admin-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--admin-text)' }}>
                          Lifecycle:
                        </span>
                        <select
                          id={'select-status-' + cat.slug}
                          value={item.matchedDbTemplate.status || 'AVAILABLE'}
                          disabled={updatingStatusTheme === cat.themeCode}
                          onChange={(e) =>
                            handleStatusChange(item.matchedDbTemplate!.id, cat.themeCode, e.target.value)
                          }
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.4rem',
                            borderRadius: 'var(--admin-radius-sm)',
                            border: '1px solid var(--admin-border)',
                            background: 'var(--admin-surface)',
                            color: 'var(--admin-text)',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="AVAILABLE">AVAILABLE</option>
                          <option value="HIDDEN">HIDDEN</option>
                          <option value="ARCHIVED">ARCHIVED</option>
                        </select>
                      </div>
                    )}

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
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
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
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
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

        {/* Dynamic & Custom Templates Section */}
        {filteredDynamicTemplates.length > 0 && (
          <section className="catalog-section" style={{ marginTop: '2.5rem' }}>
            <div className="catalog-section__header">
              <h2 className="catalog-section__title">Template Kustom &amp; Dinamis</h2>
              <span className="catalog-section__count">
                {`${filteredDynamicTemplates.length} template`}
              </span>
            </div>

            <div className="template-grid" role="list">
              {filteredDynamicTemplates.map((dynamicTpl) => {
                const isArchived = dynamicTpl.status === 'ARCHIVED';
                const usage = dynamicTpl.eventUsageCount ?? 0;
                const canDelete = isArchived && usage === 0;

                return (
                  <article
                    key={dynamicTpl.id}
                    id={`dynamic-template-${dynamicTpl.id}`}
                    className="template-card"
                    role="listitem"
                    aria-label={dynamicTpl.name}
                    style={{ overflow: 'hidden' }}
                  >
                    {/* Dynamic Thumbnail Header */}
                    <div
                      className="template-card__thumbnail-container"
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '2 / 3',
                        background: 'var(--admin-surface-inset)',
                        overflow: 'hidden',
                        borderBottom: '1px solid var(--admin-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5rem',
                        textAlign: 'center',
                      }}
                    >
                      <span
                        className="badge"
                        style={{
                          background: '#3b82f6',
                          color: '#FFFFFF',
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 600,
                          marginBottom: '0.75rem',
                        }}
                      >
                        Custom Template
                      </span>
                      <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--admin-text)' }}>
                        {dynamicTpl.name}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--admin-text-secondary)', marginTop: '0.25rem' }}>
                        {dynamicTpl.themeCode}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="template-card__body">
                      <div className="template-card__title-row">
                        <h3 className="template-card__name" title={dynamicTpl.name}>
                          {dynamicTpl.name}
                        </h3>
                        <span className="template-card__theme-code">{dynamicTpl.themeCode}</span>
                      </div>

                      {/* Event Usage Count */}
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--admin-text-secondary)',
                          marginBottom: '0.5rem',
                        }}
                      >
                        Used in {usage} {usage === 1 ? 'event' : 'events'}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)' }}>Status:</span>
                        <span
                          className="badge"
                          style={{
                            background:
                              dynamicTpl.status === 'AVAILABLE'
                                ? '#16a34a'
                                : dynamicTpl.status === 'ARCHIVED'
                                ? '#64748b'
                                : '#eab308',
                            color: '#ffffff',
                            fontSize: '0.7rem',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                          }}
                        >
                          {dynamicTpl.status || 'AVAILABLE'}
                        </span>
                      </div>
                    </div>

                    {/* SUPER_ADMIN Lifecycle Controls */}
                    {userRole === 'SUPER_ADMIN' && (
                      <div
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: 'var(--admin-surface-inset)',
                          borderTop: '1px solid var(--admin-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--admin-text)' }}>
                          Lifecycle:
                        </span>
                        <select
                          id={`select-status-${dynamicTpl.id}`}
                          value={dynamicTpl.status || 'AVAILABLE'}
                          disabled={updatingStatusTheme === dynamicTpl.themeCode}
                          onChange={(e) =>
                            handleStatusChange(dynamicTpl.id, dynamicTpl.themeCode || '', e.target.value)
                          }
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.4rem',
                            borderRadius: 'var(--admin-radius-sm)',
                            border: '1px solid var(--admin-border)',
                            background: 'var(--admin-surface)',
                            color: 'var(--admin-text)',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="AVAILABLE">AVAILABLE</option>
                          <option value="HIDDEN">HIDDEN</option>
                          <option value="ARCHIVED">ARCHIVED</option>
                        </select>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="template-card__actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                      <button
                        type="button"
                        id={`use-template-${dynamicTpl.id}`}
                        className="template-card__btn template-card__btn--select"
                        onClick={() => router.push(`/events/create?templateId=${encodeURIComponent(dynamicTpl.id)}`)}
                        disabled={dynamicTpl.status !== 'AVAILABLE'}
                        title={dynamicTpl.status !== 'AVAILABLE' ? `Template is ${dynamicTpl.status}` : 'Use Template'}
                        style={{
                          opacity: dynamicTpl.status === 'AVAILABLE' ? 1 : 0.5,
                          cursor: dynamicTpl.status === 'AVAILABLE' ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Use Template
                      </button>

                      {/* Permanent Delete button only shown when status === 'ARCHIVED' */}
                      {userRole === 'SUPER_ADMIN' && isArchived && (
                        <button
                          type="button"
                          id={`btn-permanent-delete-${dynamicTpl.id}`}
                          disabled={!canDelete}
                          title={
                            usage > 0
                              ? `Cannot delete template: used in ${usage} event(s). Only templates with 0 events can be permanently deleted.`
                              : 'Permanently delete this template'
                          }
                          className="studio-btn studio-btn--danger"
                          onClick={() => {
                            if (canDelete) {
                              setTemplateToDelete(dynamicTpl);
                              setDeleteConfirmInput('');
                              setDeleteError(null);
                            }
                          }}
                          style={{
                            width: '100%',
                            opacity: canDelete ? 1 : 0.5,
                            cursor: canDelete ? 'pointer' : 'not-allowed',
                            fontSize: '0.75rem',
                            padding: '0.4rem 0.6rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          Delete Permanently
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Confirmation Modal: Permanently Delete Template */}
      {templateToDelete && (
        <div
          id="permanent-delete-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)',
            padding: '1rem',
          }}
          onClick={() => {
            if (!isDeleting) {
              setTemplateToDelete(null);
              setDeleteConfirmInput('');
              setDeleteError(null);
            }
          }}
        >
          <div
            id="permanent-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            style={{
              background: 'var(--admin-surface, #ffffff)',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '1.75rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--admin-border, #e2e8f0)',
              color: 'var(--admin-text, #111827)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </div>
              <div>
                <h3 id="delete-modal-title" style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                  Permanently Delete Template
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--admin-text-secondary)' }}>
                  Konfirmasi tindakan destruktif permanen
                </p>
              </div>
            </div>

            {/* Template Summary Table / Details */}
            <div
              id="delete-template-summary"
              style={{
                background: 'var(--admin-surface-inset, #f8fafc)',
                border: '1px solid var(--admin-border, #e2e8f0)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.35rem' }}>
                <span style={{ color: 'var(--admin-text-secondary)', fontWeight: 600 }}>Template:</span>
                <span id="delete-modal-template-name" style={{ fontWeight: 600 }}>{templateToDelete.name}</span>

                <span style={{ color: 'var(--admin-text-secondary)', fontWeight: 600 }}>Theme Code:</span>
                <span id="delete-modal-template-code" style={{ fontFamily: 'monospace' }}>{templateToDelete.themeCode}</span>

                <span style={{ color: 'var(--admin-text-secondary)', fontWeight: 600 }}>Status:</span>
                <span id="delete-modal-template-status">{templateToDelete.status || 'ARCHIVED'}</span>

                <span style={{ color: 'var(--admin-text-secondary)', fontWeight: 600 }}>Event Usage:</span>
                <span id="delete-modal-template-usage">{templateToDelete.eventUsageCount ?? 0} events</span>
              </div>
            </div>

            {/* Destructive Warning Box */}
            <div
              style={{
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.25)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.8125rem',
                lineHeight: 1.4,
              }}
            >
              <strong style={{ color: '#dc2626' }}>Peringatan:</strong>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--admin-text)' }}>
                Tindakan ini tidak dapat dibatalkan. Baris data template akan dihapus secara permanen dari basis data.
              </p>
            </div>

            {deleteError && (
              <div
                id="delete-modal-error"
                role="alert"
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.8125rem',
                  marginBottom: '1rem',
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="confirm-delete-template-input"
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  marginBottom: '0.35rem',
                  color: 'var(--admin-text)',
                }}
              >
                Ketik <strong>DELETE</strong> untuk mengonfirmasi:
              </label>
              <input
                id="confirm-delete-template-input"
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="DELETE"
                disabled={isDeleting}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--admin-border)',
                  background: 'var(--admin-surface)',
                  color: 'var(--admin-text)',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                id="cancel-delete-template-btn"
                className="studio-btn studio-btn--secondary"
                disabled={isDeleting}
                onClick={() => {
                  setTemplateToDelete(null);
                  setDeleteConfirmInput('');
                  setDeleteError(null);
                }}
              >
                Batal
              </button>
              <button
                type="button"
                id="confirm-delete-template-btn"
                className="studio-btn studio-btn--danger"
                disabled={deleteConfirmInput !== 'DELETE' || isDeleting}
                onClick={handlePermanentDelete}
                style={{
                  opacity: deleteConfirmInput === 'DELETE' && !isDeleting ? 1 : 0.5,
                  cursor: deleteConfirmInput === 'DELETE' && !isDeleting ? 'pointer' : 'not-allowed',
                }}
              >
                {isDeleting ? 'Menghapus...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
