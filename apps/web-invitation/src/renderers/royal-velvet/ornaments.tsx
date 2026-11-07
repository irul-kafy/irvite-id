import React from 'react';

export function BaroqueCrestSvg({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="50"
        cy="50"
        r="44"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="4 3"
      />
      <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M50 16C50 16 54 26 64 28C64 28 58 34 50 34C42 34 36 28 36 28C46 26 50 16 50 16Z"
        fill="currentColor"
        fillOpacity="0.4"
      />
      <path
        d="M50 84C50 84 54 74 64 72C64 72 58 66 50 66C42 66 36 72 36 72C46 74 50 84 50 84Z"
        fill="currentColor"
        fillOpacity="0.4"
      />
      <path
        d="M16 50C16 50 26 46 28 36C28 36 34 42 34 50C34 58 28 64 28 64C26 54 16 50 16 50Z"
        fill="currentColor"
        fillOpacity="0.4"
      />
      <path
        d="M84 50C84 50 74 46 72 36C72 36 66 42 66 50C66 58 72 64 72 64C74 54 84 50 84 50Z"
        fill="currentColor"
        fillOpacity="0.4"
      />
    </svg>
  );
}

export function BaroqueCornerSvg({
  className = '',
  flipX = false,
  flipY = false,
}: {
  className?: string;
  flipX?: boolean;
  flipY?: boolean;
}) {
  const transform = [
    flipX ? 'scaleX(-1)' : '',
    flipY ? 'scaleY(-1)' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      style={transform ? { transform } : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 96V20C4 11.163 11.163 4 20 4H96"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 88V24C12 17.373 17.373 12 24 12H88"
        stroke="currentColor"
        strokeWidth="1"
      />
      <circle cx="24" cy="24" r="3" fill="currentColor" />
      <path
        d="M24 24C32 24 40 32 40 40C40 48 32 56 24 56"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeDasharray="2 2"
      />
    </svg>
  );
}

export function BaroqueDividerSvg({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line
        x1="10"
        y1="12"
        x2="95"
        y2="12"
        stroke="currentColor"
        strokeWidth="1"
      />
      <circle cx="102" cy="12" r="2.5" fill="currentColor" />
      <path
        d="M120 4L123 10L129 12L123 14L120 20L117 14L111 12L117 10L120 4Z"
        fill="currentColor"
      />
      <circle cx="138" cy="12" r="2.5" fill="currentColor" />
      <line
        x1="145"
        y1="12"
        x2="230"
        y2="12"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

export function BaroquePetalSvg({
  className = '',
  variant = 1,
}: {
  className?: string;
  variant?: 1 | 2;
}) {
  if (variant === 2) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 2C15.5 6.5 18 10.5 18 14.5C18 18.5 15.3 21.5 12 21.5C8.7 21.5 6 18.5 6 14.5C6 10.5 8.5 6.5 12 2Z" />
      </svg>
    );
  }
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
    </svg>
  );
}

