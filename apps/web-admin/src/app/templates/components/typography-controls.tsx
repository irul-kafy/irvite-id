'use client';

import React from 'react';
import {
  Typography,
  ALLOWED_FONTS,
} from '../utils/template-studio-model';
import { ADMIN_FONT_MAP } from '../utils/admin-fonts';

interface TypographyControlsProps {
  typography: Typography;
  onChange: (field: 'headingFont' | 'bodyFont', value: string) => void;
  disabled?: boolean;
}

interface FontSectionConfig {
  field: 'headingFont' | 'bodyFont';
  title: string;
  description: string;
  sampleText: string;
}

const FONT_SECTIONS: FontSectionConfig[] = [
  {
    field: 'headingFont',
    title: 'Heading Font',
    description: 'Applied to event title, section titles, and major greetings',
    sampleText: 'The Wedding of Sarah & James',
  },
  {
    field: 'bodyFont',
    title: 'Body Font',
    description: 'Applied to event descriptions, location details, and RSVP instructions',
    sampleText: 'We invite you to celebrate our special day with us',
  },
];

export function TypographyControls({
  typography,
  onChange,
  disabled = false,
}: TypographyControlsProps) {
  return (
    <div className="typography-controls-group">
      {FONT_SECTIONS.map(({ field, title, description, sampleText }) => {
        const currentVal = typography[field];

        return (
          <div key={field} className="studio-field" style={{ marginBottom: 'var(--admin-space-xl)' }}>
            <label className="studio-label">{title}</label>
            <p
              style={{
                fontSize: 'var(--admin-font-size-xs)',
                color: 'var(--admin-text-secondary)',
                margin: '0 0 var(--admin-space-md) 0',
              }}
            >
              {description}
            </p>

            <div
              className="font-radiogroup"
              role="radiogroup"
              aria-label={title}
            >
              {ALLOWED_FONTS.map((fontKey) => {
                const fontInfo = ADMIN_FONT_MAP[fontKey];
                const isSelected = currentVal === fontKey;

                return (
                  <div
                    key={fontKey}
                    role="radio"
                    aria-checked={isSelected}
                    aria-disabled={disabled}
                    tabIndex={disabled ? -1 : 0}
                    className={`font-radio ${isSelected ? 'font-radio--selected' : ''}`}
                    onClick={() => !disabled && onChange(field, fontKey)}
                    onKeyDown={(e) => {
                      if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onChange(field, fontKey);
                      }
                    }}
                  >
                    <div className="font-radio__indicator">
                      <div className="font-radio__dot" />
                    </div>

                    <div className="font-radio__content">
                      <div className="font-radio__name">{fontInfo.label}</div>
                      <div
                        className={`font-radio__specimen ${fontInfo.className}`}
                        style={{ fontSize: field === 'headingFont' ? '1rem' : '0.875rem' }}
                      >
                        {sampleText}
                      </div>
                    </div>

                    <svg
                      className="font-radio__check"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
