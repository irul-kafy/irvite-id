import {
  ACTIVE_PRICE_TIER,
  ALL_ORDER_PACKAGE_CODES,
  LEGACY_PACKAGE_CAPACITY,
  PACKAGE_PRICES,
  WEDDING_PACKAGE_CATALOG,
  calculateOrderPrice,
  getPackageDisplayLabel,
  isPresetPackageCode,
  isSelectablePackageCode,
  type OrderEntitlements,
  type OrderPackageCode,
  type OrderPriceLineItem,
  type OrderPricingOptionsInput,
  type SuperAdminPricingOverride,
} from 'pricing';

export type PackageCode = OrderPackageCode;

export interface PackageDefinition {
  code: PackageCode;
  name: string;
  priceAmount: number;
  durationDays: number;
  maxGuests: number;
  maxStaff: number;
  description: string;
  features: string[];
  legacy?: boolean;
}

export const PACKAGES: Record<PackageCode, PackageDefinition> = {
  SACRED: {
    code: 'SACRED',
    name: WEDDING_PACKAGE_CATALOG.SACRED.name,
    priceAmount: PACKAGE_PRICES[ACTIVE_PRICE_TIER].SACRED,
    durationDays: 90,
    maxGuests: WEDDING_PACKAGE_CATALOG.SACRED.baseCapacity,
    maxStaff: WEDDING_PACKAGE_CATALOG.SACRED.includedPetugas,
    description: WEDDING_PACKAGE_CATALOG.SACRED.description,
    features: WEDDING_PACKAGE_CATALOG.SACRED.features,
  },
  INTIMATE: {
    code: 'INTIMATE',
    name: WEDDING_PACKAGE_CATALOG.INTIMATE.name,
    priceAmount: PACKAGE_PRICES[ACTIVE_PRICE_TIER].INTIMATE,
    durationDays: 180,
    maxGuests: WEDDING_PACKAGE_CATALOG.INTIMATE.baseCapacity,
    maxStaff: WEDDING_PACKAGE_CATALOG.INTIMATE.includedPetugas,
    description: WEDDING_PACKAGE_CATALOG.INTIMATE.description,
    features: WEDDING_PACKAGE_CATALOG.INTIMATE.features,
  },
  SIGNATURE: {
    code: 'SIGNATURE',
    name: WEDDING_PACKAGE_CATALOG.SIGNATURE.name,
    priceAmount: PACKAGE_PRICES[ACTIVE_PRICE_TIER].SIGNATURE,
    durationDays: 365,
    maxGuests: WEDDING_PACKAGE_CATALOG.SIGNATURE.baseCapacity,
    maxStaff: WEDDING_PACKAGE_CATALOG.SIGNATURE.includedPetugas,
    description: WEDDING_PACKAGE_CATALOG.SIGNATURE.description,
    features: WEDDING_PACKAGE_CATALOG.SIGNATURE.features,
  },
  MAJESTIC: {
    code: 'MAJESTIC',
    name: WEDDING_PACKAGE_CATALOG.MAJESTIC.name,
    priceAmount: PACKAGE_PRICES[ACTIVE_PRICE_TIER].MAJESTIC,
    durationDays: 365,
    maxGuests: WEDDING_PACKAGE_CATALOG.MAJESTIC.baseCapacity,
    maxStaff:
      WEDDING_PACKAGE_CATALOG.MAJESTIC.includedPetugas +
      WEDDING_PACKAGE_CATALOG.MAJESTIC.includedSupervisor,
    description: WEDDING_PACKAGE_CATALOG.MAJESTIC.description,
    features: WEDDING_PACKAGE_CATALOG.MAJESTIC.features,
  },
  CUSTOM: {
    code: 'CUSTOM',
    name: 'Rakit Sendiri',
    priceAmount: 149_000,
    durationDays: 180,
    maxGuests: 50,
    maxStaff: 0,
    description: 'Kapasitas dan komponen layanan disesuaikan kebutuhan acara.',
    features: ['Kapasitas & komponen disesuaikan kebutuhan acara'],
  },
  UNSELECTED: {
    code: 'UNSELECTED',
    name: 'Paket belum dipilih',
    priceAmount: 0,
    durationDays: 90,
    maxGuests: 50,
    maxStaff: 0,
    description: 'Paket belum dipilih saat pembuatan draf.',
    features: ['Menunggu pemilihan paket'],
  },
  // Legacy package codes kept readable for existing orders
  SILVER: {
    code: 'SILVER',
    name: 'Paket Silver',
    priceAmount: 99_000,
    durationDays: 90,
    maxGuests: LEGACY_PACKAGE_CAPACITY.SILVER,
    maxStaff: 2,
    description:
      'Solusi undangan esensial nan elegan untuk momen istimewa Anda.',
    features: [
      'Masa aktif 3 bulan setelah acara',
      'Desain responsif semua template',
      'RSVP & Konfirmasi Kehadiran',
    ],
    legacy: true,
  },
  GOLD: {
    code: 'GOLD',
    name: 'Paket Gold',
    priceAmount: 199_000,
    durationDays: 180,
    maxGuests: LEGACY_PACKAGE_CAPACITY.GOLD,
    maxStaff: 5,
    description:
      'Pilihan terfavorit dengan fitur lengkap dan scanner kehadiran offline.',
    features: [
      'Masa aktif 6 bulan setelah acara',
      'QR Code Tamu & Scanner Kehadiran Offline',
      'Buku Tamu Digital & Kartu Ucapan Doa',
    ],
    legacy: true,
  },
  PLATINUM: {
    code: 'PLATINUM',
    name: 'Paket Platinum',
    priceAmount: 349_000,
    durationDays: 365,
    maxGuests: LEGACY_PACKAGE_CAPACITY.PLATINUM,
    maxStaff: 10,
    description:
      'Pengalaman premium eksklusif dengan masa aktif 1 tahun & dukungan prioritas.',
    features: [
      'Masa aktif 12 bulan (1 tahun) setelah acara',
      'Laporan kehadiran real-time & pasca-acara',
      'Prioritas bantuan tim teknis',
    ],
    legacy: true,
  },
};

export const DEFAULT_PACKAGE = PACKAGES.UNSELECTED;

export interface OrderOptionsSnapshot {
  input?: OrderPricingOptionsInput;
  lineItems: OrderPriceLineItem[];
  entitlements: OrderEntitlements;
  computedTotal: number;
  normalTotal?: number;
  originalPriceAmount?: number | null;
  customPackageName?: string;
  superAdminCustom?: SuperAdminPricingOverride;
  priceTier?: string;
}

export function getPackageDefinition(code?: string | null): PackageDefinition {
  const normalized = (code || '').trim().toUpperCase();
  if (
    normalized &&
    (ALL_ORDER_PACKAGE_CODES as readonly string[]).includes(normalized)
  ) {
    return PACKAGES[normalized as PackageCode];
  }
  return PACKAGES.UNSELECTED;
}

export function calculateActiveUntil(
  eventDate: Date,
  packageCode?: string | null,
): Date {
  const pkg = getPackageDefinition(packageCode);
  return new Date(eventDate.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);
}

export function buildOrderPricingSnapshot(
  packageCode?: string | null,
  options?: OrderPricingOptionsInput | null,
  superAdminOverride?: SuperAdminPricingOverride | null,
): {
  packageCode: PackageCode;
  priceAmount: number;
  pricingVersion: number;
  options: OrderOptionsSnapshot;
} {
  const normalized = (packageCode || '').trim().toUpperCase();
  if (!normalized || normalized === 'UNSELECTED') {
    return {
      packageCode: 'UNSELECTED',
      priceAmount: 0,
      pricingVersion: 1,
      options: {
        input: options ?? {},
        lineItems: [],
        entitlements: {
          maxGuests: 50,
          petugasCount: 0,
          extraHoursPerPetugas: 0,
          supervisorCount: 0,
          akrilikQris: false,
          gladiH1: false,
          googleSheetLive: false,
          postEventReport: false,
        },
        computedTotal: 0,
        normalTotal: 0,
        originalPriceAmount: null,
        priceTier: ACTIVE_PRICE_TIER,
      },
    };
  }

  if (isSelectablePackageCode(normalized)) {
    const calculated = calculateOrderPrice({
      packageCode: normalized,
      capacityTier: options?.capacityTier,
      options: options ?? undefined,
      superAdminOverride: superAdminOverride ?? undefined,
    });
    const resolvedOriginalPrice =
      superAdminOverride?.originalPriceAmount !== undefined
        ? superAdminOverride.originalPriceAmount
        : calculated.normalTotal;
    return {
      packageCode: calculated.packageCode,
      priceAmount: calculated.total,
      pricingVersion: 1,
      options: {
        input: calculated.normalizedOptions,
        lineItems: calculated.lineItems,
        entitlements: calculated.entitlements,
        computedTotal: calculated.total,
        normalTotal: calculated.normalTotal,
        originalPriceAmount: resolvedOriginalPrice,
        ...(calculated.customPackageName
          ? { customPackageName: calculated.customPackageName }
          : {}),
        ...(superAdminOverride ? { superAdminCustom: superAdminOverride } : {}),
        priceTier: calculated.priceTier,
      },
    };
  }

  const legacyDef = getPackageDefinition(normalized);
  return {
    packageCode: legacyDef.code,
    priceAmount: legacyDef.priceAmount,
    pricingVersion: 1,
    options: {
      input: options ?? {},
      lineItems: [
        {
          code: `LEGACY_${legacyDef.code}`,
          label: `Paket ${getPackageDisplayLabel(legacyDef.code)}`,
          quantity: 1,
          unitPrice: legacyDef.priceAmount,
          amount: legacyDef.priceAmount,
        },
      ],
      entitlements: {
        maxGuests: legacyDef.maxGuests as 50 | 150 | 300 | 600,
        petugasCount: legacyDef.maxStaff,
        extraHoursPerPetugas: 0,
        supervisorCount: 0,
        akrilikQris: false,
        gladiH1: false,
        googleSheetLive: false,
        postEventReport: false,
      },
      computedTotal: legacyDef.priceAmount,
      priceTier: ACTIVE_PRICE_TIER,
    },
  };
}

/**
 * Resolves the maximum allowed invited guests for an event that has an Order.
 * Returns null if the event does not have an Order, if the Order uses a legacy
 * package code (SILVER/GOLD/PLATINUM), or if Order.options is missing/null.
 */
export function resolveOrderMaxGuests(
  order?: { packageCode?: string | null; options?: unknown } | null,
): number | null {
  if (!order) {
    return null;
  }

  const normalized = (order.packageCode || '').trim().toUpperCase();
  if (normalized in LEGACY_PACKAGE_CAPACITY) {
    return null;
  }

  if (
    !order.options ||
    typeof order.options !== 'object' ||
    Array.isArray(order.options)
  ) {
    return null;
  }

  const record = order.options as {
    entitlements?: { maxGuests?: unknown };
    input?: { capacityTier?: unknown };
  };
  const entMax = record.entitlements?.maxGuests;
  if (typeof entMax === 'number' && Number.isFinite(entMax) && entMax > 0) {
    return Math.trunc(entMax);
  }
  const inputCap = record.input?.capacityTier;
  if (
    typeof inputCap === 'number' &&
    Number.isFinite(inputCap) &&
    inputCap > 0
  ) {
    return Math.trunc(inputCap);
  }

  if (isPresetPackageCode(normalized)) {
    return WEDDING_PACKAGE_CATALOG[normalized].baseCapacity;
  }
  if (normalized === 'CUSTOM' || normalized === 'UNSELECTED') {
    return PACKAGES.UNSELECTED.maxGuests;
  }
  return null;
}
