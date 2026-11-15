'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  formatRupiah,
  INITIAL_EVENTS,
  IssuedTicketRecord,
  PLATFORM_FEE_PER_TICKET,
  PublicTicketingEvent,
  PublicTicketTier,
  TicketOrderRecord,
} from '@/lib/ticketing-store';

type ClientTab = 'catalog' | 'my-ticket';

const CATEGORIES = ['Semua', 'Konser Musik', 'Seminar & Edukasi', 'Workshop', 'Standup Comedy'] as const;

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconTicketStub() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  );
}

function DeterministicQrMatrix({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    const size = 11;
    const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    const drawFinder = (r0: number, c0: number) => {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          matrix[r0 + r][c0 + c] = true;
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(0, size - 3);
    drawFinder(size - 3, 0);

    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const inFinder =
          (r < 4 && c < 4) || (r < 4 && c >= size - 4) || (r >= size - 4 && c < 4);
        if (inFinder) continue;
        hash ^= (r * 31 + c * 17) & 0xff;
        hash = Math.imul(hash, 16777619);
        matrix[r][c] = (Math.abs(hash) % 10) < 5;
      }
    }
    return matrix;
  }, [seed]);

  return (
    <svg
      width="138"
      height="138"
      viewBox="0 0 11 11"
      shapeRendering="crispEdges"
      style={{
        background: '#ffffff',
        padding: '10px',
        borderRadius: '14px',
        border: '2px solid #d5e4dc',
      }}
      aria-label={`QR Code ${seed}`}
    >
      {cells.map((row, rIdx) =>
        row.map((filled, cIdx) =>
          filled ? <rect key={`${rIdx}-${cIdx}`} x={cIdx} y={rIdx} width={1} height={1} fill="#13281e" /> : null,
        ),
      )}
    </svg>
  );
}

const DEFAULT_DEMO_TICKET: IssuedTicketRecord = {
  id: 'tkt-demo-01',
  ticketCode: 'IRV-TKT-2026-8821',
  qrPayload: 'IRVITE-TICKET|IRV-TKT-2026-8821|evt-tkt-01|tier-01-presale',
  orderCode: 'ORD-IRV-2026-8821',
  eventId: 'evt-tkt-01',
  eventSlug: 'jakarta-indie-soundwave-2026',
  eventTitle: 'JAKARTA INDIE SOUNDWAVE FESTIVAL 2026',
  eventDate: '24 Agu 2026',
  eventTime: '15:00 - 23:00 WIB',
  venueName: 'Stadion Madya GBK, Senayan, Jakarta Pusat',
  tierId: 'tier-01-presale',
  tierName: 'Presale 1 — Festival Pass',
  holderName: 'Rizky Pratama',
  holderEmail: 'rizky.pratama@gmail.com',
  status: 'ISSUED',
  checkedInAt: null,
  checkedInGate: null,
};

export default function ClientTicketingPage() {
  const [activeTab, setActiveTab] = useState<ClientTab>('catalog');
  // Pre-populated with INITIAL_EVENTS so Katalog Event is NEVER 0
  const [events, setEvents] = useState<PublicTicketingEvent[]>(INITIAL_EVENTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Checkout Modal State
  const [checkoutEvent, setCheckoutEvent] = useState<PublicTicketingEvent | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [buyerWhatsapp, setBuyerWhatsapp] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('QRIS Instan');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // My E-Ticket Pass State
  const [activeOrder, setActiveOrder] = useState<TicketOrderRecord | null>(null);
  const [activeTicket, setActiveTicket] = useState<IssuedTicketRecord>(DEFAULT_DEMO_TICKET);
  const [ticketLookupInput, setTicketLookupInput] = useState<string>('IRV-TKT-2026-8821');
  const [ticketLookupMessage, setTicketLookupMessage] = useState<string | null>(null);

  const fetchCatalog = useCallback(async (category: string, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category && category !== 'Semua') params.set('category', category);
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/ticketing?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      const rawItems = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.events)
          ? data.events
          : [];
      if (rawItems.length > 0) {
        setEvents(rawItems);
      } else {
        // Filter INITIAL_EVENTS locally if API returned empty
        const fallback = INITIAL_EVENTS.filter((ev) => {
          if (category && category !== 'Semua' && ev.category !== category) return false;
          if (search.trim()) {
            const q = search.trim().toLowerCase();
            return `${ev.title} ${ev.category} ${ev.venueName} ${ev.city} ${ev.organizerName}`
              .toLowerCase()
              .includes(q);
          }
          return true;
        });
        setEvents(fallback);
      }
    } catch {
      setEvents(INITIAL_EVENTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog(selectedCategory, searchQuery);
  }, [fetchCatalog, selectedCategory]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get('tab');
      if (tabParam === 'my-ticket') {
        setActiveTab('my-ticket');
      }
    }
  }, []);

  function openCheckoutModal(event: PublicTicketingEvent) {
    setCheckoutEvent(event);
    const firstAvailable = event.tiers.find((t) => t.remainingQuota > 0) || event.tiers[0];
    setSelectedTierId(firstAvailable?.id || '');
    setQuantity(1);
    setCheckoutError(null);
  }

  const selectedTier: PublicTicketTier | undefined = useMemo(() => {
    if (!checkoutEvent) return undefined;
    return checkoutEvent.tiers.find((t) => t.id === selectedTierId) || checkoutEvent.tiers[0];
  }, [checkoutEvent, selectedTierId]);

  const subtotalAmount = (selectedTier?.price || 0) * quantity;
  const serviceFeeAmount = (selectedTier?.price || 0) > 0 ? PLATFORM_FEE_PER_TICKET * quantity : 0;
  const totalAmount = subtotalAmount + serviceFeeAmount;

  async function handleCheckoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checkoutEvent || !selectedTier) return;
    setCheckoutSubmitting(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/ticketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkout',
          eventSlug: checkoutEvent.slug,
          tierId: selectedTier.id,
          quantity,
          buyerName,
          buyerEmail,
          buyerWhatsapp,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data?.message || 'Gagal memproses pembelian tiket.');
      } else if (data?.order) {
        setActiveOrder(data.order);
        if (data.order.tickets?.[0]) {
          setActiveTicket(data.order.tickets[0]);
          setTicketLookupInput(data.order.tickets[0].ticketCode);
        }
        setCheckoutEvent(null);
        setActiveTab('my-ticket');
        fetchCatalog(selectedCategory, searchQuery);
      }
    } catch {
      setCheckoutError('Terjadi kesalahan koneksi saat memproses checkout.');
    } finally {
      setCheckoutSubmitting(false);
    }
  }

  async function handleLookupTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!ticketLookupInput.trim()) return;
    setTicketLookupMessage(null);
    try {
      const res = await fetch(
        `/api/ticketing?mode=lookup&code=${encodeURIComponent(ticketLookupInput.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setTicketLookupMessage(data?.message || 'Kode E-Ticket atau Order tidak ditemukan.');
      } else {
        if (data?.order) setActiveOrder(data.order);
        if (data?.ticket) setActiveTicket(data.ticket);
        setTicketLookupMessage(
          `Menampilkan E-Ticket resmi untuk kode ${data?.ticket?.ticketCode || ticketLookupInput.toUpperCase()}.`,
        );
      }
    } catch {
      setTicketLookupMessage('Gagal mencari kode tiket.');
    }
  }

  return (
    <div
      className="irv-client-tiket-root"
      style={{
        minHeight: '100vh',
        backgroundColor: '#edf4f0',
        color: '#13281e',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        paddingBottom: '4rem',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .irv-client-tiket-root,
        .irv-client-tiket-root h1,
        .irv-client-tiket-root h2,
        .irv-client-tiket-root h3,
        .irv-client-tiket-root p {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
      `}</style>
      {/* Top Client Navigation Bar (High Contrast, Zero Admin Buttons) */}
      <div
        style={{
          maxWidth: '1180px',
          margin: '0 auto',
          padding: '1.5rem 1.25rem 1rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.58rem 1.05rem',
              borderRadius: '999px',
              background: '#ffffff',
              border: '1.5px solid #bfd4c8',
              color: '#13281e',
              fontSize: '0.84rem',
              fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(19, 40, 30, 0.06)',
            }}
          >
            ← Beranda Utama
          </Link>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img
              src="/irvite-logo.png"
              alt="IRVITE.ID"
              style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
            />
          </Link>
        </div>

        {/* Client-Only Mode Switcher (Katalog Event & E-Ticket Pass Saya) */}
        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            background: '#ffffff',
            padding: '0.35rem',
            borderRadius: '14px',
            border: '1.5px solid #d5e4dc',
            boxShadow: '0 4px 14px rgba(19, 40, 30, 0.04)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            style={{
              padding: '0.52rem 1rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'catalog' ? '#1b3b2b' : 'transparent',
              color: activeTab === 'catalog' ? '#ffffff' : '#355244',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
            }}
          >
            Katalog Event ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my-ticket')}
            style={{
              padding: '0.52rem 1rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'my-ticket' ? '#1b3b2b' : 'transparent',
              color: activeTab === 'my-ticket' ? '#ffffff' : '#355244',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
            }}
          >
            E-Ticket Pass Saya
          </button>
        </div>
      </div>

      {/* Main Content Container */}
      <main style={{ maxWidth: '1180px', margin: '0 auto', padding: '0.5rem 1.25rem' }}>
        {activeTab === 'catalog' && (
          <>
            {/* Client Hero Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1b3b2b 0%, #10241a 60%, #28523d 100%)',
                borderRadius: '24px',
                padding: '2.2rem 2rem',
                color: '#ffffff',
                marginBottom: '1.5rem',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.25rem',
                boxShadow: '0 16px 38px rgba(19, 40, 30, 0.14)',
              }}
            >
              <div style={{ maxWidth: '640px' }}>
                <div
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#e5c170',
                    marginBottom: '0.45rem',
                  }}
                >
                  IRVITE TICKETING &amp; PUBLIC EXPERIENCES
                </div>
                <h1
                  style={{
                    fontSize: 'clamp(1.5rem, 2.8vw, 2.15rem)',
                    fontWeight: 800,
                    margin: '0 0 0.5rem 0',
                    lineHeight: 1.2,
                  }}
                >
                  Cari &amp; Beli Tiket Event Favoritmu Secara Instan
                </h1>
                <p style={{ margin: 0, fontSize: '0.92rem', color: '#d2e3da', lineHeight: 1.55 }}>
                  Pilih kategori tiket Presale, Reguler, atau VIP. E-Ticket QR Pass langsung terbit otomatis ke email dan WhatsApp Anda dengan biaya platform transparan Rp 3.000/tiket.
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('my-ticket')}
                  style={{
                    padding: '0.8rem 1.25rem',
                    borderRadius: '14px',
                    border: 'none',
                    background: '#d4af37',
                    color: '#13281e',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                  }}
                >
                  Cek E-Ticket Saya
                </button>
                <Link
                  href="/partnership"
                  style={{
                    padding: '0.8rem 1.25rem',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.28)',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    textDecoration: 'none',
                  }}
                >
                  Daftarkan Eventmu (EO)
                </Link>
              </div>
            </div>

            {/* Category Pills + Search Bar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: '0.52rem 1rem',
                        borderRadius: '999px',
                        border: active ? '1.5px solid #1b3b2b' : '1.5px solid #d5e4dc',
                        background: active ? '#1b3b2b' : '#ffffff',
                        color: active ? '#ffffff' : '#2d4b3c',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchCatalog(selectedCategory, searchQuery);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#ffffff',
                  border: '1.5px solid #d5e4dc',
                  borderRadius: '999px',
                  padding: '0.35rem 0.5rem 0.35rem 0.9rem',
                  minWidth: '280px',
                }}
              >
                <span style={{ color: '#4d6a5b', display: 'flex' }}>
                  <IconSearch />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari judul konser, seminar, kota..."
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.84rem',
                    flex: 1,
                    color: '#13281e',
                    background: 'transparent',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '0.42rem 0.85rem',
                    borderRadius: '999px',
                    border: 'none',
                    background: '#1b3b2b',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cari
                </button>
              </form>
            </div>

            {/* Event Grid */}
            {loading ? (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '3rem',
                  textAlign: 'center',
                  border: '1px solid #d5e4dc',
                  color: '#4d6a5b',
                  fontWeight: 600,
                }}
              >
                Memuat katalog event publik...
              </div>
            ) : events.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '3rem',
                  textAlign: 'center',
                  border: '1px solid #d5e4dc',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.35rem' }}>
                  Tidak ada event yang cocok dengan pencarian Anda
                </div>
                <p style={{ color: '#4d6a5b', fontSize: '0.88rem', marginBottom: '1rem' }}>
                  Silakan ubah kata kunci atau pilih kategori Semua untuk melihat seluruh jadwal event.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('Semua');
                    setSearchQuery('');
                    fetchCatalog('Semua', '');
                  }}
                  style={{
                    padding: '0.65rem 1.2rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#1b3b2b',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Tampilkan Semua Event
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
                  gap: '1.35rem',
                }}
              >
                {events.map((event) => {
                  const totalQuota = event.tiers.reduce((acc, t) => acc + t.quota, 0);
                  const totalSold = event.tiers.reduce((acc, t) => acc + t.soldCount, 0);
                  const soldPercent = totalQuota > 0 ? Math.min(100, Math.round((totalSold / totalQuota) * 100)) : 0;

                  return (
                    <article
                      key={event.id}
                      style={{
                        background: '#ffffff',
                        borderRadius: '20px',
                        border: '1.5px solid #d5e4dc',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 10px 26px rgba(19, 40, 30, 0.05)',
                      }}
                    >
                      <div>
                        {/* 16:9 Event Poster Banner */}
                        <div
                          style={{
                            background: event.bannerGradient,
                            padding: '1.35rem 1.35rem 1.15rem',
                            color: '#ffffff',
                            minHeight: '155px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                letterSpacing: '0.07em',
                                padding: '0.28rem 0.65rem',
                                borderRadius: '999px',
                                background: 'rgba(255, 255, 255, 0.16)',
                                backdropFilter: 'blur(4px)',
                              }}
                            >
                              {event.category}
                            </span>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                color: '#f3d486',
                                letterSpacing: '0.06em',
                              }}
                            >
                              {event.bannerTag}
                            </span>
                          </div>

                          <div style={{ marginTop: '1.1rem' }}>
                            <div style={{ fontSize: '0.74rem', color: '#cfe0d6', marginBottom: '0.2rem' }}>
                              Oleh {event.organizerName}
                            </div>
                            <h2
                              style={{
                                margin: 0,
                                fontSize: '1.08rem',
                                fontWeight: 800,
                                lineHeight: 1.3,
                                letterSpacing: '-0.01em',
                              }}
                            >
                              {event.title}
                            </h2>
                          </div>
                        </div>

                        {/* Event Body Details */}
                        <div style={{ padding: '1.15rem 1.35rem' }}>
                          <div style={{ display: 'grid', gap: '0.45rem', fontSize: '0.82rem', color: '#3b5949', marginBottom: '0.95rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <IconCalendar />
                              <span>
                                <strong>{event.eventDate}</strong> • {event.eventTime}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <IconMapPin />
                              <span>
                                {event.venueName}, <strong>{event.city}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Tier Badges */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.9rem' }}>
                            {event.tiers.map((tier) => (
                              <span
                                key={tier.id}
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  padding: '0.24rem 0.55rem',
                                  borderRadius: '8px',
                                  background: tier.statusLabel === 'HAMPIR HABIS' ? '#fef5e7' : '#edf4f0',
                                  color: tier.statusLabel === 'HAMPIR HABIS' ? '#9a6700' : '#1b3b2b',
                                  border: `1px solid ${tier.statusLabel === 'HAMPIR HABIS' ? '#f5d9a6' : '#cfe0d6'}`,
                                }}
                              >
                                {tier.name.split('—')[0].trim()} • Sisa {tier.remainingQuota}
                              </span>
                            ))}
                          </div>

                          {/* Quota Progress Bar */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', color: '#4d6a5b', marginBottom: '0.28rem' }}>
                              <span>Tiket Terjual</span>
                              <strong>
                                {totalSold} / {totalQuota} ({soldPercent}%)
                              </strong>
                            </div>
                            <div style={{ height: '6px', borderRadius: '999px', background: '#e4efe9', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${soldPercent}%`,
                                  height: '100%',
                                  background: soldPercent > 80 ? '#b58d3d' : '#1b3b2b',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Price & CTA */}
                      <div
                        style={{
                          padding: '0.95rem 1.35rem',
                          borderTop: '1px solid #e4efe9',
                          background: '#fafcfb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#5a7667', textTransform: 'uppercase', fontWeight: 700 }}>
                            Harga Mulai Dari
                          </div>
                          <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#1b3b2b' }}>
                            {event.startingPriceLabel}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openCheckoutModal(event)}
                          style={{
                            padding: '0.68rem 1.15rem',
                            borderRadius: '12px',
                            border: 'none',
                            background: '#1b3b2b',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          <IconTicketStub />
                          Pilih Tiket
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* TAB 2: MY E-TICKET PASS (Physical Emerald & Gold Ticket Stub + Tear-Line + T&C) */}
        {activeTab === 'my-ticket' && (
          <div style={{ maxWidth: '880px', margin: '0 auto' }}>
            {/* Search / Lookup Bar */}
            <form
              onSubmit={handleLookupTicket}
              style={{
                background: '#ffffff',
                padding: '1rem 1.25rem',
                borderRadius: '18px',
                border: '1.5px solid #d5e4dc',
                marginBottom: '1.35rem',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#13281e' }}>
                Cari E-Ticket atau Kode Pesanan Anda:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '260px' }}>
                <input
                  type="text"
                  value={ticketLookupInput}
                  onChange={(e) => setTicketLookupInput(e.target.value)}
                  placeholder="Contoh: IRV-TKT-2026-8821 atau ORD-IRV-2026-8821"
                  style={{
                    flex: 1,
                    padding: '0.58rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid #c5d9ce',
                    fontSize: '0.85rem',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '0.58rem 1.1rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#1b3b2b',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  Tampilkan E-Pass
                </button>
              </div>
              {ticketLookupMessage && (
                <div style={{ width: '100%', fontSize: '0.8rem', color: '#1b3b2b', fontWeight: 600 }}>
                  {ticketLookupMessage}
                </div>
              )}
            </form>

            {/* Physical-Style Emerald & Gold E-Ticket Pass */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '26px',
                border: '1.5px solid #c9ddd2',
                overflow: 'hidden',
                boxShadow: '0 22px 50px rgba(19, 40, 30, 0.09)',
              }}
            >
              {/* Top Emerald & Gold Header */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #1b3b2b 0%, #0f2419 65%, #274f3b 100%)',
                  padding: '1.75rem 2rem',
                  color: '#ffffff',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  borderBottom: '3px solid #d4af37',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', color: '#e5c170', marginBottom: '0.3rem' }}>
                    IRVITE.ID OFFICIAL E-TICKET PASS
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>
                    {activeTicket.eventTitle}
                  </h2>
                </div>
                <span
                  style={{
                    padding: '0.4rem 0.9rem',
                    borderRadius: '999px',
                    background: activeTicket.status === 'CHECKED_IN' ? '#f59e0b' : '#16a34a',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    letterSpacing: '0.06em',
                  }}
                >
                  {activeTicket.status === 'CHECKED_IN' ? 'SUDAH CHECK-IN' : 'AKTIF / SIap SCAN'}
                </span>
              </div>

              {/* Ticket Main Body + QR Stub */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  padding: '1.85rem 2rem',
                  gap: '1.75rem',
                  alignItems: 'center',
                }}
              >
                {/* Left Column: Holder & Venue Metadata */}
                <div style={{ display: 'grid', gap: '0.95rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#5a7667', fontWeight: 700, textTransform: 'uppercase' }}>
                        Pemegang Tiket
                      </div>
                      <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#13281e' }}>
                        {activeTicket.holderName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#4d6a5b' }}>{activeTicket.holderEmail}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#5a7667', fontWeight: 700, textTransform: 'uppercase' }}>
                        Kategori Tier
                      </div>
                      <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#9a7328' }}>
                        {activeTicket.tierName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#4d6a5b' }}>Order: {activeTicket.orderCode}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#5a7667', fontWeight: 700, textTransform: 'uppercase' }}>
                        Tanggal &amp; Waktu
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#13281e' }}>
                        {activeTicket.eventDate}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#4d6a5b' }}>{activeTicket.eventTime}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#5a7667', fontWeight: 700, textTransform: 'uppercase' }}>
                        Lokasi Venue
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#13281e' }}>
                        {activeTicket.venueName}
                      </div>
                    </div>
                  </div>

                  {activeOrder && activeOrder.tickets.length > 1 && (
                    <div
                      style={{
                        background: '#edf4f0',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '12px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.45rem',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1b3b2b' }}>
                        Pilih Tiket dalam Pesanan ({activeOrder.tickets.length}):
                      </span>
                      {activeOrder.tickets.map((t, i) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setActiveTicket(t)}
                          style={{
                            padding: '0.3rem 0.65rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeTicket.ticketCode === t.ticketCode ? '#1b3b2b' : '#ffffff',
                            color: activeTicket.ticketCode === t.ticketCode ? '#ffffff' : '#13281e',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Tiket #{i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: QR Code & Unique Code */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f6faf8',
                    borderRadius: '18px',
                    padding: '1.25rem',
                    border: '1.5px dashed #bfd4c8',
                  }}
                >
                  <DeterministicQrMatrix seed={activeTicket.qrPayload} />
                  <div
                    style={{
                      marginTop: '0.65rem',
                      fontFamily: 'monospace',
                      fontSize: '0.96rem',
                      fontWeight: 800,
                      color: '#13281e',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {activeTicket.ticketCode}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#4d6a5b', marginTop: '0.15rem' }}>
                    Tunjukkan QR ini pada petugas Gate Scanner
                  </div>
                </div>
              </div>

              {/* Perforated Tear-Line Divider with Side Semicircle Notches */}
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0.25rem 0',
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '999px',
                    background: '#edf4f0',
                    borderRight: '1.5px solid #c9ddd2',
                    marginLeft: '-13px',
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    borderTop: '2px dashed #bfd4c8',
                    margin: '0 0.75rem',
                  }}
                />
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '999px',
                    background: '#edf4f0',
                    borderLeft: '1.5px solid #c9ddd2',
                    marginRight: '-13px',
                  }}
                />
              </div>

              {/* Bottom Terms & Conditions + Actions */}
              <div
                style={{
                  padding: '1.35rem 2rem 1.75rem',
                  background: '#fafcfb',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div style={{ fontSize: '0.77rem', color: '#4d6a5b', maxWidth: '520px', lineHeight: 1.55 }}>
                  <strong>Syarat &amp; Ketentuan Masuk Venue:</strong> E-Ticket berlaku untuk 1 (satu) orang dan hanya dapat di-scan 1 kali di pintu masuk. Untuk penukaran gelang tiket fisik (Wristband), wajib membawa kartu identitas yang sesuai dengan nama pemegang tiket.
                </div>

                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      padding: '0.68rem 1.1rem',
                      borderRadius: '12px',
                      border: '1px solid #bfd4c8',
                      background: '#ffffff',
                      color: '#13281e',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cetak / Simpan PDF
                  </button>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeTicket.venueName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '0.68rem 1.1rem',
                      borderRadius: '12px',
                      background: '#1b3b2b',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      textDecoration: 'none',
                    }}
                  >
                    Buka Peta Lokasi
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Multi-Tier Checkout Modal */}
      {checkoutEvent && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(14, 30, 22, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            zIndex: 9999,
            overflowY: 'auto',
          }}
          onClick={() => setCheckoutEvent(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '580px',
              width: '100%',
              padding: '1.75rem',
              border: '1.5px solid #d5e4dc',
              boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9a7328', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  CHECKOUT TIKET INSTAN • {checkoutEvent.category}
                </div>
                <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.22rem', fontWeight: 800, color: '#13281e' }}>
                  {checkoutEvent.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutEvent(null)}
                style={{
                  background: '#edf4f0',
                  border: 'none',
                  borderRadius: '10px',
                  width: '34px',
                  height: '34px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} style={{ display: 'grid', gap: '1rem' }}>
              {/* Step 1: Select Tier */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#13281e', marginBottom: '0.45rem' }}>
                  1. Pilih Kategori Tiket (Multi-Tier)
                </label>
                <div style={{ display: 'grid', gap: '0.55rem' }}>
                  {checkoutEvent.tiers.map((tier) => {
                    const isSelected = selectedTier?.id === tier.id;
                    return (
                      <label
                        key={tier.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.8rem 1rem',
                          borderRadius: '14px',
                          border: isSelected ? '2px solid #1b3b2b' : '1.5px solid #d5e4dc',
                          background: isSelected ? '#f2f8f5' : '#ffffff',
                          cursor: tier.remainingQuota > 0 ? 'pointer' : 'not-allowed',
                          opacity: tier.remainingQuota > 0 ? 1 : 0.5,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <input
                            type="radio"
                            name="ticketTier"
                            checked={isSelected}
                            disabled={tier.remainingQuota <= 0}
                            onChange={() => setSelectedTierId(tier.id)}
                          />
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#13281e' }}>
                              {tier.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#4d6a5b' }}>
                              {tier.description} (Sisa {tier.remainingQuota})
                            </div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1b3b2b', flexShrink: 0 }}>
                          {formatRupiah(tier.price)}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Quantity & Buyer Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Jumlah Tiket
                  </label>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '10px',
                      border: '1px solid #c5d9ce',
                      fontWeight: 700,
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} Tiket
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Nama Lengkap Pemesan
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Nama sesuai KTP / Identitas"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #c5d9ce',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Email Penerima E-Ticket
                  </label>
                  <input
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="email.aktif@gmail.com"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #c5d9ce',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Nomor WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={buyerWhatsapp}
                    onChange={(e) => setBuyerWhatsapp(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #c5d9ce',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  Metode Pembayaran Instan
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid #c5d9ce',
                    fontWeight: 600,
                  }}
                >
                  <option value="QRIS Instan">QRIS Instan (GoPay, OVO, Dana, Mobile Banking)</option>
                  <option value="Virtual Account BCA">BCA Virtual Account</option>
                  <option value="Virtual Account Mandiri">Mandiri Virtual Account</option>
                </select>
              </div>

              {/* Price Summary */}
              <div
                style={{
                  background: '#edf4f0',
                  borderRadius: '14px',
                  padding: '0.95rem 1.1rem',
                  border: '1px solid #cfe0d6',
                  fontSize: '0.84rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span>
                    Subtotal Tiket ({quantity}x {selectedTier?.name.split('—')[0].trim()})
                  </span>
                  <strong>{formatRupiah(subtotalAmount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem', color: '#436052' }}>
                  <span>Biaya Layanan Platform (Rp 3.000 / tiket)</span>
                  <strong>{formatRupiah(serviceFeeAmount)}</strong>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '0.45rem',
                    borderTop: '1px solid #c5d9ce',
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: '#1b3b2b',
                  }}
                >
                  <span>Total Pembayaran</span>
                  <span>{formatRupiah(totalAmount)}</span>
                </div>
              </div>

              {checkoutError && (
                <div style={{ color: '#9b1c1c', background: '#fdecec', padding: '0.65rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600 }}>
                  {checkoutError}
                </div>
              )}

              <button
                type="submit"
                disabled={checkoutSubmitting}
                style={{
                  padding: '0.85rem 1.25rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#1b3b2b',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: checkoutSubmitting ? 'wait' : 'pointer',
                }}
              >
                {checkoutSubmitting ? 'Menerbitkan E-Ticket...' : 'Bayar & Terbitkan E-Ticket Sekarang'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
