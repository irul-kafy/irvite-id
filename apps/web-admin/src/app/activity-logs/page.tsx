'use client';

import { useEffect, useState } from 'react';
import { TableSkeleton } from '@/components/table-skeleton';
import { EmptyState } from '@/components/empty-state';

export interface ActivityLogItem {
  id: string;
  actorUserId: string | null;
  actorRole: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | null;
  action: string;
  entityType: string;
  entityId: string;
  eventId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actorUser?: {
    id: string;
    email: string;
    role: string;
  } | null;
  event?: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

export function formatLogTimestamp(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getActionBadgeInfo(action: string): {
  label: string;
  bg: string;
  color: string;
  border: string;
} {
  const upper = (action || '').toUpperCase();
  if (upper.includes('LOGIN_SUCCESS')) {
    return { label: 'Login Sukses', bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' };
  }
  if (upper.includes('LOGIN_FAILED')) {
    return { label: 'Login Gagal', bg: '#fef2f2', color: '#991b1b', border: '#fecaca' };
  }
  if (upper.includes('CHECK_IN')) {
    return { label: 'Check-In', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' };
  }
  if (upper.includes('WALK_IN')) {
    return { label: 'Walk-In', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' };
  }
  if (upper.includes('ORDER')) {
    return { label: 'Pesanan', bg: '#fffbeb', color: '#92400e', border: '#fde68a' };
  }
  if (upper.includes('DELETE') || upper.includes('CANCEL')) {
    return { label: 'Hapus / Batal', bg: '#fff1f2', color: '#be123c', border: '#fecdd3' };
  }
  if (upper.includes('UPDATE')) {
    return { label: 'Pembaruan', bg: '#fdf4ff', color: '#86198f', border: '#f5d0fe' };
  }
  return { label: action, bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async (query = '') => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (query.trim()) params.set('search', query.trim());

      const res = await fetch(`/api/activity-logs?${params.toString()}`);
      if (res.status === 403) {
        throw new Error('Anda tidak memiliki izin untuk melihat log audit.');
      }
      if (!res.ok) {
        throw new Error('Gagal mengambil daftar log aktivitas');
      }
      const data = await res.json();
      setLogs(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(search);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary, #111814)', margin: 0 }}>
          Log Aktivitas & Audit Keamanan
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #4a544e)', marginTop: '0.25rem' }}>
          Mencatat setiap tindakan penting admin dan staf demi transparansi operasional dan keamanan data.
        </p>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--admin-border, rgba(17,24,20,0.1))', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', maxWidth: '480px' }}>
          <input
            type="text"
            placeholder="Cari aksi / email / target / judul acara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              background: '#111814',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Cari
          </button>
        </form>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--admin-border, rgba(17,24,20,0.1))', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <TableSkeleton rows={5} columns={5} label="Memuat log aktivitas..." />
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
            {error}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon="📜"
            title="Belum Ada Log Aktivitas"
            description={
              search.trim()
                ? 'Tidak ada log aktivitas yang cocok dengan filter atau kata kunci pencarian Anda.'
                : 'Setiap aksi penting di sistem (tamu, check-in, pesanan, dsb.) akan otomatis tercatat di sini.'
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Waktu</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Aksi</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Pelaku</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Target & Acara</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Rincian</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const badge = getActionBadgeInfo(log.action);
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: '#64748b', fontSize: '0.8125rem' }}>
                        {formatLogTimestamp(log.createdAt)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>
                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '2px', fontFamily: 'monospace' }}>
                          {log.action}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {log.actorUser ? (
                          <div>
                            <div style={{ fontWeight: 600, color: '#111814' }}>{log.actorUser.email}</div>
                            <span style={{ fontSize: '0.6875rem', padding: '1px 5px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                              {log.actorUser.role}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                            {log.actorRole ? `Sistem (${log.actorRole})` : 'Sistem / Publik'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 500, color: '#334155' }}>
                          {log.entityType}: <code>{log.entityId.slice(0, 16)}</code>
                        </div>
                        {log.event && (
                          <div style={{ fontSize: '0.75rem', color: '#0f766e', marginTop: '2px' }}>
                            Acara: {log.event.title}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          {isExpanded ? 'Tutup' : 'Metadata'}
                        </button>
                        {isExpanded && (
                          <div
                            style={{
                              marginTop: '0.5rem',
                              padding: '0.5rem',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              textAlign: 'left',
                              fontSize: '0.6875rem',
                              fontFamily: 'monospace',
                              maxWidth: '300px',
                              overflowX: 'auto',
                            }}
                          >
                            <pre style={{ margin: 0 }}>
                              {JSON.stringify(log.metadata || {}, null, 2)}
                            </pre>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

