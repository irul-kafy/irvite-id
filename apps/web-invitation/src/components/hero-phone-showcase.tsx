'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import './hero-phone-showcase.css';

interface TemplateHeroItem {
  id: string;
  themeCode: string;
  name: string;
  badge: string;
  eyebrow: string;
  coupleNames: string;
  dateStr: string;
  locationStr: string;
  demoUrl: string;
  bgImage: string;
  musicTitle: string;
  accentColor: string;
  hasArchPhoto?: string;
  emblemType: 'gunungan' | 'stars' | 'minang' | 'nocturne';
}

const HERO_TEMPLATES: TemplateHeroItem[] = [
  {
    id: 'aetheria',
    themeCode: 'AETHERIA',
    name: 'Aetheria',
    badge: 'Celestial Fantasy',
    eyebrow: 'THE FIRST PAGE OF FOREVER',
    coupleNames: 'Rayyan & Kiara',
    dateStr: 'MINGGU · 18 OKTOBER 2026',
    locationStr: 'The Glass House, Plataran Hutan Kota',
    demoUrl: '/templates/aetheria/demo',
    bgImage: '/templates/aetheria/thumbnail.webp',
    hasArchPhoto: '/templates/aetheria/images/couple.webp',
    musicTitle: 'Aetheria Symphony',
    accentColor: '#d8b87e',
    emblemType: 'stars',
  },
  {
    id: 'sekar-kedaton',
    themeCode: 'SEKAR_KEDATON',
    name: 'Sekar Kedaton',
    badge: 'Traditional Javanese',
    eyebrow: 'UNDANGAN PERNIKAHAN ADAT JAWA',
    coupleNames: 'Laras & Bagas',
    dateStr: 'SABTU · 20 JUNI 2027',
    locationStr: 'Pendopo Agung Royal Ambarrukmo',
    demoUrl: '/templates/sekar-kedaton/demo',
    bgImage: '/templates/sekar-kedaton/thumbnail.webp',
    musicTitle: 'Gending Sekar Senja',
    accentColor: '#c9a84c',
    emblemType: 'gunungan',
  },
  {
    id: 'ranah-cinta',
    themeCode: 'RANAH_CINTA',
    name: 'Ranah Cinta',
    badge: 'Minang Traditional',
    eyebrow: 'UNDANGAN PERNIKAHAN MINANGKABAU',
    coupleNames: 'Salma & Fadli',
    dateStr: 'MINGGU · 22 NOVEMBER 2026',
    locationStr: 'Balai Sarwono, Jakarta Selatan',
    demoUrl: '/templates/ranah-cinta/demo',
    bgImage: '/templates/ranah-cinta/thumbnail.webp',
    musicTitle: 'Saluang Ranah Kasih',
    accentColor: '#e0b84c',
    emblemType: 'minang',
  },
  {
    id: 'opaline-nocturne',
    themeCode: 'OPALINE_NOCTURNE',
    name: 'Opaline Nocturne',
    badge: 'Enchanted Woodland',
    eyebrow: 'THE WEDDING CELEBRATION',
    coupleNames: 'Danis & Althea',
    dateStr: 'SABTU · 12 DESEMBER 2026',
    locationStr: 'The Forest Glasshouse, Lembang',
    demoUrl: '/templates/opaline-nocturne/demo',
    bgImage: '/templates/opaline-nocturne/thumbnail.webp',
    musicTitle: 'Nocturne Romance',
    accentColor: '#e8c48a',
    emblemType: 'nocturne',
  },
];

export function HeroPhoneShowcase() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const current = HERO_TEMPLATES[activeIdx];

  // Auto-slide every 3.5 seconds (standard pleasant timing)
  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % HERO_TEMPLATES.length);
    }, 3500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, activeIdx]);

  return (
    <div className="hero-phone-showcase">
      {/* Decorative celestial background orbits */}
      <div className="orbit orbit--one" aria-hidden="true" />
      <div className="orbit orbit--two" aria-hidden="true" />

      {/* Realistic Phone Frame */}
      <div className="irv-hero-phone">
        {/* Dynamic Island Pill Notch */}
        <div className="irv-phone-island" aria-hidden="true">
          <span className="irv-island-time">09:41</span>
          <div className="irv-island-camera">
            <span className="irv-camera-lens" />
          </div>
          <span className="irv-island-signal">
            <span className="irv-signal-bar" />
            <span className="irv-signal-bar" />
            <span className="irv-signal-bar" />
          </span>
        </div>

        {/* Screen Content */}
        <div
          key={current.id}
          className={`irv-phone-screen irv-screen--${current.id}`}
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(12, 18, 15, 0.45) 0%, rgba(12, 18, 15, 0.85) 100%), url(${current.bgImage})`,
          }}
        >
          {/* Subtle Ambient Light Shimmer */}
          <div className="irv-screen-glow" aria-hidden="true" />

          {/* Top Emblem / Monogram */}
          <div className="irv-screen-emblem">
            {current.emblemType === 'stars' && (
              <svg viewBox="0 0 24 24" className="irv-emblem-svg" fill="none" stroke={current.accentColor} strokeWidth="1.5">
                <path d="M12 2l2.4 6.6L21 11l-5.4 4.2L17.2 22 12 18.2 6.8 22l1.6-6.8L3 11l6.6-2.4L12 2z" fill={`${current.accentColor}33`} />
              </svg>
            )}
            {current.emblemType === 'gunungan' && (
              <svg viewBox="0 0 24 24" className="irv-emblem-svg" fill="none" stroke={current.accentColor} strokeWidth="1.5">
                <path d="M12 2c0 0-8 7-8 14 0 3.3 2.7 6 6 6h4c3.3 0 6-2.7 6-6 0-7-8-14-8-14z" fill={`${current.accentColor}33`} />
                <path d="M12 6v16M8 14h8" />
              </svg>
            )}
            {current.emblemType === 'minang' && (
              <svg viewBox="0 0 24 24" className="irv-emblem-svg" fill="none" stroke={current.accentColor} strokeWidth="1.5">
                <path d="M3 10l9-7 9 7v10a1 1 0 01-1 1H4a1 1 0 01-1-1V10z" fill={`${current.accentColor}33`} />
                <path d="M12 3v18M7 10h10" />
              </svg>
            )}
            {current.emblemType === 'nocturne' && (
              <svg viewBox="0 0 24 24" className="irv-emblem-svg" fill="none" stroke={current.accentColor} strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
                <path d="M12 7c2.8 0 5 2.2 5 5s-2.2 5-5 5" fill={`${current.accentColor}33`} />
              </svg>
            )}
          </div>

          {/* Eyebrow */}
          <p className="irv-screen-eyebrow" style={{ color: current.accentColor }}>
            {current.eyebrow}
          </p>

          {/* Arch Frame with Prewedding Photo (If available) */}
          {current.hasArchPhoto && (
            <div className="irv-screen-arch" style={{ borderColor: `${current.accentColor}88` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.hasArchPhoto} alt={current.coupleNames} className="irv-arch-img" />
              <div className="irv-arch-glow" />
            </div>
          )}

          {/* Couple Title */}
          <h2 className="irv-screen-names">
            {current.coupleNames}
          </h2>

          {/* Gold Decorative Divider */}
          <div className="irv-screen-divider" style={{ background: current.accentColor }} />

          {/* Date & Location */}
          <p className="irv-screen-date">{current.dateStr}</p>
          <p className="irv-screen-location">{current.locationStr}</p>

          {/* Luxury Guest Card (Kepada Yth) */}
          <div className="irv-screen-guest-box">
            <span className="irv-guest-label">Kepada Yth.</span>
            <span className="irv-guest-title">Bapak / Ibu / Saudara/i</span>
            <span className="irv-guest-name">Tamu Undangan</span>
          </div>

          {/* Open Invitation CTA Button linking directly to the live demo */}
          <Link
            href={current.demoUrl}
            className="irv-screen-cta"
            title={`Buka Simulasi ${current.name}`}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <span>Buka Undangan</span>
            <svg viewBox="0 0 16 16" fill="none" className="irv-cta-icon" stroke="currentColor" strokeWidth="2">
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          {/* Mini Floating Music Disc */}
          <div className="irv-screen-music" title={`Musik: ${current.musicTitle}`}>
            <span className="irv-music-disc">🎵</span>
            <span className="irv-music-note">♪</span>
          </div>
        </div>
      </div>
    </div>
  );
}

