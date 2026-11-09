'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getGeneralContactUrl } from '../utils/contact';
import './landing-navbar.css';

const DEFAULT_MSG_GENERAL = 'Halo IRVITE, saya tertarik dengan layanan undangan digitalnya.';

export interface LandingNavbarProps {
  currentPath?: string;
  className?: string;
  contactMessage?: string;
}

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

export function LandingNavbar({
  currentPath,
  className = '',
  contactMessage = DEFAULT_MSG_GENERAL,
}: LandingNavbarProps = {}) {
  let detectedPath = '';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    detectedPath = usePathname() || '';
  } catch {
    detectedPath = '';
  }

  const activePath = currentPath || detectedPath;
  const isTemplatesPage = activePath === '/templates' || activePath.startsWith('/templates');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const contactUrl = getGeneralContactUrl(contactMessage);

  // Close mobile drawer when pressing Escape or scrolling on desktop
  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const waCtaId = isTemplatesPage ? 'cat-nav-wa-cta' : 'nav-wa-cta';
  const ctaClass = isTemplatesPage ? 'nav-cta cat-nav__cta' : 'nav-cta';

  return (
    <header
      className={`site-header ${isTemplatesPage ? 'cat-nav' : ''} ${className}`.trim()}
      aria-label="Navigasi utama situs"
    >
      <div className={`site-header-inner ${isTemplatesPage ? 'cat-nav__inner' : ''}`}>
        {isTemplatesPage ? (
          <Link href="/" className="brand cat-nav__brand" aria-label="IRVITE beranda">
            IRVITE
          </Link>
        ) : (
          <a className="brand" href="#top" aria-label="IRVITE beranda">
            IRVITE
          </a>
        )}

        <div className={`site-nav-group ${isTemplatesPage ? 'cat-nav__actions' : ''}`}>
          {/* Desktop Horizontal Navigation Links */}
          {isTemplatesPage ? (
            <nav className="cat-nav__links-group" aria-label="Navigasi Menu">
              <Link href="/" className="cat-nav__link">
                Beranda
              </Link>
              <Link
                href="/templates"
                className="cat-nav__link cat-nav__link--active"
                aria-current="page"
              >
                Katalog
              </Link>
              <Link href="/#cara-kerja" className="cat-nav__link">
                Alur Pemesanan
              </Link>
              <Link href="/#paket" className="cat-nav__link">
                Paket
              </Link>
            </nav>
          ) : (
            <nav aria-label="Navigasi utama">
              <a href="#katalog">Katalog</a>
              <a href="#cara-kerja">Alur Pemesanan</a>
              <a href="#paket">Paket</a>
            </nav>
          )}

          <div className="nav-actions">
            {contactUrl ? (
              <a
                id={waCtaId}
                href={contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={ctaClass}
              >
                <IconWA style={{ width: 17, height: 17, flex: '0 0 auto' }} />
                <span>Konsultasi</span>
              </a>
            ) : (
              <span
                id={waCtaId}
                className={ctaClass}
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                title="Kontak belum dikonfigurasi"
              >
                <IconWA style={{ width: 17, height: 17, flex: '0 0 auto' }} />
                <span>Konsultasi</span>
              </span>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              className={`mobile-menu-btn ${mobileMenuOpen ? 'is-active' : ''}`}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Tutup navigasi menu' : 'Buka navigasi menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Navigation Dropdown Drawer */}
      {mobileMenuOpen && (
        <div
          className="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi mobile"
        >
          <ul className="mobile-nav-drawer__list">
            {isTemplatesPage ? (
              <>
                <li>
                  <Link
                    href="/"
                    className="mobile-nav-drawer__link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Beranda</span>
                    <span className="mobile-nav-drawer__link-arrow" aria-hidden="true">
                      ›
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/templates"
                    className="mobile-nav-drawer__link is-active"
                    aria-current="page"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Katalog</span>
                    <span className="mobile-nav-drawer__link-arrow" aria-hidden="true">
                      ›
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#cara-kerja"
                    className="mobile-nav-drawer__link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Alur Pemesanan</span>
                    <span className="mobile-nav-drawer__link-arrow" aria-hidden="true">
                      ›
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#paket"
                    className="mobile-nav-drawer__link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Paket</span>
                    <span className="mobile-nav-drawer__link-arrow" aria-hidden="true">
                      ›
                    </span>
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <a
                    href="#katalog"
                    className="mobile-nav-drawer__link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Katalog</span>
                    <span className="mobile-nav-drawer__link-arrow" aria-hidden="true">
                      ›
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="#cara-kerja"
                    className="mobile-nav-drawer__link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Alur Pemesanan</span>
                    <span className="mobile-nav-drawer__link-arrow" aria-hidden="true">
                      ›
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="#paket"
                    className="mobile-nav-drawer__link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Paket</span>
                    <span className="mobile-nav-drawer__link-arrow" aria-hidden="true">
                      ›
                    </span>
                  </a>
                </li>
              </>
            )}
          </ul>

          <div className="mobile-nav-drawer__divider" />

          <div className="mobile-nav-drawer__footer">
            {!isTemplatesPage && (
              <Link
                href="/templates"
                className="mobile-nav-drawer__catalog-cta"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>Buka Semua Template di Katalog</span>
                <span aria-hidden="true">→</span>
              </Link>
            )}
            {contactUrl && (
              <a
                href={contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mobile-nav-drawer__wa-cta"
                onClick={() => setMobileMenuOpen(false)}
              >
                <IconWA style={{ width: 17, height: 17, flex: '0 0 auto' }} />
                <span>Konsultasi via WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
