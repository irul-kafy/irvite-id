'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCanonicalPublicEventUrl } from '@/utils/url';

type EventData = {
  id: string;
  title: string;
  slug?: string;
  eventDate: string;
  locationDetails: string;
  status?: string;
  templateId?: string;
};

function IconPlus() {
  return (
    <svg className="btn-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <path d="M3 8h14M7 2v3M13 2v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconLocation() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 18C10 18 4 12.5 4 8a6 6 0 1 1 12 0c0 4.5-6 10-6 10z" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <circle cx="10" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );
}

function IconScan() {
  return (
    <svg className="btn-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 6V4.5A1.5 1.5 0 0 1 3.5 3H5M15 3h1.5A1.5 1.5 0 0 1 18 4.5V6M2 14v1.5A1.5 1.5 0 0 0 3.5 17H5M15 17h1.5A1.5 1.5 0 0 0 18 15.5V14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="4" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="btn-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M2 18c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M14 3.5c1.5.5 2.5 1.8 2.5 3.5s-1 3-2.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M18 18c0-2.5-1.5-4.5-4-5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconEdit() {
  return (
    <svg className="btn-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function IconExternal() {
  return (
    <svg className="btn-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 3h6v6M17 3l-9 9M8 5H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconEmpty() {
  return (
    <svg className="empty-state__icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 56, height: 56, color: 'var(--text-tertiary)', margin: '0 auto 1rem' }}>
      <rect x="6" y="10" width="36" height="32" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M6 18h36M16 6v8M32 6v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 28h8M16 34h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
    </svg>
  );
}

function statusBadgeClass(status?: string): string {
  switch (status?.toUpperCase()) {
    case 'PUBLISHED':
      return 'badge badge--success';
    case 'DRAFT':
      return 'badge badge--neutral';
    default:
      return 'badge badge--neutral';
  }
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const adminRes = await fetch('/api/events');

        if (adminRes.status === 401) {
          router.push('/login');
          return;
        }

        if (adminRes.status === 403) {
          const staffRes = await fetch('/api/scanner/events');
          if (!staffRes.ok) throw new Error('Gagal memuat event untuk pemindaian');
          const data = await staffRes.json();
          setEvents(data.data || []);
          setIsAdmin(false);
          return;
        }

        if (!adminRes.ok) {
          throw new Error('Gagal memuat daftar event');
        }

        const data = await adminRes.json();
        setEvents(data.data || []);
        setIsAdmin(true);
      } catch {
        setError('Gagal memuat data event. Silakan muat ulang halaman.');
      } finally {
        setLoading(false);
      }
    };

    void fetchEvents();
  }, [router]);

  return (
    <>
      {/* Page Header */}
      <div className="admin-page__header flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="admin-page__title">Events</h1>
          <p className="admin-page__subtitle">
            {isAdmin
              ? 'Kelola seluruh acara dan undangan client IRVITE.ID.'
              : 'Pilih acara yang ditugaskan untuk membuka scanner QR kehadiran.'}
          </p>
        </div>
        {isAdmin && (
          <button
            id="events-create-btn"
            className="btn btn-primary"
            onClick={() => router.push('/events/create')}
            type="button"
          >
            <IconPlus />
            + Buat Event
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert--error mb-6" role="alert">
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: '96px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
                animation: 'admin-skeleton-pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && events.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <IconEmpty />
            <div className="empty-state__title" style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Belum ada event
            </div>
            <p className="empty-state__desc" style={{ maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              {isAdmin
                ? 'Belum ada event. Buat event pertama untuk mulai menyiapkan undangan digital.'
                : 'Belum ada acara yang ditugaskan ke akun staff Anda.'}
            </p>
            {isAdmin && (
              <button
                id="events-empty-create-btn"
                className="btn btn-primary"
                onClick={() => router.push('/events/create')}
                type="button"
              >
                <IconPlus />
                + Buat Event
              </button>
            )}
          </div>
        </div>
      )}

      {/* Events Table */}
      {!loading && events.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Acara</th>
                <th>Tanggal & Waktu</th>
                <th>Lokasi</th>
                {isAdmin && <th>Status</th>}
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                let canonicalPublicUrl = '';
                if (event.slug) {
                  try {
                    canonicalPublicUrl = getCanonicalPublicEventUrl(event.slug);
                  } catch {
                    canonicalPublicUrl = `/e/${event.slug}`;
                  }
                }

                return (
                  <tr key={event.id}>
                    {/* Event Title & Slug */}
                    <td>
                      <div className="font-semibold" style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                        {event.title}
                      </div>
                      <div className="text-xs text-muted mt-1 flex-center gap-2">
                        {event.slug && (
                          <span style={{ color: 'var(--admin-accent)', fontWeight: 500 }}>
                            /e/{event.slug}
                          </span>
                        )}
                        <span>•</span>
                        <span>ID: {event.id.slice(0, 8)}...</span>
                      </div>
                    </td>

                    {/* Event Date */}
                    <td>
                      <div className="flex-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        <IconCalendar />
                        <span>
                          {new Date(event.eventDate).toLocaleDateString('id-ID', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Location */}
                    <td>
                      <div className="flex-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        <IconLocation />
                        <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {event.locationDetails || '-'}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    {isAdmin && (
                      <td>
                        <span className={statusBadgeClass(event.status)}>
                          {event.status || 'DRAFT'}
                        </span>
                      </td>
                    )}

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem', flexWrap: 'wrap' }}>
                        {isAdmin && (
                          <button
                            id={`events-manage-${event.id}`}
                            className="btn btn-secondary btn-sm"
                            onClick={() => router.push(`/events/${event.id}`)}
                            type="button"
                            title="Buka Pusat Manajemen Event"
                            style={{ fontWeight: 600 }}
                          >
                            Kelola
                          </button>
                        )}

                        {/* Scanner button (visible to both admin and staff) */}
                        <button
                          id={`events-scan-${event.id}`}
                          className="btn btn-secondary btn-sm"
                          onClick={() => router.push(`/events/${event.id}/scanner`)}
                          type="button"
                          title="Buka Scanner QR"
                        >
                          <IconScan />
                          Scanner
                        </button>

                        {isAdmin && (
                          <>
                            {/* Guests */}
                            <button
                              id={`events-guests-${event.id}`}
                              className="btn btn-secondary btn-sm"
                              onClick={() => router.push(`/events/${event.id}/guests`)}
                              type="button"
                              title="Kelola Tamu & Undangan"
                            >
                              <IconUsers />
                              Tamu
                            </button>

                            {/* Edit */}
                            <button
                              id={`events-edit-${event.id}`}
                              className="btn btn-ghost btn-sm"
                              onClick={() => router.push(`/events/${event.id}/edit`)}
                              type="button"
                              title="Edit Detail Acara"
                            >
                              <IconEdit />
                              Edit
                            </button>

                            {/* Public Link (if published) */}
                            {event.status === 'PUBLISHED' && event.slug && (
                              <a
                                id={`events-public-${event.id}`}
                                href={canonicalPublicUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-success btn-sm flex-center gap-1"
                                title="Buka Halaman Undangan Publik"
                              >
                                <IconExternal />
                                Publik
                              </a>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
