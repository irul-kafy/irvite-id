import React from 'react';

export function PenjorAgungSvg({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 110 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M15 800 C15 450, 20 160, 88 28"
        stroke="#E5B84B"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M22 800 C22 450, 26 175, 92 40"
        stroke="#FFF0B8"
        strokeWidth="1"
        strokeDasharray="6 6"
        opacity="0.7"
      />
      <g stroke="#E5B84B" strokeWidth="1.3" opacity="0.85">
        <path d="M22 650 L48 635 M22 610 L50 595 M23 570 L52 555 M24 530 L54 515 M26 490 L56 475 M28 450 L58 435 M31 410 L62 395 M35 370 L66 355 M39 330 L70 315 M44 290 L75 275 M50 250 L80 235 M57 210 L85 195 M64 170 L90 155" />
      </g>
      <path
        d="M88 28 C105 55, 102 105, 82 140 C68 165, 65 210, 72 250"
        stroke="#E5B84B"
        strokeWidth="2"
        fill="none"
      />
      <circle
        cx="80"
        cy="170"
        r="12"
        stroke="#E5B84B"
        strokeWidth="1.5"
        fill="rgba(229,184,75,0.18)"
      />
      <path
        d="M80 182 L74 235 L80 250 L86 235 Z"
        fill="rgba(229,184,75,0.35)"
        stroke="#E5B84B"
        strokeWidth="1"
      />
    </svg>
  );
}

export function CandiBentarTowerSvg({
  className,
  imageHref,
  clipId,
}: {
  className?: string;
  imageHref: string;
  clipId: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 260 680"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${clipId}-grad`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B1514" />
          <stop offset="50%" stopColor="#240F0E" />
          <stop offset="100%" stopColor="#120807" />
        </linearGradient>
        <linearGradient id={`${clipId}-gold`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#A6781E" />
          <stop offset="50%" stopColor="#FFF0B8" />
          <stop offset="100%" stopColor="#D4A138" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d="M 20 680 L 20 560 L 45 560 L 45 480 L 30 480 L 30 450 L 65 450 L 65 370 L 50 370 L 50 340 L 90 340 L 90 260 L 75 260 L 75 235 L 118 235 L 118 160 L 105 160 L 105 135 L 150 135 L 150 75 L 140 75 L 140 50 L 185 50 L 185 15 L 258 15 L 258 680 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="260" height="680" fill={`url(#${clipId}-grad)`} />
        <image
          href={imageHref}
          x="0"
          y="0"
          width="260"
          height="680"
          preserveAspectRatio="xMidYMid slice"
          opacity="0.32"
        />
        <g
          stroke={`url(#${clipId}-gold)`}
          strokeWidth="1.5"
          opacity="0.6"
        >
          <line x1="20" y1="560" x2="258" y2="560" />
          <line x1="30" y1="450" x2="258" y2="450" />
          <line x1="50" y1="340" x2="258" y2="340" />
          <line x1="75" y1="235" x2="258" y2="235" />
          <line x1="105" y1="135" x2="258" y2="135" />
          <line x1="140" y1="50" x2="258" y2="50" />
        </g>
        <g
          stroke={`url(#${clipId}-gold)`}
          strokeWidth="1.4"
          fill="rgba(229,184,75,0.12)"
        >
          <path d="M180 390 C205 365, 235 365, 255 390 C235 415, 205 415, 180 390 Z" />
          <circle cx="220" cy="390" r="10" />
          <path d="M160 505 C195 475, 230 475, 255 505 C230 535, 195 535, 160 505 Z" />
          <path d="M195 285 C215 265, 240 265, 255 285 C240 305, 215 305, 195 285 Z" />
        </g>
      </g>
      <path
        d="M 20 680 L 20 560 L 45 560 L 45 480 L 30 480 L 30 450 L 65 450 L 65 370 L 50 370 L 50 340 L 90 340 L 90 260 L 75 260 L 75 235 L 118 235 L 118 160 L 105 160 L 105 135 L 150 135 L 150 75 L 140 75 L 140 50 L 185 50 L 185 15 L 258 15 L 258 680"
        stroke={`url(#${clipId}-gold)`}
        strokeWidth="3"
        fill="none"
      />
    </svg>
  );
}

export function MandalaChakraSvg({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="50"
        cy="50"
        r="46"
        stroke="#E5B84B"
        strokeWidth="1.2"
        strokeDasharray="4 4"
      />
      <circle
        cx="50"
        cy="50"
        r="38"
        stroke="#E5B84B"
        strokeWidth="1.5"
        fill="rgba(123,30,34,0.35)"
      />
      <g stroke="#FFF0B8" strokeWidth="1.2" fill="rgba(229,184,75,0.2)">
        <path d="M50 6 L56 26 L50 34 L44 26 Z" />
        <path d="M50 94 L56 74 L50 66 L44 74 Z" />
        <path d="M6 50 L26 56 L34 50 L26 44 Z" />
        <path d="M94 50 L74 56 L66 50 L74 44 Z" />
        <path d="M19 19 L35 30 L36 36 L30 35 Z" />
        <path d="M81 81 L65 70 L64 64 L70 65 Z" />
        <path d="M81 19 L70 35 L64 36 L65 30 Z" />
        <path d="M19 81 L30 65 L36 64 L35 70 Z" />
      </g>
      <circle
        cx="50"
        cy="50"
        r="12"
        stroke="#FFF0B8"
        strokeWidth="1.8"
        fill="#7B1E22"
      />
      <circle cx="50" cy="50" r="4" fill="#FFF0B8" />
    </svg>
  );
}

export function GelunganCrownSvg({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 65"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M60 4 L70 28 L88 16 L82 42 L106 32 L92 56 L28 56 L14 32 L38 42 L32 16 L50 28 Z"
        stroke="#E5B84B"
        strokeWidth="1.8"
        fill="rgba(229,184,75,0.16)"
      />
      <circle cx="60" cy="36" r="6" fill="#FFF0B8" />
      <circle cx="44" cy="42" r="3.5" fill="#E5B84B" />
      <circle cx="76" cy="42" r="3.5" fill="#E5B84B" />
      <path
        d="M20 60 L100 60"
        stroke="#E5B84B"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LotusPadmaSvg({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M50 5 C58 20, 62 32, 50 44 C38 32, 42 20, 50 5 Z"
        stroke="#E5B84B"
        strokeWidth="1.5"
        fill="rgba(229,184,75,0.2)"
      />
      <path
        d="M50 44 C64 34, 76 24, 72 12 C62 18, 56 28, 50 44 Z"
        stroke="#E5B84B"
        strokeWidth="1.3"
        fill="rgba(229,184,75,0.12)"
      />
      <path
        d="M50 44 C36 34, 24 24, 28 12 C38 18, 44 28, 50 44 Z"
        stroke="#E5B84B"
        strokeWidth="1.3"
        fill="rgba(229,184,75,0.12)"
      />
      <path
        d="M50 44 C70 40, 88 34, 92 22 C76 24, 64 32, 50 44 Z"
        stroke="#E5B84B"
        strokeWidth="1.1"
      />
      <path
        d="M50 44 C30 40, 12 34, 8 22 C24 24, 36 32, 50 44 Z"
        stroke="#E5B84B"
        strokeWidth="1.1"
      />
    </svg>
  );
}

export function SangaMandalaMapSvg({
  className,
  venueLabel,
}: {
  className?: string;
  venueLabel: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Peta Denah ${venueLabel}`}
    >
      <rect width="400" height="280" fill="#170E0D" />
      <g stroke="rgba(229,184,75,0.12)" strokeWidth="1">
        <line x1="0" y1="70" x2="400" y2="70" />
        <line x1="0" y1="140" x2="400" y2="140" />
        <line x1="0" y1="210" x2="400" y2="210" />
        <line x1="100" y1="0" x2="100" y2="280" />
        <line x1="200" y1="0" x2="200" y2="280" />
        <line x1="300" y1="0" x2="300" y2="280" />
      </g>
      <path
        d="M0 185 Q 150 180, 220 140 T 400 95"
        stroke="rgba(229,184,75,0.35)"
        strokeWidth="10"
        fill="none"
      />
      <path
        d="M0 185 Q 150 180, 220 140 T 400 95"
        stroke="#E5B84B"
        strokeWidth="1.5"
        strokeDasharray="6 6"
        fill="none"
      />
      <path
        d="M180 0 L215 280"
        stroke="rgba(229,184,75,0.22)"
        strokeWidth="6"
      />
      <rect
        x="155"
        y="85"
        width="90"
        height="75"
        rx="6"
        stroke="#E5B84B"
        strokeWidth="2"
        fill="rgba(123,30,34,0.65)"
      />
      <circle
        cx="200"
        cy="122"
        r="24"
        fill="rgba(229,184,75,0.2)"
      />
      <circle
        cx="200"
        cy="122"
        r="7"
        fill="#FFF0B8"
        stroke="#7B1E22"
        strokeWidth="2"
      />
      <text
        x="200"
        y="74"
        textAnchor="middle"
        fill="#FFF0B8"
        fontFamily="Cinzel Decorative, serif"
        fontSize="11"
        letterSpacing="1.5"
      >
        {venueLabel.slice(0, 28).toUpperCase()}
      </text>
      <text
        x="85"
        y="172"
        fill="rgba(229,184,75,0.7)"
        fontFamily="Inter, sans-serif"
        fontSize="9"
        letterSpacing="1"
      >
        JL. RAYA UBUD
      </text>
      <text
        x="320"
        y="255"
        fill="rgba(229,184,75,0.5)"
        fontFamily="Cinzel Decorative, serif"
        fontSize="9"
      >
        KAJA (UTARA) ↑
      </text>
    </svg>
  );
}

