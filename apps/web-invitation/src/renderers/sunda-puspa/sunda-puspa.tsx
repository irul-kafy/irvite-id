/* eslint-disable @next/next/no-img-element */
'use client';

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { RendererProps } from '../registry';
import type { SundaPuspaContent } from './sunda-puspa.types';
import {
  adaptSundaPuspaContent,
  adaptSundaPuspaMedia,
} from './sunda-puspa.adapter';
import {
  formatCeremonyDate,
  formatCeremonyTimeRange,
  parseTargetEpoch,
} from './datetime-formatter';
import {
  resolveSundaEffectiveMode,
  shouldRenderSundaGuest,
  shouldRenderSundaRsvp,
} from './sunda-puspa.gating';
import { RsvpForm } from '../../components/rsvp-form';
import styles from './sunda-puspa.module.css';

function Icon({
  name,
}: {
  name:
    | 'arrow-right'
    | 'arrow-down'
    | 'pin'
    | 'calendar'
    | 'clock'
    | 'envelope'
    | 'music'
    | 'pause'
    | 'close'
    | 'flower';
}) {
  switch (name) {
    case 'arrow-right':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case 'arrow-down':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      );
    case 'pin':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="5" width="16" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M4 11h16" />
        </svg>
      );
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      );
    case 'envelope':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
    case 'music':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case 'pause':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      );
    case 'close':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      );
    case 'flower':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3a3 3 0 0 0 0 6 3 3 0 0 0 0-6Zm0 12a3 3 0 0 0 0 6 3 3 0 0 0 0-6Zm9-3a3 3 0 0 0-6 0 3 3 0 0 0 6 0ZM9 12a3 3 0 0 0-6 0 3 3 0 0 0 6 0Z" />
        </svg>
      );
    default:
      return null;
  }
}

function Ornament({ small = false }: { small?: boolean }) {
  return (
    <div className={`${styles.ornament} ${small ? styles.ornamentSmall : ''}`} aria-hidden="true">
      <span />
      <Icon name="flower" />
      <span />
    </div>
  );
}

interface SundaPuspaInnerProps extends RendererProps {
  content: SundaPuspaContent;
}

function SundaPuspaInner({
  data,
  uniqueCode,
  mode,
  content,
}: SundaPuspaInnerProps) {
  const [stage, setStage] = useState<'cover' | 'opening' | 'opened'>('cover');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lightboxDialogRef = useRef<HTMLDialogElement | null>(null);

  const adaptedMedia = useMemo(
    () => adaptSundaPuspaMedia(data?.mediaBySlot, data?.media),
    [data?.mediaBySlot, data?.media],
  );

  // Mode gating
  const effectiveMode = resolveSundaEffectiveMode(mode);
  const guest = data?.guest;
  const canShowGuest = shouldRenderSundaGuest(effectiveMode, guest);
  const canShowRsvp = shouldRenderSundaRsvp(effectiveMode, guest, data?.rsvp);
  const guestName = canShowGuest ? guest?.name : undefined;
  const customGreeting = canShowGuest ? guest?.customGreeting : undefined;

  // Names - strictly from validated content, NO fabricated fallbacks
  const partnerOneShort = content.partnerOneName;
  const partnerTwoShort = content.partnerTwoName;
  const partnerOneFormal = content.partnerOneFullName || partnerOneShort;
  const partnerTwoFormal = content.partnerTwoFullName || partnerTwoShort;

  // Monogram initials
  const initialOne = partnerOneShort.charAt(0).toUpperCase();
  const initialTwo = partnerTwoShort.charAt(0).toUpperCase();

  // Primary ceremony and timezone
  const ceremonies = content.ceremonies || [];
  const primaryCeremony = ceremonies.length > 0 ? ceremonies[0] : null;
  const timeZone = content.timeZone;

  const formattedDateLong = primaryCeremony
    ? formatCeremonyDate(primaryCeremony.startDateTime, timeZone)
    : '';

  // Countdown timer
  const [countdown, setCountdown] = useState({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
    isFinished: false,
  });

  useEffect(() => {
    if (!primaryCeremony?.startDateTime) return;
    const targetEpoch = parseTargetEpoch(primaryCeremony.startDateTime, timeZone);
    if (!targetEpoch) return;

    const pad = (n: number) => Math.max(0, n).toString().padStart(2, '0');

    const updateCountdown = () => {
      const now = Date.now();
      const diff = targetEpoch - now;

      if (diff <= 0) {
        setCountdown({
          days: '00',
          hours: '00',
          minutes: '00',
          seconds: '00',
          isFinished: true,
        });
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setCountdown({
        days: pad(d),
        hours: pad(h),
        minutes: pad(m),
        seconds: pad(s),
        isFinished: false,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [primaryCeremony?.startDateTime, timeZone]);

  // CSS Opening Gate Transition timer
  useEffect(() => {
    if (stage !== 'opening') return;
    const timer = setTimeout(() => {
      setStage('opened');
    }, 1700);
    return () => clearTimeout(timer);
  }, [stage]);

  // Lightbox dialog focus trap & escape
  useEffect(() => {
    const dialog = lightboxDialogRef.current;
    if (!dialog) return;

    if (lightboxIndex !== null) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [lightboxIndex]);

  const handleOpenCover = () => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setStage('opened');
    } else {
      setStage('opening');
    }
  };

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const hasStory = Boolean(content.story && content.story.length > 0);
  const hasGallery = Boolean(adaptedMedia.gallery && adaptedMedia.gallery.length > 0);
  const hasRsvp = Boolean(canShowRsvp && data?.rsvp);
  const hasPrayer = Boolean(content.prayerText);

  return (
    <div className={styles.root}>
      {/* 1. Desktop Left Scenic Mural */}
      <aside className={styles.scene} aria-hidden="true">
        <img
          src="/templates/sunda-puspa/garden.webp"
          alt=""
          className={styles.sceneImage}
        />
        <div className={styles.sceneShade} />
        <div className={styles.sceneBorder} />
        <div className={styles.sceneTop}>
          <span>SUNDA PUSPA</span>
          <span>A GARDEN CELEBRATION</span>
        </div>
        <div className={styles.sceneCopy}>
          <p className={styles.eyebrow}>TOGETHER, IN EVERY SEASON</p>
          <span className={styles.monogram}>
            <span>{initialOne}</span>
            <i>/</i>
            <span>{initialTwo}</span>
          </span>
          <h2>
            {partnerOneShort} <em>&</em> {partnerTwoShort}
          </h2>
          {formattedDateLong && <span>{formattedDateLong}</span>}
          <Ornament small />
        </div>
        <span className={styles.sceneEdition}>
          TAMAN JANJI &bull; IRVITE.ID
        </span>
      </aside>

      {/* 2. Main Right Paper Column */}
      <div className={styles.paper}>
        {/* Mobile background banner */}
        <img
          src="/templates/sunda-puspa/garden.webp"
          alt=""
          className={styles.mobileCoverArt}
          aria-hidden="true"
        />

        {/* Cover Screen */}
        {stage !== 'opened' && (
          <section className={styles.cover} aria-label="Sampul undangan">
            <div className={styles.coverFrame} />
            <div className={styles.coverHeading}>
              <span className={styles.monogram} aria-hidden="true">
                <span>{initialOne}</span>
                <i>/</i>
                <span>{initialTwo}</span>
              </span>
              <p className={styles.eyebrow}>The wedding celebration of</p>
              <h1 className={styles.names}>
                {partnerOneShort}
                <em>&</em>
                {partnerTwoShort}
              </h1>
              <Ornament small />
              {formattedDateLong && (
                <p className={styles.coverDate}>{formattedDateLong}</p>
              )}
              {primaryCeremony?.venue && (
                <p className={styles.coverPlace}>{primaryCeremony.venue}</p>
              )}
            </div>

            <div className={styles.coverInvite}>
              {effectiveMode === 'PERSONALIZED' && guestName ? (
                <>
                  <p>{customGreeting || 'Kepada Yth.'}</p>
                  <h2>{guestName}</h2>
                </>
              ) : null}
              <button
                type="button"
                className={styles.button}
                onClick={handleOpenCover}
              >
                <Icon name="envelope" />
                <span>Buka undangan</span>
                <Icon name="arrow-right" />
              </button>
            </div>

            <span className={styles.coverFooter}>
              TOGETHER, IN EVERY SEASON
            </span>
          </section>
        )}

        {/* CSS Opening Gate Overlay */}
        {stage === 'opening' && (
          <div
            className={styles.opening}
            role="dialog"
            aria-modal="true"
            aria-label="Membuka undangan"
          >
            <div className={`${styles.gate} ${styles.gateLeft}`} />
            <div className={`${styles.gate} ${styles.gateRight}`} />
            <div className={styles.openingReveal}>
              <span className={styles.monogram} aria-hidden="true">
                <span>{initialOne}</span>
                <i>/</i>
                <span>{initialTwo}</span>
              </span>
              <p>Sampurasun</p>
            </div>
            <button
              type="button"
              className={styles.skip}
              onClick={() => setStage('opened')}
            >
              Lewati
            </button>
          </div>
        )}

        {/* Main Opened Content */}
        <main
          tabIndex={-1}
          className={stage !== 'opened' ? styles.contentClosed : styles.contentOpened}
        >
          {/* Section 1: Welcome / Hero (#home) */}
          <section id="home" className={styles.welcome}>
            <img
              src="/templates/sunda-puspa/garden.webp"
              alt=""
              className={styles.welcomeArt}
              aria-hidden="true"
            />
            <div className={styles.welcomeContent}>
              <p className={styles.eyebrow}>SAMPURASUN</p>
              <h2 className={styles.welcomeHeading}>
                Wilujeng Sumping
                <br />
                <em>di Taman Janji.</em>
              </h2>
              <Ornament />
              <div className={styles.badgeRow}>
                <span className={styles.badge}>
                  <Icon name="flower" />
                  <span>Nuansa Sunda Tradisional Modern</span>
                </span>
                <span className={styles.badge}>
                  <Icon name="calendar" />
                  <span>{formattedDateLong || 'Desember 2026'}</span>
                </span>
              </div>
            </div>
            <a
              href="#couple"
              className={styles.scrollCue}
              aria-label="Lihat mempelai"
            >
              <Icon name="arrow-down" />
            </a>
          </section>

          {/* Section 2: Prayer / Quote */}
          {hasPrayer && (
            <section className={styles.quote}>
              <Ornament small />
              <blockquote>&ldquo;{content.prayerText}&rdquo;</blockquote>
              {content.prayerSource && (
                <p className={styles.prayerSource}>
                  {content.prayerSource}
                </p>
              )}
              <span className={styles.quoteMark} aria-hidden="true">
                &amp;
              </span>
            </section>
          )}

          {/* Section 3: Couple (#couple) */}
          <section id="couple" className={`${styles.section} ${styles.coupleSection}`}>
            <p className={styles.eyebrow}>DUA HATI, SATU TUJUAN</p>
            <h2>
              Menyatukan
              <br />
              <em>dua cerita.</em>
            </h2>
            <Ornament small />

            {content.coupleGreeting && (
              <p className={styles.greeting}>
                {content.coupleGreeting}
              </p>
            )}

            {content.openingText && (
              <p className={styles.openingText}>
                {content.openingText}
              </p>
            )}

            {adaptedMedia.couplePhoto && (
              <figure className={styles.couplePhoto} id="couple-portrait">
                <img
                  src={adaptedMedia.couplePhoto.src}
                  alt={`${partnerOneShort} & ${partnerTwoShort}`}
                  loading="lazy"
                />
              </figure>
            )}

            <article className={styles.person}>
              <p className={styles.eyebrow}>Mempelai Wanita</p>
              <h3>{partnerOneFormal}</h3>
              {content.partnerOneParents && (
                <p>{content.partnerOneParents}</p>
              )}
            </article>

            <span className={styles.coupleAmpersand} aria-hidden="true">
              &amp;
            </span>

            <article className={styles.person}>
              <p className={styles.eyebrow}>Mempelai Pria</p>
              <h3>{partnerTwoFormal}</h3>
              {content.partnerTwoParents && (
                <p>{content.partnerTwoParents}</p>
              )}
            </article>
          </section>

          {/* Section 4: Ceremony & Countdown (#event) */}
          <section id="event" className={`${styles.section} ${styles.eventSection}`}>
            <p className={styles.eyebrow}>WE SAVED YOU A PLACE</p>
            <h2>
              Waktu &amp;
              <br />
              <em>tempat bahagia.</em>
            </h2>
            <p className={styles.sectionCopy}>
              Dengan doa, restu, dan kehadiran Anda, hari ini menjadi lebih berarti.
            </p>
            <Ornament small />

            <div className={styles.ceremonyGrid}>
              {ceremonies.map((ceremony, idx) => {
                const dateFormatted = formatCeremonyDate(
                  ceremony.startDateTime,
                  timeZone,
                );
                const timeFormatted = formatCeremonyTimeRange(
                  ceremony.startDateTime,
                  ceremony.endDateTime,
                  timeZone,
                );

                return (
                  <article key={idx} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.badge}>
                        {idx === 0 ? 'UTAMA' : 'RESEPSI'}
                      </span>
                      <h3>{ceremony.title}</h3>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardDetail}>
                        <Icon name="calendar" />
                        <span>{dateFormatted}</span>
                      </div>
                      <div className={styles.cardDetail}>
                        <Icon name="clock" />
                        <span>{timeFormatted}</span>
                      </div>
                      <div className={styles.cardDetail}>
                        <Icon name="pin" />
                        <div>
                          <strong>{ceremony.venue}</strong>
                          {ceremony.address && <p>{ceremony.address}</p>}
                        </div>
                      </div>
                    </div>
                    {ceremony.mapsUrl && (
                      <div className={styles.cardActions}>
                        <a
                          href={ceremony.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.mapLink}
                        >
                          <Icon name="pin" />
                          <span>Petunjuk Lokasi (Google Maps)</span>
                        </a>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Countdown timer */}
            {primaryCeremony && (
              <div className={styles.countdownBox}>
                <p className={styles.eyebrow}>MENGHITUNG HARI BAHAGIA</p>
                <div className={styles.counter}>
                  <div className={styles.counterUnit}>
                    <span className={styles.counterValue}>{countdown.days}</span>
                    <span className={styles.counterLabel}>HARI</span>
                  </div>
                  <div className={styles.counterDivider}>:</div>
                  <div className={styles.counterUnit}>
                    <span className={styles.counterValue}>{countdown.hours}</span>
                    <span className={styles.counterLabel}>JAM</span>
                  </div>
                  <div className={styles.counterDivider}>:</div>
                  <div className={styles.counterUnit}>
                    <span className={styles.counterValue}>{countdown.minutes}</span>
                    <span className={styles.counterLabel}>MENIT</span>
                  </div>
                  <div className={styles.counterDivider}>:</div>
                  <div className={styles.counterUnit}>
                    <span className={styles.counterValue}>{countdown.seconds}</span>
                    <span className={styles.counterLabel}>DETIK</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Section 5: Story (#story) */}
          {hasStory && content.story && (
            <section id="story" className={`${styles.section} ${styles.storySection}`}>
              <p className={styles.eyebrow}>OUR LITTLE STORY</p>
              <h2>
                Bermula dari temu,
                <br />
                <em>bermuara pada kamu.</em>
              </h2>
              <div className={styles.story}>
                {content.story.map((item, idx) => (
                  <article key={idx} className={styles.storyItem}>
                    <span className={styles.storyYear}>{item.year}</span>
                    <div className={styles.storyContent}>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Section 6: Gallery (#gallery) */}
          {hasGallery && (
            <section id="gallery" className={`${styles.section} ${styles.gallerySection}`}>
              <p className={styles.eyebrow}>DALAM BINGKAI</p>
              <h2>Momen pilihan.</h2>
              <div className={styles.gallery}>
                {adaptedMedia.gallery.map((photo, idx) => (
                  <button
                    key={photo.id || idx}
                    type="button"
                    className={styles.galleryItem}
                    onClick={() => setLightboxIndex(idx)}
                    aria-label={`Perbesar foto momen ${idx + 1}`}
                  >
                    <img src={photo.src} alt={`Momen ${idx + 1}`} loading="lazy" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Section 7: RSVP (#rsvp - PERSONALIZED only) */}
          {hasRsvp && data?.rsvp && (
            <section id="rsvp" className={`${styles.section} ${styles.rsvpSection}`}>
              <p className={styles.eyebrow}>KEHADIRAN ANDA BERARTI</p>
              <h2>Konfirmasi Kehadiran</h2>
              <div className={styles.rsvpWrapper}>
                <RsvpForm
                  uniqueCode={uniqueCode || ''}
                  maxPax={guest?.maxPax || 1}
                  initialRsvp={data.rsvp}
                />
              </div>
            </section>
          )}

          {/* Section 8: Closing */}
          <footer className={styles.closing}>
            <img
              src="/templates/sunda-puspa/garden.webp"
              alt=""
              className={styles.closingArt}
              aria-hidden="true"
            />
            <div className={styles.closingContent}>
              <p className={styles.eyebrow}>WITH LOVE &amp; GRATITUDE</p>
              <h2>
                Sampai bertemu
                <br />
                di hari bahagia kami.
              </h2>
              {content.closingText && (
                <p className={styles.closingText}>{content.closingText}</p>
              )}
              <p className={styles.closingNames}>
                <span>{partnerOneShort}</span> <em>&amp;</em>{' '}
                <span>{partnerTwoShort}</span>
              </p>
              <div className={styles.brand}>
                <span>crafted with love by</span>
                <strong>irvite.id</strong>
              </div>
            </div>
          </footer>
        </main>

        {/* 3. Floating Bottom Navigation */}
        <nav
          className={`${styles.bottomNav} ${stage !== 'opened' ? styles.contentClosed : ''}`}
          aria-label="Navigasi undangan"
        >
          <a href="#home">
            <Icon name="envelope" />
            <span>Undangan</span>
          </a>
          <a href="#couple">
            <Icon name="flower" />
            <span>Mempelai</span>
          </a>
          <a href="#event">
            <Icon name="calendar" />
            <span>Acara</span>
          </a>
          {hasStory && (
            <a href="#story">
              <Icon name="clock" />
              <span>Cerita</span>
            </a>
          )}
          {hasGallery && (
            <a href="#gallery">
              <Icon name="flower" />
              <span>Galeri</span>
            </a>
          )}
          {hasRsvp && (
            <a href="#rsvp">
              <Icon name="envelope" />
              <span>RSVP</span>
            </a>
          )}
        </nav>
      </div>

      {/* 4. Background Music Toggle */}
      {adaptedMedia.bgMusic?.src && (
        <>
          <audio
            ref={audioRef}
            src={adaptedMedia.bgMusic.src}
            loop
            preload="none"
          />
          <button
            type="button"
            className={styles.musicButton}
            onClick={toggleMusic}
            aria-label={isPlaying ? 'Hentikan musik' : 'Putar musik'}
          >
            <Icon name={isPlaying ? 'pause' : 'music'} />
          </button>
        </>
      )}

      {/* 5. Lightbox Native Dialog */}
      <dialog
        ref={lightboxDialogRef}
        className={styles.dialog}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setLightboxIndex(null);
          }
        }}
      >
        <div className={styles.dialogBody}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => setLightboxIndex(null)}
            aria-label="Tutup"
          >
            <Icon name="close" />
          </button>
          {lightboxIndex !== null && adaptedMedia.gallery[lightboxIndex] && (
            <img
              src={adaptedMedia.gallery[lightboxIndex].src}
              alt="Foto galeri"
              className={styles.lightboxImage}
            />
          )}
        </div>
      </dialog>
    </div>
  );
}

export default function SundaPuspaRenderer(props: RendererProps) {
  const adaptedContent = useMemo(
    () => adaptSundaPuspaContent(props.data?.event?.content),
    [props.data?.event?.content],
  );

  if (!adaptedContent) {
    return null;
  }

  return <SundaPuspaInner {...props} content={adaptedContent} />;
}
