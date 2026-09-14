'use client';

import React, { useState } from 'react';

interface EventPreviewTabProps {
  eventId: string;
  status: string;
  slug: string;
  canonicalUrl?: string | null;
  hasTemplate: boolean;
  hasContent: boolean;
}

export function EventPreviewTab({
  eventId,
  status,
  slug,
  canonicalUrl,
  hasTemplate,
  hasContent,
}: EventPreviewTabProps) {
  const [copied, setCopied] = useState(false);
  const isPublished = status === 'PUBLISHED';

  const handleCopy = async () => {
    if (!canonicalUrl) return;
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API unavailable
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Pratinjau & Publikasi Undangan
          </h2>
          <span className={`badge ${isPublished ? 'badge--success' : 'badge--warning'}`}>
            Status: {status}
          </span>
        </div>
        <p className="text-sm text-muted" style={{ margin: 0 }}>
          Pusat kendali status tayang dan tautan akses halaman undangan digital.
        </p>
      </div>

      {isPublished ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-header__title">Tautan Undangan Publik Aktif</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--success-bg, #ecfdf5)',
                border: '1px solid var(--success-border, #a7f3d0)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--success-text, #065f46)', marginBottom: '0.25rem' }}>
                ✓ Undangan Siap Diakses Publik
              </div>
              <p className="text-sm" style={{ margin: 0, color: 'var(--success-text, #065f46)', opacity: 0.9 }}>
                Acara ini telah berstatus PUBLISHED dan dapat diakses melalui domain publik undangan resmi.
              </p>
            </div>

            {canonicalUrl ? (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label text-xs">Tautan Publik Resmi (Canonical URL)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    readOnly
                    className="form-input font-mono text-sm"
                    value={canonicalUrl}
                    style={{ background: 'var(--admin-bg)', color: 'var(--text-primary)' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopy}
                    id="copy-preview-link-btn"
                  >
                    {copied ? '✓ Tersalin' : 'Salin URL'}
                  </button>
                  <a
                    href={canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm flex-center gap-1"
                    id="open-published-invitation-btn"
                  >
                    Buka Undangan &rarr;
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted">
                Tautan kanonikal: <code>/e/{slug}</code> (Konfigurasi domain publik undangan belum diatur).
              </div>
            )}
          </div>
        </div>
      ) : (
        /* DRAFT SECURITY STATE: DRAFT is strictly closed to public */
        <div className="card">
          <div className="card-header">
            <h3 className="card-header__title">Status Kesiapan Publikasi (DRAFT)</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--admin-accent-soft, #fef3c7)',
                border: '1px solid #fde68a',
                color: '#92400e',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                🔒 Acara Masih Berstatus DRAFT (Akses Publik Ditutup)
              </div>
              <p className="text-sm" style={{ margin: 0, lineHeight: 1.5 }}>
                Demi melindungi privasi data mempelai sebelum acara siap, tautan publik <code>/e/{slug}</code> ditutup dan menghasilkan kode respon 404 bagi siapapun di luar sistem admin.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                Daftar Periksa Kesiapan Acara:
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <span>{hasTemplate ? '✅' : '❌'}</span>
                  <span>{hasTemplate ? 'Template telah dipilih' : 'Template belum dipilih'}</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <span>{hasContent ? '✅' : '⚠️'}</span>
                  <span>{hasContent ? 'Konten template telah diisi' : 'Konten template masih kosong (opsional)'}</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <span>🔒</span>
                  <span>Status saat ini: DRAFT (Klik Publikasikan Acara jika sudah siap)</span>
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <a href={`/events/${eventId}/edit`} className="btn btn-primary btn-sm">
                Buka Pengaturan & Publikasikan Acara &rarr;
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
