'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  IssuedTicketRecord,
  PublicTicketingEvent,
  PublicTicketTier,
  TicketOrderRecord,
} from '@/lib/ticketing-store';

const CATEGORIES = [
  'Semua',
  'Konser Musik',
  'Seminar & Edukasi',
  'Workshop',
  'Standup Comedy',
] as const;

const PLATFORM_FEE = 3000;

function formatRp(amount: number): string {
  if (amount <= 0) return 'Gratis';
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export default function IrviteTicketingCatalogPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'eticket' | 'scanner'>('catalog');
  const [events, setEvents] = useState<PublicTicketingEvent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);

  // Checkout Modal State
  const [selectedEvent, setSelectedEvent] = useState<PublicTicketingEvent | null>(null);
  const [selectedTier, setSelectedTier] = useState<PublicTicketTier | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [buyerName, setBuyerName] = useState<string>('Rizky Pratama');
  const [buyerEmail, setBuyerEmail] = useState<string>('rizky.pratama@gmail.com');
  const [buyerWhatsapp, setBuyerWhatsapp] = useState<string>('081288997711');
  const [paymentMethod, setPaymentMethod] = useState<string>('QRIS Instan');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Issued E-Ticket Pass State
  const [activeOrder, setActiveOrder] = useState<TicketOrderRecord | null>(null);
  const [activeTicketIndex, setActiveTicketIndex] = useState<number>(0);

  // Gate Scanner State
  const [scanCode, setScanCode] = useState<string>('IRV-TKT-2026-8821');
  const [scanGate, setScanGate] = useState<string>('Gate Utama A — VIP & Festival');
  const [scanLoading, setScanLoading] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<{
    valid: boolean;
    alreadyCheckedIn: boolean;
    message: string;
    ticket?: IssuedTicketRecord;
  } | null>(null);

  async function fetchCatalog() {
    setLoadingEvents(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'Semua') {
        params.set('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      const res = await fetch(`/api/ticketing?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      const items: PublicTicketingEvent[] = Array.isArray(data?.items) ? data.items : [];
      setEvents(items);
    } catch {
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }

  useEffect(() => {
    void fetchCatalog();
  }, [selectedCategory]);

  // Also load initial sample order so E-Ticket tab always has a pass ready to inspect
  useEffect(() => {
    async function loadInitialOrder() {
      try {
        const res = await fetch('/api/ticketing?mode=lookup&code=ORD-IRV-2026-8821', {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.order) {
            setActiveOrder(data.order);
          }
        }
      } catch {
        // ignore
      }
    }
    void loadInitialOrder();
  }, []);

  function openCheckout(event: PublicTicketingEvent) {
    setSelectedEvent(event);
    setSelectedTier(event.tiers[0] || null);
    setQuantity(1);
    setCheckoutError(null);
  }

  async function handleCheckoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEvent || !selectedTier) return;
    setCheckoutSubmitting(true);
    setCheckoutError(null);

    try {
      const res = await fetch('/api/ticketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkout',
          eventSlug: selectedEvent.slug,
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
        throw new Error(data?.message || 'Gagal memproses pembelian tiket.');
      }
      if (data?.order) {
        setActiveOrder(data.order);
        setActiveTicketIndex(0);
        setScanCode(data.order.tickets?.[0]?.ticketCode || 'IRV-TKT-2026-8821');
      }
      setSelectedEvent(null);
      setActiveTab('eticket');
      void fetchCatalog();
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Terjadi kesalahan saat checkout.');
    } finally {
      setCheckoutSubmitting(false);
    }
  }

  async function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    setScanLoading(true);
    setScanResult(null);

    try {
      const res = await fetch('/api/ticketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check-in',
          ticketCode: scanCode,
          gateName: scanGate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanResult({
          valid: false,
          alreadyCheckedIn: false,
          message: data?.message || 'Kode E-Ticket tidak valid.',
        });
      } else {
        setScanResult(data);
      }
    } catch {
      setScanResult({
        valid: false,
        alreadyCheckedIn: false,
        message: 'Gagal menghubungi server Gate Scanner.',
      });
    } finally {
      setScanLoading(false);
    }
  }

  const currentTicket: IssuedTicketRecord | null =
    activeOrder?.tickets?.[activeTicketIndex] || activeOrder?.tickets?.[0] || null;

  const subtotal = (selectedTier?.price || 0) * quantity;
  const serviceFee = (selectedTier?.price || 0) > 0 ? PLATFORM_FEE * quantity : 0;
  const grandTotal = subtotal + serviceFee;

  return (
    <div className="irv-tiket-page">
      <style>{`
        .irv-tiket-page {
          min-height: 100vh;
          background-color: #edf4f0;
          color: #13261c;
          font-family: var(--font-plus-jakarta, 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif);
          padding-bottom: 64px;
        }
        .irv-tiket-topbar {
          max-width: 1180px;
          margin: 0 auto;
          padding: 28px 24px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .irv-tiket-brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .irv-tiket-logo {
          height: 40px;
          width: auto;
          object-fit: contain;
        }
        .irv-back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 15px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(27, 59, 43, 0.14);
          color: #1b3b2b;
          font-size: 0.85rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.18s ease;
        }
        .irv-back-link:hover {
          background: #1b3b2b;
          color: #ffffff;
        }
        .irv-tab-group {
          display: flex;
          gap: 8px;
          background: #ffffff;
          padding: 6px;
          border-radius: 14px;
          border: 1px solid rgba(27, 59, 43, 0.12);
        }
        .irv-tab-btn {
          border: none;
          background: transparent;
          color: #4b6356;
          font-size: 0.86rem;
          font-weight: 700;
          padding: 9px 16px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .irv-tab-btn.active {
          background: #1b3b2b;
          color: #ffffff;
        }
        .irv-container {
          max-width: 1180px;
          margin: 0 auto;
          padding: 12px 24px;
        }
        .irv-hero-banner {
          background: linear-gradient(135deg, #1b3b2b 0%, #10241a 65%, #274f3b 100%);
          color: #ffffff;
          border-radius: 24px;
          padding: 32px 34px;
          margin-bottom: 26px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
          box-shadow: 0 18px 40px -16px rgba(17, 38, 28, 0.35);
        }
        .irv-filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .irv-cat-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .irv-cat-pill {
          border: 1px solid rgba(27, 59, 43, 0.16);
          background: #ffffff;
          color: #2c4639;
          padding: 9px 16px;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .irv-cat-pill.active {
          background: #1b3b2b;
          color: #ffffff;
          border-color: #1b3b2b;
        }
        .irv-search-box {
          display: flex;
          gap: 8px;
          min-width: 280px;
          flex: 1;
          max-width: 380px;
        }
        .irv-search-input {
          flex: 1;
          padding: 10px 15px;
          border-radius: 999px;
          border: 1px solid rgba(27, 59, 43, 0.18);
          background: #ffffff;
          font-size: 0.88rem;
          outline: none;
        }
        .irv-catalog-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(265px, 1fr));
          gap: 22px;
        }
        /* Yesplis-style Event Card */
        .irv-event-card {
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(27, 59, 43, 0.1);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          box-shadow: 0 10px 26px -14px rgba(17, 38, 28, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .irv-event-card:hover {
          transform: translateY(-4px);
          border-color: #1b3b2b;
          box-shadow: 0 20px 36px -14px rgba(17, 38, 28, 0.18);
        }
        .irv-event-poster {
          aspect-ratio: 16 / 9;
          width: 100%;
          position: relative;
          padding: 16px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: #ffffff;
        }
        .irv-event-cat-badge {
          align-self: flex-start;
          background: rgba(15, 31, 23, 0.72);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(212, 175, 55, 0.45);
          color: #f8e7b0;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 5px 10px;
          border-radius: 999px;
        }
        .irv-event-poster-tag {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.88);
        }
        .irv-event-body {
          padding: 18px 18px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }
        .irv-event-title {
          font-size: 0.98rem;
          font-weight: 800;
          color: #12241b;
          text-transform: uppercase;
          line-height: 1.38;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .irv-event-meta {
          font-size: 0.82rem;
          color: #546d60;
          font-weight: 600;
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 4px;
        }
        .irv-event-footer {
          padding: 13px 18px 16px;
          border-top: 1px dashed #dfeae3;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .irv-price-label {
          font-size: 0.74rem;
          color: #647d70;
          font-weight: 600;
        }
        .irv-price-val {
          font-size: 1.08rem;
          font-weight: 800;
          color: #1b3b2b;
        }
        .irv-buy-pill {
          background: #1b3b2b;
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 8px 14px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
        }
      `}</style>

      {/* Top Navigation Bar */}
      <header className="irv-tiket-topbar">
        <div className="irv-tiket-brand">
          <Link href="/gateway" className="irv-back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Beranda Gateway
          </Link>
          <img src="/irvite-logo.png" alt="IRVITE.ID" className="irv-tiket-logo" />
        </div>

        <div className="irv-tab-group" role="tablist">
          <button
            type="button"
            className={`irv-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            Katalog Event ({events.length})
          </button>
          <button
            type="button"
            className={`irv-tab-btn ${activeTab === 'eticket' ? 'active' : ''}`}
            onClick={() => setActiveTab('eticket')}
          >
            E-Ticket Pass Saya
          </button>
          <button
            type="button"
            className={`irv-tab-btn ${activeTab === 'scanner' ? 'active' : ''}`}
            onClick={() => setActiveTab('scanner')}
          >
            Gate Scanner EO
          </button>
        </div>
      </header>

      <div className="irv-container">
        {/* TAB 1: EVENT DISCOVERY & CATALOG */}
        {activeTab === 'catalog' && (
          <>
            <section className="irv-hero-banner">
              <div style={{ maxWidth: '640px' }}>
                <div
                  style={{
                    display: 'inline-block',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#d4af37',
                    marginBottom: '8px',
                  }}
                >
                  IRVITE TICKETING &amp; PUBLIC EXPERIENCES
                </div>
                <h1 style={{ fontSize: 'clamp(1.45rem, 2.5vw, 2rem)', fontWeight: 800, margin: '0 0 8px' }}>
                  Cari &amp; Beli Tiket Event Favoritmu Secara Instan
                </h1>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.82)', fontSize: '0.92rem', lineHeight: 1.55 }}>
                  Pilih kategori tiket Presale, Reguler, atau VIP. E-Ticket QR Pass langsung terbit otomatis ke email dan WhatsApp Anda dengan biaya platform transparan Rp 3.000/tiket.
                </p>
              </div>
              <div>
                <Link
                  href="/dashboard"
                  style={{
                    display: 'inline-block',
                    background: '#d4af37',
                    color: '#12241b',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    textDecoration: 'none',
                  }}
                >
                  + Buat Event Baru di Dashboard
                </Link>
              </div>
            </section>

            <div className="irv-filter-bar">
              <div className="irv-cat-pills">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`irv-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <form
                className="irv-search-box"
                onSubmit={(e) => {
                  e.preventDefault();
                  void fetchCatalog();
                }}
              >
                <input
                  className="irv-search-input"
                  placeholder="Cari judul konser, seminar, kota..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="irv-buy-pill" style={{ borderRadius: '999px', padding: '0 18px' }}>
                  Cari
                </button>
              </form>
            </div>

            {loadingEvents ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#4d6658', fontWeight: 600 }}>
                Memuat katalog event resmi IRVITE.ID...
              </div>
            ) : (
              <div className="irv-catalog-grid">
                {events.map((event) => (
                  <article
                    key={event.id}
                    className="irv-event-card"
                    onClick={() => openCheckout(event)}
                  >
                    <div>
                      <div className="irv-event-poster" style={{ background: event.bannerGradient }}>
                        <span className="irv-event-cat-badge">{event.category}</span>
                        <div>
                          <div className="irv-event-poster-tag">{event.bannerTag}</div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '2px' }}>
                            Oleh {event.organizerName}
                          </div>
                        </div>
                      </div>

                      <div className="irv-event-body">
                        <h2 className="irv-event-title">{event.title}</h2>
                        <div className="irv-event-meta">
                          <span>
                            {event.eventDate} • {event.eventTime}
                          </span>
                          <span>
                            {event.venueName}, {event.city}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="irv-event-footer">
                      <div>
                        <div className="irv-price-label">Mulai Dari</div>
                        <div className="irv-price-val">{event.startingPriceLabel}</div>
                      </div>
                      <button
                        type="button"
                        className="irv-buy-pill"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCheckout(event);
                        }}
                      >
                        Pilih Tiket
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB 2: DIGITAL E-TICKET PASS */}
        {activeTab === 'eticket' && (
          <div style={{ maxWidth: '720px', margin: '12px auto' }}>
            {currentTicket && activeOrder ? (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '26px',
                  overflow: 'hidden',
                  border: '1.5px solid rgba(27, 59, 43, 0.16)',
                  boxShadow: '0 22px 48px -18px rgba(17, 38, 28, 0.2)',
                }}
              >
                <div
                  style={{
                    background: 'linear-gradient(135deg, #1b3b2b 0%, #0f2319 100%)',
                    color: '#ffffff',
                    padding: '28px 32px',
                    borderBottom: '3px solid #d4af37',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#d4af37',
                      }}
                    >
                      IRVITE OFFICIAL E-TICKET PASS • {currentTicket.status}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, opacity: 0.9 }}>
                      Order: {activeOrder.orderCode}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '10px 0 6px' }}>
                    {currentTicket.eventTitle}
                  </h2>
                  <div style={{ fontSize: '0.9rem', opacity: 0.88 }}>
                    {currentTicket.eventDate} • {currentTicket.eventTime} — {currentTicket.venueName}
                  </div>
                </div>

                <div
                  style={{
                    padding: '28px 32px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '24px',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#5b7366', fontWeight: 700, textTransform: 'uppercase' }}>
                        Pemegang Tiket
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#13261c' }}>
                        {currentTicket.holderName}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#4d6658' }}>
                        {currentTicket.holderEmail}
                      </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#5b7366', fontWeight: 700, textTransform: 'uppercase' }}>
                        Kategori Tier
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1b3b2b' }}>
                        {currentTicket.tierName}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#5b7366', fontWeight: 700, textTransform: 'uppercase' }}>
                        Kode Unik E-Ticket
                      </div>
                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          color: '#13261c',
                          background: '#eff5f1',
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          marginTop: '4px',
                        }}
                      >
                        {currentTicket.ticketCode}
                      </div>
                    </div>
                  </div>

                  {/* Clean Vector QR Code Box */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f7faf8',
                      border: '1.5px dashed #bfd2c7',
                      borderRadius: '18px',
                      padding: '20px',
                    }}
                  >
                    <svg width="136" height="136" viewBox="0 0 120 120" fill="none" aria-label="QR Code E-Ticket">
                      <rect width="120" height="120" rx="8" fill="#ffffff" />
                      <rect x="10" y="10" width="30" height="30" stroke="#1b3b2b" strokeWidth="6" />
                      <rect x="19" y="19" width="12" height="12" fill="#1b3b2b" />
                      <rect x="80" y="10" width="30" height="30" stroke="#1b3b2b" strokeWidth="6" />
                      <rect x="89" y="19" width="12" height="12" fill="#1b3b2b" />
                      <rect x="10" y="80" width="30" height="30" stroke="#1b3b2b" strokeWidth="6" />
                      <rect x="19" y="89" width="12" height="12" fill="#1b3b2b" />
                      <rect x="50" y="14" width="8" height="8" fill="#1b3b2b" />
                      <rect x="62" y="22" width="8" height="16" fill="#1b3b2b" />
                      <rect x="48" y="46" width="24" height="24" rx="4" fill="#d4af37" />
                      <rect x="55" y="53" width="10" height="10" fill="#1b3b2b" />
                      <rect x="14" y="50" width="16" height="8" fill="#1b3b2b" />
                      <rect x="34" y="58" width="8" height="12" fill="#1b3b2b" />
                      <rect x="82" y="50" width="12" height="8" fill="#1b3b2b" />
                      <rect x="98" y="62" width="12" height="12" fill="#1b3b2b" />
                      <rect x="50" y="82" width="12" height="12" fill="#1b3b2b" />
                      <rect x="68" y="92" width="16" height="16" fill="#1b3b2b" />
                      <rect x="90" y="84" width="20" height="8" fill="#1b3b2b" />
                    </svg>
                    <span style={{ fontSize: '0.76rem', color: '#546d60', fontWeight: 700, marginTop: '8px' }}>
                      Tunjukkan QR di Gate Scanner
                    </span>
                  </div>
                </div>

                {activeOrder.tickets.length > 1 && (
                  <div
                    style={{
                      padding: '14px 32px',
                      background: '#f4f8f5',
                      borderTop: '1px solid #dfeae3',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4d6658' }}>
                      Pilih Tiket dalam Pesanan Ini:
                    </span>
                    {activeOrder.tickets.map((t, idx) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTicketIndex(idx)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #1b3b2b',
                          background: idx === activeTicketIndex ? '#1b3b2b' : '#ffffff',
                          color: idx === activeTicketIndex ? '#ffffff' : '#1b3b2b',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Tiket #{idx + 1} ({t.ticketCode})
                      </button>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    padding: '18px 32px',
                    background: '#eff5f1',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <span style={{ fontSize: '0.84rem', color: '#4a6356', fontWeight: 600 }}>
                    Total Dibayar ({activeOrder.quantity} Tiket): <strong>{formatRp(activeOrder.totalAmount)}</strong>
                  </span>
                  <button
                    type="button"
                    className="irv-buy-pill"
                    onClick={() => {
                      setScanCode(currentTicket.ticketCode);
                      setActiveTab('scanner');
                    }}
                  >
                    Uji Scan Tiket Ini di Gate Scanner
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px', background: '#ffffff', borderRadius: '20px' }}>
                Pilih event di tab Katalog untuk menerbitkan E-Ticket baru.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GATE SCANNER CHECK-IN */}
        {activeTab === 'scanner' && (
          <div
            style={{
              maxWidth: '640px',
              margin: '12px auto',
              background: '#ffffff',
              borderRadius: '24px',
              padding: '30px',
              border: '1px solid rgba(27, 59, 43, 0.14)',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '5px 11px',
                borderRadius: '999px',
                background: '#edf4f0',
                color: '#1b3b2b',
                marginBottom: '8px',
              }}
            >
              EO Gate Check-In Scanner
            </span>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 800 }}>
              Validasi QR E-Ticket &amp; Anti-Duplikasi
            </h2>
            <p style={{ margin: '0 0 20px', color: '#546d60', fontSize: '0.9rem', lineHeight: 1.55 }}>
              Masukkan atau scan kode E-Ticket pengunjung. Sistem otomatis mencatat waktu check-in dan menolak tiket yang sudah pernah digunakan.
            </p>

            <form onSubmit={handleScanSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label
                  htmlFor="gate-select"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}
                >
                  Lokasi Pintu / Gate
                </label>
                <input
                  id="gate-select"
                  value={scanGate}
                  onChange={(e) => setScanGate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #d5e2da',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="scan-ticket-code"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}
                >
                  Kode E-Ticket Pengunjung
                </label>
                <input
                  id="scan-ticket-code"
                  value={scanCode}
                  onChange={(e) => setScanCode(e.target.value)}
                  placeholder="IRV-TKT-2026-8821"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #d5e2da',
                    fontSize: '0.95rem',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                className="irv-buy-pill"
                disabled={scanLoading}
                style={{ width: '100%', padding: '13px', fontSize: '0.92rem', borderRadius: '12px' }}
              >
                {scanLoading ? 'Memverifikasi E-Ticket...' : 'Verifikasi & Check-In Sekarang'}
              </button>
            </form>

            {scanResult && (
              <div
                style={{
                  marginTop: '18px',
                  padding: '16px',
                  borderRadius: '14px',
                  background: scanResult.valid ? '#ecfdf5' : '#fef2f2',
                  border: `1.5px solid ${scanResult.valid ? '#6ee7b7' : '#fecaca'}`,
                  color: scanResult.valid ? '#065f46' : '#991b1b',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '4px' }}>
                  {scanResult.valid
                    ? 'AKSES DITERIMA — TIKET VALID'
                    : scanResult.alreadyCheckedIn
                      ? 'AKSES DITOLAK — TIKET SUDAH DIGUNAKAN'
                      : 'AKSES DITOLAK — TIKET TIDAK DITEMUKAN'}
                </div>
                <div style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>{scanResult.message}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MULTI-TIER CHECKOUT MODAL */}
      {selectedEvent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(12, 26, 19, 0.58)',
            backdropFilter: 'blur(5px)',
            zIndex: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '660px',
              width: '100%',
              padding: '28px 30px',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 28px 60px -15px rgba(10, 25, 18, 0.35)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: '#1b3b2b',
                    background: '#edf4f0',
                    padding: '4px 10px',
                    borderRadius: '999px',
                  }}
                >
                  {selectedEvent.category}
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '8px 0 4px' }}>
                  {selectedEvent.title}
                </h2>
                <div style={{ fontSize: '0.84rem', color: '#546d60' }}>
                  {selectedEvent.eventDate} • {selectedEvent.venueName}, {selectedEvent.city}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                style={{
                  border: 'none',
                  background: '#f0f5f2',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                X
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, marginBottom: '8px', color: '#1b3b2b' }}>
                1. Pilih Kategori Tiket (Tier)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                {selectedEvent.tiers.map((tier) => {
                  const isSelected = selectedTier?.id === tier.id;
                  return (
                    <div
                      key={tier.id}
                      onClick={() => setSelectedTier(tier)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '14px',
                        border: isSelected ? '2px solid #1b3b2b' : '1.5px solid #d8e5de',
                        background: isSelected ? '#f3f8f5' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#13261c' }}>
                          {tier.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#567062', marginTop: '2px' }}>
                          {tier.description}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#1b3b2b', fontWeight: 700, marginTop: '4px' }}>
                          Sisa Kuota: {tier.remainingQuota} tiket ({tier.statusLabel})
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1b3b2b', flexShrink: 0 }}>
                        {formatRp(tier.price)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                  gap: '12px',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px' }}>
                    Jumlah Tiket
                  </label>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #d5e2da',
                      fontSize: '0.9rem',
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px' }}>
                    Metode Pembayaran
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #d5e2da',
                      fontSize: '0.9rem',
                    }}
                  >
                    <option value="QRIS Instan">QRIS Instan (Bebas Biaya Admin)</option>
                    <option value="BCA Virtual Account">BCA Virtual Account</option>
                    <option value="Mandiri Virtual Account">Mandiri Virtual Account</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px' }}>
                    Nama Lengkap Pemesan
                  </label>
                  <input
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #d5e2da',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px' }}>
                    Email Pengiriman E-Ticket
                  </label>
                  <input
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #d5e2da',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '5px' }}>
                    Nomor WhatsApp
                  </label>
                  <input
                    required
                    value={buyerWhatsapp}
                    onChange={(e) => setBuyerWhatsapp(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #d5e2da',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Price Summary */}
              <div
                style={{
                  background: '#f4f8f5',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  fontSize: '0.86rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Subtotal Tiket ({quantity}x)</span>
                  <strong>{formatRp(subtotal)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#4d6658' }}>
                  <span>Biaya Layanan Platform (Flat Rp 3.000/tiket)</span>
                  <strong>{formatRp(serviceFee)}</strong>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '6px',
                    borderTop: '1px dashed #c8d8cf',
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: '#1b3b2b',
                  }}
                >
                  <span>Total Pembayaran</span>
                  <span>{formatRp(grandTotal)}</span>
                </div>
              </div>

              {checkoutError && (
                <div
                  style={{
                    marginBottom: '12px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: '#fef2f2',
                    color: '#991b1b',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                  }}
                >
                  {checkoutError}
                </div>
              )}

              <button
                type="submit"
                className="irv-buy-pill"
                disabled={checkoutSubmitting}
                style={{ width: '100%', padding: '14px', fontSize: '0.94rem', borderRadius: '12px' }}
              >
                {checkoutSubmitting
                  ? 'Memproses Pembayaran & Menerbitkan E-Ticket...'
                  : `Bayar Sekarang & Terbitkan E-Ticket (${formatRp(grandTotal)})`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
