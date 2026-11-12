'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface WishItem {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}

interface WishesModerationTabProps {
  eventId: string;
}

export function WishesModerationTab({ eventId }: WishesModerationTabProps) {
  const [wishes, setWishes] = useState<WishItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [wishToDelete, setWishToDelete] = useState<WishItem | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchWishes = useCallback(async (searchQuery: string, pageNum: number) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(pageNum),
        limit: '20',
      });
      if (searchQuery.trim()) {
        q.set('search', searchQuery.trim());
      }
      const res = await fetch(`/api/events/${eventId}/wishes?${q.toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error('Gagal memuat daftar ucapan');
      }
      const data = await res.json();
      setWishes(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : 'Gagal memuat ucapan',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchWishes(search, page);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, page, fetchWishes]);

  const handleDeleteConfirm = async () => {
    if (!wishToDelete) return;
    setDeletingId(wishToDelete.id);
    try {
      const res = await fetch(`/api/events/${eventId}/wishes/${wishToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Gagal menghapus ucapan');
      }
      setWishes((prev) => prev.filter((w) => w.id !== wishToDelete.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setToast({
        message: `Ucapan dari "${wishToDelete.name}" berhasil dihapus.`,
        type: 'success',
      });
      setWishToDelete(null);
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : 'Gagal menghapus ucapan',
        type: 'error',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: toast.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          }}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '1rem',
              color: 'inherit',
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Header & Controls Card */}
      <div
        style={{
          background: 'var(--admin-card-bg, #ffffff)',
          border: '1px solid var(--admin-border, #e2e8f0)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: 'var(--admin-text, #0f172a)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>💬 Moderasi Doa &amp; Ucapan</span>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                background: '#e0e7ff',
                color: '#4338ca',
                fontWeight: 600,
              }}
            >
              {total} Total
            </span>
          </h2>
          <p
            style={{
              margin: '0.25rem 0 0',
              fontSize: '0.8125rem',
              color: 'var(--admin-text-muted, #64748b)',
            }}
          >
            Pantau, cari, dan hapus ucapan spam atau typo yang dikirim oleh tamu di website undangan.
          </p>
        </div>

        {/* Search & Actions */}
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <input
              type="text"
              placeholder="Cari nama atau teks ucapan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem',
                fontSize: '0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--admin-border, #cbd5e1)',
                background: 'var(--admin-card-bg, #f8fafc)',
                color: 'var(--admin-text, #0f172a)',
                outline: 'none',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                }}
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => void fetchWishes(search, page)}
            title="Muat Ulang"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span>🔄</span>
            <span>Muat Ulang</span>
          </button>
        </div>
      </div>

      {/* Content List */}
      {loading ? (
        <div
          style={{
            background: 'var(--admin-card-bg, #ffffff)',
            border: '1px solid var(--admin-border, #e2e8f0)',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
            color: 'var(--admin-text-muted, #64748b)',
          }}
        >
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>⏳</div>
          <div style={{ fontSize: '0.875rem' }}>Memuat doa &amp; ucapan tamu...</div>
        </div>
      ) : wishes.length === 0 ? (
        <div
          style={{
            background: 'var(--admin-card-bg, #ffffff)',
            border: '1px solid var(--admin-border, #e2e8f0)',
            borderRadius: '12px',
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
            {search ? '🔍' : '💌'}
          </div>
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--admin-text, #0f172a)',
              marginBottom: '0.35rem',
            }}
          >
            {search ? 'Tidak ada hasil yang cocok' : 'Belum Ada Doa & Ucapan'}
          </h3>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--admin-text-muted, #64748b)',
              maxWidth: '420px',
              margin: '0 auto 1.25rem',
              lineHeight: 1.5,
            }}
          >
            {search
              ? `Tidak ditemukan ucapan dengan kata kunci "${search}". Coba kata kunci lain atau bersihkan pencarian.`
              : 'Tamu yang membuka undangan digital Anda dapat mengirimkan doa restu dan pesan selamat di halaman undangan publik.'}
          </p>
          {search && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setSearch('')}
            >
              Bersihkan Pencarian
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {wishes.map((w) => {
            const initial = (w.name || 'T').charAt(0).toUpperCase();
            return (
              <div
                key={w.id}
                style={{
                  background: 'var(--admin-card-bg, #ffffff)',
                  border: '1px solid var(--admin-border, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', flex: 1 }}>
                  {/* Initial Avatar */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      flexShrink: 0,
                    }}
                  >
                    {initial}
                  </div>

                  {/* Message Details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <strong
                        style={{
                          fontSize: '0.925rem',
                          color: 'var(--admin-text, #0f172a)',
                        }}
                      >
                        {w.name}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--admin-text-muted, #94a3b8)',
                        }}
                      >
                        • {formatDate(w.createdAt)}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: '0.45rem 0 0',
                        fontSize: '0.875rem',
                        color: 'var(--admin-text, #334155)',
                        lineHeight: 1.55,
                        background: 'rgba(241, 245, 249, 0.65)',
                        padding: '0.625rem 0.85rem',
                        borderRadius: '8px',
                        borderLeft: '3px solid #6366f1',
                        wordBreak: 'break-word',
                      }}
                    >
                      {w.message}
                    </p>
                  </div>
                </div>

                {/* Delete Action Button */}
                <button
                  type="button"
                  onClick={() => setWishToDelete(w)}
                  disabled={deletingId === w.id}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #fecaca',
                    background: '#fff1f2',
                    color: '#e11d48',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                  title="Hapus Ucapan Ini"
                >
                  <span>🗑️</span>
                  <span>Hapus</span>
                </button>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem',
              }}
            >
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                &larr; Sebelumnya
              </button>
              <span style={{ fontSize: '0.8125rem', color: 'var(--admin-text-muted, #64748b)' }}>
                Halaman {page} dari {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Berikutnya &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {wishToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => {
            if (!deletingId) setWishToDelete(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                }}
              >
                ⚠️
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#0f172a',
                  }}
                >
                  Hapus Ucapan Tamu?
                </h3>
                <p
                  style={{
                    margin: '0.15rem 0 0',
                    fontSize: '0.8rem',
                    color: '#64748b',
                  }}
                >
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
                Dari: {wishToDelete.name}
              </div>
              <div
                style={{
                  color: '#475569',
                  fontStyle: 'italic',
                  lineHeight: 1.45,
                  wordBreak: 'break-word',
                }}
              >
                &ldquo;{wishToDelete.message}&rdquo;
              </div>
            </div>

            <p
              style={{
                fontSize: '0.8125rem',
                color: '#64748b',
                lineHeight: 1.5,
                marginBottom: '1.25rem',
              }}
            >
              Ucapan ini akan dihapus secara permanen dari basis data dan tidak akan lagi muncul di website undangan publik.
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setWishToDelete(null)}
                disabled={Boolean(deletingId)}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={Boolean(deletingId)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: deletingId ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {deletingId ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14 }} />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Ya, Hapus Ucapan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

