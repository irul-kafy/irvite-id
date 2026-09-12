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
  resolveCoverGuestName,
  shouldRenderGiftSection,
} from '../mode-gating';
import MediaGallery from '../../components/media-gallery';
import { RsvpForm } from '../../components/rsvp-form';
import './generic-theme.css';

// ── Types ──────────────────────────────────────────────────────────────────────

interface RsvpSectionProps {
  uniqueCode: string;
  isPreview: boolean;
  maxPax: number;
  initialRsvp: PublicInvitationResponse['rsvp'];
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

function RsvpSection({ uniqueCode, isPreview, maxPax, initialRsvp }: RsvpSectionProps) {
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
  return <RsvpForm uniqueCode={uniqueCode} maxPax={maxPax} initialRsvp={initialRsvp} />;
}

// ── QR Placeholder ─────────────────────────────────────────────────────────────

function QrPlaceholder() {
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

function ClosingSection({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="gt-closing">
      <Ornament color={primaryColor} />
      <p className="gt-closing__text">We look forward to celebrating with you.</p>
      <p className="gt-closing__signature">With love &amp; gratitude</p>
    </div>
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

const DEFAULT_GIFTS: GiftEntry[] = [
  { type: 'bank', bankName: 'Bank Central Asia', accountNumber: '1234567890', accountName: 'Nama Pasangan' },
  { type: 'qris', bankName: 'QRIS', accountNumber: 'qris-placeholder', accountName: 'Nama Pasangan' },
];

function GiftSection({
  primaryColor,
  headingFontClass,
}: {
  primaryColor: string;
  headingFontClass: string;
}) {
  return (
    <section className="gt-gift-wrapper">
      <h2 className={`gt-section-title ${headingFontClass}`} style={{ color: primaryColor }}>
        Amplop Digital
      </h2>
      <p className="gt-gift__description">
        Bagi Bapak/Ibu yang ingin memberikan hadiah, berikut informasi transfer kami.
        Kehadiran Anda adalah hadiah terbesar bagi kami.
      </p>
      <div className="gt-gift__cards">
        {DEFAULT_GIFTS.map((gift, i) =>
          gift.type === 'bank' ? (
            <div key={i} className="gt-gift__card" role="region" aria-label={`Rekening ${gift.bankName}`}>
              <div className="gt-gift__card-header">
                <div className="gt-gift__card-logo gt-gift__card-logo--bank" aria-hidden="true">BCA</div>
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
          ) : (
            <div key={i} className="gt-gift__card" role="region" aria-label="QRIS">
              <div className="gt-gift__card-header">
                <div className="gt-gift__card-logo gt-gift__card-logo--qris" aria-hidden="true">QR</div>
                <span className="gt-gift__card-bank-name">QRIS</span>
                <span className="gt-gift__card-type-badge">Scan</span>
              </div>
              <div className="gt-gift__qris-body">
                <div className="gt-gift__qris-mock" aria-label="QR Code placeholder">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <rect x="8" y="8" width="34" height="34" rx="3" stroke="#333" strokeWidth="3" fill="none"/>
                    <rect x="17" y="17" width="16" height="16" fill="#333"/>
                    <rect x="58" y="8" width="34" height="34" rx="3" stroke="#333" strokeWidth="3" fill="none"/>
                    <rect x="67" y="17" width="16" height="16" fill="#333"/>
                    <rect x="8" y="58" width="34" height="34" rx="3" stroke="#333" strokeWidth="3" fill="none"/>
                    <rect x="17" y="67" width="16" height="16" fill="#333"/>
                    <rect x="58" y="58" width="10" height="10" fill="#333"/>
                    <rect x="74" y="58" width="10" height="10" fill="#333"/>
                    <rect x="58" y="74" width="10" height="10" fill="#333"/>
                    <rect x="74" y="74" width="10" height="10" fill="#333"/>
                  </svg>
                </div>
                <p className="gt-gift__qris-label">Scan untuk membayar via QRIS</p>
              </div>
            </div>
          )
        )}
      </div>
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
  isPreview = false,
  mode,
}: {
  data: Partial<PublicInvitationResponse> & {
    event: PublicInvitationResponse['event'];
    template?: PublicInvitationResponse['template'];
    media?: PublicInvitationResponse['media'];
    guest?: PublicInvitationResponse['guest'] | null;
    invitation?: PublicInvitationResponse['invitation'] | null;
    rsvp?: PublicInvitationResponse['rsvp'] | null;
  };
  uniqueCode?: string;
  isPreview?: boolean;
  mode?: 'PUBLIC' | 'PERSONAL';
}) {
  const { event, guest, invitation, template, media, rsvp } = data;
  const effectiveMode = resolveEffectiveMode(mode);
  const config = normalizeConfig(template?.config || null);
  const [isOpened, setIsOpened] = useState(isPreview); // Skip cover in preview mode

  const resolveMediaSrc = (src?: string) => {
    if (!src) return undefined;
    return src.startsWith('/api-proxy') ? src : `/api-proxy${src}`;
  };

  const dateString = formatEventDate(event.eventDate);

  const headingFontClass = FONT_MAP[config.typography.headingFont] || '';
  const bodyFontClass = FONT_MAP[config.typography.bodyFont] || '';

  const { primaryColor, secondaryColor, backgroundColor, textColor } = config.theme;

  // Extract audio from media list
  const audioMedia = media?.find((m) => m.type === 'AUDIO');
  const heroThumb = media?.find((m) => m.type === 'THUMBNAIL');

  // Handle cover open — also unlocks audio via user gesture
  const handleOpen = useCallback(() => {
    setIsOpened(true);
  }, []);

  let sectionIndex = 0;

  const renderSection = (section: { id: string; enabled: boolean; order: number; variant: string }) => {
    if (!section.enabled) return null;
    const idx = sectionIndex++;

    switch (section.id) {
      case 'hero':
        return (
          <Reveal key={section.id} index={idx}>
            <header className="gt-hero">
              <HeroArch heroImageSrc={resolveMediaSrc(heroThumb?.src)} primaryColor={primaryColor} />
              <p className="gt-hero__subtitle" style={{ color: secondaryColor }}>
                Together with our families
              </p>
              <h1 className={`gt-hero__title ${headingFontClass}`} style={{ color: primaryColor }}>
                {event.title}
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
              {event.description && (
                <p className="gt-event-details__desc" style={{ color: secondaryColor }}>
                  {event.description}
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
                Dear {guest.name},
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

      case 'rsvp':
        return shouldRenderRsvp(effectiveMode, !!guest, !!rsvp) && guest && rsvp ? (
          <Reveal key={section.id} index={idx}>
            <section className="gt-rsvp-wrapper">
              <h2 className={`gt-section-title ${headingFontClass}`} style={{ color: primaryColor }}>
                Konfirmasi Kehadiran
              </h2>
              <RsvpSection
                uniqueCode={uniqueCode}
                isPreview={isPreview}
                maxPax={guest.maxPax}
                initialRsvp={rsvp}
              />
            </section>
          </Reveal>
        ) : null;

      case 'gallery':
        return isPreview ? (
          <Reveal key={section.id} index={idx}>
            <section className="gt-gallery-wrapper">
              <h2 className={`gt-section-title ${headingFontClass}`} style={{ color: primaryColor }}>
                Galeri
              </h2>
              <GalleryPlaceholder />
            </section>
          </Reveal>
        ) : media && media.filter((m) => m.type === 'PHOTO' || m.type === 'VIDEO').length > 0 ? (
          <Reveal key={section.id} index={idx}>
            <section className="gt-gallery-wrapper">
              <h2 className={`gt-section-title ${headingFontClass}`} style={{ color: primaryColor }}>
                Galeri
              </h2>
              <MediaGallery media={media} />
            </section>
          </Reveal>
        ) : null;

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

      case 'guestQr':
        return shouldRenderGuestQr(effectiveMode, isPreview) ? (
          <Reveal key={section.id} index={idx}>
            <section className="gt-qr-wrapper">
              <h2 className={`gt-section-title ${headingFontClass}`} style={{ color: primaryColor }}>
                Tiket Masuk
              </h2>
              <QrPlaceholder />
            </section>
          </Reveal>
        ) : null;

      case 'closing':
        return (
          <Reveal key={section.id} index={idx}>
            <ClosingSection primaryColor={primaryColor} />
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
          title={event.title}
          eventDate={event.eventDate}
          guestName={resolveCoverGuestName(effectiveMode, guest?.name)}
          onOpen={handleOpen}
        />
      )}

      {/* Main invitation */}
      <div
        className={`gt-root ${bodyFontClass} ${themeClass}`}
        style={{ backgroundColor, color: textColor }}
      >
        <article className="gt-card">
          {config.sections
            .slice()
            .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
            .map(renderSection)}

          {/* Digital Gift Section */}
          {shouldRenderGiftSection(effectiveMode) && (
            <GiftSection primaryColor={primaryColor} headingFontClass={headingFontClass} />
          )}
        </article>
      </div>

      {/* Floating Music FAB */}
      {audioMedia && isOpened && <MusicFab audioSrc={resolveMediaSrc(audioMedia.src)} />}
    </>
  );
}
