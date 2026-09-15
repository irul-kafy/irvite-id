/* eslint-disable @next/next/no-img-element */
"use client";

import React, {
  useEffect,
  useMemo,
  useState
} from "react";
import type { RendererProps } from "../registry";
import {
  adaptSereneGardenContent,
  adaptSereneGardenMedia,
} from "./serene-garden.adapter";
import {
  formatCeremonyDate,
  formatCeremonyDateShort,
  formatCeremonyTimeRange,
  parseTargetEpoch,
} from "./datetime-formatter";
import {
  resolveSereneEffectiveMode,
  shouldRenderSereneGuest,
  shouldRenderSereneRsvp,
} from "./serene-garden.gating";
import { RsvpForm } from "../../components/rsvp-form";
import styles from "./serene-garden.module.css";

function Icon({
  name,
}: {
  name:
    | "arrow"
    | "pin"
    | "heart"
    | "calendar"
    | "envelope"
    | "gift"
    | "copy"
    | "check"
    | "leaf";
}) {
  switch (name) {
    case "arrow":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case "pin":
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "heart":
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.2 5.8a5 5 0 0 0-7.1 0L12 6.9l-1.1-1.1a5 5 0 0 0-7.1 7.1L12 21l8.2-8.1a5 5 0 0 0 0-7.1Z" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="5" width="16" height="16" rx="2" />
          <path d="M8 3v4m8-4v4M4 10h16" />
        </svg>
      );
    case "envelope":
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 6 9 7 9-7" />
        </svg>
      );
    case "gift":
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 11v10h16V11M12 7v14" />
          <rect x="2" y="7" width="20" height="4" rx="1" />
          <path d="M12 7H8a3 3 0 1 1 3-3Zm0 0h4a3 3 0 1 0-3-3Z" />
        </svg>
      );
    case "copy":
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case "leaf":
      return (
        <svg viewBox="0 0 80 38" className={styles.sprig} fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 31C28 29 49 19 72 6M25 27C9 29 8 18 8 18s13-3 17 9ZM39 21C23 22 25 9 25 9s13 1 14 12ZM51 15C38 15 42 3 42 3s11 2 9 12ZM29 26c1 13 15 7 15 7s-3-9-15-7ZM49 16c1 12 15 6 15 6s-5-8-15-6Z" />
        </svg>
      );
  }
}

export default function SereneGardenRenderer({
  data,
  uniqueCode,
  mode,
}: RendererProps) {
  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [isCoverLeaving, setIsCoverLeaving] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [showGiftPanel, setShowGiftPanel] = useState(false);

  // Content & Media adapters
  const adaptedContent = useMemo(
    () => adaptSereneGardenContent(data?.event?.content),
    [data?.event?.content],
  );

  const adaptedMedia = useMemo(
    () => adaptSereneGardenMedia(data?.mediaBySlot, data?.media),
    [data?.mediaBySlot, data?.media],
  );

  // Mode gating
  const effectiveMode = resolveSereneEffectiveMode(mode);
  const guest = data?.guest;
  const canShowGuest = shouldRenderSereneGuest(effectiveMode, guest);
  const canShowRsvp = shouldRenderSereneRsvp(effectiveMode, guest, data?.rsvp);
  const guestName = canShowGuest ? guest?.name : undefined;

  const hasGiftSection = Boolean(
    (adaptedContent?.giftAccounts && adaptedContent.giftAccounts.length > 0) ||
      adaptedContent?.giftMessage,
  );
  const hasRsvpSection = Boolean(canShowRsvp && data?.rsvp);

  // Short and formal names
  const partnerOneShort = adaptedContent?.partnerOneName || "Mempelai Wanita";
  const partnerTwoShort = adaptedContent?.partnerTwoName || "Mempelai Pria";
  const partnerOneFormal = adaptedContent?.partnerOneFullName || partnerOneShort;
  const partnerTwoFormal = adaptedContent?.partnerTwoFullName || partnerTwoShort;

  // Monogram initials
  const initialOne = partnerOneShort.charAt(0).toUpperCase() || "A";
  const initialTwo = partnerTwoShort.charAt(0).toUpperCase() || "R";

  // Primary ceremony for countdown and cover date
  const ceremonies = adaptedContent?.ceremonies || [];
  const primaryCeremony = ceremonies.length > 0 ? ceremonies[0] : null;
  const timeZone = adaptedContent?.timeZone || "Asia/Jakarta";

  // Date strings
  const formattedDateShort = primaryCeremony
    ? formatCeremonyDateShort(primaryCeremony.startDateTime, timeZone)
    : "";
  const formattedDateLong = primaryCeremony
    ? formatCeremonyDate(primaryCeremony.startDateTime, timeZone)
    : "";

  // Countdown timer
  const [countdown, setCountdown] = useState({
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00",
    isFinished: false,
  });

  useEffect(() => {
    if (!primaryCeremony?.startDateTime) return;
    const targetEpoch = parseTargetEpoch(primaryCeremony.startDateTime, timeZone);
    if (!targetEpoch) return;

    const pad = (n: number) => Math.max(0, n).toString().padStart(2, "0");

    const updateCountdown = () => {
      const now = Date.now();
      const diff = targetEpoch - now;

      if (diff <= 0) {
        setCountdown({
          days: "00",
          hours: "00",
          minutes: "00",
          seconds: "00",
          isFinished: true,
        });
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setCountdown({
        days: pad(days),
        hours: pad(hours),
        minutes: pad(minutes),
        seconds: pad(seconds),
        isFinished: false,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [primaryCeremony?.startDateTime, timeZone]);

  // Handle envelope opening
  const handleOpenInvitation = () => {
    setIsCoverLeaving(true);
    setTimeout(() => {
      setIsCoverOpen(true);
    }, 700);
  };

  // Copy bank account number to clipboard
  const handleCopy = (accountNum: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(accountNum).catch(() => {});
    }
    setCopiedAccount(accountNum);
    setTimeout(() => {
      setCopiedAccount(null);
    }, 2500);
  };

  return (
    <div className={styles.container}>
      {/* 1. Full-Screen Envelope Cover */}
      {!isCoverOpen && (
        <div
          className={`${styles.cover} ${isCoverLeaving ? styles.coverLeaving : ""}`}
          id="cover"
        >
          <div className={styles.coverArt} aria-hidden="true" />
          <div className={styles.coverContent}>
            <p className={styles.eyebrow}>THE WEDDING OF</p>
            <h1 className={styles.coverTitle}>
              <span>{partnerOneShort}</span>
              <em>&</em>
              <span>{partnerTwoShort}</span>
            </h1>
            {formattedDateShort && (
              <p className={styles.coverDate}>{formattedDateShort}</p>
            )}
            <div className={styles.guestCard}>
              <p>Kepada Yth. Bapak/Ibu/Saudara/i</p>
              <strong>{guestName || "Tamu Undangan"}</strong>
              <small>
                Dengan bahagia, kami mengundang Anda
                <br />
                menjadi bagian dari hari istimewa kami.
              </small>
            </div>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              id="open-invitation"
              onClick={handleOpenInvitation}
            >
              <Icon name="envelope" />
              <span>Buka undangan</span>
              <Icon name="arrow" />
            </button>
          </div>
          <div className={styles.coverFooter}>
            SEBUAH UNDANGAN, SEPENUH HATI
            <span>irvite.id</span>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className={styles.invitationWrapper}>
        {/* 2. Desktop Scenic Aside */}
        <aside className={styles.desktopScene} aria-label="Pernikahan">
          <div className={styles.sceneHeading}>
            <p className={styles.eyebrow}>A CELEBRATION OF LOVE</p>
            <h2>
              <span>{partnerOneShort}</span> <em>&</em>{" "}
              <span>{partnerTwoShort}</span>
            </h2>
            {formattedDateLong && <p>{formattedDateLong}</p>}
          </div>
          <div className={styles.sceneFooter}>
            <span>Two souls. One beautiful beginning.</span>
            <span className={styles.brand}>irvite.id</span>
          </div>
        </aside>

        {/* 3. Invitation Scroll Area */}
        <main className={styles.invitationScroll}>
          {/* Section: Opening / Monogram */}
          <section
            className={`${styles.section} ${styles.opening}`}
            id="home"
            aria-label="Pembuka"
          >
            <p className={styles.eyebrow}>THE WEDDING CELEBRATION</p>
            <div className={styles.monogram}>
              <span>{initialOne}</span>
              <i>&</i>
              <span>{initialTwo}</span>
            </div>
            <p className={styles.eyebrow}>DENGAN CINTA, KAMI MENGUNDANG</p>
            <h2 className={styles.displayNames}>
              <span>{partnerOneShort}</span>
              <em>&</em>
              <span>{partnerTwoShort}</span>
            </h2>
            {formattedDateShort && (
              <div className={styles.dateDivider}>
                <span />
                <p>{formattedDateShort}</p>
                <span />
              </div>
            )}
            <a href="#couple" className={styles.scrollLink}>
              <span>Kisah kami dimulai di sini</span>
              <span>↓</span>
            </a>
          </section>

          {/* Section: Blessing & Intro */}
          <section
            className={`${styles.section} ${styles.blessing}`}
            id="blessing"
          >
            <Icon name="leaf" />
            <p className={styles.eyebrow}>DALAM NAMA-NYA, KAMI MELANGKAH</p>
            <p className={styles.arabic} lang="ar" dir="rtl">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
            <p className={styles.serifIntro}>
              Dua hati, satu niat baik.
              <br />
              Sebuah perjalanan untuk selamanya.
            </p>
            {adaptedContent?.openingText && (
              <p className={styles.bodyCopy}>{adaptedContent.openingText}</p>
            )}
          </section>

          {/* Section: Couple Profiles */}
          <section
            className={`${styles.section} ${styles.couple}`}
            id="couple"
          >
            <p className={styles.eyebrow}>THE HAPPY COUPLE</p>
            <h2 className={styles.sectionTitle}>Kami yang berbahagia</h2>

            {/* Bride Profile */}
            <div className={styles.coupleProfile}>
              {adaptedMedia.partnerOnePhoto?.src && (
                <div className={styles.portrait} id="bride-portrait">
                  <img
                    src={adaptedMedia.partnerOnePhoto.src}
                    alt={`Foto ${partnerOneFormal}`}
                    loading="lazy"
                  />
                </div>
              )}
              <span className={styles.smallItalic}>the bride</span>
              <h3>{partnerOneFormal}</h3>
              {adaptedContent?.partnerOneParents && (
                <p>{adaptedContent.partnerOneParents}</p>
              )}
            </div>

            <span className={styles.coupleAmp}>&</span>

            {/* Groom Profile */}
            <div className={styles.coupleProfile}>
              {adaptedMedia.partnerTwoPhoto?.src && (
                <div className={styles.portrait} id="groom-portrait">
                  <img
                    src={adaptedMedia.partnerTwoPhoto.src}
                    alt={`Foto ${partnerTwoFormal}`}
                    loading="lazy"
                  />
                </div>
              )}
              <span className={styles.smallItalic}>the groom</span>
              <h3>{partnerTwoFormal}</h3>
              {adaptedContent?.partnerTwoParents && (
                <p>{adaptedContent.partnerTwoParents}</p>
              )}
            </div>

            <Icon name="leaf" />
          </section>

          {/* Section: Save Our Date & Ceremonies */}
          <section
            className={`${styles.section} ${styles.daySection}`}
            id="event"
          >
            <p className={styles.eyebrow}>SAVE OUR DATE</p>
            <h2 className={styles.sectionTitle}>Hari yang kami nantikan</h2>
            {formattedDateLong && (
              <p className={styles.eventDate}>{formattedDateLong}</p>
            )}

            {/* Countdown */}
            {primaryCeremony?.startDateTime && (
              <div
                className={styles.countdown}
                aria-label="Hitung mundur menuju pernikahan"
                aria-live="off"
              >
                <div>
                  <strong>{countdown.days}</strong>
                  <span>HARI</span>
                </div>
                <b>:</b>
                <div>
                  <strong>{countdown.hours}</strong>
                  <span>JAM</span>
                </div>
                <b>:</b>
                <div>
                  <strong>{countdown.minutes}</strong>
                  <span>MENIT</span>
                </div>
                <b>:</b>
                <div>
                  <strong>{countdown.seconds}</strong>
                  <span>DETIK</span>
                </div>
              </div>
            )}
            {countdown.isFinished && (
              <p className={styles.countdownMessage}>
                Hari bahagia kami telah tiba.
              </p>
            )}

            {/* Ceremony Details */}
            {ceremonies.length > 0 && (
              <div className={styles.eventDetails}>
                {ceremonies.map((ceremony, idx) => (
                  <article key={idx} className={styles.ceremonyCard}>
                    <span className={styles.eventNumber}>
                      {(idx + 1).toString().padStart(2, "0")}
                    </span>
                    <h3>{ceremony.title}</h3>
                    <p className={styles.ceremonyTime}>
                      {formatCeremonyTimeRange(
                        ceremony.startDateTime,
                        ceremony.endDateTime,
                        timeZone,
                      )}
                    </p>
                    <p className={styles.ceremonyVenue}>{ceremony.venue}</p>
                    {ceremony.address && (
                      <p className={styles.ceremonyAddress}>
                        {ceremony.address}
                      </p>
                    )}
                    {ceremony.mapsUrl && (
                      <a
                        href={ceremony.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.textButton}
                      >
                        <Icon name="pin" />
                        <span>Petunjuk Lokasi (Google Maps)</span>
                      </a>
                    )}
                    {idx < ceremonies.length - 1 && (
                      <div className={styles.ceremonyDivider} />
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Section: Prayer (Quote) */}
          <section className={`${styles.section} ${styles.prayerSection}`}>
            <Icon name="leaf" />
            <p className={styles.eyebrow}>A LITTLE PRAYER, A LIFETIME OF LOVE</p>
            <h2 className={styles.sectionTitle}>
              Semoga cinta ini
              <br />
              selalu menemukan pulang.
            </h2>
            {adaptedContent?.prayerText && (
              <blockquote>{adaptedContent.prayerText}</blockquote>
            )}
            <p className={styles.smallItalic}>Aamiin ya Rabbal ‘alamin.</p>
          </section>

          {/* Section: Digital Gift */}
          {hasGiftSection && (
            <section
              className={`${styles.section} ${styles.giftSection}`}
              id="gift"
            >
              <Icon name="gift" />
              <p className={styles.eyebrow}>A TOKEN OF LOVE</p>
              <h2 className={styles.sectionTitle}>
                {adaptedContent?.giftTitle || "Tanda Kasih"}
              </h2>
              {adaptedContent?.giftMessage && (
                <p className={styles.bodyCopy}>{adaptedContent.giftMessage}</p>
              )}

              {adaptedContent?.giftAccounts &&
                adaptedContent.giftAccounts.length > 0 && (
                  <>
                    <button
                      type="button"
                      className={`${styles.button} ${styles.outline}`}
                      id="show-gift"
                      aria-expanded={showGiftPanel}
                      onClick={() => setShowGiftPanel((prev) => !prev)}
                    >
                      <span>Lihat rekening hadiah</span>
                      <Icon name="gift" />
                    </button>

                    <div
                      className={styles.giftPanel}
                      id="gift-panel"
                      hidden={!showGiftPanel}
                    >
                      {adaptedContent.giftAccounts.map((acc, idx) => {
                        const isCopied = copiedAccount === acc.accountNumber;
                        return (
                          <div key={idx} className={styles.bankCard}>
                            <div className={styles.bankName}>
                              {acc.bankName}
                            </div>
                            <div className={styles.accountNumber}>
                              {acc.accountNumber}
                            </div>
                            <div className={styles.accountHolder}>
                              a.n. {acc.accountHolderName}
                            </div>
                            <button
                              type="button"
                              className={styles.copyButton}
                              onClick={() => handleCopy(acc.accountNumber)}
                            >
                              <Icon name={isCopied ? "check" : "copy"} />
                              <span>
                                {isCopied ? "Tersalin!" : "Salin No. Rekening"}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
            </section>
          )}

          {/* Section: RSVP (PERSONALIZED only) */}
          {hasRsvpSection && data?.rsvp && (
            <section
              className={`${styles.section} ${styles.rsvpSection}`}
              id="rsvp"
            >
              <Icon name="envelope" />
              <p className={styles.eyebrow}>KEHADIRAN ANDA BERARTI</p>
              <h2 className={styles.sectionTitle}>Konfirmasi Kehadiran</h2>
              <div className={styles.rsvpWrapper}>
                <RsvpForm
                  uniqueCode={uniqueCode || ''}
                  maxPax={guest?.maxPax || 1}
                  initialRsvp={data.rsvp}
                />
              </div>
            </section>
          )}

          {/* Section: Closing */}
          <footer className={`${styles.section} ${styles.closing}`}>
            <p className={styles.eyebrow}>WITH LOVE & GRATITUDE</p>
            <h2 className={styles.sectionTitle}>
              Sampai bertemu
              <br />
              di hari bahagia kami.
            </h2>
            {adaptedContent?.closingText && (
              <p className={styles.bodyCopy}>{adaptedContent.closingText}</p>
            )}
            <p className={styles.closingNames}>
              <span>{partnerOneShort}</span> <em>&</em>{" "}
              <span>{partnerTwoShort}</span>
            </p>
            <Icon name="leaf" />
            <p className={styles.madeWith}>
              crafted with love by <span>irvite.id</span>
            </p>
          </footer>
        </main>

        {/* 4. Bottom Floating Navigation */}
        <nav className={styles.bottomNav} aria-label="Navigasi undangan">
          <a href="#home">
            <Icon name="envelope" />
            <span>Undangan</span>
          </a>
          <a href="#couple">
            <Icon name="heart" />
            <span>Mempelai</span>
          </a>
          <a href="#event">
            <Icon name="calendar" />
            <span>Acara</span>
          </a>
          {hasGiftSection && (
            <a href="#gift">
              <Icon name="gift" />
              <span>Gift</span>
            </a>
          )}
          {hasRsvpSection && (
            <a href="#rsvp">
              <Icon name="envelope" />
              <span>RSVP</span>
            </a>
          )}
        </nav>
      </div>
    </div>
  );
}
