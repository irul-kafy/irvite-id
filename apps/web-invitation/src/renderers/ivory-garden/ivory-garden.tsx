'use client';

/**
 * IVORY_GARDEN INTEGRATION SHELL (PHASE #8A)
 *
 * NOTICE:
 * This component provides non-visual architectural plumbing, normalized contracts,
 * and component wiring for the IVORY_GARDEN template.
 *
 * Status: PLUMBING READY / PRODUCTION VISUAL NOT INTEGRATED.
 * Production route activation is guarded until Phase #8B pending approved user visual design.
 */

import React, { useState, useCallback, useRef } from 'react';
import type { IvoryGardenProps } from './ivory-garden.types';
import { adaptIvoryGardenContent, adaptIvoryGardenMedia } from './ivory-garden.adapter';
import { parseEventLocalDateTime } from './datetime-formatter';
import QRDisplay from '../../components/QRDisplay';
import { RsvpForm } from '../../components/rsvp-form';
import { getCanonicalInvitationUrl } from '../../utils/url';

export default function IvoryGardenRenderer({
  data,
  uniqueCode = '',
  mode = 'PUBLIC',
}: IvoryGardenProps) {
  const isPersonalized = mode === 'PERSONAL' || mode === 'PERSONALIZED';
  const effectiveMode = isPersonalized ? 'PERSONALIZED' : 'PUBLIC';

  const { event, guest, invitation, rsvp, mediaBySlot, media } = data;
  const content = adaptIvoryGardenContent(event?.content);
  const mediaSlots = adaptIvoryGardenMedia(mediaBySlot, media);

  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const canonicalUrl = uniqueCode ? getCanonicalInvitationUrl(uniqueCode) : '';

  const resolveMediaSrc = (src?: string) => {
    if (!src) return undefined;
    return src.startsWith('/api-proxy') ? src : `/api-proxy${src}`;
  };

  const handleCopy = useCallback(async (accountNumber: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedAccount(accountNumber);
      setTimeout(() => setCopiedAccount(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = accountNumber;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedAccount(accountNumber);
      setTimeout(() => setCopiedAccount(null), 2000);
    }
  }, []);

  const toggleMusic = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlayingMusic) {
      audioRef.current.pause();
      setIsPlayingMusic(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingMusic(true);
      }).catch(() => {});
    }
  }, [isPlayingMusic]);

  return (
    <article
      data-renderer="IVORY_GARDEN"
      data-mode={effectiveMode}
      className="ivory-garden-shell"
      style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: '1.5rem',
        fontFamily: 'serif',
        lineHeight: 1.6,
        color: '#2d2824',
        backgroundColor: '#faf8f5',
      }}
    >
      {/* 01. Hero & Couple Section */}
      <header className="ivory-section ivory-hero" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        {mediaSlots.hero && (
          <div className="ivory-hero-image" style={{ marginBottom: '1.5rem' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveMediaSrc(mediaSlots.hero.src)}
              alt="Hero"
              style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
            />
          </div>
        )}
        <h1 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>
          {content?.partnerOneName && content?.partnerTwoName ? (
            <span data-testid="ivory-partner-names">
              {content.partnerOneName} &amp; {content.partnerTwoName}
            </span>
          ) : (
            <span>{event?.title}</span>
          )}
        </h1>

        {(content?.partnerOneParents || content?.partnerTwoParents) && (
          <div data-testid="ivory-parents" style={{ fontSize: '0.95rem', color: '#6e645d', margin: '0.5rem 0' }}>
            {content.partnerOneParents && (
              <p style={{ margin: '0.25rem 0' }}>Putra/Putri dari: {content.partnerOneParents}</p>
            )}
            {content.partnerTwoParents && (
              <p style={{ margin: '0.25rem 0' }}>Putra/Putri dari: {content.partnerTwoParents}</p>
            )}
          </div>
        )}
      </header>

      {/* 02. Opening & Prayer Section */}
      {(content?.openingText || content?.prayerText) && (
        <section className="ivory-section ivory-prayer" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {content.openingText && (
            <p data-testid="ivory-opening" style={{ fontStyle: 'italic', marginBottom: '1rem' }}>
              {content.openingText}
            </p>
          )}
          {content.prayerText && (
            <blockquote
              data-testid="ivory-prayer"
              style={{ margin: '1rem 0', padding: '0 1rem', borderLeft: '2px solid #c2a26f' }}
            >
              <p style={{ margin: 0 }}>&ldquo;{content.prayerText}&rdquo;</p>
              {content.prayerSource && (
                <cite data-testid="ivory-prayer-source" style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.9rem', color: '#6e645d' }}>
                  — {content.prayerSource}
                </cite>
              )}
            </blockquote>
          )}
        </section>
      )}

      {/* 03. Ceremonies Section */}
      {content?.ceremonies && content.ceremonies.length > 0 && (
        <section className="ivory-section ivory-ceremonies" data-testid="ivory-ceremonies" style={{ marginBottom: '2rem' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.4rem', borderBottom: '1px solid #e0d8cd', paddingBottom: '0.5rem' }}>
            Rangkaian Acara
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
            {content.ceremonies.map((c, i) => {
              const dt = parseEventLocalDateTime(c.dateTime, content.timeZone);
              return (
                <div
                  key={i}
                  className="ivory-ceremony-card"
                  data-testid={`ivory-ceremony-${i}`}
                  style={{ padding: '1rem', background: '#f5f0e8', borderRadius: '6px' }}
                >
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem' }}>{c.title}</h3>
                  {dt && (
                    <p data-testid={`ivory-ceremony-datetime-${i}`} style={{ margin: '0.25rem 0', fontWeight: 'bold' }}>
                      {dt.fullFormatted}
                    </p>
                  )}
                  <p style={{ margin: '0.25rem 0' }}><strong>Tempat:</strong> {c.venue}</p>
                  <p style={{ margin: '0.25rem 0', color: '#555' }}>{c.address}</p>
                  {c.mapsUrl && (
                    <a
                      href={c.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ivory-maps-btn"
                      style={{
                        display: 'inline-block',
                        marginTop: '0.5rem',
                        fontSize: '0.85rem',
                        color: '#a37e4a',
                        textDecoration: 'underline',
                      }}
                    >
                      Buka Google Maps &rarr;
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 04. Gallery Section */}
      {mediaSlots.gallery.length > 0 && (
        <section className="ivory-section ivory-gallery" data-testid="ivory-gallery" style={{ marginBottom: '2rem' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.4rem', marginBottom: '1rem' }}>Galeri Foto</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: mediaSlots.gallery.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {mediaSlots.gallery.map((photo, i) => (
              <div key={photo.src || i} className="ivory-gallery-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveMediaSrc(photo.src)}
                  alt={`Gallery item ${i + 1}`}
                  style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px' }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 05. Digital Gift Section (Text Account Numbers, Clipboard Copy, Zero QRIS) */}
      {((content?.giftAccounts && content.giftAccounts.length > 0) || content?.giftTitle) && (
        <section className="ivory-section ivory-gifts" data-testid="ivory-gifts" style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
            {content?.giftTitle || 'Tanda Kasih'}
          </h2>
          {content?.giftMessage && (
            <p data-testid="ivory-gift-message" style={{ color: '#6e645d', marginBottom: '1rem' }}>
              {content.giftMessage}
            </p>
          )}
          {content?.giftAccounts && content.giftAccounts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {content.giftAccounts.map((acc, i) => (
                <div
                  key={i}
                  data-testid={`ivory-gift-account-${i}`}
                  style={{ padding: '0.85rem', background: '#fff', border: '1px solid #e0d8cd', borderRadius: '6px' }}
                >
                  <div style={{ fontWeight: 'bold' }}>{acc.bankName}</div>
                  <div
                    data-testid={`ivory-account-number-${i}`}
                    style={{ fontSize: '1.1rem', letterSpacing: '1px', margin: '0.25rem 0' }}
                  >
                    {acc.accountNumber}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6e645d' }}>a.n. {acc.accountHolderName}</div>
                  <button
                    type="button"
                    onClick={() => handleCopy(acc.accountNumber)}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                      border: '1px solid #c2a26f',
                      background: copiedAccount === acc.accountNumber ? '#c2a26f' : '#fff',
                      color: copiedAccount === acc.accountNumber ? '#fff' : '#2d2824',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedAccount === acc.accountNumber ? 'Disalin!' : 'Salin Nomor Rekening'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 06. PERSONALIZED GUEST PASS & SINGLE QR (PERSONALIZED MODE ONLY) */}
      {isPersonalized && guest && (
        <section
          className="ivory-section ivory-guest-pass"
          data-testid="ivory-guest-section"
          style={{
            marginBottom: '2rem',
            padding: '1.25rem',
            background: '#fff',
            border: '1px solid #c2a26f',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#6e645d' }}>
            {guest.customGreeting || 'Kepada Yth. Bapak/Ibu/Saudara/i:'}
          </p>
          <h2 data-testid="ivory-guest-name" style={{ margin: '0.25rem 0 0.5rem 0', fontSize: '1.35rem' }}>
            {guest.name}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6e645d', margin: '0 0 1rem 0' }}>
            Reservasi untuk: <strong>{guest.maxPax} Orang</strong>
          </p>
          {invitation?.customMessage && (
            <p style={{ fontStyle: 'italic', color: '#444', marginBottom: '1rem' }}>
              &ldquo;{invitation.customMessage}&rdquo;
            </p>
          )}

          {canonicalUrl && (
            <div data-testid="ivory-personal-qr">
              <QRDisplay canonicalUrl={canonicalUrl} />
            </div>
          )}
        </section>
      )}

      {/* 07. RSVP SECTION (PERSONALIZED MODE ONLY) */}
      {isPersonalized && guest && rsvp && uniqueCode && (
        <section className="ivory-section ivory-rsvp-wrapper" data-testid="ivory-rsvp-section" style={{ marginBottom: '2rem' }}>
          <RsvpForm uniqueCode={uniqueCode} maxPax={guest.maxPax} initialRsvp={rsvp} />
        </section>
      )}

      {/* 08. Closing & Main Maps Section */}
      {(content?.closingText || content?.mapsUrl) && (
        <footer className="ivory-section ivory-closing" style={{ textAlign: 'center', marginTop: '2rem', borderTop: '1px solid #e0d8cd', paddingTop: '1.5rem' }}>
          {content.closingText && (
            <p data-testid="ivory-closing" style={{ fontStyle: 'italic', marginBottom: '1rem' }}>
              {content.closingText}
            </p>
          )}
          {content.mapsUrl && (
            <div style={{ marginTop: '1rem' }}>
              <a
                data-testid="ivory-main-maps"
                href={content.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 1.25rem',
                  background: '#2d2824',
                  color: '#faf8f5',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                }}
              >
                Petunjuk Lokasi Acara (Google Maps)
              </a>
            </div>
          )}
        </footer>
      )}

      {/* 09. Background Music Audio & Control */}
      {mediaSlots.bgMusic && (
        <aside className="ivory-bg-music" data-testid="ivory-music">
          <audio ref={audioRef} src={resolveMediaSrc(mediaSlots.bgMusic.src)} loop preload="none" aria-hidden="true" />
          <button
            type="button"
            onClick={toggleMusic}
            aria-label={isPlayingMusic ? 'Jeda Musik Latar' : 'Putar Musik Latar'}
            style={{
              position: 'fixed',
              bottom: '1.5rem',
              right: '1.5rem',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#2d2824',
              color: '#faf8f5',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              zIndex: 50,
            }}
          >
            {isPlayingMusic ? '⏸' : '🎵'}
          </button>
        </aside>
      )}
    </article>
  );
}
