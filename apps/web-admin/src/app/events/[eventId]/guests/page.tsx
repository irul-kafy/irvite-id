'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

function IconArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 10H4M9 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconUserPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" fill="none"/>
      <path d="M2 18c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M16 8h4M18 6v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <path d="M2 18c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M14 3.5c1.5.5 2.5 1.8 2.5 3.5s-1 3-2.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M18 18c0-2.5-1.5-4.5-4-5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
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

function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
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

function IconMail() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/>
      <path d="M2 6l8 5 8-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

export default function GuestListPage({
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

  const invitationOrigin =
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN ||
    process.env.PUBLIC_INVITATION_URL ||
    'http://localhost:3002';

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
        await loadPageData(currentPage);
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal membuat undangan personal.');
      }

      const createdInvitation = await res.json();

      // Update local state directly for immediate UI feedback
      setGuests((prev) =>
        prev.map((g) =>
          g.id === guestId
            ? {
                ...g,
                invitation: {
                  uniqueCode: createdInvitation.uniqueCode,
                  status: createdInvitation.status || 'PENDING',
                  rsvpPax: createdInvitation.rsvpPax,
                  attendances: [],
                },
              }
            : g
        )
      );

      setActionMessage({
        type: 'success',
        text: 'Undangan personal dan QR check-in berhasil dibuat!',
      });
    } catch (err: unknown) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal membuat undangan personal.',
      });
    } finally {
      setGeneratingGuestId(null);
    }
  };

  const handleCopyLink = async (uniqueCode: string) => {
    const url = `${invitationOrigin.replace(/\/+$/, '')}/i/${uniqueCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(uniqueCode);
      setTimeout(() => {
        setCopiedCode((current) => (current === uniqueCode ? null : current));
      }, 2500);
    } catch {
      setActionMessage({
        type: 'error',
        text: 'Gagal menyalin tautan ke clipboard. Silakan salin secara manual.',
      });
    }
  };

  const getValidAttendance = (attendances?: AttendanceRecord[]): AttendanceRecord | undefined => {
    if (!attendances || !Array.isArray(attendances)) return undefined;
    return attendances.find((a) => a.status === 'VALID');
  };

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
              <IconUsers />
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
              Kelola Tamu
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
            {event ? (
              <>
                Event: <strong style={{ color: 'var(--text-primary)' }}>{event.title}</strong>
                {event.slug && (
                  <span style={{ marginLeft: '0.5rem', color: 'var(--admin-accent)', fontSize: '0.8125rem' }}>
                    (/e/{event.slug})
                  </span>
                )}
              </>
            ) : (
              'Memuat informasi event...'
            )}
          </p>
        </div>

        <div>
          <button
            id="guests-add-btn"
            type="button"
            className="btn btn-primary"
            onClick={() => router.push(`/events/${eventId}/guests/create`)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              padding: '0.625rem 1.25rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <IconUserPlus />
            + Tambah Tamu
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {actionMessage && (
        <div
          role="alert"
          style={{
            marginBottom: '1.5rem',
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background:
              actionMessage.type === 'success'
                ? 'var(--status-success-bg, #ecfdf5)'
                : 'var(--status-danger-bg, #fef2f2)',
            color:
              actionMessage.type === 'success'
                ? 'var(--status-success, #059669)'
                : 'var(--status-danger, #dc2626)',
            border: `1px solid ${
              actionMessage.type === 'success'
                ? 'rgba(5, 150, 105, 0.25)'
                : 'rgba(220, 38, 38, 0.25)'
            }`,
          }}
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontWeight: 700,
              fontSize: '1rem',
              padding: '0 0.25rem',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          role="alert"
          style={{
            padding: '1.5rem',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'var(--status-danger-bg, #fef2f2)',
            border: '1px solid rgba(220, 38, 38, 0.25)',
            color: 'var(--status-danger, #dc2626)',
            marginBottom: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ fontWeight: 600 }}>{error}</div>
          <div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void loadPageData(currentPage)}
              style={{ fontWeight: 600 }}
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div
          style={{
            background: 'var(--admin-surface, #ffffff)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--admin-border)',
            padding: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              border: '3px solid var(--admin-border)',
              borderTopColor: 'var(--admin-accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
            Memuat daftar tamu...
          </span>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && guests.length === 0 && (
        <div
          style={{
            background: 'var(--admin-surface, #ffffff)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--admin-border)',
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--admin-accent-soft, rgba(196,160,106,0.12))',
              color: 'var(--admin-accent, #C4A06A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto',
            }}
          >
            <IconUsers />
          </div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            Belum ada tamu.
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9375rem',
              maxWidth: 480,
              margin: '0 auto 1.75rem auto',
              lineHeight: 1.5,
            }}
          >
            Tambahkan tamu pertama untuk mulai membuat undangan personal dan QR check-in unik.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => router.push(`/events/${eventId}/guests/create`)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              padding: '0.625rem 1.5rem',
            }}
          >
            <IconUserPlus />
            + Tambah Tamu
          </button>
        </div>
      )}

      {/* Guest Data Container (Desktop Table + Mobile Cards) */}
      {!loading && !error && guests.length > 0 && (
        <>
          {/* DESKTOP TABLE (Hidden on Mobile) */}
          <div
            className="guest-desktop-table-container"
            style={{
              background: 'var(--admin-surface, #ffffff)',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px solid var(--admin-border)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: '1.5rem',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.875rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: 'var(--admin-bg, #F8F6F1)',
                    borderBottom: '1px solid var(--admin-border)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '0.875rem 1rem' }}>Tamu</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Kontak</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Kategori & Pax</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Undangan</th>
                  <th style={{ padding: '0.875rem 1rem' }}>RSVP</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Kehadiran</th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((guest) => {
                  const inv = guest.invitation;
                  const validAttendance = getValidAttendance(inv?.attendances);
                  const isGenerating = generatingGuestId === guest.id;
                  const isCopied = inv ? copiedCode === inv.uniqueCode : false;
                  const personalUrl = inv
                    ? `${invitationOrigin.replace(/\/+$/, '')}/i/${inv.uniqueCode}`
                    : '';

                  return (
                    <tr
                      key={guest.id}
                      style={{
                        borderBottom: '1px solid var(--admin-border)',
                        transition: 'background 0.15s ease',
                      }}
                      className="guest-table-row"
                    >
                      {/* Name & Custom Greeting */}
                      <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                          {guest.name}
                        </div>
                        {guest.customGreeting && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-tertiary, #8C827A)',
                              fontStyle: 'italic',
                              marginTop: '0.125rem',
                            }}
                          >
                            &quot;{guest.customGreeting}&quot;
                          </div>
                        )}
                      </td>

                      {/* Contact */}
                      <td style={{ padding: '1rem', verticalAlign: 'middle', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {guest.phoneNumber ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                              <IconPhone />
                              {guest.phoneNumber}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                          )}
                          {guest.email && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                fontSize: '0.8125rem',
                                color: 'var(--text-tertiary)',
                              }}
                            >
                              <IconMail />
                              {guest.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category & Pax */}
                      <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              background: 'var(--admin-accent-soft, rgba(196,160,106,0.15))',
                              color: 'var(--admin-accent, #B28B55)',
                              border: '1px solid var(--admin-accent-border, rgba(196,160,106,0.3))',
                            }}
                          >
                            {guest.category || 'REGULAR'}
                          </span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                            {guest.maxPax} Pax
                          </span>
                        </div>
                      </td>

                      {/* Invitation Status */}
                      <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                        {inv ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'var(--status-success, #059669)',
                              background: 'var(--status-success-bg, #ecfdf5)',
                              padding: '0.25rem 0.625rem',
                              borderRadius: '999px',
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: 'currentColor',
                              }}
                            />
                            Undangan Tersedia
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              color: 'var(--text-tertiary)',
                              padding: '0.25rem 0.5rem',
                              background: 'rgba(0,0,0,0.04)',
                              borderRadius: '4px',
                            }}
                          >
                            Belum Ada Undangan
                          </span>
                        )}
                      </td>

                      {/* RSVP Status */}
                      <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                        {inv ? (
                          inv.status === 'RSVP_YES' ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.625rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: 'var(--status-success-bg, #ecfdf5)',
                                color: 'var(--status-success, #059669)',
                                border: '1px solid rgba(5,150,105,0.2)',
                              }}
                            >
                              Hadir ({inv.rsvpPax || 1} Pax)
                            </span>
                          ) : inv.status === 'RSVP_NO' ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.625rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: 'var(--status-danger-bg, #fef2f2)',
                                color: 'var(--status-danger, #dc2626)',
                                border: '1px solid rgba(220,38,38,0.2)',
                              }}
                            >
                              Tidak Hadir
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.625rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                background: 'var(--status-warning-bg, #fffbeb)',
                                color: 'var(--status-warning, #d97706)',
                                border: '1px solid rgba(217,119,6,0.2)',
                              }}
                            >
                              Belum Merespons
                            </span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                        )}
                      </td>

                      {/* Check-in / Attendance */}
                      <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                        {validAttendance ? (
                          <div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                padding: '0.25rem 0.625rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: 'var(--status-success-bg, #ecfdf5)',
                                color: 'var(--status-success, #059669)',
                                border: '1px solid rgba(5,150,105,0.2)',
                              }}
                            >
                              ✓ Sudah Check-in
                            </span>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                              {new Date(validAttendance.scannedAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {validAttendance.scannedPax > 1 && ` (${validAttendance.scannedPax} Pax)`}
                            </div>
                          </div>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              color: 'var(--text-tertiary)',
                              background: 'rgba(0,0,0,0.03)',
                            }}
                          >
                            Belum Check-in
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            justifyContent: 'flex-end',
                            flexWrap: 'wrap',
                          }}
                        >
                          {!inv ? (
                            <button
                              id={`guest-generate-${guest.id}`}
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
                                borderColor: 'var(--admin-accent-border)',
                              }}
                            >
                              <IconSparkles />
                              {isGenerating ? 'Membuat...' : 'Buat Undangan Personal'}
                            </button>
                          ) : (
                            <>
                              <a
                                id={`guest-view-${guest.id}`}
                                href={personalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.375rem',
                                  textDecoration: 'none',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                }}
                                title="Buka Undangan Personal Tamu"
                              >
                                <IconExternal />
                                Lihat Undangan
                              </a>

                              <button
                                id={`guest-copy-${guest.id}`}
                                type="button"
                                onClick={() => void handleCopyLink(inv.uniqueCode)}
                                className="btn btn-ghost btn-sm"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.375rem',
                                  fontSize: '0.75rem',
                                  color: isCopied ? 'var(--status-success, #059669)' : 'var(--text-secondary)',
                                  fontWeight: isCopied ? 600 : 500,
                                }}
                                title="Salin Tautan Undangan Personal"
                              >
                                <IconCopy />
                                {isCopied ? 'Tersalin!' : 'Salin Link'}
                              </button>
                            </>
                          )}

                          <button
                            id={`guest-edit-${guest.id}`}
                            type="button"
                            onClick={() => router.push(`/events/${eventId}/guests/${guest.id}/edit`)}
                            className="btn btn-ghost btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                            }}
                            title="Edit Data Tamu"
                          >
                            <IconEdit />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS (Visible only on Mobile/Tablet) */}
          <div className="guest-mobile-cards-container" style={{ display: 'none', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {guests.map((guest) => {
              const inv = guest.invitation;
              const validAttendance = getValidAttendance(inv?.attendances);
              const isGenerating = generatingGuestId === guest.id;
              const isCopied = inv ? copiedCode === inv.uniqueCode : false;
              const personalUrl = inv
                ? `${invitationOrigin.replace(/\/+$/, '')}/i/${inv.uniqueCode}`
                : '';

              return (
                <div
                  key={`mobile-${guest.id}`}
                  style={{
                    background: 'var(--admin-surface, #ffffff)',
                    borderRadius: 'var(--radius-lg, 12px)',
                    border: '1px solid var(--admin-border)',
                    padding: '1.25rem',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.875rem',
                  }}
                >
                  {/* Card Header: Name + Category */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        {guest.name}
                      </div>
                      {guest.customGreeting && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontStyle: 'italic', marginTop: '0.125rem' }}>
                          &quot;{guest.customGreeting}&quot;
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        background: 'var(--admin-accent-soft, rgba(196,160,106,0.15))',
                        color: 'var(--admin-accent, #B28B55)',
                        border: '1px solid var(--admin-accent-border, rgba(196,160,106,0.3))',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {guest.category || 'REGULAR'}
                    </span>
                  </div>

                  {/* Card Meta Rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Kapasitas:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{guest.maxPax} Pax</strong>
                    </div>

                    {guest.phoneNumber && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Telepon:</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <IconPhone />
                          {guest.phoneNumber}
                        </span>
                      </div>
                    )}

                    {guest.email && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Email:</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <IconMail />
                          {guest.email}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem' }}>
                      <span>RSVP:</span>
                      {inv ? (
                        inv.status === 'RSVP_YES' ? (
                          <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>Hadir ({inv.rsvpPax || 1} Pax)</span>
                        ) : inv.status === 'RSVP_NO' ? (
                          <span style={{ color: 'var(--status-danger)', fontWeight: 600 }}>Tidak Hadir</span>
                        ) : (
                          <span style={{ color: 'var(--status-warning)', fontWeight: 500 }}>Belum Merespons</span>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Check-in:</span>
                      {validAttendance ? (
                        <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>✓ Sudah Check-in</span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>Belum Check-in</span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div
                    style={{
                      borderTop: '1px solid var(--admin-border)',
                      paddingTop: '0.875rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
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
                      >
                        <IconSparkles />
                        {isGenerating ? 'Membuat...' : 'Buat Undangan'}
                      </button>
                    ) : (
                      <>
                        <a
                          href={personalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{
                            flex: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.375rem',
                            textDecoration: 'none',
                            fontWeight: 600,
                            padding: '0.5rem',
                          }}
                        >
                          <IconExternal />
                          Undangan
                        </a>
                        <button
                          type="button"
                          onClick={() => void handleCopyLink(inv.uniqueCode)}
                          className="btn btn-ghost btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            color: isCopied ? 'var(--status-success)' : 'var(--text-secondary)',
                            fontWeight: isCopied ? 600 : 500,
                            padding: '0.5rem',
                          }}
                        >
                          <IconCopy />
                          {isCopied ? 'Tersalin' : 'Salin'}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => router.push(`/events/${eventId}/guests/${guest.id}/edit`)}
                      className="btn btn-ghost btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: 'var(--text-secondary)',
                        padding: '0.5rem',
                      }}
                    >
                      <IconEdit />
                      Edit
                    </button>
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
                background: 'var(--admin-surface, #ffffff)',
                border: '1px solid var(--admin-border)',
                borderRadius: 'var(--radius-lg, 12px)',
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
                  id="guests-prev-page-btn"
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
                  id="guests-next-page-btn"
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

      {/* Responsive Styles Injection */}
      <style>{`
        @media (max-width: 768px) {
          .guest-desktop-table-container {
            display: none !important;
          }
          .guest-mobile-cards-container {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .guest-desktop-table-container {
            display: block !important;
          }
          .guest-mobile-cards-container {
            display: none !important;
          }
        }
        .guest-table-row:hover {
          background: var(--admin-surface-hover, #F2EFE8) !important;
        }
      `}</style>
    </div>
  );
}
