'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import './monitor.css';

interface LiveEventSummary {
  id: string;
  title: string;
  slug: string;
  eventDate: string;
  status: string;
}

interface LiveStats {
  totalGuests: number;
  totalInvitedPax: number;
  checkedInGuests: number;
  checkedInPax: number;
  remainingPax: number;
  checkInRate: number;
  recentCheckInsCount: number;
  lastRefreshedAt: string;
}

interface RecentCheckIn {
  id: string;
  guestId: string;
  guestName: string;
  category: string;
  customGreeting?: string | null;
  scannedPax: number;
  maxPax: number;
  scannedAt: string;
  scannedBy: string;
}

interface CategoryStat {
  category: string;
  totalGuests: number;
  checkedInGuests: number;
  totalPax: number;
  checkedInPax: number;
  rate: number;
}

interface LiveGuestItem {
  id: string;
  name: string;
  category: string;
  customGreeting?: string | null;
  maxPax: number;
  isCheckedIn: boolean;
  scannedPax: number;
  remainingPax: number;
  scannedAt?: string | null;
  scannedBy?: string | null;
  rsvpStatus: string;
  rsvpPax?: number | null;
}

interface LiveAttendanceData {
  event: LiveEventSummary;
  summary: LiveStats;
  categories: CategoryStat[];
  recentCheckIns: RecentCheckIn[];
  guests: LiveGuestItem[];
  googleSheet: {
    connected: boolean;
    webhookUrl?: string | null;
    lastUpdatedAt?: string | null;
  };
}

// ── Icons ─────────────────────────────────────────────────────────────
function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
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

function IconRefresh({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }}
    >
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  );
}

function IconSheets() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function IconBell({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6"/>
      <line x1="13.5" y1="13.5" x2="18" y2="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconScan() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 6V4.5A1.5 1.5 0 0 1 3.5 3H5M15 3h1.5A1.5 1.5 0 0 1 18 4.5V6M2 14v1.5A1.5 1.5 0 0 0 3.5 17H5M15 17h1.5A1.5 1.5 0 0 0 18 15.5V14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="4" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// Subtle Web Audio Chime without external MP3 dependencies
function playCheckInChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // Ignore audio permission or context restrictions
  }
}

const DEFAULT_APPS_SCRIPT_TEMPLATE = `// ==============================================================
// IRVITE - SCRIPT PENERIMA DATA CHECK-IN REALTIME GOOGLE SHEETS
// ==============================================================
// CARA PEMASANGAN (HANYA 1 MENIT):
// 1. Buka Google Sheets Anda yang ingin dipakai memantau tamu.
// 2. Klik menu "Extensions" (Ekstensi) > "Apps Script".
// 3. Hapus kode yang ada, lalu COPY-PASTE SELURUH KODE DI BAWAH INI.
// 4. Klik tombol "Deploy" (Terapkan) di pojok kanan atas > "New deployment" (Penerapan baru).
// 5. Pilih jenis "Web app" (Aplikasi Web).
// 6. Pada kolom "Who has access" (Siapa yang memiliki akses), pilih "Anyone" (Siapa saja).
// 7. Klik "Deploy" dan SALIN URL Web App yang dihasilkan (awalan https://script.google.com/macros/s/...).
// 8. Tempelkan URL tersebut ke kolom Webhook URL di IRVITE Admin.
// ==============================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Header otomatis jika spreadsheet masih kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Waktu Check-in",
        "Nama Tamu",
        "Kategori",
        "Pax Masuk",
        "Total Hadir",
        "Kuota Pax",
        "Status",
        "Petugas Scan",
        "Keterangan"
      ]);
      sheet.getRange(1, 1, 1, 9)
        .setFontWeight("bold")
        .setBackground("#EFEBE9")
        .setFontColor("#3E2723");
      sheet.setFrozenRows(1);
    }
    
    var timeFormatted = Utilities.formatDate(
      new Date(data.scannedAt), 
      "GMT+7", 
      "yyyy-MM-dd HH:mm:ss"
    );
    
    var note = data.isTest ? "TEST PING" : "LIVE SCANNER";
    
    sheet.appendRow([
      timeFormatted,
      data.guestName,
      data.category || "REGULAR",
      data.scannedPax,
      data.totalScannedPax,
      data.maxPax,
      data.status,
      data.scannedBy,
      note
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export default function LiveAttendanceMonitorPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const router = useRouter();
  const { eventId } = use(params);

  const [data, setData] = useState<LiveAttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'checked-in' | 'pending' | 'vip'>('all');
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Google Sheets modal state
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [sheetWebhookUrl, setSheetWebhookUrl] = useState('');
  const [sheetSaving, setSheetSaving] = useState(false);
  const [sheetTesting, setSheetTesting] = useState(false);
  const [sheetResyncing, setSheetResyncing] = useState(false);
  const [sheetMessage, setSheetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sampleScript, setSampleScript] = useState(DEFAULT_APPS_SCRIPT_TEMPLATE);
  const [copiedScript, setCopiedScript] = useState(false);

  const lastKnownCheckInIdRef = useRef<string | null>(null);

  const loadLiveData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);

      const res = await fetch(`/api/events/${eventId}/attendance/live`, {
        cache: 'no-store',
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        throw new Error('Gagal memuat live data kehadiran.');
      }

      const result: LiveAttendanceData = await res.json();
      setData(result);
      setError('');

      // Check if a new check-in arrived
      const latestCheckIn = result.recentCheckIns?.[0];
      if (latestCheckIn) {
        if (
          lastKnownCheckInIdRef.current &&
          latestCheckIn.id !== lastKnownCheckInIdRef.current
        ) {
          if (soundEnabled) {
            playCheckInChime();
          }
        }
        lastKnownCheckInIdRef.current = latestCheckIn.id;
      }
    } catch (err: unknown) {
      if (isInitial) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data.');
      }
    } finally {
      if (isInitial) setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, router, soundEnabled]);

  // Initial load + Polling effect
  useEffect(() => {
    void loadLiveData(true);

    const interval = setInterval(() => {
      // Don't poll if browser tab is hidden
      if (document.visibilityState === 'visible') {
        void loadLiveData(false);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [loadLiveData]);

  // Load Google Sheet Config when modal is opened
  const openSheetModal = async () => {
    setShowSheetModal(true);
    setSheetMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/attendance/google-sheet`, { cache: 'no-store' });
      if (res.ok) {
        const conf = await res.json();
        setSheetWebhookUrl(conf.webhookUrl || '');
        setSampleScript(conf.sampleScriptTemplate || '');
      }
    } catch {
      // Ignore
    }
  };

  const handleSaveSheetConfig = async () => {
    const trimmed = sheetWebhookUrl.trim();
    if (trimmed.includes('docs.google.com/spreadsheets')) {
      setSheetMessage({
        type: 'error',
        text: 'Tautan docs.google.com/spreadsheets/... adalah tautan dokumen spreadsheet biasa, bukan URL Webhook Apps Script. Silakan ikuti 5 langkah panduan di bawah untuk membuat Web App (awalan https://script.google.com/macros/s/...).',
      });
      return;
    }

    setSheetSaving(true);
    setSheetMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/attendance/google-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: trimmed }),
      });
      const resData = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Akun Anda tidak memiliki izin untuk mengonfigurasi integrasi Google Sheets pada event ini.');
        }
        throw new Error(resData.message || 'Gagal menyimpan tautan.');
      }

      setSheetMessage({ type: 'success', text: resData.message || 'Konfigurasi Google Sheets berhasil disimpan!' });
      void loadLiveData(false);
    } catch (err: unknown) {
      setSheetMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal menyimpan.' });
    } finally {
      setSheetSaving(false);
    }
  };

  const handleTestSheetPing = async () => {
    setSheetTesting(true);
    setSheetMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/attendance/google-sheet/test`, {
        method: 'POST',
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || 'Uji coba koneksi gagal.');

      setSheetMessage({ type: 'success', text: resData.message || 'Sinyal uji coba berhasil dikirim ke Google Sheets!' });
    } catch (err: unknown) {
      setSheetMessage({ type: 'error', text: err instanceof Error ? err.message : 'Uji coba gagal.' });
    } finally {
      setSheetTesting(false);
    }
  };

  const handleResyncAllAttendance = async () => {
    setSheetResyncing(true);
    setSheetMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/attendance/google-sheet/resync`, {
        method: 'POST',
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || 'Sinkronisasi gagal.');

      setSheetMessage({ type: 'success', text: resData.message || 'Berhasil menyinkronkan seluruh data hadir ke Google Sheets!' });
    } catch (err: unknown) {
      setSheetMessage({ type: 'error', text: err instanceof Error ? err.message : 'Sinkronisasi gagal.' });
    } finally {
      setSheetResyncing(false);
    }
  };

  const handleCopyScript = () => {
    if (!sampleScript) return;
    navigator.clipboard.writeText(sampleScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // Filtered guest list
  const filteredGuests = (data?.guests || []).filter((g) => {
    const matchesSearch =
      searchQuery === '' ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.customGreeting && g.customGreeting.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFilter === 'checked-in') return g.isCheckedIn;
    if (activeFilter === 'pending') return !g.isCheckedIn;
    if (activeFilter === 'vip') return g.category.toUpperCase().includes('VIP');
    return true;
  });

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
      if (diffSec < 45) return 'Baru saja';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m lalu`;
      return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  if (loading && !data) {
    return (
      <div className="live-monitor-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <IconRefresh spinning />
        <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>Menghubungkan ke Live Stream Kehadiran...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="live-monitor-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--status-danger, #dc2626)' }}>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={() => void loadLiveData(true)}>
          Coba Lagi
        </button>
      </div>
    );
  }

  const summary = data?.summary;
  const isSheetConnected = Boolean(data?.googleSheet?.connected);

  return (
    <div className="live-monitor-container">
      {/* ── Page Header ── */}
      <header className="monitor-header">
        <div className="monitor-header__left">
          <button
            type="button"
            className="monitor-header__back-btn"
            onClick={() => router.push(`/events/${eventId}`)}
          >
            <IconArrowLeft /> Kembali ke Dashboard Acara
          </button>
          <div className="monitor-header__title-row">
            <h1 className="monitor-header__title">
              {data?.event.title || 'Live Monitor Kehadiran'}
            </h1>
            <div className="monitor-pulse-badge">
              <span className="monitor-pulse-dot" />
              LIVE MONITOR
            </div>
          </div>
        </div>

        <div className="monitor-header__actions">
          {/* Audio Chime Toggle */}
          <button
            type="button"
            className={`btn btn-sm ${soundEnabled ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Suara notifikasi aktif' : 'Aktifkan bunyi saat ada tamu masuk'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <IconBell active={soundEnabled} />
            {soundEnabled ? 'Suara: ON' : 'Suara: OFF'}
          </button>

          {/* Google Sheets Modal Button */}
          <button
            type="button"
            className={`btn btn-sm ${isSheetConnected ? 'btn-secondary' : 'btn-primary'}`}
            onClick={openSheetModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <IconSheets />
            {isSheetConnected ? '✓ Google Sheets Aktif' : '+ Sambungkan Google Sheets'}
          </button>

          {/* Scanner Button */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => router.push(`/events/${eventId}/scanner`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <IconScan />
            Buka Scanner
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => void loadLiveData(false)}
            disabled={refreshing}
            title="Segarkan data seketika"
          >
            <IconRefresh spinning={refreshing} />
          </button>
        </div>
      </header>

      {/* ── Primary KPI Cards ── */}
      <section className="monitor-kpis">
        {/* KPI 1: Pax Hadir */}
        <div className="monitor-kpi-card">
          <div className="monitor-kpi-card__top">
            <span className="monitor-kpi-card__label">Total Pax Hadir</span>
            <div className="monitor-kpi-card__icon monitor-kpi-card__icon--emerald">
              <IconCheck />
            </div>
          </div>
          <div className="monitor-kpi-card__value">
            {summary?.checkedInPax || 0}
            <span style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              / {summary?.totalInvitedPax || 0}
            </span>
          </div>
          <div className="monitor-kpi-card__sub">
            {summary?.checkInRate || 0}% dari seluruh kuota pax
          </div>
          <div className="monitor-progress-bar-bg">
            <div
              className="monitor-progress-bar-fill"
              style={{ width: `${Math.min(100, summary?.checkInRate || 0)}%` }}
            />
          </div>
        </div>

        {/* KPI 2: Unit Tamu Hadir */}
        <div className="monitor-kpi-card">
          <div className="monitor-kpi-card__top">
            <span className="monitor-kpi-card__label">Unit Tamu Tiba</span>
            <div className="monitor-kpi-card__icon monitor-kpi-card__icon--gold">
              👤
            </div>
          </div>
          <div className="monitor-kpi-card__value">
            {summary?.checkedInGuests || 0}
            <span style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              / {summary?.totalGuests || 0}
            </span>
          </div>
          <div className="monitor-kpi-card__sub">
            Rombongan keluarga / perorangan yang telah hadir
          </div>
        </div>

        {/* KPI 3: Sisa Pax Belum Hadir */}
        <div className="monitor-kpi-card">
          <div className="monitor-kpi-card__top">
            <span className="monitor-kpi-card__label">Sisa Kuota Ditunggu</span>
            <div className="monitor-kpi-card__icon monitor-kpi-card__icon--amber">
              ⏳
            </div>
          </div>
          <div className="monitor-kpi-card__value" style={{ color: '#d97706' }}>
            {summary?.remainingPax || 0}
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Pax</span>
          </div>
          <div className="monitor-kpi-card__sub">
            Sisa porsi / kursi yang belum memasuki venue
          </div>
        </div>

        {/* KPI 4: Google Sheets Status */}
        <div className="monitor-kpi-card">
          <div className="monitor-kpi-card__top">
            <span className="monitor-kpi-card__label">Integrasi Spreadsheet</span>
            <div className="monitor-kpi-card__icon monitor-kpi-card__icon--indigo">
              <IconSheets />
            </div>
          </div>
          <div className="monitor-kpi-card__value" style={{ fontSize: '1.375rem' }}>
            {isSheetConnected ? 'Tersinkron Live' : 'Belum Terhubung'}
          </div>
          <div className="monitor-kpi-card__sub">
            {isSheetConnected
              ? 'Tiap scan otomatis tercatat di Google Sheets WO'
              : 'Klik tombol di atas untuk integrasi 1 menit'}
          </div>
        </div>
      </section>

      {/* ── Category Breakdown Pills ── */}
      {data?.categories && data.categories.length > 0 && (
        <section className="monitor-category-pills">
          {data.categories.map((c) => (
            <div key={c.category} className="monitor-category-pill">
              <strong style={{ color: 'var(--text-primary)' }}>{c.category}</strong>
              <span style={{ color: 'var(--text-secondary)' }}>
                {c.checkedInPax}/{c.totalPax} Pax ({c.rate}%)
              </span>
            </div>
          ))}
        </section>
      )}

      {/* ── Layout Grid: Live Feed + Full Searchable Table ── */}
      <div className="monitor-layout-grid">
        {/* Left: Realtime Waterfall Feed */}
        <aside className="monitor-feed-panel">
          <div className="monitor-panel-header">
            <h2 className="monitor-panel-title">
              <span style={{ color: '#10B981' }}>⚡</span> Feed Kedatangan Terkini
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {data?.recentCheckIns?.length || 0} scan terakhir
            </span>
          </div>

          <div className="monitor-feed-list">
            {!data?.recentCheckIns || data.recentCheckIns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <p>Belum ada tamu yang check-in.</p>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Hasil scan staff akan langsung muncul di sini secara realtime.</span>
              </div>
            ) : (
              data.recentCheckIns.map((item) => (
                <div
                  key={item.id}
                  className={`monitor-feed-item ${item.category.toUpperCase().includes('VIP') ? 'monitor-feed-item--vip' : ''}`}
                >
                  <div className="monitor-feed-item__header">
                    <span className="monitor-feed-item__name">{item.guestName}</span>
                    <span className="monitor-feed-item__time">{formatTimeAgo(item.scannedAt)}</span>
                  </div>
                  {item.customGreeting && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      &ldquo;{item.customGreeting}&rdquo;
                    </div>
                  )}
                  <div className="monitor-feed-item__meta">
                    <span className="badge-checked-in">
                      +{item.scannedPax} Pax
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Kategori: <strong>{item.category}</strong>
                    </span>
                    <span className="monitor-feed-item__author">
                      Oleh: {item.scannedBy.split('@')[0]}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Right: Master Guest List with Instant Filter & Search */}
        <main className="monitor-table-panel">
          <div className="monitor-table-filters">
            {/* Search Input */}
            <div className="monitor-search-box">
              <span className="monitor-search-icon"><IconSearch /></span>
              <input
                type="text"
                className="monitor-search-input"
                placeholder="Cari nama tamu / salam..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Tabs */}
            <div className="monitor-filter-tabs">
              <button
                type="button"
                className={`monitor-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                Semua ({data?.guests.length || 0})
              </button>
              <button
                type="button"
                className={`monitor-filter-btn ${activeFilter === 'checked-in' ? 'active' : ''}`}
                onClick={() => setActiveFilter('checked-in')}
              >
                Sudah Hadir ({summary?.checkedInGuests || 0})
              </button>
              <button
                type="button"
                className={`monitor-filter-btn ${activeFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveFilter('pending')}
              >
                Belum Hadir ({Math.max(0, (data?.guests.length || 0) - (summary?.checkedInGuests || 0))})
              </button>
              <button
                type="button"
                className={`monitor-filter-btn ${activeFilter === 'vip' ? 'active' : ''}`}
                onClick={() => setActiveFilter('vip')}
              >
                VIP Saja
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="monitor-table-wrap">
            <table className="monitor-table">
              <thead>
                <tr>
                  <th>Tamu Undangan</th>
                  <th>Kategori</th>
                  <th>Kuota / Kehadiran</th>
                  <th>Status & Waktu</th>
                  <th>RSVP</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                      Tidak ditemukan tamu yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredGuests.map((g) => (
                    <tr key={g.id}>
                      {/* Name & Custom Greeting */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</div>
                        {g.customGreeting && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            &ldquo;{g.customGreeting}&rdquo;
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            background: g.category.toUpperCase().includes('VIP')
                              ? 'rgba(196,160,106,0.18)'
                              : 'rgba(0,0,0,0.05)',
                            color: g.category.toUpperCase().includes('VIP')
                              ? '#B28B55'
                              : 'var(--text-primary)',
                          }}
                        >
                          {g.category}
                        </span>
                      </td>

                      {/* Pax Breakdown */}
                      <td>
                        <span style={{ fontWeight: 600 }}>{g.scannedPax}</span>
                        <span style={{ color: 'var(--text-secondary)' }}> / {g.maxPax} Pax</span>
                      </td>

                      {/* Attendance Status */}
                      <td>
                        {g.isCheckedIn ? (
                          <div>
                            <span className="badge-checked-in">✓ Hadir</span>
                            {g.scannedAt && (
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                Pukul {new Date(g.scannedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="badge-pending">Belum Hadir</span>
                        )}
                      </td>

                      {/* RSVP */}
                      <td>
                        {g.rsvpStatus === 'RSVP_YES' ? (
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                            Konfirmasi Hadir ({g.rsvpPax || 1} Pax)
                          </span>
                        ) : g.rsvpStatus === 'RSVP_NO' ? (
                          <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>Tidak Hadir</span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Belum RSVP</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* ── Modal Integrasi Google Sheets ── */}
      {showSheetModal && (
        <div className="monitor-modal-overlay" onClick={() => setShowSheetModal(false)}>
          <div className="monitor-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#059669', fontSize: '1.25rem' }}><IconSheets /></span>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
                  Integrasi Google Sheets Realtime
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowSheetModal(false)}
                style={{ fontSize: '1.25rem', padding: '0 0.5rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Setiap kali staff memindai QR code tamu di lokasi acara, data akan <strong>otomatis langsung mengalir dan tertulis sebagai baris baru</strong> di spreadsheet Google Sheets milik Wedding Organizer (WO) secara realtime!
            </p>

            {sheetMessage && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  background: sheetMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  color: sheetMessage.type === 'success' ? '#059669' : '#dc2626',
                  border: `1px solid ${sheetMessage.type === 'success' ? 'rgba(5, 150, 105, 0.2)' : 'rgba(220, 38, 38, 0.2)'}`,
                }}
              >
                {sheetMessage.text}
              </div>
            )}

            {/* Input Webhook URL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                Google Apps Script Web App URL:
              </label>
              <input
                type="url"
                className="form-input"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={sheetWebhookUrl}
                onChange={(e) => setSheetWebhookUrl(e.target.value)}
                style={{
                  padding: '0.625rem 0.875rem',
                  borderRadius: '8px',
                  border: '1px solid var(--admin-border, #d1d5db)',
                  fontSize: '0.875rem',
                }}
              />
              {sheetWebhookUrl.includes('docs.google.com/spreadsheets') && (
                <div
                  style={{
                    padding: '0.625rem 0.875rem',
                    borderRadius: '6px',
                    background: '#fffbeb',
                    color: '#b45309',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontSize: '0.75rem',
                    lineHeight: 1.5,
                  }}
                >
                  <strong>⚠️ Perhatian:</strong> Tautan di atas adalah link dokumen spreadsheet biasa, bukan URL Webhook Apps Script. Server kami tidak dapat mengirim data ke link dokumen biasa. Silakan ikuti panduan 5 langkah di bawah untuk membuat Web App (awalan <code>https://script.google.com/macros/s/...</code>).
                </div>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Kosongkan lalu simpan jika ingin menonaktifkan sinkronisasi ke Google Sheets.
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveSheetConfig}
                disabled={sheetSaving}
              >
                {sheetSaving ? 'Menyimpan...' : 'Simpan Tautan Webhook'}
              </button>

              {sheetWebhookUrl.trim().length > 0 && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleTestSheetPing}
                    disabled={sheetTesting || sheetSaving || sheetResyncing}
                  >
                    {sheetTesting ? 'Menguji...' : '⚡ Uji Coba Kirim Data (Test Ping)'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleResyncAllAttendance}
                    disabled={sheetTesting || sheetSaving || sheetResyncing}
                    title="Kirim ulang seluruh data tamu yang sudah hadir ke Google Sheets"
                  >
                    {sheetResyncing ? 'Menyinkronkan...' : '🔄 Sinkronkan Seluruh Tamu Hadir'}
                  </button>
                </>
              )}
            </div>

            {/* 1-Minute Setup Guide */}
            <div style={{ borderTop: '1px solid var(--admin-border, #e5e7eb)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>
                  📋 Kode Script Google Sheets (Tinggal Copy-Paste):
                </h4>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopyScript}
                  style={{ fontSize: '0.75rem' }}
                >
                  {copiedScript ? '✓ Berhasil Disalin!' : 'Salin Kode Script'}
                </button>
              </div>

              <div className="monitor-code-box">
                <pre style={{ margin: 0 }}>{sampleScript}</pre>
              </div>

              <ol style={{ margin: '0.25rem 0 0 1.25rem', padding: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <li>Buka Google Spreadsheet baru di akun Google WO.</li>
                <li>Pilih menu <strong>Extensions (Ekstensi) &rarr; Apps Script</strong>.</li>
                <li>Tempelkan kode di atas, lalu klik tombol <strong>Deploy (Terapkan) &rarr; New deployment (Penerapan baru)</strong>.</li>
                <li>Pilih jenis <strong>Web app (Aplikasi Web)</strong>, atur akses ke <strong>Anyone (Siapa saja)</strong>, lalu Deploy.</li>
                <li>Salin Web App URL yang diberikan dan tempelkan ke kolom input di atas!</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
