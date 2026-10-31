'use client';

import { QRCodeSVG } from 'qrcode.react';
import './qr.css';

interface QRDisplayProps {
  canonicalUrl: string;
  guestName?: string;
  maxPax?: number;
}

export default function QRDisplay({ canonicalUrl, guestName, maxPax }: QRDisplayProps) {
  return (
    <div className="qr-container" id="guest-qr">
      <span className="qr-badge">TIKET REGISTRASI TAMU</span>
      <h3 className="qr-heading">Kode QR Kehadiran</h3>
      {guestName && (
        <p className="qr-guest-name">
          <strong>{guestName}</strong>
          {maxPax && maxPax > 1 ? <span> • Maks. {maxPax} Orang</span> : null}
        </p>
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
