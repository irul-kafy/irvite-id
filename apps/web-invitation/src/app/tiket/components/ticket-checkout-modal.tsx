'use client';

import React from 'react';
import {
  formatRupiah,
  PLATFORM_FEE_PER_TICKET,
  PublicCheckoutConfirmation,
  PublicTicketingEvent,
} from '../types';

interface TicketCheckoutModalProps {
  checkoutEvent: PublicTicketingEvent;
  selectedTierId: string;
  quantity: number;
  buyerName: string;
  buyerEmail: string;
  buyerWhatsapp: string;
  paymentMethod: string;
  checkoutSubmitting: boolean;
  checkoutError: string | null;
  checkoutConfirmation: PublicCheckoutConfirmation | null;
  onClose: () => void;
  onTierChange: (tierId: string) => void;
  onQuantityChange: (qty: number) => void;
  onBuyerNameChange: (name: string) => void;
  onBuyerEmailChange: (email: string) => void;
  onBuyerWhatsappChange: (wa: string) => void;
  onPaymentMethodChange: (method: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onViewOrderStatus: () => void;
}

export function TicketCheckoutModal({
  checkoutEvent,
  selectedTierId,
  quantity,
  buyerName,
  buyerEmail,
  buyerWhatsapp,
  paymentMethod,
  checkoutSubmitting,
  checkoutError,
  checkoutConfirmation,
  onClose,
  onTierChange,
  onQuantityChange,
  onBuyerNameChange,
  onBuyerEmailChange,
  onBuyerWhatsappChange,
  onPaymentMethodChange,
  onSubmit,
  onViewOrderStatus,
}: TicketCheckoutModalProps) {
  const activeTier =
    checkoutEvent.tiers.find((t) => t.id === selectedTierId) ||
    checkoutEvent.tiers[0];
  const unitPrice = activeTier?.price ?? 0;
  const subtotal = unitPrice * quantity;
  const serviceFee = unitPrice === 0 ? 0 : PLATFORM_FEE_PER_TICKET * quantity;
  const totalAmount = subtotal + serviceFee;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(19, 40, 30, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--tkt-surface)',
          border: '1px solid var(--tkt-border)',
          borderRadius: 'var(--tkt-radius-lg)',
          maxWidth: '540px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.5rem',
          boxShadow: 'var(--tkt-shadow-md)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div>
            <h2
              id="checkout-dialog-title"
              style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}
            >
              Pemesanan tiket acara
            </h2>
            <div
              style={{
                fontSize: '0.85rem',
                color: 'var(--tkt-text-secondary)',
                marginTop: '0.2rem',
              }}
            >
              {checkoutEvent.title}
            </div>
          </div>
          <button type="button" onClick={onClose} className="irv-tkt-btn">
            Tutup
          </button>
        </div>

        {checkoutConfirmation ? (
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--tkt-radius-md)',
              background: 'var(--tkt-surface-subtle)',
              border: '1px solid var(--tkt-border)',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--tkt-warning)',
                background: 'var(--tkt-warning-bg)',
                border: '1px solid var(--tkt-warning-border)',
                display: 'inline-block',
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--tkt-radius-sm)',
                marginBottom: '0.65rem',
              }}
            >
              Status pesanan: Menunggu pembayaran ({checkoutConfirmation.status})
            </div>
            <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem' }}>
              Kode pesanan: {checkoutConfirmation.orderCode}
            </h3>
            {checkoutConfirmation.accessToken && (
              <div
                style={{
                  fontSize: '0.82rem',
                  fontFamily: 'monospace',
                  background: 'var(--tkt-surface)',
                  border: '1px solid var(--tkt-border)',
                  borderRadius: 'var(--tkt-radius-sm)',
                  padding: '0.45rem 0.65rem',
                  marginBottom: '0.65rem',
                  wordBreak: 'break-all',
                }}
              >
                <strong>Token akses pesanan:</strong>{' '}
                {checkoutConfirmation.accessToken}
              </div>
            )}
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--tkt-text-secondary)',
                lineHeight: 1.5,
                margin: '0 0 0.85rem 0',
              }}
            >
              {checkoutConfirmation.message}
            </p>
            <div
              style={{
                fontSize: '0.85rem',
                display: 'grid',
                gap: '0.3rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <strong>Kategori tiket:</strong> {checkoutConfirmation.tierName}{' '}
                ({checkoutConfirmation.quantity} tiket)
              </div>
              <div>
                <strong>Total tagihan:</strong>{' '}
                {formatRupiah(checkoutConfirmation.totalAmount)}
              </div>
              <div>
                <strong>Metode pembayaran:</strong>{' '}
                {checkoutConfirmation.paymentMethod}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={onViewOrderStatus}
                className="irv-tkt-btn irv-tkt-btn--primary"
              >
                Cek status pesanan
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: '0.85rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  marginBottom: '0.3rem',
                }}
              >
                Pilih kategori tiket
              </label>
              <select
                value={selectedTierId}
                onChange={(e) => onTierChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--tkt-radius-sm)',
                  border: '1px solid var(--tkt-border-strong)',
                  fontSize: '0.86rem',
                }}
              >
                {checkoutEvent.tiers.map((tier) => (
                  <option
                    key={tier.id}
                    value={tier.id}
                    disabled={tier.remainingQuota <= 0}
                  >
                    {tier.name} — {formatRupiah(tier.price)} (Sisa{' '}
                    {tier.remainingQuota})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  marginBottom: '0.3rem',
                }}
              >
                Jumlah tiket
              </label>
              <input
                type="number"
                min={1}
                max={10}
                required
                value={quantity}
                onChange={(e) =>
                  onQuantityChange(
                    Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                  )
                }
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--tkt-radius-sm)',
                  border: '1px solid var(--tkt-border-strong)',
                  fontSize: '0.86rem',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  marginBottom: '0.3rem',
                }}
              >
                Nama lengkap pemesan
              </label>
              <input
                type="text"
                required
                value={buyerName}
                onChange={(e) => onBuyerNameChange(e.target.value)}
                placeholder="Nama lengkap sesuai identitas"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--tkt-radius-sm)',
                  border: '1px solid var(--tkt-border-strong)',
                  fontSize: '0.86rem',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  marginBottom: '0.3rem',
                }}
              >
                Alamat email aktif
              </label>
              <input
                type="email"
                required
                value={buyerEmail}
                onChange={(e) => onBuyerEmailChange(e.target.value)}
                placeholder="nama@domain.com"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--tkt-radius-sm)',
                  border: '1px solid var(--tkt-border-strong)',
                  fontSize: '0.86rem',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  marginBottom: '0.3rem',
                }}
              >
                Nomor WhatsApp aktif
              </label>
              <input
                type="tel"
                required
                value={buyerWhatsapp}
                onChange={(e) => onBuyerWhatsappChange(e.target.value)}
                placeholder="0812xxxxxxxx"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--tkt-radius-sm)',
                  border: '1px solid var(--tkt-border-strong)',
                  fontSize: '0.86rem',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  marginBottom: '0.3rem',
                }}
              >
                Metode pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => onPaymentMethodChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--tkt-radius-sm)',
                  border: '1px solid var(--tkt-border-strong)',
                  fontSize: '0.86rem',
                }}
              >
                <option value="QRIS">QRIS</option>
                <option value="Virtual Account">Virtual Account</option>
              </select>
            </div>

            <div
              style={{
                padding: '0.85rem',
                borderRadius: 'var(--tkt-radius-sm)',
                background: 'var(--tkt-bg)',
                border: '1px solid var(--tkt-border)',
                fontSize: '0.84rem',
                display: 'grid',
                gap: '0.3rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal tiket ({quantity}x)</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Biaya layanan platform</span>
                <span>{formatRupiah(serviceFee)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 800,
                  borderTop: '1px solid var(--tkt-border)',
                  paddingTop: '0.35rem',
                  marginTop: '0.2rem',
                }}
              >
                <span>Total pembayaran</span>
                <span>{formatRupiah(totalAmount)}</span>
              </div>
            </div>

            {checkoutError && (
              <div className="irv-tkt-alert-error" role="alert">
                <span>{checkoutError}</span>
                <button
                  type="button"
                  onClick={(e) => onSubmit(e as unknown as React.FormEvent)}
                  className="irv-tkt-btn"
                >
                  Coba lagi
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={checkoutSubmitting}
              className="irv-tkt-btn irv-tkt-btn--primary"
            >
              {checkoutSubmitting
                ? 'Memproses pesanan...'
                : 'Buat pesanan tiket'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
