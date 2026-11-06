'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { PortalGuest, PortalEvent } from './client-portal-view';
import {
  buildAutoSenderWhatsAppUrl,
  normalizeWhatsAppPhone,
} from '@/utils/whatsapp-share';

export type DelayPacing = 'relaxed' | 'standard' | 'fast';

interface WhatsAppAutoSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: PortalEvent;
  guests: PortalGuest[];
  accessKey: string;
  onGuestStatusUpdated: (guestId: string, isSent: boolean) => void;
  getInvitationUrl: (uniqueCode: string) => string;
}

interface ServerWaSession {
  status: 'disconnected' | 'connecting' | 'needs_qr' | 'connected';
  phoneNumber: string | null;
  pushName: string | null;
  qrCodeDataUrl: string | null;
  connectedAt: string | null;
}

interface ServerQueueStatus {
  status: 'idle' | 'running' | 'paused' | 'break' | 'completed' | 'stopped';
  total: number;
  sentCount: number;
  failedCount: number;
  currentIndex: number;
  countdownSeconds: number;
  breakCountdownSeconds: number;
  startedAt: string | null;
}

export function WhatsAppAutoSenderModal({
  isOpen,
  onClose,
  event,
  guests,
  accessKey,
  onGuestStatusUpdated,
  getInvitationUrl,
}: WhatsAppAutoSenderModalProps) {
  // Mode: 'qr_gateway' (100% full auto server-side) vs 'web_tab' (manual desktop tab)
  const [activeMode, setActiveMode] = useState<'qr_gateway' | 'web_tab'>('qr_gateway');

  // Filter & Queue Settings
  const [filterMode, setFilterMode] = useState<'unsent' | 'all'>('unsent');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [pacing, setPacing] = useState<DelayPacing>('relaxed');
  const [useSpintax, setUseSpintax] = useState(true);
  const [enableBatchBreak, setEnableBatchBreak] = useState(true);

  // Server QR Gateway States
  const [session, setSession] = useState<ServerWaSession>({
    status: 'disconnected',
    phoneNumber: null,
    pushName: null,
    qrCodeDataUrl: null,
    connectedAt: null,
  });
  const [serverQueue, setServerQueue] = useState<ServerQueueStatus>({
    status: 'idle',
    total: 0,
    sentCount: 0,
    failedCount: 0,
    currentIndex: 0,
    countdownSeconds: 0,
    breakCountdownSeconds: 0,
    startedAt: null,
  });
  const [isConnectingWa, setIsConnectingWa] = useState(false);
  const [isDisconnectingWa, setIsDisconnectingWa] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Browser-Tab Fallback Execution States
  const [tabStatus, setTabStatus] = useState<
    'idle' | 'running' | 'paused' | 'break' | 'completed' | 'stopped'
  >('idle');
  const [tabIndex, setTabIndex] = useState(0);
  const [tabCountdown, setTabCountdown] = useState(0);
  const [tabBreakCountdown, setTabBreakCountdown] = useState(0);
  const [tabSentCount, setTabSentCount] = useState(0);
  const [popupBlocked, setPopupBlocked] = useState(false);

  const senderWindowRef = useRef<Window | null>(null);
  const tabTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Categories in guest list
  const categories = useMemo(() => {
    const set = new Set<string>();
    guests.forEach((g) => {
      if (g.category) set.add(g.category);
    });
    return Array.from(set);
  }, [guests]);

  // Target guests matching filters
  const targetGuests = useMemo(() => {
    return guests.filter((g) => {
      const phone = normalizeWhatsAppPhone(g.phoneNumber);
      if (!phone) return false;
      if (selectedCategory !== 'ALL' && g.category !== selectedCategory) {
        return false;
      }
      if (filterMode === 'unsent') {
        return !g.isWaSent;
      }
      return true;
    });
  }, [guests, filterMode, selectedCategory]);

  // Fetch server WA session status
  const fetchSessionStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api-proxy/api/v1/client-portal/${event.id}/wa/session?key=${accessKey}`,
      );
      if (res.ok) {
        const data = (await res.json()) as ServerWaSession;
        setSession(data);
      }
    } catch {
      // ignore
    }
  }, [accessKey, event.id]);

  // Fetch server WA queue status
  const fetchQueueStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api-proxy/api/v1/client-portal/${event.id}/wa/queue/status`,
      );
      if (res.ok) {
        const data = (await res.json()) as ServerQueueStatus;
        setServerQueue(data);

        // If server queue completed some sends, sync with target list
        if (data.status === 'running' || data.status === 'completed') {
          for (let i = 0; i < data.currentIndex && i < targetGuests.length; i++) {
            onGuestStatusUpdated(targetGuests[i].id, true);
          }
        }
      }
    } catch {
      // ignore
    }
  }, [event.id, onGuestStatusUpdated, targetGuests]);

  // Poll server session & queue when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      void fetchSessionStatus();
      void fetchQueueStatus();
    }, 0);

    const interval = setInterval(() => {
      void fetchSessionStatus();
      if (serverQueue.status === 'running' || serverQueue.status === 'break') {
        void fetchQueueStatus();
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchQueueStatus, fetchSessionStatus, isOpen, serverQueue.status]);

  // Connect WhatsApp (Request QR)
  const handleConnectWa = async () => {
    setIsConnectingWa(true);
    setServerError(null);
    try {
      const res = await fetch(
        `/api-proxy/api/v1/client-portal/${event.id}/wa/connect?key=${accessKey}`,
        { method: 'POST' },
      );
      if (res.ok) {
        const data = (await res.json()) as ServerWaSession;
        setSession(data);
      } else {
        const err = await res.json();
        setServerError(err.message || 'Gagal memuat QR Code WhatsApp.');
      }
    } catch {
      setServerError('Gagal terhubung ke server WhatsApp.');
    } finally {
      setIsConnectingWa(false);
    }
  };

  // Disconnect WhatsApp
  const handleDisconnectWa = async () => {
    if (!window.confirm('Yakin ingin memutuskan koneksi WhatsApp ini?')) return;
    setIsDisconnectingWa(true);
    try {
      await fetch(
        `/api-proxy/api/v1/client-portal/${event.id}/wa/disconnect?key=${accessKey}`,
        { method: 'POST' },
      );
      setSession({
        status: 'disconnected',
        phoneNumber: null,
        pushName: null,
        qrCodeDataUrl: null,
        connectedAt: null,
      });
      setServerQueue({
        status: 'idle',
        total: 0,
        sentCount: 0,
        failedCount: 0,
        currentIndex: 0,
        countdownSeconds: 0,
        breakCountdownSeconds: 0,
        startedAt: null,
      });
    } catch {
      // ignore
    } finally {
      setIsDisconnectingWa(false);
    }
  };

  // Start Server-Side Queue
  const handleStartServerQueue = async () => {
    if (targetGuests.length === 0) return;
    setServerError(null);

    try {
      const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(
        `/api-proxy/api/v1/client-portal/${event.id}/wa/queue/start?key=${accessKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetGuestIds: targetGuests.map((g) => g.id),
            pacing,
            useSpintax,
            enableBatchBreak,
            originUrl,
          }),
        },
      );

      if (res.ok) {
        const queueData = (await res.json()) as ServerQueueStatus;
        setServerQueue(queueData);
      } else {
        const err = await res.json();
        setServerError(err.message || 'Gagal memulai antrean server.');
      }
    } catch {
      setServerError('Gagal menghubungi server untuk memulai antrean.');
    }
  };

  // Control Server Queue (pause, resume, stop)
  const handleControlServerQueue = async (action: 'pause' | 'resume' | 'stop') => {
    try {
      const res = await fetch(
        `/api-proxy/api/v1/client-portal/${event.id}/wa/queue/control`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as ServerQueueStatus;
        setServerQueue(data);
      }
    } catch {
      // ignore
    }
  };

  // ── Browser Tab Fallback Implementation ──
  const getRandomTabDelay = useCallback((): number => {
    switch (pacing) {
      case 'relaxed':
        return Math.floor(Math.random() * 7) + 12;
      case 'standard':
        return Math.floor(Math.random() * 5) + 8;
      case 'fast':
        return Math.floor(Math.random() * 4) + 5;
      default:
        return 12;
    }
  }, [pacing]);

  const dispatchTabGuest = useCallback(
    (guest: PortalGuest, index: number) => {
      if (!guest.invitation?.uniqueCode) return;
      const invitationUrl = getInvitationUrl(guest.invitation.uniqueCode);
      const url = buildAutoSenderWhatsAppUrl(
        guest.name,
        event.title,
        invitationUrl,
        guest.phoneNumber,
        useSpintax ? index : 0,
        guest.customGreeting,
      );

      try {
        const win = window.open(url, 'irvite_wa_sender');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          setPopupBlocked(true);
        } else {
          setPopupBlocked(false);
          senderWindowRef.current = win;
        }
      } catch {
        setPopupBlocked(true);
      }
    },
    [event.title, getInvitationUrl, useSpintax],
  );

  const advanceTabToNext = useCallback(() => {
    if (tabTimerRef.current) {
      clearInterval(tabTimerRef.current);
      tabTimerRef.current = null;
    }

    const nextIdx = tabIndex + 1;
    if (nextIdx >= targetGuests.length) {
      setTabStatus('completed');
      setTabCountdown(0);
      return;
    }

    const newSent = tabSentCount + 1;
    if (enableBatchBreak && newSent > 0 && newSent % 30 === 0) {
      setTabStatus('break');
      setTabBreakCountdown(45);
      return;
    }

    setTabIndex(nextIdx);
    dispatchTabGuest(targetGuests[nextIdx], nextIdx);
    setTabCountdown(getRandomTabDelay());
  }, [dispatchTabGuest, enableBatchBreak, getRandomTabDelay, tabIndex, tabSentCount, targetGuests]);

  useEffect(() => {
    let completionTimer: NodeJS.Timeout | null = null;

    if (tabStatus === 'running') {
      if (tabCountdown > 0) {
        tabTimerRef.current = setTimeout(() => {
          setTabCountdown((prev) => prev - 1);
        }, 1000);
      } else if (tabCountdown === 0 && targetGuests[tabIndex]) {
        completionTimer = setTimeout(() => {
          const current = targetGuests[tabIndex];
          if (current) {
            onGuestStatusUpdated(current.id, true);
            void fetch(
              `/api-proxy/api/v1/client-portal/${event.id}/guests/${current.id}/wa-status?key=${accessKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isSent: true }),
              },
            );
          }
          setTabSentCount((prev) => prev + 1);
          advanceTabToNext();
        }, 0);
      }
    } else if (tabStatus === 'break') {
      if (tabBreakCountdown > 0) {
        tabTimerRef.current = setTimeout(() => {
          setTabBreakCountdown((prev) => prev - 1);
        }, 1000);
      } else if (tabBreakCountdown === 0) {
        completionTimer = setTimeout(() => {
          setTabStatus('running');
          const nextIdx = tabIndex + 1;
          if (nextIdx < targetGuests.length) {
            setTabIndex(nextIdx);
            dispatchTabGuest(targetGuests[nextIdx], nextIdx);
            setTabCountdown(getRandomTabDelay());
          } else {
            setTabStatus('completed');
          }
        }, 0);
      }
    }

    return () => {
      if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
      if (completionTimer) clearTimeout(completionTimer);
    };
  }, [accessKey, advanceTabToNext, dispatchTabGuest, event.id, getRandomTabDelay, onGuestStatusUpdated, tabBreakCountdown, tabCountdown, tabIndex, tabStatus, targetGuests]);

  const handleClose = () => {
    if (serverQueue.status === 'running' || tabStatus === 'running') {
      if (
        !window.confirm(
          'Antrean pengiriman sedang berjalan. Yakin ingin menutup panel ini? Progres tamu yang sudah terkirim tetap tersimpan.',
        )
      ) {
        return;
      }
    }
    if (tabTimerRef.current) {
      clearTimeout(tabTimerRef.current);
      tabTimerRef.current = null;
    }
    setTabStatus('idle');
    onClose();
  };

  if (!isOpen) return null;

  const serverProgressPercent =
    serverQueue.total > 0
      ? Math.min(100, Math.round((serverQueue.currentIndex / serverQueue.total) * 100))
      : 0;

  const isServerQueueActive =
    serverQueue.status === 'running' ||
    serverQueue.status === 'paused' ||
    serverQueue.status === 'break';

  return (
    <div className="portal-modal-backdrop" onClick={handleClose}>
      <div
        className="portal-modal-content portal-auto-sender-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        {/* Modal Header */}
        <div className="portal-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🚀</span>
            <div>
              <h2 className="portal-modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                Pengirim Undangan Otomatis WhatsApp
              </h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--portal-text-muted)' }}>
                Kirim ratusan undangan langsung dari nomor WhatsApp Anda sendiri
              </p>
            </div>
          </div>
          <button
            type="button"
            className="portal-modal-close"
            onClick={handleClose}
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--portal-card-border)',
            background: '#f8fafc',
            padding: '0 1.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveMode('qr_gateway')}
            style={{
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: 'transparent',
              border: 'none',
              borderBottom: activeMode === 'qr_gateway' ? '2.5px solid #16a34a' : '2.5px solid transparent',
              color: activeMode === 'qr_gateway' ? '#15803d' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>📱</span>
            <span>Scan QR WhatsApp (100% Otomatis)</span>
            <span
              style={{
                fontSize: '0.65rem',
                background: '#dcfce7',
                color: '#15803d',
                padding: '2px 6px',
                borderRadius: '999px',
                fontWeight: 700,
              }}
            >
              Rekomendasi
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('web_tab')}
            style={{
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeMode === 'web_tab' ? '2.5px solid var(--portal-accent)' : '2.5px solid transparent',
              color: activeMode === 'web_tab' ? 'var(--portal-accent)' : '#64748b',
              cursor: 'pointer',
            }}
          >
            💻 Tab WhatsApp Web (Laptop)
          </button>
        </div>

        {/* Modal Body */}
        <div className="portal-modal-body">
          {serverError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--portal-radius-md)',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                fontSize: '0.82rem',
                color: '#b91c1c',
              }}
            >
              ⚠️ {serverError}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              MODE A: QR SCAN GATEWAY (100% AUTO SERVER-SIDE)
             ══════════════════════════════════════════════════════════════════ */}
          {activeMode === 'qr_gateway' && (
            <div>
              {/* STEP 1: NOT CONNECTED -> SHOW QR ONBOARDING */}
              {session.status !== 'connected' && !isServerQueueActive && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center', padding: '0.5rem 0' }}>
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                      border: '1px solid #bbf7d0',
                      borderRadius: 'var(--portal-radius-lg)',
                      padding: '1.25rem',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#166534', fontSize: '0.95rem' }}>
                      <span>🛡️</span>
                      <span>Kirim Otomatis Tanpa Tekan Send 300 Kali</span>
                    </div>
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.82rem', color: '#14532d', lineHeight: 1.5 }}>
                      Cukup scan QR Code sekali dari HP Anda. Server akan mengirimkan semua undangan secara otomatis di latar belakang. <strong>HP atau laptop Anda bahkan bisa dimatikan/ditinggal</strong>, pesan tetap sampai ke seluruh tamu!
                    </p>
                  </div>

                  {session.status === 'disconnected' && (
                    <div style={{ padding: '1.5rem 1rem' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📲</div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Hubungkan WhatsApp Pengirim</h3>
                      <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: 'var(--portal-text-muted)' }}>
                        Undangan akan dikirimkan atas nama nomor pribadi pengantin/klien
                      </p>
                      <button
                        type="button"
                        className="btn-portal-wa-auto"
                        onClick={handleConnectWa}
                        disabled={isConnectingWa}
                        style={{ margin: '0 auto', fontSize: '0.9rem', padding: '0.75rem 1.5rem' }}
                      >
                        {isConnectingWa ? 'Menyiapkan QR Code...' : '⚡ Tampilkan QR Code WhatsApp'}
                      </button>
                    </div>
                  )}

                  {(session.status === 'needs_qr' || isConnectingWa) && (
                    <div style={{ padding: '1rem', background: '#ffffff', borderRadius: 'var(--portal-radius-lg)', border: '1px solid var(--portal-card-border)' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#0f172a' }}>
                        Pindai Kode QR Ini di WhatsApp HP Anda
                      </h4>
                      <ol
                        style={{
                          textAlign: 'left',
                          fontSize: '0.82rem',
                          color: 'var(--portal-text-muted)',
                          margin: '0.5rem auto 1.25rem auto',
                          maxWidth: '420px',
                          paddingLeft: '1.25rem',
                          lineHeight: 1.6,
                        }}
                      >
                        <li>Buka aplikasi <strong>WhatsApp</strong> di HP pengirim.</li>
                        <li>Ketuk <strong>Menu (titik 3)</strong> atau <strong>Setelan (Settings)</strong>.</li>
                        <li>Pilih <strong>Perangkat Tertaut (Linked Devices)</strong>.</li>
                        <li>Ketuk <strong>Tautkan Perangkat</strong> dan arahkan kamera ke QR di bawah:</li>
                      </ol>

                      {session.qrCodeDataUrl ? (
                        <div style={{ display: 'inline-block', padding: '10px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={session.qrCodeDataUrl}
                            alt="Scan WhatsApp QR"
                            style={{ width: '240px', height: '240px', display: 'block' }}
                          />
                        </div>
                      ) : (
                        <div style={{ padding: '3rem', color: 'var(--portal-text-muted)' }}>
                          ⏳ Menghubungkan ke server WhatsApp...
                        </div>
                      )}

                      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                        <button
                          type="button"
                          className="btn-portal-secondary"
                          onClick={handleConnectWa}
                          disabled={isConnectingWa}
                          style={{ fontSize: '0.8rem' }}
                        >
                          🔄 Muat Ulang QR
                        </button>
                        <button
                          type="button"
                          className="btn-portal-secondary"
                          onClick={() => setSession((prev) => ({ ...prev, status: 'disconnected' }))}
                          style={{ fontSize: '0.8rem' }}
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: CONNECTED & IDLE -> CONFIGURE QUEUE */}
              {session.status === 'connected' && !isServerQueueActive && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Connected Status Card */}
                  <div
                    style={{
                      background: '#ecfdf5',
                      border: '1.5px solid #a7f3d0',
                      borderRadius: 'var(--portal-radius-md)',
                      padding: '0.875rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>🟢</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#065f46' }}>
                          WhatsApp Terhubung: {session.phoneNumber || 'Nomor Klien'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                          Profil: {session.pushName || 'Klien'} • Siap mengirim undangan otomatis
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDisconnectWa}
                      disabled={isDisconnectingWa}
                      style={{
                        background: 'transparent',
                        border: '1px solid #f87171',
                        color: '#dc2626',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      {isDisconnectingWa ? 'Memutuskan...' : 'Putuskan / Ganti Nomor'}
                    </button>
                  </div>

                  {/* Filter Mode */}
                  <div>
                    <label className="portal-form-label" style={{ fontWeight: 600 }}>
                      1. Pilih Target Tamu:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.4rem' }}>
                      <button
                        type="button"
                        className={`portal-filter-btn ${filterMode === 'unsent' ? 'is-active' : ''}`}
                        onClick={() => setFilterMode('unsent')}
                        style={{ padding: '0.625rem', fontSize: '0.85rem' }}
                      >
                        Belum Terkirim ({guests.filter((g) => !g.isWaSent && g.phoneNumber).length})
                      </button>
                      <button
                        type="button"
                        className={`portal-filter-btn ${filterMode === 'all' ? 'is-active' : ''}`}
                        onClick={() => setFilterMode('all')}
                        style={{ padding: '0.625rem', fontSize: '0.85rem' }}
                      >
                        Semua Tamu Ber-WA ({guests.filter((g) => g.phoneNumber).length})
                      </button>
                    </div>

                    {categories.length > 0 && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <label className="portal-form-label" style={{ fontSize: '0.78rem' }}>
                          Filter Kategori Tamu (Opsional):
                        </label>
                        <select
                          className="portal-form-select"
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                          <option value="ALL">Semua Kategori</option>
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Pacing Speed */}
                  <div>
                    <label className="portal-form-label" style={{ fontWeight: 600 }}>
                      2. Kecepatan & Jeda Aman (Anti Spam Meta):
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem' }}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.625rem',
                          padding: '0.625rem 0.875rem',
                          background: pacing === 'relaxed' ? '#e8f3ed' : '#f9fafb',
                          border: pacing === 'relaxed' ? '1.5px solid var(--portal-accent)' : '1px solid var(--portal-card-border)',
                          borderRadius: 'var(--portal-radius-md)',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          name="server-pacing"
                          checked={pacing === 'relaxed'}
                          onChange={() => setPacing('relaxed')}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            Santai (Jeda 12 – 18 Detik) • Sangat Direkomendasikan ⭐
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--portal-text-muted)' }}>
                            Paling aman dan natural. Sangat dianjurkan untuk ratusan tamu.
                          </div>
                        </div>
                      </label>

                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.625rem',
                          padding: '0.625rem 0.875rem',
                          background: pacing === 'standard' ? '#e8f3ed' : '#f9fafb',
                          border: pacing === 'standard' ? '1.5px solid var(--portal-accent)' : '1px solid var(--portal-card-border)',
                          borderRadius: 'var(--portal-radius-md)',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          name="server-pacing"
                          checked={pacing === 'standard'}
                          onChange={() => setPacing('standard')}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            Standar (Jeda 8 – 12 Detik)
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--portal-text-muted)' }}>
                            Kecepatan normal untuk pengiriman puluhan tamu.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Anti-Spam Options */}
                  <div style={{ background: '#f9fafb', padding: '0.875rem 1rem', borderRadius: 'var(--portal-radius-md)', border: '1px solid var(--portal-card-border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={useSpintax}
                        onChange={(e) => setUseSpintax(e.target.checked)}
                      />
                      Variasi Kalimat Salam Otomatis (Mencegah teks kembar blast)
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', cursor: 'pointer', marginTop: '0.5rem', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={enableBatchBreak}
                        onChange={(e) => setEnableBatchBreak(e.target.checked)}
                      />
                      Jeda istirahat 45 detik tiap 30 pesan terkirim
                    </label>
                  </div>

                  {/* Start Button Box */}
                  <div
                    style={{
                      background: '#f1f5f9',
                      padding: '1rem 1.25rem',
                      borderRadius: 'var(--portal-radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                        Siap Mengirim: {targetGuests.length} Tamu
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--portal-text-muted)' }}>
                        Otomatis 100% tanpa perlu klik kirim di WhatsApp
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-portal-wa-auto"
                      onClick={handleStartServerQueue}
                      disabled={targetGuests.length === 0}
                      style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
                    >
                      <span>🚀</span>
                      <span>Mulai Kirim Sekarang</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: QUEUE IS RUNNING / ACTIVE ON SERVER */}
              {isServerQueueActive && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Status Banner */}
                  <div
                    style={{
                      background: serverQueue.status === 'break' ? '#fef3c7' : '#ecfdf5',
                      border: serverQueue.status === 'break' ? '1px solid #fde68a' : '1px solid #a7f3d0',
                      borderRadius: 'var(--portal-radius-md)',
                      padding: '0.875rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>
                      {serverQueue.status === 'break' ? '☕' : '⚡'}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: serverQueue.status === 'break' ? '#92400e' : '#065f46' }}>
                        {serverQueue.status === 'break'
                          ? `Istirahat Batch Otomatis (${serverQueue.breakCountdownSeconds}s tersisa)`
                          : serverQueue.status === 'paused'
                          ? 'Antrean Dijeda Sementara'
                          : 'Sedang Mengirim Otomatis di Server...'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--portal-text-muted)' }}>
                        Koneksi: {session.phoneNumber || 'Nomor Klien'} • Anda bebas menutup halaman ini!
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600 }}>
                        Progres: {serverQueue.currentIndex} / {serverQueue.total} Tamu
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--portal-accent)' }}>
                        {serverProgressPercent}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: '10px',
                        background: '#e2e8f0',
                        borderRadius: '999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${serverProgressPercent}%`,
                          background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats & Countdown */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.75rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--portal-radius-md)', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a' }}>{serverQueue.sentCount}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--portal-text-muted)' }}>Terkirim</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--portal-radius-md)', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{serverQueue.countdownSeconds}s</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--portal-text-muted)' }}>Jeda Pesan</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--portal-radius-md)', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>{serverQueue.failedCount}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--portal-text-muted)' }}>Gagal</div>
                    </div>
                  </div>

                  {/* Controls Toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f1f5f9',
                      padding: '0.875rem 1rem',
                      borderRadius: 'var(--portal-radius-md)',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: 'var(--portal-text-muted)' }}>
                      💡 Laptop & HP bisa dimatikan kapan saja.
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {serverQueue.status === 'running' && (
                        <button
                          type="button"
                          className="btn-portal-secondary"
                          onClick={() => handleControlServerQueue('pause')}
                        >
                          ⏸️ Jeda
                        </button>
                      )}
                      {serverQueue.status === 'paused' && (
                        <button
                          type="button"
                          className="btn-portal-primary"
                          onClick={() => handleControlServerQueue('resume')}
                        >
                          ▶️ Lanjutkan
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-portal-secondary"
                        onClick={() => handleControlServerQueue('stop')}
                        style={{ color: '#dc2626' }}
                      >
                        ⏹️ Hentikan
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              MODE B: BROWSER TAB FALLBACK (DESKTOP WHATSAPP WEB)
             ══════════════════════════════════════════════════════════════════ */}
          {activeMode === 'web_tab' && (
            <div>
              {popupBlocked && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 'var(--portal-radius-md)',
                    padding: '0.875rem 1rem',
                    marginBottom: '1rem',
                    fontSize: '0.85rem',
                    color: '#92400e',
                  }}
                >
                  <strong>⚠️ Jendela Pop-up Terblokir Browser</strong>
                  <p style={{ margin: '0.35rem 0 0 0' }}>
                    Browser Anda memblokir pembukaan tab WhatsApp otomatis. Silakan pilih &quot;Selalu izinkan pop-up&quot; di bilah URL browser Anda.
                  </p>
                </div>
              )}

              {tabStatus === 'idle' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 'var(--portal-radius-md)',
                      padding: '1rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                      Kirim via Tab WhatsApp Web (Laptop)
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--portal-text-muted)', lineHeight: 1.5 }}>
                      Mode ini akan membuka satu tab WhatsApp Web di laptop Anda, mengisi pesan & nomor tamu secara bergantian. Anda cukup menekan tombol <strong>Kirim (Enter)</strong> di WhatsApp untuk setiap tamu.
                    </p>
                  </div>

                  <div
                    style={{
                      background: '#f1f5f9',
                      padding: '1rem',
                      borderRadius: 'var(--portal-radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        Target: {targetGuests.length} Tamu
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--portal-text-muted)' }}>
                        Membutuhkan laptop dengan WhatsApp Web aktif
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-portal-secondary"
                      onClick={() => {
                        if (targetGuests.length === 0) return;
                        setTabStatus('running');
                        setTabIndex(0);
                        setTabSentCount(0);
                        dispatchTabGuest(targetGuests[0], 0);
                        setTabCountdown(getRandomTabDelay());
                      }}
                      disabled={targetGuests.length === 0}
                    >
                      🚀 Buka Antrean Tab Web
                    </button>
                  </div>
                </div>
              )}

              {tabStatus !== 'idle' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div
                    style={{
                      background: '#ecfdf5',
                      padding: '1rem',
                      borderRadius: 'var(--portal-radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        Tamu #{tabIndex + 1}: {targetGuests[tabIndex]?.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--portal-text-muted)' }}>
                        📱 {targetGuests[tabIndex]?.phoneNumber}
                      </div>
                    </div>
                    <div
                      style={{
                        background: '#16a34a',
                        color: '#ffffff',
                        padding: '0.5rem 0.875rem',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '1.2rem',
                      }}
                    >
                      {tabCountdown}s
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn-portal-secondary"
                      onClick={() => dispatchTabGuest(targetGuests[tabIndex], tabIndex)}
                    >
                      🔗 Buka Ulang Tab WA
                    </button>
                    <button
                      type="button"
                      className="btn-portal-secondary"
                      onClick={() => advanceTabToNext()}
                    >
                      ⏭️ Lewati
                    </button>
                    <button
                      type="button"
                      className="btn-portal-secondary"
                      onClick={() => setTabStatus('stopped')}
                      style={{ color: '#dc2626' }}
                    >
                      ⏹️ Berhenti
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
