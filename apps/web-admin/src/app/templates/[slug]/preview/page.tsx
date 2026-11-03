'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FIXED_CATALOG_TEMPLATES } from '../../utils/catalog-registry';
import { getTrustedInvitationOrigin } from '../../../../utils/url';
import '../../template-studio.css';

export default function TemplateAdminPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');

  const catalogItem = FIXED_CATALOG_TEMPLATES.find((t) => t.slug === slug);

  const invitationOrigin =
    getTrustedInvitationOrigin() ||
    (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
      ? 'https://irvite-id.vercel.app'
      : 'http://localhost:3002');

  const previewIframeSrc = catalogItem
    ? `${invitationOrigin}/templates/${catalogItem.slug}/demo?embed=true`
    : null;

  if (!catalogItem) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'inherit' }}>
        <h2>Template tidak ditemukan</h2>
        <p style={{ color: 'var(--admin-text-secondary)', marginBottom: '1.5rem' }}>
          Template dengan slug &ldquo;{slug}&rdquo; tidak terdaftar di katalog.
        </p>
        <Link href="/templates" className="template-card__btn template-card__btn--select" style={{ textDecoration: 'none' }}>
          ← Kembali ke Katalog Template
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--admin-bg, #fafaf9)' }}>
      {/* ── Admin Top Navigation Bar ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          background: 'var(--admin-surface, #ffffff)',
          borderBottom: '1px solid var(--admin-border, #e7e5e4)',
          zIndex: 10,
          position: 'sticky',
          top: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            href="/templates"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--admin-accent, #2563eb)',
              textDecoration: 'none',
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              background: 'var(--admin-surface-raised, #f5f5f4)',
            }}
          >
            ← Kembali ke Katalog
          </Link>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--admin-text, #1c1917)' }}>
                {catalogItem.displayName}
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'var(--admin-accent-light, #eff6ff)',
                  color: 'var(--admin-accent, #2563eb)',
                }}
              >
                Pratinjau Admin
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--admin-text-secondary, #57534e)' }}>
              {catalogItem.category} • Tema {catalogItem.themeCode}
            </p>
          </div>
        </div>

        {/* ── Viewport Selector ── */}
        <div style={{ display: 'inline-flex', background: 'var(--admin-surface-raised, #f5f5f4)', borderRadius: '6px', padding: '3px', border: '1px solid var(--admin-border, #e7e5e4)' }}>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              background: device === 'mobile' ? 'var(--admin-surface, #ffffff)' : 'transparent',
              color: device === 'mobile' ? 'var(--admin-accent, #2563eb)' : 'var(--admin-text-secondary, #57534e)',
              fontWeight: device === 'mobile' ? 600 : 400,
              boxShadow: device === 'mobile' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            📱 HP (Mobile)
          </button>
          <button
            type="button"
            onClick={() => setDevice('tablet')}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              background: device === 'tablet' ? 'var(--admin-surface, #ffffff)' : 'transparent',
              color: device === 'tablet' ? 'var(--admin-accent, #2563eb)' : 'var(--admin-text-secondary, #57534e)',
              fontWeight: device === 'tablet' ? 600 : 400,
              boxShadow: device === 'tablet' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            📲 Tablet
          </button>
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              background: device === 'desktop' ? 'var(--admin-surface, #ffffff)' : 'transparent',
              color: device === 'desktop' ? 'var(--admin-accent, #2563eb)' : 'var(--admin-text-secondary, #57534e)',
              fontWeight: device === 'desktop' ? 600 : 400,
              boxShadow: device === 'desktop' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            🖥️ Desktop
          </button>
        </div>

        {/* ── Actions ── */}
        <div>
          <button
            type="button"
            onClick={() => router.push(`/events/create?templateId=${encodeURIComponent(catalogItem.slug)}`)}
            className="template-card__btn template-card__btn--select"
            style={{ padding: '0.45rem 1rem', fontSize: '0.8125rem' }}
          >
            Gunakan Template Ini
          </button>
        </div>
      </header>

      {/* ── Preview Stage ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: device === 'desktop' ? '0' : '1.5rem',
          background: 'var(--admin-surface-inset, #f0f0ee)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width:
              device === 'desktop'
                ? '100%'
                : device === 'tablet'
                ? '768px'
                : '390px',
            height: device === 'desktop' ? 'calc(100vh - 65px)' : '820px',
            maxHeight: device === 'desktop' ? 'none' : 'calc(100vh - 100px)',
            borderRadius: device === 'desktop' ? '0' : '36px',
            padding: device === 'desktop' ? '0' : '10px',
            background: device === 'desktop' ? 'transparent' : '#000000',
            boxShadow:
              device === 'desktop'
                ? 'none'
                : '0 20px 40px rgba(0, 0, 0, 0.25), inset 0 0 0 2px #334155',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.25s ease',
          }}
        >
          {previewIframeSrc && (
            <iframe
              src={previewIframeSrc}
              title={`Pratinjau ${catalogItem.displayName}`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: device === 'desktop' ? '0' : '26px',
                background: '#ffffff',
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

