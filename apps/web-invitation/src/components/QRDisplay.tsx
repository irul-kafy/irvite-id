'use client';

import { QRCodeSVG } from 'qrcode.react';
import './qr.css';

interface QRDisplayProps {
  canonicalUrl: string;
}

export default function QRDisplay({ canonicalUrl }: QRDisplayProps) {
  return (
    <div className="qr-container">
      <div className="qr-box">
        <QRCodeSVG 
          value={canonicalUrl} 
          size={200}
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
