'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BUKU_TAMU_PACKAGE_CODES,
  CAPACITY_TIERS,
  WEDDING_PACKAGE_CATALOG,
  WEDDING_SERVICE_TABS,
  calculateOrderPrice,
  createDefaultMasterPricingConfig,
  normalizeMasterPricingConfig,
  type CapacityTier,
  type MasterPricingConfig,
  type OrderPricingOptionsInput,
  type SelectablePackageCode,
  type WeddingServiceTab,
} from 'pricing';
import {
  formatRupiah,
  savePackageSelectionToSession,
} from '../customizer/template-customizer';

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

interface PriceBlockProps {
  price: number;
  originalPrice?: number;
}

function PriceWithStrikethrough({ price, originalPrice }: PriceBlockProps) {
  const showOriginal =
    typeof originalPrice === 'number' &&
    Number.isFinite(originalPrice) &&
    originalPrice > price;

  return (
    <div className="package-price-block">
      {showOriginal && (
        <div className="package-price-original">
          <span className="sr-only">Harga asli sebelum promo: </span>
          <span className="package-price-original__rp" aria-hidden="true">
            Rp{' '}
          </span>
          <del className="package-price-original__digits">
            {Math.round(originalPrice).toLocaleString('id-ID')}
          </del>
        </div>
      )}
      <div className="package-price-display">{formatRupiah(price)}</div>
    </div>
  );
}

interface CarouselCardItem {
  key: string;
  testId: string;
  packageCode: SelectablePackageCode;
  options: OrderPricingOptionsInput;
  eyebrow: string;
  title: string;
  price: number;
  originalPrice: number;
  description: string;
  features: string[];
  ctaLabel: string;
  href: string;
  featured?: boolean;
  badgeText?: string;
}

interface CenterPeekingCarouselProps {
  ariaLabel: string;
  cards: CarouselCardItem[];
  defaultIndex?: number;
  isActiveTab: boolean;
}

function CenterPeekingCarousel({
  ariaLabel,
  cards,
  defaultIndex = 1,
  isActiveTab,
}: CenterPeekingCarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const hasInitializedRef = useRef(false);
  const safeDefault = Math.max(0, Math.min(cards.length - 1, defaultIndex));

  const [activeIndex, setActiveIndex] = useState(safeDefault);
  const [announcement, setAnnouncement] = useState('');

  const computeCenteredSlide = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const children = Array.from(track.children) as HTMLElement[];
    if (children.length === 0) return;

    const trackRect = track.getBoundingClientRect();
    if (trackRect.width <= 0) return;

    const trackCenter = trackRect.left + trackRect.width / 2;
    let closestIdx = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    children.forEach((child, idx) => {
      const rect = child.getBoundingClientRect();
      const childCenter = rect.left + rect.width / 2;
      const dist = Math.abs(childCenter - trackCenter);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    setActiveIndex(closestIdx);
  }, []);

  const scrollToSlide = useCallback(
    (targetIndex: number, instant = false) => {
      const track = trackRef.current;
      if (!track) return;
      const children = Array.from(track.children) as HTMLElement[];
      if (children.length === 0) return;

      const clamped = Math.max(0, Math.min(children.length - 1, targetIndex));
      const targetEl = children[clamped];
      if (!targetEl) return;

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const targetCenter = targetEl.offsetLeft + targetEl.offsetWidth / 2;
      const desiredScrollLeft = Math.max(
        0,
        targetCenter - track.clientWidth / 2,
      );

      track.scrollTo({
        left: desiredScrollLeft,
        behavior: instant || prefersReducedMotion ? 'auto' : 'smooth',
      });

      setActiveIndex(clamped);
      if (!instant && cards[clamped]) {
        setAnnouncement(
          `Menampilkan ${cards[clamped].eyebrow} (${clamped + 1} dari ${cards.length})`,
        );
      }
    },
    [cards],
  );

  // Center the default card cleanly whenever this tab becomes visible
  useEffect(() => {
    if (!isActiveTab) return;
    const targetIdx = hasInitializedRef.current ? activeIndex : safeDefault;
    hasInitializedRef.current = true;
    const timer = window.requestAnimationFrame(() => {
      scrollToSlide(targetIdx, true);
    });
    return () => window.cancelAnimationFrame(timer);
  }, [isActiveTab, safeDefault, scrollToSlide]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        computeCenteredSlide();
      });
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', computeCenteredSlide);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', computeCenteredSlide);
    };
  }, [computeCenteredSlide]);

  const canScrollPrev = activeIndex > 0;
  const canScrollNext = activeIndex < cards.length - 1;

  return (
    <div
      className="packages-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      <div className="packages-carousel-stage">
        <button
          type="button"
          className="packages-carousel-arrow packages-carousel-arrow--floating packages-carousel-arrow--prev"
          data-direction="previous"
          aria-label="Geser ke paket sebelah kiri"
          disabled={!canScrollPrev}
          onClick={() => scrollToSlide(activeIndex - 1)}
        >
          <IconChevronLeft />
        </button>

        <div
          ref={trackRef}
          className="packages-carousel-track"
          tabIndex={0}
          aria-label={`Daftar kartu ${ariaLabel}`}
        >
          {cards.map((card, idx) => {
            const isCenter = idx === activeIndex;
            const positionState = isCenter
              ? 'center'
              : idx < activeIndex
                ? 'left'
                : 'right';

            return (
              <div
                key={card.key}
                role="group"
                aria-roledescription="slide"
                aria-label={`${idx + 1} dari ${cards.length}: ${card.eyebrow}`}
                className={`packages-carousel-slide ${isCenter ? 'is-center' : 'is-side'}`}
                data-slide-state={positionState}
                onClick={(e) => {
                  if (!isCenter) {
                    const target = e.target as HTMLElement;
                    if (!target.closest('a')) {
                      scrollToSlide(idx);
                    }
                  }
                }}
              >
                <article
                  className={`package-card ${card.featured ? 'featured' : ''} ${isCenter ? 'package-card--active' : 'package-card--peeking'}`}
                  data-testid={card.testId}
                >
                  {card.badgeText && (
                    <span className="recommended">
                      <span aria-hidden="true">✨</span> {card.badgeText}
                    </span>
                  )}
                  <div className="package-card-header">
                    <span className="package-label">{card.eyebrow}</span>
                    <h3>{card.title}</h3>
                    <PriceWithStrikethrough
                      price={card.price}
                      originalPrice={card.originalPrice}
                    />
                    <p className="package-desc">{card.description}</p>
                  </div>
                  <div className="package-divider" aria-hidden="true" />
                  <ul className="package-features">
                    {card.features.map((feat) => (
                      <li key={feat}>
                        <span
                          className={`pkg-feature-icon ${card.featured ? 'pkg-feature-icon--featured' : ''}`}
                          aria-hidden="true"
                        >
                          <IconCheck />
                        </span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    id={`pkg-select-${card.key.toLowerCase()}`}
                    className={`button ${card.featured || isCenter ? 'primary exclusive-cta' : 'outline'}`}
                    href={card.href}
                    onClick={() =>
                      savePackageSelectionToSession({
                        packageCode: card.packageCode,
                        options: card.options,
                      })
                    }
                  >
                    <span>{card.ctaLabel}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </article>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="packages-carousel-arrow packages-carousel-arrow--floating packages-carousel-arrow--next"
          data-direction="next"
          aria-label="Geser ke paket sebelah kanan"
          disabled={!canScrollNext}
          onClick={() => scrollToSlide(activeIndex + 1)}
        >
          <IconChevronRight />
        </button>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <nav
        className="packages-carousel-markers"
        aria-label={`Navigasi slide ${ariaLabel}`}
      >
        {cards.map((card, idx) => (
          <button
            key={card.key}
            type="button"
            className="packages-carousel-marker"
            aria-current={idx === activeIndex ? 'true' : undefined}
            aria-label={`Fokus ke ${card.eyebrow}`}
            onClick={() => scrollToSlide(idx)}
          >
            <span className="packages-carousel-marker__dot" />
          </button>
        ))}
      </nav>
    </div>
  );
}

export function PackagesCarousel({
  initialPricingConfig,
}: {
  initialPricingConfig?: MasterPricingConfig;
} = {}) {
  const master = useMemo(
    () =>
      initialPricingConfig
        ? normalizeMasterPricingConfig(initialPricingConfig)
        : createDefaultMasterPricingConfig(),
    [initialPricingConfig],
  );
  const rates = master.serviceRates;

  // Default to center tab ("BUKU_TAMU") matching the reference 3-pill layout
  const [activeTab, setActiveTab] = useState<WeddingServiceTab>('BUKU_TAMU');
  const tabRefs = useRef<Record<WeddingServiceTab, HTMLButtonElement | null>>({
    UNDANGAN: null,
    BUKU_TAMU: null,
    CUSTOM: null,
  });

  // Client interactive A La Carte state for the Right Tab ("Custom")
  const [customCapacity, setCustomCapacity] = useState<CapacityTier>(150);
  const [customPetugas, setCustomPetugas] = useState<number>(1);
  const [customExtraHours, setCustomExtraHours] = useState<number>(0);
  const [customAkrilik, setCustomAkrilik] = useState<boolean>(true);
  const [customGladi, setCustomGladi] = useState<boolean>(false);
  const [customSupervisor, setCustomSupervisor] = useState<boolean>(false);

  const customCalc = useMemo(
    () =>
      calculateOrderPrice({
        packageCode: 'CUSTOM',
        capacityTier: customCapacity,
        options: {
          capacityTier: customCapacity,
          extraPetugas: customPetugas,
          extraHoursPerPetugas: customPetugas > 0 ? customExtraHours : 0,
          akrilik: customAkrilik,
          gladi: customGladi,
          supervisor: customSupervisor ? 1 : 0,
        },
        masterConfig: master,
      }),
    [
      customCapacity,
      customPetugas,
      customExtraHours,
      customAkrilik,
      customGladi,
      customSupervisor,
      master,
    ],
  );

  const undanganCards: CarouselCardItem[] = useMemo(() => {
    const baseCards: CarouselCardItem[] = master.undanganShowcaseCards
      .filter((item) => item.active !== false)
      .map((item, idx) => {
        const defaultFeatures = [
          `Kapasitas hingga ${item.capacityTier} undangan (1 undangan bisa untuk keluarga)`,
          'Semua tema katalog & kustomisasi konten penuh',
          'Tautan personal nama tamu via WhatsApp',
          'RSVP real-time, ucapan doa & amplop digital / QRIS',
          'Khusus sebar undangan online (tanpa QR check-in lokasi)',
        ];
        return {
          key: item.id,
          testId:
            idx === 0
              ? 'package-card-SACRED'
              : `package-card-SACRED-${item.capacityTier}`,
          packageCode: 'SACRED',
          options: {
            capacityTier: item.capacityTier,
            extraPetugas: 0,
            extraHoursPerPetugas: 0,
            supervisor: 0,
            akrilik: false,
            gladi: false,
          },
          eyebrow: `Undangan Digital · ${item.name}`,
          title: item.tagline,
          price: item.price,
          originalPrice: item.originalPrice,
          description: item.description,
          features: item.features && item.features.length > 0 ? [...item.features] : defaultFeatures,
          ctaLabel: `Pilih ${item.name}`,
          href: `/templates?paket=SACRED`,
          featured: Boolean(item.popular),
          badgeText: item.popular ? 'Favorit Online' : undefined,
        };
      },
    );

    const extraLandingCards: CarouselCardItem[] = master.customPresets
      .filter((p) => p.showOnLanding && p.serviceCategory === 'UNDANGAN')
      .map((p) => ({
        key: p.id,
        testId: `package-card-CUSTOM-${p.id}`,
        packageCode: 'CUSTOM',
        options: {
          capacityTier:
            p.maxGuests <= 50
              ? 50
              : p.maxGuests <= 150
                ? 150
                : p.maxGuests <= 300
                  ? 300
                  : 600,
          extraPetugas: p.petugasCount,
          extraHoursPerPetugas: p.extraHoursPerPetugas,
          supervisor: p.supervisorCount,
          akrilik: p.akrilikQris,
          gladi: p.gladiH1,
        },
        eyebrow: `Undangan Digital · ${p.name}`,
        title: p.tagline,
        price: p.price,
        originalPrice: p.originalPrice,
        description: p.description,
        features: [...p.features],
        ctaLabel: `Pilih ${p.name}`,
        href: `/templates?paket=CUSTOM`,
        featured: p.popular,
        badgeText: p.popular ? 'Pilihan Spesial' : undefined,
      }));

    return [...baseCards, ...extraLandingCards];
  }, [master]);

  const bukuTamuCards: CarouselCardItem[] = useMemo(() => {
    const presetCards: CarouselCardItem[] = BUKU_TAMU_PACKAGE_CODES
      .filter((code) => master.presetPackages[code]?.active !== false)
      .map((code) => {
        const pkg = WEDDING_PACKAGE_CATALOG[code];
        const cfgPkg = master.presetPackages[code];
        return {
          key: code,
          testId: `package-card-${code}`,
          packageCode: code,
          options: {
            capacityTier: pkg.baseCapacity,
            extraPetugas: 0,
            extraHoursPerPetugas: 0,
            supervisor: pkg.includedSupervisor,
            akrilik: pkg.includesAkrilik,
            gladi: pkg.includesGladi,
          },
          eyebrow: `Paket ${cfgPkg.name}`,
          title: cfgPkg.tagline,
          price: cfgPkg.price,
          originalPrice: cfgPkg.originalPrice,
          description: cfgPkg.description,
          features: cfgPkg.features && cfgPkg.features.length > 0 ? [...cfgPkg.features] : [...pkg.features],
          ctaLabel: `Pilih Paket ${cfgPkg.name}`,
          href: `/templates?paket=${code}`,
          featured: Boolean(cfgPkg.popular),
          badgeText: cfgPkg.popular ? 'Paling diminati' : 'Include Undangan',
        };
      },
    );

    const extraBukuTamuCards: CarouselCardItem[] = master.customPresets
      .filter((p) => p.showOnLanding && p.serviceCategory === 'BUKU_TAMU')
      .map((p) => ({
        key: p.id,
        testId: `package-card-CUSTOM-${p.id}`,
        packageCode: 'CUSTOM',
        options: {
          capacityTier:
            p.maxGuests <= 50
              ? 50
              : p.maxGuests <= 150
                ? 150
                : p.maxGuests <= 300
                  ? 300
                  : 600,
          extraPetugas: p.petugasCount,
          extraHoursPerPetugas: p.extraHoursPerPetugas,
          supervisor: p.supervisorCount,
          akrilik: p.akrilikQris,
          gladi: p.gladiH1,
        },
        eyebrow: p.name,
        title: p.tagline,
        price: p.price,
        originalPrice: p.originalPrice,
        description: p.description,
        features: [...p.features],
        ctaLabel: `Pilih ${p.name}`,
        href: `/templates?paket=CUSTOM`,
        featured: p.popular,
        badgeText: p.popular ? 'Paket Spesial' : 'Include Undangan',
      }));

    return [...presetCards, ...extraBukuTamuCards];
  }, [master]);

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    const order = WEDDING_SERVICE_TABS.map((t) => t.id);
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') {
      nextIdx = (currentIndex + 1) % order.length;
    } else if (e.key === 'ArrowLeft') {
      nextIdx = (currentIndex - 1 + order.length) % order.length;
    } else if (e.key === 'Home') {
      nextIdx = 0;
    } else if (e.key === 'End') {
      nextIdx = order.length - 1;
    }
    if (nextIdx !== null) {
      e.preventDefault();
      const nextTab = order[nextIdx];
      setActiveTab(nextTab);
      tabRefs.current[nextTab]?.focus();
    }
  };

  const activeTabMeta =
    WEDDING_SERVICE_TABS.find((t) => t.id === activeTab) ??
    WEDDING_SERVICE_TABS[1];

  return (
    <div className="packages-showcase" data-testid="packages-showcase">
      {/* 3-Tab Pill Switcher: Kiri (Undangan Digital) · Tengah (Buku Tamu Digital) · Kanan (Custom) */}
      <div className="packages-service-tabs-wrap">
        <div
          className="packages-service-tablist"
          role="tablist"
          aria-label="Kategori layanan pernikahan"
        >
          {WEDDING_SERVICE_TABS.map((tab, idx) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                id={`pkg-tab-${tab.id}`}
                type="button"
                role="tab"
                data-testid={`service-tab-${tab.id}`}
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                className="packages-service-tab"
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
              >
                <span className="packages-service-tab__label">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <p className="packages-service-tab-caption" aria-live="polite">
          {activeTab === 'BUKU_TAMU' && (
            <span className="packages-include-pill">
              ✓ Pasti dapat Undangan Digital
            </span>
          )}{' '}
          <span>{activeTabMeta.subtitle}</span>
        </p>
      </div>

      {/* PANEL 1 (Kiri): UNDANGAN DIGITAL */}
      <div
        id="pkg-panel-UNDANGAN"
        role="tabpanel"
        aria-labelledby="pkg-tab-UNDANGAN"
        hidden={activeTab !== 'UNDANGAN'}
      >
        <div className="packages-tabpanel-inner">
          <CenterPeekingCarousel
            ariaLabel="Paket Undangan Digital"
            cards={undanganCards}
            defaultIndex={1}
            isActiveTab={activeTab === 'UNDANGAN'}
          />
        </div>
      </div>

      {/* PANEL 2 (Tengah): BUKU TAMU DIGITAL (Otomatis dapat Undangan Digital) */}
      <div
        id="pkg-panel-BUKU_TAMU"
        role="tabpanel"
        aria-labelledby="pkg-tab-BUKU_TAMU"
        hidden={activeTab !== 'BUKU_TAMU'}
      >
        <div className="packages-tabpanel-inner">
          <CenterPeekingCarousel
            ariaLabel="Paket Buku Tamu Digital"
            cards={bukuTamuCards}
            defaultIndex={1}
            isActiveTab={activeTab === 'BUKU_TAMU'}
          />
        </div>
      </div>

      {/* PANEL 3 (Kanan): CUSTOM (Client A La Carte Builder) */}
      <div
        id="pkg-panel-CUSTOM"
        role="tabpanel"
        aria-labelledby="pkg-tab-CUSTOM"
        hidden={activeTab !== 'CUSTOM'}
      >
        <div className="packages-tabpanel-inner">
          <div className="packages-custom-builder-grid">
            {/* Left column: Interactive A La Carte Service Controls */}
            <div className="packages-custom-controls">
              <div className="packages-custom-controls__head">
                <span className="package-label">A La Carte · Bebas Pilih</span>
                <h3>Pilih sendiri layanan yang kamu butuhkan</h3>
                <p>
                  Ambil layanan sesuka hati tanpa terikat paket preset. Harga
                  dihitung otomatis dan transparan per komponen.
                </p>
              </div>

              {/* 1. Kuota Undangan */}
              <div className="packages-custom-field">
                <label className="packages-custom-field__label">
                  1. Kapasitas Undangan Digital (1 undangan bisa untuk keluarga)
                </label>
                <div className="packages-custom-tier-pills">
                  {CAPACITY_TIERS.map((tier) => {
                    const active = customCapacity === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        aria-pressed={active}
                        className={`packages-custom-tier-btn ${active ? 'is-selected' : ''}`}
                        onClick={() => setCustomCapacity(tier)}
                      >
                        <strong>{tier} Undangan</strong>
                        <span>{formatRupiah(rates.capacityPrices[tier])}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Petugas Check-in (per acara, maks. 6 jam) & Jam Tambahan */}
              <div className="packages-custom-stepper-row">
                <div className="packages-custom-stepper-box">
                  <div>
                    <div className="packages-custom-field__label">
                      2. Petugas Check-in (per acara, maks. 6 jam)
                    </div>
                    <div className="packages-custom-field__sub">
                      Petugas check-in {formatRupiah(rates.petugasUnit)}/orang (per acara, maks. 6 jam)
                    </div>
                  </div>
                  <div className="packages-custom-stepper">
                    <button
                      type="button"
                      aria-label="Kurangi jumlah petugas check-in"
                      disabled={customPetugas <= 0}
                      onClick={() =>
                        setCustomPetugas((p) => Math.max(0, p - 1))
                      }
                    >
                      −
                    </button>
                    <span>{customPetugas}</span>
                    <button
                      type="button"
                      aria-label="Tambah jumlah petugas check-in"
                      disabled={customPetugas >= 20}
                      onClick={() =>
                        setCustomPetugas((p) => Math.min(20, p + 1))
                      }
                    >
                      +
                    </button>
                  </div>
                </div>

                <div
                  className={`packages-custom-stepper-box ${customPetugas === 0 ? 'is-muted' : ''}`}
                >
                  <div>
                    <div className="packages-custom-field__label">
                      Jam Tambahan Petugas
                    </div>
                    <div className="packages-custom-field__sub">
                      +{formatRupiah(rates.petugasExtraHour)}/jam/orang
                    </div>
                  </div>
                  <div className="packages-custom-stepper">
                    <button
                      type="button"
                      aria-label="Kurangi jam tambahan petugas"
                      disabled={customPetugas === 0 || customExtraHours <= 0}
                      onClick={() =>
                        setCustomExtraHours((h) => Math.max(0, h - 1))
                      }
                    >
                      −
                    </button>
                    <span>{customPetugas > 0 ? customExtraHours : 0}</span>
                    <button
                      type="button"
                      aria-label="Tambah jam tambahan petugas"
                      disabled={customPetugas === 0 || customExtraHours >= 8}
                      onClick={() =>
                        setCustomExtraHours((h) => Math.min(8, h + 1))
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Optional On-Site Add-ons */}
              <div className="packages-custom-field">
                <span className="packages-custom-field__label">
                  3. Komponen Pendukung Acara (Opsional)
                </span>
                <div className="packages-custom-addons">
                  <label
                    className={`packages-custom-addon ${customAkrilik ? 'is-checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={customAkrilik}
                      onChange={(e) => setCustomAkrilik(e.target.checked)}
                    />
                    <div>
                      <strong>Stand Akrilik QRIS Meja (1 set)</strong>
                      <span>+{formatRupiah(rates.akrilik)}</span>
                    </div>
                  </label>

                  <label
                    className={`packages-custom-addon ${customGladi ? 'is-checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={customGladi}
                      onChange={(e) => setCustomGladi(e.target.checked)}
                    />
                    <div>
                      <strong>Sesi Gladi Bersih &amp; Uji Sistem H-1</strong>
                      <span>+{formatRupiah(rates.gladi)}</span>
                    </div>
                  </label>

                  <label
                    className={`packages-custom-addon ${customSupervisor ? 'is-checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={customSupervisor}
                      onChange={(e) => setCustomSupervisor(e.target.checked)}
                    />
                    <div>
                      <strong>Supervisor Lapangan (1 orang)</strong>
                      <span>+{formatRupiah(rates.supervisor)}</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right column: Live Custom Summary Card */}
            <article
              id="package-slide-CUSTOM"
              className="package-card package-card--custom packages-custom-summary"
              data-testid="package-card-CUSTOM"
            >
              <span className="recommended recommended--custom">
                <span aria-hidden="true">⚙️</span> Rakit Sendiri
              </span>
              <div className="package-card-header">
                <span className="package-label">Ringkasan Rakitanmu</span>
                <h3>Sesuaikan kapasitas &amp; komponen</h3>
                <PriceWithStrikethrough
                  price={customCalc.total}
                  originalPrice={customCalc.normalTotal}
                />
                <p className="package-desc">
                  Sudah termasuk Undangan Digital semua tema katalog, tautan
                  nama tamu personal, RSVP, serta seluruh komponen pilihanmu di
                  bawah ini:
                </p>
              </div>
              <div className="package-divider" aria-hidden="true" />
              <ul className="package-features">
                {customCalc.lineItems.map((item) => (
                  <li key={item.code}>
                    <span className="pkg-feature-icon" aria-hidden="true">
                      <IconCheck />
                    </span>
                    <span className="packages-custom-lineitem">
                      <span>{item.label}</span>
                      <strong>{formatRupiah(item.amount)}</strong>
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                id="pkg-select-custom"
                className="button primary exclusive-cta"
                href="/templates?paket=CUSTOM"
                onClick={() =>
                  savePackageSelectionToSession({
                    packageCode: 'CUSTOM',
                    options: customCalc.normalizedOptions,
                  })
                }
              >
                <span>Lanjut Pilih Template</span>
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
