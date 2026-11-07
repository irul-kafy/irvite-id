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
  PayungAgung,
  LawangValance,
} from './ornaments';
import s from './kusuma-parahyangan.module.css';

function mediaSrc(src: string | undefined, isPreview: boolean) {
  if (!src) return undefined;
  if (isPreview && /^blob:https?:\/\//.test(src)) return src;
  if (!src.startsWith('/') || src.startsWith('//') || /[\\\u0000-\u0020]/.test(src)) return undefined;
  return isPreview || src.startsWith('/api-proxy') ? src : `/api-proxy${src}`;
}

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
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const synthRef = useRef<SundaneseKecapiSynth | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const guestVisible = shouldRenderSereneGuest(mode, data.guest);
  const showRsvpAndQr = shouldRenderRsvpAndQr(mode, uniqueCode, isPreview);

  const heroSrc = mediaSrc(media.hero?.src, isPreview) || '/templates/kusuma-parahyangan/couple-sunda-demo.webp';
  const brideSrc = mediaSrc(media.bride?.src, isPreview) || '/templates/kusuma-parahyangan/bride-sunda-demo.webp';
  const groomSrc = mediaSrc(media.groom?.src, isPreview) || '/templates/kusuma-parahyangan/groom-sunda-demo.webp';
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

  const guestName = guestVisible && data.guest?.name ? data.guest.name : 'Bapak / Ibu / Saudara/i';
  const guestGreeting = data.guest?.customGreeting || 'Tamu Kahormatan';

  // Target event date for countdown
  const targetEpoch = useMemo(() => {
    const rawEpoch = parseTargetEpoch(
      data.event?.eventDate,
      content.ceremonies?.[0]?.startDateTime,
    );
    return rawEpoch ?? (Date.now() + 1000 * 60 * 60 * 24 * 45); // default fallback
  }, [data.event?.eventDate, content.ceremonies]);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
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

  // Audio Synth / Player initialization
  useEffect(() => {
    synthRef.current = new SundaneseKecapiSynth();
    return () => {
      synthRef.current?.stop();
      if (audioElRef.current) {
        audioElRef.current.pause();
      }
    };
  }, []);

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

  const toggleAudio = () => {
    if (customAudioSrc && audioElRef.current) {
      if (isPlaying) {
        audioElRef.current.pause();
        setIsPlaying(false);
      } else {
        audioElRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    } else if (synthRef.current) {
      const active = synthRef.current.toggle();
      setIsPlaying(active);
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

  const copyToClipboard = (text: string, identifier: string) => {
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
      setCopiedAccount(identifier);
      setTimeout(() => setCopiedAccount(null), 3000);
    } catch {
      // Fallback
    }
  };

  const effectiveCanonicalUrl =
    canonicalUrl ||
    (uniqueCode ? getCanonicalInvitationUrl(uniqueCode) : null) ||
    'https://irvite.id/i/SIMULASI-TAMU';

  return (
    <div className={s.wrapper}>
      {/* Background Music fallback element if custom audio configured */}
      {customAudioSrc && (
        <audio ref={audioElRef} src={customAudioSrc} loop preload="auto" />
      )}

      {/* Floating Canvas for Jasmine Petals and Sawer Beras Kuning */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-30"
        aria-hidden="true"
      />

      {/* Floating Audio Toggle Button */}
      <button
        type="button"
        onClick={toggleAudio}
        aria-label={isPlaying ? 'Jeda alunan musik' : 'Putar alunan musik'}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-[#2c180b]/90 hover:bg-[#4a2c18] border border-[#d49b35]/70 text-[#fcf8f2] px-3.5 py-2.5 rounded-full shadow-2xl backdrop-blur-md transition-all active:scale-95"
      >
        <span className="text-lg leading-none">{isPlaying ? '🎵' : '🔇'}</span>
        <span className="text-xs font-medium text-[#f3d28a] hidden sm:inline">
          {isPlaying ? 'Laras Degung' : 'Mute'}
        </span>
      </button>

      {/* ============================================================== */}
      {/* OPENING GATE OVERLAY (LAWANG SAKETENG SUNDA & GEBYOK PASUNDAN)  */}
      {/* ============================================================== */}
      <div
        className={`${s.gateOverlay} ${opened ? s.gateOpen : ''}`}
        role="dialog"
        aria-label="Pintu Pembuka Undangan"
      >
        {/* Top Scalloped Garland */}
        <div className={`${s.gateTopValance} absolute top-0 inset-x-0 z-30 pointer-events-none flex justify-between items-start overflow-hidden px-2`}>
          <LawangValance className="w-full h-32 sm:h-44 text-[#f3d28a]" />
        </div>

        {/* Left Gate Door */}
        <div
          className={`${s.gateDoorLeft} absolute inset-y-0 left-0 w-1/2 bg-[#2c180b] border-r-2 border-[#d49b35]/60 overflow-hidden flex flex-col justify-between p-6`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#1f1006] via-[#2c180b]/90 to-[#4a2c18]/85" />
          <div className="relative z-10 flex justify-around items-start pt-6 pointer-events-none">
            <RonceMelatiStrand className={`w-14 sm:w-16 h-56 sm:h-64 ${s.swayMelati}`} />
          </div>
          <div className="relative z-10 mt-auto opacity-50 hidden sm:block">
            <PayungAgung className="w-32 h-32 text-[#d49b35]" />
          </div>
        </div>

        {/* Right Gate Door */}
        <div
          className={`${s.gateDoorRight} absolute inset-y-0 right-0 w-1/2 bg-[#2c180b] border-l-2 border-[#d49b35]/60 overflow-hidden flex flex-col justify-between p-6`}
        >
          <div className="absolute inset-0 bg-gradient-to-l from-[#1f1006] via-[#2c180b]/90 to-[#4a2c18]/85" />
          <div className="relative z-10 flex justify-around items-start pt-6 pointer-events-none">
            <RonceMelatiStrand className={`w-14 sm:w-16 h-56 sm:h-64 ${s.swayMelatiAlt}`} />
          </div>
          <div className="relative z-10 mt-auto opacity-50 self-end hidden sm:block">
            <PayungAgung className="w-32 h-32 text-[#d49b35] transform scale-x-[-1]" />
          </div>
        </div>

        {/* Center Portal Content Card */}
        <div
          className={`${s.gateCenterContent} relative z-30 max-w-md w-11/12 mx-auto bg-[#241307]/95 border-2 border-[#d49b35] p-6 sm:p-8 rounded-3xl text-center shadow-2xl backdrop-blur-md`}
        >
          <div className="flex justify-center mb-3">
            <SigerCrown className={`w-28 h-16 ${s.sigerCrownAnim}`} />
          </div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#f3d28a] font-medium mb-1">
            Pawiwahan Adat Sunda
          </p>
          <h1 className={`${s.fontSerif} text-3xl sm:text-4xl font-bold text-[#fcf8f2] mb-3 leading-tight`}>
            {content.partnerOneName} <span className={s.goldText}>&amp;</span> {content.partnerTwoName}
          </h1>

          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#d49b35] to-transparent mx-auto my-3" />

          <p className="text-xs text-[#fcf8f2]/75 mb-1">Kahatur kersana simkuring sakulawargi:</p>
          <div className="bg-[#4a2c18]/60 border border-[#d49b35]/40 rounded-xl py-2 px-3 mb-5">
            <p className="text-sm font-semibold text-[#fff0c2]">{guestName}</p>
            <p className="text-[11px] text-[#f3d28a]/80">{guestGreeting}</p>
          </div>

          <button
            type="button"
            onClick={handleOpenInvitation}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#d49b35] via-[#f3d28a] to-[#d49b35] text-[#2c180b] font-semibold text-sm tracking-wide shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>📜</span> Buka Serat Uleman
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MAIN INVITATION BODY                                           */}
      {/* ============================================================== */}
      <main className="w-full relative">
        {/* HERO SECTION */}
        <section className={`${s.bgJatiUkir} min-h-screen relative flex flex-col justify-center items-center text-center px-4 py-16 sm:py-24 border-b-4 border-[#d49b35]`}>
          <div className="relative z-10 max-w-3xl mx-auto">
            <BaleJulangNgapak className="w-56 sm:w-72 h-12 text-[#f3d28a] mx-auto mb-3" />
            <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-[#f3d28a] font-medium mb-3">
              Sampurasun • Pawiwahan Pasundan
            </p>

            <h1 className={`${s.fontSerif} text-4xl sm:text-6xl md:text-7xl font-bold text-[#fcf8f2] tracking-tight mb-4 leading-none`}>
              {content.partnerOneName} <span className={s.goldText}>&amp;</span> {content.partnerTwoName}
            </h1>

            <p className={`${s.fontEditorial} italic text-lg sm:text-2xl text-[#f3d28a] max-w-2xl mx-auto mb-2`}>
              “{content.openingGreeting || 'Silih asih, silih asah, silih asuh — ngambah sagara rumah tangga dina panangtayungan Gusti.'}”
            </p>
            <p className="text-xs sm:text-sm text-[#fcf8f2]/80 max-w-xl mx-auto mb-8">
              Saling mengasihi, saling membimbing, dan saling menjaga dalam kehangatan adat Pasundan.
            </p>

            {/* Couple Hero Portrait with Siger Arch Frame */}
            <div className="relative w-64 sm:w-72 h-80 sm:h-96 mx-auto mb-8">
              <div className="absolute -left-6 top-6 z-20 pointer-events-none hidden sm:block">
                <RonceMelatiStrand className={`w-10 h-48 ${s.swayMelati}`} />
              </div>
              <div className="absolute -right-6 top-6 z-20 pointer-events-none hidden sm:block">
                <RonceMelatiStrand className={`w-10 h-48 ${s.swayMelatiAlt}`} />
              </div>

              <div className={`p-2 ${s.sigerArchFrame} bg-gradient-to-b from-[#f3d28a] via-[#d49b35] to-[#4a2c18] shadow-2xl h-full`}>
                <img
                  src={heroSrc}
                  alt={`${content.partnerOneName} & ${content.partnerTwoName}`}
                  className="w-full h-full object-cover rounded-[130px_130px_20px_20px]"
                />
              </div>
            </div>

            {/* Countdown Display */}
            <div className="max-w-md mx-auto grid grid-cols-4 gap-2 sm:gap-3 mb-6">
              <div className={s.countdownBox}>
                <span className="block text-2xl sm:text-3xl font-bold text-[#fff0c2] leading-none">
                  {String(timeLeft.days).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs text-[#f3d28a]/80 uppercase tracking-wider">
                  Dinten
                </span>
              </div>
              <div className={s.countdownBox}>
                <span className="block text-2xl sm:text-3xl font-bold text-[#fff0c2] leading-none">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs text-[#f3d28a]/80 uppercase tracking-wider">
                  Tabuh
                </span>
              </div>
              <div className={s.countdownBox}>
                <span className="block text-2xl sm:text-3xl font-bold text-[#fff0c2] leading-none">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs text-[#f3d28a]/80 uppercase tracking-wider">
                  Menit
                </span>
              </div>
              <div className={s.countdownBox}>
                <span className="block text-2xl sm:text-3xl font-bold text-[#fff0c2] leading-none">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs text-[#f3d28a]/80 uppercase tracking-wider">
                  Detik
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#fcf8f2]/90 font-medium">
              📅 {content.ceremonies?.[0]?.startDateTime ? formatCeremonyDate(content.ceremonies[0].startDateTime, content.timeZone) : 'Sabtu, 24 Juli 2027'}
            </p>
          </div>
        </section>

        {/* GREETING & MEMPELAI SECTION */}
        <section className={`${s.bgBilikSunda} py-16 sm:py-24 px-4 sm:px-6`}>
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-4">
              <SigerCrown className="w-20 h-12 text-[#d49b35]" />
            </div>

            <p className="text-xs uppercase tracking-[0.25em] text-[#4a2c18] font-semibold mb-2">
              Bismillahirahmanirrahim
            </p>

            <blockquote className={`${s.fontEditorial} italic text-base sm:text-xl text-[#4a2c18] max-w-2xl mx-auto mb-4`}>
              “{content.prayer || 'Maha Suci Allah anu parantos nyiptakeun mahluk-Na sapasang-sapasang. Mugia Gusti maparinan kaberkahan, ngarumat dina katengtreman lahir sinareng batin.'}”
            </blockquote>
            <p className="text-xs text-[#4a2c18]/70 mb-12">
              (QS. Ar-Rum: 21)
            </p>

            {/* Couple Profiles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 text-center">
              {/* Mempelai Wanita (Bride) */}
              <div className={`bg-[#fcf8f2] border border-[#d49b35]/40 rounded-3xl p-6 sm:p-8 ${s.sundaCard}`}>
                <div className="w-40 h-40 mx-auto rounded-full overflow-hidden border-4 border-[#d49b35] shadow-lg mb-4">
                  <img src={brideSrc} alt={content.partnerOneFullName || content.partnerOneName} className="w-full h-full object-cover" />
                </div>
                <h3 className={`${s.fontSerif} text-2xl font-bold text-[#4a2c18] mb-1`}>
                  {content.partnerOneFullName || content.partnerOneName}
                </h3>
                <p className="text-xs uppercase tracking-wider text-[#d49b35] font-semibold mb-3">
                  Panganten Istri
                </p>
                <p className="text-xs sm:text-sm text-[#4a2c18]/80 leading-relaxed">
                  {content.partnerOneFamily || 'Putri bungsu ti Bapa Asep Hidayat & Ibu Nining Rustini'}
                </p>
              </div>

              {/* Mempelai Pria (Groom) */}
              <div className={`bg-[#fcf8f2] border border-[#d49b35]/40 rounded-3xl p-6 sm:p-8 ${s.sundaCard}`}>
                <div className="w-40 h-40 mx-auto rounded-full overflow-hidden border-4 border-[#d49b35] shadow-lg mb-4">
                  <img src={groomSrc} alt={content.partnerTwoFullName || content.partnerTwoName} className="w-full h-full object-cover" />
                </div>
                <h3 className={`${s.fontSerif} text-2xl font-bold text-[#4a2c18] mb-1`}>
                  {content.partnerTwoFullName || content.partnerTwoName}
                </h3>
                <p className="text-xs uppercase tracking-wider text-[#d49b35] font-semibold mb-3">
                  Panganten Pameget
                </p>
                <p className="text-xs sm:text-sm text-[#4a2c18]/80 leading-relaxed">
                  {content.partnerTwoFamily || 'Putra cikal ti Bapa Dudung Suherman & Ibu Euis Kartini'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CEREMONIES & RUNDOWN ADAT PASUNDAN SECTION */}
        <section className={`${s.bgJatiUkir} py-16 sm:py-24 px-4 sm:px-6 text-[#fcf8f2]`}>
          <div className="max-w-4xl mx-auto text-center">
            <BaleJulangNgapak className="w-48 sm:w-60 h-10 text-[#f3d28a] mx-auto mb-2" />
            <h2 className={`${s.fontSerif} text-3xl sm:text-4xl font-bold text-[#fcf8f2] mb-3`}>
              Runtuyan Acara Pawiwahan
            </h2>
            <p className="text-xs sm:text-sm text-[#f3d28a]/90 max-w-xl mx-auto mb-12">
              Mugi Gusti maparin kalancaran tur karahayuan dina sakur acara anu bade dilaksanakeun.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {content.ceremonies && content.ceremonies.length > 0 ? (
                content.ceremonies.map((ceremony, idx) => (
                  <div
                    key={idx}
                    className={`bg-[#1f1006]/85 border-2 border-[#d49b35]/70 rounded-3xl p-6 sm:p-8 text-left ${s.sundaCardDark}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs uppercase tracking-widest text-[#f3d28a] font-semibold bg-[#4a2c18] px-3 py-1 rounded-full border border-[#d49b35]/40">
                        {idx === 0 ? 'Ijáb Qobul' : 'Pangbagéa'}
                      </span>
                      <span className="text-2xl">💍</span>
                    </div>

                    <h3 className={`${s.fontSerif} text-2xl font-bold text-[#fff0c2] mb-2`}>
                      {ceremony.title}
                    </h3>

                    <div className="space-y-2 text-xs sm:text-sm text-[#fcf8f2]/85 mb-6">
                      <p className="flex items-center gap-2">
                        <span>🗓️</span>
                        <span>{formatCeremonyDate(ceremony.startDateTime, content.timeZone)}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span>⏰</span>
                        <span>{formatCeremonyTimeRange(ceremony.startDateTime, ceremony.endDateTime, content.timeZone)}</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span>🏛️</span>
                        <span>
                          <strong className="text-[#f3d28a] block">{ceremony.venue}</strong>
                          {ceremony.address && <span className="text-[#fcf8f2]/70 block mt-0.5">{ceremony.address}</span>}
                        </span>
                      </p>
                    </div>

                    {ceremony.mapsUrl && (
                      <a
                        href={ceremony.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#d49b35] hover:bg-[#f3d28a] text-[#2c180b] font-semibold text-xs rounded-xl shadow transition-all"
                      >
                        <span>📍</span> Pituduh Lokasi (Google Maps)
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center text-sm text-[#f3d28a]/80">
                  Jadwal acara pernikahan akan segera diperbarui.
                </div>
              )}
            </div>

            {/* Showcase Prosesi Adat Sunda */}
            <div className="bg-[#241307]/80 border border-[#d49b35]/50 rounded-3xl p-6 sm:p-8 text-left">
              <h4 className={`${s.fontSerif} text-xl font-bold text-[#fff0c2] mb-4 text-center`}>
                Prosesi &amp; Upacara Adat Pasundan
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-[#4a2c18]/50 rounded-2xl border border-[#d49b35]/30">
                  <span className="text-2xl mb-1 block">🌿</span>
                  <p className="text-xs font-semibold text-[#f3d28a]">Ngeuyeuk Seureuh</p>
                  <p className="text-[10px] text-[#fcf8f2]/70">Neda pituah sepuh</p>
                </div>
                <div className="p-3 bg-[#4a2c18]/50 rounded-2xl border border-[#d49b35]/30">
                  <span className="text-2xl mb-1 block">🪗</span>
                  <p className="text-xs font-semibold text-[#f3d28a]">Mapag Panganten</p>
                  <p className="text-[10px] text-[#fcf8f2]/70">Pangiring Lengser</p>
                </div>
                <div className="p-3 bg-[#4a2c18]/50 rounded-2xl border border-[#d49b35]/30">
                  <span className="text-2xl mb-1 block">🪙</span>
                  <p className="text-xs font-semibold text-[#f3d28a]">Sawer Panganten</p>
                  <p className="text-[10px] text-[#fcf8f2]/70">Beas koneng &amp; artos</p>
                </div>
                <div className="p-3 bg-[#4a2c18]/50 rounded-2xl border border-[#d49b35]/30">
                  <span className="text-2xl mb-1 block">🍚</span>
                  <p className="text-xs font-semibold text-[#f3d28a]">Huap Lingkung</p>
                  <p className="text-[10px] text-[#fcf8f2]/70">Silih asih suap bakti</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PHOTO GALLERY SECTION */}
        <section className={`${s.bgBilikSunda} py-16 sm:py-24 px-4 sm:px-6`}>
          <div className="max-w-5xl mx-auto text-center">
            <h2 className={`${s.fontSerif} text-3xl sm:text-4xl font-bold text-[#4a2c18] mb-2`}>
              Galeri Momen Kabagjaan
            </h2>
            <p className="text-xs sm:text-sm text-[#4a2c18]/70 mb-10">
              Dokumentasi potret asih dina runtuyan rasa jeung carita.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {galleryImages.map((src, i) => (
                <div
                  key={i}
                  onClick={() => setLightbox(i)}
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-[#d49b35]/50 shadow-md cursor-pointer hover:scale-[1.02] transition-transform"
                >
                  <img src={src} alt={`Dokumentasi ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DIGITAL ENVELOPE / TANDA KASIH */}
        {content.giftAccounts && content.giftAccounts.length > 0 && (
          <section className={`${s.bgJatiUkir} py-16 sm:py-20 px-4 sm:px-6 text-[#fcf8f2]`}>
            <div className="max-w-md mx-auto text-center">
              <span className="text-3xl mb-2 block">🎁</span>
              <h2 className={`${s.fontSerif} text-2xl sm:text-3xl font-bold text-[#fff0c2] mb-2`}>
                {content.giftTitle || 'Tanda Asih Digital'}
              </h2>
              <p className="text-xs text-[#fcf8f2]/80 mb-8">
                {content.giftMessage || 'Kagem wargi sadaya anu badé ngintunkeun tanda asih, tiasa ngalangkungan rekening ieu di handap:'}
              </p>

              <div className="space-y-4">
                {content.giftAccounts.map((account, idx) => (
                  <div
                    key={idx}
                    className="bg-[#1f1006]/90 border border-[#d49b35]/60 rounded-2xl p-5 text-left shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-[#f3d28a]">
                        {account.bankName}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(account.accountNumber, `${account.bankName}-${idx}`)}
                        className="text-xs px-3 py-1 bg-[#d49b35] hover:bg-[#f3d28a] text-[#2c180b] font-semibold rounded-lg transition-all"
                      >
                        {copiedAccount === `${account.bankName}-${idx}` ? '✓ Kasalin!' : 'Salin Rekening'}
                      </button>
                    </div>
                    <p className="text-lg font-mono tracking-wider text-[#fcf8f2] mb-1">
                      {account.accountNumber}
                    </p>
                    <p className="text-xs text-[#fcf8f2]/70">
                      a.n. {account.accountHolder}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* RSVP FORM SECTION */}
        {showRsvpAndQr && (
          <section className={`${s.bgBilikSunda} py-16 sm:py-24 px-4 sm:px-6 border-t border-[#d49b35]/30`}>
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-8">
                <span className="text-3xl mb-2 block">💌</span>
                <h2 className={`${s.fontSerif} text-3xl font-bold text-[#4a2c18] mb-2`}>
                  Konfirmasi Kasumpingan (RSVP)
                </h2>
                <p className="text-xs sm:text-sm text-[#4a2c18]/75">
                  Mugia Bapa/Ibu/Wargi sadaya kersa ngintunkeun konfirmasi kasumpingan sarta pidua restu.
                </p>
              </div>

              <div className="bg-[#fcf8f2] border-2 border-[#d49b35]/60 rounded-3xl p-6 sm:p-8 shadow-xl">
                <RsvpForm
                  key={uniqueCode || 'preview-rsvp'}
                  uniqueCode={uniqueCode || 'simulasi-tamu'}
                  maxPax={data.guest?.maxPax || 2}
                  initialRsvp={data.rsvp || { canRespond: true, response: 'PENDING', pax: 1 }}
                />
              </div>
            </div>
          </section>
        )}

        {/* GUEST QR CODE / TICKET SECTION */}
        {showRsvpAndQr && (
          <section className={`${s.bgJatiUkir} py-16 sm:py-20 px-4 sm:px-6 text-[#fcf8f2]`}>
            <div className="max-w-md mx-auto text-center">
              <span className="text-3xl mb-2 block">🎫</span>
              <h2 className={`${s.fontSerif} text-2xl sm:text-3xl font-bold text-[#fff0c2] mb-2`}>
                Tiket QR Kasumpingan
              </h2>
              <p className="text-xs text-[#fcf8f2]/80 mb-6">
                Tembongkeun kode QR ieu ka panata calagara (meja resepsionis) nalika lebet ka gedung acara.
              </p>

              <div className="bg-[#fcf8f2] text-[#2c180b] rounded-3xl p-6 shadow-2xl border-4 border-[#d49b35]">
                <QRDisplay
                  canonicalUrl={effectiveCanonicalUrl}
                  guestName={guestName}
                  maxPax={data.guest?.maxPax || 2}
                  tableNumber={data.guest?.tableNumber}
                />
              </div>
            </div>
          </section>
        )}

        {/* CLOSING SECTION */}
        <section className={`${s.bgBilikSunda} py-16 sm:py-24 px-4 sm:px-6 text-center border-t border-[#d49b35]/40`}>
          <div className="max-w-2xl mx-auto">
            <BaleJulangNgapak className="w-40 sm:w-48 h-8 text-[#d49b35] mx-auto mb-4" />
            <h2 className={`${s.fontSerif} text-3xl font-bold text-[#4a2c18] mb-3`}>
              Hatur Nuhun
            </h2>
            <p className="text-xs sm:text-sm text-[#4a2c18]/80 leading-relaxed mb-6">
              {content.closing || 'Mangrupi hiji kahormatan sareng kabagjaan kanggo simkuring sakulawargi saupami Bapa/Ibu/Saderek kersa sumping ngaluuhan sarta maparin pidua restu. Hatur nuhun kana sagala perhatosan sareng piduana.'}
            </p>

            <p className={`${s.fontEditorial} italic text-xl text-[#d49b35] mb-2`}>
              Wassalamu’alaikum Warahmatullahi Wabarakatuh
            </p>
            <p className="text-xs text-[#4a2c18]/70">
              Keluarga Besar Pasangan Pengantin Pasundan
            </p>

            <div className="mt-8 pt-6 border-t border-[#d49b35]/30">
              <p className="text-[11px] text-[#4a2c18]/50 uppercase tracking-widest font-mono">
                Irvite.id — Undangan Digital Pasundan
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Lightbox Modal */}
      {lightbox !== null && (
        <div
          role="dialog"
          aria-label="Tinjau Foto Galeri"
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute top-6 right-6 text-white text-3xl font-light hover:text-[#f3d28a]"
            onClick={() => setLightbox(null)}
          >
            &times;
          </button>
          <img
            src={galleryImages[lightbox]}
            alt="Dokumentasi Acara"
            className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border-2 border-[#d49b35]"
          />
        </div>
      )}
    </div>
  );
}

