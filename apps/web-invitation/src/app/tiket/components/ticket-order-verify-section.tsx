'use client';

import React from 'react';
import {
  formatRupiah,
  IssuedTicketRecord,
  TicketOrderRecord,
} from '../types';

interface TicketOrderVerifySectionProps {
  lookupCode: string;
  lookupVerifier: string;
  lookupLoading: boolean;
  lookupError: string | null;
  verifiedOrder: TicketOrderRecord | null;
  selectedTicket: IssuedTicketRecord | null;
  onLookupCodeChange: (value: string) => void;
  onLookupVerifierChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function TicketOrderVerifySection({
  lookupCode,
  lookupVerifier,
  lookupLoading,
  lookupError,
  verifiedOrder,
  selectedTicket,
  onLookupCodeChange,
  onLookupVerifierChange,
  onSubmit,
}: TicketOrderVerifySectionProps) {
  return (
    <section aria-labelledby="verify-heading">
      <div
        style={{
          background: 'var(--tkt-surface)',
          border: '1px solid var(--tkt-border)',
          borderRadius: 'var(--tkt-radius-lg)',
          padding: '1.75rem',
          maxWidth: '680px',
          margin: '0 auto',
          boxShadow: 'var(--tkt-shadow-sm)',
        }}
      >
        <h1
          id="verify-heading"
          style={{
            margin: '0 0 0.45rem 0',
            fontSize: '1.35rem',
            fontWeight: 800,
          }}
        >
          Verifikasi pesanan dan lihat tiket
        </h1>
        <p
          style={{
            margin: '0 0 1.25rem 0',
            fontSize: '0.9rem',
            color: 'var(--tkt-text-secondary)',
            lineHeight: 1.5,
          }}
        >
          Demi keamanan data pribadi pemesan, masukkan kode pesanan beserta token akses pesanan yang diberikan saat pembuatan pesanan.
        </p>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: '0.85rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '0.3rem',
              }}
            >
              Kode pesanan
            </label>
            <input
              type="text"
              required
              value={lookupCode}
              onChange={(e) => onLookupCodeChange(e.target.value)}
              placeholder="Contoh: ORD-A1B2C3D4E5F6"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--tkt-radius-sm)',
                border: '1px solid var(--tkt-border-strong)',
                fontSize: '0.88rem',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '0.3rem',
              }}
            >
              Token akses pesanan
            </label>
            <input
              type="text"
              required
              value={lookupVerifier}
              onChange={(e) => onLookupVerifierChange(e.target.value)}
              placeholder="Masukkan token akses pesanan"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--tkt-radius-sm)',
                border: '1px solid var(--tkt-border-strong)',
                fontSize: '0.88rem',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={lookupLoading}
            className="irv-tkt-btn irv-tkt-btn--primary"
          >
            {lookupLoading
              ? 'Memverifikasi data pesanan...'
              : 'Verifikasi dan tampilkan pesanan'}
          </button>
        </form>

        {lookupError && (
          <div className="irv-tkt-alert-error" role="alert">
            <span>{lookupError}</span>
            <button
              type="button"
              onClick={(e) => onSubmit(e as unknown as React.FormEvent)}
              className="irv-tkt-btn"
            >
              Coba lagi
            </button>
          </div>
        )}

        {verifiedOrder && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1.25rem',
              borderRadius: 'var(--tkt-radius-md)',
              border: '1px solid var(--tkt-border)',
              background: 'var(--tkt-bg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginBottom: '0.75rem',
              }}
            >
              <div>
                <div
                  style={{ fontSize: '0.78rem', color: 'var(--tkt-text-muted)' }}
                >
                  Kode pesanan
                </div>
                <strong style={{ fontSize: '1.05rem' }}>
                  {verifiedOrder.orderCode}
                </strong>
              </div>
              <span
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--tkt-radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background:
                    verifiedOrder.status === 'PAID'
                      ? 'var(--tkt-success-bg)'
                      : 'var(--tkt-warning-bg)',
                  color:
                    verifiedOrder.status === 'PAID'
                      ? 'var(--tkt-success)'
                      : 'var(--tkt-warning)',
                  border: `1px solid ${
                    verifiedOrder.status === 'PAID'
                      ? 'var(--tkt-success-border)'
                      : 'var(--tkt-warning-border)'
                  }`,
                }}
              >
                {verifiedOrder.status === 'PAID'
                  ? 'Lunas'
                  : verifiedOrder.status === 'PENDING'
                    ? 'Menunggu pembayaran'
                    : verifiedOrder.status}
              </span>
            </div>

            <div
              style={{
                fontSize: '0.86rem',
                color: 'var(--tkt-text-secondary)',
                display: 'grid',
                gap: '0.35rem',
              }}
            >
              <div>
                <strong>Acara:</strong> {verifiedOrder.eventTitle}
              </div>
              <div>
                <strong>Pemesan:</strong> {verifiedOrder.buyerName} (
                {verifiedOrder.buyerEmail})
              </div>
              <div>
                <strong>Jumlah tiket:</strong> {verifiedOrder.quantity} tiket (
                {formatRupiah(verifiedOrder.totalAmount)})
              </div>
            </div>

            {verifiedOrder.status !== 'PAID' ? (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.85rem',
                  borderRadius: 'var(--tkt-radius-sm)',
                  background: 'var(--tkt-warning-bg)',
                  border: '1px solid var(--tkt-warning-border)',
                  color: 'var(--tkt-warning)',
                  fontSize: '0.84rem',
                }}
              >
                Pesanan ini masih berstatus menunggu konfirmasi pembayaran. Kode QR tiket akan otomatis diterbitkan setelah pembayaran terverifikasi oleh sistem.
              </div>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                <div
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                  }}
                >
                  Daftar tiket terbit ({verifiedOrder.tickets.length})
                </div>
                <div style={{ display: 'grid', gap: '0.65rem' }}>
                  {(selectedTicket
                    ? [
                        selectedTicket,
                        ...verifiedOrder.tickets.filter(
                          (t) => t.id !== selectedTicket.id,
                        ),
                      ]
                    : verifiedOrder.tickets
                  ).map((tk) => (
                    <div
                      key={tk.id}
                      style={{
                        padding: '0.85rem',
                        borderRadius: 'var(--tkt-radius-sm)',
                        border: '1px solid var(--tkt-border)',
                        background: 'var(--tkt-surface)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                        }}
                      >
                        <strong>{tk.ticketCode}</strong>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: 'var(--tkt-success)',
                          }}
                        >
                          {tk.status === 'CHECKED_IN'
                            ? 'Sudah digunakan masuk'
                            : 'Aktif'}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--tkt-text-secondary)',
                          marginTop: '0.25rem',
                        }}
                      >
                        Pemegang: {tk.holderName} — {tk.tierName}
                      </div>
                      {(tk.qrToken || tk.qrPayload) && (
                        <div
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.45rem 0.6rem',
                            background: 'var(--tkt-surface-subtle)',
                            borderRadius: 'var(--tkt-radius-sm)',
                            fontSize: '0.74rem',
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                          }}
                        >
                          Token QR: {tk.qrToken || tk.qrPayload}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
