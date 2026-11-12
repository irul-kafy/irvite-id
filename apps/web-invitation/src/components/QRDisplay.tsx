'use client';

import { useState, useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import './qr.css';

interface QRDisplayProps {
  canonicalUrl: string;
  guestName?: string;
  maxPax?: number;
  tableNumber?: string | null;
  eventTitle?: string;
  className?: string;
  variant?: 'light' | 'dark' | 'balinese' | 'aetheria' | 'ranah-cinta' | 'sekar-kedaton' | 'royal-velvet' | 'opaline-nocturne' | 'auto';
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 2
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  let linesCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      linesCount++;
      if (linesCount >= maxLines) {
        ctx.fillText(line.trim() + '...', x, currentY);
        return currentY;
      }
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY;
}

export default function QRDisplay({
  canonicalUrl,
  guestName,
  maxPax,
  tableNumber,
  eventTitle,
  className = '',
  variant = 'light',
}: QRDisplayProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const canvasQrRef = useRef<HTMLCanvasElement>(null);

  const handleDownloadTicket = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      const width = 900;
      const height = 1350;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D context unavailable');
      }

      // 1. Luxury Dark Gradient Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.35, '#1e1b4b');
      bgGrad.addColorStop(0.7, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Radial Gold Ambient Glow Behind QR
      const ambientGlow = ctx.createRadialGradient(width / 2, 700, 40, width / 2, 700, 450);
      ambientGlow.addColorStop(0, 'rgba(212, 175, 55, 0.12)');
      ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, width, height);

      // 2. Luxury Gold Frame & Border
      // Outer border
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      ctx.strokeRect(36, 36, width - 72, height - 72);

      // Inner hairline border
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(46, 46, width - 92, height - 92);

      // Ornate Corners
      const drawCorner = (cx: number, cy: number, dx: number, dy: number) => {
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy + dy * 24);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + dx * 24, cy);
        ctx.stroke();

        ctx.fillStyle = '#d4af37';
        ctx.fillRect(cx + dx * 6 - 2.5, cy + dy * 6 - 2.5, 5, 5);
      };
      drawCorner(36, 36, 1, 1);
      drawCorner(width - 36, 36, -1, 1);
      drawCorner(36, height - 36, 1, -1);
      drawCorner(width - 36, height - 36, -1, -1);

      // 3. Header Emblem & Brand
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fef08a';
      ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('✦   I R V I T E   •   D I G I T A L   G U E S T   P A S S   ✦', width / 2, 105);

      // Gold line separator
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(220, 126);
      ctx.lineTo(width - 220, 126);
      ctx.stroke();

      // 4. Event Title / Acara
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('THE WEDDING CELEBRATION OF', width / 2, 170);

      const titleText = eventTitle?.trim() || 'The Wedding Celebration';
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 32px Georgia, "Times New Roman", serif';
      wrapText(ctx, titleText, width / 2, 215, 720, 38, 2);

      // 5. Guest Information
      ctx.fillStyle = '#c5a365';
      ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('KARTU MASUK & PRESENSI RESEPSI', width / 2, 280);

      const nameText = guestName?.trim() || 'Tamu Undangan Terhormat';
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      wrapText(ctx, nameText, width / 2, 325, 740, 36, 2);

      // 6. Badges (Table Number & Pax)
      const badges: string[] = [];
      if (tableNumber) badges.push(`📍 Meja: ${tableNumber}`);
      if (maxPax && maxPax > 1) badges.push(`👥 Maks. ${maxPax} Orang`);
      else badges.push(`👥 1 Undangan`);

      const badgeText = badges.join('   •   ');
      ctx.font = '700 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textWidth = ctx.measureText(badgeText).width;
      const pillWidth = Math.min(680, textWidth + 48);
      const pillHeight = 38;
      const pillX = (width - pillWidth) / 2;
      const pillY = 380;

      ctx.fillStyle = 'rgba(197, 163, 101, 0.16)';
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      drawRoundRect(ctx, pillX, pillY, pillWidth, pillHeight, 19);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.fillText(badgeText, width / 2, pillY + 24);

      // 7. QR Container Box
      const qrBoxSize = 440;
      const qrBoxX = (width - qrBoxSize) / 2;
      const qrBoxY = 450;

      // Drop shadow for QR Box
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      drawRoundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize + 65, 24);
      ctx.fill();
      ctx.restore();

      // Border around QR container
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      drawRoundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize + 65, 24);
      ctx.stroke();

      // Draw QR Code from hidden canvas
      if (canvasQrRef.current) {
        const qrSize = 360;
        const qrX = (width - qrSize) / 2;
        const qrY = qrBoxY + 35;
        ctx.drawImage(canvasQrRef.current, qrX, qrY, qrSize, qrSize);
      }

      // Text under QR inside white box
      ctx.fillStyle = '#64748b';
      ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('SCAN KODE DI MEJA REGISTRASI TAMU', width / 2, qrBoxY + qrBoxSize + 40);

      // 8. Instructions
      const noteY = 1005;
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Tiket Registrasi Resmi Tamu Undangan', width / 2, noteY);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '400 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Tunjukkan kartu QR ini kepada panitia saat tiba di lokasi acara.', width / 2, noteY + 30);
      ctx.fillText('Dapat dibuka secara langsung dari perangkat tanpa koneksi internet.', width / 2, noteY + 54);

      // 9. Footer Divider & Watermark
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(180, 1145);
      ctx.lineTo(width - 180, 1145);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('OFFICIAL DIGITAL GUEST PASS • IRVITE.ID', width / 2, 1185);

      ctx.fillStyle = '#475569';
      ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Terverifikasi resmi melalui platform undangan digital pernikahan IRVITE.ID', width / 2, 1208);

      // 10. Generate Blob & Trigger Direct Download
      canvas.toBlob((blob) => {
        if (!blob) {
          setDownloading(false);
          return;
        }

        const safeName = (guestName || 'Tamu')
          .replace(/[^a-zA-Z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 35);
        const fileName = `Tiket-${safeName || 'Undangan'}.png`;

        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);

        setDownloadSuccess(true);
        setDownloading(false);
        setTimeout(() => setDownloadSuccess(false), 4500);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to generate ticket:', err);
      setDownloading(false);
    }
  };

  return (
    <div className={`qr-container ${variant} ${className}`} id="guest-qr">
      {/* Hidden high-res canvas used as image source for E-Pass card generation */}
      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          opacity: 0,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <QRCodeCanvas
          ref={canvasQrRef}
          value={canonicalUrl}
          size={512}
          level="H"
          includeMargin={false}
        />
      </div>

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

      {/* 1-Click Download Button to download E-Pass */}
      <div className="qr-actions">
        <button
          type="button"
          id="btn-download-qr-ticket"
          className={`qr-download-btn${downloadSuccess ? ' qr-download-btn--success' : ''}`}
          onClick={handleDownloadTicket}
          disabled={downloading}
          aria-label="Download kartu tiket QR untuk akses registrasi cepat"
        >
          {downloading ? (
            <>
              <span className="qr-download-spinner" aria-hidden="true" />
              <span>Mengunduh Tiket...</span>
            </>
          ) : downloadSuccess ? (
            <>
              <span>✓</span>
              <span>Tiket Berhasil Diunduh!</span>
            </>
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download Tiket QR</span>
            </>
          )}
        </button>

        <p className="qr-offline-tip">
          <span>💡</span> Download tiket agar registrasi di lokasi lebih cepat dan praktis.
        </p>
      </div>
    </div>
  );
}
