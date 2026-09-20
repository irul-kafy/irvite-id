'use client';

function IconArchive() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3" width="16" height="4" rx="1" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M4 7v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" stroke="currentColor" strokeWidth="1.6"/>
      <line x1="8" y1="11" x2="12" y2="11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 5h12M8 5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2M6 5v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="9" y1="9" x2="9" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="11" y1="9" x2="11" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
﻿
import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPublicAvailabilityState } from '@/utils/event-availability';
import { TemplateContentEditor } from './components/template-content-editor';
import { MediaManager } from './components/media-manager';
import { EventPreviewTab } from './components/event-preview-tab';

interface EventData {
  id: string;
  userId: string;
  templateId?: string | null;
  title: string;
  slug: string;
  canonicalUrl?: string | null;
  description?: string | null;
  eventDate: string;
  locationDetails?: string | null;
  content?: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface TemplateData {
  id: string;
  name: string;
  themeCode?: string;
}

function IconArrowLeft() {
  return (
    <svg className="btn-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 10H4M9 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <path d="M3 8h14M7 2v3M13 2v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconLocation() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 18C10 18 4 12.5 4 8a6 6 0 1 1 12 0c0 4.5-6 10-6 10z" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <circle cx="10" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M2 18c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M14 3.5c1.5.5 2.5 1.8 2.5 3.5s-1 3-2.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M18 18c0-2.5-1.5-4.5-4-5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconEnvelope() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <path d="M3 6l7 5 7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconScan() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 6V4.5A1.5 1.5 0 0 1 3.5 3H5M15 3h1.5A1.5 1.5 0 0 1 18 4.5V6M2 14v1.5A1.5 1.5 0 0 0 3.5 17H5M15 17h1.5A1.5 1.5 0 0 0 18 15.5V14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="4" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconStaff() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M15 10l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function IconDocument() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 3h8l4 4v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 3v4h4M7 9h6M7 13h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconPhoto() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="7.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M17 13l-4-4-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  );
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { eventId } = use(params);

  const [event, setEvent] = useState<EventData | null>(null);
  const [templateName, setTemplateName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [permanentDeleting, setPermanentDeleting] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState('');

  // Pure URL-derived activeTab without state cascade
  const tabParam = searchParams.get('tab');
  const activeTab: 'overview' | 'content' | 'media' | 'preview' =
    tabParam === 'content' || tabParam === 'media' || tabParam === 'preview'
      ? tabParam
      : 'overview';

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Gagal memuat data event');
        }
        const data = await res.json();
        setEvent(data);

        // Fetch template details if templateId is set
        if (data.templateId) {
          try {
            const tplRes = await fetch(`/api/templates/${data.templateId}`);
            if (tplRes.ok) {
              const tplData: TemplateData = await tplRes.json();
              setTemplateName(tplData.name);
            }
          } catch {
            // Non-blocking
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    };

    void fetchEventData();
  }, [eventId, router]);


  const handleArchiveEvent = async () => {
    if (!confirm('Apakah Anda yakin ingin mengarsipkan acara ini? Undangan publik dan tautan personal tidak akan dapat diakses lagi, namun seluruh data historis tamu, undangan, kehadiran, dan media tetap tersimpan.')) {
      return;
    }
    setArchiving(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Gagal mengarsipkan acara');
      }
      setEvent((prev) => prev ? { ...prev, status: 'ARCHIVED' } : null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal mengarsipkan acara');
    } finally {
      setArchiving(false);
    }
  };

  const handleRestoreEvent = async () => {
    if (!confirm('Apakah Anda yakin ingin memulihkan acara ini? Status akan dikembalikan ke DRAFT.')) {
      return;
    }
    setRestoring(true);
    try {
      const res = await fetch(`/api/events/${eventId}/restore`, {
        method: 'POST',
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Gagal memulihkan acara');
      }
      setEvent((prev) => prev ? { ...prev, status: 'DRAFT' } : null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal memulihkan acara');
    } finally {
      setRestoring(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!event) return;
    if (confirmationInput.trim() !== 'DELETE' && confirmationInput.trim() !== event.title) {
      return;
    }
    setPermanentDeleting(true);
    setDeleteModalError('');
    try {
      const res = await fetch(`/api/events/${eventId}/permanent`, {
        method: 'DELETE',
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Gagal menghapus acara secara permanen');
      }
      setShowDeleteModal(false);
      router.push('/events');
    } catch (err: unknown) {
      setDeleteModalError(err instanceof Error ? err.message : 'Gagal menghapus acara secara permanen');
    } finally {
      setPermanentDeleting(false);
    }
  };

  const handleTabChange = (tab: 'overview' | 'content' | 'media' | 'preview') => {
    router.replace(`/events/${eventId}?tab=${tab}`, { scroll: false });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body flex-center gap-2" style={{ padding: '3rem' }}>
          <span className="spinner" style={{ width: 20, height: 20 }} />
          <span className="text-sm text-muted">Memuat data acara...</span>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--danger)' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Data Acara Tidak Ditemukan
          </h2>
          <p className="text-sm text-muted" style={{ maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
            {error || 'Acara yang Anda cari tidak tersedia atau Anda tidak memiliki hak akses.'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/events')}
            className="btn btn-secondary btn-sm"
          >
            &larr; Kembali ke Daftar Acara
          </button>
        </div>
      </div>
    );
  }

  const availability = getPublicAvailabilityState(event.status, event.eventDate);
  const formattedDate = new Date(event.eventDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div>
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex-between mb-4">
        <div className="flex-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/events')}
            className="btn btn-secondary btn-sm flex-center gap-1"
            title="Kembali ke Daftar Acara"
          >
            <IconArrowLeft />
            <span>Kembali</span>
          </button>
          <div>
            <div className="flex-center gap-2">
              <h1 className="page-title" style={{ margin: 0, fontSize: '1.375rem' }}>
                {event.title}
              </h1>
              <span className={`badge ${event.status === 'PUBLISHED' ? 'badge--success' : event.status === 'ARCHIVED' ? 'badge--danger' : 'badge--warning'}`}>
                {event.status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-center gap-2">
          {event.status !== 'ARCHIVED' && (
            <button
              type="button"
              onClick={() => router.push(`/events/${event.id}/edit`)}
              className="btn btn-secondary btn-sm flex-center gap-1"
              id="btn-edit-event"
            >
              <IconEdit />
              <span>Edit Detail Acara</span>
            </button>
          )}

          {event.status !== 'ARCHIVED' && (
            <button
              type="button"
              onClick={handleArchiveEvent}
              disabled={archiving}
              className="btn btn-secondary btn-sm flex-center gap-1"
              id="btn-archive-event"
              style={{ color: 'var(--status-danger, #dc2626)', borderColor: 'rgba(220,38,38,0.2)' }}
            >
              <IconArchive />
              <span>{archiving ? 'Mengarsipkan...' : 'Arsipkan Acara'}</span>
            </button>
          )}

          {event.status === 'ARCHIVED' && (
            <>
              <button
                type="button"
                onClick={handleRestoreEvent}
                disabled={restoring || permanentDeleting}
                className="btn btn-primary btn-sm flex-center gap-1"
                id="btn-restore-event"
              >
                <span>{restoring ? 'Memulihkan...' : 'Pulihkan Acara'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmationInput('');
                  setDeleteModalError('');
                  setShowDeleteModal(true);
                }}
                disabled={restoring || permanentDeleting}
                className="btn btn-danger btn-sm flex-center gap-1"
                id="btn-permanent-delete-event"
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: '1px solid #b91c1c',
                }}
              >
                <IconTrash />
                <span>Hapus Permanen</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Segmented Sub-Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--admin-border)',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
        }}
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => handleTabChange('overview')}
          id="tab-overview-btn"
        >
          Ringkasan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'content'}
          className={`btn btn-sm ${activeTab === 'content' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => handleTabChange('content')}
          id="tab-content-btn"
        >
          Konten Template
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'media'}
          className={`btn btn-sm ${activeTab === 'media' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => handleTabChange('media')}
          id="tab-media-btn"
        >
          Media Template
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => router.push(`/events/${event.id}/guests`)}
        >
          Tamu Undangan &rarr;
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'preview'}
          className={`btn btn-sm ${activeTab === 'preview' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => handleTabChange('preview')}
          id="tab-preview-btn"
        >
          Pratinjau
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          {/* Availability Advisory Banner */}
          {availability === 'EXPIRED' && (
            <div
              className="card mb-4"
              style={{
                background: 'var(--danger-soft, #fef2f2)',
                borderColor: 'var(--danger-border, #fecaca)',
                borderLeft: '4px solid var(--danger, #ef4444)',
              }}
            >
              <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span className="badge badge--danger">Tautan Kadaluarsa</span>
                  <strong style={{ color: 'var(--danger, #b91c1c)', fontSize: '0.875rem' }}>
                    Masa Berlaku Akses Publik Telah Berakhir
                  </strong>
                </div>
                <p className="text-sm" style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Halaman publik undangan acara ini tidak lagi dapat diakses tamu karena telah melewati batas masa aktif 30 hari sejak pelaksanaan acara.
                </p>
              </div>
            </div>
          )}

          {/* Core Summary Card */}
          <div className="card mb-6">
            <div className="card-header">
              <h2 className="card-header__title">Ringkasan Informasi Acara</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                    Waktu Pelaksanaan
                  </span>
                  <div className="flex-center gap-2 mt-1" style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9375rem' }}>
                    <IconCalendar />
                    <span>{formattedDate}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                    Lokasi / Tempat
                  </span>
                  <div className="flex-center gap-2 mt-1" style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9375rem' }}>
                    <IconLocation />
                    <span>{event.locationDetails || '-'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                    URL Slug Publik
                  </span>
                  <div className="flex-center gap-2 mt-1">
                    <code style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem', background: 'var(--admin-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--admin-border)' }}>
                      /e/{event.slug}
                    </code>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                    Template Digunakan
                  </span>
                  <div className="mt-1" style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9375rem' }}>
                    {templateName || (event.templateId ? 'Template Kustom' : 'Tema Standar (Default)')}
                  </div>
                </div>
              </div>

              {event.description && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--admin-border)' }}>
                  <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                    Pesan / Deskripsi Pembuka
                  </span>
                  <p style={{ margin: '0.375rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {event.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Operational Modules Section */}
          <div className="mb-4">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              Modul Operasional Acara
            </h2>
            <p className="text-sm text-muted">
              Pusat kendali operasional untuk mengelola konten template, media, tamu, staff, scanner, dan konfigurasi acara.
            </p>
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            {/* Module: Template Content */}
            <div
              className="action-card"
              onClick={() => handleTabChange('content')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTabChange('content'); }}
              id="hub-content-card"
            >
              <div className="action-card__icon-wrap stat-card__icon-wrap--amber">
                <IconDocument />
              </div>
              <div>
                <div className="action-card__title">Konten Spesifik Template</div>
                <div className="action-card__desc">
                  Isi data mempelai, nama orang tua, jadwal rangkaian acara, peta lokasi, dan rekening hadiah sesuai template.
                </div>
              </div>
              <div className="action-card__arrow">
                Edit Konten Template &rarr;
              </div>
            </div>

            {/* Module: Media Manager */}
            <div
              className="action-card"
              onClick={() => handleTabChange('media')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTabChange('media'); }}
              id="hub-media-card"
            >
              <div className="action-card__icon-wrap stat-card__icon-wrap--rose">
                <IconPhoto />
              </div>
              <div>
                <div className="action-card__title">Media Foto & Musik Latar</div>
                <div className="action-card__desc">
                  Kelola foto utama (hero), galeri foto rangkaian acara, serta musik latar (background music).
                </div>
              </div>
              <div className="action-card__arrow">
                Kelola Media &rarr;
              </div>
            </div>

            {/* Module: Guests & Invitations */}
            <div
              className="action-card"
              onClick={() => router.push(`/events/${event.id}/guests`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/events/${event.id}/guests`); }}
              id="hub-guests-card"
            >
              <div className="action-card__icon-wrap stat-card__icon-wrap--indigo">
                <IconUsers />
              </div>
              <div>
                <div className="action-card__title">Kelola Tamu & Undangan</div>
                <div className="action-card__desc">
                  Input data tamu undangan, atur kategori, kuota kehadiran (max pax), dan generate tautan undangan personal ber-QR unik.
                </div>
              </div>
              <div className="action-card__arrow">
                Buka Daftar Tamu &rarr;
              </div>
            </div>

            {/* Module: Invitation Distribution */}
            <div
              className="action-card"
              onClick={() => router.push(`/events/${event.id}/invitations`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/events/${event.id}/invitations`); }}
              id="hub-distribution-card"
            >
              <div className="action-card__icon-wrap stat-card__icon-wrap--rose">
                <IconEnvelope />
              </div>
              <div>
                <div className="action-card__title">Undangan & Distribusi</div>
                <div className="action-card__desc">
                  Kelola tautan undangan personal dan respons tamu.
                </div>
              </div>
              <div className="action-card__arrow">
                Buka Distribusi Undangan &rarr;
              </div>
            </div>

            {/* Module: QR Scanner */}
            <div
              className="action-card"
              onClick={() => router.push(`/events/${event.id}/scanner`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/events/${event.id}/scanner`); }}
              id="hub-scanner-card"
            >
              <div className="action-card__icon-wrap stat-card__icon-wrap--emerald">
                <IconScan />
              </div>
              <div>
                <div className="action-card__title">Scanner Kehadiran QR</div>
                <div className="action-card__desc">
                  Buka kamera scanner check-in untuk memverifikasi QR Code tamu undangan di pintu masuk acara secara real-time.
                </div>
              </div>
              <div className="action-card__arrow">
                Buka Scanner QR &rarr;
              </div>
            </div>

            {/* Module: Staff Assignment */}
            <div
              className="action-card"
              onClick={() => router.push(`/events/${event.id}/staff`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/events/${event.id}/staff`); }}
              id="hub-staff-card"
            >
              <div className="action-card__icon-wrap stat-card__icon-wrap--amber">
                <IconStaff />
              </div>
              <div>
                <div className="action-card__title">Tim Staff Acara</div>
                <div className="action-card__desc">
                  Tugaskan akun operator / staff scanner yang berwenang melakukan pemindaian kehadiran pada acara ini.
                </div>
              </div>
              <div className="action-card__arrow">
                Kelola Tim Staff &rarr;
              </div>
            </div>

            {/* Module: Preview */}
            <div
              className="action-card"
              onClick={() => handleTabChange('preview')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTabChange('preview'); }}
              id="hub-preview-card"
            >
              <div className="action-card__icon-wrap stat-card__icon-wrap--indigo">
                <IconEye />
              </div>
              <div>
                <div className="action-card__title">Pratinjau Undangan</div>
                <div className="action-card__desc">
                  Lihat kesiapan data dan buka tautan halaman publik acara yang telah dipublikasikan.
                </div>
              </div>
              <div className="action-card__arrow">
                Buka Pratinjau &rarr;
              </div>
            </div>

            {/* Module: Edit Event */}
            <div
              className="action-card"
              onClick={() => router.push(`/events/${event.id}/edit`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/events/${event.id}/edit`); }}
              id="hub-edit-card"
            >
              <div className="action-card__icon-wrap stat-card__icon-wrap--violet">
                <IconEdit />
              </div>
              <div>
                <div className="action-card__title">Edit Detail Acara</div>
                <div className="action-card__desc">
                  Perbarui judul acara, waktu pelaksanaan, detail lokasi, template yang digunakan, atau status publikasi undangan.
                </div>
              </div>
              <div className="action-card__arrow">
                Edit Acara &rarr;
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: TEMPLATE CONTENT */}
      {activeTab === 'content' && (
        <TemplateContentEditor
          eventId={event.id}
          templateId={event.templateId}
          initialContent={event.content}
          onContentSaved={(saved) => {
            setEvent((prev) => (prev ? { ...prev, content: saved } : prev));
          }}
        />
      )}

      {/* TAB 3: MEDIA MANAGER */}
      {activeTab === 'media' && (
        <MediaManager
          eventId={event.id}
          templateId={event.templateId}
        />
      )}

      {/* TAB 4: PREVIEW */}
      {activeTab === 'preview' && (
        <EventPreviewTab
          eventId={event.id}
          status={event.status}
          slug={event.slug}
          canonicalUrl={event.canonicalUrl}
          hasTemplate={Boolean(event.templateId)}
          hasContent={Boolean(event.content && Object.keys(event.content).length > 0)}
        />
      )}
      {/* Destructive Confirmation Modal for Permanent Event Deletion */}
      {showDeleteModal && (
        <div
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
            if (!permanentDeleting) {
              setShowDeleteModal(false);
              setConfirmationInput('');
              setDeleteModalError('');
            }
          }}
        >
          <div
            style={{
              background: 'var(--admin-surface, #ffffff)',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '1.75rem',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid var(--admin-border, #e2e8f0)',
              color: 'var(--text-primary)',
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
                <IconTrash />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                  Hapus Acara Secara Permanen
                </h3>
                <p className="text-xs text-muted" style={{ margin: 0 }}>
                  Konfirmasi tindakan destruktif
                </p>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.25)',
                borderRadius: '8px',
                padding: '0.875rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
                lineHeight: 1.5,
                color: 'var(--text-primary)',
              }}
            >
              <strong style={{ color: '#dc2626' }}>Peringatan:</strong>
              <p style={{ margin: '0.375rem 0 0 0' }}>
                This action permanently deletes the event, guests, invitations, RSVP data, attendance data, media records, and staff assignments and cannot be undone.
              </p>
              <p style={{ margin: '0.375rem 0 0 0', fontSize: '0.8125rem', opacity: 0.85 }}>
                Tindakan ini menghapus acara, tamu, undangan, data RSVP, data kehadiran, catatan media, dan penugasan staf secara permanen dan tidak dapat dibatalkan.
              </p>
            </div>

            {deleteModalError && (
              <div
                className="alert alert--error mb-4"
                style={{
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                }}
              >
                {deleteModalError}
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="confirm-delete-input"
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  color: 'var(--text-secondary)',
                }}
              >
                Ketik <strong>DELETE</strong> atau <strong>{event.title}</strong> untuk mengonfirmasi:
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={`DELETE atau ${event.title}`}
                disabled={permanentDeleting}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--admin-border, #cbd5e1)',
                  background: 'var(--admin-surface-raised, #f8fafc)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                id="cancel-delete-btn"
                className="btn btn-secondary btn-sm"
                disabled={permanentDeleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmationInput('');
                  setDeleteModalError('');
                }}
              >
                Batal
              </button>
              <button
                type="button"
                id="confirm-permanent-delete-btn"
                className="btn btn-danger btn-sm"
                disabled={
                  permanentDeleting ||
                  (confirmationInput.trim() !== 'DELETE' && confirmationInput.trim() !== event.title)
                }
                onClick={handlePermanentDelete}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  opacity:
                    confirmationInput.trim() === 'DELETE' || confirmationInput.trim() === event.title
                      ? 1
                      : 0.5,
                }}
              >
                {permanentDeleting ? 'Menghapus Permanen...' : 'Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
