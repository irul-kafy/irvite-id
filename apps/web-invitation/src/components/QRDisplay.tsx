'use client';

import { QRCodeSVG } from 'qrcode.react';
import './qr.css';

interface QRDisplayProps {
  canonicalUrl: string;
  guestName?: string;
  maxPax?: number;
  tableNumber?: string | null;
  className?: string;
  variant?: 'light' | 'dark' | 'balinese' | 'aetheria' | 'ranah-cinta' | 'sekar-kedaton' | 'royal-velvet' | 'opaline-nocturne' | 'auto';
}

export default function QRDisplay({
  canonicalUrl,
  guestName,
  maxPax,
  tableNumber,
  className = '',
  variant = 'light',
}: QRDisplayProps) {
  return (
    <div className={`qr-container ${variant} ${className}`} id="guest-qr">
      <span className="qr-badge">TIKET REGISTRASI TAMU</span>
      <h3 className="qr-heading">Kode QR Kehadiran</h3>
      {guestName && (
        <p className="qr-guest-name">
          <strong>{guestName}</strong>
          {maxPax && maxPax > 1 ? <span> • Maks. {maxPax} Orang</span> : null}
        </p>
      )}
      {tableNumber && (
        <div
          className="qr-table-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            margin: '0.25rem auto 0.5rem',
            padding: '4px 14px',
            borderRadius: '999px',
            background: 'rgba(197, 163, 101, 0.16)',
            color: '#c5a365',
            border: '1px solid rgba(197, 163, 101, 0.35)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          <span>📍</span>
          <span>Meja: {tableNumber}</span>
        </div>
      )}
      <div className="qr-box">
        <QRCodeSVG
          value={canonicalUrl}
          size={184}
          level="M"
          includeMargin={false}
        />
      </div>
      <p className="qr-instruction">
        Tunjukkan QR ini kepada petugas saat registrasi.
      </p>
    </div>
  );
}
