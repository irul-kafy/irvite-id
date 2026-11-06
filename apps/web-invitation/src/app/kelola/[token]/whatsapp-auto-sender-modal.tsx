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

export function WhatsAppAutoSenderModal({
  isOpen,
  onClose,
  event,
  guests,
  accessKey,
  onGuestStatusUpdated,
  getInvitationUrl,
}: WhatsAppAutoSenderModalProps) {
  // Settings
  const [filterMode, setFilterMode] = useState<'unsent' | 'all'>('unsent');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [pacing, setPacing] = useState<DelayPacing>('relaxed');
  const [useSpintax, setUseSpintax] = useState(true);
  const [enableBatchBreak, setEnableBatchBreak] = useState(true);

  // Execution states
  const [status, setStatus] = useState<
    'idle' | 'running' | 'paused' | 'break' | 'completed' | 'stopped'
  >('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [breakCountdown, setBreakCountdown] = useState(0);
  const [sessionSentCount, setSessionSentCount] = useState(0);
  const [sessionSkippedCount, setSessionSkippedCount] = useState(0);
  const [popupBlocked, setPopupBlocked] = useState(false);

  // Active sender window reference (reuses single tab)
  const senderWindowRef = useRef<Window | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Categories available in guest list
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
      // Must have a valid phone number
      const phone = normalizeWhatsAppPhone(g.phoneNumber);
      if (!phone) return false;

      // Filter by category if selected
      if (selectedCategory !== 'ALL' && g.category !== selectedCategory) {
        return false;
      }

      // Filter by unsent vs all
      if (filterMode === 'unsent') {
        return !g.isWaSent;
      }

      return true;
    });
  }, [guests, filterMode, selectedCategory]);

  const currentGuest = targetGuests[currentIndex] || null;

  // Calculate random delay range based on pacing
  const getRandomDelay = useCallback((): number => {
    switch (pacing) {
      case 'relaxed': // 12 to 18 seconds (Recommended)
        return Math.floor(Math.random() * 7) + 12;
      case 'standard': // 8 to 12 seconds
        return Math.floor(Math.random() * 5) + 8;
      case 'fast': // 5 to 8 seconds
        return Math.floor(Math.random() * 4) + 5;
      default:
        return 12;
    }
  }, [pacing]);

  // Mark a guest as sent in UI and database
  const markGuestAsSent = useCallback(
    async (guest: PortalGuest) => {
      onGuestStatusUpdated(guest.id, true);
      try {
        await fetch(
          `/api-proxy/api/v1/client-portal/${event.id}/guests/${guest.id}/wa-status?key=${accessKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isSent: true }),
          },
        );
      } catch {
        // Handled silently
      }
    },
    [accessKey, event.id, onGuestStatusUpdated],
  );

  // Dispatch message for current guest to the dedicated sender tab
  const dispatchCurrentGuest = useCallback(
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
        // Open or reuse the single WhatsApp sender tab
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

  // Advance to next guest
  const advanceToNext = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Check if reached end of list
    const nextIdx = currentIndex + 1;
    if (nextIdx >= targetGuests.length) {
      setStatus('completed');
      setCountdown(0);
      return;
    }

    // Check if smart batch break is needed (every 30 messages)
    const newSentCount = sessionSentCount + 1;
    if (enableBatchBreak && newSentCount > 0 && newSentCount % 30 === 0) {
      setStatus('break');
      setBreakCountdown(45); // 45s restful break
      return;
    }

    // Move to next guest with fresh delay
    setCurrentIndex(nextIdx);
    const nextGuest = targetGuests[nextIdx];
    dispatchCurrentGuest(nextGuest, nextIdx);

    const delay = getRandomDelay();
    setCountdown(delay);
  }, [
    currentIndex,
    dispatchCurrentGuest,
    enableBatchBreak,
    getRandomDelay,
    sessionSentCount,
    targetGuests,
  ]);

  // Main countdown timer effect
  useEffect(() => {
    let completionTimer: NodeJS.Timeout | null = null;

    if (status === 'running') {
      if (countdown > 0) {
        timerRef.current = setTimeout(() => {
          setCountdown((prev) => prev - 1);
        }, 1000);
      } else if (countdown === 0 && currentGuest) {
        // Timer reached 0: mark current as sent and advance asynchronously
        completionTimer = setTimeout(() => {
          void markGuestAsSent(currentGuest);
          setSessionSentCount((prev) => prev + 1);
          advanceToNext();
        }, 0);
      }
    } else if (status === 'break') {
      if (breakCountdown > 0) {
        timerRef.current = setTimeout(() => {
          setBreakCountdown((prev) => prev - 1);
        }, 1000);
      } else if (breakCountdown === 0) {
        // Break finished, resume running asynchronously
        completionTimer = setTimeout(() => {
          setStatus('running');
          const nextIdx = currentIndex + 1;
          if (nextIdx < targetGuests.length) {
            setCurrentIndex(nextIdx);
            dispatchCurrentGuest(targetGuests[nextIdx], nextIdx);
            setCountdown(getRandomDelay());
          } else {
            setStatus('completed');
          }
        }, 0);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (completionTimer) {
        clearTimeout(completionTimer);
      }
    };
  }, [
    advanceToNext,
    breakCountdown,
    countdown,
    currentGuest,
    currentIndex,
    dispatchCurrentGuest,
    getRandomDelay,
    markGuestAsSent,
    status,
    targetGuests,
  ]);

  // Start queue
  const handleStartQueue = () => {
    if (targetGuests.length === 0) return;
    setStatus('running');
    setCurrentIndex(0);
    setSessionSentCount(0);
    setSessionSkippedCount(0);
    dispatchCurrentGuest(targetGuests[0], 0);
    setCountdown(getRandomDelay());
  };

  // Pause queue
  const handlePauseQueue = () => {
    setStatus('paused');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Resume queue
  const handleResumeQueue = () => {
    setStatus('running');
    if (currentGuest) {
      dispatchCurrentGuest(currentGuest, currentIndex);
      setCountdown((prev) => (prev > 0 ? prev : getRandomDelay()));
    }
  };

  // Skip current guest
  const handleSkipCurrent = () => {
    setSessionSkippedCount((prev) => prev + 1);
    advanceToNext();
  };

  // Stop queue safely
  const handleStopQueue = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus('stopped');
  };

  // Reset modal state on close
  const handleClose = () => {
    if (status === 'running' || status === 'break') {
      if (
        !window.confirm(
          'Antrean pengiriman sedang berjalan. Yakin ingin menutup panel ini? Progres tamu yang sudah terkirim tetap tersimpan.',
        )
      ) {
        return;
      }
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus('idle');
    setCountdown(0);
    onClose();
  };

  if (!isOpen) return null;

  const progressPercent =
    targetGuests.length > 0
      ? Math.round(((currentIndex + (status === 'completed' ? 1 : 0)) / targetGuests.length) * 100)
      : 0;

  // Approximate remaining minutes
  const remainingGuests = Math.max(0, targetGuests.length - currentIndex);
  const avgDelaySec = pacing === 'relaxed' ? 15 : pacing === 'standard' ? 10 : 7;
  const remainingMinutes = Math.ceil((remainingGuests * avgDelaySec) / 60);

  return (
    <div className="portal-modal-overlay" onClick={handleClose}>
      <div
        className="portal-modal-container portal-auto-sender-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        {/* Modal Header */}
        <div className="portal-modal-header" style={{ borderBottom: '1px solid var(--portal-card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🚀</span>
            <div>
              <h2 className="portal-modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                Pengirim Undangan Otomatis (Antrean Aman)
              </h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--portal-text-muted)' }}>
                Kirim undangan otomatis via WhatsApp Web langsung dari laptop Anda
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

        {/* Modal Body */}
        <div className="portal-modal-body" style={{ padding: '1.25rem 1.5rem', maxHeight: '78vh', overflowY: 'auto' }}>
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
                Browser Anda memblokir pembukaan tab WhatsApp otomatis. Silakan klik ikon gembok/pop-up di bilah URL browser Anda dan pilih <strong>&quot;Selalu izinkan pop-up dari situs ini&quot;</strong>.
              </p>
            </div>
          )}

          {/* ── STATE 1: IDLE / CONFIGURATION ── */}
          {status === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Notice Box */}
              <div
                style={{
                  background: 'var(--portal-wa-bg)',
                  border: '1px solid var(--portal-wa-border)',
                  borderRadius: 'var(--portal-radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  gap: '0.75rem',
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>🛡️</span>
                <div style={{ fontSize: '0.82rem', color: 'var(--portal-wa-dark)', lineHeight: 1.5 }}>
                  <strong>Keamanan Anti-Banned Terjamin:</strong> Pesan dikirim dari browser WhatsApp Web Anda sendiri dengan jeda acak manusiawi dan variasi sapaan otomatis agar terhindar dari deteksi spam Meta.
                </div>
              </div>

              {/* Target Selection */}
              <div>
                <label className="portal-form-label" style={{ fontWeight: 600 }}>
                  1. Pilih Target Tamu:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.4rem' }}>
                  <button
                    type="button"
                    className={`portal-filter-tab ${filterMode === 'unsent' ? 'active' : ''}`}
                    style={{ textAlign: 'center', justifyContent: 'center', padding: '0.625rem' }}
                    onClick={() => setFilterMode('unsent')}
                  >
                    Belum Terkirim ({guests.filter((g) => !g.isWaSent && g.phoneNumber).length})
                  </button>
                  <button
                    type="button"
                    className={`portal-filter-tab ${filterMode === 'all' ? 'active' : ''}`}
                    style={{ textAlign: 'center', justifyContent: 'center', padding: '0.625rem' }}
                    onClick={() => setFilterMode('all')}
                  >
                    Semua Tamu Ber-WA ({guests.filter((g) => !!g.phoneNumber).length})
                  </button>
                </div>

                {categories.length > 1 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <label className="portal-form-label" style={{ fontSize: '0.78rem' }}>
                      Filter Berdasarkan Kategori (Opsional):
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

              {/* Pacing Speed Selection */}
              <div>
                <label className="portal-form-label" style={{ fontWeight: 600 }}>
                  2. Kecepatan & Jeda Aman:
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
                      name="pacing"
                      checked={pacing === 'relaxed'}
                      onChange={() => setPacing('relaxed')}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        Santai (Jeda 12 – 18 Detik) • Sangat Direkomendasikan ⭐
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--portal-text-muted)' }}>
                        Paling aman dari deteksi spam WhatsApp. Cocok untuk ratusan tamu.
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
                      name="pacing"
                      checked={pacing === 'standard'}
                      onChange={() => setPacing('standard')}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        Standar (Jeda 8 – 12 Detik)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--portal-text-muted)' }}>
                        Keseimbangan antara kecepatan wajar dan keamanan.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Advanced Anti-Spam Options */}
              <div style={{ background: '#f9fafb', padding: '0.875rem 1rem', borderRadius: 'var(--portal-radius-md)', border: '1px solid var(--portal-card-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={useSpintax}
                    onChange={(e) => setUseSpintax(e.target.checked)}
                  />
                  Variasi Kalimat Salam Otomatis (Mencegah teks kembar berulang)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', cursor: 'pointer', marginTop: '0.5rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={enableBatchBreak}
                    onChange={(e) => setEnableBatchBreak(e.target.checked)}
                  />
                  Jeda istirahat otomatis 45 detik tiap 30 pesan terkirim
                </label>
              </div>

              {/* Ready Summary */}
              <div
                style={{
                  background: '#f3f4f6',
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--portal-radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                    Siap Mengirim: {targetGuests.length} Tamu
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--portal-text-muted)' }}>
                    Estimasi durasi total: ~{remainingMinutes} menit
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-portal-wa-auto"
                  onClick={handleStartQueue}
                  disabled={targetGuests.length === 0}
                  style={{ opacity: targetGuests.length === 0 ? 0.6 : 1 }}
                >
                  <span>🚀</span>
                  <span>Mulai Antrean</span>
                </button>
              </div>
            </div>
          )}

          {/* ── STATE 2: RUNNING / PAUSED / BREAK / COMPLETED ── */}
          {status !== 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Progress Bar & Header */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                    {status === 'completed'
                      ? '🎉 Pengiriman Selesai!'
                      : status === 'break'
                        ? '☕ Istirahat Sejenak (Anti-Spam Break)'
                        : status === 'paused'
                          ? '⏸️ Antrean Dijeda'
                          : '🚀 Sedang Mengirim...'}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--portal-primary)' }}>
                    {currentIndex + (status === 'completed' ? 1 : 0)} / {targetGuests.length} Tamu ({progressPercent}%)
                  </span>
                </div>

                <div
                  style={{
                    height: '10px',
                    width: '100%',
                    background: '#e5e7eb',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPercent}%`,
                      background: 'linear-gradient(90deg, #25d366 0%, #128c7e 100%)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Status Display Card */}
              {status === 'break' ? (
                <div
                  style={{
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    borderRadius: 'var(--portal-radius-md)',
                    padding: '1.25rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>☕</div>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: '#92400e' }}>
                    Jeda Istirahat Otomatis ({breakCountdown}s)
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#78350f' }}>
                    Sistem sedang beristirahat 45 detik agar pola pengiriman tetap wajar bagi WhatsApp. Antrean akan otomatis lanjut sendiri.
                  </p>
                </div>
              ) : status === 'completed' ? (
                <div
                  style={{
                    background: 'var(--portal-success-bg)',
                    border: '1px solid var(--portal-success-border)',
                    borderRadius: 'var(--portal-radius-md)',
                    padding: '1.5rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--portal-success-text)' }}>
                    Seluruh Undangan Berhasil Diproses!
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--portal-text-muted)' }}>
                    Total {sessionSentCount} undangan telah berhasil dibuka dan dikirim melalui WhatsApp Web Anda.
                  </p>
                </div>
              ) : currentGuest ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid var(--portal-wa-border)',
                    borderRadius: 'var(--portal-radius-lg)',
                    padding: '1.25rem',
                    boxShadow: 'var(--portal-shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          background: 'var(--portal-wa-bg)',
                          color: 'var(--portal-wa-dark)',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontWeight: 700,
                        }}
                      >
                        Tamu Saat Ini • Antrean #{currentIndex + 1}
                      </span>
                      <h3 style={{ margin: '0.4rem 0 0.2rem 0', fontSize: '1.1rem', color: 'var(--portal-text-main)' }}>
                        {currentGuest.name}
                      </h3>
                      <div style={{ fontSize: '0.85rem', color: 'var(--portal-text-muted)' }}>
                        📱 {currentGuest.phoneNumber || '-'} • Kategori: {currentGuest.category}
                      </div>
                    </div>

                    {/* Countdown Badge */}
                    {status === 'running' && (
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
                          color: '#ffffff',
                          borderRadius: 'var(--portal-radius-md)',
                          padding: '0.5rem 0.875rem',
                          textAlign: 'center',
                          minWidth: '85px',
                        }}
                      >
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{countdown}s</div>
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.85 }}>Jeda Aman</div>
                      </div>
                    )}
                  </div>

                  {/* Instruction banner */}
                  <div
                    style={{
                      background: '#f9fafb',
                      borderRadius: 'var(--portal-radius-sm)',
                      padding: '0.625rem 0.875rem',
                      marginTop: '0.875rem',
                      fontSize: '0.78rem',
                      color: 'var(--portal-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span>💡</span>
                    <span>
                      Tab WhatsApp Web telah dibuka. Cukup tekan <strong>Kirim (Enter)</strong> di WhatsApp, tab akan berpindah otomatis saat hitung mundur selesai!
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Action Buttons Toolbar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f3f4f6',
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--portal-radius-md)',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--portal-text-muted)' }}>
                  Sesi: <strong>{sessionSentCount}</strong> terkirim • <strong>{sessionSkippedCount}</strong> dilewati
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {status === 'running' && (
                    <>
                      <button
                        type="button"
                        className="btn-portal-secondary"
                        onClick={handleSkipCurrent}
                        title="Lewati tamu ini dan lanjut ke tamu berikutnya"
                      >
                        ⏭️ Lewati
                      </button>
                      <button
                        type="button"
                        className="btn-portal-secondary"
                        onClick={handlePauseQueue}
                        style={{ background: '#fef3c7', borderColor: '#fde68a', color: '#92400e' }}
                      >
                        ⏸️ Jeda
                      </button>
                    </>
                  )}

                  {status === 'paused' && (
                    <button
                      type="button"
                      className="btn-portal-primary"
                      onClick={handleResumeQueue}
                    >
                      ▶️ Lanjutkan
                    </button>
                  )}

                  {(status === 'running' || status === 'paused' || status === 'break') && (
                    <button
                      type="button"
                      className="btn-portal-secondary"
                      onClick={handleStopQueue}
                      style={{ color: '#dc2626' }}
                    >
                      ⏹️ Berhenti
                    </button>
                  )}

                  {(status === 'completed' || status === 'stopped') && (
                    <button
                      type="button"
                      className="btn-portal-primary"
                      onClick={handleClose}
                    >
                      Selesai & Tutup
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
