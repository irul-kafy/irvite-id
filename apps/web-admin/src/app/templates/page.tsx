'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TemplateCard, TemplateCardItem } from './components/template-card';
import {
  CATALOG_CATEGORIES,
  CatalogCategory,
  filterCatalogTemplates,
} from './utils/catalog-registry';
import { TemplateConfigV1, buildPreviewMessage } from './utils/template-studio-model';
import './template-studio.css';

export default function TemplateCatalogPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<CatalogCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [dbTemplates, setDbTemplates] = useState<TemplateCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live Preview Modal State
  const [previewTemplate, setPreviewTemplate] = useState<{
    name: string;
    config: TemplateConfigV1;
    themeCode: string;
  } | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const invitationOrigin =
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN || 'http://localhost:3002';
  const previewSrc = `${invitationOrigin}/preview/template`;

  // Request Custom Design Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);

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

        if (isMounted) {
          setIsSuperAdmin(role === 'SUPER_ADMIN');
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

  // Send postMessage to preview iframe when template changes or iframe is ready
  const sendPreviewUpdate = useCallback(
    (name: string, config: TemplateConfigV1, themeCode: string = 'GENERIC') => {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow || !iframeReady) return;
      if (!invitationOrigin) return;

      try {
        iframe.contentWindow.postMessage(
          buildPreviewMessage({ name, config }, themeCode),
          invitationOrigin
        );
      } catch {
        // Silently swallow cross-origin postMessage errors
      }
    },
    [iframeRef, invitationOrigin, iframeReady]
  );

  // When preview template or iframe readiness changes, push update
  useEffect(() => {
    if (previewTemplate && iframeReady) {
      sendPreviewUpdate(
        previewTemplate.name,
        previewTemplate.config,
        previewTemplate.themeCode,
      );
    }
  }, [previewTemplate, iframeReady, sendPreviewUpdate]);

  // Listen to ready signal from preview iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== invitationOrigin) return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data?.type === 'PREVIEW_READY' && e.data?.version === 1) {
        setIframeReady(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [invitationOrigin]);

  // Filter Catalog Templates
  const filteredCatalog = filterCatalogTemplates(selectedCategory, searchQuery).map(
    (t) => ({
      ...t,
      isCatalog: true,
    })
  );

  const handleOpenPreview = (
    config: TemplateConfigV1,
    name: string,
    themeCode: string = 'GENERIC',
  ) => {
    setPreviewTemplate({ name, config, themeCode });
    setIframeReady(false);
  };

  const handleClosePreview = () => {
    setPreviewTemplate(null);
    setIframeReady(false);
  };

  const handleUseTemplate = (template: TemplateCardItem) => {
    // If standard admin or user, navigate to create event with preselected template
    router.push(`/events/create?template=${encodeURIComponent(template.name)}`);
  };

  return (
    <div className="studio-page catalog-page">
      {/* Page Header */}
      <header className="page-header catalog-header">
        <div className="page-header__left">
          <div className="catalog-header__badge">Curated Collection</div>
          <h1 className="catalog-header__title">Invitation Template Catalog</h1>
          <p className="catalog-header__subtitle">
            Select a ready-to-use, designer-crafted web invitation. Each template features a
            harmonious fixed layout, bespoke typography, and responsive animations.
          </p>
        </div>

        <div className="catalog-header__actions">
          <button
            type="button"
            className="studio-btn studio-btn--secondary"
            onClick={() => setShowCustomModal(true)}
          >
            ✨ Request Custom Design
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              className="studio-btn studio-btn--primary"
              onClick={() => router.push('/templates/create')}
            >
              + Create Template
            </button>
          )}
        </div>
      </header>

      {/* Filter & Search Bar */}
      <div className="catalog-filter-bar">
        <div className="catalog-category-tabs" role="tablist" aria-label="Template categories">
          {CATALOG_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={selectedCategory === category}
              className={`catalog-tab ${selectedCategory === category ? 'catalog-tab--active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="catalog-search">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className="catalog-search__icon"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search templates, tags, or styles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="catalog-search__input"
          />
          {searchQuery && (
            <button
              type="button"
              className="catalog-search__clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="catalog-status catalog-status--error" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <p className="catalog-status" role="status">
          Loading curated templates…
        </p>
      )}

      {/* Main Content Area */}
      <main className="catalog-main">
        {/* Curated Fixed Templates Section */}
        <section className="catalog-section" aria-label="Curated Templates">
          <div className="catalog-section__header">
            <h2 className="catalog-section__title">
              {selectedCategory === 'All'
                ? 'All Ready-Made Templates'
                : `${selectedCategory} Templates`}
            </h2>
            <span className="catalog-section__count">
              {filteredCatalog.length} {filteredCatalog.length === 1 ? 'template' : 'templates'}
            </span>
          </div>

          {filteredCatalog.length === 0 ? (
            <div className="catalog-empty">
              <p>No templates found matching &quot;{searchQuery}&quot;. Try a different search term or category.</p>
              <button
                type="button"
                className="studio-btn studio-btn--secondary"
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="template-grid" role="list">
              {filteredCatalog.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  canEdit={false}
                  onPreview={handleOpenPreview}
                  onUseTemplate={handleUseTemplate}
                />
              ))}
            </div>
          )}
        </section>

        {/* Database Custom Templates Section (if any exist) */}
        {dbTemplates.length > 0 && selectedCategory === 'All' && !searchQuery && (
          <section className="catalog-section" style={{ marginTop: 'var(--admin-space-2xl)' }}>
            <div className="catalog-section__header">
              <h2 className="catalog-section__title">Custom & Published Templates</h2>
              <span className="catalog-section__count">{dbTemplates.length} custom</span>
            </div>

            <div className="template-grid" role="list">
              {dbTemplates.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  canEdit={isSuperAdmin}
                  onPreview={handleOpenPreview}
                  onUseTemplate={handleUseTemplate}
                />
              ))}
            </div>
          </section>
        )}

        {/* Custom Design Banner */}
        <div className="catalog-custom-banner">
          <div className="catalog-custom-banner__content">
            <h3 className="catalog-custom-banner__title">Looking for a Bespoke Custom Invitation?</h3>
            <p className="catalog-custom-banner__text">
              Our design team crafts one-of-a-kind hand-painted illustrations, custom 3D animations,
              and tailored wedding visual identities.
            </p>
          </div>
          <button
            type="button"
            className="studio-btn studio-btn--primary"
            onClick={() => setShowCustomModal(true)}
          >
            Contact Design Team →
          </button>
        </div>
      </main>

      {/* Live Preview Modal */}
      {previewTemplate && (
        <div
          className="catalog-preview-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview of ${previewTemplate.name}`}
        >
          <div className="catalog-preview-modal__backdrop" onClick={handleClosePreview} />

          <div className="catalog-preview-modal__container">
            {/* Header */}
            <div className="catalog-preview-modal__header">
              <div className="catalog-preview-modal__title-group">
                <span className="catalog-preview-modal__badge">Live Invitation Preview</span>
                <h2 className="catalog-preview-modal__title">{previewTemplate.name}</h2>
              </div>

              <div className="catalog-preview-modal__actions">
                <button
                  type="button"
                  className="studio-btn studio-btn--primary"
                  onClick={() => {
                    handleClosePreview();
                    router.push(
                      `/events/create?template=${encodeURIComponent(previewTemplate.name)}`
                    );
                  }}
                >
                  Use This Template
                </button>
                <button
                  type="button"
                  className="catalog-preview-modal__close"
                  onClick={handleClosePreview}
                  aria-label="Close preview"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Phone Frame */}
            <div className="catalog-preview-modal__body">
              <div className="studio-preview__device-frame">
                {/* Speaker Notch */}
                <div className="studio-preview__notch" aria-hidden="true">
                  <div className="studio-preview__speaker" />
                  <div className="studio-preview__camera" />
                </div>

                {/* Loading Indicator */}
                {!iframeReady && (
                  <div className="studio-preview__loading" aria-label="Loading preview">
                    <div className="studio-preview__spinner" />
                    <span>Rendering live invitation...</span>
                  </div>
                )}

                {/* Preview iframe */}
                <iframe
                  ref={iframeRef}
                  src={previewSrc}
                  className="studio-preview__iframe"
                  title="Live Invitation Template Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Custom Design Modal */}
      {showCustomModal && (
        <div
          className="catalog-preview-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Request Custom Design"
        >
          <div
            className="catalog-preview-modal__backdrop"
            onClick={() => setShowCustomModal(false)}
          />
          <div className="catalog-custom-modal__container">
            <div className="catalog-custom-modal__header">
              <h2>Request Custom Invitation Design</h2>
              <button
                type="button"
                className="catalog-preview-modal__close"
                onClick={() => setShowCustomModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="catalog-custom-modal__body">
              <p>
                Have a unique vision or theme in mind? Our studio team creates bespoke digital
                invitations tailored to your exact wedding aesthetic.
              </p>
              <div className="catalog-custom-modal__features">
                <div className="catalog-custom-modal__feature-item">
                  ✨ Custom watercolor / oil painting illustrations
                </div>
                <div className="catalog-custom-modal__feature-item">
                  🎨 Unique typography & color harmony consultation
                </div>
                <div className="catalog-custom-modal__feature-item">
                  📱 Tailored interactive animations & music scoring
                </div>
              </div>
              <div className="catalog-custom-modal__cta">
                <a
                  href="mailto:design@invitation-platform.com?subject=Custom%20Design%20Request"
                  className="studio-btn studio-btn--primary"
                  style={{ textDecoration: 'none', textAlign: 'center' }}
                >
                  Email Design Studio
                </a>
                <button
                  type="button"
                  className="studio-btn studio-btn--secondary"
                  onClick={() => setShowCustomModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
