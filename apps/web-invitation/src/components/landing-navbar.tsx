'use client';

import React from 'react';
import { ThemeToggle } from './theme-toggle';
import { getGeneralContactUrl } from '../utils/contact';

const MSG_GENERAL = 'Halo IRVITE.ID, saya tertarik dengan layanan undangan digitalnya.';

function IconWA({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      style={style}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.5 3.5A11.8 11.8 0 0 0 12.08 0C5.53 0 .2 5.33.2 11.88c0 2.09.55 4.13 1.59 5.93L.1 24l6.34-1.66a11.87 11.87 0 0 0 5.63 1.43h.01c6.55 0 11.87-5.33 11.87-11.88 0-3.17-1.22-6.15-3.46-8.39Zm-8.42 18.27h-.01a9.84 9.84 0 0 1-5.02-1.38l-.36-.21-3.76.99 1-3.67-.24-.38a9.83 9.83 0 0 1-1.51-5.24c0-5.46 4.45-9.9 9.91-9.9a9.82 9.82 0 0 1 7 2.9 9.83 9.83 0 0 1 2.89 7c0 5.46-4.45 9.9-9.9 9.9Zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47a8.9 8.9 0 0 1-1.65-2.05c-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.91-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.87 1.21 3.07c.15.2 2.09 3.19 5.06 4.47.71.3 1.26.49 1.69.63.71.23 1.35.2 1.86.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

export function LandingNavbar() {
  const contactUrl = getGeneralContactUrl(MSG_GENERAL);

  return (
    <header className="nav shell" aria-label="Navigasi utama situs">
      <a className="brand" href="#top" aria-label="IRVITE.ID beranda">
        IRVITE<span>.ID</span>
      </a>
      <nav aria-label="Navigasi utama">
        <a href="#katalog">Katalog</a>
        <a href="#paket">Paket</a>
        <a href="#cara-kerja">Cara kerja</a>
      </nav>
      <div className="nav-actions">
        <ThemeToggle />
        {contactUrl ? (
          <a
            id="nav-wa-cta"
            href={contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-cta"
          >
            <IconWA style={{ width: 17, height: 17, flex: '0 0 auto' }} />
            Konsultasi
          </a>
        ) : (
          <span
            id="nav-wa-cta"
            className="nav-cta"
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
            title="Kontak belum dikonfigurasi"
          >
            <IconWA style={{ width: 17, height: 17, flex: '0 0 auto' }} />
            Konsultasi
          </span>
        )}
      </div>
    </header>
  );
}
