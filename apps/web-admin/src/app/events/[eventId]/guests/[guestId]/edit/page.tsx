'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface EventSummary {
  id: string;
  title: string;
}

interface GuestData {
  id: string;
  eventId: string;
  name: string;
  customGreeting?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  category: string;
  maxPax: number;
}

function IconArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 10H4M9 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

export default function GuestEditPage({
  params,
}: {
  params: Promise<{ eventId: string; guestId: string }>;
}) {
  const router = useRouter();
  const { eventId, guestId } = use(params);

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    category: 'REGULAR',
    maxPax: 1,
    phoneNumber: '',
    email: '',
    customGreeting: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        setInitialLoading(true);
        setError('');

        const [eventRes, guestRes] = await Promise.all([
          fetch(`/api/events/${eventId}`, { cache: 'no-store' }),
          fetch(`/api/events/${eventId}/guests/${guestId}`, { cache: 'no-store' }),
        ]);

        if (eventRes.status === 401 || guestRes.status === 401) {
          router.push('/login');
          return;
        }

        if (!guestRes.ok) {
          throw new Error('Data tamu tidak ditemukan atau tidak dapat diakses.');
        }

        const guestData: GuestData = await guestRes.json();
        setFormData({
          name: guestData.name || '',
          category: guestData.category || 'REGULAR',
          maxPax: guestData.maxPax || 1,
          phoneNumber: guestData.phoneNumber || '',
          email: guestData.email || '',
          customGreeting: guestData.customGreeting || '',
        });

        if (eventRes.ok) {
          const eventData = await eventRes.json();
          setEvent({ id: eventData.id, title: eventData.title });
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data tamu.');
      } finally {
        setInitialLoading(false);
      }
    }

    void loadData();
  }, [eventId, guestId, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setError('Nama tamu tidak boleh kosong.');
      return;
    }

    const trimmedEmail = formData.email.trim();
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setError('Format alamat email tidak valid.');
        return;
      }
    }

    const parsedPax = parseInt(String(formData.maxPax), 10);
    if (Number.isNaN(parsedPax) || parsedPax < 1) {
      setError('Jumlah kapasitas pax minimal 1.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Build PATCH payload adhering strictly to UpdateGuestDto
      // Explicitly send null when optional fields are cleared to clear them in DB
      const payload: Record<string, unknown> = {
        name: trimmedName,
        category: formData.category.trim() || 'REGULAR',
        maxPax: parsedPax,
        phoneNumber: formData.phoneNumber.trim() ? formData.phoneNumber.trim() : null,
        email: trimmedEmail ? trimmedEmail : null,
        customGreeting: formData.customGreeting.trim() ? formData.customGreeting.trim() : null,
      };

      const res = await fetch(`/api/events/${eventId}/guests/${guestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal memperbarui data tamu.');
      }

      router.push(`/events/${eventId}/guests`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memperbarui data tamu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Nav */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          href={`/events/${eventId}/guests`}
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
          Kembali ke Daftar Tamu
        </Link>
      </div>

      {/* Header Card */}
      <div
        style={{
          background: 'var(--admin-surface, #ffffff)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--admin-border)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <span style={{ color: 'var(--admin-accent)', display: 'flex' }}>
            <IconEdit />
          </span>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Edit Data Tamu
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {event ? (
            <>
              Event: <strong style={{ color: 'var(--text-primary)' }}>{event.title}</strong>
            </>
          ) : (
            'Perbarui rincian data tamu di bawah ini.'
          )}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          style={{
            marginBottom: '1.5rem',
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '0.875rem',
            fontWeight: 500,
            background: 'var(--status-danger-bg, #fef2f2)',
            color: 'var(--status-danger, #dc2626)',
            border: '1px solid rgba(220, 38, 38, 0.25)',
          }}
        >
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {initialLoading && (
        <div
          style={{
            background: 'var(--admin-surface, #ffffff)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--admin-border)',
            padding: '3rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          Memuat data tamu...
        </div>
      )}

      {/* Form Container */}
      {!initialLoading && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Section 1: Informasi Utama */}
          <div
            style={{
              background: 'var(--admin-surface, #ffffff)',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px solid var(--admin-border)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                borderBottom: '1px solid var(--admin-border)',
                paddingBottom: '0.75rem',
              }}
            >
              Informasi Tamu
            </div>

            <div>
              <label
                htmlFor="guest-edit-name"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '0.375rem',
                }}
              >
                Nama Tamu <span style={{ color: 'var(--status-danger, #dc2626)' }}>*</span>
              </label>
              <input
                id="guest-edit-name"
                type="text"
                required
                disabled={saving}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="admin-input"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md, 6px)',
                  border: '1px solid var(--admin-border)',
                  background: 'var(--admin-bg, #F8F6F1)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label
                  htmlFor="guest-edit-category"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '0.375rem',
                  }}
                >
                  Kategori Tamu
                </label>
                <input
                  id="guest-edit-category"
                  type="text"
                  disabled={saving}
                  placeholder="REGULAR"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="admin-input"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md, 6px)',
                    border: '1px solid var(--admin-border)',
                    background: 'var(--admin-bg, #F8F6F1)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', display: 'block' }}>
                  Default: REGULAR
                </span>
              </div>

              <div>
                <label
                  htmlFor="guest-edit-max-pax"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '0.375rem',
                  }}
                >
                  Kapasitas Pax Maksimal <span style={{ color: 'var(--status-danger, #dc2626)' }}>*</span>
                </label>
                <input
                  id="guest-edit-max-pax"
                  type="number"
                  min="1"
                  required
                  disabled={saving}
                  value={formData.maxPax}
                  onChange={(e) =>
                    setFormData({ ...formData, maxPax: parseInt(e.target.value, 10) || 1 })
                  }
                  className="admin-input"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md, 6px)',
                    border: '1px solid var(--admin-border)',
                    background: 'var(--admin-bg, #F8F6F1)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', display: 'block' }}>
                  Jumlah tamu yang diizinkan untuk undangan ini.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Kontak */}
          <div
            style={{
              background: 'var(--admin-surface, #ffffff)',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px solid var(--admin-border)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                borderBottom: '1px solid var(--admin-border)',
                paddingBottom: '0.75rem',
              }}
            >
              Kontak (Opsional)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label
                  htmlFor="guest-edit-phone"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '0.375rem',
                  }}
                >
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  id="guest-edit-phone"
                  type="tel"
                  disabled={saving}
                  placeholder="Kosongkan jika tidak ada"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="admin-input"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md, 6px)',
                    border: '1px solid var(--admin-border)',
                    background: 'var(--admin-bg, #F8F6F1)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', display: 'block' }}>
                  Kosongkan input untuk menghapus nomor telepon.
                </span>
              </div>

              <div>
                <label
                  htmlFor="guest-edit-email"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '0.375rem',
                  }}
                >
                  Alamat Email
                </label>
                <input
                  id="guest-edit-email"
                  type="email"
                  disabled={saving}
                  placeholder="Kosongkan jika tidak ada"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="admin-input"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md, 6px)',
                    border: '1px solid var(--admin-border)',
                    background: 'var(--admin-bg, #F8F6F1)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', display: 'block' }}>
                  Kosongkan input untuk menghapus alamat email.
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Pesan / Ucapan */}
          <div
            style={{
              background: 'var(--admin-surface, #ffffff)',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px solid var(--admin-border)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                borderBottom: '1px solid var(--admin-border)',
                paddingBottom: '0.75rem',
              }}
            >
              Salam & Ucapan Khusus (Opsional)
            </div>

            <div>
              <label
                htmlFor="guest-edit-greeting"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '0.375rem',
                }}
              >
                Ucapan / Salutation Khusus
              </label>
              <input
                id="guest-edit-greeting"
                type="text"
                disabled={saving}
                placeholder="Kosongkan jika tidak ada"
                value={formData.customGreeting}
                onChange={(e) => setFormData({ ...formData, customGreeting: e.target.value })}
                className="admin-input"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md, 6px)',
                  border: '1px solid var(--admin-border)',
                  background: 'var(--admin-bg, #F8F6F1)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', display: 'block' }}>
                Kosongkan input untuk menghapus ucapan khusus.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => router.push(`/events/${eventId}/guests`)}
              style={{ padding: '0.625rem 1.25rem', fontWeight: 600 }}
            >
              Batal
            </button>
            <button
              id="guest-update-btn"
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{
                padding: '0.625rem 1.5rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {saving ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
