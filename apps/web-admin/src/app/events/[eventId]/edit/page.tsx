'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { FIXED_CATALOG_TEMPLATES } from '@/app/templates/utils/catalog-registry';
import { getCanonicalPublicEventUrl } from '@/utils/url';

interface TemplateOption {
  id: string;
  name: string;
  themeCode?: string;
  status?: string;
  config?: unknown;
}

function IconArrowLeft() {
  return (
    <svg className="btn-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 10H4M9 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconExternal() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 3h6v6M17 3l-9 9M8 5H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const router = useRouter();
  const { eventId } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [initialTemplateId, setInitialTemplateId] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    eventDate: '',
    locationDetails: '',
    templateId: '',
    status: 'DRAFT',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventRes, tplRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch('/api/templates'),
        ]);

        if (eventRes.status === 401) {
          router.push('/login');
          return;
        }

        if (!eventRes.ok) {
          const errData = await eventRes.json().catch(() => ({}));
          throw new Error(errData.message || 'Gagal memuat data event');
        }

        if (tplRes.ok) {
          const tplData = await tplRes.json();
          setTemplates(tplData.data || []);
        }

        const eventData = await eventRes.json();

        // Timezone-safe local datetime string conversion (YYYY-MM-DDThh:mm)
        const d = new Date(eventData.eventDate);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const datetimeLocalStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

        const loadedTplId = eventData.templateId || '';
        setInitialTemplateId(loadedTplId);

        setFormData({
          title: eventData.title || '',
          slug: eventData.slug || '',
          description: eventData.description || '',
          eventDate: datetimeLocalStr,
          locationDetails: eventData.locationDetails || '',
          templateId: loadedTplId,
          status: eventData.status || 'DRAFT',
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data');
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [eventId, router]);

  const selectableTemplates = templates.filter(
    (tpl) => tpl.status === 'AVAILABLE' || tpl.id === initialTemplateId
  );

  const selectedTemplate = templates.find((t) => t.id === formData.templateId);
  const matchedCatalogItem = FIXED_CATALOG_TEMPLATES.find(
    (c) =>
      c.id === formData.templateId ||
      c.name.toLowerCase() === selectedTemplate?.name.toLowerCase() ||
      c.themeCode === selectedTemplate?.themeCode
  );

  let publicUrl = '';
  try {
    if (formData.slug) {
      publicUrl = getCanonicalPublicEventUrl(formData.slug);
    }
  } catch {
    publicUrl = `/e/${formData.slug}`;
  }

  const handleCopyPublicUrl = () => {
    if (!publicUrl) return;
    void navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanTitle = formData.title.trim();
    const cleanSlug = formData.slug.trim().toLowerCase();

    if (!cleanTitle) {
      setError('Nama atau judul acara wajib diisi.');
      return;
    }

    if (!cleanSlug) {
      setError('URL slug publik wajib diisi.');
      return;
    }

    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(cleanSlug)) {
      setError('Format slug tidak valid. Gunakan huruf kecil, angka, dan tanda hubung (-) tanpa spasi.');
      return;
    }

    if (!formData.eventDate) {
      setError('Tanggal dan waktu acara wajib dipilih.');
      return;
    }

    const dateParsed = new Date(formData.eventDate);
    if (isNaN(dateParsed.getTime())) {
      setError('Format tanggal dan waktu acara tidak valid.');
      return;
    }

    setSaving(true);

    try {
      const payload: {
        title: string;
        slug: string;
        eventDate: string;
        status: string;
        description?: string;
        locationDetails?: string;
        templateId?: string;
      } = {
        title: cleanTitle,
        slug: cleanSlug,
        eventDate: dateParsed.toISOString(),
        status: formData.status,
      };

      if (formData.description.trim()) {
        payload.description = formData.description.trim();
      }

      if (formData.locationDetails.trim()) {
        payload.locationDetails = formData.locationDetails.trim();
      }

      // TemplateId safety: only send if changed to a valid selected UUID
      if (formData.templateId.trim() && formData.templateId !== initialTemplateId) {
        payload.templateId = formData.templateId.trim();
      }

      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 409) {
          if (errData.message?.includes('Clear event content') || errData.message?.includes('Remove template-specific media')) {
            throw new Error('Kosongkan konten template dan hapus media khusus template sebelum mengganti template.');
          }
          if (errData.message?.includes('published')) {
            throw new Error('Template tidak dapat diubah pada acara yang sudah dipublikasikan.');
          }
        }
        throw new Error(errData.message || 'Gagal menyimpan perubahan event');
      }

      setSuccessMsg('Perubahan event berhasil disimpan.');
      if (formData.templateId.trim()) {
        setInitialTemplateId(formData.templateId.trim());
      }
      setTimeout(() => {
        router.push(`/events/${eventId}`);
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '3rem' }}>
        <div className="mb-6">
          <div
            style={{
              height: '32px',
              width: '200px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              animation: 'admin-skeleton-pulse 1.5s ease-in-out infinite',
              marginBottom: '1rem',
            }}
          />
          <div
            style={{
              height: '100px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              animation: 'admin-skeleton-pulse 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header & Back */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push(`/events/${eventId}`)}
          className="btn btn-ghost btn-sm mb-3"
          id="edit-event-back-btn"
        >
          <IconArrowLeft />
          Kembali ke Detail Event
        </button>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="admin-page__title">Edit Event</h1>
            <p className="admin-page__subtitle">
              Perbarui rincian acara, jadwal, lokasi, template, atau status publikasi.
            </p>
          </div>
          <span className={formData.status === 'PUBLISHED' ? 'badge badge--success' : 'badge badge--neutral'}>
            {formData.status}
          </span>
        </div>
      </div>

      {error && (
        <div className="alert alert--error mb-6" role="alert">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="alert alert--success mb-6" role="alert">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Section 1: Informasi Utama */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-header__title">1. Informasi Utama Acara</h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="edit-event-title" className="form-label form-label--required">
                Nama / Judul Event
              </label>
              <input
                id="edit-event-title"
                type="text"
                required
                className="form-input"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={255}
              />
              <span className="form-hint">
                Nama mempelai atau judul resmi acara untuk undangan digital.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="edit-event-slug" className="form-label form-label--required">
                URL Slug Publik
              </label>
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <span
                  style={{
                    padding: '0.625rem 0.875rem',
                    background: 'var(--admin-bg)',
                    border: '1px solid var(--admin-border)',
                    borderRight: 'none',
                    borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                    color: 'var(--text-tertiary)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    userSelect: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  /e/
                </span>
                <input
                  id="edit-event-slug"
                  type="text"
                  required
                  className="form-input"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    })
                  }
                  style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}
                  maxLength={255}
                />
              </div>
              <span className="form-hint">
                Alamat URL unik untuk undangan umum. Gunakan huruf kecil, angka, dan tanda hubung (-).
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Status Publikasi */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-header__title">2. Status Publikasi Undangan</h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="edit-event-status" className="form-label form-label--required">
                Status Acara
              </label>
              <select
                id="edit-event-status"
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="DRAFT">DRAFT (Akses publik ditutup / Dalam persiapan)</option>
                <option value="PUBLISHED">PUBLISHED (Aktif / Dapat diakses publik melalui link /e/:slug)</option>
              </select>
              <span className="form-hint">
                Pilih DRAFT jika undangan masih disiapkan. Pilih PUBLISHED jika undangan sudah siap disebarkan.
              </span>
            </div>

            {/* Public Link Preview when Published */}
            {formData.status === 'PUBLISHED' && (
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--status-success-bg)',
                  border: '1px solid rgba(5, 150, 105, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-success)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                    Link Undangan Publik Aktif
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {publicUrl}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleCopyPublicUrl}
                    className="btn btn-secondary btn-sm flex-center gap-1"
                    id="copy-public-link-btn"
                  >
                    {copied ? <IconCheck /> : <IconCopy />}
                    {copied ? 'Tersalin!' : 'Salin Link'}
                  </button>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-success btn-sm flex-center gap-1"
                    id="open-public-link-btn"
                  >
                    <IconExternal />
                    Buka
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Waktu & Lokasi */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-header__title">3. Waktu & Lokasi Acara</h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="edit-event-date" className="form-label form-label--required">
                Tanggal & Waktu Acara
              </label>
              <input
                id="edit-event-date"
                type="datetime-local"
                required
                className="form-input"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
              />
              <span className="form-hint">
                Waktu pelaksanaan acara sesuai zona waktu lokal.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="edit-event-location" className="form-label">
                Detail Lokasi & Tempat
              </label>
              <textarea
                id="edit-event-location"
                rows={3}
                className="form-textarea"
                placeholder="Contoh: Grand Ballroom, Hotel Mulia Senayan, Jakarta"
                value={formData.locationDetails}
                onChange={(e) => setFormData({ ...formData, locationDetails: e.target.value })}
              />
              <span className="form-hint">
                Nama gedung, nama ballroom, dan alamat lengkap untuk panduan tamu undangan.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="edit-event-desc" className="form-label">
                Deskripsi / Catatan Pembuka (Opsional)
              </label>
              <textarea
                id="edit-event-desc"
                rows={3}
                className="form-textarea"
                placeholder="Contoh: Tanpa mengurangi rasa hormat, kami mengundang..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <span className="form-hint">
                Pesan sambutan atau kutipan doa yang ditampilkan di halaman undangan.
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Template Undangan */}
        <div className="card">
          <div className="card-header flex-between">
            <h2 className="card-header__title">4. Template Undangan Acara</h2>
            <a
              href="/templates"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm flex-center gap-1"
              style={{ color: 'var(--admin-accent)' }}
            >
              Katalog Template
              <IconExternal />
            </a>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="edit-event-template" className="form-label">
                Pilih Template
              </label>
              <select
                id="edit-event-template"
                className="form-select"
                disabled={formData.status === 'PUBLISHED'}
                value={formData.templateId}
                onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
              >
                <option value="">-- Gunakan Template Standar (Default) --</option>
                {selectableTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} {tpl.themeCode ? `(${tpl.themeCode})` : ''}{tpl.status && tpl.status !== 'AVAILABLE' ? ` [${tpl.status} - Saat ini digunakan]` : ''}
                  </option>
                ))}
              </select>
              <span className="form-hint">
                Setiap event menggunakan satu template tetap. Tampilan visual akan mengikuti konfigurasi tema yang dipilih.
                {formData.status === 'PUBLISHED' && (
                  <strong style={{ display: 'block', color: 'var(--danger, #b91c1c)', marginTop: '0.25rem' }}>
                    🔒 Template terkunci dan tidak dapat diganti pada acara yang sudah dipublikasikan.
                  </strong>
                )}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <a
                href={`/events/${eventId}?tab=content`}
                className="btn btn-secondary btn-sm"
              >
                📝 Buka Editor Konten Template
              </a>
              <a
                href={`/events/${eventId}?tab=media`}
                className="btn btn-secondary btn-sm"
              >
                🖼️ Buka Pengelola Media Template
              </a>
            </div>

            {/* Quick Preview Card */}
            {matchedCatalogItem && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--admin-bg)',
                  border: '1px solid var(--admin-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-sm)',
                    background: matchedCatalogItem.config.theme.primaryColor,
                    border: `2px solid ${matchedCatalogItem.config.theme.secondaryColor}`,
                    flexShrink: 0,
                    boxShadow: 'var(--shadow-xs)',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                      {matchedCatalogItem.name}
                    </strong>
                    <span className="badge badge--info">
                      {matchedCatalogItem.category}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {matchedCatalogItem.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => router.push(`/events/${eventId}`)}
            className="btn btn-secondary"
            disabled={saving}
          >
            Batal
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            id="edit-event-submit-btn"
          >
            {saving ? (
              <span className="flex-center gap-2">
                <span className="spinner" style={{ width: 14, height: 14 }} />
                Menyimpan Perubahan...
              </span>
            ) : (
              'Simpan Perubahan'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
