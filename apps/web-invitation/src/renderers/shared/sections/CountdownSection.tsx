'use client';

import React, { useEffect, useState } from 'react';

export interface CountdownSectionProps {
  datetime?: string;
  epoch?: number | null;
  className?: string;
  itemClassName?: string;
  numberClassName?: string;
  labelClassName?: string;
  labels?: [string, string, string, string];
  variant?: 'cards' | 'minimal' | 'boxes';
  style?: React.CSSProperties;
}

export function CountdownSection({
  datetime,
  epoch,
  className,
  itemClassName,
  numberClassName,
  labelClassName,
  labels = ['Hari', 'Jam', 'Menit', 'Detik'],
  style,
}: CountdownSectionProps) {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    let target = epoch ?? null;
    if (target === null && datetime) {
      const parsed = Date.parse(datetime);
      if (!Number.isNaN(parsed)) {
        target = parsed;
      }
    }

    if (target === null) {
      const t = window.setTimeout(() => setSeconds(null), 0);
      return () => clearTimeout(t);
    }

    const tick = () => {
      setSeconds(Math.max(0, Math.floor(((target as number) - Date.now()) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [datetime, epoch]);

  const values =
    seconds === null
      ? [null, null, null, null]
      : [
          Math.floor(seconds / 86400),
          Math.floor(seconds / 3600) % 24,
          Math.floor(seconds / 60) % 60,
          seconds % 60,
        ];

  return (
    <div
      className={className}
      role="timer"
      aria-label="Hitung mundur menuju acara"
      style={style}
    >
      {values.map((val, idx) => (
        <div key={labels[idx]} className={itemClassName}>
          <strong className={numberClassName}>
            {val === null ? '—' : String(val).padStart(2, '0')}
          </strong>
          <span className={labelClassName}>{labels[idx]}</span>
        </div>
      ))}
    </div>
  );
}
