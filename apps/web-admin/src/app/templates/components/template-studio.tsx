'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  TemplateConfigV1,
  EditorSnapshot,
  createEditorSnapshot,
  isEditorDirty,
  validateEditorState,
  buildTemplatePayload,
  buildPreviewMessage,
  updateThemeColor, updateTypography, toggleSection, moveSection, reorderSections,
} from '../utils/template-studio-model';
import {
  FIXED_CATALOG_TEMPLATES,
  CatalogTemplate,
} from '../utils/catalog-registry';
import { ADMIN_FONT_MAP } from '../utils/admin-fonts';
import { buildTemplatePackageFormData, parsePackageManifest } from '../utils/template-package';
import { ColorControls } from './color-controls';
import { TypographyControls } from './typography-controls';
import { SectionManager } from './section-manager';

export interface TemplateStudioProps {
  mode: 'create' | 'edit';
  templateId?: string;
  initialData?: {
    name: string;
    themeCode: string;
    config?: TemplateConfigV1 | null;
    assets?: Array<{ id: string; slot: 'thumbnail' | 'background' | 'ornament' | 'music'; order: number; mimeType: string }>;
  };
}

export function TemplateStudio({ mode, templateId, initialData }: TemplateStudioProps) {
  const router = useRouter();

  // Pick default curated design
  const defaultCatalogItem = FIXED_CATALOG_TEMPLATES[0]; // Verdant Estate
  const defaultInitialConfig = initialData?.config || defaultCatalogItem.config;
  const defaultInitialName =
    initialData?.name || (mode === 'create' ? 'Template Baru' : 'Untitled Template');

  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(
    mode === 'create' ? defaultCatalogItem.id : ''
  );

  const [initialSnapshot, setInitialSnapshot] = useState<EditorSnapshot>(() =>
    createEditorSnapshot(defaultInitialName, defaultInitialConfig)
  );
  const [currentSnapshot, setCurrentSnapshot] = useState<EditorSnapshot>(() =>
    createEditorSnapshot(defaultInitialName, defaultInitialConfig)
  );

  const [saving, setSaving] = useState(false);
  const [previewAssets, setPreviewAssets] = useState<Array<{ slot: string; order: number; blob: Blob }>>([]);
  const [newThemeCode, setNewThemeCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Preview iframe ref and origin
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const invitationOrigin =
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN || 'http://localhost:3002';
  const previewSrc = `${invitationOrigin}/preview/template`;
  const [iframeStatus, setIframeStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const dirty = isEditorDirty(initialSnapshot, currentSnapshot);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all((initialData?.assets ?? []).map(async (asset) => {
      const response = await fetch(`/api/template-assets/${encodeURIComponent(asset.id)}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Aset preview belum dapat dimuat. Muat ulang halaman.');
      return { slot: asset.slot, order: asset.order, blob: await response.blob() };
    })).then((assets) => { if (!controller.signal.aborted) setPreviewAssets(assets); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setErrorMessage(error instanceof Error ? error.message : 'Preview gagal dimuat.'); });
    return () => controller.abort();
  }, [initialData?.assets]);

  // Unsaved changes navigation guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  // Send postMessage update to preview iframe
  const sendPreviewUpdate = useCallback(
    (snapshot: typeof currentSnapshot) => {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow || iframeStatus !== 'ready') return;
      if (!invitationOrigin) return;

      try {
        iframe.contentWindow.postMessage(
          { ...buildPreviewMessage(snapshot), payload: { ...buildPreviewMessage(snapshot).payload, assets: previewAssets } },
          invitationOrigin // Exact targetOrigin — NEVER '*'
        );
      } catch {
        // Silently swallow cross-origin postMessage errors
      }
    },
    [iframeRef, invitationOrigin, iframeStatus, previewAssets]
  );

  // Listen for PREVIEW_READY from the iframe, then send initial state
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== invitationOrigin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (
        event.data &&
        typeof event.data === 'object' &&
        event.data.type === 'PREVIEW_READY' &&
        event.data.version === 1
      ) {
        setIframeStatus('ready');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [invitationOrigin]);

  // Send preview update whenever currentSnapshot changes
  useEffect(() => {
    if (iframeStatus === 'ready') {
      sendPreviewUpdate(currentSnapshot);
    }
  }, [currentSnapshot, iframeStatus, sendPreviewUpdate]);

  const handleBack = () => {
    if (dirty) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmLeave) return;
    }
    router.push('/templates');
  };

  const handleNameChange = (name: string) => {
    setCurrentSnapshot((prev) => ({ ...prev, name }));
  };

  const handleSelectCatalogBase = (catalogItem: CatalogTemplate) => {
    setSelectedCatalogId(catalogItem.id);
    setCurrentSnapshot({
      name: currentSnapshot.name,
      config: JSON.parse(JSON.stringify(catalogItem.config)),
    });
  };

  const handleSave = async () => {
    setErrorMessage(null);

    // Validate using pure model validator
    const validation = validateEditorState(currentSnapshot);
    if (!validation.valid) {
      setErrorMessage(validation.errors[0]?.message || 'Validation failed');
      return;
    }

    setSaving(true);
    try {
      const themeCode = mode === 'create' ? newThemeCode.trim() : initialData?.themeCode || 'GENERIC';
      const payload = buildTemplatePayload(currentSnapshot, mode, themeCode);
      const url = mode === 'create' ? '/api/templates/package' : `/api/templates/${templateId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const manifestJson = JSON.stringify({ ...payload, schemaVersion: 1, renderer: 'GENERIC' });
      const body = mode === 'create'
        ? buildTemplatePackageFormData({ manifest: parsePackageManifest(manifestJson), manifestJson, assets: [], sourceName: 'Studio' })
        : JSON.stringify(payload);

      const res = await fetch(url, {
        method,
        headers: mode === 'create' ? undefined : { 'Content-Type': 'application/json' },
        body,
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.status === 403) {
        setErrorMessage('Forbidden: only Super Admins can manage templates.');
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save template');
      }

      setToastMessage({
        text: mode === 'create' ? 'Draft template tersimpan. Publikasikan dari katalog.' : 'Template updated!',
        type: 'success',
      });

      // Update baseline snapshot so dirty state is false
      setInitialSnapshot(currentSnapshot);

      setTimeout(() => {
        router.push('/templates');
      }, 1000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const headingFontKey = currentSnapshot.config.typography.headingFont;
  const bodyFontKey = currentSnapshot.config.typography.bodyFont;
  const headingFontLabel =
    ADMIN_FONT_MAP[headingFontKey]?.label || headingFontKey;
  const bodyFontLabel = ADMIN_FONT_MAP[bodyFontKey]?.label || bodyFontKey;
  const enabledSections = currentSnapshot.config.sections.filter((s) => s.enabled);

  return (
    <div className="studio-page">
      {/* Top Navigation Bar */}
      <header className="studio-topbar">
        <div className="studio-topbar__left">
          <button
            type="button"
            className="studio-btn studio-btn--ghost studio-topbar__back"
            onClick={handleBack}
            aria-label="Back to templates"
          >
            ← Back
          </button>
          <div className="studio-topbar__title-group">
            <h1 className="studio-topbar__title">
              {mode === 'create' ? 'Buat Draft Template' : 'Edit Template'}
            </h1>
            <span className="studio-badge studio-badge--fixed">Template Studio</span>
          </div>
        </div>

        <div className="studio-topbar__actions">
          <button
            type="button"
            className="studio-btn studio-btn--secondary"
            onClick={handleBack}
          >
            Cancel
          </button>
          <button
            type="button"
            className="studio-btn studio-btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Menyimpan…' : mode === 'create' ? 'Simpan Draft' : 'Save Changes'}
          </button>
        </div>
      </header>

      {/* Main Studio Body: 2-Column (Fixed Catalog Selector & Tokens / Live Phone Preview) */}
      <div className="studio-body">
        {/* Left Column: Fixed Base Selection & Details */}
        <main className="studio-config" style={{ padding: 'var(--admin-space-xl)' }}>
          {errorMessage && (
            <div className="studio-banner studio-banner--error" role="alert">
              <div>
                <strong>Error</strong>
                <p style={{ margin: '4px 0 0 0' }}>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Template Name Input */}
          {mode === 'create' && <div className="studio-field">
            <label className="studio-label" htmlFor="template-code-input">Kode template baru</label>
            <input id="template-code-input" className="studio-input" value={newThemeCode} onChange={(event) => setNewThemeCode(event.target.value.toUpperCase())} placeholder="CONTOH_GARDEN" maxLength={60} required />
            <p className="studio-field__hint">Gunakan kode unik: huruf besar, angka, dan underscore. Layout mengikuti preview di sebelah.</p>
          </div>}
          <div className="studio-field">
            <label className="studio-label" htmlFor="template-name-input">
              Template Display Name
            </label>
            <input
              id="template-name-input"
              type="text"
              className="studio-input"
              value={currentSnapshot.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Verdant Estate Luxury"
              required
            />
            <p className="studio-field__hint">
              This name will be displayed in the template catalog and event creation dialogs.
            </p>
          </div>

          {/* Fixed Base Design Selection */}
          <div style={{ marginTop: 'var(--admin-space-xl)' }}>
            <h2 className="studio-config__title" style={{ fontSize: 'var(--admin-font-size-lg)' }}>
              Preset warna &amp; tipografi
            </h2>
            <p className="studio-config__desc">
              Pilih kombinasi awal, lalu atur warna, font, dan bagian di bawah. Layout mengikuti preview; preset tidak menyalin layout template katalog.
            </p>

            <div className="catalog-base-grid">
              {FIXED_CATALOG_TEMPLATES.map((item) => {
                const isSelected = selectedCatalogId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`catalog-base-card ${isSelected ? 'catalog-base-card--selected' : ''}`}
                    onClick={() => handleSelectCatalogBase(item)}
                  >
                    <div className="catalog-base-card__header">
                      <span className="catalog-base-card__name">{item.name}</span>
                      <span className="catalog-base-card__code">{item.themeCode}</span>
                    </div>

                    <p className="catalog-base-card__desc">{item.description}</p>

                    <div className="catalog-base-card__footer">
                      <div className="template-card__palette">
                        <span
                          className="template-card__swatch"
                          style={{ backgroundColor: item.config.theme.primaryColor }}
                        />
                        <span
                          className="template-card__swatch"
                          style={{ backgroundColor: item.config.theme.secondaryColor }}
                        />
                        <span
                          className="template-card__swatch"
                          style={{ backgroundColor: item.config.theme.backgroundColor }}
                        />
                        <span
                          className="template-card__swatch"
                          style={{ backgroundColor: item.config.theme.textColor }}
                        />
                      </div>
                      <span className="catalog-base-card__tag">{item.category}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fixed Design Specification Summary */}
          <ColorControls colors={currentSnapshot.config.theme} onChange={(key, value) => setCurrentSnapshot((previous) => ({ ...previous, config: updateThemeColor(previous.config, key, value) }))} disabled={saving} />
          <TypographyControls typography={currentSnapshot.config.typography} onChange={(key, value) => setCurrentSnapshot((previous) => ({ ...previous, config: updateTypography(previous.config, key, value) }))} disabled={saving} />
          <SectionManager sections={currentSnapshot.config.sections}
            onToggle={(id, enabled) => setCurrentSnapshot((previous) => ({ ...previous, config: toggleSection(previous.config, id, enabled) }))}
            onMove={(id, direction) => setCurrentSnapshot((previous) => ({ ...previous, config: moveSection(previous.config, id, direction) }))}
            onReorder={(from, to) => setCurrentSnapshot((previous) => ({ ...previous, config: reorderSections(previous.config, from, to) }))}
            disabled={saving} />
          <div style={{ marginTop: 'var(--admin-space-xl)' }} className="studio-design-summary">
            <h3 className="studio-design-summary__title">Ringkasan Desain</h3>
            <div className="studio-design-summary__grid">
              <div className="studio-design-summary__item">
                <span className="studio-design-summary__label">Heading Typography</span>
                <span className="studio-design-summary__value">{headingFontLabel}</span>
              </div>
              <div className="studio-design-summary__item">
                <span className="studio-design-summary__label">Body Typography</span>
                <span className="studio-design-summary__value">{bodyFontLabel}</span>
              </div>
              <div className="studio-design-summary__item">
                <span className="studio-design-summary__label">Active Sections</span>
                <span className="studio-design-summary__value">
                  {enabledSections.length} sections active
                </span>
              </div>
              <div className="studio-design-summary__item">
                <span className="studio-design-summary__label">Customization Policy</span>
                <span className="studio-design-summary__value">Warna, font, dan urutan bagian</span>
              </div>
            </div>
          </div>
        </main>

        {/* Right Column: Live Phone Preview Frame */}
        <aside className="studio-preview" aria-label="Live invitation preview panel">
          <div className="studio-preview__header">
            <span className="studio-preview__label">Live Invitation Preview</span>
            <span className="studio-preview__sections-count">
              {enabledSections.length} sections
            </span>
          </div>

          <div className="studio-preview__phone-frame" aria-label="Phone preview viewport">
            {iframeStatus === 'loading' && (
              <div className="studio-preview__overlay studio-preview__overlay--loading">
                <div className="studio-preview__spinner" />
                <span className="studio-preview__overlay-text">Loading live preview...</span>
              </div>
            )}

            <iframe
              ref={iframeRef}
              src={previewSrc}
              title="Invitation preview"
              className="studio-preview__iframe"
              onLoad={() => {
                setIframeStatus('ready');
                sendPreviewUpdate(currentSnapshot);
              }}
              onError={() => setIframeStatus('error')}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>

          {/* Color palette swatches */}
          <div className="studio-preview__palette" aria-label="Palette summary">
            <span
              className="studio-preview__swatch"
              style={{ backgroundColor: currentSnapshot.config.theme.primaryColor }}
              title={`Primary: ${currentSnapshot.config.theme.primaryColor}`}
            />
            <span
              className="studio-preview__swatch"
              style={{ backgroundColor: currentSnapshot.config.theme.secondaryColor }}
              title={`Secondary: ${currentSnapshot.config.theme.secondaryColor}`}
            />
            <span
              className="studio-preview__swatch"
              style={{ backgroundColor: currentSnapshot.config.theme.backgroundColor }}
              title={`Background: ${currentSnapshot.config.theme.backgroundColor}`}
            />
            <span
              className="studio-preview__swatch"
              style={{ backgroundColor: currentSnapshot.config.theme.textColor }}
              title={`Text: ${currentSnapshot.config.theme.textColor}`}
            />
          </div>
        </aside>
      </div>

      {toastMessage && (
        <div className={`studio-toast studio-toast--${toastMessage.type}`} role="status">
          {toastMessage.text}
        </div>
      )}
    </div>
  );
}
