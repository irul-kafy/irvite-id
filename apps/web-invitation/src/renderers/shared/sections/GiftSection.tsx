'use client';

import React, { useState } from 'react';
import { QrisGiftCard, type QrisThemeVariant } from '../../../components/qris';

export interface GiftAccount {
  id?: string;
  provider: string;
  number: string;
  owner: string;
}

export interface GiftAddress {
  recipient: string;
  address: string;
  phone?: string;
}

export interface GiftSectionProps {
  title?: string;
  description?: string;
  accounts?: GiftAccount[];
  qrisUrl?: string | null;
  coupleName: string;
  theme?: QrisThemeVariant;
  address?: GiftAddress | null;
  onCopyGift?: (account: GiftAccount) => Promise<void> | void;
  className?: string;
  cardClassName?: string;
  buttonClassName?: string;
  customHeading?: React.ReactNode;
}

export function GiftSection({
  title = 'Tanda Kasih',
  description,
  accounts = [],
  qrisUrl,
  coupleName,
  theme,
  address,
  onCopyGift,
  className,
  cardClassName,
  buttonClassName,
  customHeading,
}: GiftSectionProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (account: GiftAccount) => {
    const id = account.id || account.number;
    try {
      if (onCopyGift) {
        await onCopyGift(account);
      } else {
        await navigator.clipboard.writeText(account.number.replace(/[\s-]/g, ''));
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  return (
    <section className={className} id="gift">
      {customHeading ? (
        customHeading
      ) : (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>{title}</h2>
          {description && <p style={{ margin: 0, opacity: 0.85 }}>{description}</p>}
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {accounts.map((acc, idx) => {
          const id = acc.id || String(idx);
          const isCopied = copiedId === (acc.id || acc.number);
          return (
            <div key={id} className={cardClassName}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{acc.provider}</div>
              <div style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 700, margin: '0.25rem 0' }}>
                {acc.number}
              </div>
              <div style={{ fontSize: '0.8125rem', opacity: 0.8 }}>a.n. {acc.owner}</div>
              <button
                type="button"
                onClick={() => void handleCopy(acc)}
                className={buttonClassName}
                style={{ marginTop: '0.5rem', cursor: 'pointer' }}
                aria-label={`Salin nomor rekening ${acc.provider}`}
              >
                {isCopied ? '✓ Berhasil Disalin' : 'Salin Nomor Rekening ↗'}
              </button>
            </div>
          );
        })}

        {qrisUrl && theme && (
          <QrisGiftCard
            qrisUrl={qrisUrl}
            coupleName={coupleName}
            theme={theme}
          />
        )}

        {address && (
          <div className={cardClassName}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Kirim Kado Fisik</div>
            <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>
              <strong>Penerima:</strong> {address.recipient}
            </p>
            <p style={{ margin: 0, fontSize: '0.8125rem', opacity: 0.85, whiteSpace: 'pre-wrap' }}>
              {address.address}
            </p>
            {address.phone && (
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', opacity: 0.85 }}>
                Telp: {address.phone}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
