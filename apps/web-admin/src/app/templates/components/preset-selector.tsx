'use client';

import React from 'react';
import {
  PresetId,
  PRESET_META,
  createPresetConfig,
  getPresetIds,
} from '../utils/template-studio-model';
import { ADMIN_FONT_MAP } from '../utils/admin-fonts';

interface PresetSelectorProps {
  selectedPreset?: PresetId | null;
  onSelect: (presetId: PresetId) => void;
  disabled?: boolean;
}

export function PresetSelector({
  selectedPreset,
  onSelect,
  disabled = false,
}: PresetSelectorProps) {
  const presetIds = getPresetIds();

  return (
    <div className="preset-grid" role="radiogroup" aria-label="Template Presets">
      {presetIds.map((id) => {
        const config = createPresetConfig(id);
        const isSelected = selectedPreset === id;
        const meta = PRESET_META[id];
        const headingFont = ADMIN_FONT_MAP[config.typography.headingFont];
        const bodyFont = ADMIN_FONT_MAP[config.typography.bodyFont];

        return (
          <div
            key={id}
            role="radio"
            aria-checked={isSelected}
            aria-disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            className={`preset-card ${isSelected ? 'preset-card--selected' : ''}`}
            onClick={() => !disabled && onSelect(id)}
            onKeyDown={(e) => {
              if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelect(id);
              }
            }}
          >
            <div className="preset-card__palette">
              <span
                className="preset-card__swatch"
                style={{ backgroundColor: config.theme.primaryColor }}
                title={`Primary: ${config.theme.primaryColor}`}
              />
              <span
                className="preset-card__swatch"
                style={{ backgroundColor: config.theme.secondaryColor }}
                title={`Secondary: ${config.theme.secondaryColor}`}
              />
              <span
                className="preset-card__swatch"
                style={{ backgroundColor: config.theme.backgroundColor }}
                title={`Background: ${config.theme.backgroundColor}`}
              />
              <span
                className="preset-card__swatch"
                style={{ backgroundColor: config.theme.textColor }}
                title={`Text: ${config.theme.textColor}`}
              />
            </div>

            <div className="preset-card__specimen">
              <div
                className={`preset-card__heading ${headingFont?.className || ''}`}
                style={{ color: config.theme.primaryColor }}
              >
                The Wedding
              </div>
              <div
                className={`preset-card__body ${bodyFont?.className || ''}`}
                style={{ color: config.theme.secondaryColor }}
              >
                Save the Date
              </div>
            </div>

            <div className="preset-card__name">{meta.label}</div>
          </div>
        );
      })}
    </div>
  );
}
