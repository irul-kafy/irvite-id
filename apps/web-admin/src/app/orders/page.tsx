'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { TableSkeleton } from '@/components/table-skeleton';
import { EmptyState } from '@/components/empty-state';
import { type TicketOrderRecord } from '@/types/ticketing';

export interface OrderItem {
  id: string;
  eventId: string;
  referenceCode: string;
  clientName: string;
  clientWhatsapp: string;
  packageCode: string;
  priceAmount: number;
  status: 'DRAFT' | 'AWAITING_PAYMENT' | 'PAID' | 'IN_PROGRESS' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  paidAt: string | null;
  paymentProofMediaId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  event: {
    id: string;
    title: string;
    slug: string;
    eventDate: string;
    activeUntil: string | null;
    status: string;
    template?: {
      id: string;
      name: string;
      themeCode: string;
    } | null;
  };
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSimpleDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getExpiryStatus(activeUntil?: string | null): {
  label: string;
  variant: 'expired' | 'warning' | 'active' | 'none';
  daysLeft?: number;
} {
  if (!activeUntil) return { label: 'Belum diatur', variant: 'none' };
  const expiry = new Date(activeUntil).getTime();
  if (isNaN(expiry)) return { label: 'Belum diatur', variant: 'none' };

  const now = Date.now();
  const diffMs = expiry - now;
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) {
    return { label: 'Kedaluwarsa', variant: 'expired', daysLeft: diffDays };
  }
  if (diffDays <= 7) {
    return {
      label: `Berakhir dlm ${diffDays} hari`,
      variant: 'warning',
      daysLeft: diffDays,
    };
  }
  return { label: `Aktif (${diffDays} hari lagi)`, variant: 'active', daysLeft: diffDays };
}

export function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'PAID':
      return { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', label: 'Lunas' };
    case 'LIVE':
      return { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', label: 'Live' };
    case 'IN_PROGRESS':
      return { bg: '#fdf4ff', color: '#86198f', border: '#f5d0fe', label: 'Diproses' };
    case 'AWAITING_PAYMENT':
      return { bg: '#fffbeb', color: '#92400e', border: '#fde68a', label: 'Menunggu Bayar' };
    case 'COMPLETED':
      return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: 'Selesai' };
    case 'CANCELLED':
      return { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', label: 'Dibatalkan' };
    case 'DRAFT':
    default:
      return { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', label: 'Draf' };
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ticketOrders, setTicketOrders] = useState<TicketOrderRecord[]>([]);
  const [ticketOrdersError, setTicketOrdersError] = useState<string | null>(null);
  const [orderCategoryTab, setOrderCategoryTab] = useState<'wedding' | 'tickets'>('wedding');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'CANCELLED'>('ALL');
  const [updatingOrder, setUpdatingOrder] = useState<OrderItem | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [newActiveUntil, setNewActiveUntil] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const query = new URLSearchParams();
      if (selectedStatus !== 'ALL') query.set('status', selectedStatus);
      if (searchQuery.trim()) query.set('search', searchQuery.trim());

      setTicketOrdersError(null);
      const [res, tktRes] = await Promise.all([
        fetch(`/api/orders?${query.toString()}`),
        fetch('/api/ticketing?mode=summary', { cache: 'no-store' }).catch(() => null),
      ]);

      if (tktRes && tktRes.ok) {
        const tktJson = await tktRes.json().catch(() => null);
        setTicketOrders(Array.isArray(tktJson?.recentOrders) ? tktJson.recentOrders : []);
      } else {
        const tktErr = tktRes ? await tktRes.json().catch(() => null) : null;
        setTicketOrders([]);
        setTicketOrdersError(
          tktErr?.message || 'Gagal memuat daftar pesanan tiket dari server.',
        );
      }
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (res.status === 403) {
        setError('Akses ditolak: Akun Anda tidak memiliki izin untuk melihat daftar pesanan.');
        return;
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Gagal mengambil daftar pesanan');
      }
      const data = await res.json();
      setOrders(data.data || []);
      setCounts(data.counts || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus]);

  useEffect(() => {
    if (!updatingOrder) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        setUpdatingOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [updatingOrder, submitting]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const openUpdateModal = (order: OrderItem) => {
    setUpdatingOrder(order);
    setNewStatus(order.status);
    setNotes(order.notes || '');
    if (order.event.activeUntil) {
      const d = new Date(order.event.activeUntil);
      setNewActiveUntil(d.toISOString().split('T')[0]);
    } else {
      setNewActiveUntil('');
    }
  };

  const handleSaveStatus = async () => {
    if (!updatingOrder) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/orders/${updatingOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes: notes || undefined,
          activeUntil: newActiveUntil ? new Date(newActiveUntil).toISOString() : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Gagal memperbarui pesanan');
      }

      setActionSuccess(`Pesanan ${updatingOrder.referenceCode} berhasil diperbarui.`);
      setUpdatingOrder(null);
      await fetchOrders();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal memperbarui status');
    } finally {
      setSubmitting(false);
    }
  };

  const statusTabs = [
    { key: 'ALL', label: 'Semua', count: counts.TOTAL ?? orders.length },
    { key: 'DRAFT', label: 'Draf', count: counts.DRAFT ?? 0 },
    { key: 'AWAITING_PAYMENT', label: 'Menunggu Bayar', count: counts.AWAITING_PAYMENT ?? 0 },
    { key: 'PAID', label: 'Lunas', count: counts.PAID ?? 0 },
    { key: 'LIVE', label: 'Live', count: counts.LIVE ?? 0 },
    { key: 'COMPLETED', label: 'Selesai', count: counts.COMPLETED ?? 0 },
    { key: 'CANCELLED', label: 'Batal', count: counts.CANCELLED ?? 0 },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary, #111814)', margin: 0 }}>
            Kelola Pesanan & Masa Aktif
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #4a544e)', marginTop: '0.25rem' }}>
            Pantau status pesanan undangan pernikahan maupun transaksi pembelian e-ticket konser &amp; seminar.
          </p>
        </div>
      </div>

      {/* ── Category Switcher: Undangan Pernikahan vs Tiket Event ── */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '1.25rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--admin-border, rgba(17,24,20,0.1))',
        }}
      >
        <button
          type="button"
          className={`btn btn-sm ${orderCategoryTab === 'wedding' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setOrderCategoryTab('wedding')}
        >
          Pesanan Undangan Pernikahan ({counts.TOTAL ?? orders.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${orderCategoryTab === 'tickets' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setOrderCategoryTab('tickets')}
        >
          Pesanan Tiket Event ({ticketOrders.length})
        </button>
      </div>

      {actionSuccess && (
        <div style={{ padding: '0.75rem 1rem', background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {actionSuccess}
        </div>
      )}

      {orderCategoryTab === 'tickets' ? (
        <>
          {ticketOrdersError && (
            <div
              role="alert"
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--status-danger-bg)',
                color: 'var(--status-danger)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <span>{ticketOrdersError}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void fetchOrders()}
              >
                Coba lagi
              </button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#fff', border: '1px solid var(--admin-border, rgba(17,24,20,0.1))', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', color: '#78716c', fontWeight: 500 }}>Total Pesanan Tiket</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111814', marginTop: '0.25rem' }}>
                {ticketOrders.length}
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', color: '#065f46', fontWeight: 500 }}>Tiket Terbit (ISSUED)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669', marginTop: '0.25rem' }}>
                {ticketOrders.reduce((acc, o) => acc + o.quantity, 0)}
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid var(--admin-border, rgba(17,24,20,0.1))', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', color: '#78716c', fontWeight: 500 }}>Total Pembayaran Masuk</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111814', marginTop: '0.25rem' }}>
                {formatRupiah(ticketOrders.reduce((acc, o) => acc + o.totalAmount, 0))}
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 500 }}>Fee Platform (Rp 3.000/tkt)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#334155', marginTop: '0.25rem' }}>
                {formatRupiah(
                  ticketOrders.reduce(
                    (acc, o) =>
                      acc +
                      Number(
                        o.serviceFeeAmount ??
                        (o as unknown as { serviceFee?: number }).serviceFee ??
                        (o.quantity ? o.quantity * 3000 : 3000)
                      ),
                    0
                  )
                )}
              </div>
            </div>
          </div>

          {/* Status Tabs for Tickets */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }} role="tablist">
            {[
              { key: 'ALL', label: 'Semua', count: ticketOrders.length },
              { key: 'PAID', label: 'Lunas (PAID)', count: ticketOrders.filter((t) => t.status === 'PAID').length },
              { key: 'PENDING', label: 'Menunggu Bayar', count: ticketOrders.filter((t) => t.status === 'PENDING').length },
              { key: 'CANCELLED', label: 'Batal', count: ticketOrders.filter((t) => t.status === 'CANCELLED').length },
            ].map((tab) => {
              const active = ticketStatusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTicketStatusFilter(tab.key as any)}
                  className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: '8px' }}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>

          {/* Search Bar for Tickets */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '520px' }}>
              <input
                type="text"
                placeholder="Cari Kode Order (ORD-...) / E-Ticket / Nama Pembeli / WhatsApp..."
                value={ticketSearchQuery}
                onChange={(e) => setTicketSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.55rem 0.85rem',
                  fontSize: '0.875rem',
                  borderRadius: '8px',
                  border: '1px solid var(--admin-border, #cbd5e1)',
                  background: '#ffffff',
                }}
              />
              {ticketSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTicketSearchQuery('')}
                  className="btn btn-secondary btn-sm"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--admin-border, rgba(17,24,20,0.1))', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Kode Pesanan</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Pembeli &amp; Kontak</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Acara &amp; E-Ticket</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Jumlah &amp; Total</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = ticketOrders.filter((order) => {
                      if (ticketStatusFilter !== 'ALL' && order.status !== ticketStatusFilter) return false;
                      if (ticketSearchQuery.trim()) {
                        const q = ticketSearchQuery.toLowerCase().trim();
                        const match =
                          (order.orderCode && order.orderCode.toLowerCase().includes(q)) ||
                          (order.buyerName && order.buyerName.toLowerCase().includes(q)) ||
                          (order.buyerEmail && order.buyerEmail.toLowerCase().includes(q)) ||
                          (order.buyerWhatsapp && order.buyerWhatsapp.toLowerCase().includes(q)) ||
                          (order.eventTitle && order.eventTitle.toLowerCase().includes(q)) ||
                          (order.tickets && order.tickets.some((tk) => tk.ticketCode.toLowerCase().includes(q)));
                        if (!match) return false;
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
                            Tidak ada pesanan tiket yang cocok dengan filter atau kata kunci &ldquo;{ticketSearchQuery}&rdquo;.
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((tOrder) => (
                      <tr key={tOrder.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#111814' }}>
                          <code>{tOrder.orderCode}</code>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                            {tOrder.paymentMethod}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: '#111814' }}>{tOrder.buyerName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#475569' }}>{tOrder.buyerEmail}</div>
                          <div style={{ fontSize: '0.75rem', color: '#059669' }}>{tOrder.buyerWhatsapp}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: '#0f766e' }}>{tOrder.eventTitle}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            Kode E-Ticket: {tOrder.tickets.map((t) => t.ticketCode).join(', ')}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#334155' }}>
                            {tOrder.quantity} Tiket
                          </span>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111814', marginTop: '3px' }}>
                            {formatRupiah(tOrder.totalAmount)}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                            }}
                          >
                            Lunas ({tOrder.status})
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <Link
                            href="/dashboard"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem' }}
                          >
                            Koreksi Email CS
                          </Link>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>

          {/* ── KPI Stats Summary ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#fff', border: '1px solid var(--admin-border, rgba(17,24,20,0.1))', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', color: '#78716c', fontWeight: 500 }}>Total Pesanan</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111814', marginTop: '0.25rem' }}>
                {counts.TOTAL ?? 0}
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', color: '#92400e', fontWeight: 500 }}>Menunggu Bayar</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b45309', marginTop: '0.25rem' }}>
                {counts.AWAITING_PAYMENT ?? 0}
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', color: '#065f46', fontWeight: 500 }}>Lunas & Aktif</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669', marginTop: '0.25rem' }}>
                {(counts.PAID ?? 0) + (counts.LIVE ?? 0)}
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 500 }}>Selesai / Arsip</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#334155', marginTop: '0.25rem' }}>
                {counts.COMPLETED ?? 0}
              </div>
            </div>
          </div>

          {/* ── Status Tabs & Search Filter ── */}
          <div style={{ background: '#fff', border: '1px solid var(--admin-border, rgba(17,24,20,0.1))', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', marginBottom: '1rem' }}>
              {statusTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedStatus(tab.key)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    border: selectedStatus === tab.key ? '1px solid var(--admin-brand, #111814)' : '1px solid transparent',
                    background: selectedStatus === tab.key ? 'var(--admin-brand, #111814)' : '#f8fafc',
                    color: selectedStatus === tab.key ? '#fff' : '#64748b',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', maxWidth: '480px' }}>
              <input
                type="text"
                placeholder="Cari Ref Code / Nama Klien / WhatsApp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* ── Table Container ── */}
          <div style={{ background: '#fff', border: '1px solid var(--admin-border, rgba(17,24,20,0.1))', borderRadius: '12px', overflow: 'hidden' }}>
            {loading ? (
              <TableSkeleton rows={5} columns={7} label="Memuat daftar pesanan..." />
            ) : error ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                <div style={{ color: '#dc2626', fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                  {error === 'Internal server error' || error === 'Internal Server Error'
                    ? 'Terjadi kendala saat memuat data pesanan dari server.'
                    : error}
                </div>
                <button
                  type="button"
                  onClick={fetchOrders}
                  className="btn-sm-action"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 16px',
                    borderRadius: '8px',
                    background: '#fdfaf5',
                    color: '#9c7333',
                    border: '1px solid #e0c89e',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🔄 Coba Muat Ulang Pesanan
                </button>
              </div>
            ) : orders.length === 0 ? (
              <EmptyState
                icon="📦"
                title="Tidak Ada Pesanan Ditemukan"
                description={
                  searchQuery.trim()
                    ? `Tidak ada pesanan yang sesuai dengan kata kunci "${searchQuery}". Coba kata kunci lain atau bersihkan pencarian.`
                    : 'Belum ada pesanan yang tercatat pada filter status ini.'
                }
              />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>Ref Code</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Klien</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Acara</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Paket & Harga</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Masa Aktif</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const badge = getStatusBadgeStyle(order.status);
                      const expiry = getExpiryStatus(order.event?.activeUntil);
                      const cleanWa = order.clientWhatsapp?.replace(/[^0-9]/g, '');

                      return (
                        <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#111814' }}>
                            <code>{order.referenceCode}</code>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 600, color: '#111814' }}>{order.clientName}</div>
                            {cleanWa && (
                              <a
                                href={`https://wa.me/${cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '0.75rem', color: '#059669', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}
                              >
                                📱 {order.clientWhatsapp}
                              </a>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <Link
                              href={`/events/${order.event.id}`}
                              style={{ color: '#0f766e', fontWeight: 600, textDecoration: 'none' }}
                            >
                              {order.event.title}
                            </Link>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              📅 {formatSimpleDate(order.event.eventDate)}
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#334155' }}>
                              {order.packageCode}
                            </span>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111814', marginTop: '3px' }}>
                              {formatRupiah(order.priceAmount)}
                            </div>
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
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontSize: '0.8125rem', color: '#334155' }}>
                              {formatSimpleDate(order.event.activeUntil)}
                            </div>
                            {expiry.variant === 'warning' && (
                              <span style={{ display: 'inline-block', fontSize: '0.6875rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', marginTop: '2px' }}>
                                ⚠️ {expiry.label}
                              </span>
                            )}
                            {expiry.variant === 'expired' && (
                              <span style={{ display: 'inline-block', fontSize: '0.6875rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', marginTop: '2px' }}>
                                ⛔ {expiry.label}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <button
                              onClick={() => openUpdateModal(order)}
                              style={{
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                color: '#0f172a',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Ubah Status
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Status Update Modal ── */}
      {updatingOrder && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-modal-title"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: '1rem' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setUpdatingOrder(null);
          }}
        >
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 id="order-modal-title" style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 700 }}>
              Ubah Status Pesanan ({updatingOrder.referenceCode})
            </h3>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
              Klien: <strong>{updatingOrder.clientName}</strong> · Paket: <strong>{updatingOrder.packageCode}</strong> ({formatRupiah(updatingOrder.priceAmount)})
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Status Pesanan:
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              >
                <option value="DRAFT">DRAF</option>
                <option value="AWAITING_PAYMENT">MENUNGGU PEMBAYARAN</option>
                <option value="PAID">LUNAS (PAID)</option>
                <option value="IN_PROGRESS">SEDANG DIPROSES</option>
                <option value="LIVE">LIVE (PUBLIKASI AKTIF)</option>
                <option value="COMPLETED">SELESAI</option>
                <option value="CANCELLED">BATAL</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Masa Aktif Acara (activeUntil):
              </label>
              <input
                type="date"
                value={newActiveUntil}
                onChange={(e) => setNewActiveUntil(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Lewat dari tanggal ini, undangan publik otomatis ditutup (netral).
              </span>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Catatan Internal:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Catatan transfer bank / no rek / request khusus klien..."
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setUpdatingOrder(null)}
                disabled={submitting}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveStatus}
                disabled={submitting}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: '#111814', color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

