'use client';

import React from 'react';

export interface GiftAccountItem {
  bankName: string;
  accountNumber: string; // Strictly string, preserves leading zeros
  accountHolderName: string;
}

interface GiftAccountsEditorProps {
  accounts: GiftAccountItem[];
  onChange: (accounts: GiftAccountItem[]) => void;
  disabled?: boolean;
  maxItems?: number;
}

export function GiftAccountsEditor({
  accounts = [],
  onChange,
  disabled = false,
  maxItems = 3,
}: GiftAccountsEditorProps) {
  const maxAccounts = maxItems;
  const canAdd = accounts.length < maxAccounts && !disabled;

  const handleAddAccount = () => {
    if (!canAdd) return;
    const updated = [
      ...accounts,
      {
        bankName: '',
        accountNumber: '', // Starts as empty string
        accountHolderName: '',
      },
    ];
    onChange(updated);
  };

  const handleRemoveAccount = (index: number) => {
    if (disabled) return;
    const updated = accounts.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleFieldChange = (
    index: number,
    field: keyof GiftAccountItem,
    value: string
  ) => {
    if (disabled) return;
    const updated = accounts.map((acc, i) => {
      if (i !== index) return acc;
      // CRITICAL: accountNumber MUST remain a string to preserve precision and leading zeros.
      // NO Number(), parseInt(), parseFloat(), or numeric coercion.
      return {
        ...acc,
        [field]: value,
      };
    });
    onChange(updated);
  };

  return (
    <div className="card mb-4" style={{ border: '1px solid var(--admin-border)' }}>
      <div className="card-header flex-between">
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Rekening Hadiah (Gift Accounts)
          </h3>
          <p className="text-xs text-muted" style={{ margin: '0.25rem 0 0 0' }}>
            Informasi nomor rekening bank untuk amplop digital / hadiah non-tunai. Maksimal {maxAccounts} rekening.
          </p>
        </div>
        <span className="badge badge--info">
          {accounts.length} / {maxAccounts} Rekening
        </span>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {accounts.length === 0 ? (
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
            Belum ada rekening hadiah ditambahkan. Klik tombol di bawah untuk menambah rekening.
          </div>
        ) : (
          accounts.map((acc, index) => (
            <div
              key={index}
              style={{
                padding: '1rem 1.25rem',
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
                  Rekening {index + 1}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)', padding: '0.25rem 0.5rem' }}
                  onClick={() => handleRemoveAccount(index)}
                  disabled={disabled}
                  aria-label={`Hapus rekening ${index + 1}`}
                >
                  Hapus Rekening
                </button>
              </div>

              <div className="grid-3" style={{ gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor={`gift-bank-${index}`} className="form-label text-xs">
                    Nama Bank <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    id={`gift-bank-${index}`}
                    type="text"
                    className="form-input text-sm"
                    placeholder="Contoh: BCA, Mandiri, BRI"
                    maxLength={100}
                    value={acc.bankName}
                    disabled={disabled}
                    onChange={(e) => handleFieldChange(index, 'bankName', e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor={`gift-number-${index}`} className="form-label text-xs">
                    Nomor Rekening <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    id={`gift-number-${index}`}
                    type="text"
                    inputMode="numeric"
                    className="form-input text-sm font-mono"
                    placeholder="Contoh: 001234567890"
                    maxLength={50}
                    value={acc.accountNumber}
                    disabled={disabled}
                    onChange={(e) => handleFieldChange(index, 'accountNumber', e.target.value)}
                  />
                  <span className="form-hint" style={{ fontSize: '0.7rem' }}>
                    Format teks utuh (angka nol di depan tetap tersimpan).
                  </span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor={`gift-holder-${index}`} className="form-label text-xs">
                    Nama Pemilik Rekening <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    id={`gift-holder-${index}`}
                    type="text"
                    className="form-input text-sm"
                    placeholder="Contoh: Ka & Dita"
                    maxLength={120}
                    value={acc.accountHolderName}
                    disabled={disabled}
                    onChange={(e) => handleFieldChange(index, 'accountHolderName', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.25rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm flex-center gap-1"
            onClick={handleAddAccount}
            disabled={!canAdd}
            id="btn-add-gift-account"
          >
            + Tambah Rekening Hadiah
          </button>
        </div>
      </div>
    </div>
  );
}
