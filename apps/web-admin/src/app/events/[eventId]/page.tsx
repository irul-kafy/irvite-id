'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getPublicAvailabilityState } from '@/utils/event-availability';

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

function IconExternal() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 3h6v6M17 3l-9 9M8 5H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
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


function IconEnvelope() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <path d="M2 6l8 5 8-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function isLocalhostUrl(urlStr?: string | null): boolean {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    const h = parsed.hostname.toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
  } catch {
    return false;
  }
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const router = useRouter();
  const { eventId } = use(params);

  const [event, setEvent] = useState<EventData | null>(null);
  const [templateName, setTemplateName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchEventAndTemplate = async () => {
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
          throw new Error('Gagal memuat detail event.');
        }

        const eventJson: EventData = await eventRes.json();
        setEvent(eventJson);

        if (tplRes.ok && eventJson.templateId) {
          const tplJson = await tplRes.json();
          const tpls: TemplateData[] = tplJson.data || [];
          const found = tpls.find((t) => t.id === eventJson.templateId);
          if (found) {
            setTemplateName(`${found.name}${found.themeCode ? ` (${found.themeCode})` : ''}`);
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
      } finally {
        setLoading(false);
      }
    };
    void fetchEventAndTemplate();
  }, [eventId, router]);

  const availabilityState = event ? getPublicAvailabilityState(event.status, event.eventDate) : 'DRAFT';

  const handleCopyPublicUrl = () => {
    if (!event?.canonicalUrl) return;
    void navigator.clipboard.writeText(event.canonicalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1024px', margin: '0 auto', paddingBottom: '3rem' }}>
        <div
          style={{
            height: '32px',
            width: '180px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            animation: 'admin-skeleton-pulse 1.5s ease-in-out infinite',
            marginBottom: '1rem',
          }}
        />
        <div
          style={{
            height: '140px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            animation: 'admin-skeleton-pulse 1.5s ease-in-out infinite',
            marginBottom: '1.5rem',
          }}
        />
        <div className="grid-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: '120px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
                animation: 'admin-skeleton-pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '2rem 0' }}>
        <div className="alert alert--error mb-4" role="alert">
          {error || 'Event tidak ditemukan.'}
        </div>
        <button
          type="button"
          onClick={() => router.push('/events')}
          className="btn btn-secondary"
        >
          <IconArrowLeft />
          Kembali ke Daftar Events
        </button>
      </div>
    );
  }

  const formattedDate = new Date(event.eventDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={{ maxWidth: '1024px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push('/events')}
        className="btn btn-ghost btn-sm mb-3"
        id="detail-back-btn"
      >
        <IconArrowLeft />
        Semua Events
      </button>

      {/* Main Header */}
      <div className="flex-between mb-6" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="flex-center gap-2 mb-1">
            <h1 className="admin-page__title" style={{ margin: 0 }}>
              {event.title}
            </h1>
            <span className={event.status === 'PUBLISHED' ? 'badge badge--success' : 'badge badge--neutral'}>
              {event.status}
            </span>
          </div>
          <p className="admin-page__subtitle">
            ID: <code style={{ fontSize: '0.8125rem', padding: '0.125rem 0.375rem', background: 'var(--admin-bg)', borderRadius: 'var(--radius-sm)' }}>{event.id}</code>
          </p>
        </div>

        <div className="flex-center gap-2" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => router.push(`/events/${event.id}/edit`)}
            className="btn btn-secondary btn-sm flex-center gap-1"
            id="detail-edit-btn"
          >
            <IconEdit />
            Edit Acara
          </button>
          {availabilityState === 'ACTIVE' && event.canonicalUrl && (
            <a
              href={event.canonicalUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-success btn-sm flex-center gap-1"
              id="detail-public-btn"
            >
              <IconExternal />
              Lihat Undangan Publik
            </a>
          )}
        </div>
      </div>

      {/* Dedicated Public Invitation Panel */}
      <div className="card mb-6" id="hub-public-invitation-panel">
        <div className="card-header flex-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 className="card-header__title">Undangan Publik (Umum)</h2>
            <p className="text-sm text-muted mt-1" style={{ margin: '0.25rem 0 0 0' }}>
              Tautan umum tanpa nama tamu personal dan tanpa QR check-in.
            </p>
          </div>
          {availabilityState === 'ACTIVE' ? (
            <span className="badge badge--success">Aktif</span>
          ) : availabilityState === 'EXPIRED' ? (
            <span className="badge badge--neutral" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
              Kedaluwarsa
            </span>
          ) : (
            <span className="badge badge--neutral">Draft - Belum Dipublikasikan</span>
          )}
        </div>
        <div className="card-body">
          {availabilityState === 'ACTIVE' ? (
            event.canonicalUrl ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <code
                    id="hub-public-url-display"
                    style={{
                      fontSize: '0.9375rem',
                      padding: '0.5rem 0.75rem',
                      background: 'var(--admin-bg)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--admin-border)',
                      flex: '1 1 300px',
                      wordBreak: 'break-all',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {event.canonicalUrl}
                  </code>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleCopyPublicUrl}
                      className="btn btn-secondary btn-sm flex-center gap-1"
                      id="hub-copy-public-url-btn"
                      title="Salin tautan undangan publik"
                    >
                      {copied ? <IconCheck /> : <IconCopy />}
                      {copied ? 'Tersalin!' : 'Salin Link'}
                    </button>
                    <a
                      href={event.canonicalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary btn-sm flex-center gap-1"
                      id="hub-view-public-url-btn"
                      title="Lihat undangan publik di tab baru"
                    >
                      <IconExternal />
                      Lihat Undangan
                    </a>
                  </div>
                </div>

                {isLocalhostUrl(event.canonicalUrl) && (
                  <div
                    className="alert alert--warning mt-3 flex-center gap-2"
                    style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem' }}
                    id="hub-localhost-warning"
                    role="status"
                  >
                    <span aria-hidden="true">&#9888;</span>
                    <span>
                      <strong>Peringatan Lingkungan Lokal:</strong> Tautan menggunakan alamat localhost ({event.canonicalUrl}) dan hanya dapat diakses pada mesin lokal ini. Tautan belum dapat dibagikan ke publik internet.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--admin-bg)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--admin-border)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                }}
                id="hub-config-missing-notice"
              >
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  Konfigurasi URL Belum Tersedia
                </div>
                <p style={{ margin: 0 }}>
                  Tautan kanonikal publik belum dapat dibuat karena origin undangan publik belum terkonfigurasi pada sistem.
                </p>
              </div>
            )
          ) : availabilityState === 'EXPIRED' ? (
            <div
              style={{
                padding: '1rem',
                background: 'var(--admin-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--admin-border)',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
              }}
              id="hub-expired-notice"
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Undangan Publik Telah Kedaluwarsa
              </div>
              <p style={{ margin: 0 }}>
                Masa aktif publikasi untuk acara ini telah berakhir (melewati batas 30 hari setelah tanggal acara). Tautan publik umum sudah dinonaktifkan dan tidak lagi dapat diakses oleh publik.
              </p>
            </div>
          ) : (
            <div
              style={{
                padding: '1rem',
                background: 'var(--admin-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--admin-border)',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
              }}
              id="hub-draft-notice"
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Draft - Belum Dipublikasikan
              </div>
              <p style={{ margin: 0 }}>
                Tautan publik umum akan aktif dan siap dibagikan setelah status acara diubah menjadi <strong>PUBLISHED</strong> melalui menu Edit Acara.
              </p>
            </div>
          )}
        </div>
      </div>

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
          Pusat kendali operasional untuk mengelola tamu, staff, scanner kehadiran, dan konfigurasi acara.
        </p>
      </div>

      <div className="grid-2">
        {/* Module 1: Guests & Invitations */}
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

        {/* Module 2: Invitation Distribution */}
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

        {/* Module 3: QR Scanner */}
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

        {/* Module 4: Staff Assignment */}
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

        {/* Module 5: Edit Event */}
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
    </div>
  );
}
