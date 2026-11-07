/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { RendererProps } from '../registry';
import { RsvpForm } from '../../components/rsvp-form';
import QRDisplay from '../../components/QRDisplay';
import { getCanonicalInvitationUrl } from '../../utils/url';
import {
  adaptKusumaParahyanganContent,
  adaptKusumaParahyanganMedia,
} from './kusuma-parahyangan.adapter';
import { shouldRenderSereneGuest, shouldRenderRsvpAndQr } from '../mode-gating';
import {
  formatCeremonyDate,
  formatCeremonyTimeRange,
  parseTargetEpoch,
} from '../datetime-formatter';
import { SundaneseKecapiSynth } from './audio-synth';
import {
  BaleJulangNgapak,
  SigerCrown,
  RonceMelatiStrand,
  RonceMelatiShort,
  PortraitMelatiStrand,
  PayungAgung,
  LawangValance,
  HeroMelatiFrame,
  HeroWaveDivider,
  KujangSigerDivider,
  MiniSigerCrown,
  MiniBendo,
  MerakNgibingFan,
  DagoPakarVectorMap,
} from './ornaments';
import s from './kusuma-parahyangan.module.css';

function mediaSrc(src: string | undefined, isPreview: boolean) {
  if (!src) return undefined;
  if (isPreview && /^blob:https?:\/\//.test(src)) return src;
  if (!src.startsWith('/') || src.startsWith('//') || /[\\\u0000-\u0020]/.test(src)) return undefined;
  return isPreview || src.startsWith('/api-proxy') ? src : `/api-proxy${src}`;
}

interface WishEntry {
  name: string;
  status: string;
  message: string;
  time: string;
}

const INITIAL_WISHES: WishEntry[] = [
  {
    name: 'Kang Ridwan & Teh Atalia',
    status: 'Hadir — Akad & Upacara Adat',
    message:
      'Wilujeng ngambah sagara rumah tangga Neng Citra & Kang Galih. Mugia janten kulawarga anu sakinah, mawaddah, warahmah, ka cai jadi saleuwi ka darat jadi salogak.',
    time: 'Baru saja',
  },
  {
    name: 'Teh Dinda Permatasari',
    status: 'Hadir — Resepsi Walimahan',
    message:
      'MasyaAllah nuansa adat Sunda Julang Ngapak dan Siger Kencana-nya terasa hidup banget! Lancar sampai hari H ya Citra dan Galih.',
    time: '10 menit lalu',
  },
  {
    name: 'Kulawarga Besar H. Ahmad Sobari',
    status: 'Hadir — Akad & Upacara Adat',
    message:
      'Mugia salawasna aya dina panangtayungan Gusti Nu Maha Suci. Sampai jumpa di Bale Julang Ngapak Parahyangan.',
    time: '1 jam lalu',
  },
];

const GALLERY_CAPTIONS = [
  'Janji Suci di Bale Parahyangan',
  'Keanggunan Mahkota Siger & Ronce Melati',
  'Wibawa Beskap Putih & Bendo Sunda',
  'Arsitektur Bale Julang Ngapak & Payung Agung',
];

export default function KusumaParahyanganRenderer({
  data,
  uniqueCode,
  canonicalUrl,
  mode = 'PUBLIC',
  isPreview = false,
}: RendererProps) {
  const content = adaptKusumaParahyanganContent(data.event?.content, data.event?.title);
  const media = adaptKusumaParahyanganMedia(data.mediaBySlot, data.media);

  const [opened, setOpened] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Interactive wishes & demo RSVP state
  const [wishes, setWishes] = useState<WishEntry[]>(INITIAL_WISHES);
  const [demoGuestName, setDemoGuestName] = useState('Raden Bagus Pratama');
  const [demoAttendance, setDemoAttendance] = useState('Hadir — Akad & Upacara Adat');
  const [demoGuestCount, setDemoGuestCount] = useState('2 Orang (Berpasangan)');
  const [demoWishText, setDemoWishText] = useState(
    'Wilujeng ngambah sagara rumah tangga. Mugia runtut raut sauyunan, ka cai jadi saleuwi ka darat jadi salogak.',
  );

  const synthRef = useRef<SundaneseKecapiSynth | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const guestVisible = shouldRenderSereneGuest(mode, data.guest);
  const showRsvpAndQr = shouldRenderRsvpAndQr(mode, uniqueCode, isPreview);

  const decorBgSrc = '/templates/kusuma-parahyangan/decor-sunda-demo.webp';
  const heroSrc =
    mediaSrc(media.hero?.src, isPreview) ||
    '/templates/kusuma-parahyangan/couple-sunda-demo.webp';
  const brideSrc =
    mediaSrc(media.bride?.src, isPreview) ||
    '/templates/kusuma-parahyangan/bride-sunda-demo.webp';
  const groomSrc =
    mediaSrc(media.groom?.src, isPreview) ||
    '/templates/kusuma-parahyangan/groom-sunda-demo.webp';
  const customAudioSrc = mediaSrc(media.bgMusic?.src, isPreview);

  const rawGallery = media.gallery
    .map((photo) => mediaSrc(photo.src, isPreview))
    .filter((src): src is string => Boolean(src));

  const galleryImages = useMemo(() => {
    return rawGallery.length > 0
      ? rawGallery
      : [
          '/templates/kusuma-parahyangan/gallery-1.webp',
          '/templates/kusuma-parahyangan/gallery-2.webp',
          '/templates/kusuma-parahyangan/gallery-3.webp',
          '/templates/kusuma-parahyangan/gallery-4.webp',
        ];
  }, [rawGallery]);

  const guestName =
    guestVisible && data.guest?.name
      ? data.guest.name
      : 'Keluarga Besar & Sahabat Terkasih';
  const guestGreeting = data.guest?.customGreeting || 'Di Tempat';

  // Target event date for countdown
  const targetEpoch = useMemo(() => {
    const rawEpoch = parseTargetEpoch(
      data.event?.eventDate,
      content.ceremonies?.[0]?.startDateTime,
    );
    return rawEpoch ?? Date.now() + 1000 * 60 * 60 * 24 * 98;
  }, [data.event?.eventDate, content.ceremonies]);

  const [timeLeft, setTimeLeft] = useState({
    days: 98,
    hours: 18,
    minutes: 42,
    seconds: 15,
  });

  useEffect(() => {
    if (!targetEpoch) return;
    const calculate = () => {
      const now = Date.now();
      const diff = Math.max(0, targetEpoch - now);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [targetEpoch]);

  useEffect(() => {
    synthRef.current = new SundaneseKecapiSynth();
    return () => {
      synthRef.current?.stop();
      if (audioElRef.current) {
        audioElRef.current.pause();
      }
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3400);
  };

  const handleOpenInvitation = () => {
    setOpened(true);

    if (customAudioSrc && audioElRef.current) {
      audioElRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else if (synthRef.current) {
      const started = synthRef.current.start();
      setIsPlaying(started);
    }
  };

  const handleReplayGate = () => {
    setOpened(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleAudio = () => {
    if (customAudioSrc && audioElRef.current) {
      if (isPlaying) {
        audioElRef.current.pause();
        setIsPlaying(false);
        showToast('Musik Kacapi Suling dihentikan sementara');
      } else {
        audioElRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            showToast('Memutar Kacapi Suling Sunda (Laras Degung)');
          })
          .catch(() => setIsPlaying(false));
      }
    } else if (synthRef.current) {
      const active = synthRef.current.toggle();
      setIsPlaying(active);
      showToast(
        active
          ? 'Memutar Kacapi Suling Sunda (Laras Degung)'
          : 'Musik Kacapi Suling dihentikan sementara',
      );
    }
  };

  // Jasmine & Sawer Golden Flakes Canvas Particle Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles = Array.from({ length: 28 }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 3 + Math.random() * 4,
      vy: 0.45 + Math.random() * 0.75,
      vx: -0.3 + Math.random() * 0.6,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.025,
      isSawerGold: i % 3 === 0,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.angle) * 0.3;
        p.angle += p.spin;

        if (p.y > h + 20) {
          p.y = -15;
          p.x = Math.random() * w;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        if (p.isSawerGold) {
          ctx.fillStyle = 'rgba(212, 155, 53, 0.65)';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r * 0.45, p.r * 0.9, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(252, 248, 242, 0.85)';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r * 0.75, p.r * 1.3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const copyToClipboard = (text: string, customToast?: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        void navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement('textarea');
        area.value = text;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
    } catch {
      // Fallback ignored
    }
    showToast(customToast || 'Berhasil disalin ke clipboard!');
  };

  const handleDemoRsvpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = demoGuestName.trim() || 'Tamu Undangan';
    const trimmedWish = demoWishText.trim();
    if (trimmedWish) {
      setWishes((prev) => [
        {
          name: trimmedName,
          status: demoAttendance,
          message: trimmedWish,
          time: 'Baru saja',
        },
        ...prev,
      ]);
    }
    showToast(
      `Konfirmasi RSVP & Tiket QR atas nama ${trimmedName} berhasil diperbarui!`,
    );
  };

  const effectiveCanonicalUrl =
    canonicalUrl ||
    (uniqueCode ? getCanonicalInvitationUrl(uniqueCode) : null) ||
    'https://irvite.id/i/SIMULASI-TAMU';

  const primaryCeremony = content.ceremonies?.[0];
  const secondaryCeremony = content.ceremonies?.[1];
  const formattedPrimaryDate = primaryCeremony?.startDateTime
    ? formatCeremonyDate(primaryCeremony.startDateTime, content.timeZone)
    : 'Sabtu, 14 Februari 2027';
  const mainVenueName =
    primaryCeremony?.venue || 'Bale Julang Ngapak Parahyangan';
  const mainVenueAddress =
    primaryCeremony?.address ||
    'Jl. Raya Resort Dago Pakar No. 88, Ciburial, Kec. Cimenyan, Kabupaten Bandung, Jawa Barat 40198';
  const mainMapsUrl =
    primaryCeremony?.mapsUrl ||
    'https://www.google.com/maps/search/?api=1&query=Dago+Pakar+Bandung';

  return (
    <div className={s.wrapper}>
      {customAudioSrc && (
        <audio ref={audioElRef} src={customAudioSrc} loop preload="auto" />
      )}

      {/* FLOATING JASMINE BUDS & SAWER GOLDEN SPARKLE CANVAS */}
      <canvas ref={canvasRef} className={s.particleCanvas} aria-hidden="true" />

      {/* TOAST NOTIFICATION BANNER */}
      {toastMessage && (
        <div className={s.toastBanner} role="status" aria-live="polite">
          <span className={s.toastSparkle}>✦</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* OPENING GATE OVERLAY (LAWANG SAKETENG SUNDA & TIRAI MELATI)    */}
      {/* ============================================================== */}
      <div
        className={`${s.gateOverlay} ${opened ? s.gateOpen : ''}`}
        role="dialog"
        aria-label="Pintu Pembuka Undangan"
      >
        {/* Top Hanging Ronce Melati Garland Valance Across Gate */}
        <div className={s.gateTopValance}>
          <LawangValance className={s.valanceSvg} />
        </div>

        {/* Left Gate Door (Gebyok Jati & Bilik Bambu Kiri) */}
        <div className={s.gateDoorLeft}>
          <div
            className={s.gateDoorBgImage}
            style={{ backgroundImage: `url('${decorBgSrc}')` }}
          />
          <div className={s.gateDoorLeftGrad} />

          <div className={s.gateMelatiRow}>
            <RonceMelatiStrand className={`${s.melatiLongSvg} ${s.swayMelati}`} />
            <RonceMelatiShort className={`${s.melatiShortSvg} ${s.swayMelatiAlt}`} />
          </div>

          <div className={s.gatePayungLeft}>
            <PayungAgung className={s.payungSvg} />
          </div>
        </div>

        {/* Right Gate Door (Gebyok Jati & Bilik Bambu Kanan) */}
        <div className={s.gateDoorRight}>
          <div
            className={s.gateDoorBgImage}
            style={{ backgroundImage: `url('${decorBgSrc}')` }}
          />
          <div className={s.gateDoorRightGrad} />

          <div className={s.gateMelatiRow}>
            <RonceMelatiShort className={`${s.melatiShortSvg} ${s.swayMelati}`} />
            <RonceMelatiStrand className={`${s.melatiLongSvg} ${s.swayMelatiAlt}`} />
          </div>

          <div className={s.gatePayungRight}>
            <PayungAgung className={`${s.payungSvg} ${s.payungMirror}`} />
          </div>
        </div>

        {/* Gate Center Medallion: Siger Sunda Kencana & Julang Ngapak Roof */}
        <div className={s.gateCenterContent}>
          <div className={s.gateSigerWrap}>
            <SigerCrown
              className={`${s.gateSigerSvg} ${s.sigerCrownAnim}`}
              pinClassName={s.kembangGoyangPin}
            />
          </div>

          <p className={s.gateAksara}>ᮝᮤᮜᮥᮏᮨᮀ ᮞᮥᮙ᮪ᮕᮤᮀ</p>
          <p className={s.gateSubtitle}>
            Wilujeng Sumping • Walimatul Ursy Adat Sunda
          </p>

          <h1 className={s.gateTitle}>
            {content.partnerOneName}{' '}
            <span className={`${s.goldText} ${s.fontEditorial}`}>&amp;</span>{' '}
            {content.partnerTwoName}
          </h1>
          <p className={s.gateDateVenue}>
            {formattedPrimaryDate} • {mainVenueName}
          </p>

          <div className={s.gateGuestCard}>
            <p className={s.gateGuestLabel}>
              Kahatur Bapak/Ibu/Saderek Hormateun
            </p>
            <p className={s.gateGuestName}>{guestName}</p>
            <p className={s.gateGuestPlace}>{guestGreeting}</p>
          </div>

          <button
            type="button"
            onClick={handleOpenInvitation}
            className={s.gateOpenBtn}
          >
            <span>Buka Lawang Kabagjaan</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: HERO                                                */}
      {/* ============================================================== */}
      <section id="hero" className={s.heroSection}>
        <div className={s.heroBgWrap}>
          <img
            src={decorBgSrc}
            alt="Bale Julang Ngapak Parahyangan"
            className={s.heroBgImg}
          />
          <div className={s.heroBgOverlay} />
        </div>

        <div className={s.heroTopFrame}>
          <HeroMelatiFrame className={s.heroTopSvg} />
        </div>

        <div className={s.heroCenter}>
          <p className={s.heroAksara}>ᮕᮝᮤᮝᮠᮔ᮪ ᮃᮓᮒ᮪ ᮞᮥᮔ᮪ᮓ</p>
          <div className={s.heroBadgePill}>
            <span>✦</span>
            <span>Walimatul Ursy • Adat Sunda Priangan</span>
            <span>✦</span>
          </div>

          <div className={s.heroCrestWrap}>
            <BaleJulangNgapak className={s.heroCrestSvg} />
          </div>

          <h2 className={s.heroCoupleTitle}>
            {content.partnerOneName}{' '}
            <span className={`${s.heroAmpersand} ${s.goldText}`}>&amp;</span>{' '}
            {content.partnerTwoName}
          </h2>

          <p className={s.heroQuoteSunda}>
            “
            {content.openingGreeting ||
              'Silih asih, silih asah, silih asuh — ngambah sagara rumah tangga dina panangtayungan Gusti.'}
            ”
          </p>
          <p className={s.heroQuoteIndo}>
            Saling mengasihi, saling mencerdaskan, dan saling menjaga dalam
            kehangatan adat Pasundan.
          </p>

          {/* Couple Portrait Framed with Siger Arch & Swaying Melati */}
          <div className={s.heroPortraitContainer}>
            <PortraitMelatiStrand
              className={`${s.heroMelatiLeft} ${s.swayMelati}`}
            />
            <PortraitMelatiStrand
              className={`${s.heroMelatiRight} ${s.swayMelatiAlt}`}
            />

            <div className={s.heroPortraitFrame}>
              <img
                src={heroSrc}
                alt={`${content.partnerOneName} & ${content.partnerTwoName}`}
                className={s.heroPortraitImg}
              />
            </div>

            <div className={s.heroDateBadge}>{formattedPrimaryDate}</div>
          </div>

          <div className={s.heroActionRow}>
            <a href="#greeting" className={s.heroBtnPrimary}>
              Buka Rangkaian Acara ↓
            </a>
            <a href="#rsvp" className={s.heroBtnSecondary}>
              RSVP &amp; Tiket QR Tamu
            </a>
          </div>
        </div>

        <div className={s.heroWaveWrap}>
          <HeroWaveDivider className={s.heroWaveSvg} />
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 2: GREETING & MEMPELAI (MOJANG & JAJAKA)               */}
      {/* ============================================================== */}
      <section id="greeting" className={s.sectionLight}>
        <div className={s.greetingHeader}>
          <p className={s.aksaraGold}>ᮞᮙ᮪ᮕᮥᮛᮞᮥᮔ᮪</p>
          <span className={s.sectionEyebrowDark}>
            02 / SAMPURASUN &amp; PANGANTEN
          </span>

          <div className={s.kujangDividerWrap}>
            <KujangSigerDivider className={s.kujangDividerSvg} />
          </div>

          <p className={s.salamTitle}>
            Assalamu’alaikum Warahmatullahi Wabarakatuh
          </p>
          <p className={s.sampurasunQuote}>
            “Sampurasun — Rampes. Mugia rahayu sagung dumadi.”
          </p>
          <p className={s.greetingBodyText}>
            Dengan memohon rahmat dan ridho Allah SWT, serta menjunjung tinggi
            nilai luhur budaya Tatar Pasundan, kami bermaksud menyelenggarakan
            syukuran pernikahan putra-putri kami:
          </p>

          <div className={s.verseBox}>
            “
            {content.prayer ||
              'Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.'}
            ”
            <span className={s.verseRef}>— QS. Ar-Rum: 21</span>
          </div>
        </div>

        {/* Mojang & Jajaka Parahyangan Cards */}
        <div className={s.coupleGrid}>
          {/* Bride Card (Mojang Priangan) */}
          <div className={s.coupleCard}>
            <MiniSigerCrown className={s.miniCrownSvg} />

            <div className={s.personArchFrame}>
              <img
                src={brideSrc}
                alt={content.partnerOneFullName || content.partnerOneName}
                className={s.personImg}
              />
            </div>

            <span className={s.personRolePill}>Mojang Panganten</span>
            <h3 className={s.personFullName}>
              {content.partnerOneFullName || content.partnerOneName}
            </h3>
            <p className={s.personFamilyText}>
              {content.partnerOneFamily ||
                'Putri Cikal ti Pasangan Bapak H. Dedi Kusnandar & Ibu Hj. Ratna Ningrum (Kulawarga Ageng Sumedang Larang & Bandung)'}
            </p>
            <div className={s.personSocialFooter}>
              <span className={s.personSocialBadge}>
                <span>✦</span>
                <span>Mempelai Istri</span>
              </span>
            </div>
          </div>

          {/* Groom Card (Jajaka Pasundan) */}
          <div className={s.coupleCard}>
            <MiniBendo className={s.miniCrownSvg} />

            <div className={s.personArchFrame}>
              <img
                src={groomSrc}
                alt={content.partnerTwoFullName || content.partnerTwoName}
                className={s.personImg}
              />
            </div>

            <span className={s.personRolePill}>Jajaka Panganten</span>
            <h3 className={s.personFullName}>
              {content.partnerTwoFullName || content.partnerTwoName}
            </h3>
            <p className={s.personFamilyText}>
              {content.partnerTwoFamily ||
                'Putra Kadua ti Pasangan Bapak Ir. H. Suryono Wibowo & Ibu Hj. Dewi Sartika (Kulawarga Ageng Galuh Ciamis & Bogor)'}
            </p>
            <div className={s.personSocialFooter}>
              <span className={s.personSocialBadge}>
                <span>✦</span>
                <span>Mempelai Pameget</span>
              </span>
            </div>
          </div>
        </div>

        {/* Lalakon Asih (Tahapan Adat Pernikahan Sunda) */}
        <div className={`${s.lalakonBox} ${s.bgJatiUkir}`}>
          <div className={s.lalakonHeader}>
            <span className={s.lalakonEyebrow}>Lalakon Cinta Tatar Sunda</span>
            <h3 className={s.lalakonTitle}>
              Rangkaian Tradisi Menuju Pelaminan
            </h3>
          </div>

          <div className={s.lalakonGrid}>
            <div className={s.lalakonStepCard}>
              <span className={s.lalakonStepNum}>01 • Neundeun Omong</span>
              <h4 className={s.lalakonStepTitle}>
                Pertemuan di Bumi Priangan
              </h4>
              <p className={s.lalakonStepDesc}>
                Berawal dari silaturahmi hangat keluarga di Bandung, niat baik
                disimpan dalam hati hingga tiba waktunya menyatukan dua keluarga
                besar.
              </p>
            </div>

            <div className={s.lalakonStepCard}>
              <span className={s.lalakonStepNum}>
                02 • Narosan &amp; Ngeuyeuk Seureuh
              </span>
              <h4 className={s.lalakonStepTitle}>Petuah Luhur Sepuh</h4>
              <p className={s.lalakonStepDesc}>
                Melalui prosesi lamaran (Narosan) dan Ngeuyeuk Seureuh, kami
                menerima wejangan hidup rukun ka cai jadi saleuwi, ka darat jadi
                salogak.
              </p>
            </div>

            <div className={s.lalakonStepCard}>
              <span className={s.lalakonStepNum}>
                03 • Mapag &amp; Sawer Panganten
              </span>
              <h4 className={s.lalakonStepTitle}>
                Ikrar Suci Sehidup Semati
              </h4>
              <p className={s.lalakonStepDesc}>
                Di bawah naungan Payung Agung kuning keemasan dan taburan beras
                kuning Sawer Panganten, kami melangkah menuju bahtera rumah
                tangga.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 3: EVENT DETAILS (WAKTOS & TEMPAT PAWIWAHAN)           */}
      {/* ============================================================== */}
      <section id="eventDetails" className={`${s.sectionDarkFull} ${s.bgJatiUkir}`}>
        <div className={s.containerMax5xl}>
          <div className={s.sectionHeaderCenter}>
            <p className={s.aksaraLight}>ᮝᮊ᮪ᮒᮥ ᮞᮛᮨᮀ ᮒᮨᮙ᮪ᮕᮒ᮪</p>
            <span className={s.sectionEyebrowGold}>
              03 / RANGKAIAN PROSESI ADAT SUNDA
            </span>
            <h2 className={s.sectionTitleLight}>Waktos &amp; Tempat Pawiwahan</h2>
            <p className={s.sectionDescLight}>
              Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila
              Bapak/Ibu/Saderek berkenan hadir memberikan doa restu pada:
            </p>
          </div>

          <div className={s.eventsGrid3}>
            {/* Card 1: Akad Nikah */}
            <div className={s.eventCardRegular}>
              <div>
                <div className={s.eventCardTopBar}>
                  <span className={s.eventBadgeRegular}>Sesi I • Sakral</span>
                  <span className={s.eventIconTop}>✦</span>
                </div>
                <h3 className={s.eventCardTitle}>
                  {primaryCeremony?.title || 'Akad Nikah'}
                </h3>
                <p className={s.eventCardSub}>
                  Mapag Panganten, Ijab Qabul &amp; Sungkeman
                </p>
                <div className={s.eventMetaList}>
                  <p className={s.eventMetaItem}>
                    <span className={s.eventMetaIcon}>📅</span>
                    <span>{formattedPrimaryDate}</span>
                  </p>
                  <p className={s.eventMetaItem}>
                    <span className={s.eventMetaIcon}>🕗</span>
                    <span>
                      {primaryCeremony?.startDateTime
                        ? formatCeremonyTimeRange(
                            primaryCeremony.startDateTime,
                            primaryCeremony.endDateTime,
                            content.timeZone,
                          )
                        : '08.00 – 10.00 WIB'}
                    </span>
                  </p>
                  <p className={s.eventMetaItem}>
                    <span className={s.eventMetaIcon}>📍</span>
                    <span>
                      {mainVenueName}
                      {primaryCeremony?.address
                        ? `, ${primaryCeremony.address}`
                        : ', Dago Pakar, Bandung'}
                    </span>
                  </p>
                </div>
              </div>
              <a href="#location" className={s.eventBtnOutline}>
                Lihat Lokasi Bale
              </a>
            </div>

            {/* Card 2: Upacara Adat Sunda (Sawer, Nincak Endog, Huap Lingkung) */}
            <div className={s.eventCardFeatured}>
              <div>
                <div className={s.eventCardTopBar}>
                  <span className={s.eventBadgeFeatured}>
                    Sesi II • Puncak Adat
                  </span>
                  <span className={s.eventIconTop}>👑</span>
                </div>
                <h3 className={s.eventCardTitle}>Upacara Adat Sunda</h3>
                <p className={s.eventCardSub}>
                  Sawer Panganten, Nincak Endog, Peupeus Kendi &amp; Huap Lingkung
                </p>
                <div className={s.eventMetaList}>
                  <p className={s.eventMetaItem}>
                    <span className={s.eventMetaIcon}>📅</span>
                    <span>{formattedPrimaryDate}</span>
                  </p>
                  <p className={s.eventMetaItem}>
                    <span className={s.eventMetaIcon}>🕙</span>
                    <span>10.00 – 11.30 WIB</span>
                  </p>
                  <p className={s.eventMetaItem}>
                    <span className={s.eventMetaIcon}>🎶</span>
                    <span>
                      Diiringi Kidung Sawer, Tari Merak &amp; Gamelan Degung
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Resepsi Walimatul Ursy */}
            <div className={s.eventCardRegular}>
              <div>
                <div className={s.eventCardTopBar}>
                  <span className={s.eventBadgeRegular}>
                    Sesi III • Walimahan
                  </span>
                  <span className={s.eventIconTop}>✦</span>
                </div>
                <h3 className={s.eventCardTitle}>
                  {secondaryCeremony?.title || 'Resepsi Pernikahan'}
                </h3>
                <p className={s.eventCardSub}>
                  Jamuan Kasih Tatamu &amp; Kesenian Kacapi Suling
                </p>
                <div className={s.eventMetaList}>
                  <p className={s.eventMetaItem}>
                    <span className={s.eventMetaIcon}>📅</span>
                    <span>
                      {secondaryCeremony?.startDateTime
                        ? formatCeremonyDate(
                            secondaryCeremony.startDateTime,
                            content.timeZone,
                          )
                        : formattedPrimaryDate}
                    </span>
                  </p>
                  <p className={s.eventMetaItem}>
                    <span className={s.eventMetaIcon}>🕚</span>
                    <span>
                      {secondaryCeremony?.startDateTime
                        ? formatCeremonyTimeRange(
                            secondaryCeremony.startDateTime,
                            secondaryCeremony.endDateTime,
                            content.timeZone,
                          )
                        : '11.30 – 14.30 WIB'}
                    </span>
                  </p>
                  <p className={s.eventMetaItem}>
                    <span className={s.eventMetaIcon}>📍</span>
                    <span>
                      {secondaryCeremony?.venue ||
                        'Pendopo Agung Julang Ngapak, Bandung'}
                    </span>
                  </p>
                </div>
              </div>
              <a href="#location" className={s.eventBtnOutline}>
                Petunjuk Peta
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 4: COUNTDOWN                                           */}
      {/* ============================================================== */}
      <section id="countdown" className={s.countdownSection}>
        <div className={s.countdownCard}>
          <span className={s.eyebrowBrown}>04 / BILANGAN WAKTOS KABAGJAAN</span>
          <h3 className={s.countdownHeading}>Menuju Hari Penyatuan Dua Hati</h3>

          <div className={s.countdownGrid}>
            <div className={s.countdownTile}>
              <span className={s.countdownNumber}>
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span className={s.countdownUnit}>Dinten (Hari)</span>
            </div>
            <div className={s.countdownTile}>
              <span className={s.countdownNumber}>
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className={s.countdownUnit}>Jam</span>
            </div>
            <div className={s.countdownTile}>
              <span className={s.countdownNumber}>
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className={s.countdownUnit}>Menit</span>
            </div>
            <div className={s.countdownTile}>
              <span className={s.countdownNumber}>
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className={s.countdownUnit}>Detik</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              showToast('Pengingat acara berhasil ditambahkan ke kalender Anda!')
            }
            className={s.saveCalendarBtn}
          >
            + Simpan Tanggal ke Kalender
          </button>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 5: GALLERY                                             */}
      {/* ============================================================== */}
      <section id="gallery" className={s.gallerySection}>
        <div className={s.galleryHeader}>
          <span className={s.eyebrowBrown}>05 / GALERI PANINEUNGAN</span>
          <h2 className={s.sectionTitleBrown}>Potret Kasih Parahyangan</h2>
          <p className={s.sectionDescBrown}>
            Klik pada potret untuk melihat tampilan penuh dalam bingkai Siger
            Kencana.
          </p>
        </div>

        <div className={s.galleryGrid}>
          {galleryImages.map((src, i) => (
            <div
              key={i}
              onClick={() => setLightbox(i)}
              className={s.galleryCard}
            >
              <img
                src={src}
                alt={GALLERY_CAPTIONS[i] || `Potret ${i + 1}`}
                className={s.galleryImg}
              />
              <div className={s.galleryOverlay}>
                <span className={s.galleryCaption}>
                  {GALLERY_CAPTIONS[i] || 'Potret Kusuma Parahyangan'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 6: LOCATION                                            */}
      {/* ============================================================== */}
      <section id="location" className={s.locationSection}>
        <div className={s.locationSplitCard}>
          <div className={s.locationInfoCol}>
            <span className={s.eyebrowBrown}>06 / PETA &amp; TEMPAT ACARA</span>
            <h3 className={s.locationVenueTitle}>{mainVenueName}</h3>
            <p className={s.locationAddressText}>{mainVenueAddress}</p>
            <div className={s.locationNoteBox}>
              <p className={s.locationNoteTitle}>
                Penyambutan Tamu (Lengser &amp; Pager Ayu):
              </p>
              <p className={s.locationNoteBody}>
                Tersedia layanan parkir valet di Pelataran Bale Timur serta
                penyambutan kesenian Angklung Buncis &amp; Kacapi Suling.
              </p>
            </div>
            <div className={s.locationBtnGroup}>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    mainVenueAddress,
                    'Alamat lokasi berhasil disalin!',
                  )
                }
                className={s.btnSolidBrown}
              >
                Salin Alamat Lengkap
              </button>
              <a
                href={mainMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={s.btnOutlineBrown}
              >
                Buka Google Maps ↗
              </a>
            </div>
          </div>

          <div className={s.locationMapCol}>
            <div className={s.locationMapHeader}>
              <span className={s.locationMapLabel}>
                Peta Rute Kawasan — {mainVenueName}
              </span>
              <span className={s.locationMapBadge}>Lokasi Utama Pawiwahan</span>
            </div>
            <DagoPakarVectorMap
              className={s.vectorMapSvg}
              venueTitle={mainVenueName}
              venueSubtitle="Titik Lokasi Akad & Upacara Adat Sunda"
            />
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 7 & 8: RSVP, GUEST QR & AMPLOP DIGITAL                 */}
      {/* ============================================================== */}
      <section id="rsvp" className={s.rsvpSection}>
        <div className={s.galleryHeader}>
          <span className={s.eyebrowBrown}>
            07 &amp; 08 / KONFIRMASI &amp; TIKET QR TAMU
          </span>
          <h2 className={s.sectionTitleBrown}>RSVP &amp; Tiket Registrasi</h2>
          <p className={s.sectionDescBrown}>
            Silakan isi konfirmasi kehadiran dan doa pangjajap untuk memperbarui
            Tiket QR Check-in Anda.
          </p>
        </div>

        <div className={s.rsvpSplitGrid}>
          {/* Left Column: RSVP Form + Live Wishes */}
          <div className={s.rsvpCard}>
            <h3 className={s.rsvpCardTitle}>Formulir Konfirmasi Kehadiran</h3>

            {showRsvpAndQr ? (
              <RsvpForm
                key={uniqueCode || 'preview-rsvp'}
                uniqueCode={uniqueCode || 'simulasi-tamu'}
                maxPax={data.guest?.maxPax || 2}
                initialRsvp={
                  data.rsvp || { canRespond: true, response: 'PENDING', pax: 1 }
                }
              />
            ) : (
              <form onSubmit={handleDemoRsvpSubmit} className={s.demoForm}>
                <div>
                  <label htmlFor="demoGuestName" className={s.formLabel}>
                    Nama Lengkap Tamu
                  </label>
                  <input
                    id="demoGuestName"
                    type="text"
                    required
                    value={demoGuestName}
                    onChange={(e) => setDemoGuestName(e.target.value)}
                    className={s.formInput}
                    placeholder="Masukkan nama lengkap Anda"
                  />
                </div>

                <div className={s.formFieldRow2}>
                  <div>
                    <label htmlFor="demoAttendance" className={s.formLabel}>
                      Status Kehadiran
                    </label>
                    <select
                      id="demoAttendance"
                      value={demoAttendance}
                      onChange={(e) => setDemoAttendance(e.target.value)}
                      className={s.formSelect}
                    >
                      <option value="Hadir — Akad & Upacara Adat">
                        Hadir — Akad &amp; Upacara Adat
                      </option>
                      <option value="Hadir — Resepsi Walimahan">
                        Hadir — Resepsi Walimahan
                      </option>
                      <option value="Berhalangan Hadir (Kirim Doa)">
                        Berhalangan Hadir (Kirim Doa)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="demoGuestCount" className={s.formLabel}>
                      Jumlah Tamu
                    </label>
                    <select
                      id="demoGuestCount"
                      value={demoGuestCount}
                      onChange={(e) => setDemoGuestCount(e.target.value)}
                      className={s.formSelect}
                    >
                      <option value="1 Orang">1 Orang</option>
                      <option value="2 Orang (Berpasangan)">
                        2 Orang (Berpasangan)
                      </option>
                      <option value="3 Orang (Keluarga)">
                        3 Orang (Keluarga)
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="demoWishMessage" className={s.formLabel}>
                    Doa &amp; Pangjajap Panganten
                  </label>
                  <textarea
                    id="demoWishMessage"
                    rows={3}
                    required
                    value={demoWishText}
                    onChange={(e) => setDemoWishText(e.target.value)}
                    className={s.formTextarea}
                    placeholder="Tuliskan doa restu terbaik untuk kedua mempelai..."
                  />
                </div>

                <button type="submit" className={s.rsvpSubmitBtn}>
                  Kirim Konfirmasi &amp; Perbarui Tiket QR
                </button>
              </form>
            )}

            {/* Live Wishes Feed */}
            <div className={s.wishesSection}>
              <div className={s.wishesHeader}>
                <h4 className={s.wishesTitle}>
                  Untaian Pangjajap &amp; Doa Tamu
                </h4>
                <span className={s.wishesBadge}>{wishes.length} Ucapan</span>
              </div>
              <div className={s.wishesList}>
                {wishes.map((item, idx) => (
                  <div key={idx} className={s.wishItemCard}>
                    <div className={s.wishItemTop}>
                      <span className={s.wishAuthor}>{item.name}</span>
                      <span className={s.wishStatusPill}>{item.status}</span>
                    </div>
                    <p className={s.wishText}>{item.message}</p>
                    <span className={s.wishTime}>{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Guest QR Check-In Pass */}
          <div id="guestQr" className={`${s.qrPassCard} ${s.bgJatiUkir}`}>
            <div className={s.qrPassHeader}>
              <div>
                <span className={s.qrPassEyebrow}>
                  TIKET TATAMU PARAHYANGAN
                </span>
                <h3 className={s.qrPassTitle}>Kode QR Kehadiran</h3>
              </div>
              <span className={s.qrVerifiedBadge}>Terverifikasi</span>
            </div>

            <div className={s.qrWhiteBox}>
              <QRDisplay
                canonicalUrl={effectiveCanonicalUrl}
                guestName={showRsvpAndQr ? guestName : demoGuestName}
                maxPax={data.guest?.maxPax || 2}
                tableNumber={data.guest?.tableNumber}
              />
            </div>

            <div className={s.qrMetaTable}>
              <div className={s.qrMetaRow}>
                <span className={s.qrMetaLabel}>Nama Tamu:</span>
                <span className={s.qrMetaValueWhite}>
                  {showRsvpAndQr ? guestName : demoGuestName}
                </span>
              </div>
              <div className={s.qrMetaRow}>
                <span className={s.qrMetaLabel}>Status RSVP:</span>
                <span className={s.qrMetaValueGold}>
                  {showRsvpAndQr
                    ? data.rsvp?.response === 'YES'
                      ? 'Hadir'
                      : data.rsvp?.response === 'NO'
                        ? 'Berhalangan'
                        : 'Menunggu Konfirmasi'
                    : demoAttendance}
                </span>
              </div>
              <div className={s.qrMetaRow}>
                <span className={s.qrMetaLabel}>Kuota Kursi:</span>
                <span className={s.qrMetaValueWhite}>
                  {showRsvpAndQr
                    ? `${data.guest?.maxPax || 2} Orang`
                    : demoGuestCount}
                </span>
              </div>
              <div className={s.qrMetaRow}>
                <span className={s.qrMetaLabel}>Area Tatamu:</span>
                <span className={s.qrMetaValueGold}>
                  {data.guest?.tableNumber
                    ? `Meja ${data.guest.tableNumber}`
                    : 'Bale Utama • Parahyangan VIP'}
                </span>
              </div>
            </div>

            <p className={s.qrPassFooterNote}>
              Tunjukkan kode QR ini kepada penerima tamu (Pager Ayu &amp; Pager
              Bagus) saat tiba di lokasi acara.
            </p>
          </div>
        </div>

        {/* Tanda Kasih (Amplop Digital) */}
        {content.giftAccounts && content.giftAccounts.length > 0 && (
          <div className={s.tandaKasihCard}>
            <span className={s.eyebrowBrown}>
              TANDA KASIH &amp; AMPLOP DIGITAL
            </span>
            <h3 className={s.tandaKasihTitle}>
              {content.giftTitle || 'Kirimkan Tanda Kasih'}
            </h3>
            <p className={s.tandaKasihDesc}>
              {content.giftMessage ||
                'Doa restu Anda merupakan karunia terindah bagi kami. Namun apabila Anda ingin memberikan tanda kasih secara digital, dapat melalui rekening berikut:'}
            </p>

            <div className={s.giftAccountsGrid}>
              {content.giftAccounts.map((acc, idx) => (
                <div key={idx} className={s.tandaKasihItem}>
                  <div>
                    <span className={s.tandaKasihBankLabel}>{acc.bankName}</span>
                    <p className={s.tandaKasihAccountNum}>{acc.accountNumber}</p>
                    <p className={s.tandaKasihAccountHolder}>
                      a.n. {acc.accountHolder}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        acc.accountNumber,
                        `Nomor rekening ${acc.bankName} ${acc.accountNumber} berhasil disalin!`,
                      )
                    }
                    className={s.tandaKasihCopyBtn}
                  >
                    Salin
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* SECTION 9: CLOSING                                             */}
      {/* ============================================================== */}
      <section id="closing" className={`${s.closingSection} ${s.bgJatiUkir}`}>
        <div className={s.closingInner}>
          <div className={s.merakWrap}>
            <MerakNgibingFan className={`${s.merakSvg} ${s.merakFanAnim}`} />
          </div>

          <p className={s.aksaraLight}>ᮠᮒᮥᮁ ᮔᮥᮠᮥᮔ᮪ ᮕᮤᮞᮔ᮪</p>
          <span className={s.sectionEyebrowGold}>09 / HATUR NUHUN PISAN</span>
          <h2 className={s.closingCoupleTitle}>
            {content.partnerOneName}{' '}
            <span className={`${s.goldText} ${s.fontEditorial}`}>&amp;</span>{' '}
            {content.partnerTwoName}
          </h2>
          <p className={s.closingProverb}>
            “Cageur, Bageur, Bener, Pinter, Singer — Ka cai jadi saleuwi, ka
            darat jadi salogak.”
          </p>
          <p className={s.closingMessage}>
            {content.closing ||
              'Kehadiran serta doa restu Bapak/Ibu/Saderek merupakan kado terindah bagi perjalanan awal bahtera rumah tangga kami. Hatur nuhun pisan kana sagala kasaean sareng perhatosanana.'}
          </p>
          <p className={s.closingSalam}>
            Wassalamu’alaikum Warahmatullahi Wabarakatuh
          </p>
        </div>
      </section>

      {/* ============================================================== */}
      {/* FLOATING BOTTOM CAPSULE NAVBAR                                 */}
      {/* ============================================================== */}
      <nav className={s.bottomNav} aria-label="Navigasi Undangan">
        <a href="#hero" className={s.navLink}>
          Beranda
        </a>
        <a href="#greeting" className={s.navLink}>
          Mempelai
        </a>
        <a href="#eventDetails" className={s.navLink}>
          Acara
        </a>
        <a href="#gallery" className={s.navLink}>
          Galeri
        </a>
        <a href="#rsvp" className={s.navLinkCta}>
          RSVP &amp; QR
        </a>
        <button
          type="button"
          onClick={handleReplayGate}
          title="Ulangi Animasi Gerbang Sunda"
          className={s.navCircleBtn}
        >
          ↺
        </button>
        <button
          type="button"
          onClick={toggleAudio}
          title="Putar/Hentikan Kacapi Suling Laras Degung"
          className={s.navCircleBtn}
        >
          <span>{isPlaying ? '⏸' : '♪'}</span>
        </button>
      </nav>

      {/* ============================================================== */}
      {/* LIGHTBOX MODAL FOR GALLERY                                     */}
      {/* ============================================================== */}
      {lightbox !== null && (
        <div
          role="dialog"
          aria-label="Tinjau Foto Galeri"
          className={s.lightboxBackdrop}
          onClick={() => setLightbox(null)}
        >
          <div
            className={s.lightboxCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={s.lightboxHeader}>
              <span className={s.lightboxTitle}>
                {GALLERY_CAPTIONS[lightbox] || 'Potret Kusuma Parahyangan'}
              </span>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className={s.lightboxCloseBtn}
              >
                Tutup ✕
              </button>
            </div>
            <div className={s.lightboxBody}>
              <img
                src={galleryImages[lightbox]}
                alt={GALLERY_CAPTIONS[lightbox] || 'Preview'}
                className={s.lightboxImg}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
