'use client';

import React, { useEffect, useState } from 'react';
import { ThemeToggle } from './theme-toggle';
import { getGeneralContactUrl } from '../utils/contact';

const MSG_GENERAL = 'Halo IRVITE.ID, saya tertarik dengan layanan undangan digitalnya.';

function IconWA({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.528 5.855L.057 23.943l6.294-1.446A11.946 11.946 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.6a9.571 9.571 0 0 1-4.886-1.338l-.35-.207-3.735.857.92-3.63-.228-.373A9.572 9.572 0 0 1 2.4 12C2.4 6.703 6.703 2.4 12 2.4S21.6 6.703 21.6 12 17.297 21.6 12 21.6z"/>
    </svg>
  );
}

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const contactUrl = getGeneralContactUrl(MSG_GENERAL);

  return (
    <nav className={"lp-nav" + (scrolled ? " lp-nav--scrolled" : "")} aria-label="Main navigation">
      <div className="lp-nav__brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="IRVITE" className="lp-nav__logo-img" />
      </div>
      <ul className="lp-nav__links">
        <li><a href="#katalog" className="lp-nav__link">Katalog</a></li>
        <li><a href="#paket" className="lp-nav__link">Paket</a></li>
        <li><a href="#alur" className="lp-nav__link">Cara Kerja</a></li>
      </ul>
      <div className="lp-nav__actions">
        <ThemeToggle />
        {contactUrl ? (
          <a
            id="nav-wa-cta"
            href={contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="lp-nav__cta"
          >
            <IconWA style={{ width: 15, height: 15 }} />
            WhatsApp Kami
          </a>
        ) : (
          <span
            id="nav-wa-cta"
            className="lp-nav__cta"
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
            title="Kontak belum dikonfigurasi"
          >
            <IconWA style={{ width: 15, height: 15 }} />
            WhatsApp Kami
          </span>
        )}
      </div>
    </nav>
  );
}
