'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────

interface EventItem {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  eventDate: string;
  locationDetails?: string | null;
  status: string;
  templateId?: string | null;
  guestCount?: number;
}

interface InvitationItem {
  id: string;
  status: string;
}

interface RsvpStats {
  totalInvitations: number;
  attending: number;
  declined: number;
  pending: number;
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconTemplate() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function IconQr() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3z" />
      <path d="M20 14v3h-3" />
      <path d="M14 20h7" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

// Fixed template catalog showcase list (standard coded templates on irvite.id)
const FIXED_TEMPLATES_SHOWCASE = [
  { name: 'Verdant Estate', tag: 'Luxury Emerald & Gold' },
  { name: 'Midnight Editorial', tag: 'High-Fashion Monochrome' },
  { name: 'Botanical Romance', tag: 'Warm Terracotta Floral' },
  { name: 'Classic Elegance', tag: 'Traditional Ivory Serif' },
];

export default function DashboardPage() {
  const router = useRouter();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [totalEventsCount, setTotalEventsCount] = useState<number>(0);
  const [templatesCount, setTemplatesCount] = useState<number>(0);
  const [totalGuestsCount, setTotalGuestsCount] = useState<number>(0);
  const [rsvpStats, setRsvpStats] = useState<RsvpStats>({
    totalInvitations: 0,
    attending: 0,
    declined: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        setLoading(true);

        // 1. Fetch Events
        const eventsRes = await fetch('/api/events');
        let fetchedEvents: EventItem[] = [];
        let totalEvents = 0;

        if (eventsRes.status === 401) {
          router.push('/login');
          return;
        }

        if (eventsRes.ok) {
          const eventsJson = await eventsRes.json();
          fetchedEvents = Array.isArray(eventsJson.data) ? eventsJson.data : [];
          totalEvents = eventsJson.meta?.total ?? fetchedEvents.length;
        }

        // 2. Fetch Templates
        const tplRes = await fetch('/api/templates');
        let totalTemplates = 0;
        if (tplRes.ok) {
          const tplJson = await tplRes.json();
          const tplList = Array.isArray(tplJson.data) ? tplJson.data : [];
          // Use total from API, or fallback to fixed catalog length (6)
          totalTemplates = tplJson.meta?.total || (tplList.length > 0 ? tplList.length : 6);
        } else {
          totalTemplates = 6;
        }

        // 3. For up to 5 events, fetch guest count & invitations for real RSVP stats
        let aggregateGuests = 0;
        let attendingCount = 0;
        let declinedCount = 0;
        let pendingCount = 0;
        let totalInvs = 0;

        const eventsWithGuests = await Promise.all(
          fetchedEvents.slice(0, 10).map(async (ev) => {
            try {
              const [guestRes, invRes] = await Promise.all([
                fetch(`/api/events/${ev.id}/guests?limit=1`),
                fetch(`/api/events/${ev.id}/invitations?limit=100`),
              ]);

              let count = 0;
              if (guestRes.ok) {
                const gJson = await guestRes.json();
                count = gJson.meta?.total ?? 0;
                aggregateGuests += count;
              }

              if (invRes.ok) {
                const iJson = await invRes.json();
                const invList: InvitationItem[] = Array.isArray(iJson.data) ? iJson.data : [];
                invList.forEach((inv) => {
                  totalInvs++;
                  if (inv.status === 'RSVP_YES') {
                    attendingCount++;
                  } else if (inv.status === 'RSVP_NO') {
                    declinedCount++;
                  } else {
                    pendingCount++;
                  }
                });
              }

              return { ...ev, guestCount: count };
            } catch {
              return ev;
            }
          })
        );

        if (isMounted) {
          setEvents(eventsWithGuests);
          setTotalEventsCount(totalEvents);
          setTemplatesCount(totalTemplates);
          setTotalGuestsCount(aggregateGuests);
          setRsvpStats({
            totalInvitations: totalInvs,
            attending: attendingCount,
            declined: declinedCount,
            pending: pendingCount,
          });
        }
      } catch {
        // Degrade gracefully with empty metrics
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Derived real metrics
  const publishedEventsCount = useMemo(() => {
    return events.filter((e) => e.status === 'PUBLISHED').length;
  }, [events]);

  const upcomingEvents = useMemo(() => {
    // Sort upcoming events chronologically
    return [...events]
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
      .slice(0, 5);
  }, [events]);

  const upcomingEventsCount = useMemo(() => {
    const now = new Date();
    return events.filter((e) => new Date(e.eventDate) >= now).length;
  }, [events]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {/* ── Page Header ── */}
      <header className="dash-page-header">
        <div className="dash-page-header__left">
          <h1 className="dash-page-header__title">Dashboard</h1>
          <p className="dash-page-header__subtitle">
            Ringkasan operasional undangan digital irvite.id.
          </p>
        </div>

        <div className="dash-page-header__right">
          <button
            id="dashboard-create-event-btn"
            type="button"
            className="btn btn-accent dash-page-header__cta"
            onClick={() => router.push('/events/create')}
          >
            <IconPlus />
            Buat Event
          </button>
        </div>
      </header>

      {/* ── Primary KPI Cards ── */}
      <section className="dash-kpis" aria-label="Ringkasan Indikator Utama">
        {/* KPI 1: Total Event */}
        <div className="dash-kpi">
          <div className="dash-kpi__top">
            <span className="dash-kpi__label">Total Event</span>
            <div className="dash-kpi__icon-box" aria-hidden="true">
              <IconCalendar />
            </div>
          </div>
          <div className="dash-kpi__value">
            {loading ? '…' : totalEventsCount}
          </div>
          <div className="dash-kpi__meta">
            Event terdaftar di sistem
          </div>
        </div>

        {/* KPI 2: Event Aktif & Publikasi */}
        <div className="dash-kpi">
          <div className="dash-kpi__top">
            <span className="dash-kpi__label">Event Publikasi</span>
            <div className="dash-kpi__icon-box" aria-hidden="true">
              <IconSparkles />
            </div>
          </div>
          <div className="dash-kpi__value">
            {loading ? '…' : publishedEventsCount}
          </div>
          <div className="dash-kpi__meta">
            Status PUBLISHED aktif
          </div>
        </div>

        {/* KPI 3: Event Mendatang */}
        <div className="dash-kpi">
          <div className="dash-kpi__top">
            <span className="dash-kpi__label">Event Mendatang</span>
            <div className="dash-kpi__icon-box" aria-hidden="true">
              <IconClock />
            </div>
          </div>
          <div className="dash-kpi__value">
            {loading ? '…' : upcomingEventsCount}
          </div>
          <div className="dash-kpi__meta">
            Jadwal belum terlewat
          </div>
        </div>

        {/* KPI 4: Total Tamu */}
        <div className="dash-kpi">
          <div className="dash-kpi__top">
            <span className="dash-kpi__label">Total Tamu</span>
            <div className="dash-kpi__icon-box" aria-hidden="true">
              <IconUsers />
            </div>
          </div>
          <div className="dash-kpi__value">
            {loading ? '…' : totalGuestsCount}
          </div>
          <div className="dash-kpi__meta">
            Tamu terdaftar pada event
          </div>
        </div>

        {/* KPI 5: Template Aktif */}
        <div className="dash-kpi">
          <div className="dash-kpi__top">
            <span className="dash-kpi__label">Katalog Template</span>
            <div className="dash-kpi__icon-box" aria-hidden="true">
              <IconTemplate />
            </div>
          </div>
          <div className="dash-kpi__value">
            {loading ? '…' : templatesCount}
          </div>
          <div className="dash-kpi__meta">
            Desain paten siap pakai
          </div>
        </div>
      </section>

      {/* ── Main Operational Layout ── */}
      <div className="dash-layout">
        {/* Left Column: Upcoming Events & RSVP Summary */}
        <div className="dash-section">
          {/* Section: Event Terdekat */}
          <div className="dash-panel">
            <div className="dash-panel__header">
              <div className="dash-panel__title-group">
                <h2 className="dash-panel__title">Event Terdekat</h2>
                <span className="dash-panel__subtitle">
                  Event mendatang yang memerlukan perhatian operasional.
                </span>
              </div>
              <Link
                href="/events"
                className="btn btn-secondary btn-sm"
                aria-label="Lihat semua event"
              >
                Semua Event
              </Link>
            </div>

            <div className="dash-panel__body dash-panel__body--flush">
              {loading ? (
                <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Memuat data event...
                </div>
              ) : upcomingEvents.length === 0 ? (
                /* Empty state */
                <div className="dash-empty">
                  <div className="dash-empty__icon" aria-hidden="true">
                    <IconCalendar />
                  </div>
                  <div className="dash-empty__title">Belum Ada Event Terdekat</div>
                  <p className="dash-empty__desc">
                    Mulai buat undangan pernikahan pertama Anda menggunakan template siap pakai irvite.id.
                  </p>
                  <button
                    type="button"
                    className="btn btn-accent btn-sm"
                    onClick={() => router.push('/events/create')}
                  >
                    <IconPlus />
                    Buat Event
                  </button>
                </div>
              ) : (
                /* List of upcoming events */
                <div className="dash-events-list">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="dash-event-row">
                      <div className="dash-event-info">
                        <div className="dash-event-headline">
                          <span className="dash-event-title" title={event.title}>
                            {event.title}
                          </span>
                          <span
                            className={`badge ${
                              event.status === 'PUBLISHED'
                                ? 'badge--success'
                                : event.status === 'COMPLETED'
                                ? 'badge--info'
                                : 'badge--neutral'
                            }`}
                          >
                            {event.status}
                          </span>
                        </div>

                        <div className="dash-event-meta">
                          <span className="dash-event-meta-item">
                            <IconCalendar />
                            {formatDate(event.eventDate)}
                          </span>

                          {event.locationDetails && (
                            <span className="dash-event-meta-item" title={event.locationDetails}>
                              <IconMapPin />
                              {event.locationDetails.length > 25
                                ? `${event.locationDetails.slice(0, 25)}…`
                                : event.locationDetails}
                            </span>
                          )}

                          <span className="dash-event-meta-item">
                            <IconUsers />
                            {event.guestCount !== undefined ? `${event.guestCount} Tamu` : '—'}
                          </span>
                        </div>
                      </div>

                      <div className="dash-event-actions">
                        <Link
                          href={`/events/${event.id}/guests`}
                          className="btn btn-secondary btn-sm"
                          title="Kelola Tamu"
                        >
                          Kelola
                        </Link>
                        <Link
                          href={`/events/${event.id}/edit`}
                          className="btn btn-ghost btn-sm"
                          title="Edit Detail Event"
                        >
                          Detail
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section: Ringkasan RSVP & Tamu */}
          <div className="dash-rsvp-card">
            <div className="dash-panel__title-group">
              <h2 className="dash-panel__title">Ringkasan Respons Undangan (RSVP)</h2>
              <span className="dash-panel__subtitle">
                Agregat konfirmasi kehadiran tamu dari undangan aktif.
              </span>
            </div>

            {rsvpStats.totalInvitations > 0 ? (
              <>
                {/* Proportional visualization bar */}
                <div
                  className="dash-rsvp-bar"
                  role="progressbar"
                  aria-label="Progress RSVP"
                >
                  <div
                    className="dash-rsvp-bar__seg--yes"
                    style={{
                      width: `${(rsvpStats.attending / rsvpStats.totalInvitations) * 100}%`,
                    }}
                    title={`Hadir: ${rsvpStats.attending}`}
                  />
                  <div
                    className="dash-rsvp-bar__seg--no"
                    style={{
                      width: `${(rsvpStats.declined / rsvpStats.totalInvitations) * 100}%`,
                    }}
                    title={`Tidak Hadir: ${rsvpStats.declined}`}
                  />
                  <div
                    className="dash-rsvp-bar__seg--pending"
                    style={{
                      width: `${(rsvpStats.pending / rsvpStats.totalInvitations) * 100}%`,
                    }}
                    title={`Belum Respons: ${rsvpStats.pending}`}
                  />
                </div>

                <div className="dash-rsvp-legend">
                  <span className="dash-rsvp-legend-item">
                    <span className="dash-rsvp-dot" style={{ background: '#059669' }} />
                    Hadir: <strong>{rsvpStats.attending}</strong>
                  </span>
                  <span className="dash-rsvp-legend-item">
                    <span className="dash-rsvp-dot" style={{ background: '#dc2626' }} />
                    Tidak Hadir: <strong>{rsvpStats.declined}</strong>
                  </span>
                  <span className="dash-rsvp-legend-item">
                    <span className="dash-rsvp-dot" style={{ background: 'var(--admin-accent)' }} />
                    Belum Merespons: <strong>{rsvpStats.pending}</strong>
                  </span>
                  <span className="dash-rsvp-legend-item" style={{ color: 'var(--text-tertiary)' }}>
                    Total Undangan: <strong>{rsvpStats.totalInvitations}</strong>
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <p>
                  Belum ada data respons RSVP yang tercatat. Status kehadiran akan terbarui otomatis secara realtime saat tamu memberikan konfirmasi melalui website undangan pribadi mereka.
                </p>
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--admin-accent)', fontSize: '0.75rem', fontWeight: 500 }}>
                  <IconCheckCircle /> Presensi hari H diverifikasi melalui Scanner QR unik tamu.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions & Template Showcase */}
        <div className="dash-section">
          {/* Section: Aksi Cepat */}
          <div className="dash-panel">
            <div className="dash-panel__header">
              <h2 className="dash-panel__title">Aksi Cepat</h2>
            </div>
            <div className="dash-panel__body">
              <div className="dash-actions-grid">
                {/* Action 1: Buat Event */}
                <Link
                  id="dash-action-create-event"
                  href="/events/create"
                  className="dash-action-card"
                >
                  <div className="dash-action-card__icon" aria-hidden="true">
                    <IconPlus />
                  </div>
                  <div className="dash-action-card__content">
                    <div className="dash-action-card__title">
                      Buat Event Baru
                      <IconArrowRight />
                    </div>
                    <p className="dash-action-card__desc">
                      Input data mempelai, tanggal akad/resepsi, dan venue acara.
                    </p>
                  </div>
                </Link>

                {/* Action 2: Kelola Event */}
                <Link
                  id="dash-action-manage-events"
                  href="/events"
                  className="dash-action-card"
                >
                  <div className="dash-action-card__icon" aria-hidden="true">
                    <IconCalendar />
                  </div>
                  <div className="dash-action-card__content">
                    <div className="dash-action-card__title">
                      Kelola Event
                      <IconArrowRight />
                    </div>
                    <p className="dash-action-card__desc">
                      Akses daftar seluruh event, kelola daftar tamu, dan tautan undangan.
                    </p>
                  </div>
                </Link>

                {/* Action 3: Lihat Template */}
                <Link
                  id="dash-action-view-templates"
                  href="/templates"
                  className="dash-action-card"
                >
                  <div className="dash-action-card__icon" aria-hidden="true">
                    <IconTemplate />
                  </div>
                  <div className="dash-action-card__content">
                    <div className="dash-action-card__title">
                      Katalog Template
                      <IconArrowRight />
                    </div>
                    <p className="dash-action-card__desc">
                      Eksplorasi koleksi desain undangan tetap siap pakai irvite.id.
                    </p>
                  </div>
                </Link>

                {/* Action 4: Buka Scanner */}
                <Link
                  id="dash-action-open-scanner"
                  href="/events"
                  className="dash-action-card"
                >
                  <div className="dash-action-card__icon" aria-hidden="true">
                    <IconQr />
                  </div>
                  <div className="dash-action-card__content">
                    <div className="dash-action-card__title">
                      Scanner Presensi
                      <IconArrowRight />
                    </div>
                    <p className="dash-action-card__desc">
                      Pilih event aktif dan buka kamera scanner untuk check-in tamu.
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Section: Template Katalog Overview */}
          <div className="dash-panel">
            <div className="dash-panel__header">
              <div className="dash-panel__title-group">
                <h2 className="dash-panel__title">Template Undangan Siap Pakai</h2>
                <span className="dash-panel__subtitle">
                  Desain tetap berbasis kode dengan estetika terkurasi.
                </span>
              </div>
            </div>
            <div className="dash-panel__body">
              <div className="dash-tpl-showcase">
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Setiap template di irvite.id memiliki tipografi dan layout yang dipatenkan untuk performa optimal di seluruh perangkat.
                </p>

                <div className="dash-tpl-pill-list">
                  {FIXED_TEMPLATES_SHOWCASE.map((tpl) => (
                    <div key={tpl.name} className="dash-tpl-pill">
                      <span className="dash-tpl-pill__name">{tpl.name}</span>
                      <span className="dash-tpl-pill__tag">{tpl.tag}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/templates"
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', marginTop: '0.25rem' }}
                >
                  Buka Katalog Lengkap <IconArrowRight />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
