import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ClientPortalView } from './client-portal-view';
import '../client-portal.css';

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ key?: string }>;
}

export const dynamic = 'force-dynamic';

function parseToken(rawToken: string, searchKey?: string): { eventId: string; clientKey: string } {
  const decoded = decodeURIComponent(rawToken);

  // Format 1: eventId~clientKey
  if (decoded.includes('~')) {
    const [eventId, ...rest] = decoded.split('~');
    return { eventId, clientKey: rest.join('~') };
  }

  // Format 2: eventId_clientKey (fallback if ~ was transformed)
  if (decoded.includes('_') && !searchKey) {
    const parts = decoded.split('_');
    if (parts.length >= 2) {
      return { eventId: parts[0], clientKey: parts.slice(1).join('_') };
    }
  }

  // Format 3: token is eventId and key is in query params
  return {
    eventId: decoded,
    clientKey: searchKey || '',
  };
}

async function fetchPortalData(eventId: string, clientKey: string) {
  const apiBase =
    process.env.INTERNAL_API_URL ||
    (process.env.NODE_ENV === 'production' || process.env.VERCEL
      ? 'https://irvite-api.vercel.app'
      : 'http://127.0.0.1:3000');

  try {
    const url = `${apiBase.replace(/\/+$/, '')}/api/v1/client-portal/${encodeURIComponent(eventId)}?key=${encodeURIComponent(clientKey)}`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.status === 403) {
      return { disabled: true };
    }

    if (res.status >= 500) {
      return { serverError: true };
    }

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const { key } = await searchParams;
  const { eventId, clientKey } = parseToken(token, key);
  const data = await fetchPortalData(eventId, clientKey);

  if (!data?.event) {
    return {
      title: 'Portal Kelola Tamu - IRVITE',
      description: 'Kelola daftar tamu dan bagikan undangan WhatsApp dengan mudah.',
    };
  }

  return {
    title: `Portal Tamu: ${data.event.title} - IRVITE`,
    description: `Kelola daftar tamu dan bagikan undangan WhatsApp untuk ${data.event.title}.`,
  };
}

export default async function ClientPortalPage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  const { key } = await searchParams;
  const { eventId, clientKey } = parseToken(token, key);

  const data = await fetchPortalData(eventId, clientKey);

  if (data?.disabled) {
    return (
      <div className="portal-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            maxWidth: '480px',
            margin: '4rem 1.5rem',
            padding: '2.5rem 2rem',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            textAlign: 'center',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#181e1b',
              marginBottom: '0.75rem',
            }}
          >
            Akses Portal Telah Ditutup
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#5c6b64',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}
          >
            Portal kelola tamu untuk acara ini telah dinonaktifkan oleh penyelenggara atau tim admin karena acara telah selesai. Apabila Anda masih membutuhkan bantuan atau akses data, silakan hubungi tim kami.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1b4332',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.875rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            Kembali ke Beranda IRVITE
          </Link>
        </div>
      </div>
    );
  }

  if (data?.serverError) {
    return (
      <div className="portal-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            maxWidth: '480px',
            margin: '4rem 1.5rem',
            padding: '2.5rem 2rem',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            textAlign: 'center',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#181e1b',
              marginBottom: '0.75rem',
            }}
          >
            Kendala Server Sementara
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#5c6b64',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}
          >
            Sistem kami sedang mengalami pembaruan atau kendala sementara saat memuat data portal klien. Silakan coba muat ulang halaman ini.
          </p>
          <a
            href={`/kelola/${encodeURIComponent(token)}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#1b3b2b',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            🔄 Muat Ulang Halaman
          </a>
        </div>
      </div>
    );
  }

  if (!data || !data.event) {
    return (
      <div className="portal-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            maxWidth: '480px',
            margin: '4rem 1.5rem',
            padding: '2.5rem 2rem',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            textAlign: 'center',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#181e1b',
              marginBottom: '0.75rem',
            }}
          >
            Tautan Akses Tidak Valid
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#5c6b64',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}
          >
            Tautan portal tamu ini tidak dapat diverifikasi atau telah kedaluwarsa.
            Pastikan Anda membuka tautan lengkap yang diberikan oleh tim admin atau pasangan pengantin.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1b4332',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.875rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            Kembali ke Beranda IRVITE
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ClientPortalView
      initialEvent={data.event}
      initialStats={data.stats}
      initialGuests={data.guests}
      initialWishes={data.wishes || []}
      accessKey={clientKey}
    />
  );
}

