/* eslint-disable @next/next/no-img-element */
'use client';

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { RendererProps } from '../registry';
import type { ClassicLetterContent } from './classic-letter.types';
import {
  adaptClassicLetterContent,
  adaptClassicLetterMedia,
} from './classic-letter.adapter';
import {
  formatCeremonyDate,
  formatCeremonyDateShort,
  formatCeremonyTimeRange,
  parseEventLocalDateTime,
  parseTargetEpoch,
} from './datetime-formatter';
import {
  resolveClassicEffectiveMode,
  shouldRenderClassicGuest,
  shouldRenderClassicRsvp,
} from './classic-letter.gating';
import { RsvpForm } from '../../components/rsvp-form';
import styles from './classic-letter.module.css';

function SprigIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 170" className={className} aria-hidden="true">
      <path d="M50 161c-20-44 9-102-5-147m2 21C21 29 20 14 21 8c18 3 28 11 26 27Zm2 23c22-11 27-25 22-36-19 6-26 19-22 36Zm-1 16C25 66 16 55 16 45c21 0 33 11 32 29Zm-6 27c27-6 34-19 33-30-23 3-34 15-33 30Zm-2 26C20 117 13 107 15 94c20 2 29 13 25 33Zm4 16c23-7 32-20 32-31-22 2-32 14-32 31Z" />
    </svg>
  );
}

function FlourishIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 54" className={className || styles.flourish} aria-hidden="true">
      <path d="M110 43c-17-17-10-35 0-35s17 18 0 35Zm0-11c-12-28-35-33-37-19-1 10 15 18 25 20m-5 0C71 16 51 22 48 35m27-3c-16-8-30-4-45 5m0 0c-13 7-25 3-21-4m101-1c12-28 35-33 37-19 1 10-15 18-25 20m5 0c22-17 42-11 45 2m-27-3c16-8 30-4 45 5m0 0c13 7 25 3 21-4M106 44h8" />
    </svg>
  );
}

function Icon({
  name,
}: {
  name:
    | 'arrow'
    | 'mail'
    | 'calendar'
    | 'pin'
    | 'heart'
    | 'home'
    | 'copy'
    | 'close';
}) {
  switch (name) {
    case 'arrow':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 12h16m-6-6 6 6-6 6" />
        </svg>
      );
    case 'mail':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="1" />
          <path d="m3 6 9 7 9-7" />
        </svg>
      );
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="16" height="16" rx="1" />
          <path d="M8 2v6m8-6v6M4 11h16m-11 4h2m3 0h2m-7 3h2" />
        </svg>
      );
    case 'pin':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z" />
          <circle cx="12" cy="10" r="2" />
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 5.5a5.1 5.1 0 0 0-7.2 0L12 6.8l-1.3-1.3a5.1 5.1 0 0 0-7.2 7.2L12 21l8.5-8.3a5.1 5.1 0 0 0 0-7.2Z" />
        </svg>
      );
    case 'home':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8" />
        </svg>
      );
    case 'copy':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="8" y="8" width="12" height="13" rx="1" />
          <path d="M16 8V3H3v13h5" />
        </svg>
      );
    case 'close':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      );
    default:
      return null;
  }
}

interface ClassicLetterInnerProps extends RendererProps {
  content: ClassicLetterContent;
}

function ClassicLetterInner({
  data,
  uniqueCode,
  mode,
  isPreview,
  content,
}: ClassicLetterInnerProps) {
  const [stage, setStage] = useState<'cover' | 'leaving' | 'opened'>('cover');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<Record<number, string>>({});
  const [activeSection, setActiveSection] = useState('home');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lightboxDialogRef = useRef<HTMLDialogElement | null>(null);

  const adaptedMedia = useMemo(
    () => adaptClassicLetterMedia(data?.mediaBySlot, data?.media),
    [data?.mediaBySlot, data?.media],
  );

  // Mode gating
  const effectiveMode = resolveClassicEffectiveMode(mode);
  const guest = data?.guest;
  const canShowGuest = shouldRenderClassicGuest(effectiveMode, guest);
  const canShowRsvp = shouldRenderClassicRsvp(effectiveMode, guest, data?.rsvp);
  const guestName = canShowGuest ? guest?.name : undefined;

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

  const parsedPrimaryDate = useMemo(
    () => (primaryCeremony ? parseEventLocalDateTime(primaryCeremony.startDateTime, timeZone) : null),
    [primaryCeremony, timeZone],
  );

  const formattedDateLong = primaryCeremony
    ? formatCeremonyDate(primaryCeremony.startDateTime, timeZone)
    : '';

  const formattedDateShort = primaryCeremony
    ? formatCeremonyDateShort(primaryCeremony.startDateTime, timeZone)
    : '';

  const primaryYear = parsedPrimaryDate ? parsedPrimaryDate.yearStr : '2026';

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

  // Stage transition timer
  useEffect(() => {
    if (stage !== 'leaving') return;
    const timer = setTimeout(() => {
      setStage('opened');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 1150);
    return () => clearTimeout(timer);
  }, [stage]);

  // Autoplay video on mount if video is resolved
  useEffect(() => {
    if (adaptedMedia.resolvedBg.type !== 'video') return;
    const video = videoRef.current;
    if (!video) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    video.play().then(() => {
      setIsVideoPlaying(true);
    }).catch(() => {
      // Autoplay blocked: poster/background remains valid
      setIsVideoPlaying(false);
    });
  }, [adaptedMedia.resolvedBg.type]);

  // Lightbox dialog open/close
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
      setStage('leaving');
    }
  };

  const toggleVideoMotion = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (isVideoPlaying) {
      video.pause();
      setIsVideoPlaying(false);
    } else {
      try {
        await video.play();
        setIsVideoPlaying(true);
      } catch {
        setIsVideoPlaying(false);
      }
    }
  };

  const handleCopyAccount = async (accountNumber: string, index: number) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopyFeedback((prev) => ({ ...prev, [index]: 'Nomor rekening berhasil disalin.' }));
    } catch {
      setCopyFeedback((prev) => ({ ...prev, [index]: 'Pilih dan salin nomor rekening di atas.' }));
    }
  };

  // Section existence guards
  const hasIntro = Boolean(content.intro);
  const hasQuote = Boolean(content.quote);
  const hasCeremonies = ceremonies.length > 0;
  const hasGallery = Boolean(adaptedMedia.gallery && adaptedMedia.gallery.length > 0);
  const hasPrayer = Boolean(content.prayer);
  const hasGifts = Boolean(content.giftAccounts && content.giftAccounts.length > 0);
  const hasRsvp = Boolean(canShowRsvp && data?.rsvp);
  const hasCouplePhoto = Boolean(adaptedMedia.couplePhoto?.src);

  return (
    <div className={styles.root}>
      {/* 1. Background Layer */}
      <div className={styles.background} aria-hidden="true">
        <img
          src={adaptedMedia.resolvedBg.photoSrc}
          alt=""
          className={styles.backgroundImage}
        />
        {adaptedMedia.resolvedBg.type === 'video' && (
          <video
            ref={videoRef}
            src={adaptedMedia.resolvedBg.videoSrc}
            poster={adaptedMedia.resolvedBg.posterSrc}
            muted
            loop
            playsInline
            preload="none"
            tabIndex={-1}
            className={`${styles.backgroundVideo} ${isVideoPlaying ? styles.playing : ''}`}
          />
        )}
        <div className={styles.backgroundShade} />
      </div>

      {/* 2. Fixed Page Border */}
      <div className={styles.pageBorder} aria-hidden="true" />

      {/* 3. Header Masthead */}
      <header className={styles.masthead}>
        <span className={styles.wordmark}>
          irvite<span>&middot;</span>
        </span>
        <span className={styles.mastheadSubtitle}>A LETTER TO FOREVER</span>
      </header>

      {/* 4. Motion Control Button (for video backgrounds) */}
      {adaptedMedia.resolvedBg.type === 'video' && (
        <button
          type="button"
          className={styles.motionButton}
          onClick={toggleVideoMotion}
          aria-label={isVideoPlaying ? 'Jeda video latar' : 'Putar video latar'}
          aria-pressed={isVideoPlaying}
        >
          <span aria-hidden="true">{isVideoPlaying ? '\u2161' : '\u25B7'}</span>
          <span id="motion-label">{isVideoPlaying ? 'Jeda latar' : 'Putar latar'}</span>
        </button>
      )}

      {/* 5. Cover Section */}
      <section
        className={`${styles.cover} ${stage === 'leaving' ? styles.coverLeaving : ''}`}
        id="cover"
        aria-label="Sampul undangan"
        hidden={stage === 'opened'}
      >
        <p className={`${styles.eyebrow} ${styles.coverKicker}`}>
          SEBUAH SURAT, SEBUAH JANJI
        </p>

        <div className={styles.envelope} id="envelope">
          <div className={styles.envelopeBack} />
          <div className={styles.invitationCard}>
            <div className={styles.cardBorder} />
            <FlourishIcon className={styles.cardFlourish} />
            <p className={`${styles.eyebrow} ${styles.cardEyebrow}`}>THE WEDDING OF</p>
            <h1 className={styles.coverNames}>
              <span>{partnerOneShort}</span>
              <em>&amp;</em>
              <span>{partnerTwoShort}</span>
            </h1>
            {formattedDateShort && (
              <div className={styles.cardDate}>{formattedDateShort}</div>
            )}
            <SprigIcon className={styles.cardSprig} />
          </div>
          <div className={styles.envelopeFold} />
          <div className={styles.envelopePocket} />
          <div className={styles.waxSeal} aria-hidden="true">
            <span>{initialOne}</span>
            <i>&amp;</i>
            <span>{initialTwo}</span>
          </div>
        </div>

        {/* Recipient Treatment: Strictly in PERSONALIZED mode with valid guest */}
        {canShowGuest && guestName && (
          <div className={styles.recipient}>
            <p>Dengan hangat kami mengundang</p>
            <strong>{guestName}</strong>
          </div>
        )}

        <button
          type="button"
          className={`${styles.button} ${styles.buttonIvory} ${styles.coverButton}`}
          onClick={handleOpenCover}
          disabled={stage === 'leaving'}
        >
          <Icon name="mail" />
          <span>Buka undangan</span>
          <Icon name="arrow" />
        </button>

        <p className={styles.coverCaption}>Some stories are written to last.</p>
        <span className={styles.coverEdition}>
          CLASSIC LETTER &nbsp; / &nbsp; {primaryYear}
        </span>
      </section>

      {/* 6. Main Opened Invitation */}
      <div id="invitation" hidden={stage !== 'opened'}>
        <aside className={styles.marginNote} aria-hidden="true">
          <span>THE ART OF TOGETHERNESS</span>
          <i />
          <span>{formattedDateShort}</span>
        </aside>

        <main id="main" className={styles.story} tabIndex={-1}>
          {/* Section 1: Hero (#home) */}
          <section className={styles.hero} id="home">
            <div className={styles.crest}>
              <SprigIcon />
              <span>{initialOne}</span>
              <i>&amp;</i>
              <span>{initialTwo}</span>
              <SprigIcon />
            </div>
            <p className={`${styles.eyebrow} ${styles.heroEyebrow}`}>
              TOGETHER WITH OUR FAMILIES
            </p>
            <p className={styles.heroPrelude}>With love,</p>
            <h2 className={styles.displayNames}>
              <span>{partnerOneShort}</span>
              <em>&amp;</em>
              <span>{partnerTwoShort}</span>
            </h2>
            {formattedDateLong && (
              <p className={styles.heroDate}>{formattedDateLong}</p>
            )}
            <div className={styles.smallRule} />
            <p className={styles.heroCopy}>
              Dua cerita bertemu.
              <br />
              Satu perjalanan dimulai.
            </p>
            <a className={styles.scrollLink} href="#letter">
              <span>Baca surat kami &darr;</span>
            </a>
          </section>

          {/* Section 2: Letter (#letter) */}
          {hasIntro && (
            <section className={styles.letter} id="letter">
              <span className={styles.letterIndex}>I. &nbsp; THE INVITATION</span>
              <FlourishIcon />
              <p className={styles.arabic} lang="ar" dir="rtl">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
              <h2>
                Sebuah janji,
                <br />
                <em>untuk selamanya.</em>
              </h2>
              <p className={styles.bodyCopy}>{content.intro}</p>
              <p className={styles.letterSignature}>Dengan penuh cinta,</p>
              <p className={styles.letterNames}>
                <span>{partnerOneShort}</span> <em>&amp;</em>{' '}
                <span>{partnerTwoShort}</span>
              </p>
              <span className={styles.letterPostmark} aria-hidden="true">
                SEALED
                <br />
                WITH LOVE
              </span>
            </section>
          )}

          {/* Section 3: Couple (#couple) */}
          <section className={`${styles.section} ${styles.couple}`} id="couple">
            <p className={styles.eyebrow}>TWO HEARTS, ONE PROMISE</p>
            <h2 className={styles.sectionTitle}>The beloved.</h2>

            {hasCouplePhoto && (
              <figure className={styles.couplePhoto}>
                <img
                  src={adaptedMedia.couplePhoto?.src}
                  alt="Foto pasangan"
                  loading="lazy"
                />
                <figcaption>Our favorite place is together.</figcaption>
              </figure>
            )}

            <div className={styles.couplePair}>
              <article>
                <span className={styles.role}>the bride</span>
                <h3>{partnerOneFormal}</h3>
                {content.partnerOneFamily && <p>{content.partnerOneFamily}</p>}
              </article>

              <span className={styles.coupleAmp} aria-hidden="true">
                &amp;
              </span>

              <article>
                <span className={styles.role}>the groom</span>
                <h3>{partnerTwoFormal}</h3>
                {content.partnerTwoFamily && <p>{content.partnerTwoFamily}</p>}
              </article>
            </div>

            <FlourishIcon />
          </section>

          {/* Section 4: Quote */}
          {hasQuote && (
            <section className={styles.quote}>
              <span className={styles.eyebrow}>A TIMELESS KIND OF LOVE</span>
              <blockquote>{content.quote}</blockquote>
              <span className={styles.quoteSign}>
                {initialOne} &amp; {initialTwo}
              </span>
            </section>
          )}

          {/* Section 5: Events & Countdown (#event) */}
          {hasCeremonies && (
            <section className={`${styles.section} ${styles.event}`} id="event">
              <p className={styles.eyebrow}>THE DAY WE BEGIN</p>
              <h2 className={styles.sectionTitle}>Save the date.</h2>

              {/* Countdown */}
              <div className={styles.countdown} aria-label="Hitung mundur acara">
                <div>
                  <strong>{countdown.days}</strong>
                  <span>HARI</span>
                </div>
                <div>
                  <strong>{countdown.hours}</strong>
                  <span>JAM</span>
                </div>
                <div>
                  <strong>{countdown.minutes}</strong>
                  <span>MENIT</span>
                </div>
                <div>
                  <strong>{countdown.seconds}</strong>
                  <span>DETIK</span>
                </div>
              </div>

              {countdown.isFinished && (
                <p className={styles.dateArrived}>Hari bahagia kami telah tiba.</p>
              )}

              {/* Ceremony stationery card */}
              <div className={styles.eventStationery}>
                <span className={`${styles.pinHole} ${styles.pinLeft}`} aria-hidden="true" />
                <span className={`${styles.pinHole} ${styles.pinRight}`} aria-hidden="true" />
                <div className={styles.eventBorder}>
                  <p className={styles.eyebrow}>YOU ARE CORDIALLY INVITED</p>

                  {parsedPrimaryDate && (
                    <>
                      <div className={styles.dateBlock}>
                        <span>{parsedPrimaryDate.dayStr}</span>
                        <div>
                          <span>{parsedPrimaryDate.monthName}</span>
                          <i>{parsedPrimaryDate.yearStr}</i>
                        </div>
                      </div>
                      <p className={styles.weekday}>{parsedPrimaryDate.dayOfWeek}</p>
                    </>
                  )}

                  <div className={styles.eventTimes}>
                    {ceremonies.map((ceremony, idx) => {
                      const timeRange = formatCeremonyTimeRange(
                        ceremony.startDateTime,
                        ceremony.endDateTime,
                        timeZone,
                      );
                      return (
                        <article key={idx}>
                          <span className={styles.eventNumber}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <h3>{ceremony.title}</h3>
                          <p>{timeRange}</p>
                        </article>
                      );
                    })}
                  </div>

                  {primaryCeremony && (
                    <div className={styles.venue}>
                      <Icon name="pin" />
                      <h3>{primaryCeremony.venue}</h3>
                      {primaryCeremony.address && <p>{primaryCeremony.address}</p>}
                      {primaryCeremony.mapsUrl && (
                        <a
                          href={primaryCeremony.mapsUrl}
                          className={`${styles.button} ${styles.buttonBrown}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span>Petunjuk lokasi</span>
                          <Icon name="arrow" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Section 6: Gallery (#gallery) */}
          {hasGallery && (
            <section className={`${styles.section} ${styles.gallerySection}`} id="gallery">
              <p className={styles.eyebrow}>A FEW MOMENTS TO KEEP</p>
              <h2 className={styles.sectionTitle}>Dalam bingkai.</h2>
              <div className={styles.gallery}>
                {adaptedMedia.gallery.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    type="button"
                    className={`${styles.galleryItem} ${
                      adaptedMedia.gallery.length === 1 ? styles.galleryItemSingle : ''
                    }`}
                    onClick={() => setLightboxIndex(idx)}
                    aria-label="Perbesar foto galeri"
                  >
                    <img
                      src={item.src}
                      alt="Foto momen"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Section 7: Prayer */}
          {hasPrayer && (
            <section className={`${styles.section} ${styles.prayer}`}>
              <FlourishIcon />
              <p className={styles.eyebrow}>A PROMISE &amp; A PRAYER</p>
              <h2 className={styles.sectionTitle}>
                Bersama, dalam
                <br />
                <em>setiap musim.</em>
              </h2>
              <blockquote>{content.prayer}</blockquote>
              <p className={styles.amen}>Aamiin ya Rabbal &lsquo;alamin.</p>
            </section>
          )}

          {/* Section 8: Gift (#gift) */}
          {hasGifts && (
            <section className={`${styles.letter} ${styles.gift}`} id="gift">
              <span className={styles.letterIndex}>
                A SMALL GESTURE, A WARM MEMORY
              </span>
              <h2>Tanda kasih.</h2>
              <p className={styles.bodyCopy}>
                Doa restu dan kehadiran Anda adalah hadiah terindah. Jika ingin
                menitipkan tanda kasih, kami menerimanya dengan penuh syukur.
              </p>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonBrown}`}
                onClick={() => setShowGifts(!showGifts)}
                aria-expanded={showGifts}
                aria-controls="gift-panel"
              >
                <span>{showGifts ? 'Tutup rekening' : 'Lihat rekening'}</span>
                <Icon name="arrow" />
              </button>

              <div id="gift-panel" hidden={!showGifts}>
                {content.giftAccounts!.map((account, idx) => (
                  <div key={idx} className={styles.bankCard}>
                    <span>{account.bankName}</span>
                    <p className={styles.accountNumber}>{account.accountNumber}</p>
                    <small>a.n. {account.accountHolder}</small>
                    <button
                      type="button"
                      className={styles.textButton}
                      onClick={() => handleCopyAccount(account.accountNumber, idx)}
                    >
                      <Icon name="copy" />
                      <span>Salin nomor rekening</span>
                    </button>
                    {copyFeedback[idx] && (
                      <p className={styles.feedback} role="status">
                        {copyFeedback[idx]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 9: RSVP Container (#rsvp - PERSONALIZED only) */}
          {hasRsvp && data?.rsvp && (
            <section className={`${styles.section} ${styles.rsvpSection}`} id="rsvp">
              <div className={styles.responseCard}>
                <span className={styles.letterIndex}>A LITTLE NOTE FOR US</span>
                <FlourishIcon />
                <h2 className={styles.sectionTitle}>With love.</h2>
                <p className={styles.bodyCopy}>
                  Konfirmasi kehadiran Anda sangat berarti bagi kami.
                </p>
                <div className={styles.rsvpFormWrapper}>
                  <RsvpForm
                    uniqueCode={uniqueCode || ''}
                    maxPax={guest?.maxPax || 1}
                    initialRsvp={data.rsvp}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Section 10: Closing */}
          <footer className={`${styles.section} ${styles.closing}`}>
            <div className={styles.crest}>
              <SprigIcon />
              <span>{initialOne}</span>
              <i>&amp;</i>
              <span>{initialTwo}</span>
              <SprigIcon />
            </div>
            <p className={styles.eyebrow}>THE NEXT CHAPTER STARTS HERE</p>
            <h2 className={styles.sectionTitle}>Until we meet.</h2>
            {content.closing && (
              <p className={styles.closingCopy}>{content.closing}</p>
            )}
            <p className={styles.closingNames}>
              <span>{partnerOneShort}</span> <em>&amp;</em>{' '}
              <span>{partnerTwoShort}</span>
            </p>
            <span className={styles.closingLove}>Yours, always.</span>
            <div className={styles.colophon}>
              <span>SEBUAH UNDANGAN, SEPENUH HATI</span>
              <span className={styles.wordmark}>
                irvite<span>&middot;</span>
              </span>
              {isPreview && <small>PRATINJAU &middot; DATA ACARA CONTOH</small>}
            </div>
          </footer>
        </main>

        {/* Floating Bottom Navigation */}
        <nav className={styles.bottomNav} aria-label="Navigasi undangan">
          <a
            href="#home"
            className={activeSection === 'home' ? styles.active : ''}
            onClick={() => setActiveSection('home')}
          >
            <Icon name="home" />
            <span>Beranda</span>
          </a>
          <a
            href="#couple"
            className={activeSection === 'couple' ? styles.active : ''}
            onClick={() => setActiveSection('couple')}
          >
            <Icon name="heart" />
            <span>Mempelai</span>
          </a>
          {hasCeremonies && (
            <a
              href="#event"
              className={activeSection === 'event' ? styles.active : ''}
              onClick={() => setActiveSection('event')}
            >
              <Icon name="calendar" />
              <span>Acara</span>
            </a>
          )}
          {hasGallery && (
            <a
              href="#gallery"
              className={activeSection === 'gallery' ? styles.active : ''}
              onClick={() => setActiveSection('gallery')}
            >
              <Icon name="mail" />
              <span>Galeri</span>
            </a>
          )}
          {hasGifts && (
            <a
              href="#gift"
              className={activeSection === 'gift' ? styles.active : ''}
              onClick={() => setActiveSection('gift')}
            >
              <Icon name="mail" />
              <span>Kado</span>
            </a>
          )}
          {hasRsvp && (
            <a
              href="#rsvp"
              className={activeSection === 'rsvp' ? styles.active : ''}
              onClick={() => setActiveSection('rsvp')}
            >
              <Icon name="mail" />
              <span>RSVP</span>
            </a>
          )}
        </nav>
      </div>

      {/* Lightbox Dialog */}
      <dialog
        ref={lightboxDialogRef}
        className={styles.dialog}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setLightboxIndex(null);
          }
        }}
      >
        <button
          type="button"
          className={styles.dialogCloseButton}
          onClick={() => setLightboxIndex(null)}
          aria-label="Tutup foto"
        >
          &times;
        </button>
        {lightboxIndex !== null && adaptedMedia.gallery[lightboxIndex] && (
          <img
            src={adaptedMedia.gallery[lightboxIndex].src}
            alt="Foto momen"
            className={styles.dialogImage}
          />
        )}
      </dialog>
    </div>
  );
}

export default function ClassicLetterRenderer(props: RendererProps) {
  const adaptedContent = useMemo(
    () => adaptClassicLetterContent(props.data?.event?.content),
    [props.data?.event?.content],
  );

  if (!adaptedContent) {
    return null;
  }

  return <ClassicLetterInner {...props} content={adaptedContent} />;
}
