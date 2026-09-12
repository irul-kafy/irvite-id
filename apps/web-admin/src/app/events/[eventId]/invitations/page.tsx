'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { buildWhatsAppShareUrl, isLocalhostUrl } from '@/utils/whatsapp-share';

interface AttendanceRecord {
  scannedAt: string;
  status: 'VALID' | 'INVALID' | 'DUPLICATE';
  scannedPax: number;
}

interface GuestInvitation {
  uniqueCode: string;
  status: 'PENDING' | 'SENT' | 'OPENED' | 'RSVP_YES' | 'RSVP_NO';
  rsvpPax?: number | null;
  attendances?: AttendanceRecord[];
  canonicalUrl: string;
}

interface GuestItem {
  id: string;
  eventId: string;
  name: string;
  customGreeting?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  category: string;
  maxPax: number;
  createdAt: string;
  invitation?: GuestInvitation | null;
}

interface EventSummary {
  id: string;
  title: string;
  slug: string;
  eventDate: string;
  locationDetails?: string | null;
  status: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  lastPage: number;
}

/* ────────────────── Icons ────────────────── */

function IconArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 10H4M9 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconEnvelope() {
  return (
    <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <path d="M2 6l8 5 8-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2l1.8 5.2L17 9l-5.2 1.8L10 16l-1.8-5.2L3 9l5.2-1.8L10 2z" fill="currentColor"/>
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <path d="M4 13H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function IconExternal() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 3h6v6M17 3l-9 9M8 5H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor"/>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 4.5A2.5 2.5 0 0 1 4.5 2h1.8a1 1 0 0 1 .95.68l1 3a1 1 0 0 1-.24 1.05l-1.2 1.2a11.05 11.05 0 0 0 5.06 5.06l1.2-1.2a1 1 0 0 1 1.05-.24l3 1a1 1 0 0 1 .68.95v1.8a2.5 2.5 0 0 1-2.5 2.5h-.5C8.94 18 2 11.06 2 3.5v-.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2L1 18h18L10 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      <path d="M10 8v4M10 14.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

/* ────────────────── Status Helpers ────────────────── */

function getInvitationLabel(invitation: GuestInvitation | null | undefined): { text: string; color: string } {
  if (!invitation) {
    return { text: 'Belum Dibuat', color: 'var(--text-tertiary)' };
  }
  return { text: 'Tersedia', color: 'var(--status-success)' };
}

function getRsvpLabel(invitation: GuestInvitation | null | undefined): { text: string; color: string; pax?: number | null } {
  if (!invitation) {
    return { text: '—', color: 'var(--text-tertiary)' };
  }
  if (invitation.status === 'RSVP_YES') {
    return { text: 'Hadir', color: 'var(--status-success)', pax: invitation.rsvpPax };
  }
  if (invitation.status === 'RSVP_NO') {
    return { text: 'Tidak Hadir', color: 'var(--status-danger)' };
  }
  // PENDING, SENT, OPENED — all display as "Belum Merespons"
  return { text: 'Belum Merespons', color: 'var(--status-warning)' };
}

/* ────────────────── Main Page ────────────────── */

export default function InvitationDistributionPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const router = useRouter();
  const { eventId } = use(params);

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    lastPage: 1,
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [generatingGuestId, setGeneratingGuestId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Derive localhost warning from first available canonical URL
  const hasLocalhostUrl = guests.some(
    (g) => g.invitation?.canonicalUrl && isLocalhostUrl(g.invitation.canonicalUrl)
  );

  const loadPageData = async (pageToLoad: number) => {
    setLoading(true);
    setError('');
    try {
      const [eventRes, guestsRes] = await Promise.all([
        fetch(`/api/events/${eventId}`, { cache: 'no-store' }),
        fetch(`/api/events/${eventId}/guests?page=${pageToLoad}&limit=10`, { cache: 'no-store' }),
      ]);

      if (eventRes.status === 401 || guestsRes.status === 401) {
        router.push('/login');
        return;
      }

      if (!eventRes.ok) {
        throw new Error('Gagal memuat informasi event.');
      }
      if (!guestsRes.ok) {
        throw new Error('Gagal memuat daftar tamu.');
      }

      const eventData = await eventRes.json();
      const guestsResponse = await guestsRes.json();

      setEvent(eventData);
      setGuests(guestsResponse.data || []);
      if (guestsResponse.meta) {
        setMeta(guestsResponse.meta);
        setCurrentPage(guestsResponse.meta.page);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const fetchInitial = async () => {
      try {
        const [eventRes, guestsRes] = await Promise.all([
          fetch(`/api/events/${eventId}`, { cache: 'no-store' }),
          fetch(`/api/events/${eventId}/guests?page=1&limit=10`, { cache: 'no-store' }),
        ]);

        if (ignore) return;

        if (eventRes.status === 401 || guestsRes.status === 401) {
          router.push('/login');
          return;
        }

        if (!eventRes.ok) {
          throw new Error('Gagal memuat informasi event.');
        }
        if (!guestsRes.ok) {
          throw new Error('Gagal memuat daftar tamu.');
        }

        const eventData = await eventRes.json();
        const guestsResponse = await guestsRes.json();

        if (!ignore) {
          setEvent(eventData);
          setGuests(guestsResponse.data || []);
          if (guestsResponse.meta) {
            setMeta(guestsResponse.meta);
            setCurrentPage(guestsResponse.meta.page);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat memuat data.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void fetchInitial();

    return () => {
      ignore = true;
    };
  }, [eventId, router]);

  const handleGenerateInvitation = async (guestId: string) => {
    if (generatingGuestId) return;
    setGeneratingGuestId(guestId);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/events/${eventId}/guests/${guestId}/invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.status === 409) {
        setActionMessage({
          type: 'error',
          text: 'Undangan personal untuk tamu ini sudah pernah dibuat sebelumnya.',
        });
        // Reload page data to get accurate state including canonicalUrl from BFF
        await loadPageData(currentPage);
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal membuat undangan personal.');
      }

      setActionMessage({
        type: 'success',
        text: 'Undangan personal berhasil dibuat!',
      });

      // Reload to get the enriched canonicalUrl from BFF server-side
      await loadPageData(currentPage);
    } catch (err: unknown) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal membuat undangan personal.',
      });
    } finally {
      setGeneratingGuestId(null);
    }
  };

  const handleCopyLink = async (canonicalUrl: string) => {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopiedCode(canonicalUrl);
      setTimeout(() => {
        setCopiedCode((current) => (current === canonicalUrl ? null : current));
      }, 2500);
    } catch {
      setActionMessage({
        type: 'error',
        text: 'Gagal menyalin tautan ke clipboard. Silakan salin secara manual.',
      });
    }
  };

  const isGenerating = generatingGuestId !== null;
  const isCopied = (canonicalUrl: string) => copiedCode === canonicalUrl;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Breadcrumb / Nav */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          href={`/events/${eventId}`}
          className="btn btn-ghost btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-secondary)',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          <IconArrowLeft />
          Kembali ke Pusat Manajemen Event
        </Link>
      </div>

      {/* Header Section */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid var(--admin-border)',
          marginBottom: '1.75rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--admin-accent)', display: 'flex', alignItems: 'center' }}>
              <IconEnvelope />
            </span>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Undangan &amp; Distribusi
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
            {event ? (
              <>
                Event: <strong style={{ color: 'var(--text-primary)' }}>{event.title}</strong>
              </>
            ) : (
              'Memuat informasi event...'
            )}
          </p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            Kelola tautan undangan personal dan status respons tamu.
          </p>
        </div>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div
          className={`alert alert--${actionMessage.type === 'success' ? 'success' : 'error'} mb-4`}
          role="alert"
          style={{ marginBottom: '1rem' }}
        >
          {actionMessage.text}
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '1rem',
              lineHeight: 1,
              color: 'inherit',
              padding: '0 0.25rem',
            }}
            aria-label="Tutup pesan"
          >
            ×
          </button>
        </div>
      )}

      {/* Localhost Warning */}
      {hasLocalhostUrl && (
        <div
          role="alert"
          id="dist-localhost-warning"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.625rem',
            padding: '0.875rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--status-warning-bg)',
            border: '1px solid rgba(217, 119, 6, 0.25)',
            marginBottom: '1.25rem',
            fontSize: '0.8125rem',
            color: 'var(--status-warning)',
            lineHeight: 1.5,
          }}
        >
          <IconWarning />
          <span>
            <strong>Mode Pengembangan:</strong> Link ini masih menggunakan server lokal dan belum dapat dibuka oleh penerima di perangkat lain.
          </span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: '80px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
                animation: 'admin-skeleton-pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="alert alert--error mb-4" role="alert">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && guests.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            color: 'var(--text-tertiary)',
            background: 'var(--admin-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <p style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            Belum ada tamu terdaftar
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            Tambahkan tamu terlebih dahulu melalui halaman{' '}
            <Link href={`/events/${eventId}/guests`} style={{ color: 'var(--admin-accent)', textDecoration: 'underline' }}>
              Kelola Tamu
            </Link>
            .
          </p>
        </div>
      )}

      {/* Data Loaded */}
      {!loading && !error && guests.length > 0 && (
        <>
          {/* Desktop Table */}
          <div
            className="dist-desktop-table-container"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              borderRadius: 'var(--radius-lg)',
              overflowX: 'auto',
              marginBottom: '1.25rem',
            }}
          >
            <table
              style={{
                width: '100%',
                minWidth: '640px',
                borderCollapse: 'collapse',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: 'var(--admin-bg)',
                    borderBottom: '1px solid var(--admin-border)',
                  }}
                >
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Tamu
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.75rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Kontak
                  </th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 0.75rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Undangan
                  </th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 0.75rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    RSVP
                  </th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Aksi Distribusi
                  </th>
                </tr>
              </thead>
              <tbody>
                {guests.map((guest) => {
                  const inv = guest.invitation;
                  const invLabel = getInvitationLabel(inv);
                  const rsvpLabel = getRsvpLabel(inv);

                  return (
                    <tr
                      key={guest.id}
                      className="dist-table-row"
                      style={{
                        borderBottom: '1px solid var(--admin-border)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      {/* Tamu */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.125rem' }}>
                          {guest.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          {guest.category} · Max {guest.maxPax} Pax
                        </div>
                      </td>

                      {/* Kontak */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        {guest.phoneNumber ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                            <IconPhone />
                            {guest.phoneNumber}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>—</span>
                        )}
                      </td>

                      {/* Undangan */}
                      <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.625rem',
                            borderRadius: 'var(--radius-pill)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: invLabel.color,
                            background: inv
                              ? 'var(--status-success-bg)'
                              : 'var(--admin-bg)',
                            border: `1px solid ${inv ? 'rgba(5, 150, 105, 0.2)' : 'var(--admin-border)'}`,
                          }}
                        >
                          {invLabel.text}
                        </span>
                      </td>

                      {/* RSVP */}
                      <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                        <span style={{ fontWeight: 600, color: rsvpLabel.color, fontSize: '0.8125rem' }}>
                          {rsvpLabel.text}
                          {rsvpLabel.pax != null && ` (${rsvpLabel.pax} Pax)`}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem', flexWrap: 'wrap' }}>
                          {!inv ? (
                            <button
                              type="button"
                              onClick={() => void handleGenerateInvitation(guest.id)}
                              disabled={isGenerating}
                              className="btn btn-secondary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                fontWeight: 600,
                                color: 'var(--admin-accent)',
                                padding: '0.375rem 0.75rem',
                                fontSize: '0.8125rem',
                              }}
                              aria-label={`Buat undangan personal untuk ${guest.name}`}
                            >
                              <IconSparkles />
                              {generatingGuestId === guest.id ? 'Membuat...' : 'Buat Undangan'}
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleCopyLink(inv.canonicalUrl)}
                                className="btn btn-ghost btn-sm"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  color: isCopied(inv.canonicalUrl) ? 'var(--status-success)' : 'var(--text-secondary)',
                                  fontWeight: isCopied(inv.canonicalUrl) ? 600 : 500,
                                  padding: '0.375rem 0.5rem',
                                  fontSize: '0.8125rem',
                                }}
                                aria-label={`Salin link undangan ${guest.name}`}
                              >
                                <IconCopy />
                                {isCopied(inv.canonicalUrl) ? 'Tersalin' : 'Salin'}
                              </button>
                              <a
                                href={inv.canonicalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost btn-sm"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  textDecoration: 'none',
                                  padding: '0.375rem 0.5rem',
                                  fontSize: '0.8125rem',
                                  color: 'var(--text-secondary)',
                                }}
                                aria-label={`Lihat undangan ${guest.name}`}
                              >
                                <IconExternal />
                                Lihat
                              </a>
                              <a
                                href={buildWhatsAppShareUrl(guest.name, event?.title || '', inv.canonicalUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost btn-sm"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  textDecoration: 'none',
                                  padding: '0.375rem 0.5rem',
                                  fontSize: '0.8125rem',
                                  color: '#25D366',
                                }}
                                aria-label={`Bagikan undangan ${guest.name} via WhatsApp`}
                              >
                                <IconWhatsApp />
                                WhatsApp
                              </a>
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

          {/* Mobile Cards */}
          <div
            className="dist-mobile-cards-container"
            style={{
              display: 'none',
              flexDirection: 'column',
              gap: '0.875rem',
              marginBottom: '1.25rem',
            }}
          >
            {guests.map((guest) => {
              const inv = guest.invitation;
              const invLabel = getInvitationLabel(inv);
              const rsvpLabel = getRsvpLabel(inv);

              return (
                <div
                  key={guest.id}
                  style={{
                    background: 'var(--admin-surface)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem',
                  }}
                >
                  {/* Guest Info */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.25rem' }}>
                      {guest.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                      {guest.category} · Max {guest.maxPax} Pax
                    </div>
                    {guest.phoneNumber && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                        <IconPhone />
                        {guest.phoneNumber}
                      </span>
                    )}
                  </div>

                  {/* Status Row */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      padding: '0.625rem 0',
                      borderTop: '1px solid var(--admin-border)',
                      borderBottom: '1px solid var(--admin-border)',
                      marginBottom: '0.75rem',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                        Undangan
                      </span>
                      <div style={{ fontWeight: 600, color: invLabel.color, marginTop: '0.125rem' }}>
                        {invLabel.text}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                        RSVP
                      </span>
                      <div style={{ fontWeight: 600, color: rsvpLabel.color, marginTop: '0.125rem' }}>
                        {rsvpLabel.text}
                        {rsvpLabel.pax != null && ` (${rsvpLabel.pax} Pax)`}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {!inv ? (
                      <button
                        type="button"
                        onClick={() => void handleGenerateInvitation(guest.id)}
                        disabled={isGenerating}
                        className="btn btn-secondary btn-sm"
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.375rem',
                          fontWeight: 600,
                          color: 'var(--admin-accent)',
                          padding: '0.5rem',
                        }}
                        aria-label={`Buat undangan personal untuk ${guest.name}`}
                      >
                        <IconSparkles />
                        {generatingGuestId === guest.id ? 'Membuat...' : 'Buat Undangan'}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleCopyLink(inv.canonicalUrl)}
                          className="btn btn-ghost btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: isCopied(inv.canonicalUrl) ? 'var(--status-success)' : 'var(--text-secondary)',
                            fontWeight: isCopied(inv.canonicalUrl) ? 600 : 500,
                            padding: '0.5rem',
                          }}
                          aria-label={`Salin link undangan ${guest.name}`}
                        >
                          <IconCopy />
                          {isCopied(inv.canonicalUrl) ? 'Link Tersalin' : 'Salin Link'}
                        </button>
                        <a
                          href={inv.canonicalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            textDecoration: 'none',
                            padding: '0.5rem',
                            color: 'var(--text-secondary)',
                          }}
                          aria-label={`Lihat undangan ${guest.name}`}
                        >
                          <IconExternal />
                          Lihat
                        </a>
                        <a
                          href={buildWhatsAppShareUrl(guest.name, event?.title || '', inv.canonicalUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            textDecoration: 'none',
                            padding: '0.5rem',
                            color: '#25D366',
                            fontWeight: 600,
                          }}
                          aria-label={`Bagikan undangan ${guest.name} via WhatsApp`}
                        >
                          <IconWhatsApp />
                          WhatsApp
                        </a>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {meta.lastPage > 1 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.875rem 1.25rem',
              }}
            >
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Menampilkan <strong>{(currentPage - 1) * meta.limit + 1}</strong> –{' '}
                <strong>{Math.min(currentPage * meta.limit, meta.total)}</strong> dari{' '}
                <strong>{meta.total}</strong> tamu
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  id="dist-prev-page-btn"
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const prev = Math.max(1, currentPage - 1);
                    void loadPageData(prev);
                  }}
                  disabled={currentPage <= 1}
                  style={{ fontWeight: 600 }}
                >
                  Sebelumnya
                </button>

                <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', padding: '0 0.5rem' }}>
                  Halaman <strong>{currentPage}</strong> dari <strong>{meta.lastPage}</strong>
                </span>

                <button
                  id="dist-next-page-btn"
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const next = Math.min(meta.lastPage, currentPage + 1);
                    void loadPageData(next);
                  }}
                  disabled={currentPage >= meta.lastPage}
                  style={{ fontWeight: 600 }}
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 768px) {
          .dist-desktop-table-container {
            display: none !important;
          }
          .dist-mobile-cards-container {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .dist-desktop-table-container {
            display: block !important;
          }
          .dist-mobile-cards-container {
            display: none !important;
          }
        }
        .dist-table-row:hover {
          background: var(--admin-surface-hover, #F2EFE8) !important;
        }
      `}</style>
    </div>
  );
}
