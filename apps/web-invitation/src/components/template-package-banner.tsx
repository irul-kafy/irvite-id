'use client';

import React, { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  ACTIVE_PRICE_TIER,
  CAPACITY_BASE_PRICES,
  PACKAGE_PRICES,
  getPackageDisplayLabel,
  isPresetPackageCode,
  type SelectablePackageCode,
} from 'pricing';
import {
  getDefaultOptionsForPackage,
  loadPackageSelectionFromSession,
  parsePackageCodeParam,
  savePackageSelectionToSession,
  formatRupiah,
} from '../customizer/template-customizer';

interface TemplatePackageBannerProps {
  queryPackageCode?: string | null;
}

function subscribeSessionStorage(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSessionPackageSnapshot(): SelectablePackageCode | null {
  const stored = loadPackageSelectionFromSession();
  return stored?.packageCode ?? null;
}

function getServerPackageSnapshot(): SelectablePackageCode | null {
  return null;
}

export function TemplatePackageBanner({
  queryPackageCode,
}: TemplatePackageBannerProps) {
  const parsedFromQuery = parsePackageCodeParam(queryPackageCode);
  const storedPackageCode = useSyncExternalStore(
    subscribeSessionStorage,
    getSessionPackageSnapshot,
    getServerPackageSnapshot,
  );

  useEffect(() => {
    if (parsedFromQuery) {
      const existing = loadPackageSelectionFromSession();
      if (!existing || existing.packageCode !== parsedFromQuery) {
        savePackageSelectionToSession({
          packageCode: parsedFromQuery,
          options: getDefaultOptionsForPackage(parsedFromQuery),
        });
      }
    }
  }, [parsedFromQuery]);

  const activePackageCode = parsedFromQuery ?? storedPackageCode;
  if (!activePackageCode) {
    return null;
  }

  const label = getPackageDisplayLabel(activePackageCode);
  const basePrice = isPresetPackageCode(activePackageCode)
    ? PACKAGE_PRICES[ACTIVE_PRICE_TIER][activePackageCode]
    : CAPACITY_BASE_PRICES[50];

  return (
    <div
      data-testid="selected-package-banner"
      style={{
        maxWidth: '920px',
        margin: '0 auto 1.75rem',
        padding: '0.85rem 1.25rem',
        borderRadius: '14px',
        background: 'rgba(197, 168, 128, 0.14)',
        border: '1px solid rgba(197, 168, 128, 0.42)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        fontSize: '0.9rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span aria-hidden="true">✨</span>
        <span>
          Paket <strong>{label}</strong> dipilih{' '}
          <span style={{ opacity: 0.85 }}>
            ({activePackageCode === 'CUSTOM' ? 'mulai ' : ''}
            {formatRupiah(basePrice)})
          </span>
        </span>
      </div>
      <Link
        href="/undangan#paket"
        style={{
          fontWeight: 600,
          color: 'var(--cat-accent, #c5a880)',
          textDecoration: 'underline',
          fontSize: '0.85rem',
        }}
      >
        (ganti paket)
      </Link>
    </div>
  );
}
