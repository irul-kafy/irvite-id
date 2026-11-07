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
 * Mahkota Siger Sunda Kencana & Kembang Goyang Trembling Ornament
 */
export function SigerCrown({
  className = '',
  pinClassName = '',
}: {
  className?: string;
  pinClassName?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Trembling Kembang Goyang Stalks (Hiasan Tusuk Konde Sunda) */}
      <g className={pinClassName}>
        <line x1="120" y1="42" x2="120" y2="12" stroke="#F3D28A" strokeWidth="1.6" />
        <circle cx="120" cy="10" r="6" fill="#F3D28A" />
        <circle cx="120" cy="10" r="3" fill="#4A2C18" />
      </g>
      <g className={pinClassName} style={{ animationDelay: '0.3s' }}>
        <line x1="92" y1="54" x2="82" y2="24" stroke="#F3D28A" strokeWidth="1.5" />
        <circle cx="80" cy="22" r="5" fill="#D49B35" />
      </g>
      <g className={pinClassName} style={{ animationDelay: '0.6s' }}>
        <line x1="148" y1="54" x2="158" y2="24" stroke="#F3D28A" strokeWidth="1.5" />
        <circle cx="160" cy="22" r="5" fill="#D49B35" />
      </g>
      <g className={pinClassName} style={{ animationDelay: '0.9s' }}>
        <line x1="66" y1="70" x2="50" y2="44" stroke="#F3D28A" strokeWidth="1.4" />
        <circle cx="48" cy="42" r="4.5" fill="#F3D28A" />
      </g>
      <g className={pinClassName} style={{ animationDelay: '1.2s' }}>
        <line x1="174" y1="70" x2="190" y2="44" stroke="#F3D28A" strokeWidth="1.4" />
        <circle cx="192" cy="42" r="4.5" fill="#F3D28A" />
      </g>

      {/* Siger Sunda Kencana Crown Body */}
      <path
        d="M24 122 C46 78, 88 68, 120 30 C152 68, 194 78, 216 122 C175 106, 65 106, 24 122 Z"
        stroke="#F3D28A"
        strokeWidth="2.5"
        fill="#D49B35"
        fillOpacity="0.28"
      />
      <path
        d="M48 114 C72 84, 96 74, 120 48 C144 74, 168 84, 192 114"
        stroke="#F3D28A"
        strokeWidth="1.6"
      />
      <polygon points="120,72 129,88 120,104 111,88" fill="#F3D28A" />

      {/* Hanging Jasmine Ronce Mangle on Left & Right Ear */}
      <circle cx="32" cy="130" r="4" fill="#FCF8F2" />
      <circle cx="32" cy="141" r="3.5" fill="#FCF8F2" />
      <circle cx="32" cy="151" r="3" fill="#F3D28A" />
      <circle cx="208" cy="130" r="4" fill="#FCF8F2" />
      <circle cx="208" cy="141" r="3.5" fill="#FCF8F2" />
      <circle cx="208" cy="151" r="3" fill="#F3D28A" />
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
      <path d="M21 200 L30 232 L39 200 Z" fill="#F3D28A" />
    </svg>
  );
}

/**
 * Secondary Shorter Ronce Melati Strand
 */
export function RonceMelatiShort({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 200" fill="none" aria-hidden="true">
      <line x1="30" y1="0" x2="30" y2="170" stroke="#D49B35" strokeWidth="1.2" />
      <ellipse cx="30" cy="22" rx="6" ry="9" fill="#FCF8F2" />
      <ellipse cx="30" cy="46" rx="7" ry="10" fill="#FCF8F2" />
      <ellipse cx="30" cy="70" rx="6" ry="9" fill="#FCF8F2" />
      <ellipse cx="30" cy="94" rx="7" ry="10" fill="#FCF8F2" />
      <ellipse cx="30" cy="118" rx="6" ry="9" fill="#FCF8F2" />
      <path d="M23 155 L30 182 L37 155 Z" fill="#D49B35" />
    </svg>
  );
}

/**
 * Portrait Frame Ronce Melati Strand
 */
export function PortraitMelatiStrand({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 180" fill="none" aria-hidden="true">
      <line x1="20" y1="0" x2="20" y2="155" stroke="#D49B35" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="5" fill="#FCF8F2" />
      <circle cx="20" cy="40" r="5.5" fill="#FCF8F2" />
      <circle cx="20" cy="60" r="5" fill="#FCF8F2" />
      <circle cx="20" cy="80" r="5.5" fill="#FCF8F2" />
      <circle cx="20" cy="100" r="5" fill="#FCF8F2" />
      <circle cx="20" cy="120" r="5" fill="#FCF8F2" />
      <path d="M14 145 L20 170 L26 145 Z" fill="#F3D28A" />
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

/**
 * Hero Top Hanging Ronce Melati Frame
 */
export function HeroMelatiFrame({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 100" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0,5 Q200,85 400,10 Q600,90 800,10 Q1000,85 1200,5"
        fill="none"
        stroke="#FCF8F2"
        strokeWidth="5"
        strokeDasharray="2 12"
        strokeLinecap="round"
      />
      <path
        d="M0,18 Q200,98 400,22 Q600,102 800,22 Q1000,98 1200,18"
        fill="none"
        stroke="#F3D28A"
        strokeWidth="3"
        strokeDasharray="1 10"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Bottom Carved Sundanese Wave Divider
 */
export function HeroWaveDivider({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M0,70 C320,10 560,85 720,35 C880,85 1120,10 1440,70 L1440,90 L0,90 Z"
      />
    </svg>
  );
}

/**
 * Siger & Kujang Kembar Ornamental Divider
 */
export function KujangSigerDivider({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 280 65" fill="none" aria-hidden="true">
      <path
        d="M25 35 C65 35, 95 15, 115 8 C105 28, 105 42, 120 50"
        stroke="#4A2C18"
        strokeWidth="1.6"
      />
      <path
        d="M255 35 C215 35, 185 15, 165 8 C175 28, 175 42, 160 50"
        stroke="#4A2C18"
        strokeWidth="1.6"
      />
      <path
        d="M115 42 L140 10 L165 42 Z"
        stroke="#D49B35"
        strokeWidth="2"
        fill="#D49B35"
        fillOpacity="0.2"
      />
      <circle cx="140" cy="28" r="3.5" fill="#B87B18" />
    </svg>
  );
}

/**
 * Top Mini Siger Crown Ornament for Mojang Card
 */
export function MiniSigerCrown({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 55" fill="none" aria-hidden="true">
      <path
        d="M10 48 C30 22, 45 20, 60 6 C75 20, 90 22, 110 48 Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="#D49B35"
        fillOpacity="0.18"
      />
      <circle cx="60" cy="6" r="3.5" fill="#B87B18" />
    </svg>
  );
}

/**
 * Top Mini Bendo & Kujang Ornament for Jajaka Card
 */
export function MiniBendo({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 55" fill="none" aria-hidden="true">
      <path
        d="M15 45 Q60 8 105 45 Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="#4A2C18"
        fillOpacity="0.15"
      />
      <path d="M35 45 Q60 20 85 45" stroke="#B87B18" strokeWidth="1.6" />
    </svg>
  );
}

/**
 * Merak Ngibing Sunda (Blooming Sundanese Peacock Fan Animation)
 */
export function MerakNgibingFan({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 120" fill="none" aria-hidden="true">
      <path
        d="M18 108 C18 48, 62 14, 110 14 C158 14, 202 48, 202 108"
        stroke="#D49B35"
        strokeWidth="1.6"
        strokeDasharray="4 4"
      />
      <path
        d="M42 108 C42 62, 74 32, 110 32 C146 32, 178 62, 178 108"
        stroke="#F3D28A"
        strokeWidth="1.8"
      />
      <line x1="110" y1="108" x2="110" y2="14" stroke="#F3D28A" strokeWidth="1.8" />
      <line x1="110" y1="108" x2="60" y2="28" stroke="#D49B35" strokeWidth="1.4" />
      <line x1="110" y1="108" x2="160" y2="28" stroke="#D49B35" strokeWidth="1.4" />
      <line x1="110" y1="108" x2="28" y2="64" stroke="#D49B35" strokeWidth="1.4" />
      <line x1="110" y1="108" x2="192" y2="64" stroke="#D49B35" strokeWidth="1.4" />
      <circle cx="110" cy="14" r="6" fill="#F3D28A" />
      <circle cx="60" cy="28" r="5" fill="#D49B35" />
      <circle cx="160" cy="28" r="5" fill="#D49B35" />
      <circle cx="28" cy="64" r="4.5" fill="#F3D28A" />
      <circle cx="192" cy="64" r="4.5" fill="#F3D28A" />
    </svg>
  );
}

/**
 * Stylized Vector Map Card in Warm Sunda Teak Theme
 */
export function DagoPakarVectorMap({
  className = '',
  venueTitle = 'BALE JULANG NGAPAK PARAHYANGAN',
  venueSubtitle = 'Titik Lokasi Akad & Upacara Adat Sunda',
}: {
  className?: string;
  venueTitle?: string;
  venueSubtitle?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 600 240" fill="none" aria-hidden="true">
      <path
        d="M0 180 Q180 160 300 120 T600 70"
        stroke="#4A2C18"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M0 180 Q180 160 300 120 T600 70"
        stroke="#D49B35"
        strokeWidth="2"
        strokeDasharray="6 6"
      />
      <path d="M220 0 Q260 110 300 120 Q340 135 390 240" stroke="#3B2211" strokeWidth="12" />
      <circle cx="350" cy="105" r="24" fill="#D49B35" fillOpacity="0.25" />
      <circle cx="350" cy="105" r="10" fill="#F3D28A" stroke="#2C180B" strokeWidth="3" />
      <rect
        x="215"
        y="38"
        width="270"
        height="44"
        rx="10"
        fill="#2C180B"
        stroke="#F3D28A"
        strokeWidth="1.4"
      />
      <text
        x="350"
        y="57"
        textAnchor="middle"
        fill="#F3D28A"
        fontSize="11"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        {venueTitle.slice(0, 34).toUpperCase()}
      </text>
      <text
        x="350"
        y="73"
        textAnchor="middle"
        fill="#FCF8F2"
        fontSize="9"
        fontFamily="sans-serif"
      >
        {venueSubtitle}
      </text>
    </svg>
  );
}
