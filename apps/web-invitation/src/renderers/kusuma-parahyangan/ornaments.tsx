import React from 'react';

/**
 * Bale Julang Ngapak Crest with Horned Capit Gunting Roof Ends
 */
export function BaleJulangNgapak({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 60" fill="none" aria-hidden="true">
      <path d="M25 52 L150 12 L275 52" stroke="currentColor" strokeWidth="2" />
      <path
        d="M60 42 L138 6 M240 42 L162 6"
        stroke="#D49B35"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="150" cy="26" r="4" fill="#F3D28A" />
    </svg>
  );
}

/**
 * Mahkota Siger Sunda & Kembang Goyang Trembling Ornament
 */
export function SigerCrown({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 130" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="goldSigerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF0C2" />
          <stop offset="45%" stopColor="#E7B95A" />
          <stop offset="100%" stopColor="#B87B18" />
        </linearGradient>
      </defs>

      {/* Main Siger Crown Arch & Pointed Diadem (9 Peaked Crown of Pasundan Queens) */}
      <path
        d="M20 115 C35 110 50 108 70 110 C85 92 90 70 95 45 C102 65 110 40 120 15 C130 40 138 65 145 45 C150 70 155 92 170 110 C190 108 205 110 220 115 C195 125 145 128 120 128 C95 128 45 125 20 115 Z"
        fill="url(#goldSigerGrad)"
        stroke="#F3D28A"
        strokeWidth="1.6"
      />

      {/* Intricate Filigree Details & Gem Insets */}
      <circle cx="120" cy="55" r="5" fill="#FCF8F2" stroke="#4A2C18" strokeWidth="1" />
      <circle cx="95" cy="72" r="3.5" fill="#FCF8F2" />
      <circle cx="145" cy="72" r="3.5" fill="#FCF8F2" />
      <circle cx="72" cy="88" r="3" fill="#FCF8F2" />
      <circle cx="168" cy="88" r="3" fill="#FCF8F2" />

      {/* 5 Kembang Goyang Pins (Trembling Golden Floral Pins) */}
      <g stroke="#D49B35" strokeWidth="1.5">
        <line x1="80" y1="42" x2="68" y2="14" />
        <circle cx="68" cy="14" r="5" fill="#F3D28A" />
        <line x1="102" y1="30" x2="94" y2="6" />
        <circle cx="94" cy="6" r="5.5" fill="#F3D28A" />
        <line x1="120" y1="15" x2="120" y2="2" />
        <circle cx="120" cy="2" r="6" fill="#FFF0C2" />
        <line x1="138" y1="30" x2="146" y2="6" />
        <circle cx="146" cy="6" r="5.5" fill="#F3D28A" />
        <line x1="160" y1="42" x2="172" y2="14" />
        <circle cx="172" cy="14" r="5" fill="#F3D28A" />
      </g>
    </svg>
  );
}

/**
 * Hanging Ronce Melati (Bawang Sebungkul & Kembang Kantil)
 */
export function RonceMelatiStrand({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 240" fill="none" aria-hidden="true">
      <line x1="30" y1="0" x2="30" y2="210" stroke="#D49B35" strokeWidth="1.4" />
      <ellipse cx="30" cy="24" rx="7" ry="10" fill="#FCF8F2" />
      <ellipse cx="30" cy="48" rx="8" ry="11" fill="#FCF8F2" />
      <ellipse cx="30" cy="74" rx="7" ry="10" fill="#FCF8F2" />
      <ellipse cx="30" cy="100" rx="8" ry="11" fill="#FCF8F2" />
      <ellipse cx="30" cy="126" rx="7" ry="10" fill="#FCF8F2" />
      <ellipse cx="30" cy="152" rx="8" ry="11" fill="#FCF8F2" />
      <ellipse cx="30" cy="178" rx="6" ry="9" fill="#FCF8F2" />
      {/* Kembang Kantil Drop */}
      <path d="M21 200 L30 232 L39 200 Z" fill="#F3D28A" />
    </svg>
  );
}

/**
 * Traditional Sundanese Tiered Parasol (Payung Agung)
 */
export function PayungAgung({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" aria-hidden="true">
      <path
        d="M20 95 Q55 65 90 95 Z"
        fill="#D49B35"
        fillOpacity="0.25"
        stroke="#F3D28A"
        strokeWidth="1.6"
      />
      <path
        d="M28 72 Q55 48 82 72 Z"
        fill="#D49B35"
        fillOpacity="0.35"
        stroke="#F3D28A"
        strokeWidth="1.5"
      />
      <path
        d="M38 52 Q55 34 72 52 Z"
        fill="#F3D28A"
        fillOpacity="0.4"
        stroke="#F3D28A"
        strokeWidth="1.4"
      />
      <line x1="55" y1="22" x2="55" y2="132" stroke="#F3D28A" strokeWidth="2.2" />
      <circle cx="55" cy="20" r="4" fill="#F3D28A" />
    </svg>
  );
}

/**
 * Top Valance Garland for Lawang Saketeng
 */
export function LawangValance({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 180" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0,10 Q150,140 300,15 Q450,145 600,20 Q750,145 900,15 Q1050,140 1200,10"
        fill="none"
        stroke="#FCF8F2"
        strokeWidth="8"
        strokeDasharray="2 14"
        strokeLinecap="round"
      />
      <path
        d="M0,25 Q150,165 300,30 Q450,170 600,35 Q750,170 900,30 Q1050,165 1200,25"
        fill="none"
        stroke="#F3D28A"
        strokeWidth="4"
        strokeDasharray="1 12"
        strokeLinecap="round"
      />
      <g stroke="#FCF8F2" strokeWidth="6" strokeDasharray="2 11" strokeLinecap="round">
        <line x1="150" y1="75" x2="150" y2="165" />
        <line x1="300" y1="15" x2="300" y2="145" />
        <line x1="450" y1="80" x2="450" y2="170" />
        <line x1="600" y1="20" x2="600" y2="155" />
        <line x1="750" y1="80" x2="750" y2="170" />
        <line x1="900" y1="15" x2="900" y2="145" />
        <line x1="1050" y1="75" x2="1050" y2="165" />
      </g>
    </svg>
  );
}

