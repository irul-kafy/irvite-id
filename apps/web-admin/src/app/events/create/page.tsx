'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FIXED_CATALOG_TEMPLATES } from '../../templates/utils/catalog-registry';

interface TemplateOption {
  id: string;
  name: string;
  themeCode?: string;
  config?: unknown;
}

function IconArrowLeft() {
  return (
    <svg className="btn-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 10H4M9 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg className="btn-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2l1.8 5.2L17 9l-5.2 1.8L10 16l-1.8-5.2L3 9l5.2-1.8L10 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
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

function CreateEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTemplateParam = searchParams.get('template') || searchParams.get('templateId') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    eventDate: '',
    locationDetails: '',
    templateId: '',
  });

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch('/api/templates');
        if (res.ok) {
          const json = await res.json();
          const list: TemplateOption[] = json.data || [];
          setTemplates(list);

          if (preselectedTemplateParam && list.length > 0) {
            const found = list.find(
              (t) =>
                t.id === preselectedTemplateParam ||
                t.name.toLowerCase() === preselectedTemplateParam.toLowerCase()
            );
            if (found) {
              setFormData((prev) => ({ ...prev, templateId: found.id }));
            }
          }
        }
      } catch {
        // Silently preserve empty template list if fetch fails
      } finally {
        setLoadingTemplates(false);
      }
    }
    void loadTemplates();
  }, [preselectedTemplateParam]);

  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: slugManuallyEdited ? prev.slug : slugify(val),
    }));
  };

  const handleSlugChange = (val: string) => {
    setSlugManuallyEdited(true);
    setFormData((prev) => ({
      ...prev,
      slug: val.toLowerCase().replace(/[^a-z0-9-]/g, ''),
    }));
  };

  const selectedTemplate = templates.find((t) => t.id === formData.templateId);
  const matchedCatalogItem = FIXED_CATALOG_TEMPLATES.find(
    (c) =>
      c.id === formData.templateId ||
      c.name.toLowerCase() === selectedTemplate?.name.toLowerCase() ||
      c.themeCode === selectedTemplate?.themeCode
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

    setLoading(true);

    try {
      const payload: {
        title: string;
        slug: string;
        eventDate: string;
        description?: string;
        locationDetails?: string;
        templateId?: string;
      } = {
        title: cleanTitle,
        slug: cleanSlug,
        eventDate: dateParsed.toISOString(),
      };

      if (formData.description.trim()) {
        payload.description = formData.description.trim();
      }

      if (formData.locationDetails.trim()) {
        payload.locationDetails = formData.locationDetails.trim();
      }

      if (formData.templateId.trim()) {
        payload.templateId = formData.templateId.trim();
      }

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal membuat event baru');
      }

      const created = await res.json();
      const newEventId = created.data?.id || created.id;
      if (newEventId) {
        router.push(`/events/${newEventId}`);
      } else {
        router.push('/events');
      }
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat membuat event') || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header & Back */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push('/events')}
          className="btn btn-ghost btn-sm mb-3"
          id="create-event-back-btn"
        >
          <IconArrowLeft />
          Kembali ke Events
        </button>
        <h1 className="admin-page__title">Buat Event Baru</h1>
        <p className="admin-page__subtitle">
          Lengkapi detail acara dan tentukan template undangan digital client.
        </p>
      </div>

      {error && (
        <div className="alert alert--error mb-6" role="alert">
          {error}
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
              <label htmlFor="event-title" className="form-label form-label--required">
                Nama / Judul Event
              </label>
              <input
                id="event-title"
                type="text"
                required
                className="form-input"
                placeholder="Contoh: Sarah & Michael Wedding"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                maxLength={255}
              />
              <span className="form-hint">
                Nama mempelai atau judul resmi acara untuk judul undangan digital.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="event-slug" className="form-label form-label--required">
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
                  id="event-slug"
                  type="text"
                  required
                  className="form-input"
                  placeholder="sarah-michael-2026"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}
                  maxLength={255}
                />
              </div>
              <span className="form-hint">
                Alamat URL unik untuk undangan publik. Hanya huruf kecil, angka, dan tanda hubung (-).
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Waktu & Lokasi */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-header__title">2. Waktu & Lokasi Acara</h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="event-date" className="form-label form-label--required">
                Tanggal & Waktu Acara
              </label>
              <input
                id="event-date"
                type="datetime-local"
                required
                className="form-input"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
              />
              <span className="form-hint">
                Waktu pelaksanaan akad/pemberkatan atau resepsi utama sesuai zona waktu lokal.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="event-location" className="form-label">
                Detail Lokasi & Tempat
              </label>
              <textarea
                id="event-location"
                rows={3}
                className="form-textarea"
                placeholder="Contoh: Grand Ballroom, Hotel Mulia Senayan, Jl. Asia Afrika No. 1, Jakarta Pusat"
                value={formData.locationDetails}
                onChange={(e) => setFormData({ ...formData, locationDetails: e.target.value })}
              />
              <span className="form-hint">
                Nama gedung, nama ballroom, dan alamat lengkap untuk panduan tamu undangan.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="event-desc" className="form-label">
                Deskripsi / Catatan Pembuka (Opsional)
              </label>
              <textarea
                id="event-desc"
                rows={3}
                className="form-textarea"
                placeholder="Contoh: Tanpa mengurangi rasa hormat, kami bermaksud mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <span className="form-hint">
                Pesan sambutan atau kutipan doa yang ditampilkan di halaman undangan.
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Template Undangan */}
        <div className="card">
          <div className="card-header flex-between">
            <h2 className="card-header__title">3. Pilihan Template Undangan</h2>
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
              <label htmlFor="event-template" className="form-label">
                Template Acara
              </label>
              <select
                id="event-template"
                className="form-select"
                value={formData.templateId}
                onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                disabled={loadingTemplates}
              >
                <option value="">-- Gunakan Template Standar (Default) --</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} {tpl.themeCode ? `(${tpl.themeCode})` : ''}
                  </option>
                ))}
              </select>
              <span className="form-hint">
                Setiap event menggunakan satu template tetap. Tampilan visual akan mengikuti konfigurasi tema yang dipilih.
              </span>
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

        {/* Informational Status Banner */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            borderLeft: '4px solid var(--admin-accent)',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
          }}
        >
          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
            Status Awal: DRAFT
          </strong>
          Event baru otomatis berstatus <strong>DRAFT</strong>. Setelah data acara, template, dan tamu undangan selesai disiapkan, Anda dapat mengubah status menjadi <strong>PUBLISHED</strong> melalui menu Edit Event untuk membuka akses publik.
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => router.push('/events')}
            className="btn btn-secondary"
            disabled={loading}
          >
            Batal
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            id="create-event-submit-btn"
          >
            {loading ? (
              <span className="flex-center gap-2">
                <span className="spinner" style={{ width: 14, height: 14 }} />
                Menyimpan Event...
              </span>
            ) : (
              <span className="flex-center gap-2">
                <IconSparkles />
                Buat Event
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateEventPage() {
  return (
    <Suspense fallback={<div className="empty-state">Memuat formulir...</div>}>
      <CreateEventForm />
    </Suspense>
  );
}
