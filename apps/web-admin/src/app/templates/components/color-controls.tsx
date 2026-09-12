'use client';

import React, { useRef } from 'react';
import {
  ThemeColors,
  ThemeColorKey,
  isValidHexColor,
} from '../utils/template-studio-model';

interface ColorControlsProps {
  colors: ThemeColors;
  onChange: (key: ThemeColorKey, value: string) => void;
  disabled?: boolean;
}

interface ColorFieldConfig {
  key: ThemeColorKey;
  label: string;
  description: string;
}

const COLOR_FIELDS: ColorFieldConfig[] = [
  {
    key: 'primaryColor',
    label: 'Primary Color',
    description: 'Used for headings, main titles, and primary accents',
  },
  {
    key: 'secondaryColor',
    label: 'Secondary Color',
    description: 'Used for subheadings, greetings, and secondary details',
  },
  {
    key: 'backgroundColor',
    label: 'Background Color',
    description: 'Outer page backdrop and theme canvas background',
  },
  {
    key: 'textColor',
    label: 'Text Color',
    description: 'Base color for body copy, paragraphs, and labels',
  },
];

export function ColorControls({
  colors,
  onChange,
  disabled = false,
}: ColorControlsProps) {
  const inputRefs = {
    primaryColor: useRef<HTMLInputElement>(null),
    secondaryColor: useRef<HTMLInputElement>(null),
    backgroundColor: useRef<HTMLInputElement>(null),
    textColor: useRef<HTMLInputElement>(null),
  };

  return (
    <div className="color-controls-group">
      {COLOR_FIELDS.map(({ key, label, description }) => {
        const val = colors[key];
        const isValid = isValidHexColor(val);

        return (
          <div key={key} className="color-control">
            <label className="studio-label" htmlFor={`color-hex-${key}`}>
              {label}
            </label>
            <div className="color-control__row">
              <button
                type="button"
                className="color-control__swatch"
                style={{ backgroundColor: isValid ? val : '#000000' }}
                title={`Pick ${label}`}
                disabled={disabled}
                onClick={() => {
                  if (!disabled) {
                    inputRefs[key].current?.click();
                  }
                }}
                aria-label={`Open color picker for ${label}`}
              >
                <input
                  ref={inputRefs[key]}
                  id={`color-native-${key}`}
                  type="color"
                  className="color-control__native"
                  value={isValid ? val : '#000000'}
                  disabled={disabled}
                  onChange={(e) => onChange(key, e.target.value)}
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </button>
              <div className="color-control__hex">
                <input
                  id={`color-hex-${key}`}
                  type="text"
                  className={`studio-input studio-input--mono ${!isValid ? 'studio-input--error' : ''}`}
                  value={val}
                  maxLength={7}
                  placeholder="#111827"
                  disabled={disabled}
                  onChange={(e) => {
                    let next = e.target.value.trim();
                    if (next && !next.startsWith('#')) {
                      next = `#${next}`;
                    }
                    onChange(key, next);
                  }}
                  aria-invalid={!isValid}
                  aria-describedby={`desc-${key}`}
                />
              </div>
            </div>
            <div id={`desc-${key}`} className="studio-field-desc" style={{ fontSize: 'var(--admin-font-size-xs)', color: 'var(--admin-text-secondary)', marginTop: '4px' }}>
              {description}
            </div>
            {!isValid && (
              <div className="studio-error" role="alert">
                Must be a valid 6-digit hex code (e.g. #111827)
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
