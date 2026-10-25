'use client';

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import type { InvitationTemplateProps, ImageAsset, GiftAccount } from './types';
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
  alt = '',
  className = '',
}: {
  image?: ImageAsset;
  alt?: string;
  className?: string;
}) {
  if (!image || !safeAsset(image.src)) return null;
  return (
    <img
      src={safeAsset(image.src)}
      alt={image.alt || alt}
      loading="lazy"
      className={className}
      style={{
        objectPosition: image.position || 'center top',
      }}
    />
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
      <div>
        <strong>{String(days).padStart(2, '0')}</strong>
        <span>HARI</span>
      </div>
      <b>:</b>
      <div>
        <strong>{String(hours).padStart(2, '0')}</strong>
        <span>JAM</span>
      </div>
      <b>:</b>
      <div>
        <strong>{String(minutes).padStart(2, '0')}</strong>
        <span>MENIT</span>
      </div>
      <b>:</b>
      <div>
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
}: InvitationTemplateProps) {
  const [opened, setOpened] = useState(false);
  const [coverGone, setCoverGone] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

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

  const handleOpen = () => {
    setOpened(true);
    if (data.musicUrl && audioRef.current) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
    setTimeout(() => {
      setCoverGone(true);
    }, 1200);
  };

  const handleCopy = async (accountNumber: string) => {
    const cleanDigits = accountNumber.replace(/[\s-]/g, '');
    try {
      await navigator.clipboard.writeText(cleanDigits);
      setCopiedAccount(cleanDigits);
      setTimeout(() => setCopiedAccount(null), 3000);
    } catch {
      // fallback
    }
  };

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  return (
    <div className={s.root}>
      {data.musicUrl && (
        <audio ref={audioRef} src={data.musicUrl} loop preload="auto" />
      )}

      {/* Cover with Minang gate animation */}
      {!coverGone && (
        <div className={`${s.cover} ${opened ? s.coverLeaving : ''}`}>
          <div className={s.coverArt} aria-hidden="true" />
          <div className={s.coverContent}>
            <p className={s.eyebrow}>DARI RANAH MINANG, DENGAN CINTA</p>
            <h1>
              <span>{bride.shortName}</span>
              <em>&amp;</em>
              <span>{groom.shortName}</span>
            </h1>

            <div className={s.gateway} aria-hidden="true">
              <div className={s.gateLight} />
              <div className={`${s.gateDoor} ${s.gateLeft}`} />
              <div className={`${s.gateDoor} ${s.gateRight}`} />
            </div>

            <p className={s.coverDate}>{longDate}</p>

            <div className={s.guestCard}>
              <p>Dengan hormat, kami mengundang</p>
              <strong>{isPersonal && guest.name ? guest.name : 'Tamu Undangan'}</strong>
            </div>

            <button
              type="button"
              className={s.primaryBtn}
              onClick={handleOpen}
              style={{ marginTop: 24 }}
            >
              Buka gerbang bahagia &rarr;
            </button>

            <p className={s.coverNote}>Dua hati. Satu rumah. Sejuta doa.</p>
          </div>
        </div>
      )}

      {/* Main Invitation Scroll */}
      <main className={s.invitationScroll}>
        {/* Section 0: Opening Hero */}
        <section className={s.opening} id="home">
          <div className={s.heroCopy}>
            <p className={s.eyebrow}>UNDANGAN PERNIKAHAN</p>
            <p className={s.heroIntro}>
              Bertemu dalam cinta,<br />
              berpulang pada kita.
            </p>
            <h2 className={s.displayNames}>
              <span>{bride.shortName}</span>
              <em>&amp;</em>
              <span>{groom.shortName}</span>
            </h2>
            <p className={s.heroDate}>{longDate}</p>
            <a href="#couple" className={s.scrollInvitation}>
              Temui kedua mempelai &darr;
            </a>
          </div>

          <div className={s.landscapeLabel}>
            <span>RANAH CINTA</span>
            <i />
            <span>SEBUAH AWAL YANG INDAH</span>
          </div>
        </section>

        {/* Section 1: Blessing */}
        {data.event.openingText && (
          <section className={`${s.section} ${s.blessing}`} id="blessing">
            <div className={s.blessingCopy}>
              <p className={s.eyebrow}>DENGAN NIAT YANG BAIK</p>
              <p className={s.arabic} lang="ar" dir="rtl">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
              <h2 className={s.sectionTitle}>
                Satu ikatan,<br />
                dua keluarga.
              </h2>
              <p className={s.bodyCopy}>{data.event.openingText}</p>
            </div>
          </section>
        )}

        {/* Section 2: Couple */}
        <section className={`${s.section} ${s.couple}`} id="couple">
          <div className={s.sectionHeading}>
            <span className={s.chapter}>01</span>
            <p className={s.eyebrow}>YANG BERBAHAGIA</p>
            <h2 className={s.sectionTitle}>
              Kami yang<br />
              memilih bersama.
            </h2>
          </div>

          <div className={s.couplePair}>
            {/* Bride */}
            <article className={`${s.coupleProfile} ${s.brideProfile}`}>
              <div className={s.profileVisual}>
                {bride.portrait?.src ? (
                  <div className={s.portrait}>
                    <Photo image={bride.portrait} alt={bride.name} />
                  </div>
                ) : (
                  <div className={s.initialMedallion}>
                    <span>{bride.shortName?.charAt(0) || 'S'}</span>
                  </div>
                )}
              </div>
              <div className={s.profileCopy}>
                <p className={s.profileLabel}>MEMPELAI WANITA</p>
                <h3>{bride.shortName}</h3>
                <h4>{bride.name}</h4>
                {bride.parents && <p>{bride.parents}</p>}
              </div>
            </article>

            {/* Groom */}
            <article className={`${s.coupleProfile} ${s.groomProfile}`}>
              <div className={s.profileVisual}>
                {groom.portrait?.src ? (
                  <div className={s.portrait}>
                    <Photo image={groom.portrait} alt={groom.name} />
                  </div>
                ) : (
                  <div className={s.initialMedallion}>
                    <span>{groom.shortName?.charAt(0) || 'F'}</span>
                  </div>
                )}
              </div>
              <div className={s.profileCopy}>
                <p className={s.profileLabel}>MEMPELAI PRIA</p>
                <h3>{groom.shortName}</h3>
                <h4>{groom.name}</h4>
                {groom.parents && <p>{groom.parents}</p>}
              </div>
            </article>
          </div>
        </section>

        {/* Section 3: Event Day */}
        <section className={`${s.section} ${s.daySection}`} id="event">
          <div className={s.sectionHeading}>
            <span className={s.chapter}>02</span>
            <p className={s.eyebrow}>HARI BAIK KAMI</p>
            <h2 className={s.sectionTitle}>Mari merayakan.</h2>
          </div>

          <div className={s.eventDateBanner}>
            <strong>{dayNumber}</strong>
            <div>
              <span>{monthName}</span>
              <b>{yearNumber}</b>
            </div>
            <p>{longDate}</p>
          </div>

          {data.events.length > 0 && (
            <div className={s.eventDetails}>
              {data.events.map((evt, idx) => (
                <article key={evt.id || idx} className={s.eventCard}>
                  <span className={s.eventNumber}>
                    {idx === 0 ? 'PAGI PENUH JANJI' : 'HANGATNYA KEBERSAMAAN'}
                  </span>
                  <h3>{evt.title}</h3>
                  <p>
                    {evt.startTime}
                    {evt.endTime ? ` – ${evt.endTime}` : ''}
                  </p>
                  <p style={{ marginTop: 12, opacity: 0.85 }}>{evt.venue}</p>
                </article>
              ))}
            </div>
          )}

          {data.events[0] && (
            <div className={s.venue}>
              <span style={{ fontSize: 20 }}>📍</span>
              <div>
                <h3>{data.events[0].venue}</h3>
                <p>{data.events[0].address}</p>
                {data.events[0].mapsUrl && (
                  <a
                    href={data.events[0].mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.primaryBtn}
                  >
                    Buka Google Maps &rarr;
                  </a>
                )}
              </div>
            </div>
          )}

          {data.features.countdown && (
            <Countdown datetime={data.event.datetime} />
          )}
        </section>

        {/* Section 4: Guest Pass & RSVP (Personalized) */}
        {isPersonal && (
          <section className={`${s.section} ${s.guestSection}`} id="guest-pass">
            <p className={s.eyebrow}>KAMI MENANTIKAN ANDA</p>
            <h2 className={s.sectionTitle}>Tamu istimewa.</h2>

            <div className={s.guestTicket}>
              <div className={s.ticketCopy}>
                <p className={s.eyebrow}>UNDANGAN PERSONAL</p>
                <h3>{guest.name}</h3>
                <p>{longDate}</p>
                <p className={s.ticketNote}>
                  Dengan sukacita kami mengundang Anda untuk merayakan hari istimewa kami.
                  {guest.maxPax && guest.maxPax > 1 ? ` Berlaku untuk hingga ${guest.maxPax} tamu.` : ''}
                </p>
              </div>

              {rsvpSlot && <div className={s.hostSlot}>{rsvpSlot}</div>}
            </div>
          </section>
        )}

        {/* Section 5: Prayer */}
        {data.event.prayer && (
          <section className={`${s.section} ${s.prayerSection}`}>
            <div className={s.prayerContent}>
              <p className={s.eyebrow}>DOA YANG MENGIRINGI LANGKAH</p>
              <h2 className={s.sectionTitle}>
                Semoga cinta ini<br />
                menjadi rumah.
              </h2>
              <blockquote>{data.event.prayer}</blockquote>
              <p className={s.smallItalic}>Aamiin ya Rabbal &lsquo;alamin.</p>
            </div>
          </section>
        )}

        {/* Section 6: Gift */}
        {data.features.gift && (data.gifts.accounts.length > 0 || data.gifts.message) && (
          <section className={`${s.section} ${s.giftSection}`} id="gift">
            <div className={s.giftIntro}>
              <span className={s.chapter}>03</span>
              <p className={s.eyebrow}>TANDA KASIH</p>
              <h2 className={s.sectionTitle}>
                Diterima dengan<br />
                sepenuh syukur.
              </h2>
              <p className={s.bodyCopy}>
                {data.gifts.message ||
                  'Kehadiran dan doa restu Anda adalah hadiah terindah bagi kami. Apabila Anda ingin berbagi tanda kasih, kami menerimanya dengan penuh rasa syukur.'}
              </p>
            </div>

            <div>
              {data.gifts.accounts.map((acc, idx) => (
                <div key={acc.id || idx} className={s.bankCard}>
                  <div className={s.bankCardTop}>
                    <p className={s.eyebrow}>{acc.provider}</p>
                    <span>🎁</span>
                  </div>
                  <p className={s.bankCardLabel}>NOMOR REKENING</p>
                  <p className={s.accountNumber}>{acc.number}</p>
                  <p className={s.giftOwner}>a.n. <strong>{acc.owner}</strong></p>

                  <button
                    type="button"
                    className={s.primaryBtn}
                    onClick={() => handleCopy(acc.number)}
                    style={{ width: '100%', marginTop: 16 }}
                  >
                    {copiedAccount === acc.number.replace(/[\s-]/g, '')
                      ? '✓ Berhasil disalin!'
                      : 'Salin nomor rekening'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 7: Closing */}
        <footer className={`${s.section} ${s.closing}`}>
          <p className={s.eyebrow}>SAMPAI BERTEMU DI HARI BAHAGIA</p>
          <h2 className={s.sectionTitle}>
            Dari hati,<br />
            untuk selamanya.
          </h2>
          <p className={s.bodyCopy}>
            {data.event.closingMessage ||
              'Terima kasih telah menjadi bagian dari kisah kami. Kehadiran, doa, dan kasih yang Anda berikan akan selalu memiliki tempat istimewa di hati kami.'}
          </p>
          <p className={s.closingNames}>
            <span>{bride.shortName}</span> <em>&amp;</em> <span>{groom.shortName}</span>
          </p>
          <p className={s.madeWith}>
            sebuah undangan oleh <span>irvite.id</span>
          </p>
        </footer>
      </main>

      {/* Floating Audio Controller */}
      {data.musicUrl && (
        <button
          type="button"
          onClick={toggleMusic}
          aria-label={playing ? 'Matikan musik' : 'Putar musik'}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 20,
            zIndex: 45,
            width: 42,
            height: 42,
            borderRadius: '50%',
            border: '1px solid #bda479',
            background: '#163a31',
            color: '#f5ecd6',
            cursor: 'pointer',
            fontSize: 18,
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          }}
        >
          {playing ? '🎵' : '🔇'}
        </button>
      )}

      {/* Bottom Sticky Navigation */}
      <nav className={s.bottomNav} aria-label="Navigasi undangan">
        <a href="#home">
          <span>🌿</span>
          <span>Beranda</span>
        </a>
        <a href="#couple">
          <span>🤍</span>
          <span>Mempelai</span>
        </a>
        <a href="#event">
          <span>📅</span>
          <span>Acara</span>
        </a>
        {isPersonal && (
          <a href="#guest-pass">
            <span>🎟️</span>
            <span>Undangan</span>
          </a>
        )}
        {data.features.gift && (
          <a href="#gift">
            <span>🎁</span>
            <span>Gift</span>
          </a>
        )}
      </nav>
    </div>
  );
}
