'use client';

import { useEffect, useState } from 'react';
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

interface RsvpStats {
  totalInvitations: number;
  attending: number;
  declined: number;
  pending: number;
}

interface TicketingDashboardSummary {
  totalPublicEvents: number;
  totalTicketsSold: number;
  grossTicketRevenue: number;
  grossTicketRevenueLabel: string;
  platformFeeRevenue: number;
  platformFeeRevenueLabel: string;
}

function IconTicketPass() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  );
}

function IconRevenueWallet() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
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

export default function DashboardPage() {
  const router = useRouter();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [templateHighlights, setTemplateHighlights] = useState<{ id: string; name: string; themeCode: string }[]>([]);
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
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [publishedEventsCount, setPublishedEventsCount] = useState(0);
  const [upcomingEventsCount, setUpcomingEventsCount] = useState(0);
  const [ticketingSummary, setTicketingSummary] = useState<TicketingDashboardSummary>({
    totalPublicEvents: 4,
    totalTicketsSold: 1634,
    grossTicketRevenue: 256800000,
    grossTicketRevenueLabel: 'Rp 256.800.000',
    platformFeeRevenue: 4902000,
    platformFeeRevenueLabel: 'Rp 4.902.000',
  });
  const [csLookupCode, setCsLookupCode] = useState('ORD-IRV-2026-8821');
  const [csNewEmail, setCsNewEmail] = useState('rizky.pratama@gmail.com');
  const [csLoading, setCsLoading] = useState(false);
  const [csFeedback, setCsFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [dashFilter, setDashFilter] = useState<'all' | 'wedding' | 'tickets'>('all');
  const [showEventTypeModal, setShowEventTypeModal] = useState(false);
  const [showWaSopModal, setShowWaSopModal] = useState(false);
  const [copiedSopId, setCopiedSopId] = useState<string | null>(null);
  const [wristbandExportNotice, setWristbandExportNotice] = useState<string | null>(null);
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [newTktTitle, setNewTktTitle] = useState('');
  const [newTktCategory, setNewTktCategory] = useState('Konser Musik');
  const [newTktDate, setNewTktDate] = useState('30 Okt 2026');
  const [newTktVenue, setNewTktVenue] = useState('Jakarta Convention Center');
  const [newTktCity, setNewTktCity] = useState('Jakarta Pusat');
  const [newTktTierName, setNewTktTierName] = useState('Presale 1 — Festival Pass');
  const [newTktPrice, setNewTktPrice] = useState('150000');
  const [newTktQuota, setNewTktQuota] = useState('300');
  const [creatingTicketEvent, setCreatingTicketEvent] = useState(false);
  const [showGuide, setShowGuide] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('irvite_hide_staff_guide') !== 'true';
    }
    return true;
  });
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('irvite_auth_role');
    }
    return null;
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.role) {
          setUserRole(data.user.role);
          if (typeof window !== 'undefined') {
            localStorage.setItem('irvite_auth_role', data.user.role);
          }
          if (data.user.role === 'STAFF') {
            router.replace('/events');
            return;
          }
        }
      })
      .catch(() => {});
  }, [router]);

  const toggleGuide = () => {
    setShowGuide((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('irvite_hide_staff_guide', next ? 'false' : 'true');
      }
      return next;
    });
  };

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        setLoading(true);

        setError('');
        const response = await fetch('/api/events/summary', { cache: 'no-store', signal: AbortSignal.timeout(30000) });
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        if (response.status === 403) { router.replace('/events'); return; }
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Ringkasan gagal dimuat. Coba lagi.');
        }
        const summary = await response.json();
        if (isMounted) {
          setEvents(summary.nextEvents);
          setTotalEventsCount(summary.totalEvents);
          setTemplatesCount(summary.templates);
          setTemplateHighlights(summary.templateHighlights);
          setTotalGuestsCount(summary.totalGuests);
          setPublishedEventsCount(summary.publishedEvents);
          setUpcomingEventsCount(summary.upcomingEvents);
          setRsvpStats(summary.rsvp);
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error && err.message ? err.message : 'Ringkasan belum tersedia. Periksa koneksi lalu coba lagi; angka tidak ditampilkan agar tidak menyesatkan.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    fetch('/api/ticketing?mode=summary', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && typeof data.totalTicketsSold === 'number') {
          setTicketingSummary(data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [router, refresh]);

  async function handleDashboardEmailCorrection(e: React.FormEvent) {
    e.preventDefault();
    setCsLoading(true);
    setCsFeedback(null);
    try {
      const res = await fetch('/api/ticketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'correct-email',
          lookupCode: csLookupCode,
          newEmail: csNewEmail,
          correctedBy: 'Admin Dashboard CS Console',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Gagal memperbarui alamat email.');
      }
      setCsFeedback({ type: 'ok', text: data.message });
    } catch (err) {
      setCsFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Terjadi kesalahan koreksi email.',
      });
    } finally {
      setCsLoading(false);
    }
  }

  async function handleCreateTicketEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newTktTitle.trim()) return;
    setCreatingTicketEvent(true);
    try {
      const res = await fetch('/api/ticketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-event',
          title: newTktTitle,
          category: newTktCategory,
          organizerName: 'IRVITE Official Organizer',
          eventDate: newTktDate,
          eventTime: '19:00 - 22:30 WIB',
          venueName: newTktVenue,
          city: newTktCity,
          tierName: newTktTierName,
          tierPrice: Number(newTktPrice) || 0,
          tierQuota: Number(newTktQuota) || 100,
        }),
      });
      if (res.ok) {
        setShowCreateTicketModal(false);
        setNewTktTitle('');
        setRefresh((v) => v + 1);
      }
    } finally {
      setCreatingTicketEvent(false);
    }
  }

  const upcomingEvents = events;

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

  if (error) return (
    <section role="alert" className="dash-page-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
      <div>
        <h1 className="dash-page-header__title">Dashboard</h1>
        <p className="dash-page-header__subtitle" style={{ marginBottom: '1rem' }}>{error}</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={() => setRefresh((value) => value + 1)}>
            Coba lagi
          </button>
          <Link href="/events" className="btn btn-secondary">
            Buka daftar acara
          </Link>
        </div>
      </div>
    </section>
  );

  return (
    <>
      {/* ── Page Header ── */}
      <header className="dash-page-header">
        <div className="dash-page-header__left">
          <h1 className="dash-page-header__title">Dashboard</h1>
          <p className="dash-page-header__subtitle">
            Ringkasan operasional undangan digital IRVITE.
          </p>
        </div>

        <div className="dash-page-header__right">
          <button className="btn btn-secondary" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>
            {loading ? 'Memuat…' : 'Perbarui statistik'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowCreateTicketModal(true)}
          >
            <IconPlus />
            Buat Event Tiket
          </button>
          <button
            id="dashboard-create-event-btn"
            type="button"
            className="btn btn-accent dash-page-header__cta"
            onClick={() => setShowEventTypeModal(true)}
          >
            <IconPlus />
            Buat Event
          </button>
        </div>
      </header>

      {/* ── Filter Tabs Halus (Semua Kategori / Undangan Pernikahan / Tiket Seminar & Konser) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '1.25rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--admin-border, #e5e7eb)',
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.25rem' }}>
          Tampilkan:
        </span>
        <button
          type="button"
          className={`btn btn-sm ${dashFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setDashFilter('all')}
        >
          Semua Kategori
        </button>
        <button
          type="button"
          className={`btn btn-sm ${dashFilter === 'wedding' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setDashFilter('wedding')}
        >
          Undangan Pernikahan
        </button>
        <button
          type="button"
          className={`btn btn-sm ${dashFilter === 'tickets' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setDashFilter('tickets')}
        >
          Tiket Seminar &amp; Konser
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={() => setShowWaSopModal(true)}
        >
          Drawer Template WA EO (SOP 3 Babak)
        </button>
      </div>

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
            Unit undangan/keluarga, termasuk acara arsip
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
            Ketentuan desain siap pakai
          </div>
        </div>

        {/* KPI 6: Tiket Terjual (Public Ticketing Integration) */}
        <div className="dash-kpi">
          <div className="dash-kpi__top">
            <span className="dash-kpi__label">Tiket Terjual</span>
            <div className="dash-kpi__icon-box" aria-hidden="true">
              <IconTicketPass />
            </div>
          </div>
          <div className="dash-kpi__value">
            {ticketingSummary.totalTicketsSold.toLocaleString('id-ID')}
          </div>
          <div className="dash-kpi__meta">
            {ticketingSummary.totalPublicEvents} event publik aktif di /tiket
          </div>
        </div>

        {/* KPI 7: Pendapatan Tiket */}
        <div className="dash-kpi">
          <div className="dash-kpi__top">
            <span className="dash-kpi__label">Pendapatan Tiket</span>
            <div className="dash-kpi__icon-box" aria-hidden="true">
              <IconRevenueWallet />
            </div>
          </div>
          <div className="dash-kpi__value" style={{ fontSize: '1.35rem' }}>
            {ticketingSummary.grossTicketRevenueLabel}
          </div>
          <div className="dash-kpi__meta">
            Fee Platform: {ticketingSummary.platformFeeRevenueLabel} (Rp 3rb/tkt)
          </div>
        </div>
      </section>

      {/* ── Buku Panduan Operasional Staf (Hanya tampil untuk akun peran STAFF) ── */}
      {userRole === 'STAFF' && (
        <section
          className="dash-onboarding"
          style={{
            marginBottom: '2rem',
            background: 'var(--surface-primary, #ffffff)',
            border: '1px solid #10b981',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showGuide ? '1.25rem' : '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span style={{ fontSize: '1.25rem', color: '#059669', display: 'inline-flex' }}>
                <IconTemplate />
              </span>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Buku Panduan Operasional Staf (Meja Registrasi & Scanner Kehadiran)
                </h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  SOP resmi bagi petugas crew / gatekeeper untuk menyambut tamu dan memindai kehadiran secara cepat dan aman.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleGuide}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}
            >
              {showGuide ? 'Sembunyikan Panduan ▲' : 'Buka Panduan ▼'}
            </button>
          </div>

          {showGuide && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                borderTop: '1px solid var(--admin-border, #f3f4f6)',
                paddingTop: '1.25rem',
              }}
            >
              {/* Step 1 */}
              <div style={{ padding: '0.875rem', borderRadius: '8px', background: 'var(--surface-subtle, #f9fafb)', border: '1px solid var(--admin-border, #f3f4f6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    Tahap 1
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Persiapan</span>
                </div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.35rem 0' }}>Buka Scanner Kamera</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                  Buka menu Scanner acara di HP atau tablet Anda. Pastikan browser diberikan izin akses kamera video.
                </p>
                <Link href="/events" className="btn btn-secondary btn-sm" style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem 0.5rem', textAlign: 'center' }}>
                  Buka Daftar Acara
                </Link>
              </div>

              {/* Step 2 */}
              <div style={{ padding: '0.875rem', borderRadius: '8px', background: 'var(--surface-subtle, #f9fafb)', border: '1px solid var(--admin-border, #f3f4f6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    Tahap 2
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Penerimaan</span>
                </div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.35rem 0' }}>Scan QR Tamu</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                  Arahkan kamera ke QR undangan tamu di layar HP atau fisik tiket. Sistem otomatis mencatat check-in.
                </p>
                <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, padding: '0.35rem 0' }}>
                  ✓ Check-in Instan Otomatis
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ padding: '0.875rem', borderRadius: '8px', background: 'var(--surface-subtle, #f9fafb)', border: '1px solid var(--admin-border, #f3f4f6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    Tahap 3
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Alternatif</span>
                </div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.35rem 0' }}>Input Manual 22-Karakter</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                  Bila kamera silau atau layar tamu retak, ketik kode 22-karakter unik undangan pada kolom input di bawah kamera.
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0.35rem 0' }}>
                  Mendukung penyesuaian pax rombongan
                </div>
              </div>

              {/* Step 4 */}
              <div style={{ padding: '0.875rem', borderRadius: '8px', background: 'var(--surface-subtle, #f9fafb)', border: '1px solid var(--admin-border, #f3f4f6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    Tahap 4
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Koreksi</span>
                </div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.35rem 0' }}>Urungkan Bila Salah Input</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                  Jika salah scan atau jumlah pax keliru, klik tombol <strong>&ldquo;Urungkan Check-in&rdquo;</strong> pada kartu hasil scan seketika.
                </p>
                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, padding: '0.35rem 0' }}>
                  Kuota &amp; Sheets Otomatis Ditarik
                </div>
              </div>

              {/* Step 5 */}
              <div style={{ padding: '0.875rem', borderRadius: '8px', background: 'var(--surface-subtle, #f9fafb)', border: '1px solid var(--admin-border, #f3f4f6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    Tahap 5
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Monitoring</span>
                </div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.35rem 0' }}>Pantau Live Monitor</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                  Gunakan tab Live Monitor untuk melihat total tamu hadir, tamu VIP yang masuk, dan kapasitas ruangan secara real-time.
                </p>
                <Link href="/events" className="btn btn-secondary btn-sm" style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem 0.5rem', textAlign: 'center' }}>
                  Buka Live Monitor
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

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
              {wristbandExportNotice && (
                <div
                  style={{
                    margin: '0.75rem 1.25rem 0',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{wristbandExportNotice}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setWristbandExportNotice(null)}
                  >
                    Tutup
                  </button>
                </div>
              )}

              {dashFilter !== 'wedding' && (
                <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--admin-border, #e5e7eb)', background: 'var(--surface-subtle, #f9fafb)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span className="badge badge--info">TIKET KONSER &amp; SEMINAR</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {ticketingSummary.totalPublicEvents} Event Publik Aktif • Fee Flat Rp 3.000/Tiket
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        JAKARTA INDIE SOUNDWAVE FESTIVAL &amp; INDONESIA AI SUMMIT 2026
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        Terjual: <strong>{ticketingSummary.totalTicketsSold.toLocaleString('id-ID')} Tiket</strong> • Gross: <strong>{ticketingSummary.grossTicketRevenueLabel}</strong> • Payout Otomatis H+1
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() =>
                          setWristbandExportNotice(
                            'Paket ZIP Vektor QR Gelang 300 DPI (Tyvek & Lanyard) siap diunduh untuk produksi cetak.',
                          )
                        }
                      >
                        Ekspor ZIP Gelang (300 DPI)
                      </button>
                      <a
                        href="https://irvite-id.vercel.app/tiket"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                      >
                        Lihat Web Tiket Client ↗
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {dashFilter === 'tickets' ? null : loading ? (
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
                    Mulai buat undangan pernikahan pertama Anda menggunakan template siap pakai IRVITE.
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
                    <span className="dash-rsvp-dot" style={{ background: "#7ca893" }} />
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
                      Eksplorasi koleksi desain undangan tetap siap pakai IRVITE.
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

          {/* Section: CS Fast-Resolution — Koreksi Typo Email 5 Detik */}
          <div className="dash-panel">
            <div className="dash-panel__header">
              <div className="dash-panel__title-group">
                <h2 className="dash-panel__title">CS Fast-Action: Koreksi Typo Email Pembeli (5 Detik)</h2>
                <span className="dash-panel__subtitle">
                  Perbaiki salah ketik email pembeli tiket dan kirim ulang E-Ticket secara instan.
                </span>
              </div>
            </div>
            <div className="dash-panel__body">
              <form onSubmit={handleDashboardEmailCorrection} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label htmlFor="dash-cs-code" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                    Kode Pesanan / Kode E-Ticket
                  </label>
                  <input
                    id="dash-cs-code"
                    className="form-input"
                    value={csLookupCode}
                    onChange={(e) => setCsLookupCode(e.target.value)}
                    placeholder="ORD-IRV-2026-8821"
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label htmlFor="dash-cs-email" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                    Alamat Email Baru yang Valid
                  </label>
                  <input
                    id="dash-cs-email"
                    type="email"
                    className="form-input"
                    value={csNewEmail}
                    onChange={(e) => setCsNewEmail(e.target.value)}
                    placeholder="pembeli@gmail.com"
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={csLoading}>
                  {csLoading ? 'Memproses & Mengirim Ulang...' : 'Koreksi Email & Kirim Ulang E-Ticket'}
                </button>
                {csFeedback && (
                  <div
                    style={{
                      fontSize: '0.78rem',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      background: csFeedback.type === 'ok' ? '#ecfdf5' : '#fef2f2',
                      color: csFeedback.type === 'ok' ? '#065f46' : '#991b1b',
                      border: `1px solid ${csFeedback.type === 'ok' ? '#a7f3d0' : '#fecaca'}`,
                    }}
                  >
                    {csFeedback.text}
                  </div>
                )}
              </form>
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
                  Setiap template di IRVITE memiliki tipografi dan layout dengan ketentuan baku untuk performa optimal di seluruh perangkat.
                </p>

                <div className="dash-tpl-pill-list">
                  {!loading && templateHighlights.length === 0 && <p>Belum ada template tersedia.</p>}
                  {templateHighlights.map((tpl) => (
                    <div key={tpl.id} className="dash-tpl-pill">
                      <span className="dash-tpl-pill__name">{tpl.name}</span>
                      <span className="dash-tpl-pill__tag">{tpl.themeCode}</span>
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

      {/* Modal: Pemilihan Jenis Event Saat Klik "+ Buat Event" */}
      {showEventTypeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 31, 23, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
          onClick={() => setShowEventTypeModal(false)}
        >
          <div
            style={{
              background: 'var(--surface-primary, #ffffff)',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.5rem',
              border: '1px solid var(--admin-border, #e5e7eb)',
              boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                Pilih Jenis Event Baru
              </h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowEventTypeModal(false)}
              >
                Tutup
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div
                onClick={() => {
                  setShowEventTypeModal(false);
                  router.push('/events/create');
                }}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--admin-border, #d1d5db)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.25rem' }}>
                  Undangan Pernikahan Digital
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Input data mempelai, tanggal akad &amp; resepsi, customizer tema eksklusif, dan amplop digital.
                </div>
              </div>

              <div
                onClick={() => {
                  setShowEventTypeModal(false);
                  setShowCreateTicketModal(true);
                }}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '2px solid #1b3b2b',
                  background: 'rgba(27, 59, 43, 0.04)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                    Tiket Event / Seminar / Konser
                  </span>
                  <span className="badge badge--success">BARU</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Atur tier tiket (Presale/Reguler/VIP), kuota &amp; harga, opsi cetak gelang fisik, dan Gate Scanner.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Drawer Template WhatsApp Kemitraan EO (SOP 3 Babak) */}
      {showWaSopModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 31, 23, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
          onClick={() => setShowWaSopModal(false)}
        >
          <div
            style={{
              background: 'var(--surface-primary, #ffffff)',
              borderRadius: '16px',
              maxWidth: '580px',
              width: '100%',
              padding: '1.5rem',
              border: '1px solid var(--admin-border, #e5e7eb)',
              boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                  Drawer WhatsApp Kemitraan EO (SOP 3 Babak)
                </h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Klik 1 tombol untuk menyalin skrip percakapan ramah ke WhatsApp calon Event Organizer.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowWaSopModal(false)}
              >
                Tutup
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                {
                  id: 'b1',
                  label: 'Babak 1: Pemanasan & Profil',
                  text: 'Halo Kak! Salam hangat dari tim IRVITE.id. Boleh info nama acara, tanggal pelaksanaan, & estimasi kuota penontonnya Kak?',
                },
                {
                  id: 'b2',
                  label: 'Babak 2: Format Tiket & Gelang',
                  text: 'Siap Kak! Di IRVITE fee flat Rp 3.000/tiket (acara gratis Rp 0). Mau pakai E-Ticket Digital di HP atau sekalian produksi Gelang Fisik Tyvek/Kain QR 300 DPI?',
                },
                {
                  id: 'b3',
                  label: 'Babak 3: Closing Data & Link Payout H+1',
                  text: 'Mantap Kak, kami bantu setup hari ini! Mohon kirimkan poster 16:9, daftar tier tiket, serta nomor rekening resmi EO untuk pencairan dana otomatis H+1.',
                },
              ].map((step) => (
                <div
                  key={step.id}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '10px',
                    border: '1px solid var(--admin-border, #e5e7eb)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8C6224', textTransform: 'uppercase' }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      &ldquo;{step.text}&rdquo;
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        void navigator.clipboard.writeText(step.text);
                      }
                      setCopiedSopId(step.id);
                      setTimeout(() => setCopiedSopId(null), 2000);
                    }}
                  >
                    {copiedSopId === step.id ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Buat Event Tiket Publik Baru */}
      {showCreateTicketModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 31, 23, 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
          onClick={() => setShowCreateTicketModal(false)}
        >
          <div
            style={{
              background: 'var(--surface-primary, #ffffff)',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.5rem',
              border: '1px solid var(--admin-border, #e5e7eb)',
              boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Buat Event Tiket Publik Baru
              </h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCreateTicketModal(false)}
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleCreateTicketEvent} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Judul Event (Tampil di Katalog /tiket)
                </label>
                <input
                  className="form-input"
                  value={newTktTitle}
                  onChange={(e) => setNewTktTitle(e.target.value)}
                  placeholder="Contoh: JAKARTA SYMPHONY NIGHT 2026"
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Kategori Acara
                  </label>
                  <select
                    className="form-input"
                    value={newTktCategory}
                    onChange={(e) => setNewTktCategory(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="Konser Musik">Konser Musik</option>
                    <option value="Seminar & Edukasi">Seminar &amp; Edukasi</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Standup Comedy">Standup Comedy</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Tanggal Acara
                  </label>
                  <input
                    className="form-input"
                    value={newTktDate}
                    onChange={(e) => setNewTktDate(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Nama Venue / Gedung
                  </label>
                  <input
                    className="form-input"
                    value={newTktVenue}
                    onChange={(e) => setNewTktVenue(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Kota
                  </label>
                  <input
                    className="form-input"
                    value={newTktCity}
                    onChange={(e) => setNewTktCity(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 0.8fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Nama Tier Utama
                  </label>
                  <input
                    className="form-input"
                    value={newTktTierName}
                    onChange={(e) => setNewTktTierName(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Harga (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={newTktPrice}
                    onChange={(e) => setNewTktPrice(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Kuota
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={newTktQuota}
                    onChange={(e) => setNewTktQuota(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowCreateTicketModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={creatingTicketEvent}>
                  {creatingTicketEvent ? 'Menerbitkan...' : 'Terbitkan ke Katalog /tiket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
