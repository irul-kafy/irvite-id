'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  buildWhatsAppShareUrl,
  buildPublicCustomInvitationUrl,
  buildPublicGroupWhatsAppShareUrl,
  generatePublicBroadcastMessage,
  generateGuestsCsv,
  generateSpintaxMessage,
  normalizeWhatsAppPhone,
  type PublicBroadcastTone,
} from '@/utils/whatsapp-share';
import { WhatsAppAutoSenderModal } from './whatsapp-auto-sender-modal';

export interface PortalInvitation {
  id: string;
  uniqueCode: string;
  status: 'PENDING' | 'SENT' | 'OPENED' | 'RSVP_YES' | 'RSVP_NO';
  rsvpPax: number | null;
  updatedAt: string;
}

export interface PortalGuest {
  id: string;
  name: string;
  category: string;
  phoneNumber: string | null;
  email: string | null;
  tableNumber: string | null;
  maxPax: number;
  customGreeting: string | null;
  createdAt: string;
  invitation: PortalInvitation | null;
  isWaSent: boolean;
  hasAttended: boolean;
}

export interface PortalEvent {
  id: string;
  title: string;
  slug: string;
  eventDate: string;
  status: string;
  locationDetails: string | null;
  clientKey: string;
}

export interface PortalWish {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}

export interface PortalStats {
  totalGuests: number;
  totalPax: number;
  waSentCount: number;
  waPendingCount: number;
  rsvpYesCount: number;
  rsvpYesPax: number;
  rsvpNoCount: number;
  rsvpPendingCount: number;
  attendedCount: number;
  wishesCount?: number;
}

interface ClientPortalViewProps {
  initialEvent: PortalEvent;
  initialStats: PortalStats;
  initialGuests: PortalGuest[];
  initialWishes?: PortalWish[];
  accessKey: string;
}

type FilterTab = 'all' | 'wa_unsent' | 'wa_sent' | 'rsvp_yes' | 'rsvp_pending';

export function ClientPortalView({
  initialEvent,
  initialStats,
  initialGuests,
  initialWishes = [],
  accessKey,
}: ClientPortalViewProps) {
  const [event] = useState<PortalEvent>(initialEvent);
  const [guests, setGuests] = useState<PortalGuest[]>(initialGuests);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [publicRecipientLabel, setPublicRecipientLabel] = useState('');
  const [publicBroadcastTone, setPublicBroadcastTone] = useState<PublicBroadcastTone>('formal');
  const [customBroadcastText, setCustomBroadcastText] = useState<string | null>(null);
  const [wishSearchQuery, setWishSearchQuery] = useState('');
  const [clientOrigin, setClientOrigin] = useState('');

  const filteredWishes = useMemo(() => {
    if (!wishSearchQuery.trim()) return initialWishes;
    const q = wishSearchQuery.toLowerCase();
    return initialWishes.filter(
      (w) =>
        w.name.toLowerCase().includes(q) || w.message.toLowerCase().includes(q),
    );
  }, [initialWishes, wishSearchQuery]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setClientOrigin(window.location.origin);
    }
  }, []);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<PortalGuest | null>(null);
  const [deletingGuest, setDeletingGuest] = useState<PortalGuest | null>(null);
  const [isAutoSenderOpen, setIsAutoSenderOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleGuestStatusUpdated = useCallback((guestId: string, isSent: boolean) => {
    setGuests((prev) =>
      prev.map((g) =>
        g.id === guestId
          ? {
              ...g,
              isWaSent: isSent,
              invitation: g.invitation
                ? {
                    ...g.invitation,
                    status:
                      g.invitation.status === 'PENDING'
                        ? 'SENT'
                        : g.invitation.status,
                  }
                : null,
            }
          : g,
      ),
    );
  }, []);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    category: 'REGULAR',
    phoneNumber: '',
    tableNumber: '',
    maxPax: 1,
    customGreeting: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Recalculate stats live
  const stats = useMemo(() => {
    let totalPax = 0;
    let waSentCount = 0;
    let waPendingCount = 0;
    let rsvpYesCount = 0;
    let rsvpYesPax = 0;
    let rsvpNoCount = 0;
    let rsvpPendingCount = 0;
    let attendedCount = 0;

    for (const g of guests) {
      totalPax += g.maxPax || 1;
      if (g.isWaSent) {
        waSentCount++;
      } else {
        waPendingCount++;
      }

      const invStatus = g.invitation?.status;
      if (invStatus === 'RSVP_YES') {
        rsvpYesCount++;
        rsvpYesPax += g.invitation?.rsvpPax || g.maxPax || 1;
      } else if (invStatus === 'RSVP_NO') {
        rsvpNoCount++;
      } else {
        rsvpPendingCount++;
      }

      if (g.hasAttended) attendedCount++;
    }

    return {
      totalGuests: guests.length,
      totalPax,
      waSentCount,
      waPendingCount,
      rsvpYesCount,
      rsvpYesPax,
      rsvpNoCount,
      rsvpPendingCount,
      attendedCount,
    };
  }, [guests]);

  // Filter & Search
  const filteredGuests = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return guests.filter((g) => {
      // Search
      if (q) {
        const matchName = g.name.toLowerCase().includes(q);
        const matchPhone = g.phoneNumber && g.phoneNumber.includes(q);
        const matchTable = g.tableNumber && g.tableNumber.toLowerCase().includes(q);
        const matchCat = g.category.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchTable && !matchCat) {
          return false;
        }
      }

      // Filter tabs
      if (activeFilter === 'wa_unsent') return !g.isWaSent;
      if (activeFilter === 'wa_sent') return g.isWaSent;
      if (activeFilter === 'rsvp_yes') return g.invitation?.status === 'RSVP_YES';
      if (activeFilter === 'rsvp_pending') {
        const s = g.invitation?.status;
        return s === 'PENDING' || s === 'SENT' || s === 'OPENED';
      }

      return true;
    });
  }, [guests, searchQuery, activeFilter]);

  const getInvitationUrl = (uniqueCode: string): string => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/i/${encodeURIComponent(uniqueCode)}`;
    }
    return `/i/${encodeURIComponent(uniqueCode)}`;
  };

  const getBasePublicEventUrl = () => {
    const path = `/e/${encodeURIComponent(event.slug)}`;
    return clientOrigin ? `${clientOrigin}${path}` : path;
  };

  const customPublicUrl = buildPublicCustomInvitationUrl(
    getBasePublicEventUrl(),
    publicRecipientLabel,
  );

  const generatedPublicBroadcastMessage = useMemo(
    () =>
      generatePublicBroadcastMessage(
        publicRecipientLabel,
        event.title,
        getBasePublicEventUrl(),
        publicBroadcastTone,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [publicRecipientLabel, event.title, event.slug, clientOrigin, publicBroadcastTone],
  );

  const activePublicBroadcastMessage =
    customBroadcastText !== null ? customBroadcastText : generatedPublicBroadcastMessage;

  const handleCopyPublicCustomUrl = async () => {
    try {
      await navigator.clipboard.writeText(customPublicUrl);
      showToast(
        publicRecipientLabel.trim()
          ? `Link publik untuk "${publicRecipientLabel.trim()}" berhasil disalin!`
          : 'Link publik undangan berhasil disalin!',
      );
    } catch {
      showToast('Gagal menyalin link otomatis. Silakan salin manual.');
    }
  };

  const handleCopyPublicBroadcastMessage = async () => {
    try {
      await navigator.clipboard.writeText(activePublicBroadcastMessage);
      showToast('Kata-kata pengantar beserta link undangan berhasil disalin!');
    } catch {
      showToast('Gagal menyalin pesan otomatis. Silakan salin manual dari kotak pesan.');
    }
  };

  const handleSharePublicGroupWa = () => {
    const waUrl = buildPublicGroupWhatsAppShareUrl(
      publicRecipientLabel,
      event.title,
      getBasePublicEventUrl(),
      publicBroadcastTone,
      customBroadcastText,
    );
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // WhatsApp Share Action
  const handleShareWhatsApp = async (guest: PortalGuest) => {
    if (!guest.invitation?.uniqueCode) {
      showToast('Undangan tamu belum siap.');
      return;
    }

    const invitationUrl = getInvitationUrl(guest.invitation.uniqueCode);
    const waUrl = buildWhatsAppShareUrl(
      guest.name,
      event.title,
      invitationUrl,
      guest.phoneNumber,
      guest.customGreeting,
    );

    // Open WhatsApp in new tab / app
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Immediately mark as sent in UI
    setGuests((prev) =>
      prev.map((g) =>
        g.id === guest.id
          ? {
              ...g,
              isWaSent: true,
              invitation: g.invitation
                ? {
                    ...g.invitation,
                    status:
                      g.invitation.status === 'PENDING'
                        ? 'SENT'
                        : g.invitation.status,
                  }
                : null,
            }
          : g,
      ),
    );

    showToast(`WhatsApp untuk ${guest.name} dibuka! Status ditandai terkirim.`);

    // Persist to backend
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
      // Background failure ignored
    }
  };

  // Copy Link Action
  const handleCopyLink = async (guest: PortalGuest) => {
    if (!guest.invitation?.uniqueCode) return;
    const url = getInvitationUrl(guest.invitation.uniqueCode);
    try {
      await navigator.clipboard.writeText(url);
      showToast(`Tautan undangan untuk ${guest.name} berhasil disalin!`);
    } catch {
      // Fallback
      prompt('Salin tautan berikut:', url);
    }
  };

  // Copy Full Invitation Message Action
  const handleCopyMessage = async (guest: PortalGuest) => {
    if (!guest.invitation?.uniqueCode) return;
    const url = getInvitationUrl(guest.invitation.uniqueCode);
    const msg = generateSpintaxMessage(
      guest.name,
      event.title,
      url,
      0,
      guest.customGreeting,
    );
    try {
      await navigator.clipboard.writeText(msg);
      showToast(`Pesan undangan untuk ${guest.name} berhasil disalin!`);
    } catch {
      prompt('Salin pesan berikut:', msg);
    }
  };

  // Export CSV Action
  const handleExportCsv = () => {
    const csvRows = guests.map((g) => {
      let rsvpStatus = 'Belum Respon';
      if (g.invitation?.status === 'RSVP_YES') rsvpStatus = 'Hadir';
      if (g.invitation?.status === 'RSVP_NO') rsvpStatus = 'Tidak Hadir';

      return {
        name: g.name,
        category: g.category,
        phoneNumber: g.phoneNumber,
        tableNumber: g.tableNumber,
        maxPax: g.maxPax,
        isWaSent: g.isWaSent,
        rsvpStatus,
        rsvpPax: g.invitation?.rsvpPax,
        invitationUrl: g.invitation ? getInvitationUrl(g.invitation.uniqueCode) : '',
      };
    });

    const csvContent = generateGuestsCsv(csvRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Daftar_Tamu_${event.slug || 'undangan'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Berkas CSV berhasil diunduh!');
  };

  // Open Modal Create
  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      category: 'REGULAR',
      phoneNumber: '',
      tableNumber: '',
      maxPax: 1,
      customGreeting: '',
    });
    setIsAddModalOpen(true);
  };

  // Open Modal Edit
  const handleOpenEditModal = (guest: PortalGuest) => {
    setEditingGuest(guest);
    setFormData({
      name: guest.name,
      category: guest.category || 'REGULAR',
      phoneNumber: guest.phoneNumber || '',
      tableNumber: guest.tableNumber || '',
      maxPax: guest.maxPax || 1,
      customGreeting: guest.customGreeting || '',
    });
  };

  // Submit Save Guest (Add or Edit)
  const handleSubmitGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Nama tamu wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingGuest) {
        // PATCH
        const res = await fetch(
          `/api-proxy/api/v1/client-portal/${event.id}/guests/${editingGuest.id}?key=${accessKey}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.name.trim(),
              category: formData.category,
              phoneNumber: formData.phoneNumber.trim() || null,
              tableNumber: formData.tableNumber.trim() || null,
              maxPax: Number(formData.maxPax) || 1,
              customGreeting: formData.customGreeting.trim() || null,
            }),
          },
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Gagal memperbarui tamu');
        }

        const updated: PortalGuest = await res.json();
        setGuests((prev) =>
          prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)),
        );
        showToast(`Tamu "${updated.name}" berhasil diperbarui.`);
        setEditingGuest(null);
      } else {
        // POST
        const res = await fetch(
          `/api-proxy/api/v1/client-portal/${event.id}/guests?key=${accessKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.name.trim(),
              category: formData.category,
              phoneNumber: formData.phoneNumber.trim() || null,
              tableNumber: formData.tableNumber.trim() || null,
              maxPax: Number(formData.maxPax) || 1,
              customGreeting: formData.customGreeting.trim() || null,
            }),
          },
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Gagal menambahkan tamu');
        }

        const created: PortalGuest = await res.json();
        setGuests((prev) => [created, ...prev]);
        showToast(`Tamu "${created.name}" berhasil ditambahkan!`);
        setIsAddModalOpen(false);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Delete Guest
  const handleConfirmDelete = async () => {
    if (!deletingGuest) return;
    setIsSaving(true);

    try {
      const res = await fetch(
        `/api-proxy/api/v1/client-portal/${event.id}/guests/${deletingGuest.id}?key=${accessKey}`,
        {
          method: 'DELETE',
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Gagal menghapus tamu');
      }

      setGuests((prev) => prev.filter((g) => g.id !== deletingGuest.id));
      showToast(`Tamu "${deletingGuest.name}" dihapus.`);
      setDeletingGuest(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setIsSaving(false);
    }
  };

  // Format event date
  const eventDateFormatted = useMemo(() => {
    try {
      const d = new Date(event.eventDate);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return event.eventDate;
    }
  }, [event.eventDate]);

  return (
    <div className="portal-root">
      {/* Top Navigation Bar */}
      <header className="portal-topbar">
        <div className="portal-topbar-brand">
          <span className="portal-brand-title">IRVITE</span>
          <span className="portal-brand-badge">Portal Pengantin</span>
        </div>
        <div className="portal-topbar-actions">
          {event.slug && (
            <Link
              href={`/e/${event.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="portal-preview-link"
            >
              <span>Lihat Undangan</span>
              <span>↗</span>
            </Link>
          )}
        </div>
      </header>

      <main className="portal-container">
        {/* Hero / Event Card */}
        <section className="portal-hero">
          <div className="portal-hero-header">
            <div>
              <span className="portal-hero-tag">Kelola Undangan Pernikahan</span>
              <h1 className="portal-hero-title">{event.title}</h1>
              <div className="portal-hero-meta">
                <span className="portal-hero-meta-item">
                  <span>📅</span>
                  <span>{eventDateFormatted}</span>
                </span>
                {event.locationDetails && (
                  <span className="portal-hero-meta-item">
                    <span>📍</span>
                    <span>{event.locationDetails}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="portal-hero-desc">
            Bagikan undangan langsung ke WhatsApp tamu Anda hanya dengan satu sentuhan.
            Tamu akan menerima salam pembuka yang ramah beserta tautan undangan pribadi mereka.
          </p>
        </section>

        {/* Custom Public Link Generator for Groups / Social Media / Communities */}
        {event.slug && (
          <section
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1.25rem 1.35rem',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🌐</span>
                  <span>Generator Link Publik Custom (Grup WA / Followers / Komunitas)</span>
                </strong>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.45 }}>
                  Ubah sapaan <em>&ldquo;Bapak / Ibu / Saudara / i&rdquo;</em> pada sampul link publik menjadi nama grup, alumni, rekan kantor, atau followers media sosial (tanpa tiket QR/RSVP personal).
                </p>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '999px',
                  background: '#f1f5f9',
                  color: '#334155',
                  fontWeight: 600,
                }}
              >
                Sapaan Sampul: {publicRecipientLabel.trim() || 'Bapak / Ibu / Saudara/i'}
              </span>
            </div>

            {/* Preset Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {[
                { label: 'Default (Bapak/Ibu)', value: '' },
                { label: 'Keluarga Besar & Kerabat', value: 'Keluarga Besar & Kerabat' },
                { label: 'Sahabat & Teman-teman', value: 'Sahabat & Teman-teman' },
                { label: 'Followers & Sahabat Online', value: 'Followers & Sahabat Online' },
                { label: 'Rekan Kerja & Kolega', value: 'Rekan Kerja & Kolega' },
                { label: 'Keluarga Besar Alumni', value: 'Keluarga Besar Alumni' },
              ].map((preset) => {
                const isSelected = publicRecipientLabel === preset.value;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setPublicRecipientLabel(preset.value)}
                    style={{
                      padding: '0.3rem 0.7rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: isSelected ? '1px solid #0f172a' : '1px solid #cbd5e1',
                      background: isSelected ? '#0f172a' : '#f8fafc',
                      color: isSelected ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Input + Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
              <input
                type="text"
                maxLength={60}
                value={publicRecipientLabel}
                onChange={(e) => setPublicRecipientLabel(e.target.value)}
                placeholder="Ketik nama grup / penerima (misal: Grup Alumni SMAN 8, Tim Finance, Followers IG)..."
                style={{
                  flex: '1 1 260px',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '9px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                }}
              />
              <button
                type="button"
                className="btn-portal-secondary"
                onClick={handleCopyPublicCustomUrl}
              >
                <span>🔗</span>
                <span>Salin Link</span>
              </button>
              <a
                href={customPublicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-portal-secondary"
                style={{ textDecoration: 'none' }}
              >
                <span>↗</span>
                <span>Lihat Sampul</span>
              </a>
            </div>

            {/* Kata-kata Pengantar Undangan (Editable Broadcast Copy) */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.9rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
                  ✍️ Kata-kata Pengantar Undangan (Bisa Diedit)
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                  {(
                    [
                      { id: 'formal', label: 'Formal' },
                      { id: 'casual', label: 'Santai Grup' },
                      { id: 'social', label: 'Sosmed / Followers' },
                      { id: 'islamic', label: 'Islami' },
                    ] as const
                  ).map((toneOption) => {
                    const active = publicBroadcastTone === toneOption.id && customBroadcastText === null;
                    return (
                      <button
                        key={toneOption.id}
                        type="button"
                        onClick={() => {
                          setPublicBroadcastTone(toneOption.id);
                          setCustomBroadcastText(null);
                        }}
                        style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          border: active ? '1px solid #0f172a' : '1px solid #cbd5e1',
                          background: active ? '#0f172a' : '#ffffff',
                          color: active ? '#ffffff' : '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        {toneOption.label}
                      </button>
                    );
                  })}
                  {customBroadcastText !== null && (
                    <button
                      type="button"
                      onClick={() => setCustomBroadcastText(null)}
                      style={{
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        border: '1px solid #fecaca',
                        background: '#fef2f2',
                        color: '#b91c1c',
                        cursor: 'pointer',
                      }}
                    >
                      Reset Teks
                    </button>
                  )}
                </div>
              </div>

              <textarea
                rows={7}
                value={activePublicBroadcastMessage}
                onChange={(e) => setCustomBroadcastText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                  color: '#0f172a',
                  background: '#ffffff',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-portal-primary"
                  onClick={handleCopyPublicBroadcastMessage}
                >
                  <span>📋</span>
                  <span>Salin Kata-kata + Link</span>
                </button>
                <button
                  type="button"
                  className="btn-portal-wa-auto"
                  onClick={handleSharePublicGroupWa}
                >
                  <span>💬</span>
                  <span>Share ke Grup WA</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Offline / Draft Status Notice for Couple */}
        {event.status === 'DRAFT' && (
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>ℹ️</span>
            <div>
              <strong style={{ fontSize: '0.9375rem', display: 'block', marginBottom: '0.125rem' }}>
                Tautan Undangan Tamu Sedang Offline (Draf)
              </strong>
              <span style={{ fontSize: '0.8125rem', color: '#b45309', lineHeight: 1.4 }}>
                Admin belum mengaktifkan tautan undangan digital secara online. Anda tetap leluasa menambahkan dan menyusun daftar tamu di sini, namun tautan undangan pribadi tamu belum dapat dibuka oleh tamu sampai admin mengaktifkannya.
              </span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <section className="portal-stats-grid">
          <div className="portal-stat-card">
            <span className="portal-stat-label">👥 Total Tamu</span>
            <span className="portal-stat-value">{stats.totalGuests}</span>
            <span className="portal-stat-sub">Kapasitas: {stats.totalPax} Pax</span>
          </div>

          <div className="portal-stat-card stat-success">
            <span className="portal-stat-label">💬 Sudah Kirim WA</span>
            <span className="portal-stat-value">{stats.waSentCount}</span>
            <span className="portal-stat-sub">
              {stats.totalGuests > 0
                ? `${Math.round((stats.waSentCount / stats.totalGuests) * 100)}% selesai`
                : '0%'}
            </span>
          </div>

          <div
            className={`portal-stat-card ${
              stats.waPendingCount > 0 ? 'stat-urgent' : ''
            }`}
          >
            <span className="portal-stat-label">⏳ Belum Kirim WA</span>
            <span className="portal-stat-value">{stats.waPendingCount}</span>
            <span className="portal-stat-sub">Perlu dibagikan</span>
          </div>

          <div className="portal-stat-card stat-success">
            <span className="portal-stat-label">✅ Konfirmasi Hadir</span>
            <span className="portal-stat-value">{stats.rsvpYesCount}</span>
            <span className="portal-stat-sub">{stats.rsvpYesPax} Pax hadir</span>
          </div>

          <div className="portal-stat-card">
            <span className="portal-stat-label">❓ Belum Respon</span>
            <span className="portal-stat-value">{stats.rsvpPendingCount}</span>
            <span className="portal-stat-sub">Menunggu RSVP</span>
          </div>

          <div className="portal-stat-card">
            <span className="portal-stat-label">💌 Doa &amp; Ucapan</span>
            <span className="portal-stat-value">{initialWishes.length}</span>
            <span className="portal-stat-sub">Pesan dari tamu</span>
          </div>
        </section>

        {/* Toolbar: Search, Filters, Actions */}
        <section className="portal-toolbar">
          {/* Top Row: Search (Left) & Actions (Right) */}
          <div className="portal-toolbar-top">
            <div className="portal-search-wrap">
              <span className="portal-search-icon">🔍</span>
              <input
                type="text"
                className="portal-search-input"
                placeholder="Cari nama, nomor WA, atau meja..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="portal-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Hapus pencarian"
                  aria-label="Hapus pencarian"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="portal-toolbar-actions">
              <button
                type="button"
                className="btn-portal-secondary"
                onClick={handleExportCsv}
                title="Unduh daftar tamu ke format CSV / Excel"
              >
                <span>📥</span>
                <span>Unduh CSV</span>
              </button>

              <button
                type="button"
                id="btn-open-auto-sender"
                className="btn-portal-wa-auto"
                onClick={() => setIsAutoSenderOpen(true)}
                title="Asisten kirim undangan WhatsApp cepat berurutan"
              >
                <span>⚡</span>
                <span>Asisten Kirim Cepat WA</span>
              </button>

              <button
                type="button"
                className="btn-portal-primary"
                onClick={handleOpenAddModal}
              >
                <span>+</span>
                <span>Tambah Tamu</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="portal-toolbar-divider" />

          {/* Bottom Row: Filter Tabs (Left) & Results Info (Right) */}
          <div className="portal-toolbar-bottom">
            <div className="portal-filter-tabs">
              <button
                type="button"
                className={`portal-filter-tab ${
                  activeFilter === 'all' ? 'active' : ''
                }`}
                onClick={() => setActiveFilter('all')}
              >
                Semua
                <span className="badge-count">{stats.totalGuests}</span>
              </button>
              <button
                type="button"
                className={`portal-filter-tab ${
                  activeFilter === 'wa_unsent' ? 'active' : ''
                }`}
                onClick={() => setActiveFilter('wa_unsent')}
              >
                Belum Kirim
                <span className="badge-count">{stats.waPendingCount}</span>
              </button>
              <button
                type="button"
                className={`portal-filter-tab ${
                  activeFilter === 'wa_sent' ? 'active' : ''
                }`}
                onClick={() => setActiveFilter('wa_sent')}
              >
                Sudah Kirim
                <span className="badge-count">{stats.waSentCount}</span>
              </button>
              <button
                type="button"
                className={`portal-filter-tab ${
                  activeFilter === 'rsvp_yes' ? 'active' : ''
                }`}
                onClick={() => setActiveFilter('rsvp_yes')}
              >
                Hadir
                <span className="badge-count">{stats.rsvpYesCount}</span>
              </button>
              <button
                type="button"
                className={`portal-filter-tab ${
                  activeFilter === 'rsvp_pending' ? 'active' : ''
                }`}
                onClick={() => setActiveFilter('rsvp_pending')}
              >
                Belum RSVP
                <span className="badge-count">{stats.rsvpPendingCount}</span>
              </button>
            </div>

            <div className="portal-toolbar-meta">
              <span className="portal-results-count">
                Menampilkan <strong>{filteredGuests.length}</strong> dari {guests.length} tamu
              </span>
              {(searchQuery || activeFilter !== 'all') && (
                <button
                  type="button"
                  className="portal-reset-filter-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveFilter('all');
                  }}
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Empty State */}
        {filteredGuests.length === 0 && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--portal-radius-lg)',
              border: '1px solid var(--portal-card-border)',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              color: 'var(--portal-text-muted)',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--portal-text-main)',
                margin: '0 0 0.5rem 0',
              }}
            >
              Tidak ada tamu yang sesuai
            </h3>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>
              {searchQuery
                ? `Tidak ditemukan hasil untuk "${searchQuery}". Coba kata kunci lain.`
                : 'Belum ada tamu pada kategori filter ini.'}
            </p>
          </div>
        )}

        {/* 1. Desktop & Tablet Table View */}
        {filteredGuests.length > 0 && (
          <div className="portal-table-container">
            <table className="portal-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Tamu</th>
                  <th style={{ width: '22%' }}>Kategori &amp; Meja</th>
                  <th style={{ width: '17%' }}>Status Kirim WA</th>
                  <th style={{ width: '17%' }}>Status RSVP</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map((guest) => {
                  const invStatus = guest.invitation?.status;
                  const isSent = guest.isWaSent;

                  return (
                    <tr key={guest.id}>
                      <td>
                        <div className="portal-guest-name">{guest.name}</div>
                        <div className="portal-guest-contact">
                          {guest.phoneNumber ? (
                            <span>📱 {normalizeWhatsAppPhone(guest.phoneNumber)}</span>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>Tanpa nomor WA</span>
                          )}
                          {guest.customGreeting && (
                            <span
                              style={{
                                fontStyle: 'italic',
                                color: 'var(--portal-text-light)',
                                fontSize: '0.75rem',
                              }}
                            >
                              &quot;{guest.customGreeting}&quot;
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                          <span
                            className={`portal-badge ${
                              guest.category === 'VIP'
                                ? 'badge-vip'
                                : 'badge-regular'
                            }`}
                          >
                            {guest.category}
                          </span>
                          <span className="portal-badge badge-regular">
                            {guest.maxPax} Pax
                          </span>
                          {guest.tableNumber && (
                            <span className="portal-badge badge-regular">
                              Meja {guest.tableNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        {isSent ? (
                          <span className="portal-badge badge-sent">
                            ✓ Terkirim
                          </span>
                        ) : (
                          <span className="portal-badge badge-pending">
                            ⏳ Belum Terkirim
                          </span>
                        )}
                      </td>

                      <td>
                        {invStatus === 'RSVP_YES' && (
                          <span className="portal-badge badge-rsvp-yes">
                            ✓ Hadir ({guest.invitation?.rsvpPax || guest.maxPax} Pax)
                          </span>
                        )}
                        {invStatus === 'RSVP_NO' && (
                          <span className="portal-badge badge-rsvp-no">
                            ✕ Tidak Hadir
                          </span>
                        )}
                        {(!invStatus ||
                          invStatus === 'PENDING' ||
                          invStatus === 'SENT' ||
                          invStatus === 'OPENED') && (
                          <span className="portal-badge badge-rsvp-pending">
                            Belum Respon
                          </span>
                        )}
                      </td>

                      <td>
                        <div
                          className="table-actions"
                          style={{ justifyContent: 'flex-end' }}
                        >
                          <button
                            type="button"
                            className={`btn-wa-action ${
                              isSent ? 'wa-sent' : 'wa-unsent'
                            }`}
                            onClick={() => handleShareWhatsApp(guest)}
                            title={isSent ? 'Kirim ulang via WhatsApp' : 'Kirim via WhatsApp'}
                          >
                            <span>💬</span>
                            <span>{isSent ? 'Kirim Ulang' : 'Kirim WA'}</span>
                          </button>

                          <button
                            type="button"
                            className="btn-icon-action"
                            onClick={() => handleCopyMessage(guest)}
                            title="Salin Pesan Undangan Lengkap"
                          >
                            📋
                          </button>

                          <button
                            type="button"
                            className="btn-icon-action"
                            onClick={() => handleCopyLink(guest)}
                            title="Salin Tautan Undangan"
                          >
                            🔗
                          </button>

                          <button
                            type="button"
                            className="btn-icon-action"
                            onClick={() => handleOpenEditModal(guest)}
                            title="Edit Tamu"
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            className="btn-icon-action danger"
                            onClick={() => setDeletingGuest(guest)}
                            title="Hapus Tamu"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. Mobile Card List (< 769px) */}
        {filteredGuests.length > 0 && (
          <div className="portal-card-list">
            {filteredGuests.map((guest) => {
              const invStatus = guest.invitation?.status;
              const isSent = guest.isWaSent;

              return (
                <div
                  key={guest.id}
                  className={`portal-guest-card ${
                    isSent ? 'card-sent' : 'card-highlight-urgent'
                  }`}
                >
                  <div className="portal-card-header">
                    <div>
                      <div className="portal-card-title">{guest.name}</div>
                      <div className="portal-card-meta" style={{ marginTop: '0.25rem' }}>
                        {guest.phoneNumber ? (
                          <span>📱 {guest.phoneNumber}</span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>Tanpa nomor WA</span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`portal-badge ${
                        guest.category === 'VIP' ? 'badge-vip' : 'badge-regular'
                      }`}
                    >
                      {guest.category}
                    </span>
                  </div>

                  <div className="portal-card-badges">
                    <span className="portal-badge badge-regular">
                      👥 {guest.maxPax} Pax
                    </span>
                    {guest.tableNumber && (
                      <span className="portal-badge badge-regular">
                        🪑 Meja {guest.tableNumber}
                      </span>
                    )}

                    {isSent ? (
                      <span className="portal-badge badge-sent">✓ WA Terkirim</span>
                    ) : (
                      <span className="portal-badge badge-pending">
                        ⏳ WA Belum Terkirim
                      </span>
                    )}

                    {invStatus === 'RSVP_YES' && (
                      <span className="portal-badge badge-rsvp-yes">
                        ✓ Hadir ({guest.invitation?.rsvpPax || guest.maxPax} Pax)
                      </span>
                    )}
                    {invStatus === 'RSVP_NO' && (
                      <span className="portal-badge badge-rsvp-no">
                        ✕ Tidak Hadir
                      </span>
                    )}
                    {(!invStatus ||
                      invStatus === 'PENDING' ||
                      invStatus === 'SENT' ||
                      invStatus === 'OPENED') && (
                      <span className="portal-badge badge-rsvp-pending">
                        Belum Respon
                      </span>
                    )}
                  </div>

                  {/* Big Thumb-Friendly WhatsApp Button */}
                  <button
                    type="button"
                    className={`portal-card-wa-btn ${
                      isSent ? 'wa-sent' : 'wa-unsent'
                    }`}
                    onClick={() => handleShareWhatsApp(guest)}
                  >
                    <span>💬</span>
                    <span>
                      {isSent ? 'Kirim Ulang Undangan WA' : 'Kirim Undangan WhatsApp'}
                    </span>
                  </button>

                  <div className="portal-card-actions-sub">
                    <button
                      type="button"
                      className="portal-sub-btn"
                      onClick={() => handleCopyMessage(guest)}
                      title="Salin isi pesan undangan WhatsApp"
                    >
                      <span>📋 Salin Pesan</span>
                    </button>
                    <button
                      type="button"
                      className="portal-sub-btn"
                      onClick={() => handleCopyLink(guest)}
                      title="Salin tautan web undangan saja"
                    >
                      <span>🔗 Salin Link</span>
                    </button>

                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        type="button"
                        className="portal-sub-btn"
                        onClick={() => handleOpenEditModal(guest)}
                      >
                        <span>✏️ Edit</span>
                      </button>

                      <button
                        type="button"
                        className="portal-sub-btn danger"
                        onClick={() => setDeletingGuest(guest)}
                      >
                        <span>🗑️ Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Doa & Ucapan Tamu Section */}
        <section
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1.25rem 1.35rem',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            marginTop: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1rem',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '0.75rem',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <span>💌</span>
                <span>Doa &amp; Ucapan Tamu ({initialWishes.length})</span>
              </h2>
              <p
                style={{
                  margin: '0.2rem 0 0',
                  fontSize: '0.8125rem',
                  color: '#64748b',
                }}
              >
                Untaian doa restu dan ucapan selamat yang dikirimkan oleh tamu undangan.
              </p>
            </div>

            {initialWishes.length > 0 && (
              <div style={{ position: 'relative', width: '220px' }}>
                <input
                  type="text"
                  placeholder="Cari doa atau nama..."
                  value={wishSearchQuery}
                  onChange={(e) => setWishSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.78rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    background: '#f8fafc',
                  }}
                />
              </div>
            )}
          </div>

          {filteredWishes.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '0.875rem',
                maxHeight: '440px',
                overflowY: 'auto',
                paddingRight: '0.25rem',
              }}
            >
              {filteredWishes.map((w) => {
                const initial = (w.name || 'T').charAt(0).toUpperCase();
                return (
                  <div
                    key={w.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '0.875rem 1rem',
                      background: '#ffffff',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#fef3c7',
                            border: '1px solid #d97706',
                            color: '#92400e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                          }}
                        >
                          {initial}
                        </div>
                        <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>
                          {w.name}
                        </strong>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {new Date(w.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.8125rem',
                        lineHeight: 1.55,
                        color: '#334155',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {w.message}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.35rem', borderTop: '1px dashed #f1f5f9' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText(`"${w.message}" — ${w.name}`);
                            showToast('Pesan doa berhasil disalin!');
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                        }}
                        title="Salin ucapan untuk WhatsApp / Story"
                      >
                        <span>📋</span>
                        <span>Salin Ucapan</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                color: '#94a3b8',
                fontSize: '0.875rem',
                fontStyle: 'italic',
              }}
            >
              {wishSearchQuery ? 'Tidak ada doa yang cocok dengan pencarian.' : 'Belum ada ucapan doa yang dikirim oleh tamu undangan.'}
            </div>
          )}
        </section>
      </main>

      {/* Floating Action Button for Mobile */}
      <button
        type="button"
        className="portal-fab"
        onClick={handleOpenAddModal}
        aria-label="Tambah Tamu Baru"
      >
        <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>+</span>
      </button>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="portal-toast" role="status">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal Add / Edit Guest */}
      {(isAddModalOpen || editingGuest) && (
        <div className="portal-modal-backdrop" onClick={() => {
          setIsAddModalOpen(false);
          setEditingGuest(null);
        }}>
          <div
            className="portal-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-modal-header">
              <h2 className="portal-modal-title">
                {editingGuest ? 'Edit Data Tamu' : 'Tambah Tamu Baru'}
              </h2>
              <button
                type="button"
                className="portal-modal-close"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingGuest(null);
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitGuest}>
              <div className="portal-form-group">
                <label className="portal-form-label">Nama Lengkap Tamu *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Contoh: Budi Santoso & Pasangan"
                  className="portal-form-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="portal-form-group">
                <label className="portal-form-label">Kategori Tamu</label>
                <select
                  className="portal-form-select"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                >
                  <option value="REGULAR">REGULAR (Umum)</option>
                  <option value="VIP">VIP</option>
                  <option value="KELUARGA">KELUARGA</option>
                  <option value="TEMAN">TEMAN</option>
                  <option value="KANTOR">TEMAN KANTOR</option>
                </select>
              </div>

              <div className="portal-form-group">
                <label className="portal-form-label">Nomor WhatsApp</label>
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890 atau 62812..."
                  className="portal-form-input"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                />
                <div className="portal-form-hint">
                  Undangan dapat langsung dikirim ke nomor ini lewat tombol Kirim WA.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="portal-form-group">
                  <label className="portal-form-label">Jumlah Kuota (Pax)</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className="portal-form-input"
                    value={formData.maxPax}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxPax: parseInt(e.target.value, 10) || 1,
                      })
                    }
                  />
                </div>

                <div className="portal-form-group">
                  <label className="portal-form-label">Nomor Meja</label>
                  <input
                    type="text"
                    placeholder="Opsional (misal: A-1)"
                    className="portal-form-input"
                    value={formData.tableNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, tableNumber: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="portal-form-group">
                <label className="portal-form-label">Pesan Tambahan Khusus (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Pesan salam personal untuk tamu ini..."
                  className="portal-form-textarea"
                  value={formData.customGreeting}
                  onChange={(e) =>
                    setFormData({ ...formData, customGreeting: e.target.value })
                  }
                />
              </div>

              <div className="portal-modal-actions">
                <button
                  type="button"
                  className="btn-portal-secondary"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingGuest(null);
                  }}
                  disabled={isSaving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-portal-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Tamu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete */}
      {deletingGuest && (
        <div className="portal-modal-backdrop" onClick={() => setDeletingGuest(null)}>
          <div
            className="portal-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px' }}
          >
            <div className="portal-modal-header">
              <h2 className="portal-modal-title" style={{ color: '#b91c1c' }}>
                Hapus Tamu
              </h2>
              <button
                type="button"
                className="portal-modal-close"
                onClick={() => setDeletingGuest(null)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.9375rem', lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
              Apakah Anda yakin ingin menghapus <strong>{deletingGuest.name}</strong> dari daftar tamu? Tautan undangannya tidak akan dapat digunakan lagi.
            </p>

            <div className="portal-modal-actions">
              <button
                type="button"
                className="btn-portal-secondary"
                onClick={() => setDeletingGuest(null)}
                disabled={isSaving}
              >
                Batal
              </button>
              <button
                type="button"
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--portal-radius-md)',
                  padding: '0.625rem 1.125rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
                onClick={handleConfirmDelete}
                disabled={isSaving}
              >
                {isSaving ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* WhatsApp Auto-Sender Queue Modal */}
      <WhatsAppAutoSenderModal
        isOpen={isAutoSenderOpen}
        onClose={() => setIsAutoSenderOpen(false)}
        event={event}
        guests={guests}
        accessKey={accessKey}
        onGuestStatusUpdated={handleGuestStatusUpdated}
        getInvitationUrl={getInvitationUrl}
      />
    </div>
  );
}

