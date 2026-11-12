/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RendererProps } from '../registry';
import { RsvpForm } from '../../components/rsvp-form';
import QRDisplay from '../../components/QRDisplay';
import { WishesSection } from '../../components/wishes/WishesSection';
import { AddToCalendarButton } from '../../components/calendar';
import { QrisGiftCard } from '../../components/qris';
import { getCanonicalInvitationUrl } from '../../utils/url';
import {
  shouldRenderRsvpAndQr,
  shouldRenderSereneGuest,
} from '../mode-gating';
import { useEffectiveDisplayGuest } from '../use-effective-guest';
import {
  adaptSwargaDewataContent,
  adaptSwargaDewataMedia,
} from './swarga-dewata.adapter';
import { BalineseRindikSynth } from './audio-synth';
import {
  CandiBentarTowerSvg,
  GelunganCrownSvg,
  LotusPadmaSvg,
  MandalaChakraSvg,
  PenjorAgungSvg,
} from './ornaments';
import styles from './swarga-dewata.module.css';

const GALLERY_CAPTIONS = [
  'Agunging Payas Agung',
  'Senyum Sang Vadhu',
  'Wibawa Sang Varaka',
  'Pelataran Candi Bentar',
  'Karya Agung Pawiwahan',
  'Sinar Prada Dewata',
  'Dharma Suaka Kasih',
  'Puri Agung Ubud',
];

const TIMEZONE_LABELS: Record<string, string> = {
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
};

function formatIndonesianDate(isoString: string, timeZone: string): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return 'Minggu, 18 Oktober 2026';
  }
  try {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone,
    }).format(parsed);
  } catch {
    return 'Minggu, 18 Oktober 2026';
  }
}

function formatTimeRange(
  startIso: string,
  endIso: string | undefined,
  timeZone: string,
): string {
  const tzLabel = TIMEZONE_LABELS[timeZone] || 'WITA';
  const parseTime = (iso: string): string | null => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    try {
      return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone,
      })
        .format(d)
        .replace(':', '.');
    } catch {
      return null;
    }
  };

  const startFormatted = parseTime(startIso) || '08.00';
  const endFormatted = endIso ? parseTime(endIso) : null;
  if (endFormatted) {
    return `Pukul ${startFormatted} – ${endFormatted} ${tzLabel}`;
  }
  return `Pukul ${startFormatted} ${tzLabel} – Selesai`;
}

export function SwargaDewataRenderer({
  data,
  uniqueCode,
  canonicalUrl,
  mode = 'PUBLIC',
  isPreview = false,
}: RendererProps) {
  const content = useMemo(
    () =>
      adaptSwargaDewataContent(
        data?.event?.content,
        data?.event?.title,
        data?.event?.eventDate,
        data?.event?.locationDetails,
      ),
    [
      data?.event?.content,
      data?.event?.title,
      data?.event?.eventDate,
      data?.event?.locationDetails,
    ],
  );

  const media = useMemo(
    () =>
      adaptSwargaDewataMedia(
        data?.mediaBySlot,
        data?.media,
        isPreview,
      ),
    [data?.mediaBySlot, data?.media, isPreview],
  );

  const effectiveGuest = useEffectiveDisplayGuest(mode, data?.guest);
  const guestVisible = shouldRenderSereneGuest(mode, effectiveGuest);
  const showRsvpAndQr = shouldRenderRsvpAndQr(mode, uniqueCode, isPreview);

  const [isGateOpen, setIsGateOpen] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [copiedAccountIdx, setCopiedAccountIdx] = useState<number | null>(null);
  const [countdown, setCountdown] = useState({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const synthRef = useRef<BalineseRindikSynth | null>(null);
  const customAudioRef = useRef<HTMLAudioElement | null>(null);

  const primaryCeremony = content.ceremonies[0];
  const primaryDateDisplay = useMemo(
    () =>
      formatIndonesianDate(
        primaryCeremony?.startDateTime || data?.event?.eventDate || '2026-10-18T08:00:00+08:00',
        content.timeZone,
      ),
    [primaryCeremony?.startDateTime, data?.event?.eventDate, content.timeZone],
  );

  // Live Countdown Timer
  useEffect(() => {
    const rawTarget =
      primaryCeremony?.startDateTime ||
      data?.event?.eventDate ||
      '2026-10-18T08:00:00+08:00';
    const targetTime = new Date(rawTarget).getTime();
    const validTarget = Number.isNaN(targetTime)
      ? new Date('2026-10-18T08:00:00+08:00').getTime()
      : targetTime;

    const tick = () => {
      const diff = Math.max(0, validTarget - Date.now());
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setCountdown({
        days: String(d).padStart(2, '0'),
        hours: String(h).padStart(2, '0'),
        minutes: String(m).padStart(2, '0'),
        seconds: String(s).padStart(2, '0'),
      });
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [primaryCeremony?.startDateTime, data?.event?.eventDate]);

  // Cleanup audio on unmount
  useEffect(() => {
    synthRef.current = new BalineseRindikSynth();
    return () => {
      synthRef.current?.stop();
      if (customAudioRef.current) {
        customAudioRef.current.pause();
      }
    };
  }, []);

  // Falling Bunga Jepun (Frangipani) & Prada Gold Particles Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Accessibility & battery optimization: respect reduced motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let isTabVisible = true;
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let animFrameId = 0;
    const dpr =
      typeof window !== 'undefined'
        ? Math.min(window.devicePixelRatio || 1, 2)
        : 1;
    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const handleResize = () => {
      if (!canvas) return;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', handleResize);

    interface ParticleItem {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      rot: number;
      rotSpeed: number;
      type: 'jepun' | 'cempaka' | 'prada';
      opacity: number;
    }

    const createParticle = (initial = false): ParticleItem => {
      const rand = Math.random();
      const type =
        rand < 0.38 ? 'jepun' : rand < 0.62 ? 'cempaka' : 'prada';
      return {
        x: Math.random() * w,
        y: initial ? Math.random() * h : -30,
        size:
          type === 'prada'
            ? Math.random() * 2.5 + 1
            : Math.random() * 8 + 7,
        speedY:
          type === 'prada'
            ? Math.random() * 0.45 + 0.2
            : Math.random() * 0.75 + 0.35,
        speedX: (Math.random() - 0.5) * 0.5,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.015,
        type,
        opacity: Math.random() * 0.55 + 0.25,
      };
    };

    // Consistent particle density across mobile & desktop with Retina crispness
    const count = 26;
    const particles: ParticleItem[] = Array.from({ length: count }, () =>
      createParticle(true),
    );

    const drawParticle = (p: ParticleItem) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.opacity;

      if (p.type === 'prada') {
        ctx.fillStyle = '#FFE89E';
        ctx.shadowColor = '#E5B84B';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'jepun') {
        // Bunga Jepun (Frangipani Bali) with soft overlapping petals & golden core
        for (let i = 0; i < 5; i++) {
          ctx.save();
          ctx.rotate((i * Math.PI * 2) / 5);
          ctx.beginPath();
          ctx.ellipse(
            0,
            -p.size * 0.52,
            p.size * 0.33,
            p.size * 0.58,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = '#FFFDF7';
          ctx.fill();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = '#F5B935';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = '#E59819';
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.35, p.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#E5B84B';
        ctx.fill();
      }
      ctx.restore();
    };

    const animate = () => {
      if (isTabVisible) {
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.y += p.speedY;
          p.x += p.speedX + Math.sin(p.y * 0.012) * 0.25;
          p.rot += p.rotSpeed;
          if (p.y > h + 30) {
            particles[i] = createParticle(false);
          }
          drawParticle(p);
        }
      }
      animFrameId = requestAnimationFrame(animate);
    };

    animFrameId = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  const startAudio = () => {
    if (media.bgMusicUrl && customAudioRef.current) {
      customAudioRef.current
        .play()
        .then(() => setIsAudioPlaying(true))
        .catch(() => {
          const started = synthRef.current?.start() ?? false;
          setIsAudioPlaying(started);
        });
    } else {
      const started = synthRef.current?.start() ?? false;
      setIsAudioPlaying(started);
    }
  };

  const stopAudio = () => {
    synthRef.current?.stop();
    if (customAudioRef.current) {
      customAudioRef.current.pause();
    }
    setIsAudioPlaying(false);
  };

  const handleToggleAudio = () => {
    if (isAudioPlaying) {
      stopAudio();
    } else {
      startAudio();
    }
  };

  const handleOpenGate = () => {
    setIsGateOpen(true);
    if (!isAudioPlaying) {
      startAudio();
    }
  };

  const handleCopyAccount = (accountNumber: string, idx: number) => {
    const cleanNum = accountNumber.replace(/\s+/g, '');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(cleanNum);
    }
    setCopiedAccountIdx(idx);
    setTimeout(() => {
      setCopiedAccountIdx((prev) => (prev === idx ? null : prev));
    }, 2200);
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const guestDisplayName =
    guestVisible && effectiveGuest?.name
      ? effectiveGuest.name
      : 'Bapak / Ibu / Saudara/i';

  return (
    <div
      className={`${styles.root} ${styles.pradaDamaskBg} ${
        !isGateOpen ? styles.rootLocked : ''
      }`}
    >
      {media.bgMusicUrl && (
        <audio ref={customAudioRef} src={media.bgMusicUrl} loop preload="none" />
      )}

      {/* Falling Bunga Jepun & Prada Gold Canvas */}
      <canvas ref={canvasRef} className={styles.petalCanvas} />

      {/* Floating Audio Pill (Rindik Bali) */}
      <button
        type="button"
        onClick={handleToggleAudio}
        className={styles.audioPill}
        aria-label="Putar atau Hentikan Musik Gamelan Rindik Bali"
      >
        <span
          className={`${styles.eqBars} ${
            isAudioPlaying ? styles.eqPlaying : ''
          }`}
        >
          <span className={styles.eqBar} />
          <span className={styles.eqBar} />
          <span className={styles.eqBar} />
          <span className={styles.eqBar} />
        </span>
        <span className={styles.audioPillLabel}>
          {isAudioPlaying ? 'Rindik Bali: Aktif' : 'Rindik Bali'}
        </span>
      </button>

      {/* ====================================================================
          OPENING GATE: CANDI BENTAR SPLIT TEMPLE DOORS
          ==================================================================== */}
      <div
        className={`${styles.candiGateOverlay} ${
          isGateOpen ? styles.candiGateUnlocked : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Gerbang Undangan Pawiwahan Agung"
      >
        <div className={styles.candiHalfLeft}>
          <PenjorAgungSvg className={styles.penjorLeft} />
          <CandiBentarTowerSvg
            className={styles.candiTowerLeft}
            imageHref="/templates/swarga-dewata/bali-photo-0.webp"
            clipId="swarga-candi-left-clip"
          />
        </div>

        <div className={styles.candiHalfRight}>
          <CandiBentarTowerSvg
            className={styles.candiTowerRight}
            imageHref="/templates/swarga-dewata/bali-photo-0.webp"
            clipId="swarga-candi-right-clip"
          />
          <PenjorAgungSvg className={styles.penjorRight} />
        </div>

        <div className={styles.candiCenterSeal}>
          <div className={`${styles.pradaCard} ${styles.candiSealCard}`}>
            <div className={`${styles.patraCorner} ${styles.patraTl}`} />
            <div className={`${styles.patraCorner} ${styles.patraTr}`} />
            <div className={`${styles.patraCorner} ${styles.patraBl}`} />
            <div className={`${styles.patraCorner} ${styles.patraBr}`} />

            <div className={styles.mandalaBadgeWrap}>
              <MandalaChakraSvg className={styles.mandalaSpin} />
            </div>

            <p className={`${styles.aksaraSacred} ${styles.gateAksara}`}>
              ᬒᬁ ᬲ᭄ᬯᬲ᭄ᬢ᭄ᬬᬲ᭄ᬢᬸ
            </p>
            <p className={styles.gateEyebrow}>
              Karya Agung Manusa Yadnya Pawiwahan
            </p>

            <h1 className={`${styles.gateTitle} ${styles.pradaShimmerText}`}>
              {content.partnerOneName} &amp; {content.partnerTwoName}
            </h1>
            <p className={styles.gateSubtitle}>
              {primaryDateDisplay} • {primaryCeremony?.venue || 'Puri Agung Ubud'}
            </p>

            <div className={styles.gateDivider}>
              <span className={styles.gateDividerLine} />
              <span className={styles.gateDividerDiamond}>❖</span>
              <span className={styles.gateDividerLine} />
            </div>

            <div className={styles.gateGuestBox}>
              <p className={styles.gateGuestLabel}>
                Kepada Yth. Bapak / Ibu / Saudara/i
              </p>
              <p className={styles.gateGuestName}>{guestDisplayName}</p>
              <p className={styles.gateGuestHonor}>Di Tempat Kehormatan</p>
            </div>

            <button
              type="button"
              onClick={handleOpenGate}
              className={styles.gateOpenBtn}
            >
              <span>Buka Gapura Undangan</span>
            </button>

            <p className={styles.gateMusicHint}>
              Disertai Alunan Gamelan Rindik Selisir
            </p>
          </div>
        </div>
      </div>

      {/* ====================================================================
          MAIN INVITATION CONTENT
          ==================================================================== */}
      <main className={styles.mainContainer}>
        {/* SECTION 01: HERO (PURI AGUNG & PAYAS AGUNG) */}
        <section id="hero" className={styles.heroSection}>
          <div className={styles.heroAmbientBg}>
            <img
              src="/templates/swarga-dewata/bali-photo-0.webp"
              alt="Candi Bentar Puri Agung Ubud"
              className={styles.heroAmbientImg}
            />
            <div className={styles.heroAmbientGradient} />
            <div className={styles.heroAmbientRadial} />
          </div>

          <PenjorAgungSvg className={styles.heroPenjorLeft} />
          <PenjorAgungSvg className={styles.heroPenjorRight} />

          <div className={styles.heroInner}>
            <GelunganCrownSvg className={styles.heroCrown} />
            <p className={`${styles.aksaraSacred} ${styles.heroAksara}`}>
              ᬒᬁ ᬲ᭄ᬯᬲ᭄ᬢ᭄ᬬᬲ᭄ᬢᬸ
            </p>
            <p className={styles.heroEyebrow}>{content.openingGreeting}</p>

            <div className={styles.koriFrameOuter}>
              <div className={styles.koriFrameInner}>
                <img
                  src={media.heroPhotoUrl}
                  alt={`${content.partnerOneName} & ${content.partnerTwoName}`}
                  className={styles.koriFrameImg}
                />
                <div className={styles.koriFrameOverlay} />
                <div className={styles.koriFrameBadge}>
                  Pawiwahan Agung • Bali
                </div>
              </div>
            </div>

            <h2
              className={`${styles.heroCoupleTitle} ${styles.pradaShimmerText}`}
            >
              {content.partnerOneName}
              <span className={styles.heroAmpersand}>&amp;</span>
              {content.partnerTwoName}
            </h2>

            <div className={styles.heroDateBadge}>
              <span>✦</span>
              <span>{primaryDateDisplay}</span>
              <span>✦</span>
            </div>

            {/* Dewasa Ayu Countdown */}
            <div
              className={styles.countdownGrid}
              aria-label="Hitung Mundur Hari Bahagia"
            >
              <div className={`${styles.pradaCard} ${styles.countdownBox}`}>
                <span className={styles.countdownValue}>{countdown.days}</span>
                <span className={styles.countdownLabel}>Rahina (Hari)</span>
              </div>
              <div className={`${styles.pradaCard} ${styles.countdownBox}`}>
                <span className={styles.countdownValue}>{countdown.hours}</span>
                <span className={styles.countdownLabel}>Dauh (Jam)</span>
              </div>
              <div className={`${styles.pradaCard} ${styles.countdownBox}`}>
                <span className={styles.countdownValue}>
                  {countdown.minutes}
                </span>
                <span className={styles.countdownLabel}>Menit</span>
              </div>
              <div className={`${styles.pradaCard} ${styles.countdownBox}`}>
                <span className={styles.countdownValue}>
                  {countdown.seconds}
                </span>
                <span className={styles.countdownLabel}>Detik</span>
              </div>
            </div>

            {/* Sacred Rgveda Sloka Box */}
            <div className={styles.slokaBox}>
              {content.quote && (
                <p className={styles.slokaSanskrit}>“{content.quote}”</p>
              )}
              {content.prayer && (
                <p className={styles.slokaTranslation}>“{content.prayer}”</p>
              )}
              {content.prayerSource && (
                <p className={styles.slokaSource}>— {content.prayerSource} —</p>
              )}
            </div>
          </div>
        </section>

        <div className={styles.tridatuRibbon} />

        {/* SECTION 02: SANG MEMPELAI (THE ROYAL COUPLE) */}
        <section id="mempelai" className={styles.sectionWrap}>
          <div className={styles.sectionHeader}>
            <LotusPadmaSvg className={styles.closingLotus} />
            <p className={styles.sectionEyebrow}>02 • Purusa &amp; Pradana</p>
            <h2
              className={`${styles.sectionTitle} ${styles.pradaShimmerText}`}
            >
              Sang Mempelai Agung
            </h2>
            <p className={styles.sectionSubtitle}>{content.openingText}</p>
          </div>

          <div className={styles.coupleGrid}>
            <article className={`${styles.pradaCard} ${styles.coupleCard}`}>
              <div className={`${styles.patraCorner} ${styles.patraTl}`} />
              <div className={`${styles.patraCorner} ${styles.patraTr}`} />
              <div className={`${styles.patraCorner} ${styles.patraBl}`} />
              <div className={`${styles.patraCorner} ${styles.patraBr}`} />

              <div className={styles.coupleOctagonWrap}>
                <div className={styles.coupleOctagonGlow} />
                <div className={styles.astadalaFrame}>
                  <div className={styles.astadalaInner}>
                    <img
                      src={media.bridePhotoUrl}
                      alt={content.partnerOneFullName}
                      className={styles.coupleImg}
                    />
                  </div>
                </div>
              </div>

              <p className={styles.coupleRoleTag}>
                Mempelai Wanita • Sang Vadhu
              </p>
              <h3 className={styles.coupleFullName}>
                {content.partnerOneFullName}
              </h3>
              <div className={styles.coupleCardDivider} />
              <p className={styles.coupleParentsText}>
                {content.partnerOneFamily}
              </p>
            </article>

            <div className={styles.coupleCenterEmblem}>
              <div className={styles.coupleCenterLine} />
              <div className={styles.coupleCenterCircle}>ᬒᬁ</div>
              <div className={styles.coupleCenterLine} />
            </div>

            <article className={`${styles.pradaCard} ${styles.coupleCard}`}>
              <div className={`${styles.patraCorner} ${styles.patraTl}`} />
              <div className={`${styles.patraCorner} ${styles.patraTr}`} />
              <div className={`${styles.patraCorner} ${styles.patraBl}`} />
              <div className={`${styles.patraCorner} ${styles.patraBr}`} />

              <div className={styles.coupleOctagonWrap}>
                <div className={styles.coupleOctagonGlow} />
                <div className={styles.astadalaFrame}>
                  <div className={styles.astadalaInner}>
                    <img
                      src={media.groomPhotoUrl}
                      alt={content.partnerTwoFullName}
                      className={styles.coupleImg}
                    />
                  </div>
                </div>
              </div>

              <p className={styles.coupleRoleTag}>
                Mempelai Pria • Sang Varaka
              </p>
              <h3 className={styles.coupleFullName}>
                {content.partnerTwoFullName}
              </h3>
              <div className={styles.coupleCardDivider} />
              <p className={styles.coupleParentsText}>
                {content.partnerTwoFamily}
              </p>
            </article>
          </div>
        </section>

        <div className={styles.tridatuRibbon} />

        {/* SECTION 03: KISAH KASIH GRIHASTA (LOVE STORY TIMELINE) */}
        {content.stories && content.stories.length > 0 && (
          <section id="kisah" className={styles.sectionWrap}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionEyebrow}>
                03 • Titi Asmara Grihasta
              </p>
              <h2
                className={`${styles.sectionTitle} ${styles.pradaShimmerText}`}
              >
                Kisah Kasih Abadi
              </h2>
              <p className={styles.sectionSubtitle}>
                Perjalanan suci dua jiwa yang dipersatukan dalam tuntunan
                Dharma dan restu leluhur tanah Dewata.
              </p>
            </div>

            <div className={styles.storyLayout}>
              {/* Left Column: Balinese Royal Photo Arch */}
              <div className={styles.storyPhotoCol}>
                <div className={styles.storyPhotoCard}>
                  <div className={`${styles.patraCorner} ${styles.patraTl}`} />
                  <div className={`${styles.patraCorner} ${styles.patraTr}`} />
                  <div className={`${styles.patraCorner} ${styles.patraBl}`} />
                  <div className={`${styles.patraCorner} ${styles.patraBr}`} />

                  <div className={styles.storyPhotoAspect}>
                    <img
                      src={media.storyPhotoUrl}
                      alt="Kisah Kasih Mempelai"
                      className={styles.storyPhotoImg}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.src.includes('bali-photo-0.webp')) {
                          target.src = '/templates/swarga-dewata/bali-photo-0.webp';
                        }
                      }}
                    />
                    <div className={styles.storyPhotoGradient} />
                    <div className={styles.storyPhotoCaption}>
                      <LotusPadmaSvg className={styles.storyPhotoLotus} />
                      <p className={styles.storyPhotoQuote}>
                        “Satyam Siwam Sundaram • Kebenaran, Kesucian, dan
                        Keindahan dalam Cinta Abadi”
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Balinese Timeline Milestones */}
              <div className={styles.storyTimelineCol}>
                <div className={styles.storyTimelineSpine} />

                {content.stories.map((item, idx) => (
                  <div
                    key={`${item.year}-${item.title}-${idx}`}
                    className={styles.storyTimelineItem}
                  >
                    <div className={styles.storyTimelineNode}>
                      <span className={styles.storyTimelineLotus}>❖</span>
                    </div>

                    <div
                      className={`${styles.pradaCard} ${styles.storyCard}`}
                    >
                      <div
                        className={`${styles.patraCorner} ${styles.patraTl}`}
                      />
                      <div
                        className={`${styles.patraCorner} ${styles.patraTr}`}
                      />
                      <div
                        className={`${styles.patraCorner} ${styles.patraBl}`}
                      />
                      <div
                        className={`${styles.patraCorner} ${styles.patraBr}`}
                      />

                      <div className={styles.storyCardHeader}>
                        <span className={styles.storyYearBadge}>
                          {item.year}
                        </span>
                        {item.date && (
                          <span className={styles.storyDateBadge}>
                            {item.date}
                          </span>
                        )}
                      </div>

                      <h3 className={styles.storyCardTitle}>{item.title}</h3>
                      <p className={styles.storyCardDesc}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className={styles.tridatuRibbon} />

        {/* SECTION 04: RANGKAIAN KARYA PAWIWAHAN (CEREMONIES) */}
        <section id="acara" className={styles.sectionWrap}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>
              04 • Dewasa Ayu &amp; Loka Karya
            </p>
            <h2
              className={`${styles.sectionTitle} ${styles.pradaShimmerText}`}
            >
              Tahapan Karya Pawiwahan
            </h2>
            <p className={styles.sectionSubtitle}>
              Rangkaian upacara suci Manusa Yadnya dan jamuan kehormatan
              keluarga besar Puri Agung.
            </p>
          </div>

          <div className={styles.ceremonyGrid}>
            {content.ceremonies.map((ceremony, idx) => {
              const isFeatured = idx === 1;
              return (
                <article
                  key={`${ceremony.title}-${idx}`}
                  className={`${styles.pradaCard} ${styles.ceremonyCard} ${
                    isFeatured ? styles.ceremonyCardFeatured : ''
                  }`}
                >
                  <div className={`${styles.patraCorner} ${styles.patraTl}`} />
                  <div className={`${styles.patraCorner} ${styles.patraTr}`} />
                  <div className={`${styles.patraCorner} ${styles.patraBl}`} />
                  <div className={`${styles.patraCorner} ${styles.patraBr}`} />

                  <div>
                    <div className={styles.ceremonyTopRow}>
                      <span
                        className={
                          isFeatured
                            ? styles.ceremonyBadgeGold
                            : styles.ceremonyBadge
                        }
                      >
                        {idx === 0
                          ? 'Yadnya Utama • Sakral'
                          : `Karya ${idx + 1} • Dharma Suaka`}
                      </span>
                      <span style={{ color: '#E5B84B' }}>
                        {idx === 0 ? '❖' : '✦'}
                      </span>
                    </div>

                    <h3 className={styles.ceremonyTitle}>{ceremony.title}</h3>
                    <p className={styles.ceremonySub}>
                      {idx === 0
                        ? 'Penyucian Diri & Saksi Kehadapan Ida Sang Hyang Widhi Wasa'
                        : 'Jamuan Malam Kehormatan & Tari Sekar Jagat Penyambutan'}
                    </p>

                    <div className={styles.ceremonyMetaList}>
                      <div className={styles.ceremonyMetaItem}>
                        <span className={styles.ceremonyMetaIcon}>📅</span>
                        <div>
                          <p className={styles.ceremonyMetaPrimary}>
                            {formatIndonesianDate(
                              ceremony.startDateTime,
                              content.timeZone,
                            )}
                          </p>
                          <p className={styles.ceremonyMetaSecondary}>
                            Dewasa Ayu Purnama Kapat
                          </p>
                        </div>
                      </div>

                      <div className={styles.ceremonyMetaItem}>
                        <span className={styles.ceremonyMetaIcon}>🕰️</span>
                        <div>
                          <p className={styles.ceremonyMetaPrimary}>
                            {formatTimeRange(
                              ceremony.startDateTime,
                              ceremony.endDateTime,
                              content.timeZone,
                            )}
                          </p>
                          <p className={styles.ceremonyMetaSecondary}>
                            Waktu Indonesia (
                            {TIMEZONE_LABELS[content.timeZone] || 'WITA'})
                          </p>
                        </div>
                      </div>

                      <div className={styles.ceremonyMetaItem}>
                        <span className={styles.ceremonyMetaIcon}>🏛️</span>
                        <div>
                          <p className={styles.ceremonyMetaPrimary}>
                            {ceremony.venue}
                          </p>
                          {ceremony.address && (
                            <p className={styles.ceremonyMetaSecondary}>
                              {ceremony.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.ceremonyActions}>
                      <a
                        href={
                          ceremony.mapsUrl ||
                          `https://maps.google.com/?q=${encodeURIComponent(
                            `${ceremony.venue} ${ceremony.address || ''}`,
                          )}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.btnCeremonyMaps}
                      >
                        <span className={styles.ceremonyMapsIcon}>📍</span>
                        <span>Petunjuk Lokasi (Google Maps)</span>
                      </a>
                      <AddToCalendarButton
                        event={{
                          title: `${ceremony.title} - ${content.partnerOneName} & ${content.partnerTwoName}`,
                          startDateTime: ceremony.startDateTime,
                          endDateTime: ceremony.endDateTime,
                          venue: ceremony.venue,
                          address: ceremony.address,
                          description: `Karya Pawiwahan Agung ${content.partnerOneName} & ${content.partnerTwoName}. Matur Suksma atas doa restu Anda.`,
                          url: canonicalUrl || undefined,
                          timeZone: content.timeZone,
                        }}
                        theme="swarga-dewata"
                      />
                    </div>
                  </div>

                  <p className={styles.ceremonyFooterNote}>
                    {idx === 0
                      ? '✦ Busana: Adat Madya / Payas Bali / Formal Sopan'
                      : '✦ Dimeriahkan Gamelan Semar Pegulingan & Tari Legong Kraton'}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <div className={styles.tridatuRibbon} />

        {/* SECTION 05: GALERI SWARGA DEWATA & LIGHTBOX */}
        <section id="galeri" className={styles.sectionWrap}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>05 • Lukisan Cahaya</p>
            <h2
              className={`${styles.sectionTitle} ${styles.pradaShimmerText}`}
            >
              Mozaik Swarga Dewata
            </h2>
            <p className={styles.sectionSubtitle}>
              Abadi dalam balutan tenun songket emas dan keagungan Payas Agung
              Bali. Klik pada potret untuk memperbesar.
            </p>
          </div>

          <div className={styles.galleryGrid}>
            {media.galleryPhotos.map((photoUrl, idx) => {
              const caption =
                GALLERY_CAPTIONS[idx % GALLERY_CAPTIONS.length];
              return (
                <div
                  key={`${photoUrl}-${idx}`}
                  onClick={() => setLightboxIndex(idx)}
                  className={styles.galleryCard}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setLightboxIndex(idx);
                    }
                  }}
                >
                  <div className={styles.galleryAspect}>
                    <img
                      src={photoUrl}
                      alt={caption}
                      className={styles.galleryImg}
                    />
                    <div className={styles.galleryHoverCaption}>
                      <p className={styles.galleryCaptionText}>{caption}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className={styles.tridatuRibbon} />

        {/* SECTION 06: RSVP & GUEST QR */}
        {showRsvpAndQr && (
          <section id="rsvp" className={styles.sectionWrap}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionEyebrow}>
                06 • Pangaksama &amp; Doa Restu
              </p>
              <h2
                className={`${styles.sectionTitle} ${styles.pradaShimmerText}`}
              >
                Konfirmasi &amp; Doa Suci
              </h2>
              <p className={styles.sectionSubtitle}>
                Mohon konfirmasi kehadiran Bapak/Ibu/Saudara/i serta tuliskan
                doa restu bagi perjalanan suci Grihasta Asrama kami.
              </p>
            </div>

            <div className={styles.rsvpGrid}>
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
                  variant="balinese"
                />
              </div>
              <div className={styles.rsvpSectionSlot}>
                <QRDisplay
                  canonicalUrl={
                    canonicalUrl ||
                    (uniqueCode
                      ? getCanonicalInvitationUrl(uniqueCode)
                      : null) ||
                    'https://irvite.id/i/SIMULASI-TAMU'
                  }
                  guestName={guestDisplayName}
                  maxPax={data?.guest?.maxPax || 2}
                  tableNumber={data?.guest?.tableNumber}
                  eventTitle={data?.event?.title}
                  variant="balinese"
                />
              </div>
            </div>
          </section>
        )}

        <div className={styles.tridatuRibbon} />

        {/* SECTION 07: PRADA DANA KASIH (DIGITAL GIFT) - REKENING DI BAWAH DEKAT CLOSING */}
        <section id="prada-dana" className={styles.sectionWrapNarrow}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>07 • Tanda Kasih Kehormatan</p>
            <h2
              className={`${styles.sectionTitle} ${styles.pradaShimmerText}`}
            >
              {content.giftTitle}
            </h2>
            <p className={styles.sectionSubtitle}>{content.giftMessage}</p>
          </div>

          <div
            className={styles.pradaDanaGrid}
            style={
              content.giftAccounts.length === 1
                ? { maxWidth: '480px', margin: '0 auto' }
                : undefined
            }
          >
            {content.giftAccounts.map((acc, idx) => (
              <div
                key={`${acc.bankName}-${idx}`}
                className={`${styles.pradaCard} ${styles.pradaDanaCard}`}
              >
                <div className={`${styles.patraCorner} ${styles.patraTl}`} />
                <div className={`${styles.patraCorner} ${styles.patraTr}`} />
                <div className={`${styles.patraCorner} ${styles.patraBl}`} />
                <div className={`${styles.patraCorner} ${styles.patraBr}`} />

                <div className={styles.pradaDanaHeader}>
                  <div>
                    <p className={styles.pradaDanaLabel}>Rekening Kehormatan</p>
                    <h3 className={styles.pradaDanaBank}>{acc.bankName}</h3>
                  </div>
                  <div className={styles.pradaDanaChip} />
                </div>

                <div className={styles.pradaDanaBody}>
                  <p className={styles.pradaDanaAccountLabel}>
                    Nomor Rekening
                  </p>
                  <p className={styles.pradaDanaNumber}>{acc.accountNumber}</p>
                  <p className={styles.pradaDanaHolder}>
                    a.n. {acc.accountHolder}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyAccount(acc.accountNumber, idx)}
                  className={`${styles.pradaDanaCopyBtn} ${
                    copiedAccountIdx === idx ? styles.pradaDanaCopyBtnCopied : ''
                  }`}
                  aria-label={`Salin nomor rekening ${acc.bankName}`}
                >
                  <span>
                    {copiedAccountIdx === idx
                      ? '✓ Nomor Rekening Tersalin'
                      : '📋 Salin Nomor Rekening'}
                  </span>
                </button>
              </div>
            ))}
          </div>

          <QrisGiftCard
            qrisUrl={media.qrisUrl}
            coupleName={`${content.partnerOneName} & ${content.partnerTwoName}`}
            theme="swarga-dewata"
          />
        </section>

        <div className={styles.tridatuRibbon} />

        <WishesSection
          uniqueCode={uniqueCode}
          eventSlug={data?.event?.slug}
          defaultName={guestDisplayName !== 'Bapak / Ibu / Saudara/i' ? guestDisplayName : ''}
          initialWishes={data?.wishes?.items}
          title={data?.wishes?.title}
          description={data?.wishes?.description}
          variant="balinese"
        />

        <div className={styles.tridatuRibbon} />

        {/* SECTION 08: CLOSING MATUR SUKSMA & OM SHANTI */}
        <footer id="closing" className={styles.closingSection}>
          <div className={styles.closingRadialBg} />
          <div className={styles.closingInner}>
            <LotusPadmaSvg className={styles.closingLotus} />

            <p className={`${styles.aksaraSacred} ${styles.closingAksara}`}>
              ᬒᬁ ᬰᬵᬦ᭄ᬢᬶᬄ ᬰᬵᬦ᭄ᬢᬶᬄ ᬰᬵᬦ᭄ᬢᬶᬄ ᬒᬁ
            </p>
            <h2
              className={`${styles.closingTitle} ${styles.pradaShimmerText}`}
            >
              Matur Suksma
            </h2>
            <p className={styles.closingMessage}>{content.closingMessage}</p>

            <div className={styles.closingOmShantiPill}>
              <p className={styles.closingOmShantiText}>
                Om Shanti, Shanti, Shanti Om
              </p>
            </div>

            <div>
              <p
                className={`${styles.closingCoupleTitle} ${styles.pradaShimmerText}`}
              >
                {content.partnerOneName} &amp; {content.partnerTwoName}
              </p>
              <p className={styles.closingSubcaption}>
                Swarga Dewata • Karya Pawiwahan Agung Bali
              </p>
            </div>
          </div>
        </footer>
      </main>

      {/* FLOATING BOTTOM NAVIGATION BAR */}
      <nav className={styles.bottomNav} aria-label="Navigasi Undangan">
        <div className={styles.bottomNavInner}>
          <button
            type="button"
            onClick={() => scrollToSection('hero')}
            className={styles.bottomNavLink}
          >
            Puri
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('mempelai')}
            className={styles.bottomNavLink}
          >
            Mempelai
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('acara')}
            className={styles.bottomNavLink}
          >
            Karya
          </button>
          <button
            type="button"
            onClick={() =>
              scrollToSection(
                media.galleryPhotos && media.galleryPhotos.length > 0
                  ? 'galeri'
                  : 'kisah'
              )
            }
            className={styles.bottomNavLink}
          >
            Galeri
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('wishes')}
            className={styles.bottomNavLink}
          >
            Doa
          </button>
          <button
            type="button"
            onClick={() =>
              scrollToSection(showRsvpAndQr ? 'rsvp' : 'prada-dana')
            }
            className={styles.bottomNavCta}
          >
            <span className={styles.navCtaLong}>
              {showRsvpAndQr ? 'RSVP & QR' : 'Hadiah'}
            </span>
            <span className={styles.navCtaShort}>
              {showRsvpAndQr ? 'RSVP' : 'Hadiah'}
            </span>
          </button>
        </div>
      </nav>

      {/* LIGHTBOX MODAL */}
      {lightboxIndex !== null && media.galleryPhotos[lightboxIndex] && (
        <div
          className={styles.lightboxOverlay}
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau Potret Galeri"
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className={styles.lightboxCloseBtn}
            aria-label="Tutup Galeri"
          >
            ✕
          </button>
          <div
            className={styles.lightboxInner}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.lightboxFrame}>
              <img
                src={media.galleryPhotos[lightboxIndex]}
                alt={
                  GALLERY_CAPTIONS[lightboxIndex % GALLERY_CAPTIONS.length]
                }
                className={styles.lightboxImg}
              />
            </div>
            <p className={styles.lightboxTitle}>
              {GALLERY_CAPTIONS[lightboxIndex % GALLERY_CAPTIONS.length]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SwargaDewataRenderer;
