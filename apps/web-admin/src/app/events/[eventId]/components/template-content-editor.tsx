'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ContentFieldDefinition, ContentFieldRenderer } from './content-field-renderer';
import { GiftAccountsEditor, GiftAccountItem } from './gift-accounts-editor';
import { RepeaterEditor } from './repeater-editor';

interface TemplateDefinitionResponse {
  templateId: string;
  themeCode: string;
  schemaVersion: number;
  contentFields: ContentFieldDefinition[];
  mediaSlots: unknown[];
}

interface TemplateContentEditorProps {
  eventId: string;
  templateId?: string | null;
  initialContent?: Record<string, unknown> | null;
  onContentSaved?: (savedContent: Record<string, unknown> | null) => void;
}

/**
 * Canonical normalization for editable client template content.
 * - Strips server-controlled _schemaVersion
 * - Omits optional empty strings
 * - Omits null / undefined optional values
 * - Omits empty optional arrays
 * - Preserves meaningful populated values
 * - Strictly preserves accountNumber as STRING (including leading zeros)
 * - Preserves array ordering
 * - Does not mutate source object
 * - Sorts object keys for stable deterministic JSON comparison
 */
export function normalizeEditableContent(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const result: Record<string, unknown> = {};
  const keys = Object.keys(raw).sort();

  for (const k of keys) {
    if (k === '_schemaVersion') continue; // Never editable or present in client payload

    const v = raw[k];
    if (v === '' || v === null || v === undefined) continue;

    if (Array.isArray(v)) {
      if (v.length === 0) continue;

      if (k === 'giftAccounts') {
        const cleanedAccounts = (v as Array<Record<string, unknown>>)
          .filter((acc) => {
            if (!acc || typeof acc !== 'object') return false;
            const b = acc.bankName !== undefined && String(acc.bankName).trim() !== '';
            const n = acc.accountNumber !== undefined && String(acc.accountNumber).trim() !== '';
            const h = acc.accountHolderName !== undefined && String(acc.accountHolderName).trim() !== '';
            return b || n || h;
          })
          .map((acc) => ({
            bankName: acc.bankName !== undefined ? String(acc.bankName).trim() : '',
            accountNumber: acc.accountNumber !== undefined ? String(acc.accountNumber).trim() : '',
            accountHolderName: acc.accountHolderName !== undefined ? String(acc.accountHolderName).trim() : '',
          }));

        if (cleanedAccounts.length > 0) {
          result[k] = cleanedAccounts;
        }
      } else if (k === 'ceremonies') {
        const cleanedCeremonies = (v as Array<Record<string, unknown>>)
          .filter((c) => {
            if (!c || typeof c !== 'object') return false;
            return Boolean(c.title || c.venue || c.dateTime || c.address || c.mapsUrl);
          })
          .map((c) => {
            const item: Record<string, unknown> = {};
            if (c.title !== undefined && String(c.title).trim() !== '') {
              item.title = String(c.title).trim();
            }
            if (c.dateTime !== undefined && String(c.dateTime).trim() !== '') {
              item.dateTime = String(c.dateTime).trim();
            }
            if (c.venue !== undefined && String(c.venue).trim() !== '') {
              item.venue = String(c.venue).trim();
            }
            if (c.address !== undefined && String(c.address).trim() !== '') {
              item.address = String(c.address).trim();
            }
            if (c.mapsUrl !== undefined && String(c.mapsUrl).trim() !== '') {
              item.mapsUrl = String(c.mapsUrl).trim();
            }
            return item;
          });

        if (cleanedCeremonies.length > 0) {
          result[k] = cleanedCeremonies;
        }
      } else {
        const cleaned = v.filter((item) => item !== '' && item !== null && item !== undefined);
        if (cleaned.length > 0) {
          result[k] = cleaned;
        }
      }
    } else if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed !== '') {
        result[k] = trimmed;
      }
    } else if (typeof v === 'object') {
      const normalizedChild = normalizeEditableContent(v as Record<string, unknown>);
      if (Object.keys(normalizedChild).length > 0) {
        result[k] = normalizedChild;
      }
    } else {
      result[k] = v;
    }
  }

  return result;
}

export function TemplateContentEditor({
  eventId,
  templateId,
  initialContent,
  onContentSaved,
}: TemplateContentEditorProps) {
  const [definition, setDefinition] = useState<TemplateDefinitionResponse | null>(null);
  const [loadingDef, setLoadingDef] = useState(Boolean(templateId));
  const [unsupportedTemplate, setUnsupportedTemplate] = useState(false);
  const [defError, setDefError] = useState<string | null>(null);

  // Form content state
  const [content, setContent] = useState<Record<string, unknown>>(() => initialContent || {});
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => JSON.stringify(normalizeEditableContent(initialContent)));

  // Operation states
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch definition when templateId changes
  useEffect(() => {
    if (!templateId) return;

    let isMounted = true;
    const fetchDef = async () => {
      setLoadingDef(true);
      setDefError(null);
      setUnsupportedTemplate(false);

      try {
        const res = await fetch(`/api/templates/${templateId}/definition`);
        if (!isMounted) return;
        if (res.status === 404) {
          setUnsupportedTemplate(true);
          return;
        }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Gagal memuat definisi template');
        }
        const data = await res.json();
        if (isMounted) setDefinition(data);
      } catch (err: unknown) {
        if (isMounted) {
          setDefError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat definisi');
        }
      } finally {
        if (isMounted) setLoadingDef(false);
      }
    };

    void fetchDef();

    return () => {
      isMounted = false;
    };
  }, [templateId]);

  // Handle individual field updates
  const handleFieldChange = useCallback((key: string, val: unknown) => {
    setContent((prev) => {
      const next = { ...prev };
      if (val === '' || val === null || val === undefined) {
        delete next[key];
      } else {
        next[key] = val;
      }
      return next;
    });
    setSaveSuccessMsg(null);
    setErrorMessage(null);
  }, []);

  // Build clean payload for saving using canonical normalization
  const cleanPayload = useMemo(() => {
    return normalizeEditableContent(content);
  }, [content]);

  // Dirty state calculation
  const isDirty = useMemo(() => {
    return JSON.stringify(cleanPayload) !== savedSnapshot;
  }, [cleanPayload, savedSnapshot]);

  // Save content handler
  const handleSave = async () => {
    setSaving(true);
    setSaveSuccessMsg(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: Object.keys(cleanPayload).length > 0 ? cleanPayload : null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan konten template');
      }

      const updated = data.content || cleanPayload;
      const normalizedUpdated = normalizeEditableContent(updated);
      setSavedSnapshot(JSON.stringify(normalizedUpdated));
      setContent(normalizedUpdated);
      setSaveSuccessMsg('Konten template berhasil disimpan.');
      if (onContentSaved) onContentSaved(normalizedUpdated);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan konten'
      );
    } finally {
      setSaving(false);
    }
  };

  // Explicit Clear Content Handler
  const handleClearContent = async () => {
    setClearing(true);
    setErrorMessage(null);
    setSaveSuccessMsg(null);

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengosongkan konten template');
      }

      setContent({});
      setSavedSnapshot(JSON.stringify({}));
      setShowClearConfirm(false);
      setSaveSuccessMsg('Konten template berhasil dikosongkan.');
      if (onContentSaved) onContentSaved(null);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat mengosongkan konten'
      );
    } finally {
      setClearing(false);
    }
  };

  // Early returns for template state
  if (!templateId) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Belum Ada Template yang Dipilih
          </h3>
          <p className="text-sm text-muted" style={{ maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
            Acara ini belum menggunakan template tertentu. Silakan pilih template terlebih dahulu pada menu Edit Detail Acara untuk mengaktifkan pengisian konten khusus.
          </p>
          <a href={`/events/${eventId}/edit`} className="btn btn-primary btn-sm">
            Pilih Template Sekarang &rarr;
          </a>
        </div>
      </div>
    );
  }

  if (loadingDef) {
    return (
      <div className="card">
        <div className="card-body flex-center gap-2" style={{ padding: '3rem' }}>
          <span className="spinner" style={{ width: 20, height: 20 }} />
          <span className="text-sm text-muted">Memuat formulir konten template...</span>
        </div>
      </div>
    );
  }

  if (unsupportedTemplate) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>ℹ️</div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Template Belum Mendukung Editor Terstruktur
          </h3>
          <p className="text-sm text-muted" style={{ maxWidth: '480px', margin: '0 auto' }}>
            Template ini belum mendukung editor konten terstruktur. Pengaturan acara standar tetap dapat dikelola melalui menu Edit Detail Acara.
          </p>
        </div>
      </div>
    );
  }

  if (defError || !definition) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--danger)' }}>⚠️</div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '0.5rem' }}>
            Gagal Memuat Formulir Template
          </h3>
          <p className="text-sm text-muted" style={{ maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
            {defError || 'Definisi template tidak dapat diakses.'}
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => window.location.reload()}
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  // Field dictionary for easy access
  const fieldMap = new Map<string, ContentFieldDefinition>();
  for (const f of definition.contentFields) {
    fieldMap.set(f.key, f);
  }

  const isIvoryGarden = definition.themeCode === 'IVORY_GARDEN';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Feedback */}
      <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Editor Konten Template ({definition.themeCode})
            </h2>
            <span className="badge badge--primary">Versi Skema: {definition.schemaVersion}</span>
          </div>
          <p className="text-sm text-muted" style={{ margin: 0 }}>
            Lengkapi data spesifik pasangan dan rangkaian acara sesuai tata letak baku template yang dipilih.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--danger)', border: '1px solid var(--danger)' }}
            onClick={() => setShowClearConfirm(true)}
            id="btn-clear-template-content"
          >
            Kosongkan Konten Template
          </button>

          <button
            type="button"
            className="btn btn-primary"
            disabled={!isDirty || saving}
            onClick={handleSave}
            id="btn-save-template-content"
          >
            {saving ? (
              <span className="flex-center gap-2">
                <span className="spinner" style={{ width: 14, height: 14 }} />
                Menyimpan...
              </span>
            ) : isDirty ? (
              'Simpan Konten Template *'
            ) : (
              'Tersimpan'
            )}
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div
          className="banner banner--success"
          style={{
            padding: '0.875rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--success-bg, #ecfdf5)',
            border: '1px solid var(--success-border, #a7f3d0)',
            color: 'var(--success-text, #065f46)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>✓</span>
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {errorMessage && (
        <div
          className="banner banner--error"
          style={{
            padding: '0.875rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--danger-bg, #fef2f2)',
            border: '1px solid var(--danger-border, #fecaca)',
            color: 'var(--danger, #b91c1c)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Presentation Grouping: IVORY_GARDEN */}
      {isIvoryGarden ? (
        <>
          {/* 01 — Nama & Keluarga */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-header__title">01 — Nama & Keluarga</h3>
            </div>
            <div className="card-body">
              <div className="grid-2" style={{ gap: '1.25rem' }}>
                {fieldMap.has('partnerOneName') && (
                  <ContentFieldRenderer
                    field={fieldMap.get('partnerOneName')!}
                    value={content.partnerOneName}
                    onChange={(val) => handleFieldChange('partnerOneName', val)}
                  />
                )}
                {fieldMap.has('partnerTwoName') && (
                  <ContentFieldRenderer
                    field={fieldMap.get('partnerTwoName')!}
                    value={content.partnerTwoName}
                    onChange={(val) => handleFieldChange('partnerTwoName', val)}
                  />
                )}
                {fieldMap.has('partnerOneParents') && (
                  <ContentFieldRenderer
                    field={fieldMap.get('partnerOneParents')!}
                    value={content.partnerOneParents}
                    onChange={(val) => handleFieldChange('partnerOneParents', val)}
                  />
                )}
                {fieldMap.has('partnerTwoParents') && (
                  <ContentFieldRenderer
                    field={fieldMap.get('partnerTwoParents')!}
                    value={content.partnerTwoParents}
                    onChange={(val) => handleFieldChange('partnerTwoParents', val)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 02 — Waktu & Lokasi */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-header__title">02 — Waktu & Lokasi</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="grid-2" style={{ gap: '1.25rem' }}>
                {fieldMap.has('timeZone') && (
                  <ContentFieldRenderer
                    field={fieldMap.get('timeZone')!}
                    value={content.timeZone}
                    onChange={(val) => handleFieldChange('timeZone', val)}
                  />
                )}
                {fieldMap.has('mapsUrl') && (
                  <ContentFieldRenderer
                    field={fieldMap.get('mapsUrl')!}
                    value={content.mapsUrl}
                    onChange={(val) => handleFieldChange('mapsUrl', val)}
                  />
                )}
              </div>

              {fieldMap.has('ceremonies') && (
                <RepeaterEditor
                  field={fieldMap.get('ceremonies')!}
                  items={(content.ceremonies as Array<Record<string, unknown>>) || []}
                  onChange={(items) => handleFieldChange('ceremonies', items)}
                />
              )}
            </div>
          </div>

          {/* 03 — Kata, Doa & Penutup */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-header__title">03 — Kata, Doa & Penutup</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {fieldMap.has('openingText') && (
                <ContentFieldRenderer
                  field={fieldMap.get('openingText')!}
                  value={content.openingText}
                  onChange={(val) => handleFieldChange('openingText', val)}
                />
              )}
              <div className="grid-2" style={{ gap: '1.25rem' }}>
                {fieldMap.has('prayerText') && (
                  <ContentFieldRenderer
                    field={fieldMap.get('prayerText')!}
                    value={content.prayerText}
                    onChange={(val) => handleFieldChange('prayerText', val)}
                  />
                )}
                {fieldMap.has('prayerSource') && (
                  <ContentFieldRenderer
                    field={fieldMap.get('prayerSource')!}
                    value={content.prayerSource}
                    onChange={(val) => handleFieldChange('prayerSource', val)}
                  />
                )}
              </div>
              {fieldMap.has('closingText') && (
                <ContentFieldRenderer
                  field={fieldMap.get('closingText')!}
                  value={content.closingText}
                  onChange={(val) => handleFieldChange('closingText', val)}
                />
              )}
            </div>
          </div>

          {/* 04 — Rekening Hadiah */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-header__title">04 — Rekening Hadiah</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="grid-2" style={{ gap: '1.25rem' }}>
                {fieldMap.has('giftTitle') && (
                  <ContentFieldRenderer
                    field={fieldMap.get('giftTitle')!}
                    value={content.giftTitle}
                    onChange={(val) => handleFieldChange('giftTitle', val)}
                  />
                )}
                {fieldMap.has('giftMessage') && (
                  <ContentFieldRenderer
                    field={fieldMap.get('giftMessage')!}
                    value={content.giftMessage}
                    onChange={(val) => handleFieldChange('giftMessage', val)}
                  />
                )}
              </div>

              <GiftAccountsEditor
                accounts={(content.giftAccounts as GiftAccountItem[]) || []}
                maxItems={fieldMap.get('giftAccounts')?.maxItems}
                onChange={(accounts) => handleFieldChange('giftAccounts', accounts)}
              />
            </div>
          </div>
        </>
      ) : (
        /* Fallback Dynamic Grouping for other templates */
        <div className="card">
          <div className="card-header">
            <h3 className="card-header__title">Formulir Konten Template</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {definition.contentFields.map((field) => {
              if (field.type === 'repeater') {
                if (field.key === 'giftAccounts') {
                  return (
                    <GiftAccountsEditor
                      key={field.key}
                      accounts={(content.giftAccounts as GiftAccountItem[]) || []}
                      maxItems={field.maxItems}
                      onChange={(accounts) => handleFieldChange('giftAccounts', accounts)}
                    />
                  );
                }
                return (
                  <RepeaterEditor
                    key={field.key}
                    field={field}
                    items={(content[field.key] as Array<Record<string, unknown>>) || []}
                    onChange={(items) => handleFieldChange(field.key, items)}
                  />
                );
              }
              return (
                <ContentFieldRenderer
                  key={field.key}
                  field={field}
                  value={content[field.key]}
                  onChange={(val) => handleFieldChange(field.key, val)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Save bar dock */}
      <div
        style={{
          position: 'sticky',
          bottom: '1.5rem',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          background: 'var(--admin-card-bg, #ffffff)',
          border: '1px solid var(--admin-border)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: isDirty ? 'var(--warning, #f59e0b)' : 'var(--success, #10b981)',
              display: 'inline-block',
            }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isDirty ? 'Ada perubahan konten yang belum disimpan' : 'Semua perubahan tersimpan'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!isDirty || saving}
            onClick={handleSave}
          >
            {saving ? 'Menyimpan...' : 'Simpan Konten'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Clearing Content */}
      {showClearConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '1.75rem',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Kosongkan Konten Template?
            </h3>
            <p className="text-sm text-secondary" style={{ marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Tindakan ini akan mengosongkan seluruh data isian konten template (nama mempelai, jadwal acara, teks doa, dan rekening hadiah). Media foto dan audio tidak akan terhapus.
              <br /><br />
              Tindakan ini diperlukan jika Anda ingin beralih ke template lain pada acara DRAFT.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={clearing}
                onClick={() => setShowClearConfirm(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={clearing}
                onClick={handleClearContent}
                id="confirm-clear-content-btn"
              >
                {clearing ? 'Mengosongkan...' : 'Ya, Kosongkan Konten'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
