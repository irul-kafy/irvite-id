'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { PortalGuest, PortalEvent } from './client-portal-view';
import {
  buildAutoSenderWhatsAppUrl,
  generateSpintaxMessage,
  normalizeWhatsAppPhone,
} from '@/utils/whatsapp-share';

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
  // Mobile device detection
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }, []);

  // Filter settings
  const [filterMode, setFilterMode] = useState<'unsent' | 'all'>('unsent');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [templateVariant, setTemplateVariant] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Categories available in guest list
  const categories = useMemo(() => {
    const set = new Set<string>();
    guests.forEach((g) => {
      if (g.category) set.add(g.category);
    });
    return Array.from(set);
  }, [guests]);

  // Target guests matching active filters
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

  // Safe current guest pointer
  const safeIndex = Math.min(currentIndex, Math.max(0, targetGuests.length - 1));
  const currentGuest: PortalGuest | null = targetGuests[safeIndex] || null;

  // Persist WA status to backend and UI
  const markAsSentInBackend = useCallback(
    async (guestId: string) => {
      onGuestStatusUpdated(guestId, true);
      try {
        await fetch(
          `/api-proxy/api/v1/client-portal/${event.id}/guests/${guestId}/wa-status?key=${accessKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isSent: true }),
          },
        );
      } catch {
        // Background failure ignored
      }
    },
    [accessKey, event.id, onGuestStatusUpdated],
  );

  // Current preview message
  const previewMessage = useMemo(() => {
    if (!currentGuest || !currentGuest.invitation?.uniqueCode) return '';
    const invitationUrl = getInvitationUrl(currentGuest.invitation.uniqueCode);
    return generateSpintaxMessage(
      currentGuest.name,
      event.title,
      invitationUrl,
      templateVariant,
      currentGuest.customGreeting,
    );
  }, [currentGuest, event.title, getInvitationUrl, templateVariant]);

  // Action: Kirim ke WhatsApp & Otomatis Maju ke Tamu Berikutnya
  const handleSendAndNext = () => {
    if (!currentGuest || !currentGuest.invitation?.uniqueCode) return;
    const invitationUrl = getInvitationUrl(currentGuest.invitation.uniqueCode);

    const waUrl = buildAutoSenderWhatsAppUrl(
      currentGuest.name,
      event.title,
      invitationUrl,
      currentGuest.phoneNumber,
      templateVariant,
      currentGuest.customGreeting,
      isMobile,
    );

    // Open WhatsApp
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Mark as sent
    void markAsSentInBackend(currentGuest.id);

    // Auto-advance to next guest
    if (safeIndex < targetGuests.length - 1) {
      setCurrentIndex(safeIndex + 1);
    }
  };

  // Action: Salin Pesan Lengkap
  const handleCopyMessage = async () => {
    if (!previewMessage) return;
    try {
      await navigator.clipboard.writeText(previewMessage);
      setCopyFeedback('✅ Pesan berhasil disalin!');
    } catch {
      setCopyFeedback('Gagal menyalin teks');
    }
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  // Action: Salin Tautan Undangan Saja
  const handleCopyLinkOnly = async () => {
    if (!currentGuest?.invitation?.uniqueCode) return;
    const url = getInvitationUrl(currentGuest.invitation.uniqueCode);
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback('✅ Tautan berhasil disalin!');
    } catch {
      setCopyFeedback('Gagal menyalin tautan');
    }
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  if (!isOpen) return null;

  const totalTarget = targetGuests.length;
  const progressPercent =
    totalTarget > 0 ? Math.round(((safeIndex + 1) / totalTarget) * 100) : 0;

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
        {/* Header */}
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
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--portal-text-main, #0f172a)',
                }}
              >
                Asisten Kirim Cepat WhatsApp
              </h2>
              <p
                style={{
                  margin: '0.2rem 0 0 0',
                  fontSize: '0.78rem',
                  color: 'var(--portal-text-muted, #64748b)',
                }}
              >
                Kirim berurutan dengan 1-klik, 100% aman anti-banned
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

        {/* Modal Body */}
        <div
          className="portal-modal-body"
          style={{ padding: '1.25rem', overflowY: 'auto' }}
        >
          {/* Keamanan Anti-Banned Notice */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--portal-radius-md, 8px)',
              padding: '0.875rem 1rem',
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 700,
                color: '#166534',
                fontSize: '0.85rem',
              }}
            >
              <span>🛡️</span>
              <span>100% Bebas Risiko Blokir Meta</span>
            </div>
            <p
              style={{
                margin: '0.25rem 0 0 0',
                fontSize: '0.78rem',
                color: '#14532d',
                lineHeight: 1.45,
              }}
            >
              Undangan dibuka langsung di aplikasi WhatsApp resmi Anda dengan nomor
              tujuan &amp; sapaan nama tamu yang sudah terisi otomatis. Anda cukup
              menekan tombol kirim hijau di WhatsApp.
            </p>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <button
              type="button"
              className={`portal-filter-btn ${filterMode === 'unsent' ? 'is-active' : ''}`}
              onClick={() => {
                setFilterMode('unsent');
                setCurrentIndex(0);
              }}
              style={{ padding: '0.5rem', fontSize: '0.8rem' }}
            >
              Belum Terkirim ({guests.filter((g) => !g.isWaSent && g.phoneNumber).length})
            </button>
            <button
              type="button"
              className={`portal-filter-btn ${filterMode === 'all' ? 'is-active' : ''}`}
              onClick={() => {
                setFilterMode('all');
                setCurrentIndex(0);
              }}
              style={{ padding: '0.5rem', fontSize: '0.8rem' }}
            >
              Semua Tamu Ber-WA ({guests.filter((g) => g.phoneNumber).length})
            </button>
          </div>

          {categories.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <label
                className="portal-form-label"
                style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}
              >
                Kategori Tamu:
              </label>
              <select
                className="portal-form-select"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentIndex(0);
                }}
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
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

          {/* Empty State */}
          {totalTarget === 0 && (
            <div
              style={{
                padding: '2.5rem 1rem',
                textAlign: 'center',
                color: 'var(--portal-text-muted)',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
              <h3 style={{ fontSize: '1rem', margin: '0 0 0.25rem 0' }}>
                Semua Undangan Sudah Terkirim!
              </h3>
              <p style={{ fontSize: '0.8rem', margin: 0 }}>
                Tidak ada tamu yang berstatus belum terkirim pada filter ini.
              </p>
            </div>
          )}

          {/* Active Guest Card */}
          {currentGuest && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              {/* Progress Indicator */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    marginBottom: '0.35rem',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    Tamu #{safeIndex + 1} dari {totalTarget}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--portal-accent)' }}>
                    {progressPercent}%
                  </span>
                </div>
                <div
                  style={{
                    height: '7px',
                    background: '#e2e8f0',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPercent}%`,
                      background:
                        'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                      transition: 'width 0.25s ease',
                    }}
                  />
                </div>
              </div>

              {/* Guest Profile Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--portal-radius-md, 8px)',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: 'var(--portal-text-main)',
                    }}
                  >
                    {currentGuest.name}
                  </div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--portal-text-muted)',
                      marginTop: '0.2rem',
                    }}
                  >
                    📱 {normalizeWhatsAppPhone(currentGuest.phoneNumber)}
                    {currentGuest.tableNumber ? ` • Meja ${currentGuest.tableNumber}` : ''}
                    {currentGuest.maxPax ? ` • ${currentGuest.maxPax} Pax` : ''}
                  </div>
                </div>

                <div>
                  {currentGuest.isWaSent ? (
                    <span className="portal-badge badge-sent" style={{ fontSize: '0.75rem' }}>
                      ✓ Sudah Terkirim
                    </span>
                  ) : (
                    <span className="portal-badge badge-pending" style={{ fontSize: '0.75rem' }}>
                      ⏳ Belum Dikirim
                    </span>
                  )}
                </div>
              </div>

              {/* Template Style Selector */}
              <div>
                <label
                  className="portal-form-label"
                  style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}
                >
                  Gaya Bahasa Undangan:
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '0.35rem',
                  }}
                >
                  {[
                    { id: 0, label: 'Formal' },
                    { id: 1, label: 'Hangat' },
                    { id: 2, label: 'Keluarga' },
                    { id: 3, label: 'Ringkas' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`portal-filter-btn ${templateVariant === v.id ? 'is-active' : ''}`}
                      onClick={() => setTemplateVariant(v.id)}
                      style={{ padding: '0.4rem', fontSize: '0.75rem' }}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Preview Box */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.25rem',
                  }}
                >
                  <label
                    className="portal-form-label"
                    style={{ fontSize: '0.78rem', margin: 0 }}
                  >
                    Pratinjau Pesan yang Akan Terkirim:
                  </label>
                  {copyFeedback && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#16a34a',
                      }}
                    >
                      {copyFeedback}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    fontSize: '0.78rem',
                    color: '#334155',
                    maxHeight: '130px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.45,
                    fontFamily: 'inherit',
                  }}
                >
                  {previewMessage}
                </div>
              </div>

              {/* Main Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  marginTop: '0.25rem',
                }}
              >
                {/* Primary: 1-Click Send to WhatsApp */}
                <button
                  type="button"
                  className="btn-portal-wa-auto"
                  onClick={handleSendAndNext}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>🟢</span>
                  <span>
                    Buka WhatsApp &amp; Lanjut Tamu Berikutnya (1-Klik)
                  </span>
                </button>

                {/* Secondary Actions: Copy Message & Copy Link */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                  }}
                >
                  <button
                    type="button"
                    className="btn-portal-secondary"
                    onClick={handleCopyMessage}
                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                  >
                    📋 Salin Pesan Lengkap
                  </button>
                  <button
                    type="button"
                    className="btn-portal-secondary"
                    onClick={handleCopyLinkOnly}
                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                  >
                    🔗 Salin Tautan Saja
                  </button>
                </div>
              </div>

              {/* Navigation Pagination */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #e2e8f0',
                  marginTop: '0.25rem',
                }}
              >
                <button
                  type="button"
                  className="btn-portal-secondary"
                  disabled={safeIndex <= 0}
                  onClick={() => setCurrentIndex(Math.max(0, safeIndex - 1))}
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                >
                  ◀ Sebelumnya
                </button>

                <span style={{ fontSize: '0.78rem', color: 'var(--portal-text-muted)' }}>
                  {safeIndex + 1} / {totalTarget}
                </span>

                <button
                  type="button"
                  className="btn-portal-secondary"
                  disabled={safeIndex >= totalTarget - 1}
                  onClick={() =>
                    setCurrentIndex(Math.min(totalTarget - 1, safeIndex + 1))
                  }
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                >
                  Lewati / Berikutnya ▶
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
