'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  CalendarEventDetails,
  buildGoogleCalendarUrl,
  buildIcsContent,
  downloadIcsFile,
} from '../../utils/calendar';
import styles from './AddToCalendarButton.module.css';

export interface AddToCalendarButtonProps {
  event: CalendarEventDetails;
  theme?:
    | 'royal-velvet'
    | 'sekar-kedaton'
    | 'swarga-dewata'
    | 'ranah-cinta'
    | 'opaline-nocturne'
    | 'aetheria'
    | 'default';
  label?: string;
  className?: string;
  buttonClassName?: string;
}

export function AddToCalendarButton({
  event,
  theme = 'default',
  label = 'Simpan ke Kalender',
  className = '',
  buttonClassName = '',
}: AddToCalendarButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const themeClassMap: Record<string, string> = {
    'royal-velvet': styles.themeRoyalVelvet,
    'sekar-kedaton': styles.themeSekarKedaton,
    'swarga-dewata': styles.themeSwargaDewata,
    'ranah-cinta': styles.themeRanahCinta,
    'opaline-nocturne': styles.themeOpalineNocturne,
    aetheria: styles.themeAetheria,
    default: styles.themeDefault,
  };

  const themeClass = themeClassMap[theme] || styles.themeDefault;

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleOpenGoogle = useCallback(() => {
    const url = buildGoogleCalendarUrl(event);
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  }, [event]);

  const handleDownloadIcs = useCallback(() => {
    const icsContent = buildIcsContent(event);
    const safeTitle = (event.title || 'undangan-pernikahan')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    downloadIcsFile(`${safeTitle}.ics`, icsContent);
    setIsOpen(false);
  }, [event]);

  return (
    <div
      ref={containerRef}
      className={`${styles.wrapper} ${themeClass} ${className}`.trim()}
    >
      <button
        type="button"
        className={`${styles.triggerBtn} ${buttonClassName}`.trim()}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`${label} - ${event.title}`}
      >
        <span className={styles.calendarIcon} aria-hidden="true">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <circle cx="12" cy="15" r="1" fill="currentColor" />
          </svg>
        </span>
        <span>{label}</span>
        <span
          className={`${styles.caret} ${isOpen ? styles.caretOpen : ''}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      <div
        className={`${styles.dropdown} ${isOpen ? styles.dropdownOpen : ''}`}
        role="menu"
        aria-orientation="vertical"
      >
        <button
          type="button"
          className={styles.menuItem}
          role="menuitem"
          onClick={handleOpenGoogle}
        >
          <span className={styles.menuItemIcon} aria-hidden="true">
            📅
          </span>
          <span>Google Calendar</span>
        </button>

        <button
          type="button"
          className={styles.menuItem}
          role="menuitem"
          onClick={handleDownloadIcs}
        >
          <span className={styles.menuItemIcon} aria-hidden="true">
            🍏
          </span>
          <span>Apple / iCal (.ics)</span>
        </button>
      </div>
    </div>
  );
}
