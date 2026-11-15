'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCanonicalPublicEventUrl } from '@/utils/url';
import { PUBLIC_TICKETING_EVENTS, type PublicTicketingEvent, type PublicTicketTier } from '@/lib/ticketing-store';

type EventData = {
  id: string;
  title: string;
  slug?: string;
  eventDate: string;
  activeUntil?: string | null;
  locationDetails: string;
  status?: string;
  templateId?: string;
  order?: {
    referenceCode?: string;
    packageCode?: string;
    status?: string;
  } | null;
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
    case 'ARCHIVED':
      return 'badge badge--danger';
    case 'DRAFT':
      return 'badge badge--neutral';
    default:
      return 'badge badge--neutral';
  }
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [ticketingEvents, setTicketingEvents] = useState<PublicTicketingEvent[]>(PUBLIC_TICKETING_EVENTS);
  const [eventCategoryTab, setEventCategoryTab] = useState<'wedding' | 'tickets'>('wedding');
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
  const [ticketActionSuccess, setTicketActionSuccess] = useState<string | null>(null);

  // Form states for creating a new ticketing event (Loket.com style)
  const [formTitle, setFormTitle] = useState('');
  const [formOrganizer, setFormOrganizer] = useState('');
  const [formCategory, setFormCategory] = useState('Konser Musik');
  const [formDate, setFormDate] = useState('28 Agu 2026');
  const [formTime, setFormTime] = useState('18:00 - 23:00 WIB');
  const [formVenue, setFormVenue] = useState('Stadion Madya GBK');
  const [formCity, setFormCity] = useState('Jakarta Pusat');
  const [formBannerUrl, setFormBannerUrl] = useState('');
  const [formHeadline, setFormHeadline] = useState('');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formTierName1, setFormTierName1] = useState('Presale 1');
  const [formTierPrice1, setFormTierPrice1] = useState(125000);
  const [formTierQuota1, setFormTierQuota1] = useState(500);
  const [formTierName2, setFormTierName2] = useState('VIP Pass');
  const [formTierPrice2, setFormTierPrice2] = useState(350000);
  const [formTierQuota2, setFormTierQuota2] = useState(150);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError('');
        const [adminRes, tktRes] = await Promise.all([
          fetch(`/api/events?page=${page}&limit=10&filter=${filter}`, { signal: controller.signal, cache: 'no-store' }),
          fetch('/api/ticketing', { signal: controller.signal, cache: 'no-store' }).catch(() => null),
        ]);

        if (tktRes && tktRes.ok) {
          const tktData = await tktRes.json().catch(() => null);
          const list = Array.isArray(tktData?.items)
            ? tktData.items
            : Array.isArray(tktData?.events)
              ? tktData.events
              : null;
          if (list) {
            setTicketingEvents(list);
          }
        }

        if (adminRes.status === 401) {
          router.push('/login');
          return;
        }

        if (adminRes.status === 403) {
          setIsAdmin(false);
          const staffRes = await fetch('/api/scanner/events', { signal: controller.signal, cache: 'no-store' });
          if (!staffRes.ok) throw new Error('Gagal memuat event untuk pemindaian');
          const data = await staffRes.json();
          if (controller.signal.aborted) return;
          setEvents(data.data || []);
          return;
        }

        if (!adminRes.ok) {
          const errorData = await adminRes.json().catch(() => ({}));
          throw new Error(errorData.message || 'Gagal memuat daftar event');
        }

        const data = await adminRes.json();
        if (controller.signal.aborted) return;
        setEvents(data.data || []);
        setTotal(data.meta?.total ?? 0);
        setLastPage(Math.max(1, data.meta?.lastPage ?? 1));
        setIsAdmin(true);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error && err.message ? err.message : 'Gagal memuat data event. Silakan muat ulang halaman.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchEvents();
    return () => controller.abort();
  }, [router, page, filter]);

  const filteredEvents = events.filter((e) => {
    if (filter === 'active') {
      return e.status === 'DRAFT' || e.status === 'PUBLISHED';
    }
    if (filter === 'archived') {
      return e.status === 'ARCHIVED';
    }
    return true;
  });

  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Nama acara/event wajib diisi.');
      return;
    }
    const newEventId = `tkt-${Date.now()}`;
    const tiers: PublicTicketTier[] = [
      {
        id: `${newEventId}-tier-1`,
        name: formTierName1.trim() || 'Reguler',
        price: Number(formTierPrice1) || 100000,
        quota: Number(formTierQuota1) || 500,
        remainingQuota: Number(formTierQuota1) || 500,
        soldCount: 0,
        statusLabel: 'TERSEDIA',
        description: 'Akses masuk resmi acara',
        benefits: ['E-Ticket QR Resmi', 'Akses Masuk Gate Venue'],
      },
    ];
    if (formTierName2.trim()) {
      tiers.push({
        id: `${newEventId}-tier-2`,
        name: formTierName2.trim(),
        price: Number(formTierPrice2) || 250000,
        quota: Number(formTierQuota2) || 150,
        remainingQuota: Number(formTierQuota2) || 150,
        soldCount: 0,
        statusLabel: 'TERSEDIA',
        description: 'Akses prioritas VIP acara',
        benefits: ['VIP Pass & Akses Khusus', 'Tiket Gelang Eksklusif'],
      });
    }

    const lowestPrice = Math.min(...tiers.map((t) => t.price));
    const startingPriceLabel = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(lowestPrice);

    const newEvent: PublicTicketingEvent = {
      id: newEventId,
      slug: formTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      title: formTitle.trim(),
      category: (formCategory === 'Workshop / Bootcamp' ? 'Workshop' : formCategory) as 'Konser Musik' | 'Seminar & Edukasi' | 'Workshop' | 'Standup Comedy',
      organizerName: formOrganizer.trim() || 'Event Organizer',
      eventDate: formDate,
      eventTime: formTime,
      venueName: formVenue,
      city: formCity,
      bannerGradient: 'linear-gradient(135deg, #1b3b2b 0%, #0d251e 100%)',
      bannerTag: formCategory.toUpperCase(),
      startingPrice: lowestPrice,
      startingPriceLabel,
      isFeaturedBanner: formIsFeatured,
      bannerHeadline: formHeadline.trim() || undefined,
      tiers,
    };

    setTicketingEvents((prev) => [newEvent, ...prev]);
    setIsCreateTicketModalOpen(false);
    setTicketActionSuccess(`Event Tiket "${formTitle}" berhasil dibuat dan diterbitkan!`);
    setTimeout(() => setTicketActionSuccess(null), 5000);

    // Reset form
    setFormTitle('');
    setFormOrganizer('');
    setFormHeadline('');
    setFormBannerUrl('');
    setFormIsFeatured(false);
  };

  return (
    <>
      {/* Page Header */}
      <div className="admin-page__header flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="admin-page__title">Events</h1>
          <p className="admin-page__subtitle">
            {isAdmin
              ? 'Kelola seluruh acara undangan pernikahan dan tiket event publik client IRVITE.'
              : 'Pilih acara yang ditugaskan untuk membuka scanner QR kehadiran.'}
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {eventCategoryTab === 'wedding' ? (
              <button
                id="events-create-btn"
                className="btn btn-primary"
                onClick={() => router.push('/events/create')}
                type="button"
              >
                <IconPlus />
                Buat Event Undangan
              </button>
            ) : (
              <>
                <a
                  href="/irvite-logo.png"
                  download="logo-irvite-official.png"
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    textDecoration: 'none',
                  }}
                  title="Download logo resmi IRVITE.ID (PNG transparan) untuk poster dan materi promosi acara"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Unduh Logo untuk Poster</span>
                </a>
                <button
                  id="events-create-ticket-btn"
                  className="btn btn-primary"
                  onClick={() => setIsCreateTicketModalOpen(true)}
                  type="button"
                >
                  <IconPlus />
                  Buat Event Tiket / Konser
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {ticketActionSuccess && (
        <div style={{ padding: '0.75rem 1rem', background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
          ✓ {ticketActionSuccess}
        </div>
      )}

      {/* Category Switcher: Undangan Pernikahan vs Tiket Event & Konser */}
      {isAdmin && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            margin: '0.25rem 0 1.25rem 0',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--admin-border)',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm ${eventCategoryTab === 'wedding' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setEventCategoryTab('wedding')}
            >
              Undangan Pernikahan ({total})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${eventCategoryTab === 'tickets' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setEventCategoryTab('tickets')}
            >
              Tiket Event &amp; Konser ({ticketingEvents.length})
            </button>
          </div>

          {eventCategoryTab === 'wedding' && (
            <div style={{ display: 'flex', gap: '0.5rem' }} role="tablist" aria-label="Filter status acara">
              <button
                type="button"
                id="filter-all"
                className={'btn btn-sm ' + (filter === 'all' ? 'btn-primary' : 'btn-secondary')}
                onClick={() => { setFilter('all'); setPage(1); }}
              >
                Semua
              </button>
              <button
                type="button"
                id="filter-active"
                className={'btn btn-sm ' + (filter === 'active' ? 'btn-primary' : 'btn-secondary')}
                onClick={() => { setFilter('active'); setPage(1); }}
              >
                Aktif
              </button>
              <button
                type="button"
                id="filter-archived"
                className={'btn btn-sm ' + (filter === 'archived' ? 'btn-primary' : 'btn-secondary')}
                onClick={() => { setFilter('archived'); setPage(1); }}
              >
                Diarsipkan
              </button>
            </div>
          )}
        </div>
      )}

      {eventCategoryTab === 'tickets' ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Acara &amp; Kategori</th>
                <th>Tanggal &amp; Waktu</th>
                <th>Lokasi</th>
                <th>Tiket Terjual</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {ticketingEvents.map((ev) => {
                const sold = ev.tiers.reduce((acc, t) => acc + t.soldCount, 0);
                const quota = ev.tiers.reduce((acc, t) => acc + t.quota, 0);
                return (
                  <tr key={ev.id}>
                    <td>
                      <div className="font-semibold" style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                        {ev.title}
                      </div>
                      <div className="text-xs text-muted mt-1 flex-center gap-2">
                        <span style={{ color: 'var(--admin-accent)', fontWeight: 600 }}>{ev.category}</span>
                        <span>•</span>
                        <span>EO: {ev.organizerName}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        <IconCalendar />
                        <span>{ev.eventDate}</span>
                      </div>
                      <div className="text-xs text-muted mt-1">{ev.eventTime}</div>
                    </td>
                    <td>
                      <div className="flex-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        <IconLocation />
                        <span>{ev.venueName}, {ev.city}</span>
                      </div>
                    </td>
                    <td>
                      <div className="font-semibold" style={{ fontSize: '0.875rem' }}>
                        {sold.toLocaleString('id-ID')} / {quota.toLocaleString('id-ID')} Tiket
                      </div>
                      <div className="text-xs text-muted">
                        Mulai {ev.startingPriceLabel}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge--success">PUBLISHED</span>
                      {ev.isFeaturedBanner && (
                        <div style={{ marginTop: '0.35rem' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              background: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                          >
                            ★ Banner Depan
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => router.push('/orders')}
                        >
                          Pesanan Tiket
                        </button>
                        <a
                          href="https://irvite-id.vercel.app/tiket"
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-success btn-sm flex-center gap-1"
                        >
                          <IconExternal />
                          Web Tiket
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {isAdmin && !error && (
            <nav aria-label="Halaman daftar acara" className="flex-between" style={{ marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>Sebelumnya</button>
              <span aria-live="polite">{loading ? 'Memuat…' : `${total} acara · Halaman ${page} / ${lastPage}`}</span>
              <button className="btn btn-secondary btn-sm" disabled={loading || page >= lastPage} onClick={() => setPage((value) => value + 1)}>Berikutnya</button>
            </nav>
          )}

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
                    Buat Event
                  </button>
                )}
              </div>
            </div>
          )}

      {/* Filtered Empty State */}
      {!loading && !error && events.length > 0 && filteredEvents.length === 0 && (
        <div className="card">
          <div className="empty-state" style={{ padding: '2rem' }}>
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              {filter === 'archived'
                ? 'Tidak ada acara yang diarsipkan.'
                : 'Tidak ada acara aktif saat ini.'}
            </p>
          </div>
        </div>
      )}

      {/* Events Table (Desktop) & Cards (Mobile) */}
      {!loading && filteredEvents.length > 0 && (
        <>
          <div className="table-wrap events-desktop-table">
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
              {filteredEvents.map((event) => {
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
                      {event.activeUntil && (() => {
                        const diffDays = Math.ceil((new Date(event.activeUntil).getTime() - Date.now()) / 86400000);
                        if (diffDays <= 0) {
                          return (
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#dc2626', background: '#fee2e2', padding: '1px 5px', borderRadius: '4px', marginTop: '2px', display: 'inline-block' }}>
                              ⛔ Kedaluwarsa
                            </span>
                          );
                        }
                        if (diffDays <= 7) {
                          return (
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: '4px', marginTop: '2px', display: 'inline-block' }}>
                              ⚠️ Berakhir dlm {diffDays} hr
                            </span>
                          );
                        }
                        return null;
                      })()}
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

        {/* Mobile Events Cards */}
        <div className="events-mobile-cards">
          {filteredEvents.map((event) => {
            let canonicalPublicUrl = '';
            if (event.slug) {
              try {
                canonicalPublicUrl = getCanonicalPublicEventUrl(event.slug);
              } catch {
                canonicalPublicUrl = `/e/${event.slug}`;
              }
            }

            return (
              <div
                key={event.id}
                className="card"
                style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                {/* Header: Title & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                      {event.title}
                    </h3>
                    <div className="text-xs text-muted mt-1 flex-center gap-2" style={{ flexWrap: 'wrap' }}>
                      {event.slug && (
                        <span style={{ color: 'var(--admin-accent)', fontWeight: 500 }}>
                          /e/{event.slug}
                        </span>
                      )}
                      <span>•</span>
                      <span>ID: {event.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <span className={statusBadgeClass(event.status)} style={{ flexShrink: 0 }}>
                      {event.status || 'DRAFT'}
                    </span>
                  )}
                </div>

                {/* Metadata */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  <div className="flex-center gap-2">
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
                  {event.activeUntil && (() => {
                    const diffDays = Math.ceil((new Date(event.activeUntil).getTime() - Date.now()) / 86400000);
                    if (diffDays <= 0) {
                      return (
                        <div>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#dc2626', background: '#fee2e2', padding: '1px 5px', borderRadius: '4px', display: 'inline-block' }}>
                            ⛔ Kedaluwarsa
                          </span>
                        </div>
                      );
                    }
                    if (diffDays <= 7) {
                      return (
                        <div>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: '4px', display: 'inline-block' }}>
                            ⚠️ Berakhir dlm {diffDays} hr
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {event.locationDetails && (
                    <div className="flex-center gap-2">
                      <IconLocation />
                      <span style={{ wordBreak: 'break-word' }}>{event.locationDetails}</span>
                    </div>
                  )}
                </div>

                {/* Actions Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isAdmin ? 'repeat(auto-fill, minmax(80px, 1fr))' : '1fr',
                    gap: '0.375rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--admin-border)',
                  }}
                >
                  {isAdmin && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => router.push(`/events/${event.id}`)}
                      type="button"
                      style={{ fontWeight: 600, justifyContent: 'center' }}
                    >
                      Kelola
                    </button>
                  )}

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => router.push(`/events/${event.id}/scanner`)}
                    type="button"
                    style={{ justifyContent: 'center' }}
                  >
                    <IconScan />
                    Scanner
                  </button>

                  {isAdmin && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => router.push(`/events/${event.id}/guests`)}
                        type="button"
                        style={{ justifyContent: 'center' }}
                      >
                        <IconUsers />
                        Tamu
                      </button>

                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => router.push(`/events/${event.id}/edit`)}
                        type="button"
                        style={{ justifyContent: 'center' }}
                      >
                        <IconEdit />
                        Edit
                      </button>

                      {event.status === 'PUBLISHED' && event.slug && (
                        <a
                          href={canonicalPublicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-success btn-sm flex-center gap-1"
                          style={{ justifyContent: 'center' }}
                        >
                          <IconExternal />
                          Publik
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    )}
        </>
      )}

      {/* Create Ticketing Event Modal (Loket.com Standard) */}
      {isCreateTicketModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setIsCreateTicketModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              padding: '1.75rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Buat Event Tiket / Konser Baru
                </h2>
                <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                  Lengkapi data event, kuota tiket tiering, dan opsi spotlight banner (standar Loket.com).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateTicketModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.25rem',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Nama Event / Acara *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: JAKARTA SUMMER FESTIVAL 2026"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Penyelenggara / EO *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Soundwave Live Indonesia"
                    value={formOrganizer}
                    onChange={(e) => setFormOrganizer(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Kategori Event
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#fff' }}
                  >
                    <option value="Konser Musik">Konser Musik</option>
                    <option value="Seminar & Edukasi">Seminar &amp; Edukasi</option>
                    <option value="Workshop / Bootcamp">Workshop / Bootcamp</option>
                    <option value="Standup Comedy">Standup Comedy</option>
                    <option value="Festival Budaya">Festival Budaya</option>
                    <option value="Acara Kampus">Acara Kampus</option>
                    <option value="Olahraga & Komunitas">Olahraga &amp; Komunitas</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Tanggal Acara
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 28 Agu 2026"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Jam / Waktu Pelaksanaan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 18:00 - 23:00 WIB"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Venue & Kota
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Venue (GBK)"
                      value={formVenue}
                      onChange={(e) => setFormVenue(e.target.value)}
                      style={{ flex: 1.5, padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                    />
                    <input
                      type="text"
                      placeholder="Kota"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Tier Tiket (Tiering) */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.65rem' }}>
                  Pengaturan Tiket &amp; Kuota (Tiering)
                </div>
                {/* Tier 1 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Nama Tier (Presale 1)"
                    value={formTierName1}
                    onChange={(e) => setFormTierName1(e.target.value)}
                    style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Harga (Rp)"
                    value={formTierPrice1}
                    onChange={(e) => setFormTierPrice1(Number(e.target.value))}
                    style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Kuota"
                    value={formTierQuota1}
                    onChange={(e) => setFormTierQuota1(Number(e.target.value))}
                    style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
                {/* Tier 2 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Nama Tier (VIP Pass)"
                    value={formTierName2}
                    onChange={(e) => setFormTierName2(e.target.value)}
                    style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Harga (Rp)"
                    value={formTierPrice2}
                    onChange={(e) => setFormTierPrice2(Number(e.target.value))}
                    style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Kuota"
                    value={formTierQuota2}
                    onChange={(e) => setFormTierQuota2(Number(e.target.value))}
                    style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Spotlight Banner Setting */}
              <div style={{ background: '#fdfbf7', border: '1.5px solid #fde68a', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.86rem', color: '#92400e' }}>
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>★ Tampilkan sebagai Banner Spotlight di Halaman Depan (/tiket)</span>
                </label>
                {formIsFeatured && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <input
                      type="text"
                      placeholder="Headline Banner Depan (Contoh: Penantian Berakhir! Konser Spektakuler 2026)"
                      value={formHeadline}
                      onChange={(e) => setFormHeadline(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '0.82rem' }}
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateTicketModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Terbitkan Event Tiket Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
