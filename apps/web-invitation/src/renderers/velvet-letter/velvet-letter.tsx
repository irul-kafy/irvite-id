'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { VelvetLetterProps } from './velvet-letter.types';
import {
  adaptVelvetLetterContent,
  adaptVelvetLetterMedia,
} from './velvet-letter.adapter';
import {
  formatCeremonyTimeRange,
  parseTargetEpoch,
  parseEventLocalDateTime,
} from './datetime-formatter';
import {
  resolveVelvetEffectiveMode,
  shouldRenderVelvetGuest,
  shouldRenderVelvetRsvp,
} from './velvet-letter.gating';
import { RsvpForm } from '../../components/rsvp-form';
import styles from './velvet-letter.module.css';

export const VelvetLetter: React.FC<VelvetLetterProps> = ({
  data,
  uniqueCode,
  mode,
}) => {
  // Defensive content parsing
  const content = adaptVelvetLetterContent(data?.event?.content);
  const media = adaptVelvetLetterMedia(data?.mediaBySlot, data?.media);

  // Cover opening state
  const [coverState, setCoverState] = useState<'closed' | 'leaving' | 'opened'>('closed');
  const [activeSection, setActiveSection] = useState<string>('home');
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  // Countdown state
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  } | null>(null);

  // Scroll reveal setup
  const rootRef = useRef<HTMLDivElement>(null);

  // Mode gating
  const effectiveMode = resolveVelvetEffectiveMode(mode);
  const guest = data?.guest;
  const canShowGuest = shouldRenderVelvetGuest(effectiveMode, guest);
  const canShowRsvp = shouldRenderVelvetRsvp(effectiveMode, guest, data?.rsvp);
  const guestName = canShowGuest ? guest?.name : undefined;

  // Ceremonies
  const ceremonies = content?.ceremonies || [];
  const firstCeremony = ceremonies.length > 0 ? ceremonies[0] : null;

  // Calculate target countdown epoch
  const targetEpoch = firstCeremony
    ? parseTargetEpoch(firstCeremony.startDateTime, content?.timeZone)
    : null;

  useEffect(() => {
    if (!targetEpoch) return;

    const updateCountdown = () => {
      const now = Date.now();
      const diff = targetEpoch - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetEpoch]);

  // Scroll reveal observer
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      return;
    }

    if (rootRef.current) {
      rootRef.current.classList.add(styles.motionReady);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
          }
        });
      },
      { threshold: 0.1 },
    );

    const elements = rootRef.current?.querySelectorAll(`.${styles.reveal}`);
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [coverState]);

  // Handle cover open
  const handleOpenCover = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCoverState('opened');
      return;
    }
    setCoverState('leaving');
    setTimeout(() => {
      setCoverState('opened');
    }, 1350);
  };

  // Clipboard copy handler
  const handleCopyAccount = async (accountNumber: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(accountNumber);
        setCopiedAccount(accountNumber);
        setTimeout(() => setCopiedAccount(null), 3000);
      }
    } catch {
      // Graceful failure
    }
  };

  if (!content) {
    return null;
  }

  // Partner display names and fallbacks
  const partnerOneShort = content.partnerOneName;
  const partnerTwoShort = content.partnerTwoName;
  const partnerOneFull = content.partnerOneFullName || partnerOneShort;
  const partnerTwoFull = content.partnerTwoFullName || partnerTwoShort;
  const partnerOneInitial = (partnerOneShort[0] || 'N').toUpperCase();
  const partnerTwoInitial = (partnerTwoShort[0] || 'A').toUpperCase();

  // Date parsing
  const parsedFirstCeremony = firstCeremony
    ? parseEventLocalDateTime(firstCeremony.startDateTime, content.timeZone)
    : null;

  const eventDateShort = parsedFirstCeremony?.formattedDateShort || '';
  const eventDateFull = parsedFirstCeremony?.formattedDate || '';
  const eventDay = parsedFirstCeremony?.dayStr || '';
  const eventMonth = (parsedFirstCeremony?.monthName || '').toUpperCase();
  const eventYear = parsedFirstCeremony?.yearStr || '';

  // Gift section condition
  const hasGiftAccounts = Boolean(content.giftAccounts && content.giftAccounts.length > 0);
  const hasGiftMessage = Boolean(content.giftMessage);
  const hasGiftSection = hasGiftMessage || hasGiftAccounts;

  // RSVP section condition
  const hasRsvpSection = Boolean(canShowRsvp && data?.rsvp);

  return (
    <div
      ref={rootRef}
      className={styles.root}
    >
      {/* Cover / Envelope Modal */}
      {coverState !== 'opened' && (
        <div
          className={`${styles.cover} ${coverState === 'leaving' ? styles.coverLeaving : ''}`}
          id="cover"
        >
          <div className={styles.coverArt} aria-hidden="true" />
          <img
            src="/templates/velvet-letter/floral-pearl.png"
            alt=""
            className={styles.coverFloral}
            aria-hidden="true"
          />
          <div className={styles.coverContent}>
            <p className={styles.coverKicker}>A LETTER OF LOVE</p>
            <div className={styles.letterWrap}>
              <div className={styles.envelopePocket} aria-hidden="true" />
              <div className={styles.envelopeFold} aria-hidden="true" />
              <div className={styles.letterCard}>
                <p className={styles.cardEyebrow}>THE WEDDING OF</p>
                <h1 className={styles.coverHeading}>
                  <span>{partnerOneShort}</span>
                  <em>&</em>
                  <span>{partnerTwoShort}</span>
                </h1>
              </div>
              <div className={styles.waxSeal} aria-hidden="true">
                <span>{partnerOneInitial}</span>
                <i>&</i>
                <span>{partnerTwoInitial}</span>
              </div>
            </div>

            {eventDateShort && <p className={styles.coverDate}>{eventDateShort}</p>}

            {/* Guest Treatment (PERSONALIZED only) */}
            {canShowGuest && guestName && (
              <div className={styles.guestCard}>
                <p>Sebuah undangan istimewa untuk</p>
                <strong>{guestName}</strong>
              </div>
            )}

            <button
              type="button"
              className={styles.openButton}
              onClick={handleOpenCover}
              id="open-invitation"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 6 9 7 9-7" />
              </svg>
              Buka undangan
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>

            <p className={styles.coverNote}>A beautiful beginning, sealed with love.</p>
          </div>
        </div>
      )}

      {/* Desktop Margin Note */}
      <aside className={styles.marginNote} aria-hidden="true">
        <span>A LETTER OF LOVE</span>
        <i />
        <span>{eventDateShort}</span>
      </aside>

      {/* Main Invitation Column */}
      <main className={styles.invitationScroll}>
        {/* Section 1: Opening (#home) */}
        <section className={`${styles.section} ${styles.opening}`} id="home">
          <p className={styles.eyebrow}>TOGETHER WITH OUR FAMILIES</p>
          <p className={styles.openingPrelude}>Sebuah awal untuk</p>
          <h2 className={styles.displayNames}>
            <span>{partnerOneShort}</span>
            <em>&</em>
            <span>{partnerTwoShort}</span>
          </h2>
          {eventDateShort && (
            <div className={styles.dateDivider}>
              <span />
              <p>{eventDateShort}</p>
              <span />
            </div>
          )}
          <p className={styles.paperCaption}>
            Di antara semua perjalanan,<br />kami memilih melangkah bersama.
          </p>
          <a href="#blessing" className={styles.scrollInvitation}>
            Buka lembar berikutnya
            <span>↓</span>
          </a>
          <img
            src="/templates/velvet-letter/floral-pearl.png"
            alt=""
            className={styles.floralArt}
            aria-hidden="true"
          />
        </section>

        {/* Section 2: Blessing (#blessing) */}
        <section className={`${styles.section} ${styles.blessing} ${styles.reveal}`} id="blessing">
          <div className={styles.letterMark} aria-hidden="true">01 / THE BEGINNING</div>
          <p className={styles.eyebrow}>DALAM NAMA-NYA, KAMI MELANGKAH</p>
          <p className={styles.arabic} lang="ar" dir="rtl">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <p className={styles.serifIntro}>
            Cinta yang kami pilih.<br />Janji yang akan kami jaga.
          </p>
          {content.intro && (
            <p className={styles.blessingBody}>
              {content.intro}
            </p>
          )}
        </section>

        {/* Section 3: Couple (#couple) */}
        <section className={`${styles.section} ${styles.couple} ${styles.reveal}`} id="couple">
          <p className={styles.eyebrow}>TWO HEARTS, ONE PROMISE</p>
          <h2 className={styles.sectionTitle}>The beloved</h2>

          {/* Bride Profile (Partner One) */}
          <article className={styles.coupleProfile}>
            <div className={styles.profileVisual}>
              {media.partnerOnePhoto?.src ? (
                <div className={styles.portrait}>
                  <img
                    src={media.partnerOnePhoto.src}
                    alt={partnerOneFull}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className={styles.initialMedallion} aria-hidden="true">
                  <span>{partnerOneInitial}</span>
                  <span className={styles.profileIndex}>I.</span>
                </div>
              )}
            </div>
            <div className={styles.profileCopy}>
              <span className={styles.smallItalic}>the bride</span>
              <h3>{partnerOneShort}</h3>
              <h4>{partnerOneFull}</h4>
              {content.partnerOneFamily && <p>{content.partnerOneFamily}</p>}
            </div>
          </article>

          <span className={styles.coupleAmp} aria-hidden="true">&</span>

          {/* Groom Profile (Partner Two) */}
          <article className={`${styles.coupleProfile} ${styles.groomProfile}`}>
            <div className={styles.profileVisual}>
              {media.partnerTwoPhoto?.src ? (
                <div className={styles.portrait}>
                  <img
                    src={media.partnerTwoPhoto.src}
                    alt={partnerTwoFull}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className={styles.initialMedallion} aria-hidden="true">
                  <span>{partnerTwoInitial}</span>
                  <span className={styles.profileIndex}>II.</span>
                </div>
              )}
            </div>
            <div className={styles.profileCopy}>
              <span className={styles.smallItalic}>the groom</span>
              <h3>{partnerTwoShort}</h3>
              <h4>{partnerTwoFull}</h4>
              {content.partnerTwoFamily && <p>{content.partnerTwoFamily}</p>}
            </div>
          </article>

          <img
            src="/templates/velvet-letter/floral-pearl.png"
            alt=""
            className={styles.coupleFloral}
            aria-hidden="true"
          />
        </section>

        {/* Section 4: Event / Save the Date (#event) */}
        <section className={`${styles.section} ${styles.daySection} ${styles.reveal}`} id="event">
          <p className={styles.eyebrow}>THE DAY WE SAY “I DO”</p>
          <h2 className={styles.sectionTitle}>Save the date</h2>

          {/* Countdown */}
          {timeLeft && (
            <>
              {!timeLeft.isPast ? (
                <div className={styles.countdown} aria-label="Hitung mundur menuju pernikahan">
                  <div className={styles.countdownBox}>
                    <strong>{String(timeLeft.days).padStart(2, '0')}</strong>
                    <span>HARI</span>
                  </div>
                  <b className={styles.countdownColon}>:</b>
                  <div className={styles.countdownBox}>
                    <strong>{String(timeLeft.hours).padStart(2, '0')}</strong>
                    <span>JAM</span>
                  </div>
                  <b className={styles.countdownColon}>:</b>
                  <div className={styles.countdownBox}>
                    <strong>{String(timeLeft.minutes).padStart(2, '0')}</strong>
                    <span>MENIT</span>
                  </div>
                  <b className={styles.countdownColon}>:</b>
                  <div className={styles.countdownBox}>
                    <strong>{String(timeLeft.seconds).padStart(2, '0')}</strong>
                    <span>DETIK</span>
                  </div>
                </div>
              ) : (
                <p className={styles.countdownMessage}>Hari bahagia kami telah tiba.</p>
              )}
            </>
          )}

          {/* Hanging Event Letter */}
          <div className={styles.hangingLetter}>
            <span className={`${styles.cord} ${styles.cordLeft}`} aria-hidden="true" />
            <span className={`${styles.cord} ${styles.cordRight}`} aria-hidden="true" />
            <div className={styles.eventLetterInner}>
              <div className={styles.monogram} aria-hidden="true">
                <span>{partnerOneInitial}</span>
                <i>&</i>
                <span>{partnerTwoInitial}</span>
              </div>
              <p className={styles.eyebrow}>A CELEBRATION OF LOVE</p>

              {eventDay && (
                <div className={styles.dateBlock}>
                  <span className={styles.dateBlockDay}>{eventDay}</span>
                  <span className={styles.dateBlockDetails}>
                    <b>{eventMonth}</b>
                    <i>{eventYear}</i>
                  </span>
                </div>
              )}

              {eventDateFull && <p className={styles.eventDateFull}>{eventDateFull}</p>}

              {ceremonies.length > 0 && (
                <div className={styles.eventDetails}>
                  {ceremonies.map((ceremony, idx) => {
                    const timeRange = formatCeremonyTimeRange(
                      ceremony.startDateTime,
                      ceremony.endDateTime,
                      content.timeZone,
                    );
                    return (
                      <React.Fragment key={idx}>
                        {idx > 0 && <span className={styles.eventRule} />}
                        <article className={styles.ceremonyArticle}>
                          <h3>{ceremony.title}</h3>
                          <p>{timeRange}</p>
                        </article>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {firstCeremony && (
                <div className={styles.venue}>
                  <svg viewBox="0 0 24 24" className={styles.venuePin} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  <h3>{firstCeremony.venue}</h3>
                  {firstCeremony.address && <p>{firstCeremony.address}</p>}
                  {firstCeremony.mapsUrl && (
                    <a
                      href={firstCeremony.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.mapsButton}
                    >
                      Buka Google Maps
                      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 5: Prayer (#prayer) - ONLY if prayer content exists */}
        {content.prayer && (
          <section className={`${styles.section} ${styles.prayerSection} ${styles.reveal}`} id="prayer">
            <p className={styles.eyebrow}>A PROMISE & A PRAYER</p>
            <h2 className={styles.sectionTitle}>
              Semoga setiap janji<br />tumbuh menjadi kebaikan.
            </h2>
            <blockquote className={styles.prayerBlockquote}>
              {content.prayer}
            </blockquote>
            <p className={styles.smallItalic}>Aamiin ya Rabbal ‘alamin.</p>
          </section>
        )}

        {/* Section 6: Gift (#gift) - ONLY if giftMessage or giftAccounts exist */}
        {hasGiftSection && (
          <section className={`${styles.section} ${styles.giftSection} ${styles.reveal}`} id="gift">
            <svg viewBox="0 0 24 24" className={styles.giftIcon} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 11v10h16V11M12 7v14" />
              <rect x="2" y="7" width="20" height="4" rx="1" />
              <path d="M12 7H8a3 3 0 1 1 3-3Zm0 0h4a3 3 0 1 0-3-3Z" />
            </svg>
            <p className={styles.eyebrow}>A TOKEN OF LOVE</p>
            <h2 className={styles.sectionTitle}>Tanda kasih</h2>

            {hasGiftMessage && <p className={styles.bodyCopy}>{content.giftMessage}</p>}

            {hasGiftAccounts &&
              content.giftAccounts!.map((acc, idx) => (
                <div key={idx} className={styles.bankCard}>
                  <div className={styles.bankCardTop}>
                    <p className={styles.eyebrow}>{acc.bankName}</p>
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M4 11v10h16V11M12 7v14" />
                      <rect x="2" y="7" width="20" height="4" rx="1" />
                      <path d="M12 7H8a3 3 0 1 1 3-3Zm0 0h4a3 3 0 1 0-3-3Z" />
                    </svg>
                  </div>
                  <p className={styles.bankCardLabel}>NOMOR REKENING</p>
                  <p className={styles.accountNumber}>{acc.accountNumber}</p>
                  <p className={styles.giftOwner}>
                    a.n. <strong>{acc.accountHolder}</strong>
                  </p>
                  <button
                    type="button"
                    className={styles.copyButton}
                    onClick={() => handleCopyAccount(acc.accountNumber)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Salin nomor rekening
                  </button>
                  {copiedAccount === acc.accountNumber && (
                    <p className={styles.copyFeedback} role="status">
                      Nomor rekening berhasil disalin.
                    </p>
                  )}
                </div>
              ))}
          </section>
        )}

        {/* Section 7: RSVP (#rsvp - PERSONALIZED only) */}
        {hasRsvpSection && data?.rsvp && (
          <section className={`${styles.section} ${styles.rsvpSection} ${styles.reveal}`} id="rsvp">
            <div className={styles.rsvpFrame}>
              <div className={styles.rsvpInner}>
                <p className={styles.eyebrow}>RESERVED ESPECIALLY FOR YOU</p>
                <h2 className={styles.sectionTitle}>Konfirmasi Kehadiran</h2>
                <p className={styles.bodyCopy}>
                  Sebuah kehormatan bagi kami apabila Anda berkenan hadir dan memberikan doa restu.
                </p>
                <div className={styles.rsvpFormWrapper}>
                  <RsvpForm
                    uniqueCode={uniqueCode || ''}
                    maxPax={guest?.maxPax || 1}
                    initialRsvp={data.rsvp}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section 8: Closing Footer */}
        <footer className={`${styles.section} ${styles.closing}`}>
          <p className={styles.eyebrow}>THE NEXT CHAPTER STARTS WITH YOU</p>
          <h2 className={styles.sectionTitle}>See you, with love.</h2>
          {content.closing && <p className={styles.bodyCopy}>{content.closing}</p>}
          <p className={styles.closingNames}>
            <span>{partnerOneShort}</span> <em>&</em> <span>{partnerTwoShort}</span>
          </p>
          <div className={styles.closingSeal} aria-hidden="true">
            <span>{partnerOneInitial}</span>
            <i>&</i>
            <span>{partnerTwoInitial}</span>
          </div>
          <p className={styles.madeWith}>
            an invitation by <span>irvite.id</span>
          </p>
        </footer>
      </main>

      {/* Bottom Navigation - ONLY sections actually rendered, NO dead links */}
      <nav className={styles.bottomNav} aria-label="Navigasi undangan">
        <a
          href="#home"
          className={activeSection === 'home' ? styles.active : ''}
          onClick={() => setActiveSection('home')}
          aria-label="Pembuka"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 6 9 7 9-7" />
          </svg>
          <span>Undangan</span>
        </a>
        <a
          href="#couple"
          className={activeSection === 'couple' ? styles.active : ''}
          onClick={() => setActiveSection('couple')}
          aria-label="Mempelai"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.2 5.8a5 5 0 0 0-7.1 0L12 6.9l-1.1-1.1a5 5 0 0 0-7.1 7.1L12 21l8.2-8.1a5 5 0 0 0 0-7.1Z" />
          </svg>
          <span>Mempelai</span>
        </a>
        <a
          href="#event"
          className={activeSection === 'event' ? styles.active : ''}
          onClick={() => setActiveSection('event')}
          aria-label="Acara"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="5" width="16" height="16" rx="2" />
            <path d="M8 3v4m8-4v4M4 10h16" />
          </svg>
          <span>Acara</span>
        </a>
        {hasGiftSection && (
          <a
            href="#gift"
            className={activeSection === 'gift' ? styles.active : ''}
            onClick={() => setActiveSection('gift')}
            aria-label="Hadiah"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 11v10h16V11M12 7v14" />
              <rect x="2" y="7" width="20" height="4" rx="1" />
              <path d="M12 7H8a3 3 0 1 1 3-3Zm0 0h4a3 3 0 1 0-3-3Z" />
            </svg>
            <span>Gift</span>
          </a>
        )}
        {hasRsvpSection && (
          <a
            href="#rsvp"
            className={activeSection === 'rsvp' ? styles.active : ''}
            onClick={() => setActiveSection('rsvp')}
            aria-label="RSVP"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 11 3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span>RSVP</span>
          </a>
        )}
      </nav>
    </div>
  );
};

export default VelvetLetter;
