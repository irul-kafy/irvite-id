'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  IssuedTicketRecord,
  PublicCheckoutConfirmation,
  PublicTicketingEvent,
  TicketOrderRecord,
} from './types';
import { isTicketingEnabled } from '@/config/features';
import { TicketCatalogSection } from './components/ticket-catalog-section';
import { TicketOrderVerifySection } from './components/ticket-order-verify-section';
import { TicketCheckoutModal } from './components/ticket-checkout-modal';

type ClientTab = 'catalog' | 'my-ticket';

export default function ClientTicketingPage() {
  useEffect(() => {
    if (!isTicketingEnabled()) {
      window.location.replace('/');
    }
  }, []);

  const [activeTab, setActiveTab] = useState<ClientTab>('catalog');
  const [events, setEvents] = useState<PublicTicketingEvent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Checkout Modal State (No account required)
  const [checkoutEvent, setCheckoutEvent] =
    useState<PublicTicketingEvent | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [buyerWhatsapp, setBuyerWhatsapp] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('QRIS');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutConfirmation, setCheckoutConfirmation] =
    useState<PublicCheckoutConfirmation | null>(null);

  // Verified Order & Ticket Lookup State
  const [lookupCode, setLookupCode] = useState<string>('');
  const [lookupVerifier, setLookupVerifier] = useState<string>('');
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [verifiedOrder, setVerifiedOrder] = useState<TicketOrderRecord | null>(
    null,
  );
  const [selectedTicket, setSelectedTicket] =
    useState<IssuedTicketRecord | null>(null);

  const fetchEventsCatalog = useCallback(
    async (category: string, search: string) => {
      const params = new URLSearchParams();
      if (category && category !== 'Semua') {
        params.set('category', category);
      }
      if (search.trim()) {
        params.set('q', search.trim());
      }
      const res = await fetch(
        `/api/ticketing${params.size ? `?${params.toString()}` : ''}`,
        { cache: 'no-store' },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.message ||
            'Gagal memuat daftar acara dari server. Silakan coba lagi.',
        );
      }
      const list: PublicTicketingEvent[] = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.events)
          ? data.events
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [];
      return list;
    },
    [],
  );

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await fetchEventsCatalog(selectedCategory, searchQuery);
      setEvents(list);
    } catch (err) {
      setEvents([]);
      setLoadError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat daftar acara dari server. Silakan coba lagi.',
      );
    } finally {
      setLoading(false);
    }
  }, [fetchEventsCatalog, selectedCategory, searchQuery]);

  useEffect(() => {
    let active = true;
    fetchEventsCatalog(selectedCategory, searchQuery)
      .then((list) => {
        if (active) {
          setEvents(list);
          setLoadError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setEvents([]);
          setLoadError(
            err instanceof Error
              ? err.message
              : 'Gagal memuat daftar acara dari server. Silakan coba lagi.',
          );
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [fetchEventsCatalog, selectedCategory, searchQuery]);

  function openCheckout(ev: PublicTicketingEvent) {
    setCheckoutEvent(ev);
    const availableTier =
      ev.tiers.find((t) => t.remainingQuota > 0) || ev.tiers[0];
    setSelectedTierId(availableTier?.id || '');
    setQuantity(1);
    setCheckoutError(null);
    setCheckoutConfirmation(null);
  }

  async function handleCheckoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checkoutEvent) return;
    setCheckoutSubmitting(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/ticketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkout',
          eventSlug: checkoutEvent.slug,
          tierId: selectedTierId,
          quantity,
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          buyerWhatsapp: buyerWhatsapp.trim(),
          paymentMethod,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.message || 'Gagal memproses pesanan tiket. Silakan coba lagi.',
        );
      }
      setCheckoutConfirmation(data as PublicCheckoutConfirmation);
      setLookupCode(data.orderCode || '');
      setLookupVerifier(data.accessToken || '');
    } catch (err) {
      setCheckoutError(
        err instanceof Error
          ? err.message
          : 'Gagal menghubungi server untuk membuat pesanan.',
      );
    } finally {
      setCheckoutSubmitting(false);
    }
  }

  async function handleVerifyOrderSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupCode.trim() || !lookupVerifier.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setVerifiedOrder(null);
    setSelectedTicket(null);

    const verifier = lookupVerifier.trim();

    try {
      const res = await fetch('/api/ticketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-order',
          code: lookupCode.trim(),
          accessToken: verifier,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.message ||
            'Verifikasi gagal. Pastikan kode pesanan dan token akses sesuai.',
        );
      }
      const order: TicketOrderRecord | null = data?.order || null;
      setVerifiedOrder(order);
      setSelectedTicket(
        data?.primaryTicket || data?.ticket || order?.tickets?.[0] || null,
      );
    } catch (err) {
      setLookupError(
        err instanceof Error
          ? err.message
          : 'Gagal memverifikasi pesanan dengan server.',
      );
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <div className="irv-tkt-page">
      <style>{`
        .irv-tkt-page {
          min-height: 100vh;
          background: var(--tkt-bg);
          color: var(--tkt-text-primary);
          padding-bottom: 4rem;
        }
        .irv-tkt-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 clamp(1rem, 2.5vw, 2rem);
        }
        .irv-tkt-header {
          background: var(--tkt-surface);
          border-bottom: 1px solid var(--tkt-border);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .irv-tkt-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          height: 68px;
          flex-wrap: wrap;
        }
        .irv-tkt-nav {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
        }
        .irv-tkt-btn {
          padding: 0.55rem 1rem;
          border-radius: var(--tkt-radius-sm);
          font-size: 0.875rem;
          font-weight: 700;
          border: 1px solid var(--tkt-border);
          background: var(--tkt-surface);
          color: var(--tkt-text-primary);
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
        }
        .irv-tkt-btn--primary {
          background: var(--tkt-primary);
          color: var(--tkt-surface);
          border-color: var(--tkt-primary);
        }
        .irv-tkt-btn--primary:hover {
          background: var(--tkt-primary-hover);
        }
        .irv-tkt-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.25rem;
          margin-top: 1.25rem;
        }
        .irv-tkt-card {
          background: var(--tkt-surface);
          border: 1px solid var(--tkt-border);
          border-radius: var(--tkt-radius-lg);
          overflow: hidden;
          box-shadow: var(--tkt-shadow-sm);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .irv-tkt-banner {
          padding: 1.5rem 1.25rem;
          color: var(--tkt-surface);
          background: var(--tkt-primary);
        }
        .irv-tkt-card-body {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex: 1;
        }
        .irv-tkt-alert-error {
          background: var(--tkt-danger-bg);
          border: 1px solid var(--tkt-danger-border);
          color: var(--tkt-danger);
          padding: 1.25rem;
          border-radius: var(--tkt-radius-md);
          margin-top: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
      `}</style>

      <header className="irv-tkt-header">
        <div className="irv-tkt-container irv-tkt-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <Link
              href="/"
              style={{
                fontWeight: 800,
                fontSize: '1.15rem',
                color: 'var(--tkt-text-primary)',
                textDecoration: 'none',
              }}
            >
              IRVITE
            </Link>
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--tkt-text-secondary)',
                background: 'var(--tkt-surface-subtle)',
                padding: '0.25rem 0.6rem',
                borderRadius: 'var(--tkt-radius-sm)',
                fontWeight: 600,
              }}
            >
              Penjualan tiket acara
            </span>
          </div>

          <nav className="irv-tkt-nav" aria-label="Navigasi tiket">
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`irv-tkt-btn ${activeTab === 'catalog' ? 'irv-tkt-btn--primary' : ''}`}
            >
              Katalog acara
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('my-ticket')}
              className={`irv-tkt-btn ${activeTab === 'my-ticket' ? 'irv-tkt-btn--primary' : ''}`}
            >
              Cek pesanan dan tiket
            </button>
            <Link href="/partnership" className="irv-tkt-btn">
              Ajukan acara EO
            </Link>
          </nav>
        </div>
      </header>

      <main className="irv-tkt-container" style={{ paddingTop: '1.75rem' }}>
        {activeTab === 'catalog' ? (
          <TicketCatalogSection
            events={events}
            loading={loading}
            loadError={loadError}
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            onSearchChange={setSearchQuery}
            onCategoryChange={setSelectedCategory}
            onRetry={() => void loadEvents()}
            onOpenCheckout={openCheckout}
          />
        ) : (
          <TicketOrderVerifySection
            lookupCode={lookupCode}
            lookupVerifier={lookupVerifier}
            lookupLoading={lookupLoading}
            lookupError={lookupError}
            verifiedOrder={verifiedOrder}
            selectedTicket={selectedTicket}
            onLookupCodeChange={setLookupCode}
            onLookupVerifierChange={setLookupVerifier}
            onSubmit={handleVerifyOrderSubmit}
          />
        )}
      </main>

      {checkoutEvent && (
        <TicketCheckoutModal
          checkoutEvent={checkoutEvent}
          selectedTierId={selectedTierId}
          quantity={quantity}
          buyerName={buyerName}
          buyerEmail={buyerEmail}
          buyerWhatsapp={buyerWhatsapp}
          paymentMethod={paymentMethod}
          checkoutSubmitting={checkoutSubmitting}
          checkoutError={checkoutError}
          checkoutConfirmation={checkoutConfirmation}
          onClose={() => setCheckoutEvent(null)}
          onTierChange={setSelectedTierId}
          onQuantityChange={setQuantity}
          onBuyerNameChange={setBuyerName}
          onBuyerEmailChange={setBuyerEmail}
          onBuyerWhatsappChange={setBuyerWhatsapp}
          onPaymentMethodChange={setPaymentMethod}
          onSubmit={handleCheckoutSubmit}
          onViewOrderStatus={() => {
            setCheckoutEvent(null);
            setActiveTab('my-ticket');
          }}
        />
      )}
    </div>
  );
}
