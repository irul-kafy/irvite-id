'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAllEventMedia } from './media-manager';
import { deleteMediaItem, type MediaItem } from './media-slot-card';

export type StandeeSizeKey = 'A5' | 'A6' | '5R';
export type StandeeThemeKey =
  | 'royal-gold'
  | 'kraton-emerald'
  | 'bali-prada'
  | 'minang-songket'
  | 'nocturne-botanical'
  | 'aetheria-celestial';

export interface StandeeThemePalette {
  key: StandeeThemeKey;
  label: string;
  bgGradient: string;
  cardBg: string;
  borderOuter: string;
  borderInner: string;
  accentColor: string;
  titleColor: string;
  textColor: string;
  mutedColor: string;
  badgeBg: string;
  badgeText: string;
  ornamentSymbol: string;
}

export const STANDEE_THEMES: Record<StandeeThemeKey, StandeeThemePalette> = {
  'royal-gold': {
    key: 'royal-gold',
    label: 'Royal Velvet (Burgundy & Gold)',
    bgGradient: 'linear-gradient(160deg, #240b11 0%, #140508 55%, #1f0a10 100%)',
    cardBg: 'rgba(255, 252, 245, 0.04)',
    borderOuter: '#d4af37',
    borderInner: 'rgba(212, 175, 55, 0.35)',
    accentColor: '#e5c88e',
    titleColor: '#f7e7c4',
    textColor: '#f3ece2',
    mutedColor: '#cbbba6',
    badgeBg: 'linear-gradient(135deg, #e5c88e, #b89146)',
    badgeText: '#1c080d',
    ornamentSymbol: '⚜',
  },
  'kraton-emerald': {
    key: 'kraton-emerald',
    label: 'Sekar Kedaton (Javanese Ivory & Emerald)',
    bgGradient: 'linear-gradient(160deg, #f8f3e8 0%, #efe6d5 55%, #e6dac3 100%)',
    cardBg: 'rgba(22, 58, 45, 0.04)',
    borderOuter: '#1b4332',
    borderInner: 'rgba(156, 118, 56, 0.45)',
    accentColor: '#8c6527',
    titleColor: '#163829',
    textColor: '#2b261f',
    mutedColor: '#665b4c',
    badgeBg: 'linear-gradient(135deg, #1b4332, #2d5a46)',
    badgeText: '#f7eedc',
    ornamentSymbol: '❖',
  },
  'bali-prada': {
    key: 'bali-prada',
    label: 'Swarga Dewata (Balinese Prada Gold)',
    bgGradient: 'linear-gradient(160deg, #2d0909 0%, #1a0404 55%, #290808 100%)',
    cardBg: 'rgba(245, 208, 122, 0.05)',
    borderOuter: '#eab308',
    borderInner: 'rgba(234, 179, 8, 0.38)',
    accentColor: '#facc15',
    titleColor: '#fef08a',
    textColor: '#fdf6e7',
    mutedColor: '#d9c39e',
    badgeBg: 'linear-gradient(135deg, #facc15, #ca8a04)',
    badgeText: '#240505',
    ornamentSymbol: '☸',
  },
  'minang-songket': {
    key: 'minang-songket',
    label: 'Ranah Cinta (Minang Maroon & Emas)',
    bgGradient: 'linear-gradient(160deg, #3b0a11 0%, #220408 55%, #33080e 100%)',
    cardBg: 'rgba(238, 198, 115, 0.05)',
    borderOuter: '#e0b25b',
    borderInner: 'rgba(224, 178, 91, 0.38)',
    accentColor: '#f0c978',
    titleColor: '#fae3b0',
    textColor: '#f9f1e4',
    mutedColor: '#d6c1a3',
    badgeBg: 'linear-gradient(135deg, #e0b25b, #b3832d)',
    badgeText: '#280509',
    ornamentSymbol: '✦',
  },
  'nocturne-botanical': {
    key: 'nocturne-botanical',
    label: 'Opaline Nocturne (Midnight & Champagne)',
    bgGradient: 'linear-gradient(160deg, #0d161b 0%, #091014 55%, #111d24 100%)',
    cardBg: 'rgba(218, 195, 162, 0.05)',
    borderOuter: '#c9b08c',
    borderInner: 'rgba(201, 176, 140, 0.35)',
    accentColor: '#dcc5a4',
    titleColor: '#efe1cb',
    textColor: '#e9e2d8',
    mutedColor: '#b3a796',
    badgeBg: 'linear-gradient(135deg, #dcc5a4, #a88d68)',
    badgeText: '#0b1216',
    ornamentSymbol: '❦',
  },
  'aetheria-celestial': {
    key: 'aetheria-celestial',
    label: 'Aetheria (Celestial Navy & Starlight)',
    bgGradient: 'linear-gradient(160deg, #0f172a 0%, #090d1a 55%, #172038 100%)',
    cardBg: 'rgba(226, 206, 175, 0.05)',
    borderOuter: '#d8c09d',
    borderInner: 'rgba(216, 192, 157, 0.35)',
    accentColor: '#e6d2b5',
    titleColor: '#f5ead8',
    textColor: '#ece6dc',
    mutedColor: '#b5ab9b',
    badgeBg: 'linear-gradient(135deg, #e6d2b5, #b69971)',
    badgeText: '#0b1020',
    ornamentSymbol: '✧',
  },
};

export const STANDEE_SIZES: Record<
  StandeeSizeKey,
  { label: string; widthMm: number; heightMm: number; desc: string }
> = {
  A5: {
    label: 'A5 Portrait (148 × 210 mm)',
    widthMm: 148,
    heightMm: 210,
    desc: 'Ukuran standar pajangan akrilik meja penerima tamu',
  },
  A6: {
    label: 'A6 Portrait (105 × 148 mm)',
    widthMm: 105,
    heightMm: 148,
    desc: 'Ukuran akrilik meja minimalis / compact',
  },
  '5R': {
    label: 'Bingkai 5R (127 × 178 mm)',
    widthMm: 127,
    heightMm: 178,
    desc: 'Ukuran bingkai foto meja standar (5 × 7 inci)',
  },
};

export function inferStandeeThemeFromTemplateName(
  templateName?: string,
): StandeeThemeKey {
  const lower = (templateName || '').toLowerCase();
  if (lower.includes('royal') || lower.includes('velvet')) return 'royal-gold';
  if (lower.includes('sekar') || lower.includes('kedaton')) return 'kraton-emerald';
  if (lower.includes('swarga') || lower.includes('dewata') || lower.includes('bali'))
    return 'bali-prada';
  if (lower.includes('ranah') || lower.includes('minang')) return 'minang-songket';
  if (lower.includes('opaline') || lower.includes('nocturne'))
    return 'nocturne-botanical';
  if (lower.includes('aetheria') || lower.includes('enchanted'))
    return 'aetheria-celestial';
  return 'royal-gold';
}

export function extractStandeeCoupleLabel(
  eventTitle: string,
  content?: Record<string, unknown> | null,
): string {
  const p1 =
    typeof content?.partnerOneName === 'string' && content.partnerOneName.trim()
      ? content.partnerOneName.trim()
      : '';
  const p2 =
    typeof content?.partnerTwoName === 'string' && content.partnerTwoName.trim()
      ? content.partnerTwoName.trim()
      : '';
  if (p1 && p2) {
    return `${p1} & ${p2}`;
  }
  return eventTitle.replace(/^pernikahan\s+/i, '').trim() || 'Mempelai';
}

interface GiftAccountEntry {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export function extractStandeeGiftAccounts(
  content?: Record<string, unknown> | null,
): GiftAccountEntry[] {
  const raw = Array.isArray(content?.giftAccounts) ? content.giftAccounts : [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      bankName: typeof item.bankName === 'string' ? item.bankName.trim() : '',
      accountNumber:
        typeof item.accountNumber === 'string' ? item.accountNumber.trim() : '',
      accountHolder:
        typeof item.accountHolderName === 'string' && item.accountHolderName.trim()
          ? item.accountHolderName.trim()
          : typeof item.accountHolder === 'string'
            ? item.accountHolder.trim()
            : '',
    }))
    .filter((acc) => acc.bankName || acc.accountNumber);
}

interface QrisStandeeDisplayProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  content?: Record<string, unknown> | null;
  templateName?: string;
}

export function QrisStandeeDisplay({
  eventId,
  eventTitle,
  eventDate,
  content,
  templateName,
}: QrisStandeeDisplayProps) {
  const [qrisMedia, setQrisMedia] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [sizeKey, setSizeKey] = useState<StandeeSizeKey>('A5');
  const [themeKey, setThemeKey] = useState<StandeeThemeKey>(() =>
    inferStandeeThemeFromTemplateName(templateName),
  );
  const [headline, setHeadline] = useState('AMPLOP DIGITAL');
  const [subheadline, setSubheadline] = useState(
    'Scan kode QRIS di bawah ini melalui aplikasi m-Banking atau e-Wallet Anda untuk mengirimkan tanda kasih.',
  );
  const [showBankAccounts, setShowBankAccounts] = useState(true);
  const [fullscreenMode, setFullscreenMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (templateName) {
      setThemeKey(inferStandeeThemeFromTemplateName(templateName));
    }
  }, [templateName]);

  const loadQrisMedia = useCallback(async () => {
    try {
      setLoading(true);
      const allMedia = await fetchAllEventMedia(eventId);
      const qrisItems = allMedia
        .filter((m) => m.slot === 'qris')
        .sort(
          (a, b) =>
            a.order - b.order ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      setQrisMedia(qrisItems[0] || null);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal memuat data barcode QRIS',
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadQrisMedia();
  }, [loadQrisMedia]);

  const handleUploadQris = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage('Ukuran file gambar QRIS maksimal 5 MB.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // If a QRIS item already exists, delete it first before uploading the new one
      if (qrisMedia) {
        await fetch(`/api/events/${eventId}/media/${qrisMedia.id}`, {
          method: 'DELETE',
        });
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'PHOTO');
      formData.append('slot', 'qris');
      formData.append('order', '0');

      const res = await fetch(`/api/events/${eventId}/media`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengunggah gambar barcode QRIS');
      }

      setSuccessMessage(
        'Barcode QRIS berhasil disimpan! Otomatis tampil di Undangan Digital & Pajangan Meja.',
      );
      await loadQrisMedia();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal mengunggah barcode QRIS',
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteQris = async () => {
    if (!qrisMedia || deleting) return;
    setDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await deleteMediaItem(eventId, qrisMedia.id);
      if (!result.confirmed) {
        setDeleting(false);
        return;
      }
      setSuccessMessage('Barcode QRIS berhasil dihapus.');
      setQrisMedia(null);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal menghapus barcode QRIS',
      );
    } finally {
      setDeleting(false);
    }
  };

  const coupleLabel = extractStandeeCoupleLabel(eventTitle, content);
  const giftAccounts = extractStandeeGiftAccounts(content);
  const formattedDate = (() => {
    if (!eventDate) return '';
    const d = new Date(eventDate);
    if (isNaN(d.getTime())) return eventDate;
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  })();

  const palette = STANDEE_THEMES[themeKey];
  const sizeSpec = STANDEE_SIZES[sizeKey];
  const qrisImageUrl = qrisMedia
    ? `/api/events/${eventId}/media/${qrisMedia.id}/file`
    : null;

  const handlePrintStandee = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      window.print();
      return;
    }

    const accountsHtml =
      showBankAccounts && giftAccounts.length > 0
        ? `<div class="accounts">
            ${giftAccounts
              .slice(0, 2)
              .map(
                (acc) => `
              <div class="account-pill">
                <strong>${acc.bankName}</strong> &bull; ${acc.accountNumber}
                <span>a.n. ${acc.accountHolder}</span>
              </div>`,
              )
              .join('')}
          </div>`
        : '';

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Cetak Pajangan QRIS ${sizeKey} - ${coupleLabel}</title>
  <style>
    @page {
      size: ${sizeSpec.widthMm}mm ${sizeSpec.heightMm}mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 16px;
      background: #1e293b;
      font-family: 'Georgia', 'Times New Roman', serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .print-toolbar {
      background: #ffffff;
      color: #0f172a;
      padding: 10px 18px;
      border-radius: 999px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }
    .print-toolbar button {
      background: #0f172a;
      color: #ffffff;
      border: none;
      padding: 7px 16px;
      border-radius: 999px;
      font-weight: 600;
      cursor: pointer;
    }
    .standee-sheet {
      width: ${sizeSpec.widthMm}mm;
      height: ${sizeSpec.heightMm}mm;
      background: ${palette.bgGradient};
      color: ${palette.textColor};
      padding: 8mm;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }
    .frame-outer {
      position: absolute;
      inset: 5mm;
      border: 1.5px solid ${palette.borderOuter};
      border-radius: 4mm;
      pointer-events: none;
    }
    .frame-inner {
      position: absolute;
      inset: 6.8mm;
      border: 1px solid ${palette.borderInner};
      border-radius: 3mm;
      pointer-events: none;
    }
    .top-header {
      position: relative;
      z-index: 2;
      margin-top: 2mm;
    }
    .ornament {
      font-size: 16pt;
      color: ${palette.accentColor};
      line-height: 1;
      margin-bottom: 1.5mm;
    }
    .badge {
      display: inline-block;
      background: ${palette.badgeBg};
      color: ${palette.badgeText};
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 7.5pt;
      font-weight: 800;
      letter-spacing: 0.22em;
      padding: 1.2mm 4mm;
      border-radius: 999px;
      text-transform: uppercase;
      margin-bottom: 2.5mm;
    }
    .couple-name {
      font-size: ${sizeKey === 'A6' ? '16pt' : '21pt'};
      font-weight: 700;
      color: ${palette.titleColor};
      margin: 0;
      line-height: 1.15;
    }
    .event-date {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 7.5pt;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: ${palette.mutedColor};
      margin-top: 1.5mm;
    }
    .qr-box {
      position: relative;
      z-index: 2;
      background: #ffffff;
      padding: ${sizeKey === 'A6' ? '3.5mm' : '5mm'};
      border-radius: 4mm;
      border: 2px solid ${palette.borderOuter};
      box-shadow: 0 10px 28px rgba(0,0,0,0.28);
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 2mm 0;
    }
    .qr-box img {
      width: ${sizeKey === 'A6' ? '48mm' : sizeKey === '5R' ? '60mm' : '68mm'};
      height: ${sizeKey === 'A6' ? '48mm' : sizeKey === '5R' ? '60mm' : '68mm'};
      object-fit: contain;
      display: block;
    }
    .qris-caption {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 7pt;
      font-weight: 800;
      letter-spacing: 0.18em;
      color: #0f172a;
      margin-top: 2mm;
      text-transform: uppercase;
    }
    .subheadline {
      position: relative;
      z-index: 2;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: ${sizeKey === 'A6' ? '7pt' : '8.5pt'};
      line-height: 1.45;
      color: ${palette.mutedColor};
      max-width: 86%;
      margin: 0 auto;
    }
    .accounts {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      gap: 1.5mm;
      width: 88%;
      margin-top: 1.5mm;
    }
    .account-pill {
      background: ${palette.cardBg};
      border: 1px solid ${palette.borderInner};
      border-radius: 2.5mm;
      padding: 1.5mm 3mm;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: ${sizeKey === 'A6' ? '6.8pt' : '7.8pt'};
      color: ${palette.textColor};
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
    }
    .account-pill strong {
      color: ${palette.accentColor};
    }
    .account-pill span {
      color: ${palette.mutedColor};
      font-size: 6.8pt;
    }
    .footer-brand {
      position: relative;
      z-index: 2;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 6.5pt;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: ${palette.mutedColor};
      margin-bottom: 1.5mm;
    }
    .footer-brand strong {
      color: ${palette.accentColor};
    }
    @media print {
      body {
        background: transparent;
        padding: 0;
      }
      .print-toolbar {
        display: none !important;
      }
      .standee-sheet {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <span>Ukuran Cetak: <strong>${sizeSpec.label}</strong></span>
    <button onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
  </div>
  <div class="standee-sheet">
    <div class="frame-outer"></div>
    <div class="frame-inner"></div>
    <div class="top-header">
      <div class="ornament">${palette.ornamentSymbol}</div>
      <div class="badge">${headline}</div>
      <h1 class="couple-name">${coupleLabel}</h1>
      ${formattedDate ? `<div class="event-date">${formattedDate}</div>` : ''}
    </div>
    <div class="qr-box">
      ${
        qrisImageUrl
          ? `<img src="${qrisImageUrl}" alt="Barcode QRIS ${coupleLabel}" />`
          : `<div style="width:60mm;height:60mm;display:flex;align-items:center;justify-content:center;color:#64748b;font-family:sans-serif;font-size:9pt;">Belum ada QRIS</div>`
      }
      <div class="qris-caption">QRIS &bull; All Payment Supported</div>
    </div>
    <p class="subheadline">${subheadline}</p>
    ${accountsHtml}
    <div class="footer-brand">Terima Kasih Atas Doa Restu Anda &bull; <strong>IRVITE.ID</strong></div>
  </div>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div className="card">
        <div
          className="card-body"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.35rem' }}>🪪</span>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary)',
                }}
              >
                Pajangan QRIS Meja Tamu (Akrilik Standee &amp; Undangan Digital)
              </h2>
            </div>
            <p
              className="text-sm text-muted"
              style={{ margin: '0.35rem 0 0 0', maxWidth: '680px' }}
            >
              Satu unggahan Barcode QRIS otomatis tampil di seksi{' '}
              <strong>Amplop Digital Undangan</strong> sekaligus menghasilkan desain{' '}
              <strong>Standee Akrilik Meja Penerima Tamu</strong> yang senada dengan tema pernikahan.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setFullscreenMode(true)}
              disabled={!qrisImageUrl}
              id="btn-qris-fullscreen"
            >
              🖥️ Mode Layar Penuh (Tablet Meja)
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrintStandee}
              disabled={!qrisImageUrl}
              id="btn-qris-print"
            >
              🖨️ Cetak Pajangan Akrilik / PDF
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="alert alert--error" role="alert">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div
          className="alert"
          role="status"
          style={{
            background: 'var(--status-success-bg, #ecfdf5)',
            borderColor: 'var(--status-success-border, #a7f3d0)',
            color: 'var(--status-success, #047857)',
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Main Grid: Controls Left + Standee Live Preview Right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Upload & Customization */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Step 1: Upload Barcode QRIS */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">1. Gambar Barcode QRIS Mempelai</h3>
            </div>
            <div className="card-body">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleUploadQris}
              />

              {loading ? (
                <div className="text-sm text-muted">Memuat status QRIS...</div>
              ) : qrisMedia && qrisImageUrl ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.875rem',
                    borderRadius: '10px',
                    background: 'var(--admin-surface-raised, #f8fafc)',
                    border: '1px solid var(--admin-border)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrisImageUrl}
                    alt="QRIS Mempelai"
                    style={{
                      width: '84px',
                      height: '84px',
                      objectFit: 'contain',
                      background: '#ffffff',
                      padding: '6px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="badge badge--success" style={{ marginBottom: '4px' }}>
                      QRIS Aktif
                    </span>
                    <div
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      Tersinkronisasi dengan Undangan Digital
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: '2px' }}>
                      Diunggah:{' '}
                      {new Date(qrisMedia.createdAt).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.625rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? 'Mengunggah...' : 'Ganti QRIS'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger, #dc2626)' }}
                        disabled={deleting}
                        onClick={handleDeleteQris}
                      >
                        {deleting ? 'Menghapus...' : 'Hapus'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '1.75rem 1.25rem',
                    textAlign: 'center',
                    borderRadius: '10px',
                    border: '1px dashed var(--admin-border)',
                    background: 'var(--admin-surface-raised, #f8fafc)',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📲</div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Belum Ada Barcode QRIS Diunggah
                  </div>
                  <p className="text-xs text-muted" style={{ marginBottom: '1rem' }}>
                    Unggah gambar kode QRIS (JPG, PNG, atau WebP, maks. 5 MB) untuk mengaktifkan fitur QRIS di undangan dan mencetak pajangan akrilik meja.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    id="btn-upload-qris-standee"
                  >
                    {uploading ? 'Mengunggah...' : '+ Unggah Gambar Barcode QRIS'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Standee Settings */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">2. Pengaturan Desain Pajangan Akrilik</h3>
            </div>
            <div
              className="card-body"
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label className="form-label">Ukuran Cetak Akrilik / Bingkai Meja</label>
                <select
                  className="form-input"
                  value={sizeKey}
                  onChange={(e) => setSizeKey(e.target.value as StandeeSizeKey)}
                  id="select-standee-size"
                >
                  {Object.entries(STANDEE_SIZES).map(([k, spec]) => (
                    <option key={k} value={k}>
                      {spec.label} — {spec.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Palet Tema Pajangan</label>
                <select
                  className="form-input"
                  value={themeKey}
                  onChange={(e) => setThemeKey(e.target.value as StandeeThemeKey)}
                  id="select-standee-theme"
                >
                  {Object.values(STANDEE_THEMES).map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Label Header Pajangan</label>
                <input
                  type="text"
                  className="form-input"
                  maxLength={40}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Teks Petunjuk Scan Tamu</label>
                <textarea
                  className="form-input"
                  rows={2}
                  maxLength={180}
                  value={subheadline}
                  onChange={(e) => setSubheadline(e.target.value)}
                />
              </div>

              {giftAccounts.length > 0 && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showBankAccounts}
                    onChange={(e) => setShowBankAccounts(e.target.checked)}
                  />
                  <span>
                    Tampilkan juga nomor rekening ({giftAccounts.length} bank) di bagian bawah pajangan
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Acrylic Standee Preview */}
        <div className="card">
          <div
            className="card-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 className="card-title">Pratinjau Pajangan Meja ({sizeSpec.label})</h3>
            <span className="badge badge--neutral">{palette.label.split('(')[0].trim()}</span>
          </div>
          <div
            className="card-body"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem 1rem',
              background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: '0 0 12px 12px',
            }}
          >
            {/* Acrylic Standee Mockup Container */}
            <div
              style={{
                width: '100%',
                maxWidth: sizeKey === 'A6' ? '310px' : sizeKey === '5R' ? '340px' : '370px',
                aspectRatio: `${sizeSpec.widthMm} / ${sizeSpec.heightMm}`,
                background: palette.bgGradient,
                color: palette.textColor,
                borderRadius: '14px',
                padding: '1.75rem 1.35rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow:
                  '0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 0 6px rgba(255, 255, 255, 0.12)',
                overflow: 'hidden',
              }}
            >
              {/* Double Ornamental Frame */}
              <div
                style={{
                  position: 'absolute',
                  inset: '12px',
                  border: `1.5px solid ${palette.borderOuter}`,
                  borderRadius: '10px',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: '16px',
                  border: `1px solid ${palette.borderInner}`,
                  borderRadius: '7px',
                  pointerEvents: 'none',
                }}
              />

              {/* Top Section */}
              <div style={{ position: 'relative', zIndex: 2, marginTop: '0.25rem' }}>
                <div
                  style={{
                    fontSize: '1.25rem',
                    color: palette.accentColor,
                    marginBottom: '0.35rem',
                  }}
                >
                  {palette.ornamentSymbol}
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    background: palette.badgeBg,
                    color: palette.badgeText,
                    fontSize: '0.625rem',
                    fontWeight: 800,
                    letterSpacing: '0.2em',
                    padding: '0.22rem 0.75rem',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem',
                  }}
                >
                  {headline || 'AMPLOP DIGITAL'}
                </span>
                <h4
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '1.45rem',
                    fontWeight: 700,
                    color: palette.titleColor,
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {coupleLabel}
                </h4>
                {formattedDate && (
                  <div
                    style={{
                      fontSize: '0.65rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: palette.mutedColor,
                      marginTop: '0.25rem',
                    }}
                  >
                    {formattedDate}
                  </div>
                )}
              </div>

              {/* Center QRIS Box */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  background: '#ffffff',
                  padding: '0.85rem',
                  borderRadius: '12px',
                  border: `2px solid ${palette.borderOuter}`,
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.28)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  margin: '0.5rem 0',
                }}
              >
                {qrisImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrisImageUrl}
                    alt={`Barcode QRIS ${coupleLabel}`}
                    style={{
                      width: '168px',
                      height: '168px',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '168px',
                      height: '168px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px dashed #cbd5e1',
                      padding: '1rem',
                      fontSize: '0.75rem',
                    }}
                  >
                    <span style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>📷</span>
                    <span>Unggah QRIS di panel kiri untuk melihat pratinjau</span>
                  </div>
                )}
                <span
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    letterSpacing: '0.16em',
                    color: '#0f172a',
                    marginTop: '0.45rem',
                    textTransform: 'uppercase',
                  }}
                >
                  QRIS &bull; ALL PAYMENT SUPPORTED
                </span>
              </div>

              {/* Instructions & Optional Bank Accounts */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <p
                  style={{
                    fontSize: '0.72rem',
                    lineHeight: 1.45,
                    color: palette.mutedColor,
                    margin: 0,
                    maxWidth: '90%',
                  }}
                >
                  {subheadline}
                </p>

                {showBankAccounts && giftAccounts.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem',
                      width: '92%',
                      marginTop: '0.15rem',
                    }}
                  >
                    {giftAccounts.slice(0, 2).map((acc, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: palette.cardBg,
                          border: `1px solid ${palette.borderInner}`,
                          borderRadius: '6px',
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.68rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span>
                          <strong style={{ color: palette.accentColor }}>
                            {acc.bankName}
                          </strong>{' '}
                          &bull; {acc.accountNumber}
                        </span>
                        <span style={{ color: palette.mutedColor, fontSize: '0.62rem' }}>
                          a.n. {acc.accountHolder}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Branding */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  fontSize: '0.56rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: palette.mutedColor,
                  marginBottom: '0.15rem',
                }}
              >
                Terima Kasih Atas Doa Restu Anda &bull;{' '}
                <strong style={{ color: palette.accentColor }}>IRVITE.ID</strong>
              </div>
            </div>

            {/* Acrylic Base Stand Visual Effect */}
            <div
              style={{
                width: '65%',
                height: '12px',
                background:
                  'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.32), rgba(255,255,255,0.08))',
                borderRadius: '0 0 999px 999px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Fullscreen Tablet Display Modal for Reception Desk */}
      {fullscreenMode && qrisImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Layar Pajangan QRIS ${coupleLabel}`}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: palette.bgGradient,
            color: palette.textColor,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => setFullscreenMode(false)}
            style={{
              position: 'fixed',
              top: '1.25rem',
              right: '1.25rem',
              background: 'rgba(0,0,0,0.45)',
              color: '#ffffff',
              border: `1px solid ${palette.borderInner}`,
              borderRadius: '999px',
              padding: '0.5rem 1rem',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            ✕ Tutup Mode Layar Penuh
          </button>

          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '2.5rem 2rem',
              borderRadius: '20px',
              border: `2px solid ${palette.borderOuter}`,
              background: 'rgba(0, 0, 0, 0.18)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <span
              style={{
                background: palette.badgeBg,
                color: palette.badgeText,
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.22em',
                padding: '0.3rem 1rem',
                borderRadius: '999px',
                textTransform: 'uppercase',
              }}
            >
              {headline || 'AMPLOP DIGITAL'}
            </span>
            <h2
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '2.25rem',
                color: palette.titleColor,
                margin: 0,
              }}
            >
              {coupleLabel}
            </h2>
            <div
              style={{
                background: '#ffffff',
                padding: '1.25rem',
                borderRadius: '16px',
                border: `3px solid ${palette.borderOuter}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrisImageUrl}
                alt={`Barcode QRIS ${coupleLabel}`}
                style={{
                  width: '260px',
                  height: '260px',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
            <p
              style={{
                fontSize: '0.95rem',
                color: palette.mutedColor,
                maxWidth: '420px',
                margin: 0,
              }}
            >
              {subheadline}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
