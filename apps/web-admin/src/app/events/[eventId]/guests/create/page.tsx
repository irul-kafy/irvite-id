'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface EventSummary {
  id: string;
  title: string;
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
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" fill="none"/>
      <path d="M2 18c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M16 8h4M18 6v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export default function GuestCreatePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const router = useRouter();
  const { eventId } = use(params);

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
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
    async function loadEvent() {
      try {
        const res = await fetch(`/api/events/${eventId}`, { cache: 'no-store' });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setEvent({ id: data.id, title: data.title });
        }
      } catch {
        // Fallback silently if event title fails to load
      }
    }
    void loadEvent();
  }, [eventId, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setError('Nama tamu wajib diisi.');
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

    setLoading(true);
    setError('');

    try {
      const payload: Record<string, unknown> = {
        name: trimmedName,
        category: formData.category.trim() || 'REGULAR',
        maxPax: parsedPax,
      };

      const trimmedPhone = formData.phoneNumber.trim();
      if (trimmedPhone) {
        payload.phoneNumber = trimmedPhone;
      }

      if (trimmedEmail) {
        payload.email = trimmedEmail;
      }

      const trimmedGreeting = formData.customGreeting.trim();
      if (trimmedGreeting) {
        payload.customGreeting = trimmedGreeting;
      }

      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: 'POST',
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
        throw new Error(errData.message || 'Gagal menambahkan tamu.');
      }

      router.push(`/events/${eventId}/guests`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan data tamu.');
    } finally {
      setLoading(false);
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
            <IconUserPlus />
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
            Tambah Tamu
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {event ? (
            <>
              Event: <strong style={{ color: 'var(--text-primary)' }}>{event.title}</strong>
            </>
          ) : (
            'Masukkan rincian data tamu baru di bawah ini.'
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

      {/* Form Container */}
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
              htmlFor="guest-name"
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
              id="guest-name"
              type="text"
              required
              disabled={loading}
              placeholder="Contoh: Bapak Ir. H. Ahmad Dahlan & Keluarga"
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
                htmlFor="guest-category"
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
                id="guest-category"
                type="text"
                disabled={loading}
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
                htmlFor="guest-max-pax"
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
                id="guest-max-pax"
                type="number"
                min="1"
                required
                disabled={loading}
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
                htmlFor="guest-phone"
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
                id="guest-phone"
                type="tel"
                disabled={loading}
                placeholder="081234567890"
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
            </div>

            <div>
              <label
                htmlFor="guest-email"
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
                id="guest-email"
                type="email"
                disabled={loading}
                placeholder="tamu@example.com"
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
              htmlFor="guest-greeting"
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
              id="guest-greeting"
              type="text"
              disabled={loading}
              placeholder="Contoh: Yang Terhormat Guru Kami"
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
              Akan ditampilkan di atas nama tamu pada undangan personal jika template mendukungnya.
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
            disabled={loading}
            onClick={() => router.push(`/events/${eventId}/guests`)}
            style={{ padding: '0.625rem 1.25rem', fontWeight: 600 }}
          >
            Batal
          </button>
          <button
            id="guest-submit-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              padding: '0.625rem 1.5rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {loading ? 'Menyimpan Tamu...' : 'Simpan Tamu'}
          </button>
        </div>
      </form>
    </div>
  );
}
