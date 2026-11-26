export const PETUGAS_UNIT = 80_000;
export const PETUGAS_EXTRA_HOUR = 15_000;
export const SUPERVISOR = 120_000;
export const AKRILIK_QRIS = 49_000;
export const GLADI_H1 = 50_000;

export const CAPACITY_TIERS = [50, 150, 300, 600] as const;
export type CapacityTier = (typeof CAPACITY_TIERS)[number];

export const CAPACITY_BASE_PRICES: Record<CapacityTier, number> = {
  50: 149_000,
  150: 199_000,
  300: 299_000,
  600: 449_000,
};

export type PriceTier = 'LAUNCH' | 'NORMAL';

/**
 * Single-line switch to toggle active pricing tier across API and frontend.
 */
export const ACTIVE_PRICE_TIER: PriceTier = 'LAUNCH';

export const PRESET_PACKAGE_CODES = [
  'SACRED',
  'INTIMATE',
  'SIGNATURE',
  'MAJESTIC',
] as const;
export type PresetPackageCode = (typeof PRESET_PACKAGE_CODES)[number];

export const SELECTABLE_PACKAGE_CODES = [
  ...PRESET_PACKAGE_CODES,
  'CUSTOM',
] as const;
export type SelectablePackageCode = (typeof SELECTABLE_PACKAGE_CODES)[number];

export const LEGACY_PACKAGE_CODES = ['SILVER', 'GOLD', 'PLATINUM'] as const;
export type LegacyPackageCode = (typeof LEGACY_PACKAGE_CODES)[number];

export const ALL_ORDER_PACKAGE_CODES = [
  ...SELECTABLE_PACKAGE_CODES,
  'UNSELECTED',
  ...LEGACY_PACKAGE_CODES,
] as const;
export type OrderPackageCode = (typeof ALL_ORDER_PACKAGE_CODES)[number];

export const PACKAGE_PRICES: Record<
  PriceTier,
  Record<PresetPackageCode, number>
> = {
  LAUNCH: {
    SACRED: 149_000,
    INTIMATE: 299_000,
    SIGNATURE: 499_000,
    MAJESTIC: 899_000,
  },
  NORMAL: {
    SACRED: 199_000,
    INTIMATE: 399_000,
    SIGNATURE: 649_000,
    MAJESTIC: 1_149_000,
  },
};

export interface WeddingPackageCatalogItem {
  code: PresetPackageCode;
  name: string;
  tagline: string;
  description: string;
  popular?: boolean;
  baseCapacity: CapacityTier;
  includedPetugas: number;
  includedSupervisor: 0 | 1;
  includesAkrilik: boolean;
  includesGladi: boolean;
  includesGoogleSheetLive: boolean;
  includesPostEventReport: boolean;
  features: string[];
}

export const WEDDING_PACKAGE_CATALOG: Record<
  PresetPackageCode,
  WeddingPackageCatalogItem
> = {
  SACRED: {
    code: 'SACRED',
    name: 'Sacred',
    tagline: 'Akad & syukuran hangat',
    description:
      'Undangan digital pernikahan dan buku tamu QR mandiri untuk acara akad atau syukuran intim hingga 50 tamu.',
    baseCapacity: 50,
    includedPetugas: 0,
    includedSupervisor: 0,
    includesAkrilik: false,
    includesGladi: false,
    includesGoogleSheetLive: false,
    includesPostEventReport: false,
    features: [
      'Kapasitas hingga 50 tamu undangan',
      'Semua tema katalog & kustomisasi penuh',
      'RSVP, ucapan & amplop digital / QRIS',
      'QR check-in tamu mandiri (tanpa petugas)',
      'Stand akrilik QRIS meja tersedia sebagai add-on',
    ],
  },
  INTIMATE: {
    code: 'INTIMATE',
    name: 'Intimate',
    tagline: 'Resepsi intim terkelola',
    description:
      'Didampingi 1 petugas check-in di lokasi serta 1 set stand akrilik QRIS meja untuk resepsi hingga 150 tamu.',
    baseCapacity: 150,
    includedPetugas: 1,
    includedSupervisor: 0,
    includesAkrilik: true,
    includesGladi: false,
    includesGoogleSheetLive: false,
    includesPostEventReport: false,
    features: [
      'Kapasitas hingga 150 tamu undangan',
      '1 petugas check-in di lokasi (4 jam kerja)',
      'Termasuk 1 set stand akrilik QRIS meja',
      'Semua tema katalog, RSVP, ucapan & amplop digital',
      'Dashboard portal pengantin & ekspor data tamu',
    ],
  },
  SIGNATURE: {
    code: 'SIGNATURE',
    name: 'Signature',
    tagline: 'Pilihan terpopuler resepsi menengah',
    description:
      'Alur penerimaan tamu cepat dengan 2 petugas check-in, sesi gladi H-1, stand akrilik QRIS, dan sinkronisasi Google Sheet live.',
    popular: true,
    baseCapacity: 300,
    includedPetugas: 2,
    includedSupervisor: 0,
    includesAkrilik: true,
    includesGladi: true,
    includesGoogleSheetLive: true,
    includesPostEventReport: false,
    features: [
      'Kapasitas hingga 300 tamu undangan',
      '2 petugas check-in di lokasi (masing-masing 4 jam)',
      'Termasuk 1 set stand akrilik QRIS meja',
      'Sesi gladi bersih & uji sistem H-1',
      'Sinkronisasi kehadiran ke Google Sheet live',
    ],
  },
  MAJESTIC: {
    code: 'MAJESTIC',
    name: 'Majestic',
    tagline: 'Resepsi besar dengan tim penuh',
    description:
      'Didukung 4 petugas check-in dan 1 supervisor lapangan, gladi H-1, Google Sheet live, serta laporan kehadiran pasca-acara.',
    baseCapacity: 600,
    includedPetugas: 4,
    includedSupervisor: 1,
    includesAkrilik: true,
    includesGladi: true,
    includesGoogleSheetLive: true,
    includesPostEventReport: true,
    features: [
      'Kapasitas hingga 600 tamu undangan',
      '4 petugas check-in (4 jam) + 1 supervisor lapangan',
      'Termasuk 1 set stand akrilik QRIS meja',
      'Sesi gladi bersih H-1 & Google Sheet live',
      'Laporan rekapitulasi kehadiran pasca-acara',
    ],
  },
};

export const LEGACY_PACKAGE_CAPACITY: Record<LegacyPackageCode, CapacityTier> =
  {
    SILVER: 150,
    GOLD: 300,
    PLATINUM: 600,
  };

export interface OrderPricingOptionsInput {
  extraPetugas?: number;
  extraHoursPerPetugas?: number;
  supervisor?: 0 | 1 | number | boolean;
  akrilik?: boolean;
  gladi?: boolean;
  capacityTier?: CapacityTier | number;
}

export interface NormalizedOrderPricingOptions {
  extraPetugas: number;
  extraHoursPerPetugas: number;
  supervisor: 0 | 1;
  akrilik: boolean;
  gladi: boolean;
  capacityTier: CapacityTier;
}

export interface OrderPriceLineItem {
  code: string;
  label: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface OrderEntitlements {
  maxGuests: CapacityTier;
  petugasCount: number;
  extraHoursPerPetugas: number;
  supervisorCount: 0 | 1;
  akrilikQris: boolean;
  gladiH1: boolean;
  googleSheetLive: boolean;
  postEventReport: boolean;
}

export interface CalculateOrderPriceInput {
  packageCode: string;
  capacityTier?: CapacityTier | number;
  options?: OrderPricingOptionsInput | null;
  priceTier?: PriceTier;
}

export interface CalculateOrderPriceResult {
  packageCode: SelectablePackageCode;
  priceTier: PriceTier;
  total: number;
  lineItems: OrderPriceLineItem[];
  entitlements: OrderEntitlements;
  normalizedOptions: NormalizedOrderPricingOptions;
}

export function isPresetPackageCode(code: unknown): code is PresetPackageCode {
  return (
    typeof code === 'string' &&
    (PRESET_PACKAGE_CODES as readonly string[]).includes(code)
  );
}

export function isSelectablePackageCode(
  code: unknown,
): code is SelectablePackageCode {
  return (
    typeof code === 'string' &&
    (SELECTABLE_PACKAGE_CODES as readonly string[]).includes(code)
  );
}

export function isCapacityTier(value: unknown): value is CapacityTier {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    (CAPACITY_TIERS as readonly number[]).includes(value)
  );
}

function clampInteger(
  value: unknown,
  min: number,
  max: number,
  fieldName: string,
): number {
  if (value === undefined || value === null) {
    return min;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid numeric option for ${fieldName}`);
  }
  const truncated = Math.trunc(value);
  if (truncated < min) return min;
  if (truncated > max) return max;
  return truncated;
}

function normalizeSupervisor(value: unknown): 0 | 1 {
  if (value === undefined || value === null || value === false || value === 0) {
    return 0;
  }
  if (value === true || value === 1) {
    return 1;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value) >= 1 ? 1 : 0;
  }
  throw new Error('Invalid supervisor option');
}

function normalizeBoolean(value: unknown, fieldName: string): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid boolean option for ${fieldName}`);
  }
  return value;
}

export function getPackageBasePrice(
  packageCode: PresetPackageCode,
  tier: PriceTier = ACTIVE_PRICE_TIER,
): number {
  return PACKAGE_PRICES[tier][packageCode];
}

export function getPackageDisplayLabel(packageCode?: string | null): string {
  const normalized = (packageCode || '').trim().toUpperCase();
  if (!normalized || normalized === 'UNSELECTED') {
    return 'Paket belum dipilih';
  }
  if (normalized === 'CUSTOM') {
    return 'Rakit Sendiri (Custom)';
  }
  if (isPresetPackageCode(normalized)) {
    return WEDDING_PACKAGE_CATALOG[normalized].name;
  }
  if (normalized === 'SILVER') return 'Silver (Legacy)';
  if (normalized === 'GOLD') return 'Gold (Legacy)';
  if (normalized === 'PLATINUM') return 'Platinum (Legacy)';
  return normalized;
}

export function calculateOrderPrice(
  input: CalculateOrderPriceInput,
): CalculateOrderPriceResult {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid pricing calculation input');
  }

  const rawCode =
    typeof input.packageCode === 'string'
      ? input.packageCode.trim().toUpperCase()
      : '';

  if (!isSelectablePackageCode(rawCode)) {
    throw new Error(`Unknown or unsupported packageCode: "${input.packageCode}"`);
  }

  const priceTier: PriceTier = input.priceTier ?? ACTIVE_PRICE_TIER;
  if (priceTier !== 'LAUNCH' && priceTier !== 'NORMAL') {
    throw new Error(`Invalid priceTier: "${String(priceTier)}"`);
  }

  const rawOptions = input.options ?? {};
  if (typeof rawOptions !== 'object' || Array.isArray(rawOptions)) {
    throw new Error('Invalid pricing options object');
  }

  const extraPetugas = clampInteger(
    rawOptions.extraPetugas,
    0,
    20,
    'extraPetugas',
  );
  const rawExtraHours = clampInteger(
    rawOptions.extraHoursPerPetugas,
    0,
    8,
    'extraHoursPerPetugas',
  );
  const supervisor = normalizeSupervisor(rawOptions.supervisor);
  const akrilik = normalizeBoolean(rawOptions.akrilik, 'akrilik');
  const gladi = normalizeBoolean(rawOptions.gladi, 'gladi');

  const requestedCapacity =
    input.capacityTier !== undefined
      ? input.capacityTier
      : rawOptions.capacityTier;

  if (
    requestedCapacity !== undefined &&
    requestedCapacity !== null &&
    !isCapacityTier(requestedCapacity)
  ) {
    throw new Error(
      `Invalid capacityTier: "${String(requestedCapacity)}". Allowed tiers: ${CAPACITY_TIERS.join(', ')}`,
    );
  }

  const lineItems: OrderPriceLineItem[] = [];

  if (rawCode === 'CUSTOM') {
    const effectiveCapacity: CapacityTier = isCapacityTier(requestedCapacity)
      ? requestedCapacity
      : 50;
    const baseAmount = CAPACITY_BASE_PRICES[effectiveCapacity];
    lineItems.push({
      code: `CUSTOM_BASE_${effectiveCapacity}`,
      label: `Dasar Undangan Digital (${effectiveCapacity} tamu)`,
      quantity: 1,
      unitPrice: baseAmount,
      amount: baseAmount,
    });

    if (extraPetugas > 0) {
      const petugasAmount = extraPetugas * PETUGAS_UNIT;
      lineItems.push({
        code: 'EXTRA_PETUGAS',
        label: `Petugas Check-in (${extraPetugas} orang × 4 jam)`,
        quantity: extraPetugas,
        unitPrice: PETUGAS_UNIT,
        amount: petugasAmount,
      });
    }

    const effectiveExtraHours = extraPetugas > 0 ? rawExtraHours : 0;
    if (extraPetugas > 0 && effectiveExtraHours > 0) {
      const totalExtraHourUnits = extraPetugas * effectiveExtraHours;
      const extraHourAmount = totalExtraHourUnits * PETUGAS_EXTRA_HOUR;
      lineItems.push({
        code: 'PETUGAS_EXTRA_HOUR',
        label: `Tambahan Jam Petugas (${extraPetugas} orang × ${effectiveExtraHours} jam)`,
        quantity: totalExtraHourUnits,
        unitPrice: PETUGAS_EXTRA_HOUR,
        amount: extraHourAmount,
      });
    }

    if (supervisor === 1) {
      lineItems.push({
        code: 'SUPERVISOR',
        label: 'Supervisor Lapangan',
        quantity: 1,
        unitPrice: SUPERVISOR,
        amount: SUPERVISOR,
      });
    }

    if (akrilik) {
      lineItems.push({
        code: 'AKRILIK_QRIS',
        label: 'Stand Akrilik QRIS Meja (1 set)',
        quantity: 1,
        unitPrice: AKRILIK_QRIS,
        amount: AKRILIK_QRIS,
      });
    }

    if (gladi) {
      lineItems.push({
        code: 'GLADI_H1',
        label: 'Sesi Gladi Bersih H-1',
        quantity: 1,
        unitPrice: GLADI_H1,
        amount: GLADI_H1,
      });
    }

    const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

    return {
      packageCode: 'CUSTOM',
      priceTier,
      total,
      lineItems,
      entitlements: {
        maxGuests: effectiveCapacity,
        petugasCount: extraPetugas,
        extraHoursPerPetugas: effectiveExtraHours,
        supervisorCount: supervisor,
        akrilikQris: akrilik,
        gladiH1: gladi,
        googleSheetLive: false,
        postEventReport: false,
      },
      normalizedOptions: {
        extraPetugas,
        extraHoursPerPetugas: effectiveExtraHours,
        supervisor,
        akrilik,
        gladi,
        capacityTier: effectiveCapacity,
      },
    };
  }

  // Preset packages: SACRED, INTIMATE, SIGNATURE, MAJESTIC
  const pkg = WEDDING_PACKAGE_CATALOG[rawCode];
  const basePackagePrice = PACKAGE_PRICES[priceTier][rawCode];

  lineItems.push({
    code: `PACKAGE_${rawCode}`,
    label: `Paket ${pkg.name} (${pkg.baseCapacity} tamu)`,
    quantity: 1,
    unitPrice: basePackagePrice,
    amount: basePackagePrice,
  });

  // Capacity upgrade only applies if requestedCapacity > pkg.baseCapacity (never reduces base capacity or price)
  const effectiveCapacity: CapacityTier =
    isCapacityTier(requestedCapacity) && requestedCapacity > pkg.baseCapacity
      ? requestedCapacity
      : pkg.baseCapacity;

  if (effectiveCapacity > pkg.baseCapacity) {
    const upgradeAmount =
      CAPACITY_BASE_PRICES[effectiveCapacity] -
      CAPACITY_BASE_PRICES[pkg.baseCapacity];
    lineItems.push({
      code: 'CAPACITY_UPGRADE',
      label: `Upgrade Kapasitas Tamu (${pkg.baseCapacity} → ${effectiveCapacity} tamu)`,
      quantity: 1,
      unitPrice: upgradeAmount,
      amount: upgradeAmount,
    });
  }

  if (extraPetugas > 0) {
    const petugasAmount = extraPetugas * PETUGAS_UNIT;
    lineItems.push({
      code: 'EXTRA_PETUGAS',
      label: `Tambahan Petugas Check-in (${extraPetugas} orang × 4 jam)`,
      quantity: extraPetugas,
      unitPrice: PETUGAS_UNIT,
      amount: petugasAmount,
    });
  }

  const totalPetugas = pkg.includedPetugas + extraPetugas;
  const effectiveExtraHours = totalPetugas > 0 ? rawExtraHours : 0;

  if (totalPetugas > 0 && effectiveExtraHours > 0) {
    const totalExtraHourUnits = totalPetugas * effectiveExtraHours;
    const extraHourAmount = totalExtraHourUnits * PETUGAS_EXTRA_HOUR;
    lineItems.push({
      code: 'PETUGAS_EXTRA_HOUR',
      label: `Tambahan Jam Petugas (${totalPetugas} orang × ${effectiveExtraHours} jam)`,
      quantity: totalExtraHourUnits,
      unitPrice: PETUGAS_EXTRA_HOUR,
      amount: extraHourAmount,
    });
  }

  const addSupervisor = pkg.includedSupervisor === 0 && supervisor === 1;
  if (addSupervisor) {
    lineItems.push({
      code: 'SUPERVISOR',
      label: 'Supervisor Lapangan',
      quantity: 1,
      unitPrice: SUPERVISOR,
      amount: SUPERVISOR,
    });
  }

  const addAkrilik = !pkg.includesAkrilik && akrilik;
  if (addAkrilik) {
    lineItems.push({
      code: 'AKRILIK_QRIS',
      label: 'Stand Akrilik QRIS Meja (1 set)',
      quantity: 1,
      unitPrice: AKRILIK_QRIS,
      amount: AKRILIK_QRIS,
    });
  }

  const addGladi = !pkg.includesGladi && gladi;
  if (addGladi) {
    lineItems.push({
      code: 'GLADI_H1',
      label: 'Sesi Gladi Bersih H-1',
      quantity: 1,
      unitPrice: GLADI_H1,
      amount: GLADI_H1,
    });
  }

  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    packageCode: rawCode,
    priceTier,
    total,
    lineItems,
    entitlements: {
      maxGuests: effectiveCapacity,
      petugasCount: totalPetugas,
      extraHoursPerPetugas: effectiveExtraHours,
      supervisorCount: pkg.includedSupervisor === 1 || supervisor === 1 ? 1 : 0,
      akrilikQris: pkg.includesAkrilik || akrilik,
      gladiH1: pkg.includesGladi || gladi,
      googleSheetLive: pkg.includesGoogleSheetLive,
      postEventReport: pkg.includesPostEventReport,
    },
    normalizedOptions: {
      extraPetugas,
      extraHoursPerPetugas: effectiveExtraHours,
      supervisor: pkg.includedSupervisor === 1 ? 1 : supervisor,
      akrilik: pkg.includesAkrilik ? true : akrilik,
      gladi: pkg.includesGladi ? true : gladi,
      capacityTier: effectiveCapacity,
    },
  };
}
