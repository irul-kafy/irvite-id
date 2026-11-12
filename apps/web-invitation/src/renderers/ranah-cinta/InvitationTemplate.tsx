/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { InvitationTemplateProps, ImageAsset } from './types';
import { AddToCalendarButton } from '../../components/calendar';
import { QrisGiftCard } from '../../components/qris';
import s from './InvitationTemplate.module.css';

function safeUrl(src?: string) {
  if (!src) return undefined;
  try {
    const url = new URL(src);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function safeAsset(src?: string) {
  return src && (/^\/(?!\/)/.test(src) || /^\.\.?\//.test(src) || /^blob:https?:\/\//.test(src))
    ? src
    : safeUrl(src);
}

function Photo({
  image,
  eager = false,
  className = '',
  alt = '',
}: {
  image?: ImageAsset;
  eager?: boolean;
  className?: string;
  alt?: string;
}) {
  if (!image || !safeAsset(image.src)) return null;
  return (
    <img
      src={safeAsset(image.src)}
      alt={image.alt || alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      style={{
        objectPosition: image.position || 'center top',
        transform: image.zoom ? `scale(${Math.max(1, Math.min(4, image.zoom))})` : undefined,
        transformOrigin: image.position || 'center top',
      }}
    />
  );
}

function Mark({ children }: { children: ReactNode }) {
  return <span className={s.eyebrow}>{children}</span>;
}

function MinangAmbience() {
  return (
    <div className={s.ambience} aria-hidden="true">
      <div className={s.goldGlow} />
      <div className={s.mist} />
      {Array.from({ length: 24 }, (_, i) => (
        <i
          key={i}
          className={s.goldSpark}
          style={
            {
              left: `${(i * 37 + 11) % 100}%`,
              top: `${(i * 29 + 7) % 98}%`,
              '--i': i,
            } as CSSProperties
          }
        />
      ))}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={s.floatingMotif}
          style={{ '--i': i } as CSSProperties}
        >
          {/* Minang 8-point Songket star vector */}
          <svg viewBox="0 0 60 60" width="30" height="30">
            <path
              d="M30 0 L36 21 L57 15 L43 30 L57 45 L36 39 L30 60 L24 39 L3 45 L17 30 L3 15 L24 21 Z"
              fill="rgba(235, 195, 110, 0.35)"
              stroke="rgba(245, 215, 140, 0.6)"
              strokeWidth="1"
            />
          </svg>
        </span>
      ))}
      <span className={s.goldGleam} />
      <span className={`${s.goldGleam} ${s.goldGleamTwo}`} />
    </div>
  );
}

function MinangDivider() {
  return (
    <div className={s.divider} aria-hidden="true">
      <span className={s.dividerLine} />
      <span className={s.dividerStar}>✦</span>
      <span className={s.dividerLine} />
    </div>
  );
}

function Countdown({ datetime }: { datetime: string }) {
  const [diff, setDiff] = useState<number | null>(null);

  useEffect(() => {
    const target = Date.parse(datetime);
    if (!Number.isFinite(target)) return;

    const tick = () => {
      setDiff(Math.max(0, Math.floor((target - Date.now()) / 1000)));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [datetime]);

  if (diff === null) return null;

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  return (
    <div className={s.countdown} role="timer" aria-label="Hitung mundur menuju pernikahan">
      <div className={s.countdownItem}>
        <strong>{String(days).padStart(2, '0')}</strong>
        <span>HARI</span>
      </div>
      <b className={s.countdownColon}>:</b>
      <div className={s.countdownItem}>
        <strong>{String(hours).padStart(2, '0')}</strong>
        <span>JAM</span>
      </div>
      <b className={s.countdownColon}>:</b>
      <div className={s.countdownItem}>
        <strong>{String(minutes).padStart(2, '0')}</strong>
        <span>MENIT</span>
      </div>
      <b className={s.countdownColon}>:</b>
      <div className={s.countdownItem}>
        <strong>{String(seconds).padStart(2, '0')}</strong>
        <span>DETIK</span>
      </div>
    </div>
  );
}

export default function InvitationTemplate({
  data,
  guest = { kind: 'general' },
  rsvpSlot,
  qrSlot,
  wishesSlot,
  onRsvpClick,
  onSendWish,
}: InvitationTemplateProps) {
  void onRsvpClick;
  void onSendWish;
  const [opened, setOpened] = useState(false);
  const [coverGone, setCoverGone] = useState(false);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState('');
  const [lightbox, setLightbox] = useState<ImageAsset | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const isPersonal = guest.kind === 'personal';
  const bride = data.couple.bride;
  const groom = data.couple.groom;
  const dateObj = new Date(data.event.datetime);
  const isValidDate = !Number.isNaN(dateObj.getTime());

  const longDate = isValidDate
    ? new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: data.event.timeZone || 'Asia/Jakarta',
      }).format(dateObj)
    : data.event.dateLabel || '';

  const dayNumber = isValidDate ? String(dateObj.getDate()) : '22';
  const monthName = isValidDate
    ? new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        timeZone: data.event.timeZone || 'Asia/Jakarta',
      }).format(dateObj)
    : 'November';
  const yearNumber = isValidDate ? String(dateObj.getFullYear()) : '2026';

  // Prevent background scrolling while cover is present
  useEffect(() => {
    if (coverGone) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = before;
    };
  }, [coverGone]);

  // Handle cover departure timing
  useEffect(() => {
    if (!opened) return;
    const id = window.setTimeout(() => {
      setCoverGone(true);
      hero.current?.focus({ preventScroll: true });
    }, 1200);
    return () => clearTimeout(id);
  }, [opened]);

  // Scroll reveal with IntersectionObserver
  useEffect(() => {
    if (!opened || !root.current) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-visible', 'true');
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 }
    );
    root.current.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [opened, data]);

  // Performance optimization: pause ambience offscreen
  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) =>
          entry.target.setAttribute('data-awake', String(entry.isIntersecting))
        ),
      { rootMargin: '100px' }
    );
    root.current.querySelectorAll(`.${s.ambience}`).forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [opened, coverGone, data]);

  // Lightbox show modal
  useEffect(() => {
    if (lightbox) {
      dialogRef.current?.showModal();
    }
  }, [lightbox]);

  const handleOpen = () => {
    setOpened(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (data.musicUrl && audioRef.current) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  const toggleMusic = async () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setPlaying(true);
      } catch {
        setNotice('Musik belum dapat diputar. Periksa berkas audio.');
      }
    }
  };

  const handleCopy = async (accountNumber: string) => {
    const cleanDigits = accountNumber.replace(/[\s-]/g, '');
    try {
      await navigator.clipboard.writeText(cleanDigits);
      setCopiedAccount(cleanDigits);
      setNotice('Nomor rekening berhasil disalin!');
      setTimeout(() => {
        setCopiedAccount(null);
        setNotice('');
      }, 3500);
    } catch {
      setNotice(`Silakan salin nomor rekening secara manual: ${cleanDigits}`);
    }
  };

  const hasStory = Boolean(data.features.story && data.story && data.story.length > 0);

  return (
    <div ref={root} className={s.root} data-paused={paused}>
      {data.musicUrl && (
        <audio ref={audioRef} src={data.musicUrl} loop preload="auto" />
      )}

      {/* Cover with Minang Royal Gate & Departure Animation */}
      {!coverGone && (
        <section
          className={`${s.cover} ${opened ? s.depart : ''}`}
          aria-label="Sampul undangan pernikahan"
          inert={opened}
        >
          <Photo image={data.media.cover} className={s.coverWorld} eager />
          <MinangAmbience />

          <div className={s.coverTop}>
            <span>RANAH CINTA</span>
            <span>DARI RANAH MINANG, DENGAN CINTA</span>
          </div>

          <div className={s.portal} aria-hidden="true">
            <i />
            <i />
            <i />
            <span>✧</span>
          </div>

          <div className={s.coverContent}>
            <div className={s.gateway} aria-hidden="true">
              <div className={s.gateLight} />
              <div className={`${s.gateDoor} ${s.gateLeft}`} />
              <div className={`${s.gateDoor} ${s.gateRight}`} />
            </div>

            <Mark>UNDANGAN PERNIKAHAN ADAT MINANGKABAU</Mark>
            <h1>
              <span>{bride.shortName}</span>
              <em>&amp;</em>
              <span>{groom.shortName}</span>
            </h1>

            <p className={s.coverDate}>{longDate}</p>

            <div className={s.guestCard}>
              <p>Dengan hormat, kami mengundang</p>
              <strong>{isPersonal && guest.name ? guest.name : 'Bapak / Ibu / Saudara/i'}</strong>
            </div>

            <button
              type="button"
              className={s.enterBtn}
              onClick={handleOpen}
            >
              <span>Buka gerbang bahagia</span>
              <span aria-hidden="true">&rarr;</span>
            </button>

            <p className={s.coverNote}>Dua hati. Satu rumah. Sejuta doa.</p>
          </div>

          <span className={s.coverFoot}>irvite</span>
        </section>
      )}

      {/* Main Unified Invitation Content */}
      <main className={s.invitationScroll}>
        <div className={s.worldCanvas} aria-hidden="true" />
        <MinangAmbience />

        {/* Section 0: Grand Opening Hero */}
        <section ref={hero} tabIndex={-1} className={s.opening} id="home">
          <header className={s.masthead}>
            <span>
              RANAH CINTA <i>✧</i>
            </span>
            <span>
              DARI RANAH MINANG, DENGAN CINTA<br />
              {longDate}
            </span>
          </header>

          <div className={s.heroContentGrid}>
            <div className={s.heroCopy}>
              <div className={s.heroBadge} data-reveal="rise">
                <span className={s.badgeDot}>✦</span>
                <Mark>UNDANGAN PERNIKAHAN ADAT MINANGKABAU</Mark>
              </div>

              <h1 className={s.displayNames}>
                <span>{bride.shortName}</span>
                <em>&amp;</em>
                <span>{groom.shortName}</span>
              </h1>

              <p className={s.heroStatement}>
                {data.event.statement || 'Bertemu dalam cinta, berpulang pada kita.'}
              </p>

              <div className={s.heroMetaBar}>
                <div className={s.heroDateBadge}>
                  <span className={s.heroCalendarIcon}>🗓️</span>
                  <span>{longDate}</span>
                </div>
                {data.events[0]?.venue && (
                  <div className={s.heroVenueBadge}>
                    <span>📍</span>
                    <span>{data.events[0].venue}</span>
                  </div>
                )}
              </div>

              <div className={s.heroActions}>
                <a href="#couple" className={s.heroPrimaryBtn}>
                  <span>Temui kedua mempelai</span>
                  <span aria-hidden="true">&darr;</span>
                </a>
                <a href="#event" className={s.heroOutlineBtn}>
                  <span>Jadwal Acara</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>

            {/* Right Side: Royal Minang Couple Photo Showcase */}
            <div className={s.heroShowcase} data-reveal="right">
              <div className={s.showcaseArchGlow} aria-hidden="true" />
              <div
                className={s.showcaseArch}
                onClick={() =>
                  (data.media.hero || bride.portrait) &&
                  setLightbox(data.media.hero || bride.portrait)
                }
                style={{
                  cursor: data.media.hero || bride.portrait ? 'pointer' : 'default',
                }}
                aria-label="Lihat foto mempelai lebih besar"
              >
                {data.media.hero?.src || bride.portrait?.src ? (
                  <Photo
                    image={data.media.hero?.src ? data.media.hero : bride.portrait}
                    alt={`Foto Mempelai ${bride.shortName} & ${groom.shortName}`}
                    eager
                    className={s.showcasePhoto}
                  />
                ) : (
                  <div className={s.showcaseMedallion}>
                    <div className={s.showcaseRing} />
                    <span className={s.showcaseInitials}>
                      {bride.shortName?.charAt(0) || 'S'} <em>&amp;</em>{' '}
                      {groom.shortName?.charAt(0) || 'F'}
                    </span>
                  </div>
                )}
                <div className={s.showcaseVignette} />
                <div className={s.showcaseBadge}>
                  <span>DARI RANAH MINANG ✦ DENGAN CINTA</span>
                </div>
              </div>
            </div>
          </div>

          <div className={s.heroBottom}>
            <span>01 / SEBUAH AWAL YANG INDAH</span>
            <span>DUA HATI · SATU RUMAH · SEJUTA DOA</span>
          </div>
        </section>

        {/* Section 1: Blessing & Pantun */}
        {data.event.openingText && (
          <section className={`${s.section} ${s.blessing}`} id="blessing">
            <div className={s.blessingCopy} data-reveal="rise">
              <Mark>DENGAN NIAT YANG BAIK</Mark>
              <p className={s.arabic} lang="ar" dir="rtl">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
              <h2 className={s.sectionTitle}>
                Satu ikatan,<br />
                dua keluarga.
              </h2>
              <p className={s.bodyCopy}>{data.event.openingText}</p>
              {data.features.countdown && (
                <div style={{ marginTop: 32 }}>
                  <Countdown datetime={data.event.datetime} />
                </div>
              )}
            </div>
            <MinangDivider />
          </section>
        )}

        {/* Section 2: Couple */}
        <section className={`${s.section} ${s.couple}`} id="couple">
          <div className={s.sectionHeading} data-reveal="rise">
            <span className={s.chapter}>02 / YANG BERBAHAGIA</span>
            <Mark>MEMPELAI MINANG</Mark>
            <h2 className={s.sectionTitle}>
              Kami yang<br />
              memilih bersama.
            </h2>
          </div>

          <div className={s.couplePair}>
            {/* Bride */}
            <article className={`${s.coupleProfile} ${s.brideProfile}`} data-reveal="left">
              <div
                className={s.profileVisual}
                onClick={() => bride.portrait && setLightbox(bride.portrait)}
                style={{ cursor: bride.portrait ? 'pointer' : 'default' }}
              >
                {bride.portrait?.src ? (
                  <div className={s.portrait}>
                    <Photo image={bride.portrait} alt={bride.name} />
                    <span className={s.portraitZoomHint}>🔍</span>
                  </div>
                ) : (
                  <div className={s.initialMedallion}>
                    <span>{bride.shortName?.charAt(0) || 'S'}</span>
                  </div>
                )}
                <span className={s.portraitNumber}>01</span>
              </div>
              <div className={s.profileCopy}>
                <Mark>MEMPELAI WANITA</Mark>
                <h3>{bride.shortName}</h3>
                <h4>{bride.name}</h4>
                {bride.parents && <p>{bride.parents}</p>}
                {safeUrl(bride.social?.url) && (
                  <a
                    href={safeUrl(bride.social?.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.socialLink}
                  >
                    {bride.social?.label || 'Instagram'} ↗
                  </a>
                )}
              </div>
            </article>

            <span className={s.joiningGlyph} aria-hidden="true">&amp;</span>

            {/* Groom */}
            <article className={`${s.coupleProfile} ${s.groomProfile}`} data-reveal="right">
              <div
                className={s.profileVisual}
                onClick={() => groom.portrait && setLightbox(groom.portrait)}
                style={{ cursor: groom.portrait ? 'pointer' : 'default' }}
              >
                {groom.portrait?.src ? (
                  <div className={s.portrait}>
                    <Photo image={groom.portrait} alt={groom.name} />
                    <span className={s.portraitZoomHint}>🔍</span>
                  </div>
                ) : (
                  <div className={s.initialMedallion}>
                    <span>{groom.shortName?.charAt(0) || 'F'}</span>
                  </div>
                )}
                <span className={s.portraitNumber}>02</span>
              </div>
              <div className={s.profileCopy}>
                <Mark>MEMPELAI PRIA</Mark>
                <h3>{groom.shortName}</h3>
                <h4>{groom.name}</h4>
                {groom.parents && <p>{groom.parents}</p>}
                {safeUrl(groom.social?.url) && (
                  <a
                    href={safeUrl(groom.social?.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.socialLink}
                  >
                    {groom.social?.label || 'Instagram'} ↗
                  </a>
                )}
              </div>
            </article>
          </div>
          <MinangDivider />
        </section>

        {/* Section 3: Story (Bajanjang Naik, Batanggo Turun) */}
        {hasStory && (
          <section className={`${s.section} ${s.storySection}`} id="story">
            <div className={s.sectionHeading} data-reveal="rise">
              <span className={s.chapter}>03 / KISAH KAMI</span>
              <Mark>BAJANJANG NAIK, BATANGGO TURUN</Mark>
              <h2 className={s.sectionTitle}>
                Peta menuju<br />
                <em>selamanya.</em>
              </h2>
            </div>

            <div className={s.storyTimeline}>
              {data.story.map((item, idx) => (
                <article
                  key={idx}
                  className={s.storyCard}
                  data-reveal={idx % 2 === 0 ? 'left' : 'right'}
                >
                  <span className={s.storyDot}>✦</span>
                  <span className={s.storyYear}>{item.year}</span>
                  <div className={s.storyBody}>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    {item.image && (
                      <div
                        className={s.storyThumb}
                        onClick={() => item.image && setLightbox(item.image)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Photo image={item.image} alt={item.title} />
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <MinangDivider />
          </section>
        )}

        {/* Section 4: Event Day & Ceremonies */}
        <section className={`${s.section} ${s.daySection}`} id="event">
          <div className={s.sectionHeading} data-reveal="rise">
            <span className={s.chapter}>
              {hasStory ? '04 / HARI BAIK KAMI' : '03 / HARI BAIK KAMI'}
            </span>
            <Mark>AKAD &amp; BARALEK GADANG</Mark>
            <h2 className={s.sectionTitle}>Mari merayakan hari bahagia.</h2>
          </div>

          <div className={s.eventDateBanner} data-reveal="rise">
            <strong>{dayNumber}</strong>
            <div className={s.dateMonthYear}>
              <span>{monthName}</span>
              <b>{yearNumber}</b>
            </div>
            <p className={s.longDateBadge}>{longDate}</p>
          </div>

          {data.events.length > 0 && (
            <div className={s.eventDetails}>
              {data.events.map((evt, idx) => (
                <article
                  key={evt.id || idx}
                  className={s.eventCard}
                  data-reveal="rise"
                >
                  <span className={s.eventNumber}>
                    {idx === 0 ? '01 / PAGI PENUH JANJI' : '02 / HANGATNYA KEBERSAMAAN'}
                  </span>
                  <h3>{evt.title}</h3>
                  <p className={s.eventTime}>
                    {evt.startTime}
                    {evt.endTime ? ` – ${evt.endTime}` : ''}
                  </p>
                  <h4 className={s.eventVenueTitle}>{evt.venue}</h4>
                  <p className={s.eventVenueAddress}>{evt.address}</p>
                  <div className={s.eventActions}>
                    {evt.mapsUrl && (
                      <a
                        href={evt.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={s.primaryBtn}
                      >
                        Buka Google Maps &rarr;
                      </a>
                    )}
                    <AddToCalendarButton
                      event={{
                        title: `${evt.title} - ${data.couple.groom.shortName} & ${data.couple.bride.shortName}`,
                        startDateTime: `${evt.date}T${evt.startTime}`,
                        endDateTime: evt.endTime ? `${evt.date}T${evt.endTime}` : undefined,
                        venue: evt.venue,
                        address: evt.address,
                        description: `Baralek Gadang & Pernikahan ${data.couple.groom.name} & ${data.couple.bride.name}. Kehadiran Anda merupakan kehormatan istimewa bagi kami.`,
                        timeZone: data.event.timeZone,
                      }}
                      theme="ranah-cinta"
                    />
                  </div>
                </article>
              ))}
            </div>
          )}

          {data.events[0] && (
            <div className={s.venueHighlight} data-reveal="rise">
              <span className={s.venuePin} aria-hidden="true">📍</span>
              <div>
                <h3>{data.events[0].venue}</h3>
                <p>{data.events[0].address}</p>
                {data.events[0].mapsUrl && (
                  <a
                    href={data.events[0].mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.outlineBtn}
                  >
                    Petunjuk Lokasi Maps ↗
                  </a>
                )}
              </div>
            </div>
          )}
          <MinangDivider />
        </section>

        {/* Section 5: Prayer */}
        {data.event.prayer && (
          <section className={`${s.section} ${s.prayerSection}`} id="prayer">
            <div className={s.prayerContent} data-reveal="soft">
              <div className={s.prayerStar} aria-hidden="true">✧</div>
              <Mark>DOA YANG MENGIRINGI LANGKAH</Mark>
              <h2 className={s.sectionTitle}>
                Semoga cinta ini<br />
                menjadi rumah.
              </h2>
              <blockquote>“{data.event.prayer}”</blockquote>
              <p className={s.prayerAamiin}>Aamiin ya Rabbal &lsquo;alamin.</p>
              {data.event.prayerSource && (
                <p className={s.prayerSource}>{data.event.prayerSource}</p>
              )}
            </div>
            <MinangDivider />
          </section>
        )}

        {/* Section 6: Gift */}
        {data.features.gift && (data.gifts.accounts.length > 0 || data.gifts.message || data.gifts.qrisUrl) && (
          <section className={`${s.section} ${s.giftSection}`} id="gift">
            <div className={s.giftIntro} data-reveal="left">
              <span className={s.chapter}>
                {hasStory ? '05 / TANDA KASIH' : '04 / TANDA KASIH'}
              </span>
              <Mark>TANDA KASIH</Mark>
              <h2 className={s.sectionTitle}>
                Diterima dengan<br />
                sepenuh syukur.
              </h2>
              <p className={s.bodyCopy}>
                {data.gifts.message ||
                  'Kehadiran dan doa restu Anda adalah hadiah terindah bagi kami. Apabila Anda ingin berbagi tanda kasih, kami menerimanya dengan penuh rasa syukur.'}
              </p>
            </div>

            <div className={s.giftCardsList} data-reveal="right">
              {data.gifts.accounts.map((acc, idx) => (
                <div key={acc.id || idx} className={s.bankCard}>
                  <div className={s.bankCardTop}>
                    <span className={s.bankProvider}>{acc.provider}</span>
                    <span className={s.giftIcon} aria-hidden="true">🎁</span>
                  </div>
                  <span className={s.bankCardLabel}>NOMOR REKENING</span>
                  <p className={s.accountNumber}>{acc.number}</p>
                  <p className={s.giftOwner}>
                    a.n. <strong>{acc.owner}</strong>
                  </p>

                  <button
                    type="button"
                    className={s.copyBtn}
                    onClick={() => handleCopy(acc.number)}
                  >
                    {copiedAccount === acc.number.replace(/[\s-]/g, '')
                      ? '✓ Berhasil disalin!'
                      : 'Salin nomor rekening ↗'}
                  </button>
                </div>
              ))}
              <QrisGiftCard
                qrisUrl={data.gifts.qrisUrl}
                coupleName={`${data.couple.bride.shortName} & ${data.couple.groom.shortName}`}
                theme="ranah-cinta"
              />
            </div>
            <MinangDivider />
          </section>
        )}

        {/* Section 7: Wishes Slot (if provided) */}
        {wishesSlot && (
          <section className={`${s.section} ${s.wishesSection}`} id="wishes">
            <div className={s.sectionHeading} data-reveal="rise">
              <Mark>DOA DAN UCAPAN</Mark>
              <h2 className={s.sectionTitle}>Rangkaian Doa Restu</h2>
            </div>
            <div className={s.hostSlot} data-reveal="rise">
              {wishesSlot}
            </div>
            <MinangDivider />
          </section>
        )}

        {/* Section 8: Guest Pass, RSVP & QR Check-in (Above Last Slide) */}
        {(rsvpSlot || qrSlot) && (
          <section className={`${s.section} ${s.guestSection}`} id="guest-pass">
            <div className={s.sectionHeading} data-reveal="rise">
              <Mark>KONFIRMASI KEHADIRAN &amp; QR REGISTRASI</Mark>
              <h2 className={s.sectionTitle}>Kami menantikan kehadiran Anda.</h2>
            </div>

            <div className={s.guestTicket} data-reveal="unveil">
              <div className={s.ticketCopy}>
                <Mark>UNDANGAN KEHORMATAN</Mark>
                <h3>{isPersonal && guest.name ? guest.name : 'Bapak / Ibu / Saudara/i'}</h3>
                <p className={s.ticketDate}>{longDate}</p>
                <p className={s.ticketNote}>
                  Dengan sukacita kami mengundang Anda untuk merayakan hari istimewa kami. Silakan konfirmasi kehadiran melalui formulir RSVP dan tunjukkan kode QR saat registrasi di lokasi acara.
                  {guest.maxPax && guest.maxPax > 1
                    ? ` Berlaku untuk hingga ${guest.maxPax} tamu.`
                    : ''}
                </p>
              </div>

              <div className={s.rsvpQrGrid}>
                {rsvpSlot && <div className={s.rsvpCardSlot}>{rsvpSlot}</div>}
                {qrSlot && <div className={s.qrCardSlot}>{qrSlot}</div>}
              </div>
            </div>
            <MinangDivider />
          </section>
        )}

        {/* Section 9: Closing */}
        <footer className={`${s.section} ${s.closing}`} id="closing">
          <div className={s.closingContent} data-reveal="soft">
            <Mark>SAMPAI BERTEMU DI HARI BAHAGIA</Mark>
            <h2 className={s.sectionTitle}>
              Dari hati,<br />
              untuk selamanya.
            </h2>
            <p className={s.bodyCopy}>
              {data.event.closingMessage ||
                'Terima kasih telah menjadi bagian dari kisah kami. Kehadiran, doa, dan kasih yang Anda berikan akan selalu memiliki tempat istimewa di hati kami.'}
            </p>
            <h3 className={s.closingNames}>
              <span>{bride.shortName}</span> <em>&amp;</em> <span>{groom.shortName}</span>
            </h3>
            <a href="#home" className={s.backToTopLink}>
              Kembali ke awal &uarr;
            </a>
            <p className={s.madeWith}>
              sebuah karya undangan oleh <span>irvite</span>
            </p>
          </div>
        </footer>
      </main>

      {/* Floating Action Controls */}
      <div className={s.controls}>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={paused ? 'Aktifkan animasi' : 'Jeda animasi'}
          title={paused ? 'Aktifkan animasi' : 'Jeda animasi'}
        >
          {paused ? '▷' : 'Ⅱ'}
        </button>
        {data.musicUrl && (
          <button
            type="button"
            onClick={toggleMusic}
            aria-pressed={playing}
            aria-label={playing ? 'Matikan musik' : 'Putar musik'}
            title={playing ? 'Matikan musik' : 'Putar musik'}
          >
            {playing ? '♫' : '🔇'}
          </button>
        )}
      </div>

      {/* Toast Notification Banner */}
      {notice && (
        <div className={s.notice} role="status">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="Tutup pemberitahuan"
          >
            &times;
          </button>
        </div>
      )}

      {/* Lightbox Modal Dialog */}
      <dialog
        ref={dialogRef}
        className={s.lightbox}
        onClose={() => setLightbox(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
      >
        <button
          type="button"
          className={s.lightboxClose}
          onClick={() => dialogRef.current?.close()}
          aria-label="Tutup foto"
        >
          &times;
        </button>
        {lightbox && (
          <div className={s.lightboxBody}>
            <Photo image={lightbox} className={s.lightboxImg} />
            {lightbox.alt && <p className={s.lightboxCaption}>{lightbox.alt}</p>}
          </div>
        )}
      </dialog>

      {/* Bottom Sticky Navigation */}
      <nav className={s.bottomNav} aria-label="Navigasi undangan">
        <a href="#home">
          <span>🏛️</span>
          <span>Beranda</span>
        </a>
        <a href="#couple">
          <span>🤍</span>
          <span>Mempelai</span>
        </a>
        {hasStory && (
          <a href="#story">
            <span>📜</span>
            <span>Kisah</span>
          </a>
        )}
        <a href="#event">
          <span>📅</span>
          <span>Acara</span>
        </a>
        {data.features.gift && (
          <a href="#gift">
            <span>🎁</span>
            <span>Gift</span>
          </a>
        )}
        {(rsvpSlot || qrSlot) && (
          <a href="#guest-pass">
            <span>🎟️</span>
            <span>RSVP &amp; QR</span>
          </a>
        )}
      </nav>
    </div>
  );
}
