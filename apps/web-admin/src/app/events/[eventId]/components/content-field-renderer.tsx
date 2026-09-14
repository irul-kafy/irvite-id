'use client';

import React from 'react';

export interface ContentFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'datetime' | 'url' | 'select' | 'repeater';
  required?: boolean;
  maxLength?: number;
  options?: Array<{ label: string; value: string }>;
  maxItems?: number;
  fields?: ContentFieldDefinition[];
  urlPolicy?: 'https' | 'google-maps';
}

interface ContentFieldRendererProps {
  field: ContentFieldDefinition;
  value: unknown;
  onChange: (val: unknown) => void;
  disabled?: boolean;
}

/**
 * Formats a stored datetime string to YYYY-MM-DDTHH:mm for datetime-local input.
 * Timezone-neutral: extracts the date and time components directly without
 * applying browser-local timezone conversions or UTC shifts.
 */
export function formatDatetimeForInput(val: unknown): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  // Match YYYY-MM-DDTHH:mm pattern (supports seconds/subseconds/offset/Z suffixes)
  const match = /^([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2})/.exec(trimmed);
  if (match) {
    return match[1];
  }
  return trimmed;
}

export function ContentFieldRenderer({
  field,
  value,
  onChange,
  disabled = false,
}: ContentFieldRendererProps) {
  // Never render _schemaVersion as editable field
  if (field.key === '_schemaVersion') {
    return null;
  }

  const strValue = typeof value === 'string' ? value : '';

  switch (field.type) {
    case 'text':
      return (
        <div className="form-group">
          <label htmlFor={`field-${field.key}`} className="form-label">
            {field.label}
            {field.required && <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span>}
          </label>
          <input
            id={`field-${field.key}`}
            type="text"
            className="form-input"
            value={strValue}
            maxLength={field.maxLength}
            disabled={disabled}
            placeholder={`Masukkan ${field.label.toLowerCase()}`}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.maxLength && (
            <span className="form-hint" style={{ textAlign: 'right', display: 'block' }}>
              {strValue.length} / {field.maxLength} karakter
            </span>
          )}
        </div>
      );

    case 'textarea':
      return (
        <div className="form-group">
          <label htmlFor={`field-${field.key}`} className="form-label">
            {field.label}
            {field.required && <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span>}
          </label>
          <textarea
            id={`field-${field.key}`}
            rows={3}
            className="form-textarea"
            value={strValue}
            maxLength={field.maxLength}
            disabled={disabled}
            placeholder={`Masukkan ${field.label.toLowerCase()}`}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.maxLength && (
            <span className="form-hint" style={{ textAlign: 'right', display: 'block' }}>
              {strValue.length} / {field.maxLength} karakter
            </span>
          )}
        </div>
      );

    case 'datetime': {
      const dtValue = formatDatetimeForInput(value);

      return (
        <div className="form-group">
          <label htmlFor={`field-${field.key}`} className="form-label">
            {field.label}
            {field.required && <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span>}
          </label>
          <input
            id={`field-${field.key}`}
            type="datetime-local"
            className="form-input"
            value={dtValue}
            disabled={disabled}
            onChange={(e) => {
              const val = e.target.value;
              // Store directly as timezone-neutral event-local datetime string (e.g. 2026-12-20T10:00).
              // DO NOT call new Date(val).toISOString() which applies browser-local timezone conversion.
              onChange(val || '');
            }}
          />
          <span className="form-hint">Format tanggal dan waktu pelaksanaan acara (dalam zona waktu terpilih).</span>
        </div>
      );
    }
	    case 'url':
      return (
        <div className="form-group">
          <label htmlFor={`field-${field.key}`} className="form-label">
            {field.label}
            {field.required && <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span>}
          </label>
          <input
            id={`field-${field.key}`}
            type="url"
            className="form-input"
            value={strValue}
            maxLength={field.maxLength || 2048}
            disabled={disabled}
            placeholder={
              field.urlPolicy === 'google-maps'
                ? 'https://maps.google.com/...'
                : 'https://...'
            }
            onChange={(e) => onChange(e.target.value)}
          />
          {field.urlPolicy === 'google-maps' ? (
            <span className="form-hint">
              Harus berupa URL Google Maps valid (maps.google.com, goo.gl, atau maps.app.goo.gl).
            </span>
          ) : (
            <span className="form-hint">Gunakan format URL lengkap diawali https://</span>
          )}
        </div>
      );

    case 'select':
      return (
        <div className="form-group">
          <label htmlFor={`field-${field.key}`} className="form-label">
            {field.label}
            {field.required && <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span>}
          </label>
          <select
            id={`field-${field.key}`}
            className="form-select"
            value={strValue}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">-- Pilih {field.label} --</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.value})
              </option>
            ))}
          </select>
        </div>
      );

    default:
      return null;
  }
}
