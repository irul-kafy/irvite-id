'use client';

import React from 'react';
import { ContentFieldDefinition, ContentFieldRenderer } from './content-field-renderer';

interface RepeaterEditorProps {
  field: ContentFieldDefinition;
  items: Array<Record<string, unknown>>;
  onChange: (items: Array<Record<string, unknown>>) => void;
  disabled?: boolean;
}

export function RepeaterEditor({
  field,
  items = [],
  onChange,
  disabled = false,
}: RepeaterEditorProps) {
  const maxItems = field.maxItems || 10;
  const canAdd = items.length < maxItems && !disabled;
  const nestedFields = field.fields || [];

  const handleAddItem = () => {
    if (!canAdd) return;
    const newItem: Record<string, unknown> = {};
    for (const sub of nestedFields) {
      newItem[sub.key] = '';
    }
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (disabled) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const handleNestedFieldChange = (index: number, subKey: string, val: unknown) => {
    if (disabled) return;
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      return {
        ...item,
        [subKey]: val,
      };
    });
    onChange(updated);
  };

  return (
    <div className="card mb-4" style={{ border: '1px solid var(--admin-border)' }}>
      <div className="card-header flex-between">
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {field.label}
          </h3>
          <p className="text-xs text-muted" style={{ margin: '0.25rem 0 0 0' }}>
            Daftar {field.label.toLowerCase()}. Maksimal {maxItems} item.
          </p>
        </div>
        <span className="badge badge--info">
          {items.length} / {maxItems} Item
        </span>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {items.length === 0 ? (
          <div
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              borderRadius: 'var(--radius-md)',
              background: 'var(--admin-bg)',
              border: '1px dashed var(--admin-border)',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
            }}
          >
            Belum ada data {field.label.toLowerCase()}. Klik tombol di bawah untuk menambahkan.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={index}
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--admin-bg)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <div className="flex-between mb-3">
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {field.label} #{index + 1}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)', padding: '0.25rem 0.5rem' }}
                  onClick={() => handleRemoveItem(index)}
                  disabled={disabled}
                  aria-label={`Hapus ${field.label} ${index + 1}`}
                >
                  Hapus Item
                </button>
              </div>

              <div className="grid-2" style={{ gap: '1rem' }}>
                {nestedFields.map((subField) => (
                  <div
                    key={subField.key}
                    style={{
                      gridColumn: subField.type === 'textarea' ? 'span 2' : undefined,
                    }}
                  >
                    <ContentFieldRenderer
                      field={subField}
                      value={item[subField.key]}
                      disabled={disabled}
                      onChange={(val) => handleNestedFieldChange(index, subField.key, val)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.25rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm flex-center gap-1"
            onClick={handleAddItem}
            disabled={!canAdd}
          >
            + Tambah {field.label}
          </button>
        </div>
      </div>
    </div>
  );
}
