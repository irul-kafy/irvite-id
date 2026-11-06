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
  // Mobile device detection
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }, []);

  // Mode: 'qr_gateway' (100% full auto from connected WA) vs 'web_tab' (manual tab / app dispatcher)
  const [activeMode, setActiveMode] = useState<'qr_gateway' | 'web_tab'>('qr_gateway');

  // Linking method for mode A: 'qr' vs 'pairing'
  const [linkMethod, setLinkMethod] = useState<'qr' | 'pairing'>('qr');
  const [pairingPhone, setPairingPhone] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isRequestingPairing, setIsRequestingPairing] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Filter & Queue Settings
  const [filterMode, setFilterMode] = useState<'unsent' | 'all'>('unsent');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [pacing, setPacing] = useState<DelayPacing>('relaxed');
  const [useSpintax, setUseSpintax] = useState(true);
  const [enableBatchBreak, setEnableBatchBreak] = useState(true);

  // Execution engine: 'live_tab' (foreground step-by-step) vs 'background_server'
  const [executionEngine, setExecutionEngine] = useState<'live_tab' | 'background_server'>('live_tab');

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

  // Live Tab Sender States (Direct server calls per guest)
  const [liveStatus, setLiveStatus] = useState<'idle' | 'running' | 'paused' | 'completed' | 'stopped'>('idle');
  const [liveIndex, setLiveIndex] = useState(0);
  const [liveCountdown, setLiveCountdown] = useState(0);
  const [liveSentCount, setLiveSentCount] = useState(0);
  const [liveFailedCount, setLiveFailedCount] = useState(0);
  const [liveLogs, setLiveLogs] = useState<
    Array<{ name: string; phone: string; time: string; status: 'ok' | 'failed' }>
  >([]);

  // Browser-Tab Fallback Execution States
  const [tabStatus, setTabStatus] = useState<
    'idle' | 'running' | 'paused' | 'break' | 'completed' | 'stopped'
  >('idle');
  const [tabIndex, setTabIndex] = useState(0);
  const [tabCountdown, setTabCountdown] = useState(0);
  const [popupBlocked, setPopupBlocked] = useState(false);

  const tabTimerRef = useRef<NodeJS.Timeout | null>(null);
  const liveTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    }, 2500);

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
        const err = await res.json().catch(() => null);
        setServerError(
          err?.message || 'Gagal menyiapkan QR Code WhatsApp. Silakan coba klik sekali lagi.',
        );
      }
    } catch {
      setServerError('Gagal terhubung ke server WhatsApp. Periksa koneksi internet Anda.');
    } finally {
      setIsConnectingWa(false);
    }
  };

  // Request Pairing Code (for mobile / HP users)
  const handleRequestPairingCode = async () => {
    if (!pairingPhone.trim()) {
      setServerError('Silakan masukkan nomor WhatsApp Anda terlebih dahulu.');
      return;
    }
    setIsRequestingPairing(true);
    setServerError(null);
    try {
      const res = await fetch(
        `/api-proxy/api/v1/client-portal/${event.id}/wa/pairing-code?key=${accessKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: pairingPhone.trim() }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        setPairingCode(data.pairingCode);
      } else {
        const err = await res.json().catch(() => null);
        setServerError(
          err?.message ||
            'Gagal meminta kode pairing. Pastikan nomor sudah benar dan terdaftar di WhatsApp.',
        );
      }
    } catch {
      setServerError('Gagal menghubungi server untuk meminta kode pairing.');
    } finally {
      setIsRequestingPairing(false);
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
      setPairingCode(null);
      setLiveStatus('idle');
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

  // ── Live In-Browser Direct Sender (Step-by-Step with server WhatsApp) ──
  const calculateDelay = useCallback((): number => {
    switch (pacing) {
      case 'relaxed':
        return Math.floor(Math.random() * 7) + 12; // 12-18s
      case 'standard':
        return Math.floor(Math.random() * 5) + 8; // 8-12s
      case 'fast':
        return Math.floor(Math.random() * 4) + 5; // 5-8s
      default:
        return 14;
    }
  }, [pacing]);

  const sendSingleGuestDirect = useCallback(
    async (idx: number) => {
      if (idx >= targetGuests.length) {
        setLiveStatus('completed');
        return;
      }

      const g = targetGuests[idx];
      const originUrl = typeof window !== 'undefined' ? window.location.origin : '';

      try {
        const res = await fetch(
          `/api-proxy/api/v1/client-portal/${event.id}/wa/send-guest/${g.id}?key=${accessKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              originUrl,
              variantIndex: useSpintax ? idx : 0,
            }),
          },
        );

        if (res.ok) {
          onGuestStatusUpdated(g.id, true);
          setLiveSentCount((prev) => prev + 1);
          setLiveLogs((prev) => [
            {
              name: g.name,
              phone: g.phoneNumber || '-',
              time: new Date().toLocaleTimeString(),
              status: 'ok',
            },
            ...prev.slice(0, 19),
          ]);
        } else {
          setLiveFailedCount((prev) => prev + 1);
          setLiveLogs((prev) => [
            {
              name: g.name,
              phone: g.phoneNumber || '-',
              time: new Date().toLocaleTimeString(),
              status: 'failed',
            },
            ...prev.slice(0, 19),
          ]);
        }
      } catch {
        setLiveFailedCount((prev) => prev + 1);
      }

      const nextIdx = idx + 1;
      setLiveIndex(nextIdx);

      if (nextIdx >= targetGuests.length) {
        setLiveStatus('completed');
        return;
      }

      const nextDelay = calculateDelay();
      setLiveCountdown(nextDelay);
    },
    [
      accessKey,
      calculateDelay,
      event.id,
      onGuestStatusUpdated,
      targetGuests,
      useSpintax,
    ],
  );

  // Live Timer Countdown Effect
  useEffect(() => {
    if (liveStatus !== 'running' || liveCountdown <= 0) return;

    liveTimerRef.current = setTimeout(() => {
      setLiveCountdown((prev) => {
        if (prev <= 1) {
          void sendSingleGuestDirect(liveIndex);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    };
  }, [liveCountdown, liveIndex, liveStatus, sendSingleGuestDirect]);

  // Start Live Direct Sender
  const handleStartLiveQueue = () => {
    if (targetGuests.length === 0) return;
    setServerError(null);
    setLiveStatus('running');
    setLiveIndex(0);
    setLiveSentCount(0);
    setLiveFailedCount(0);
    setLiveLogs([]);
    void sendSingleGuestDirect(0);
  };

  // Start Background Server Queue
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
        const err = await res.json().catch(() => null);
        setServerError(err?.message || 'Gagal memulai antrean server.');
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

  // ── Browser Tab / Mobile App Fallback ──
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
        isMobile,
      );

      try {
        if (isMobile) {
          // On mobile, window.location.href or window.open opens the native WhatsApp app directly
          window.location.href = url;
        } else {
          const win = window.open(url, 'irvite_wa_sender');
          if (!win || win.closed || typeof win.closed === 'undefined') {
            setPopupBlocked(true);
          } else {
            setPopupBlocked(false);
          }
        }
      } catch {
        setPopupBlocked(true);
      }
    },
    [event.title, getInvitationUrl, isMobile, useSpintax],
  );

  const advanceTabToNext = useCallback(() => {
    const nextIdx = tabIndex + 1;
    if (nextIdx >= targetGuests.length) {
      setTabStatus('completed');
      return;
    }
    setTabIndex(nextIdx);
    setTabCountdown(getRandomTabDelay());
    dispatchTabGuest(targetGuests[nextIdx], nextIdx);
  }, [dispatchTabGuest, getRandomTabDelay, tabIndex, targetGuests]);

  useEffect(() => {
    if (tabStatus !== 'running') return;
    if (tabCountdown > 0) {
      tabTimerRef.current = setTimeout(() => {
        setTabCountdown((prev) => prev - 1);
      }, 1000);
      return () => {
        if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
      };
    } else if (tabCountdown === 0) {
      advanceTabToNext();
    }
  }, [tabCountdown, tabStatus, advanceTabToNext]);

  const isServerQueueActive =
    serverQueue.status === 'running' ||
    serverQueue.status === 'paused' ||
    serverQueue.status === 'break';

  const isLiveQueueActive = liveStatus === 'running' || liveStatus === 'paused';

  const serverProgressPercent =
    serverQueue.total > 0
      ? Math.round((serverQueue.currentIndex / serverQueue.total) * 100)
      : 0;

  const liveProgressPercent =
    targetGuests.length > 0
      ? Math.round((liveIndex / targetGuests.length) * 100)
      : 0;

  if (!isOpen) return null;

  return (
    <div
      className="portal-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="portal-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 'var(--portal-radius-lg, 16px)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          className="portal-modal-header"
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--portal-card-border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🚀</span>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--portal-text-main, #0f172a)',
                }}
              >
                Pengirim WhatsApp Otomatis
              </h2>
              <p
                style={{
                  margin: '0.2rem 0 0 0',
                  fontSize: '0.78rem',
                  color: 'var(--portal-text-muted, #64748b)',
                }}
              >
                Kirim ratusan undangan langsung tanpa perlu tekan kirim satu per satu
              </p>
            </div>
          </div>
          <button
            type="button"
            className="portal-modal-close"
            onClick={onClose}
            aria-label="Tutup"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '999px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              color: '#64748b',
            }}
          >
            ✕
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            borderBottom: '1px solid var(--portal-card-border, #e2e8f0)',
            background: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveMode('qr_gateway')}
            style={{
              padding: '0.75rem 0.5rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: 'transparent',
              border: 'none',
              borderBottom:
                activeMode === 'qr_gateway'
                  ? '2.5px solid var(--portal-accent, #163026)'
                  : '2.5px solid transparent',
              color:
                activeMode === 'qr_gateway'
                  ? 'var(--portal-accent, #163026)'
                  : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
          >
            <span>🤖 Kirim Otomatis Penuh</span>
            <span
              style={{
                fontSize: '0.65rem',
                background: '#16a34a',
                color: '#fff',
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
              padding: '0.75rem 0.5rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom:
                activeMode === 'web_tab'
                  ? '2.5px solid var(--portal-accent, #163026)'
                  : '2.5px solid transparent',
              color:
                activeMode === 'web_tab'
                  ? 'var(--portal-accent, #163026)'
                  : '#64748b',
              cursor: 'pointer',
            }}
          >
            {isMobile ? '📱 Aplikasi WhatsApp HP' : '💻 Tab WhatsApp Web'}
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="portal-modal-body"
          style={{ padding: '1.25rem', overflowY: 'auto' }}
        >
          {serverError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--portal-radius-md, 8px)',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                fontSize: '0.82rem',
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
              }}
            >
              <span>⚠️</span>
              <div>{serverError}</div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              MODE A: SERVER-LINKED AUTO SENDER (QR / PAIRING CODE)
             ══════════════════════════════════════════════════════════════════ */}
          {activeMode === 'qr_gateway' && (
            <div>
              {/* STEP 1: NOT CONNECTED -> LINK DEVICE */}
              {session.status !== 'connected' &&
                !isServerQueueActive &&
                !isLiveQueueActive && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      textAlign: 'center',
                    }}
                  >
                    {/* Benefit Banner */}
                    <div
                      style={{
                        background:
                          'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                        border: '1px solid #bbf7d0',
                        borderRadius: 'var(--portal-radius-md, 8px)',
                        padding: '1rem',
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontWeight: 700,
                          color: '#166534',
                          fontSize: '0.9rem',
                        }}
                      >
                        <span>🛡️</span>
                        <span>Kirim Otomatis Tanpa Tekan Send 300 Kali</span>
                      </div>
                      <p
                        style={{
                          margin: '0.35rem 0 0 0',
                          fontSize: '0.8rem',
                          color: '#14532d',
                          lineHeight: 1.5,
                        }}
                      >
                        Tautkan nomor WhatsApp Anda sekali saja. Sistem akan
                        mengirimkan undangan langsung atas nama nomor Anda
                        dengan jeda manusiawi dan anti-spam.
                      </p>
                    </div>

                    {/* Linking Method Tabs: QR Code vs Pairing Code */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.5rem',
                        marginTop: '0.25rem',
                      }}
                    >
                      <button
                        type="button"
                        className={`portal-filter-btn ${linkMethod === 'qr' ? 'is-active' : ''}`}
                        onClick={() => setLinkMethod('qr')}
                        style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                      >
                        📷 Scan QR Code {isMobile ? '' : '(Laptop)'}
                      </button>
                      <button
                        type="button"
                        className={`portal-filter-btn ${linkMethod === 'pairing' ? 'is-active' : ''}`}
                        onClick={() => setLinkMethod('pairing')}
                        style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                      >
                        🔢 Kode Pairing {isMobile ? '⭐ (Untuk HP)' : ''}
                      </button>
                    </div>

                    {/* SUB-METHOD 1: QR CODE */}
                    {linkMethod === 'qr' && (
                      <div
                        style={{
                          padding: '1rem',
                          background: '#ffffff',
                          borderRadius: 'var(--portal-radius-md, 8px)',
                          border: '1px solid var(--portal-card-border, #e2e8f0)',
                        }}
                      >
                        {session.status === 'disconnected' && (
                          <div style={{ padding: '1rem 0' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                              📲
                            </div>
                            <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem' }}>
                              Pindai QR WhatsApp
                            </h3>
                            <p
                              style={{
                                margin: '0 0 1rem 0',
                                fontSize: '0.8rem',
                                color: 'var(--portal-text-muted)',
                              }}
                            >
                              Buka WhatsApp di HP &gt; Perangkat Tertaut &gt; Scan QR
                            </p>
                            <button
                              type="button"
                              className="btn-portal-wa-auto"
                              onClick={handleConnectWa}
                              disabled={isConnectingWa}
                              style={{
                                margin: '0 auto',
                                fontSize: '0.85rem',
                                padding: '0.65rem 1.5rem',
                              }}
                            >
                              {isConnectingWa
                                ? 'Menyiapkan QR Code...'
                                : '⚡ Tampilkan QR Code WhatsApp'}
                            </button>
                          </div>
                        )}

                        {(session.status === 'needs_qr' || isConnectingWa) && (
                          <div>
                            <ol
                              style={{
                                textAlign: 'left',
                                fontSize: '0.78rem',
                                color: 'var(--portal-text-muted)',
                                margin: '0 auto 1rem auto',
                                maxWidth: '380px',
                                paddingLeft: '1.25rem',
                                lineHeight: 1.5,
                              }}
                            >
                              <li>Buka WhatsApp di HP Anda.</li>
                              <li>
                                Ketuk <strong>Menu titik tiga</strong> (Android) atau{' '}
                                <strong>Setelan</strong> (iPhone).
                              </li>
                              <li>
                                Pilih <strong>Perangkat Tertaut</strong> &gt;{' '}
                                <strong>Tautkan Perangkat</strong>.
                              </li>
                              <li>Arahkan kamera ke QR Code di bawah:</li>
                            </ol>

                            {session.qrCodeDataUrl ? (
                              <div
                                style={{
                                  display: 'inline-block',
                                  padding: '8px',
                                  background: '#ffffff',
                                  borderRadius: '12px',
                                  boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={session.qrCodeDataUrl}
                                  alt="Scan WhatsApp QR"
                                  style={{
                                    width: '220px',
                                    height: '220px',
                                    display: 'block',
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                style={{
                                  padding: '2.5rem',
                                  color: 'var(--portal-text-muted)',
                                  fontSize: '0.85rem',
                                }}
                              >
                                ⏳ Menyiapkan QR Code dari server WhatsApp...
                              </div>
                            )}

                            <div
                              style={{
                                marginTop: '1rem',
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '0.5rem',
                              }}
                            >
                              <button
                                type="button"
                                className="btn-portal-secondary"
                                onClick={handleConnectWa}
                                disabled={isConnectingWa}
                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                              >
                                🔄 Muat Ulang QR
                              </button>
                              <button
                                type="button"
                                className="btn-portal-secondary"
                                onClick={() =>
                                  setSession((prev) => ({
                                    ...prev,
                                    status: 'disconnected',
                                  }))
                                }
                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-METHOD 2: PAIRING CODE (EASY FOR MOBILE) */}
                    {linkMethod === 'pairing' && (
                      <div
                        style={{
                          padding: '1.25rem',
                          background: '#ffffff',
                          borderRadius: 'var(--portal-radius-md, 8px)',
                          border: '1px solid var(--portal-card-border, #e2e8f0)',
                          textAlign: 'left',
                        }}
                      >
                        <h3
                          style={{
                            margin: '0 0 0.35rem 0',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                          }}
                        >
                          Tautkan dengan Kode 8-Karakter (Tanpa Scan Kamera)
                        </h3>
                        <p
                          style={{
                            margin: '0 0 1rem 0',
                            fontSize: '0.78rem',
                            color: 'var(--portal-text-muted)',
                            lineHeight: 1.4,
                          }}
                        >
                          Sangat cocok jika Anda membuka halaman ini di HP yang sama
                          dengan WhatsApp Anda.
                        </p>

                        {!pairingCode ? (
                          <div>
                            <label
                              className="portal-form-label"
                              style={{ fontWeight: 600, fontSize: '0.8rem' }}
                            >
                              Masukkan Nomor WhatsApp Pengirim:
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                              <input
                                type="tel"
                                className="portal-form-input"
                                placeholder="Contoh: 081234567890"
                                value={pairingPhone}
                                onChange={(e) => setPairingPhone(e.target.value)}
                                style={{ flex: 1, fontSize: '0.85rem' }}
                              />
                              <button
                                type="button"
                                className="btn-portal-primary"
                                onClick={handleRequestPairingCode}
                                disabled={isRequestingPairing || !pairingPhone.trim()}
                                style={{
                                  fontSize: '0.8rem',
                                  padding: '0.5rem 1rem',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {isRequestingPairing ? 'Meminta Kode...' : 'Dapatkan Kode'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                            <div
                              style={{
                                fontSize: '0.78rem',
                                color: 'var(--portal-text-muted)',
                                marginBottom: '0.5rem',
                              }}
                            >
                              Kode Pairing WhatsApp Anda:
                            </div>
                            <div
                              style={{
                                display: 'inline-block',
                                background: '#f1f5f9',
                                border: '2px dashed var(--portal-accent, #163026)',
                                borderRadius: '8px',
                                padding: '0.75rem 1.5rem',
                                fontSize: '1.6rem',
                                fontWeight: 800,
                                letterSpacing: '4px',
                                color: 'var(--portal-accent, #163026)',
                              }}
                            >
                              {pairingCode}
                            </div>
                            <div style={{ marginTop: '0.5rem' }}>
                              <button
                                type="button"
                                className="btn-portal-secondary"
                                onClick={() => {
                                  void navigator.clipboard.writeText(pairingCode.replace(/-/g, ''));
                                  setCodeCopied(true);
                                  setTimeout(() => setCodeCopied(false), 2000);
                                }}
                                style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                              >
                                {codeCopied ? '✅ Tersalin!' : '📋 Salin Kode'}
                              </button>
                            </div>

                            <ol
                              style={{
                                textAlign: 'left',
                                fontSize: '0.78rem',
                                color: 'var(--portal-text-muted)',
                                margin: '1rem auto 0 auto',
                                paddingLeft: '1.25rem',
                                lineHeight: 1.5,
                              }}
                            >
                              <li>Buka aplikasi WhatsApp di HP Anda.</li>
                              <li>
                                Buka <strong>Perangkat Tertaut</strong> &gt;{' '}
                                <strong>Tautkan Perangkat</strong>.
                              </li>
                              <li>
                                Ketuk{' '}
                                <strong>
                                  &quot;Tautkan dengan nomor telepon saja&quot;
                                </strong>{' '}
                                di bagian bawah layar.
                              </li>
                              <li>Masukkan 8 karakter kode di atas.</li>
                            </ol>

                            <div style={{ marginTop: '1rem' }}>
                              <button
                                type="button"
                                className="btn-portal-secondary"
                                onClick={() => setPairingCode(null)}
                                style={{ fontSize: '0.75rem' }}
                              >
                                🔄 Ganti Nomor / Ulangi
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              {/* STEP 2: CONNECTED & IDLE -> CONFIGURE DISPATCH */}
              {session.status === 'connected' &&
                !isServerQueueActive &&
                !isLiveQueueActive && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    {/* Connected Status Card */}
                    <div
                      style={{
                        background: '#ecfdf5',
                        border: '1.5px solid #a7f3d0',
                        borderRadius: 'var(--portal-radius-md, 8px)',
                        padding: '0.875rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.625rem',
                        }}
                      >
                        <span style={{ fontSize: '1.5rem' }}>🟢</span>
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              color: '#065f46',
                            }}
                          >
                            WhatsApp Terhubung:{' '}
                            {session.phoneNumber || 'Nomor Pengirim'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                            Profil: {session.pushName || 'Klien'} • Siap kirim
                            otomatis
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
                        {isDisconnectingWa ? 'Memutuskan...' : 'Putuskan / Ganti'}
                      </button>
                    </div>

                    {/* Target Guests Filter */}
                    <div>
                      <label
                        className="portal-form-label"
                        style={{ fontWeight: 600, fontSize: '0.85rem' }}
                      >
                        1. Pilih Sasaran Tamu:
                      </label>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '0.5rem',
                          marginTop: '0.4rem',
                        }}
                      >
                        <button
                          type="button"
                          className={`portal-filter-btn ${filterMode === 'unsent' ? 'is-active' : ''}`}
                          onClick={() => setFilterMode('unsent')}
                          style={{ padding: '0.5rem', fontSize: '0.82rem' }}
                        >
                          Belum Terkirim (
                          {guests.filter((g) => !g.isWaSent && g.phoneNumber).length}
                          )
                        </button>
                        <button
                          type="button"
                          className={`portal-filter-btn ${filterMode === 'all' ? 'is-active' : ''}`}
                          onClick={() => setFilterMode('all')}
                          style={{ padding: '0.5rem', fontSize: '0.82rem' }}
                        >
                          Semua Tamu Ber-WA (
                          {guests.filter((g) => g.phoneNumber).length})
                        </button>
                      </div>

                      {categories.length > 0 && (
                        <div style={{ marginTop: '0.65rem' }}>
                          <label
                            className="portal-form-label"
                            style={{ fontSize: '0.78rem' }}
                          >
                            Filter Kategori:
                          </label>
                          <select
                            className="portal-form-select"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            style={{ fontSize: '0.82rem', padding: '0.45rem' }}
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
                      <label
                        className="portal-form-label"
                        style={{ fontWeight: 600, fontSize: '0.85rem' }}
                      >
                        2. Kecepatan & Jeda Aman (Anti-Banned Meta):
                      </label>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem',
                          marginTop: '0.35rem',
                        }}
                      >
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.75rem',
                            background:
                              pacing === 'relaxed' ? '#e8f3ed' : '#f9fafb',
                            border:
                              pacing === 'relaxed'
                                ? '1.5px solid var(--portal-accent)'
                                : '1px solid var(--portal-card-border)',
                            borderRadius: 'var(--portal-radius-md, 8px)',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="pacing-mode"
                            checked={pacing === 'relaxed'}
                            onChange={() => setPacing('relaxed')}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                              Santai (Jeda 12 – 18 Detik) • Paling Direkomendasikan
                              ⭐
                            </div>
                          </div>
                        </label>

                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.75rem',
                            background:
                              pacing === 'standard' ? '#e8f3ed' : '#f9fafb',
                            border:
                              pacing === 'standard'
                                ? '1.5px solid var(--portal-accent)'
                                : '1px solid var(--portal-card-border)',
                            borderRadius: 'var(--portal-radius-md, 8px)',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="pacing-mode"
                            checked={pacing === 'standard'}
                            onChange={() => setPacing('standard')}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                              Standar (Jeda 8 – 12 Detik)
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Anti-Spam Checkbox */}
                    <div
                      style={{
                        background: '#f9fafb',
                        padding: '0.75rem',
                        borderRadius: 'var(--portal-radius-md, 8px)',
                        border: '1px solid var(--portal-card-border)',
                      }}
                    >
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={useSpintax}
                          onChange={(e) => setUseSpintax(e.target.checked)}
                        />
                        Variasi Kalimat Salam Otomatis (Mencegah pesan kembar
                        terdeteksi spam)
                      </label>
                    </div>

                    {/* Method Selector: Live in Screen vs Background Server */}
                    <div>
                      <label
                        className="portal-form-label"
                        style={{ fontWeight: 600, fontSize: '0.85rem' }}
                      >
                        3. Cara Pengiriman:
                      </label>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '0.5rem',
                          marginTop: '0.35rem',
                        }}
                      >
                        <button
                          type="button"
                          className={`portal-filter-btn ${executionEngine === 'live_tab' ? 'is-active' : ''}`}
                          onClick={() => setExecutionEngine('live_tab')}
                          style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                        >
                          🖥️ Live di Layar (Rekomendasi)
                        </button>
                        <button
                          type="button"
                          className={`portal-filter-btn ${executionEngine === 'background_server' ? 'is-active' : ''}`}
                          onClick={() => setExecutionEngine('background_server')}
                          style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                        >
                          ☁️ Latar Belakang Server
                        </button>
                      </div>
                    </div>

                    {/* Start Action Box */}
                    <div
                      style={{
                        background: '#f1f5f9',
                        padding: '1rem',
                        borderRadius: 'var(--portal-radius-md, 8px)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                          Siap Kirim: {targetGuests.length} Tamu
                        </div>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--portal-text-muted)',
                          }}
                        >
                          Pesan langsung terkirim dari WhatsApp nomor Anda
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-portal-wa-auto"
                        onClick={
                          executionEngine === 'live_tab'
                            ? handleStartLiveQueue
                            : handleStartServerQueue
                        }
                        disabled={targetGuests.length === 0}
                        style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
                      >
                        <span>🚀</span>
                        <span>Mulai Kirim Sekarang</span>
                      </button>
                    </div>
                  </div>
                )}

              {/* STEP 3A: LIVE IN-BROWSER QUEUE IS RUNNING */}
              {isLiveQueueActive && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: 'var(--portal-radius-md, 8px)',
                      padding: '0.875rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: '#065f46',
                        }}
                      >
                        {liveStatus === 'paused'
                          ? 'Pengiriman Dijeda Sementara'
                          : 'Sedang Mengirim Otomatis...'}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--portal-text-muted)',
                        }}
                      >
                        Klien: {session.phoneNumber || 'Terhubung'} • Jeda manusiawi
                        aktif
                      </div>
                    </div>

                    <div
                      style={{
                        background: '#16a34a',
                        color: '#ffffff',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '1.1rem',
                      }}
                    >
                      {liveCountdown > 0 ? `${liveCountdown}s` : 'Kirim...'}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem',
                        marginBottom: '0.35rem',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>
                        Progres: {liveIndex} / {targetGuests.length} Tamu
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: 'var(--portal-accent)',
                        }}
                      >
                        {liveProgressPercent}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: '8px',
                        background: '#e2e8f0',
                        borderRadius: '999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${liveProgressPercent}%`,
                          background:
                            'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.5rem',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '0.5rem',
                        borderRadius: 'var(--portal-radius-md)',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '1.2rem',
                          fontWeight: 800,
                          color: '#16a34a',
                        }}
                      >
                        {liveSentCount}
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--portal-text-muted)',
                        }}
                      >
                        Terkirim
                      </div>
                    </div>
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '0.5rem',
                        borderRadius: 'var(--portal-radius-md)',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '1.2rem',
                          fontWeight: 800,
                          color: '#0f172a',
                        }}
                      >
                        {liveCountdown}s
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--portal-text-muted)',
                        }}
                      >
                        Jeda Acak
                      </div>
                    </div>
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '0.5rem',
                        borderRadius: 'var(--portal-radius-md)',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '1.2rem',
                          fontWeight: 800,
                          color: '#ef4444',
                        }}
                      >
                        {liveFailedCount}
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--portal-text-muted)',
                        }}
                      >
                        Gagal
                      </div>
                    </div>
                  </div>

                  {/* Real-time Activity Log */}
                  {liveLogs.length > 0 && (
                    <div
                      style={{
                        maxHeight: '130px',
                        overflowY: 'auto',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '0.5rem',
                        fontSize: '0.75rem',
                      }}
                    >
                      {liveLogs.map((log, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '0.25rem 0',
                            borderBottom: '1px dashed #e2e8f0',
                          }}
                        >
                          <span>
                            {log.status === 'ok' ? '✅' : '❌'} {log.name} (
                            {log.phone})
                          </span>
                          <span style={{ color: '#94a3b8' }}>{log.time}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Controls */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '0.5rem',
                    }}
                  >
                    {liveStatus === 'running' && (
                      <button
                        type="button"
                        className="btn-portal-secondary"
                        onClick={() => setLiveStatus('paused')}
                      >
                        ⏸️ Jeda
                      </button>
                    )}
                    {liveStatus === 'paused' && (
                      <button
                        type="button"
                        className="btn-portal-primary"
                        onClick={() => {
                          setLiveStatus('running');
                          void sendSingleGuestDirect(liveIndex);
                        }}
                      >
                        ▶️ Lanjutkan
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-portal-secondary"
                      onClick={() => setLiveStatus('stopped')}
                      style={{ color: '#dc2626' }}
                    >
                      ⏹️ Berhenti
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3B: SERVER BACKGROUND QUEUE IS RUNNING */}
              {isServerQueueActive && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      background:
                        serverQueue.status === 'break' ? '#fef3c7' : '#ecfdf5',
                      border:
                        serverQueue.status === 'break'
                          ? '1px solid #fde68a'
                          : '1px solid #a7f3d0',
                      borderRadius: 'var(--portal-radius-md, 8px)',
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
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color:
                            serverQueue.status === 'break'
                              ? '#92400e'
                              : '#065f46',
                        }}
                      >
                        {serverQueue.status === 'break'
                          ? `Istirahat Batch Otomatis (${serverQueue.breakCountdownSeconds}s)`
                          : serverQueue.status === 'paused'
                          ? 'Antrean Dijeda Sementara'
                          : 'Sedang Mengirim di Latar Belakang Server...'}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--portal-text-muted)',
                        }}
                      >
                        Nomor: {session.phoneNumber || 'Klien'} • Laptop/HP bebas
                        dimatikan
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem',
                        marginBottom: '0.35rem',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>
                        Progres: {serverQueue.currentIndex} / {serverQueue.total}{' '}
                        Tamu
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: 'var(--portal-accent)',
                        }}
                      >
                        {serverProgressPercent}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: '8px',
                        background: '#e2e8f0',
                        borderRadius: '999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${serverProgressPercent}%`,
                          background:
                            'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.5rem',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '0.5rem',
                        borderRadius: 'var(--portal-radius-md)',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '1.2rem',
                          fontWeight: 800,
                          color: '#16a34a',
                        }}
                      >
                        {serverQueue.sentCount}
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--portal-text-muted)',
                        }}
                      >
                        Terkirim
                      </div>
                    </div>
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '0.5rem',
                        borderRadius: 'var(--portal-radius-md)',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '1.2rem',
                          fontWeight: 800,
                          color: '#0f172a',
                        }}
                      >
                        {serverQueue.countdownSeconds}s
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--portal-text-muted)',
                        }}
                      >
                        Jeda Pesan
                      </div>
                    </div>
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '0.5rem',
                        borderRadius: 'var(--portal-radius-md)',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '1.2rem',
                          fontWeight: 800,
                          color: '#ef4444',
                        }}
                      >
                        {serverQueue.failedCount}
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--portal-text-muted)',
                        }}
                      >
                        Gagal
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '0.5rem',
                    }}
                  >
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
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              MODE B: BROWSER TAB / MOBILE APP FALLBACK
             ══════════════════════════════════════════════════════════════════ */}
          {activeMode === 'web_tab' && (
            <div>
              {popupBlocked && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 'var(--portal-radius-md, 8px)',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    fontSize: '0.82rem',
                    color: '#92400e',
                  }}
                >
                  <strong>⚠️ Jendela Pop-up Terblokir</strong>
                  <p style={{ margin: '0.25rem 0 0 0' }}>
                    Browser Anda memblokir pop-up otomatis. Silakan pilih &quot;Selalu
                    izinkan pop-up&quot; di pengaturan browser.
                  </p>
                </div>
              )}

              {tabStatus === 'idle' && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 'var(--portal-radius-md, 8px)',
                      padding: '0.875rem 1rem',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {isMobile
                        ? 'Kirim Manual via Aplikasi WhatsApp HP'
                        : 'Kirim via Tab WhatsApp Web (Laptop)'}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.78rem',
                        color: 'var(--portal-text-muted)',
                        lineHeight: 1.5,
                      }}
                    >
                      {isMobile
                        ? 'Mode ini akan membuka aplikasi WhatsApp resmi di HP Anda dengan nomor dan teks yang sudah terisi otomatis. Anda cukup menekan tombol Kirim di WhatsApp.'
                        : 'Mode ini akan membuka tab WhatsApp Web di browser laptop Anda secara bergantian. Anda cukup menekan tombol Kirim (Enter) untuk setiap tamu.'}
                    </p>
                  </div>

                  <div
                    style={{
                      background: '#f1f5f9',
                      padding: '1rem',
                      borderRadius: 'var(--portal-radius-md, 8px)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        Target: {targetGuests.length} Tamu
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--portal-text-muted)',
                        }}
                      >
                        {isMobile ? 'Buka WhatsApp di HP' : 'Buka WhatsApp Web'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-portal-secondary"
                      onClick={() => {
                        if (targetGuests.length === 0) return;
                        setTabStatus('running');
                        setTabIndex(0);
                        dispatchTabGuest(targetGuests[0], 0);
                        setTabCountdown(getRandomTabDelay());
                      }}
                      disabled={targetGuests.length === 0}
                    >
                      🚀 Buka Antrean
                    </button>
                  </div>
                </div>
              )}

              {tabStatus !== 'idle' && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      background: '#ecfdf5',
                      padding: '1rem',
                      borderRadius: 'var(--portal-radius-md, 8px)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        Tamu #{tabIndex + 1}: {targetGuests[tabIndex]?.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--portal-text-muted)',
                        }}
                      >
                        📱 {targetGuests[tabIndex]?.phoneNumber}
                      </div>
                    </div>
                    <div
                      style={{
                        background: '#16a34a',
                        color: '#ffffff',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '1.1rem',
                      }}
                    >
                      {tabCountdown}s
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <button
                      type="button"
                      className="btn-portal-secondary"
                      onClick={() =>
                        dispatchTabGuest(targetGuests[tabIndex], tabIndex)
                      }
                    >
                      🔗 Buka Ulang Chat WA
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
