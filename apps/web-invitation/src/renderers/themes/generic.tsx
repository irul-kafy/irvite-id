 'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PublicInvitationResponse } from '../../types/public-invitation';
import { normalizeConfig } from '../../utils/config-normalizer';
import { FONT_MAP } from '../fonts';
import {
  resolveEffectiveMode,
  shouldRenderGuestPersonalization,
  shouldRenderRsvp,
  shouldRenderGuestQr,
  shouldRenderRsvpAndQr,
  resolveCoverGuestName,
  shouldRenderGiftSection,
} from '../mode-gating';
import { useEffectiveDisplayGuest } from '../use-effective-guest';
import MediaGallery from '../../components/media-gallery';
import { RsvpForm, type RsvpVariant } from '../../components/rsvp-form';
import QRDisplay from '../../components/QRDisplay';
import { QrisGiftCard } from '../../components/qris';
import { WishesSection } from '../../components/wishes/WishesSection';
import { cleanInvitationEventTitle } from '../adapter-utils';
import './generic-theme.css';

// ── Types ──────────────────────────────────────────────────────────────────────

interface RsvpSectionProps {
  uniqueCode: string;
  isPreview: boolean;
  maxPax: number;
  initialRsvp: PublicInvitationResponse['rsvp'];
  variant?: RsvpVariant;
}

interface GiftEntry {
  type: 'bank' | 'qris';
  bankName: string;
  accountNumber: string;
  accountName: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatEventDate(eventDate: string): string {
  return new Date(eventDate).toLocaleDateString('id-ID', {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ── Preview-safe RSVP ──────────────────────────────────────────────────────────

export function RsvpSection({ uniqueCode, isPreview, maxPax, initialRsvp, variant = 'light' }: RsvpSectionProps) {
  if (isPreview) {
    return (
      <div className="gt-rsvp gt-rsvp--preview" aria-label="RSVP preview placeholder">
        <div className="gt-rsvp__heading">Konfirmasi Kehadiran</div>
        <div className="gt-rsvp__preview-note">RSVP form will appear here for guests.</div>
        <div className="gt-rsvp__buttons">
          <div className="gt-rsvp__btn gt-rsvp__btn--yes">Ya, saya hadir</div>
          <div className="gt-rsvp__btn gt-rsvp__btn--no">Maaf, tidak bisa</div>
        </div>
        <div className="gt-rsvp__submit">Simpan RSVP</div>
      </div>
    );
  }
  return <RsvpForm uniqueCode={uniqueCode} maxPax={maxPax} initialRsvp={initialRsvp} variant={variant} />;
}

// ── QR Placeholder ─────────────────────────────────────────────────────────────

export function QrPlaceholder() {
  return (
    <div className="gt-qr-placeholder" aria-label="Guest QR placeholder">
      <div className="gt-qr-placeholder__box" aria-hidden="true">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="8" y="8" width="34" height="34" rx="4" stroke="currentColor" strokeWidth="4" fill="none"/>
          <rect x="18" y="18" width="14" height="14" fill="currentColor"/>
          <rect x="58" y="8" width="34" height="34" rx="4" stroke="currentColor" strokeWidth="4" fill="none"/>
          <rect x="68" y="18" width="14" height="14" fill="currentColor"/>
          <rect x="8" y="58" width="34" height="34" rx="4" stroke="currentColor" strokeWidth="4" fill="none"/>
          <rect x="18" y="68" width="14" height="14" fill="currentColor"/>
          <rect x="58" y="58" width="10" height="10" fill="currentColor"/>
          <rect x="74" y="58" width="10" height="10" fill="currentColor"/>
          <rect x="58" y="74" width="10" height="10" fill="currentColor"/>
          <rect x="74" y="74" width="10" height="10" fill="currentColor"/>
        </svg>
      </div>
      <p className="gt-qr-placeholder__label">Guest QR Code</p>
      <p className="gt-qr-placeholder__sub">Your unique QR will appear here</p>
    </div>
  );
}

// ── Gallery Placeholder ────────────────────────────────────────────────────────

function GalleryPlaceholder() {
  return (
    <div className="gt-gallery-placeholder" aria-label="Gallery placeholder">
      {[0, 1, 2].map((i) => (
        <div key={i} className="gt-gallery-placeholder__cell" aria-hidden="true">
          <svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="80" height="60" rx="6" fill="currentColor" opacity="0.06"/>
            <circle cx="30" cy="24" r="8" fill="currentColor" opacity="0.15"/>
            <path d="M4 52 L24 30 L40 46 L56 34 L76 52 Z" fill="currentColor" opacity="0.12"/>
          </svg>
        </div>
      ))}
    </div>
  );
}

// ── Countdown ──────────────────────────────────────────────────────────────────

function CountdownPlaceholder({ eventDate }: { eventDate: string }) {
  const date = new Date(eventDate);
  const now = new Date();
  const diffMs = Math.max(0, date.getTime() - now.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="gt-countdown" aria-label="Countdown">
      <div className="gt-countdown__box">
        <span className="gt-countdown__value">{diffDays}</span>
        <span className="gt-countdown__label">Hari</span>
      </div>
      <div className="gt-countdown__box">
        <span className="gt-countdown__value">{diffHours}</span>
        <span className="gt-countdown__label">Jam</span>
      </div>
      <div className="gt-countdown__box">
        <span className="gt-countdown__value">{diffMins}</span>
        <span className="gt-countdown__label">Menit</span>
      </div>
    </div>
  );
}

// ── Ornament ───────────────────────────────────────────────────────────────────

function Ornament({ color }: { color: string }) {
  return (
    <div className="gt-ornament" aria-hidden="true">
      <svg viewBox="0 0 120 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="8" x2="44" y2="8" stroke={color} strokeWidth="0.8" strokeOpacity="0.3"/>
        <path d="M52 8 C54 4, 58 4, 60 8 C62 12, 66 12, 68 8" stroke={color} strokeWidth="1.2" strokeOpacity="0.5" fill="none"/>
        <circle cx="60" cy="8" r="2.5" fill={color} fillOpacity="0.4"/>
        <line x1="76" y1="8" x2="120" y2="8" stroke={color} strokeWidth="0.8" strokeOpacity="0.3"/>
      </svg>
    </div>
  );
}

// ── Closing Section ────────────────────────────────────────────────────────────

function ClosingSection({
  primaryColor,
  closingText,
  signatureText,
}: {
  primaryColor: string;
  closingText?: string;
  signatureText?: string;
}) {
  return (
    <footer className="gt-closing" id="closing">
      <Ornament color={primaryColor} />
      <p className="gt-closing__text">
        {closingText || 'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.'}
      </p>
      <p className="gt-closing__signature">
        {signatureText || 'Kami yang berbahagia • IRVITE'}
      </p>
    </footer>
  );
}

// ── Scroll Reveal Wrapper ──────────────────────────────────────────────────────

function Reveal({ children, index }: { children: React.ReactNode; index: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      el.style.opacity = '1';
      el.style.transform = 'none';
      return;
    }

    el.style.opacity = '0';
    el.style.transform = 'translateY(32px)';
    el.style.transition = `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${index * 0.07}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${index * 0.07}s`;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            observer.disconnect();
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div ref={ref} className="gt-reveal">
      {children}
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const [prevVisible, setPrevVisible] = useState(visible);
  const [isExiting, setIsExiting] = useState(false);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (!visible) {
      setIsExiting(true);
    }
  }

  useEffect(() => {
    if (isExiting) {
      const t = setTimeout(() => setIsExiting(false), 300);
      return () => clearTimeout(t);
    }
  }, [isExiting]);

  if (!visible && !isExiting) return null;

  return (
    <div className={`gt-toast${isExiting ? ' gt-toast--out' : ''}`} role="status" aria-live="polite">
      <svg className="gt-toast__icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {message}
    </div>
  );
}

// ── Copy Gift Card Button ──────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      className={`gt-gift__copy-btn${copied ? ' gt-gift__copy-btn--copied' : ''}`}
      onClick={handleCopy}
      aria-label={copied ? 'Disalin!' : 'Salin nomor rekening'}
      type="button"
    >
      {copied ? (
        <>
          <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Disalin!
        </>
      ) : (
        <>
          <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="4" y="4" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M10 4V3C10 2.448 9.552 2 9 2H3C2.448 2 2 2.448 2 3v8c0 .552.448 1 1 1h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Salin
        </>
      )}
    </button>
  );
}

// ── Digital Gift / Amplop Digital ─────────────────────────────────────────────

interface CustomBankItem {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

function GiftSection({
  primaryColor,
  headingFontClass,
  accounts = [],
  qrisUrl,
  coupleName,
}: {
  primaryColor: string;
  headingFontClass: string;
  accounts?: CustomBankItem[];
  qrisUrl?: string | null;
  coupleName?: string;
}) {
  const displayAccounts = accounts.length > 0 ? accounts : [
    { bankName: 'Bank Central Asia', accountNumber: '1234567890', accountName: 'Nama Pasangan' },
  ];

  return (
    <section id="gift" className="gt-gift-wrapper">
      <h2 className={`gt-section-title ${headingFontClass}`} style={{ color: primaryColor }}>
        Amplop Digital
      </h2>
      <p className="gt-gift__description">
        Bagi Bapak/Ibu/Saudara/i yang ingin memberikan tanda kasih, berikut informasi nomor rekening dan QRIS kami.
        Doa dan kehadiran Anda merupakan kado terindah bagi kami.
      </p>
      <div className="gt-gift__cards">
        {displayAccounts.map((gift, i) => (
          <div key={i} className="gt-gift__card" role="region" aria-label={`Rekening ${gift.bankName}`}>
            <div className="gt-gift__card-header">
              <div className="gt-gift__card-logo gt-gift__card-logo--bank" aria-hidden="true">
                {(gift.bankName || 'BANK').slice(0, 4).toUpperCase()}
              </div>
              <span className="gt-gift__card-bank-name">{gift.bankName}</span>
              <span className="gt-gift__card-type-badge">Transfer</span>
            </div>
            <div className="gt-gift__card-body">
              <div className="gt-gift__card-info">
                <div className="gt-gift__card-label">Nomor Rekening</div>
                <div className="gt-gift__card-number">{gift.accountNumber}</div>
                <div className="gt-gift__card-name">a.n. {gift.accountName}</div>
              </div>
              <CopyButton text={gift.accountNumber} />
            </div>
          </div>
        ))}
      </div>
      {qrisUrl && (
        <div style={{ marginTop: '1.5rem', width: '100%', maxWidth: '380px' }}>
          <QrisGiftCard
            qrisUrl={qrisUrl}
            coupleName={coupleName}
            theme="royal-velvet"
          />
        </div>
      )}
    </section>
  );
}

// ── Cover Screen / Amplop ──────────────────────────────────────────────────────

function CoverScreen({
  title,
  eventDate,
  guestName,
  onOpen,
}: {
  title: string;
  eventDate: string;
  guestName?: string;
  onOpen: () => void;
}) {
  const [exiting, setExiting] = useState(false);
  const formattedDate = new Date(eventDate).toLocaleDateString('id-ID', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleOpen = () => {
    setExiting(true);
    setTimeout(onOpen, 680);
  };

  return (
    <div className={`gt-cover${exiting ? ' gt-cover--exiting' : ''}`} role="dialog" aria-label="Undangan Digital" aria-modal="true">
      <div className="gt-cover__bg-pattern" aria-hidden="true" />
      <div className="gt-cover__petals" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="gt-cover__petal" />
        ))}
      </div>

      <div className="gt-cover__content">
        <p className="gt-cover__eyebrow">Undangan Pernikahan</p>

        <div className="gt-cover__names" aria-label={`Pasangan: ${title}`}>
          <em>{title}</em>
        </div>

        <div className="gt-cover__divider" aria-hidden="true">
          <span className="gt-cover__divider-icon">✦</span>
        </div>

        <p className="gt-cover__date">{formattedDate}</p>

        <button
          id="gt-open-invitation-btn"
          className="gt-cover__cta"
          onClick={handleOpen}
          type="button"
          aria-label="Buka undangan"
        >
          <span className="gt-cover__cta-ring" aria-hidden="true" />
          <svg className="gt-cover__cta-icon" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M2 9l6-6v3.5C10 6.5 16 7 16 13c-2-3-6-3.5-8-3.5V13L2 9z" fill="currentColor"/>
          </svg>
          Buka Undangan
        </button>

        {guestName && (
          <p className="gt-cover__guest-hint">Kepada Yth. {guestName}</p>
        )}
      </div>
    </div>
  );
}

// ── Floating Music FAB ─────────────────────────────────────────────────────────

function MusicFab({ audioSrc }: { audioSrc?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2200);
  }, []);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      showToast('Musik dijeda');
    } else {
      audioRef.current.play().then(() => {
        setPlaying(true);
        showToast('Memutar musik...');
      }).catch(() => {
        showToast('Tidak dapat memutar musik');
      });
    }
  }, [playing, showToast]);

  if (!audioSrc) return null;

  return (
    <>
      <audio ref={audioRef} src={audioSrc} loop preload="none" aria-hidden="true" />
      <Toast message={toastMsg} visible={toastVisible} />
      <button
        id="gt-music-fab"
        className={`gt-fab${playing ? ' gt-fab--playing' : ''}`}
        onClick={toggle}
        type="button"
        aria-label={playing ? 'Jeda musik' : 'Putar musik'}
        title={playing ? 'Jeda musik' : 'Putar musik'}
      >
        {playing ? (
          <svg className="gt-fab__icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
            <rect x="8" y="7" width="3" height="10" rx="1.5" fill="currentColor"/>
            <rect x="13" y="7" width="3" height="10" rx="1.5" fill="currentColor"/>
          </svg>
        ) : (
          <svg className="gt-fab__icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
            <path d="M10 8.5l6 3.5-6 3.5V8.5z" fill="currentColor"/>
          </svg>
        )}
      </button>
    </>
  );
}

// ── Arch Hero Decoration ───────────────────────────────────────────────────────

function HeroArch({ heroImageSrc, primaryColor }: { heroImageSrc?: string; primaryColor: string }) {
  return (
    <div className="gt-hero__arch" aria-hidden="true">
      {heroImageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroImageSrc} alt="" />
      ) : (
        <svg className="gt-hero__arch-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M32 8C32 8 14 20 14 36C14 45.941 22.059 54 32 54C41.941 54 50 45.941 50 36C50 20 32 8 32 8Z"
            fill={primaryColor}
            fillOpacity="0.6"
          />
          <path
            d="M24 30C24 30 26 36 32 38C38 40 40 34 40 34"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
        </svg>
      )}
    </div>
  );
}

// ── Main GenericTheme ──────────────────────────────────────────────────────────

export default function GenericTheme({
  data,
  uniqueCode = '',
  canonicalUrl,
  isPreview = false,
  mode,
}: {
  data: Partial<PublicInvitationResponse> & {
    event: PublicInvitationResponse['event'];
    template?: PublicInvitationResponse['template'];
    media?: PublicInvitationResponse['media'];
    mediaBySlot?: Record<string, import('../../types/public-invitation').PublicMediaDescriptor[]>;
    guest?: PublicInvitationResponse['guest'] | null;
    invitation?: PublicInvitationResponse['invitation'] | null;
    rsvp?: PublicInvitationResponse['rsvp'] | null;
  };
  uniqueCode?: string;
  canonicalUrl?: string | null;
  isPreview?: boolean;
  mode?: 'PUBLIC' | 'PERSONAL' | 'PERSONALIZED';
}) {
  const { event, guest, invitation, template, media, mediaBySlot, rsvp } = data;
  const effectiveMode = resolveEffectiveMode(mode === 'PERSONALIZED' ? 'PERSONAL' : mode);
  const effectiveDisplayGuest = useEffectiveDisplayGuest(mode, guest);
  const config = normalizeConfig(template?.config || null);
  const [isOpened, setIsOpened] = useState(isPreview); // Skip cover in preview mode

  const resolveMediaSrc = (src?: string) => {
    if (!src) return undefined;
    if (
      src.startsWith('blob:') ||
      src.startsWith('data:') ||
      src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('/templates/') ||
      src.startsWith('/api-proxy')
    ) {
      return src;
    }
    return `/api-proxy${src}`;
  };

  const rawContent = (event.content || {}) as Record<string, unknown>;
  const rawGiftAccounts = Array.isArray(rawContent.giftAccounts)
    ? (rawContent.giftAccounts as Array<Record<string, unknown>>)
    : [];
  const customGiftAccounts = rawGiftAccounts
    .filter((a) => typeof a.bankName === 'string' && a.bankName.trim() && typeof a.accountNumber === 'string' && a.accountNumber.trim())
    .map((a) => ({
      bankName: String(a.bankName).trim(),
      accountNumber: String(a.accountNumber).trim(),
      accountName: String(a.accountName || a.owner || 'Nama Pemilik').trim(),
    }));
  const qrisDescSlot = mediaBySlot?.qris?.[0] || media?.find((m) => m.slot === 'qris');
  const qrisGiftUrl = resolveMediaSrc(qrisDescSlot?.src);
  const partnerOneName = typeof rawContent.partnerOneName === 'string' ? rawContent.partnerOneName.trim() : '';
  const partnerTwoName = typeof rawContent.partnerTwoName === 'string' ? rawContent.partnerTwoName.trim() : '';
  const cleanedEventTitle = cleanInvitationEventTitle(event.title, event.title);
  const displayCoupleTitle =
    partnerOneName && partnerTwoName
      ? `${partnerOneName} & ${partnerTwoName}`
      : cleanedEventTitle;
  const customIntro =
    (typeof rawContent.intro === 'string' && rawContent.intro.trim()) ||
    (typeof rawContent.openingText === 'string' && rawContent.openingText.trim()) ||
    event.description ||
    '';
  const customClosingText =
    (typeof rawContent.closingMessage === 'string' && rawContent.closingMessage.trim()) ||
    (typeof rawContent.closing === 'string' && rawContent.closing.trim()) ||
    undefined;

  const dateString = formatEventDate(event.eventDate);

  const headingFontClass = FONT_MAP[config.typography.headingFont] || '';
  const bodyFontClass = FONT_MAP[config.typography.bodyFont] || '';

  const { primaryColor, secondaryColor, backgroundColor, textColor } = config.theme;

  const isDarkColor = (color?: string) => {
    if (!color) return false;
    const clean = color.replace('#', '');
    if (clean.length === 3) {
      const r = parseInt(clean[0] + clean[0], 16);
      const g = parseInt(clean[1] + clean[1], 16);
      const b = parseInt(clean[2] + clean[2], 16);
      return 0.299 * r + 0.587 * g + 0.114 * b < 140;
    }
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return 0.299 * r + 0.587 * g + 0.114 * b < 140;
    }
    return false;
  };
  const themeVariant: RsvpVariant = isDarkColor(backgroundColor) ? 'dark' : 'light';

  // Extract audio and hero photo from media list / slots
  const audioMedia = media?.find((m) => m.type === 'AUDIO');
  const heroSlotPhoto = mediaBySlot?.hero?.[0] || media?.find((m) => m.slot === 'hero' || m.type === 'THUMBNAIL');
  const templateAssets = template?.assets ?? [];
  const templateBackground = templateAssets.find((asset) => asset.slot === 'background');
  const templateMusic = templateAssets.find((asset) => asset.slot === 'music');
  const templateOrnaments = templateAssets.filter((asset) => asset.slot === 'ornament');
  const resolveTemplateAsset = (src?: string) => {
    if (!src) return undefined;
    if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('/templates/')) return src;
    return /^\/templates\/assets\/[0-9a-f-]{36}\/file$/i.test(src) ? `/api-proxy${src}` : undefined;
  };

  // Handle cover open — also unlocks audio via user gesture
  const handleOpen = useCallback(() => {
    setIsOpened(true);
  }, []);

  const resolvedQrUrl =
    canonicalUrl ||
    (uniqueCode
      ? `https://irvite.id/i/${uniqueCode}`
      : 'https://irvite.id/i/preview-tamu');

  const showUnifiedRsvpAndQr =
    shouldRenderRsvpAndQr(effectiveMode, uniqueCode, isPreview) &&
    ((shouldRenderRsvp(effectiveMode, !!guest, !!rsvp) && Boolean(guest && rsvp)) ||
      shouldRenderGuestQr(effectiveMode, isPreview) ||
      isPreview);

  let sectionIndex = 0;

  const renderSection = (section: { id: string; enabled: boolean; order: number; variant: string }) => {
    if (!section.enabled) return null;
    // Unified RSVP + QR and Closing are always rendered in fixed order at the bottom (right above the final slide)
    if (section.id === 'rsvp' || section.id === 'guestQr' || section.id === 'closing') {
      return null;
    }
    const idx = sectionIndex++;

    switch (section.id) {
      case 'hero':
        return (
          <Reveal key={section.id} index={idx}>
            <header className="gt-hero">
              <HeroArch
                heroImageSrc={
                  resolveMediaSrc(heroSlotPhoto?.src) ||
                  resolveTemplateAsset(templateBackground?.src)
                }
                primaryColor={primaryColor}
              />
              <p className="gt-hero__subtitle" style={{ color: secondaryColor }}>
                Bersama keluarga tercinta, kami mengundang Anda
              </p>
              <h1 className={`gt-hero__title ${headingFontClass}`} style={{ color: primaryColor }}>
                {displayCoupleTitle}
              </h1>
              <Ornament color={primaryColor} />
            </header>
          </Reveal>
        );

      case 'eventDetails':
        return (
          <Reveal key={section.id} index={idx}>
            <section className="gt-event-details">
              <h2 className={`gt-section-title ${headingFontClass}`} style={{ color: primaryColor }}>
                Tanggal Pelaksanaan
              </h2>
              <p className="gt-event-details__date" style={{ color: primaryColor }}>
                {dateString}
              </p>
              {customIntro && (
                <p className="gt-event-details__desc" style={{ color: secondaryColor }}>
                  {customIntro}
                </p>
              )}
            </section>
          </Reveal>
        );

      case 'location':
        return event.locationDetails ? (
          <Reveal key={section.id} index={idx}>
            <section className="gt-location">
              <h2 className={`gt-section-title ${headingFontClass}`} style={{ color: primaryColor }}>
                Lokasi Acara
              </h2>
              <div className="gt-location__card" style={{ borderColor: `${primaryColor}22` }}>
                <div className="gt-location__icon" style={{ color: primaryColor }} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 21c-4.418-4.418-7-8.582-7-12a7 7 0 0 1 14 0c0 3.418-2.582 7.582-7 12z"/>
                    <circle cx="12" cy="9" r="2.5"/>
                  </svg>
                </div>
                <p className="gt-location__text" style={{ color: textColor }}>
                  {event.locationDetails}
                </p>
              </div>
            </section>
          </Reveal>
        ) : null;

      case 'greeting':
        return shouldRenderGuestPersonalization(effectiveMode, !!guest) && guest ? (
          <Reveal key={section.id} index={idx}>
            <section className="gt-greeting">
              <div className="gt-greeting__envelope-icon" aria-hidden="true">
                <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg" style={{ color: primaryColor }}>
                  <rect x="4" y="10" width="32" height="22" rx="3"/>
                  <path d="M4 13l16 11 16-11"/>
                </svg>
              </div>
              <Ornament color={primaryColor} />
              <h2 className={`gt-greeting__name ${headingFontClass}`} style={{ color: primaryColor }}>
                Kepada Yth. {guest.name},
              </h2>
              {guest.customGreeting && (
                <p className="gt-greeting__custom" style={{ color: secondaryColor }}>
                  {guest.customGreeting}
                </p>
              )}
              {invitation?.customMessage && (
                <p className="gt-greeting__message" style={{ color: textColor }}>
                  {invitation.customMessage}
                </p>
              )}
              <p className="gt-greeting__seats" style={{ color: secondaryColor }}>
                Kursi reservasi:{' '}
                <strong style={{ color: primaryColor }}>{guest.maxPax}</strong>
              </p>
              <Ornament color={primaryColor} />
            </section>
          </Reveal>
        ) : null;

      case 'gallery': {
        const galleryItems =
          media?.filter((m) => m.type === 'PHOTO' || m.type === 'VIDEO') ?? [];
        return galleryItems.length > 0 ? (
          <Reveal key={section.id} index={idx}>
            <section className="gt-gallery-wrapper">
              <h2 className={`gt-section-title ${headingFontClass}`} style={{ color: primaryColor }}>
                Galeri
              </h2>
              <MediaGallery media={galleryItems} />
            </section>
          </Reveal>
        ) : isPreview ? (
          <Reveal key={section.id} index={idx}>
            <section className="gt-gallery-wrapper">
              <h2 className={`gt-section-title ${headingFontClass}`} style={{ color: primaryColor }}>
                Galeri
              </h2>
              <GalleryPlaceholder />
            </section>
          </Reveal>
        ) : null;
      }

      case 'countdown':
        return (
          <Reveal key={section.id} index={idx}>
            <section className="gt-countdown-wrapper">
              <h2 className={`gt-section-title ${headingFontClass}`} style={{ color: primaryColor }}>
                Hitung Mundur
              </h2>
              <CountdownPlaceholder eventDate={event.eventDate} />
            </section>
          </Reveal>
        );

      default:
        return null;
    }
  };

  const themeCode = template?.themeCode?.toUpperCase() || 'GENERIC';
  const themeClass = `gt-theme--${themeCode.toLowerCase()}`;

  return (
    <>
      {/* Cover Screen — hidden after open */}
      {!isOpened && (
        <CoverScreen
          title={displayCoupleTitle}
          eventDate={event.eventDate}
          guestName={resolveCoverGuestName(effectiveMode, guest?.name) || effectiveDisplayGuest?.name}
          onOpen={handleOpen}
        />
      )}

      {/* Main invitation */}
      <div
        className={`gt-root ${bodyFontClass} ${themeClass}`}
        style={{
          backgroundColor,
          color: textColor,
          backgroundImage: templateBackground ? `linear-gradient(${backgroundColor}dd, ${backgroundColor}dd), url(${resolveTemplateAsset(templateBackground.src)})` : undefined,
          backgroundSize: templateBackground ? 'cover' : undefined,
          backgroundAttachment: templateBackground ? 'scroll' : undefined,
        }}
      >
        <article className="gt-card">
          {templateOrnaments.map((asset, index) => (
            // Package asset signatures are validated by the API before storage.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${asset.src}-${asset.order}`}
              className={`gt-package-ornament gt-package-ornament--${index % 2 === 0 ? 'left' : 'right'}`}
              src={resolveTemplateAsset(asset.src)}
              style={{ top: `${templateOrnaments.length === 1 ? 0 : index * 90 / (templateOrnaments.length - 1)}%` }}
              alt=""
              aria-hidden="true"
            />
          ))}
          {config.sections
            .slice()
            .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
            .map(renderSection)}

          {/* Digital Gift Section */}
          {(customGiftAccounts.length > 0 || Boolean(qrisGiftUrl) || shouldRenderGiftSection()) && (
            <GiftSection
              primaryColor={primaryColor}
              headingFontClass={headingFontClass}
              accounts={customGiftAccounts}
              qrisUrl={qrisGiftUrl}
              coupleName={displayCoupleTitle}
            />
          )}

          {/* Unified RSVP & Guest Check-in QR Pass right above the Closing Slide */}
          {showUnifiedRsvpAndQr && (
            <Reveal index={sectionIndex++}>
              <section id="rsvp" className="gt-rsvp-qr-section">
                <span className="gt-rsvp-qr-section__eyebrow" style={{ color: secondaryColor }}>
                  Kehadiran &amp; Tiket Masuk
                </span>
                <h2 className={`gt-rsvp-qr-section__title ${headingFontClass}`} style={{ color: primaryColor }}>
                  RSVP &amp; Kode QR Registrasi Tamu
                </h2>
                <p className="gt-rsvp-qr-section__lead" style={{ color: secondaryColor }}>
                  Mohon konfirmasi kehadiran Anda melalui formulir di bawah ini, lalu simpan atau tunjukkan Kode QR kepada petugas penerima tamu saat tiba di lokasi acara.
                </p>
                <div className="gt-rsvp-qr-grid">
                  <div className="gt-rsvp-qr-col">
                    <RsvpForm
                      uniqueCode={uniqueCode || 'preview-tamu'}
                      maxPax={guest?.maxPax ?? 2}
                      initialRsvp={
                        rsvp ?? {
                          response: 'PENDING',
                          pax: null,
                          canRespond: false,
                        }
                      }
                      variant={themeVariant}
                    />
                  </div>
                  <div className="gt-rsvp-qr-col">
                    <QRDisplay
                      canonicalUrl={resolvedQrUrl}
                      guestName={guest?.name || 'Tamu Undangan'}
                      maxPax={guest?.maxPax ?? 2}
                      tableNumber={data.guest?.tableNumber}
                      eventTitle={event?.title || data.event?.title}
                      variant={themeVariant}
                    />
                  </div>
                </div>
              </section>
            </Reveal>
          )}

          {/* Section: Doa & Ucapan Tamu */}
          <Reveal index={sectionIndex++}>
            <WishesSection
              uniqueCode={uniqueCode}
              eventSlug={data.event?.slug}
              defaultName={effectiveDisplayGuest?.name || ''}
              initialWishes={data.wishes?.items}
              title={data.wishes?.title}
              description={data.wishes?.description}
              variant={themeVariant}
            />
          </Reveal>

          {/* Final Slide: Closing Section */}
          <Reveal index={sectionIndex++}>
            <ClosingSection
              primaryColor={primaryColor}
              closingText={customClosingText}
              signatureText={`${displayCoupleTitle} • IRVITE`}
            />
          </Reveal>
        </article>
      </div>

      {/* Floating Music FAB */}
      {(audioMedia || templateMusic) && isOpened && (
        <MusicFab audioSrc={resolveMediaSrc(audioMedia?.src) || resolveTemplateAsset(templateMusic?.src) || ''} />
      )}
    </>
  );
}
