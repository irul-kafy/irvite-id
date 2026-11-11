'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { RendererProps } from '../registry';
import { RsvpForm } from '../../components/rsvp-form';
import QRDisplay from '../../components/QRDisplay';
import { getCanonicalInvitationUrl } from '../../utils/url';
import {
  shouldRenderRsvpAndQr,
  shouldRenderSereneGuest,
  extractPublicRecipientFromSearchParams,
} from '../mode-gating';
import {
  adaptRoyalVelvetContent,
  adaptRoyalVelvetMedia,
} from './royal-velvet.adapter';
import {
  BaroqueCrestSvg,
  BaroqueCornerSvg,
  BaroqueDividerSvg,
  BaroquePetalSvg,
} from './ornaments';
import styles from './royal-velvet.module.css';

interface WishItem {
  name: string;
  message: string;
  createdAt: string;
}

const DEFAULT_WISHES: WishItem[] = [
  {
    name: 'Keluarga Besar Prof. Dr. Arman Wijaya',
    createdAt: 'Baru saja',
    message:
      'Selamat menempuh hidup baru untuk Neng Citra dan Kang Galih. Semoga menjadi keluarga sakinah, mawaddah, warahmah penuh keberkahan.',
  },
  {
    name: 'dr. Clarissa Putri, Sp.A & Suami',
    createdAt: '20 menit lalu',
    message:
      'Happy Wedding Citra & Galih! Semoga senantiasa dilimpahi kebahagiaan dan keberkahan sepanjang usia.',
  },
  {
    name: 'Raden Bagus Pradipta, S.T.',
    createdAt: '1 jam lalu',
    message:
      'Selamat berbahagia sahabatku! InsyaAllah mahligai rumah tangga kalian berdua senantiasa dirahmati Allah SWT.',
  },
  {
    name: 'Nadya Maharani, M.Ds.',
    createdAt: '3 jam lalu',
    message:
      'Turut bersuka cita atas pernikahan Citra & Galih. Doa terbaik selalu menyertai perjalanan cinta kalian berdua!',
  },
];

export function RoyalVelvetRenderer({
  data,
  uniqueCode,
  isPreview = false,
  mode = 'PUBLIC',
  canonicalUrl,
}: RendererProps) {
  const content = useMemo(
    () =>
      adaptRoyalVelvetContent(
        data.event?.content,
        data.event?.title,
        data.event?.eventDate,
        data.event?.locationDetails,
      ),
    [
      data.event?.content,
      data.event?.title,
      data.event?.eventDate,
      data.event?.locationDetails,
    ],
  );

  const media = useMemo(
    () => adaptRoyalVelvetMedia(data.mediaBySlot, data.media, isPreview),
    [data.mediaBySlot, data.media, isPreview],
  );

  const guestVisible = shouldRenderSereneGuest(mode, data?.guest);
  const showRsvpAndQr = shouldRenderRsvpAndQr(mode, uniqueCode, isPreview);

  // Guest Name Resolution
  const [guestName, setGuestName] = useState<string>(() => {
    if (guestVisible && data.guest?.name) return data.guest.name;
    if (data.guest?.name) return data.guest.name;
    return 'Bapak / Ibu / Saudara/i';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const urlGuest = extractPublicRecipientFromSearchParams(sp);
      if (urlGuest) {
        setGuestName(urlGuest);
      } else if (guestVisible && data.guest?.name) {
        setGuestName(data.guest.name);
      } else if (data.guest?.name) {
        setGuestName(data.guest.name);
      } else {
        setGuestName('Bapak / Ibu / Saudara/i');
      }
    }
  }, [data.guest?.name, guestVisible]);

  // Audio & Curtain Opening State
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 2600);
  }, []);

  const handleOpenInvitation = useCallback(() => {
    setIsOpen(true);
    if (audioRef.current) {
      audioRef.current.volume = 0.75;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Autoplay blocked by browser policy
        });
    }
  }, []);

  const toggleMusic = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          showToast('Musik orkestra diputar');
        })
        .catch(() => {});
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
      showToast('Musik orkestra dijeda');
    }
  }, [showToast]);

  // Countdown Timer
  const primaryCeremonyDate = content.ceremonies[0]?.startDateTime || '2027-02-14T08:00:00+07:00';
  const [timeLeft, setTimeLeft] = useState({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
  });

  useEffect(() => {
    const target = new Date(primaryCeremonyDate).getTime();
    if (isNaN(target)) return;

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    const update = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ days: '00', hours: '00', minutes: '00', seconds: '00' });
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        days: pad(d),
        hours: pad(h),
        minutes: pad(m),
        seconds: pad(s),
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [primaryCeremonyDate]);

  // Lightbox Modal
  const [lightboxData, setLightboxData] = useState<{
    src: string;
    caption: string;
  } | null>(null);

  // Royal Wishes Form & Feed
  const initialWishItems: WishItem[] =
    data.wishes?.items && data.wishes.items.length > 0
      ? data.wishes.items.map((w) => ({
          name: w.name,
          message: w.message,
          createdAt:
            w.dateLabel ||
            (w.createdAt
              ? new Date(w.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Baru saja'),
        }))
      : DEFAULT_WISHES;

  const [wishes, setWishes] = useState<WishItem[]>(initialWishItems);
  const [formName, setFormName] = useState(data.guest?.name || '');
  const [formMsg, setFormMsg] = useState('');
  const [isSubmittingWish, setIsSubmittingWish] = useState(false);
  const [copyStatus, setCopyStatus] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (data.wishes?.items && data.wishes.items.length > 0) {
      setWishes(
        data.wishes.items.map((w) => ({
          name: w.name,
          message: w.message,
          createdAt:
            w.dateLabel ||
            (w.createdAt
              ? new Date(w.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Baru saja'),
        })),
      );
    }
  }, [data.wishes?.items]);

  const handleCopyAccount = useCallback(
    (accountNumber: string, idx: number, bankName: string) => {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(accountNumber);
      }
      setCopyStatus((prev) => ({ ...prev, [idx]: true }));
      showToast(`Nomor rekening ${bankName} berhasil disalin!`);
      setTimeout(() => {
        setCopyStatus((prev) => ({ ...prev, [idx]: false }));
      }, 2200);
    },
    [showToast],
  );

  const handleWishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formMsg.trim() || isSubmittingWish) return;

    setIsSubmittingWish(true);
    const cleanName = formName.trim();
    const cleanMsg = formMsg.trim();

    try {
      if (uniqueCode) {
        await fetch(
          `/api-proxy/invitations/public/${encodeURIComponent(uniqueCode)}/wishes`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: cleanName, message: cleanMsg }),
          },
        );
      } else if (data.event?.slug) {
        await fetch(
          `/api-proxy/events/public/${encodeURIComponent(data.event.slug)}/wishes`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: cleanName, message: cleanMsg }),
          },
        );
      }

      const newWish: WishItem = {
        name: cleanName,
        message: cleanMsg,
        createdAt: 'Baru saja',
      };

      setWishes((prev) => [newWish, ...prev]);
      setFormMsg('');
      showToast('Terima kasih! Untaian doa restu Anda telah terkirim.');
    } catch {
      showToast('Terjadi kesalahan saat mengirim doa restu.');
    } finally {
      setIsSubmittingWish(false);
    }
  };

  // Active Bottom Nav Tracker
  const [activeNav, setActiveNav] = useState('sec-cover');

  const scrollToSection = (id: string) => {
    setActiveNav(id);
    if (id === 'sec-cover') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const formatTanggalIndo = (isoStr: string) => {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatJamIndo = (isoStr: string) => {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const hh = d.getHours() < 10 ? `0${d.getHours()}` : d.getHours();
    const mm = d.getMinutes() < 10 ? `0${d.getMinutes()}` : d.getMinutes();
    return `Pukul ${hh}.${mm} WIB – Selesai`;
  };

  return (
    <div
      className={`${styles.invitationRoot} ${!isOpen ? styles.isLocked : styles.isUnlocked}`}
    >
      {/* Background Audio */}
      {media.bgMusicUrl && (
        <audio
          ref={audioRef}
          src={media.bgMusicUrl}
          loop
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}

      {/* Floating Particles (12 items, GPU animated, pointer-events: none) */}
      <div className={styles.particleStage} aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={styles.floatingParticle}
            style={
              {
                '--x-start': `${(i / 12) * 92 + 4}vw`,
                '--x-end': `${((i % 2 === 0 ? 1 : -1) * (10 + i * 1.5)) + (i / 12) * 92}vw`,
                '--p-scale': (0.65 + (i % 4) * 0.15).toFixed(2),
                animationDuration: `${(12 + (i % 5) * 2.4).toFixed(1)}s`,
                animationDelay: `${(i * 0.85).toFixed(1)}s`,
              } as React.CSSProperties
            }
          >
            <BaroquePetalSvg variant={i % 2 === 0 ? 1 : 2} />
          </div>
        ))}
      </div>

      {/* Floating Music Controller */}
      <div
        className={`${styles.musicFloatingWrap} ${isOpen ? styles.isActive : ''}`}
      >
        <button
          type="button"
          aria-label="Putar atau jeda musik"
          title="Putar / Jeda Musik"
          className={styles.musicFabBtn}
          onClick={toggleMusic}
        >
          <div
            className={`${styles.gramophoneDisc} ${!isPlaying ? styles.isPaused : ''}`}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <path d="M12 2A10 10 0 0 1 22 12" />
            </svg>
          </div>
        </button>
      </div>

      {/* Toast Notification */}
      <div
        className={`${styles.royalToast} ${toastMsg ? styles.isShown : ''}`}
        role="alert"
      >
        {toastMsg}
      </div>

      {/* =========================================================================
           OPENING CURTAIN GATE OVERLAY (KONTROL PENUH FULLSCREEN)
           ========================================================================= */}
      <div
        className={`${styles.coverGateOverlay} ${
          isOpen ? styles.coverGateUnlocked : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Pintu Masuk Undangan Royal Velvet"
      >
        {/* Background Foto Cover */}
        <div className={styles.heroBgMedia}>
          <img
            src={media.heroPhotoUrl}
            alt={`${content.partnerOneName} & ${content.partnerTwoName}`}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                '/templates/royal-velvet/photo-hero.webp';
            }}
          />
          <div className={styles.heroBgVignette} />
        </div>

        {/* Tirai Teater Beludru Kiri & Kanan */}
        <div className={`${styles.curtainWing} ${styles.curtainLeft}`} />
        <div className={`${styles.curtainWing} ${styles.curtainRight}`} />

        {/* Ornamen Bingkai Emas */}
        <div className={styles.heroOrnateBorder} />

        {/* Center Seal Card: Monogram, Cameo Portrait, Nama Pasangan, & Tombol Buka Undangan */}
        <div className={styles.coverCenterSeal}>
          {/* Top Chandeliers & Monogram */}
          <div className={styles.heroTopChandeliers}>
            <BaroqueCornerSvg className="w-8 h-8 sm:w-10 sm:h-10 text-[#E5C88E]/40" />
            <BaroqueCrestSvg className="w-8 h-8 sm:w-10 sm:h-10 text-[#F4DFB0]" />
            <BaroqueCornerSvg className="w-8 h-8 sm:w-10 sm:h-10 text-[#E5C88E]/40" flipX />
          </div>

          <div className={styles.cameoPortraitWrap}>
            <div className={styles.cameoMandalaRing}>
              <div className={`${styles.loopSpinSlow} w-44 h-44 sm:w-56 sm:h-56`}>
                <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-[#E5C88E]/30">
                  <circle cx="100" cy="100" r="94" stroke="currentColor" strokeWidth="1" strokeDasharray="6 4" />
                  <circle cx="100" cy="100" r="88" stroke="currentColor" strokeWidth="0.8" />
                </svg>
              </div>
            </div>
            <div className={styles.cameoOvalFrame}>
              <div className={styles.cameoOvalInner}>
                <img
                  src={media.heroPhotoUrl}
                  alt={`${content.partnerOneName} & ${content.partnerTwoName}`}
                />
              </div>
            </div>
          </div>

          <p className={styles.sectionEyebrow}>The Royal Wedding Celebration</p>

          <h1 className={styles.heroCoupleTitle}>
            <span>{content.partnerOneName}</span>
            <span className={styles.heroAmp}>&amp;</span>
            <span>{content.partnerTwoName}</span>
          </h1>

          <div className={styles.heroDateRibbon}>
            <span>{formatTanggalIndo(primaryCeremonyDate)}</span>
          </div>

          {/* Sapaan Tamu Kehormatan & Tombol Buka Undangan */}
          <div className={styles.heroGuestBox}>
            <p className={styles.guestGreetingLabel}>
              Kepada Yth. Bapak / Ibu / Saudara/i
            </p>
            <p className={styles.guestHonoreeName}>{guestName}</p>

            <button
              type="button"
              className={styles.btnRoyalGold}
              onClick={handleOpenInvitation}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Buka Undangan</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
           MAIN INVITATION CONTENT (TERKUNCI PENUH SEBELUM DIBUKA)
           ========================================================================= */}
      <main className={styles.mainContainer}>
        {/* SECTION 1: HERO / SAMAPUL UNDANGAN UTAMA (TERBUKA) */}
        <header id="sec-cover" className={styles.mainHeroBanner}>
          <div className={styles.heroBgMedia}>
            <img
              src={media.heroPhotoUrl}
              alt={`${content.partnerOneName} & ${content.partnerTwoName}`}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  '/templates/royal-velvet/photo-hero.webp';
              }}
            />
            <div className={styles.heroBgVignette} />
          </div>

          <div className={styles.heroOrnateBorder} />

          <div className={styles.heroTopChandeliers}>
            <BaroqueCornerSvg className="w-8 h-8 sm:w-10 sm:h-10 text-[#E5C88E]/40" />
            <BaroqueCrestSvg className="w-8 h-8 sm:w-10 sm:h-10 text-[#F4DFB0]" />
            <BaroqueCornerSvg className="w-8 h-8 sm:w-10 sm:h-10 text-[#E5C88E]/40" flipX />
          </div>

          <div className={styles.heroCenterPiece}>
            <p className={styles.sectionEyebrow}>The Royal Wedding Celebration</p>

            <h1 className={styles.heroCoupleTitle}>
              <span>{content.partnerOneName}</span>
              <span className={styles.heroAmp}>&amp;</span>
              <span>{content.partnerTwoName}</span>
            </h1>

            <div className={styles.heroDateRibbon}>
              <span>{formatTanggalIndo(primaryCeremonyDate)}</span>
            </div>

            <div className="mt-8 flex flex-col items-center">
              <div className={styles.scrollCueBadge}>
                <span>Gulir ke Bawah</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-bounce">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
          </div>
        </header>

      {/* =========================================================================
           SECTION 2: AYAT & FALSAFAH SUCI (SURAH AR-RUM / DOAL)
           ========================================================================= */}
      <section id="sec-quote" className={styles.irviteSection}>
        <div className={styles.containerShell} style={{ maxWidth: '680px', textAlign: 'center' }}>
          <div className={`${styles.revealItem} ${styles.isShown}`}>
            <BaroqueDividerSvg className="w-48 h-6 mx-auto mb-6 text-[#E5C88E]/60" />
            <p className="font-serif italic text-lg sm:text-xl text-[#F9F4EC] leading-relaxed mb-6">
              {content.quote}
            </p>
            <span className="text-xs uppercase tracking-[0.24em] text-[#E5C88E] font-semibold">
              {content.prayerSource}
            </span>
            <BaroqueDividerSvg className="w-48 h-6 mx-auto mt-6 text-[#E5C88E]/60" />
          </div>
        </div>
      </section>

      {/* =========================================================================
           SECTION 3: PROFIL KEDUA MEMPELAI (THE BRIDE & THE GROOM)
           ========================================================================= */}
      <section id="sec-couple" className={styles.irviteSection}>
        <div className={styles.containerShell}>
          <div className={`${styles.revealItem} ${styles.isShown}`}>
            <span className={styles.sectionEyebrow}>The Royal Couple</span>
            <h2 className={styles.sectionHeading}>Mempelai Wanita &amp; Pria</h2>
            <p className={styles.sectionSubtitle}>{content.prayer}</p>
          </div>

          <div className={styles.coupleGrid}>
            {/* The Bride */}
            <article className={`${styles.baroqueCard} text-center`}>
              <div className={styles.royalDomeFrame}>
                <div className={styles.royalDomeInner}>
                  <img
                    src={media.bridePhotoUrl}
                    alt={content.partnerOneFullName}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        '/templates/royal-velvet/photo-bride.webp';
                    }}
                  />
                </div>
              </div>

              <span className={styles.sectionEyebrow}>The Bride</span>
              <h3 className={styles.coupleNicknameHighlight}>
                {content.partnerOneName}
              </h3>
              <p className={styles.coupleFullnameTitle}>
                {content.partnerOneFullName}
              </p>
              <div className={styles.goldDividerLine} />
              <p className="text-sm text-[#D2C2B0] leading-relaxed">
                {content.partnerOneFamily}
              </p>
            </article>

            {/* The Groom */}
            <article className={`${styles.baroqueCard} text-center`}>
              <div className={styles.royalDomeFrame}>
                <div className={styles.royalDomeInner}>
                  <img
                    src={media.groomPhotoUrl}
                    alt={content.partnerTwoFullName}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        '/templates/royal-velvet/photo-groom.webp';
                    }}
                  />
                </div>
              </div>

              <span className={styles.sectionEyebrow}>The Groom</span>
              <h3 className={styles.coupleNicknameHighlight}>
                {content.partnerTwoName}
              </h3>
              <p className={styles.coupleFullnameTitle}>
                {content.partnerTwoFullName}
              </p>
              <div className={styles.goldDividerLine} />
              <p className="text-sm text-[#D2C2B0] leading-relaxed">
                {content.partnerTwoFamily}
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* =========================================================================
           SECTION 4: KISAH CINTA (LOVE STORY TIMELINE)
           ========================================================================= */}
      {content.stories.length > 0 && (
        <section id="sec-story" className={styles.irviteSection}>
          <div className={styles.containerShell}>
            <div className={`${styles.revealItem} ${styles.isShown}`}>
              <span className={styles.sectionEyebrow}>Our Journey</span>
              <h2 className={styles.sectionHeading}>Simfoni Kisah Kasih</h2>
              <p className={styles.sectionSubtitle}>
                Untaian babak perjalanan yang merajut dua jiwa dalam ikatan suci
                penuh restu.
              </p>
            </div>

            <div className={styles.storyLayout}>
              {/* Kolom Kiri: Foto Kisah Kasih */}
              <div className={styles.cameoPortraitWrap} style={{ width: '100%', maxWidth: '280px', height: '360px' }}>
                <div className={styles.cameoOvalFrame}>
                  <div className={styles.cameoOvalInner}>
                    <img
                      src={media.storyPhotoUrl}
                      alt="Kisah Kasih Mempelai"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          '/templates/royal-velvet/photo-story.webp';
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Linimasa Babak Kisah */}
              <div className={styles.storyTimelineList}>
                {content.stories.map((item, idx) => (
                  <article key={idx} className={styles.storyStepCard}>
                    <span className={styles.storyYearPill}>{item.year}</span>
                    <h3 className="font-serif text-xl font-bold text-white mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#D2C2B0] leading-relaxed">
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
           SECTION 5: RANGKAIAN ACARA & COUNTDOWN TIMER
           ========================================================================= */}
      <section id="sec-event" className={styles.irviteSection}>
        <div className={styles.containerShell}>
          <div className={`${styles.revealItem} ${styles.isShown}`}>
            <span className={styles.sectionEyebrow}>Save The Date</span>
            <h2 className={styles.sectionHeading}>Rangkaian Acara Bahagia</h2>
            <p className={styles.sectionSubtitle}>
              Kami menantikan kehadiran serta doa restu Bapak/Ibu/Saudara/i pada
              hari istimewa kami:
            </p>
          </div>

          {/* Countdown Timer (Hari, Jam, Menit, Detik) */}
          <div className={styles.countdownGrid}>
            <div className={styles.countdownBox}>
              <span className={styles.countdownNum}>{timeLeft.days}</span>
              <span className={styles.countdownUnit}>Hari</span>
            </div>
            <div className={styles.countdownBox}>
              <span className={styles.countdownNum}>{timeLeft.hours}</span>
              <span className={styles.countdownUnit}>Jam</span>
            </div>
            <div className={styles.countdownBox}>
              <span className={styles.countdownNum}>{timeLeft.minutes}</span>
              <span className={styles.countdownUnit}>Menit</span>
            </div>
            <div className={styles.countdownBox}>
              <span className={styles.countdownNum}>{timeLeft.seconds}</span>
              <span className={styles.countdownUnit}>Detik</span>
            </div>
          </div>

          {/* Kartu Sesi Acara (Akad & Resepsi) */}
          <div className={styles.coupleGrid}>
            {content.ceremonies.map((cer, idx) => (
              <article key={idx} className={`${styles.baroqueCard} flex flex-col justify-between text-center`}>
                <div>
                  <span className={styles.sectionEyebrow}>
                    {idx === 0 ? 'Sesi Utama' : 'Sesi Resepsi'}
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#F4DFB0] mb-3">
                    {cer.title}
                  </h3>
                  <div className={styles.goldDividerLine} />
                  <p className="font-semibold text-base text-white mb-1">
                    {formatTanggalIndo(cer.startDateTime)}
                  </p>
                  <p className="text-sm text-[#E5C88E] mb-5">
                    {formatJamIndo(cer.startDateTime)}
                  </p>

                  <div className="bg-[#14080B]/65 border border-[#E5C88E]/30 rounded-xl p-4 mb-6">
                    <p className="font-serif text-lg font-bold text-white mb-1">
                      {cer.venue}
                    </p>
                    {cer.address && (
                      <p className="text-xs sm:text-sm text-[#D2C2B0] leading-relaxed">
                        {cer.address}
                      </p>
                    )}
                  </div>
                </div>

                {cer.mapsUrl && (
                  <a
                    href={cer.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.btnRoyalGold}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Buka Google Maps</span>
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
           SECTION 6: GALERI FOTO MOMEN BAHAGIA
           ========================================================================= */}
      {media.galleryPhotos.length > 0 && (
        <section id="sec-gallery" className={styles.irviteSection}>
          <div className={styles.containerShell}>
            <div className={`${styles.revealItem} ${styles.isShown}`}>
              <span className={styles.sectionEyebrow}>Captured Moments</span>
              <h2 className={styles.sectionHeading}>Galeri Kenangan Indah</h2>
              <p className={styles.sectionSubtitle}>
                Sentuhan potret kebahagiaan dalam balutan keanggunan klasik abadi.
              </p>
            </div>

            <div className={styles.galleryGrid}>
              {media.galleryPhotos.map((photoUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={styles.galleryThumbBtn}
                  onClick={() =>
                    setLightboxData({
                      src: photoUrl,
                      caption: `Momen Bahagia ${idx + 1}`,
                    })
                  }
                >
                  <img
                    src={photoUrl}
                    alt={`Galeri Momen ${idx + 1}`}
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
           SECTION 7: TANDA KASIH DIGITAL / REKENING BANK
           ========================================================================= */}
      {content.giftAccounts.length > 0 && (
        <section id="sec-gift" className={styles.irviteSection}>
          <div className={styles.containerShell} style={{ maxWidth: '680px', textAlign: 'center' }}>
            <div className={`${styles.revealItem} ${styles.isShown}`}>
              <span className={styles.sectionEyebrow}>Wedding Gift</span>
              <h2 className={styles.sectionHeading}>{content.giftTitle}</h2>
              <p className={styles.sectionSubtitle}>{content.giftMessage}</p>
            </div>

            <div className={styles.coupleGrid}>
              {content.giftAccounts.map((acc, idx) => (
                <article key={idx} className={`${styles.baroqueCard} text-left flex flex-col justify-between`}>
                  <div>
                    <span className="font-serif inline-block px-3 py-1 rounded-lg bg-[#E5C88E]/15 border border-[#E5C88E]/30 text-[#F4DFB0] font-bold text-lg mb-3">
                      {acc.bankName}
                    </span>
                    <p className="text-xs uppercase tracking-wider text-[#D2C2B0] mb-1">
                      Nomor Rekening
                    </p>
                    <p className="font-mono text-2xl font-bold text-white tracking-wider mb-2">
                      {acc.accountNumber}
                    </p>
                    <p className="text-sm text-[#E5C88E] mb-5">
                      a.n. {acc.accountHolder}
                    </p>
                  </div>

                  <button
                    type="button"
                    className={styles.btnRoyalOutline}
                    onClick={() =>
                      handleCopyAccount(acc.accountNumber, idx, acc.bankName)
                    }
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>
                      {copyStatus[idx] ? 'Nomor Tersalin ✓' : 'Salin Nomor Rekening'}
                    </span>
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
           SECTION 8: UNTAIAN DOA & PESAN RESTU (ROYAL GUESTBOOK)
           ========================================================================= */}
      <section id="sec-wishes" className={styles.irviteSection}>
        <div className={styles.containerShell} style={{ maxWidth: '680px' }}>
          <div className={`${styles.revealItem} ${styles.isShown} text-center`}>
            <span className={styles.sectionEyebrow}>Royal Wishes &amp; Blessings</span>
            <h2 className={styles.sectionHeading}>Untaian Doa &amp; Pesan Restu</h2>
            <p className={styles.sectionSubtitle}>
              Tuliskan doa tulus dan ucapan selamat penuh berkah untuk mengiringi
              langkah mulia kedua mempelai.
            </p>
          </div>

          {/* Form Kirim Doa Restu */}
          <form
            onSubmit={handleWishSubmit}
            className={`${styles.baroqueCard} mb-8`}
          >
            <div className={styles.formFieldGroup}>
              <label className={styles.formLabel}>Nama Anda / Tamu Kehormatan</label>
              <input
                type="text"
                className={styles.formControl}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Tuliskan nama Anda..."
                required
              />
            </div>

            <div className={styles.formFieldGroup}>
              <label className={styles.formLabel}>Untaian Doa &amp; Pesan Restu</label>
              <textarea
                className={styles.formControl}
                rows={3}
                value={formMsg}
                onChange={(e) => setFormMsg(e.target.value)}
                placeholder="Tuliskan ucapan selamat dan doa tulus untuk kedua mempelai..."
                required
              />
            </div>

            <button
              type="submit"
              className={styles.btnRoyalGold}
              disabled={isSubmittingWish}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>{isSubmittingWish ? 'Mengirimkan…' : 'Kirim Untaian Doa'}</span>
            </button>
          </form>

          {/* Feed Doa Restu */}
          <div className={styles.wishesFeed}>
            {wishes.map((w, idx) => (
              <div key={idx} className={styles.wishEntry}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={styles.wishAvatar}>
                    <span>{w.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <strong className="font-serif text-base text-[#F4DFB0] block truncate">
                      {w.name}
                    </strong>
                    <span className="text-[10px] text-[#D2C2B0]">{w.createdAt}</span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-[#F9F4EC] leading-relaxed pl-11">
                  {w.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
           SECTION 9: KONFIRMASI KEHADIRAN & AKSES MASUK (RSVP & DIGITAL PASS)
           ========================================================================= */}
      {showRsvpAndQr && (
        <section id="sec-rsvp" className={styles.irviteSection}>
          <div className={styles.containerShell} style={{ maxWidth: '820px' }}>
            <div className={`${styles.revealItem} ${styles.isShown} text-center`}>
              <span className={styles.sectionEyebrow}>Guest Attendance &amp; Check-in</span>
              <h2 className={styles.sectionHeading}>Konfirmasi Kehadiran &amp; QR Akses</h2>
              <p className={styles.sectionSubtitle}>
                Kehadiran Bapak/Ibu/Saudara/i merupakan kehormatan istimewa bagi kami.
                Mohon konfirmasikan kehadiran Anda dan simpan kode QR registrasi untuk pemindaian di lokasi acara.
              </p>
            </div>

            <div className={styles.rsvpGridContainer}>
              <div className={styles.rsvpSectionSlot}>
                <RsvpForm
                  key={uniqueCode || 'preview-rsvp'}
                  uniqueCode={uniqueCode || 'simulasi-tamu'}
                  maxPax={data?.guest?.maxPax || 2}
                  initialRsvp={
                    data?.rsvp || {
                      canRespond: true,
                      response: 'PENDING',
                      pax: 1,
                    }
                  }
                />
              </div>
              <div className={styles.rsvpSectionSlot}>
                <QRDisplay
                  canonicalUrl={
                    canonicalUrl ||
                    (uniqueCode ? getCanonicalInvitationUrl(uniqueCode) : null) ||
                    'https://irvite.id/i/SIMULASI-TAMU'
                  }
                  guestName={guestName}
                  maxPax={data?.guest?.maxPax || 2}
                  tableNumber={data?.guest?.tableNumber}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
           SECTION 10: PENUTUP & SALAM HORMAT
           ========================================================================= */}
      <footer id="sec-closing" className={styles.irviteSection} style={{ paddingBottom: '128px', textAlign: 'center' }}>
        <div className={styles.containerShell} style={{ maxWidth: '580px' }}>
          <div className={styles.royalDomeFrame} style={{ width: '180px', height: '240px' }}>
            <div className={styles.royalDomeInner}>
              <img
                src={media.heroPhotoUrl}
                alt={`${content.partnerOneName} & ${content.partnerTwoName}`}
              />
            </div>
          </div>

          <p className="font-serif italic text-base sm:text-lg text-[#F9F4EC] leading-relaxed mb-6">
            {content.closingMessage}
          </p>

          <span className={styles.sectionEyebrow}>Kami Yang Berbahagia</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#F4DFB0] mb-2">
            {content.partnerOneName} &amp; {content.partnerTwoName}
          </h2>
          <p className="text-xs text-[#D2C2B0] tracking-widest uppercase">
            Beserta Keluarga Besar Kedua Mempelai
          </p>
        </div>
      </footer>
    </main>

      {/* =========================================================================
           FLOATING BOTTOM NAVIGATION BAR
           ========================================================================= */}
      <nav
        id="floating-bottom-nav"
        aria-label="Navigasi Menu Undangan"
        className={`${styles.floatingBottomNav} ${!isOpen ? styles.bottomNavHidden : styles.bottomNavShown}`}
      >
        <div className={styles.bottomNavGrid}>
          <button
            type="button"
            className={`${styles.bottomNavBtn} ${activeNav === 'sec-cover' ? styles.isActive : ''}`}
            onClick={() => scrollToSection('sec-cover')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mb-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10" />
            </svg>
            <span>Cover</span>
          </button>

          <button
            type="button"
            className={`${styles.bottomNavBtn} ${activeNav === 'sec-couple' ? styles.isActive : ''}`}
            onClick={() => scrollToSection('sec-couple')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mb-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>Mempelai</span>
          </button>

          <button
            type="button"
            className={`${styles.bottomNavBtn} ${activeNav === 'sec-event' ? styles.isActive : ''}`}
            onClick={() => scrollToSection('sec-event')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mb-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Acara</span>
          </button>

          <button
            type="button"
            className={`${styles.bottomNavBtn} ${activeNav === 'sec-gallery' ? styles.isActive : ''}`}
            onClick={() => scrollToSection(media.galleryPhotos.length > 0 ? 'sec-gallery' : 'sec-story')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mb-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Galeri</span>
          </button>

          <button
            type="button"
            className={`${styles.bottomNavBtn} ${activeNav === 'sec-wishes' ? styles.isActive : ''}`}
            onClick={() => scrollToSection('sec-wishes')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mb-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span>Doa Restu</span>
          </button>

          {showRsvpAndQr && (
            <button
              type="button"
              className={`${styles.bottomNavBtn} ${activeNav === 'sec-rsvp' ? styles.isActive : ''}`}
              onClick={() => scrollToSection('sec-rsvp')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mb-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>RSVP</span>
            </button>
          )}
        </div>
      </nav>

      {/* Lightbox Modal */}
      {lightboxData && (
        <div
          className={styles.lightboxOverlay}
          onClick={() => setLightboxData(null)}
        >
          <div
            className={styles.lightboxDialog}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxData.src}
              alt={lightboxData.caption}
              className="w-full max-h-[75vh] object-contain"
            />
            <div className="p-4 bg-[#230D13] flex items-center justify-between">
              <span className="text-sm font-medium text-[#F4DFB0]">
                {lightboxData.caption}
              </span>
              <button
                type="button"
                className="text-xs uppercase tracking-wider text-[#D2C2B0] hover:text-white px-3 py-1 rounded-md border border-[#E5C88E]/40"
                onClick={() => setLightboxData(null)}
              >
                Tutup ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoyalVelvetRenderer;

