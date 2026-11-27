'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ACTIVE_PRICE_TIER,
  AKRILIK_QRIS,
  CAPACITY_BASE_PRICES,
  GLADI_H1,
  PACKAGE_PRICES,
  PETUGAS_EXTRA_HOUR,
  PETUGAS_UNIT,
  PRESET_PACKAGE_CODES,
  SUPERVISOR,
  WEDDING_PACKAGE_CATALOG,
} from 'pricing';
import { formatRupiah } from '../customizer/template-customizer';

function IconCheck({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12.5 15.5 7 10l5.5-5.5"
      />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 4.5 13 10l-5.5 5.5"
      />
    </svg>
  );
}

interface PackageSlideMeta {
  code: string;
  label: string;
  badge?: string;
}

const SLIDE_META: PackageSlideMeta[] = [
  ...PRESET_PACKAGE_CODES.map((code) => ({
    code,
    label: WEDDING_PACKAGE_CATALOG[code].name,
    badge: WEDDING_PACKAGE_CATALOG[code].popular ? 'Populer' : undefined,
  })),
  {
    code: 'CUSTOM',
    label: 'Rakit Sendiri',
  },
];

export function PackagesCarousel() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const prevBtnRef = useRef<HTMLButtonElement | null>(null);
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);
  const [announcement, setAnnouncement] = useState('');

  const computeScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
    const currentScroll = track.scrollLeft;

    setCanScrollPrev(currentScroll > 8);
    setCanScrollNext(currentScroll < maxScrollLeft - 8);

    const children = Array.from(track.children) as HTMLElement[];
    if (children.length === 0) return;

    const trackRect = track.getBoundingClientRect();
    let closestIdx = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    children.forEach((child, idx) => {
      const rect = child.getBoundingClientRect();
      const distance = Math.abs(rect.left - trackRect.left);
      if (distance < minDistance) {
        minDistance = distance;
        closestIdx = idx;
      }
    });

    setActiveIndex(closestIdx);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        computeScrollState();
      });
    };

    computeScrollState();
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', computeScrollState);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', computeScrollState);
    };
  }, [computeScrollState]);

  const scrollToSlide = useCallback((targetIndex: number) => {
    const track = trackRef.current;
    if (!track) return;
    const children = Array.from(track.children) as HTMLElement[];
    const clamped = Math.max(0, Math.min(children.length - 1, targetIndex));
    const targetEl = children[clamped];
    if (!targetEl) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const trackRect = track.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const delta = targetRect.left - trackRect.left;

    track.scrollBy({
      left: delta,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });

    setActiveIndex(clamped);
    const slideMeta = SLIDE_META[clamped];
    if (slideMeta) {
      setAnnouncement(
        `Menampilkan Paket ${slideMeta.label} (${clamped + 1} dari ${SLIDE_META.length})`,
      );
    }
  }, []);

  const handleStep = useCallback(
    (direction: -1 | 1) => {
      const track = trackRef.current;
      if (!track) return;
      const children = Array.from(track.children) as HTMLElement[];
      if (children.length === 0) return;

      const nextIndex = Math.max(
        0,
        Math.min(children.length - 1, activeIndex + direction),
      );

      scrollToSlide(nextIndex);

      if (direction === -1 && nextIndex === 0) {
        nextBtnRef.current?.focus();
      } else if (direction === 1 && nextIndex >= children.length - 1) {
        prevBtnRef.current?.focus();
      }
    },
    [activeIndex, scrollToSlide],
  );

  return (
    <div
      className="packages-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="Pilihan paket layanan pernikahan"
    >
      {/* Top toolbar: Quick package pills + Prev/Next navigation buttons */}
      <div className="packages-carousel-toolbar">
        <div
          className="packages-quick-pills"
          role="tablist"
          aria-label="Pilih kartu paket"
        >
          {SLIDE_META.map((item, idx) => {
            const isCurrent = idx === activeIndex;
            return (
              <button
                key={item.code}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-controls={`package-slide-${item.code}`}
                className={`packages-quick-pill ${isCurrent ? 'is-active' : ''}`}
                onClick={() => scrollToSlide(idx)}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="packages-quick-pill__badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="packages-carousel-nav">
          <span className="packages-carousel-hint">
            Geser untuk melihat semua ({SLIDE_META.length} paket)
          </span>
          <div className="packages-carousel-arrows">
            <button
              ref={prevBtnRef}
              type="button"
              className="packages-carousel-arrow"
              onClick={() => handleStep(-1)}
              disabled={!canScrollPrev}
              aria-label="Geser ke paket sebelumnya"
              data-direction="previous"
            >
              <IconChevronLeft />
            </button>
            <button
              ref={nextBtnRef}
              type="button"
              className="packages-carousel-arrow"
              onClick={() => handleStep(1)}
              disabled={!canScrollNext}
              aria-label="Geser ke paket berikutnya"
              data-direction="next"
            >
              <IconChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scroll-Snap Track (3 cards visible on desktop, 2 remaining scrolled horizontally) */}
      <div
        ref={trackRef}
        className="packages-carousel-track"
        tabIndex={0}
        role="group"
        aria-label="Daftar kartu paket pernikahan"
      >
        {PRESET_PACKAGE_CODES.map((code, index) => {
          const pkg = WEDDING_PACKAGE_CATALOG[code];
          const price = PACKAGE_PRICES[ACTIVE_PRICE_TIER][code];
          const isFeatured = Boolean(pkg.popular);

          return (
            <article
              key={code}
              id={`package-slide-${code}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} dari ${SLIDE_META.length}: Paket ${pkg.name}`}
              className={`package-card packages-carousel-slide ${isFeatured ? 'featured' : ''}`}
              data-testid={`package-card-${code}`}
            >
              {isFeatured && (
                <span className="recommended">
                  <span aria-hidden="true">✨</span> Paling diminati
                </span>
              )}
              <div className="package-card-header">
                <span className="package-label">Paket {pkg.name}</span>
                <h3>{pkg.tagline}</h3>
                <div className="package-price-display">{formatRupiah(price)}</div>
                <p className="package-desc">{pkg.description}</p>
              </div>
              <div className="package-divider" aria-hidden="true" />
              <ul className="package-features">
                {pkg.features.map((feat) => (
                  <li key={feat}>
                    <span
                      className={`pkg-feature-icon ${isFeatured ? 'pkg-feature-icon--featured' : ''}`}
                      aria-hidden="true"
                    >
                      <IconCheck />
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <Link
                id={`pkg-select-${code.toLowerCase()}`}
                className={`button ${isFeatured ? 'primary exclusive-cta' : 'outline'}`}
                href={`/templates?paket=${code}`}
              >
                <span>Pilih Paket {pkg.name}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          );
        })}

        {/* Slide 5: Rakit Sendiri (CUSTOM) Card */}
        <article
          id="package-slide-CUSTOM"
          role="group"
          aria-roledescription="slide"
          aria-label={`${SLIDE_META.length} dari ${SLIDE_META.length}: Rakit Sendiri`}
          className="package-card packages-carousel-slide package-card--custom"
          data-testid="package-card-CUSTOM"
        >
          <span className="recommended recommended--custom">
            <span aria-hidden="true">⚙️</span> Fleksibel
          </span>
          <div className="package-card-header">
            <span className="package-label">Rakit Sendiri</span>
            <h3>Sesuaikan kapasitas &amp; komponen</h3>
            <div className="package-price-display">
              Mulai {formatRupiah(CAPACITY_BASE_PRICES[50])}
            </div>
            <p className="package-desc">
              Pilih sendiri kuota hingga 50–600 undangan (1 undangan bisa untuk
              keluarga), jumlah petugas check-in, jam tambahan, stand akrilik
              QRIS, hingga sesi gladi H-1.
            </p>
          </div>
          <div className="package-divider" aria-hidden="true" />
          <ul className="package-features">
            <li>
              <span className="pkg-feature-icon" aria-hidden="true">
                <IconCheck />
              </span>
              <span>
                Dasar hingga 50–600 undangan (1 undangan bisa untuk keluarga:{' '}
                {formatRupiah(CAPACITY_BASE_PRICES[50])} –{' '}
                {formatRupiah(CAPACITY_BASE_PRICES[600])})
              </span>
            </li>
            <li>
              <span className="pkg-feature-icon" aria-hidden="true">
                <IconCheck />
              </span>
              <span>
                Petugas check-in {formatRupiah(PETUGAS_UNIT)}/orang (24/hari) +{' '}
                {formatRupiah(PETUGAS_EXTRA_HOUR)}/jam tambahan
              </span>
            </li>
            <li>
              <span className="pkg-feature-icon" aria-hidden="true">
                <IconCheck />
              </span>
              <span>
                Stand akrilik QRIS meja ({formatRupiah(AKRILIK_QRIS)}) &amp; Gladi H-1 (
                {formatRupiah(GLADI_H1)})
              </span>
            </li>
            <li>
              <span className="pkg-feature-icon" aria-hidden="true">
                <IconCheck />
              </span>
              <span>
                Supervisor lapangan opsional ({formatRupiah(SUPERVISOR)})
              </span>
            </li>
          </ul>
          <Link
            id="pkg-select-custom"
            className="button outline"
            href="/templates?paket=CUSTOM"
          >
            <span>Rakit Sendiri</span>
            <span aria-hidden="true">→</span>
          </Link>
        </article>
      </div>

      {/* Visually hidden polite status region for screen readers */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {/* Bottom pagination markers */}
      <nav
        className="packages-carousel-markers"
        aria-label="Navigasi slide paket"
      >
        {SLIDE_META.map((item, idx) => (
          <button
            key={item.code}
            type="button"
            className="packages-carousel-marker"
            aria-current={idx === activeIndex ? 'true' : undefined}
            aria-label={`Lihat Paket ${item.label}`}
            onClick={() => scrollToSlide(idx)}
          >
            <span className="packages-carousel-marker__dot" />
          </button>
        ))}
      </nav>
    </div>
  );
}
