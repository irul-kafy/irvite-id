'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FIXED_CATALOG_TEMPLATES } from '../../utils/catalog-registry';
import { getTrustedInvitationOrigin } from '../../../../utils/url';

type ViewportDevice = 'desktop' | 'tablet' | 'mobile';

export default function TemplateAdminPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.slug === 'string' ? params.slug : '';

  const [viewportDevice, setViewportDevice] = useState<ViewportDevice>('desktop');
  const [deviceZoom, setDeviceZoom] = useState<number>(100);

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
      <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Template tidak ditemukan</h2>
        <p style={{ color: '#57534e', marginBottom: '1.5rem' }}>
          Template dengan slug &ldquo;{slug}&rdquo; tidak terdaftar di katalog.
        </p>
        <Link
          href="/templates"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            background: '#19382c',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
          }}
        >
          ← Kembali ke Katalog Template
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d1512',
        color: '#f8f6f0',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* ── Top Floating Sandbox Control Bar (Identical to Web Client Studio) ── */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          zIndex: 9990,
          background: 'rgba(15, 31, 24, 0.94)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(194, 165, 109, 0.28)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          gap: '12px',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.25)',
        }}
        role="region"
        aria-label="Panel Kontrol Pratinjau Undangan Admin"
      >
        {/* Left: Back & Template Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <Link
            href="/templates"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#d8cfc0',
              textDecoration: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              padding: '6px 14px',
              borderRadius: '999px',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              background: 'rgba(255, 255, 255, 0.05)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            ← Katalog
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.9375rem',
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {catalogItem.displayName}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: 'rgba(194, 165, 109, 0.18)',
                color: '#ebd5a7',
                border: '1px solid rgba(194, 165, 109, 0.38)',
                whiteSpace: 'nowrap',
              }}
              title="Pratinjau resmi template di domain irvite-admin"
            >
              🔒 PRATINJAU ADMIN
            </span>
          </div>
        </div>

        {/* Center: Figma-Style Viewport & Scale Switcher */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '999px',
            padding: '4px',
          }}
          role="group"
          aria-label="Pilih ukuran layar pratinjau"
        >
          <button
            type="button"
            onClick={() => {
              setViewportDevice('desktop');
              setDeviceZoom(100);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '999px',
              border: 'none',
              background: viewportDevice === 'desktop' ? '#ebd5a7' : 'transparent',
              color: viewportDevice === 'desktop' ? '#0f1f18' : '#cbd5d0',
              fontSize: '0.76rem',
              fontWeight: viewportDevice === 'desktop' ? 700 : 600,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              whiteSpace: 'nowrap',
              boxShadow: viewportDevice === 'desktop' ? '0 2px 8px rgba(0, 0, 0, 0.25)' : 'none',
            }}
            title="Pratinjau Layar Laptop / Desktop (Penuh)"
          >
            <span>🖥️</span>
            <span>Desktop</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewportDevice('tablet');
              setDeviceZoom(80);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '999px',
              border: 'none',
              background: viewportDevice === 'tablet' ? '#ebd5a7' : 'transparent',
              color: viewportDevice === 'tablet' ? '#0f1f18' : '#cbd5d0',
              fontSize: '0.76rem',
              fontWeight: viewportDevice === 'tablet' ? 700 : 600,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              whiteSpace: 'nowrap',
              boxShadow: viewportDevice === 'tablet' ? '0 2px 8px rgba(0, 0, 0, 0.25)' : 'none',
            }}
            title="Pratinjau Tablet (768 × 920 px)"
          >
            <span>📲</span>
            <span>Tablet</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewportDevice('mobile');
              setDeviceZoom(85);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '999px',
              border: 'none',
              background: viewportDevice === 'mobile' ? '#ebd5a7' : 'transparent',
              color: viewportDevice === 'mobile' ? '#0f1f18' : '#cbd5d0',
              fontSize: '0.76rem',
              fontWeight: viewportDevice === 'mobile' ? 700 : 600,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              whiteSpace: 'nowrap',
              boxShadow: viewportDevice === 'mobile' ? '0 2px 8px rgba(0, 0, 0, 0.25)' : 'none',
            }}
            title="Pratinjau Layar HP / Smartphone (390 × 812 px)"
          >
            <span>📱</span>
            <span>HP (Mobile)</span>
          </button>

          {viewportDevice !== 'desktop' && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                marginLeft: '4px',
                paddingLeft: '6px',
                borderLeft: '1px solid rgba(255, 255, 255, 0.16)',
              }}
              aria-label="Skala Zoom Layar"
            >
              {[75, 85, 100].map((zoomVal) => (
                <button
                  key={zoomVal}
                  type="button"
                  onClick={() => setDeviceZoom(zoomVal)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '999px',
                    border: 'none',
                    background: deviceZoom === zoomVal ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title={`Zoom ${zoomVal}%`}
                >
                  {zoomVal}%
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Use Template Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <button
            type="button"
            id="btn-use-template-from-preview"
            onClick={() => router.push(`/events/create?templateId=${encodeURIComponent(catalogItem.slug)}`)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: '8px 18px',
              borderRadius: '999px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: 'none',
              whiteSpace: 'nowrap',
              background: 'linear-gradient(135deg, #c5a365 0%, #9f7e3d 100%)',
              color: '#0f1f18',
              boxShadow: '0 4px 14px rgba(197, 163, 101, 0.35)',
            }}
          >
            Gunakan Template Ini →
          </button>
        </div>
      </header>

      {/* ── Live Preview Canvas Stage ── */}
      <main
        style={{
          paddingTop: '60px',
          height: '100vh',
          boxSizing: 'border-box',
          overflow: viewportDevice === 'desktop' ? 'hidden' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: '#131c18',
          backgroundImage:
            viewportDevice !== 'desktop'
              ? 'radial-gradient(rgba(197, 163, 101, 0.18) 1px, transparent 1px)'
              : 'none',
          backgroundSize: '22px 22px',
          paddingBottom: viewportDevice !== 'desktop' ? '40px' : '0',
        }}
      >
        {viewportDevice !== 'desktop' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '12px 16px 8px',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(197, 163, 101, 0.35)',
                color: '#ebd5a7',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                padding: '4px 12px',
                borderRadius: '999px',
              }}
            >
              {viewportDevice === 'mobile'
                ? '📱 iPhone / Smartphone • 390 × 812 px'
                : '📲 iPad / Tablet • 768 × 920 px'}
            </span>
            <span style={{ color: '#8fa399', fontSize: '0.74rem' }}>
              Scroll di dalam layar perangkat untuk menjelajahi undangan
            </span>
          </div>
        )}

        <div
          style={
            viewportDevice === 'desktop'
              ? {
                  width: '100%',
                  height: 'calc(100vh - 60px)',
                }
              : viewportDevice === 'tablet'
              ? {
                  position: 'relative',
                  width: '796px',
                  maxWidth: '94vw',
                  height: '948px',
                  padding: '14px',
                  boxSizing: 'border-box',
                  background: 'linear-gradient(145deg, #27312c, #141a17)',
                  border: '2px solid rgba(197, 163, 101, 0.42)',
                  borderRadius: '34px',
                  boxShadow: '0 30px 80px rgba(0, 0, 0, 0.65), 0 0 0 5px #0c120f',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flexShrink: 0,
                  transform: `scale(${deviceZoom / 100})`,
                  transformOrigin: 'top center',
                }
              : {
                  position: 'relative',
                  width: '414px',
                  height: '848px',
                  padding: '14px 12px 22px',
                  boxSizing: 'border-box',
                  background: 'linear-gradient(145deg, #27312c, #141a17)',
                  border: '2px solid rgba(197, 163, 101, 0.42)',
                  borderRadius: '50px',
                  boxShadow:
                    '0 30px 80px rgba(0, 0, 0, 0.65), 0 0 0 6px #0c120f, inset 0 1px 2px rgba(255, 255, 255, 0.18)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flexShrink: 0,
                  transform: `scale(${deviceZoom / 100})`,
                  transformOrigin: 'top center',
                }
          }
        >
          {viewportDevice === 'mobile' && (
            <div
              style={{
                position: 'absolute',
                top: '14px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '110px',
                height: '24px',
                background: '#0c120f',
                borderRadius: '16px',
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-hidden="true"
            >
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#1c2420',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              />
            </div>
          )}

          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius:
                viewportDevice === 'desktop'
                  ? '0'
                  : viewportDevice === 'tablet'
                  ? '22px'
                  : '38px',
              overflow: 'hidden',
              background: '#ffffff',
              position: 'relative',
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
                  background: '#ffffff',
                }}
              />
            )}
          </div>

          {viewportDevice === 'mobile' && (
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '130px',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.45)',
                borderRadius: '999px',
                zIndex: 40,
              }}
              aria-hidden="true"
            />
          )}
        </div>
      </main>
    </div>
  );
}
