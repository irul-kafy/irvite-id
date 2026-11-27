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

export const CAPACITY_NORMAL_PRICES: Record<CapacityTier, number> = {
  50: 199_000,
  150: 269_000,
  300: 399_000,
  600: 599_000,
};

export type WeddingServiceTab = 'UNDANGAN' | 'BUKU_TAMU' | 'CUSTOM';

export const WEDDING_SERVICE_TABS: ReadonlyArray<{
  id: WeddingServiceTab;
  label: string;
  shortLabel: string;
  subtitle: string;
}> = [
  {
    id: 'UNDANGAN',
    label: 'Undangan Digital',
    shortLabel: 'Undangan Digital',
    subtitle:
      'Undangan web eksklusif, tautan nama tamu personal, RSVP & amplop digital untuk disebar secara online.',
  },
  {
    id: 'BUKU_TAMU',
    label: 'Buku Tamu Digital',
    shortLabel: 'Buku Tamu Digital',
    subtitle:
      'Sudah termasuk Undangan Digital penuh + sistem check-in QR meja resepsi, petugas di lokasi (24/hari), dan stand akrilik.',
  },
  {
    id: 'CUSTOM',
    label: 'Custom',
    shortLabel: 'Custom',
    subtitle:
      'Pilih sesuka hati komponen layanan dan kuota undangan secara fleksibel sesuai kebutuhan acaramu tanpa terikat paket.',
  },
];

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
  serviceCategory: 'UNDANGAN' | 'BUKU_TAMU';
  name: string;
  tagline: string;
  description: string;
  popular?: boolean;
  includesUndanganDigital: boolean;
  baseCapacity: CapacityTier;
  includedPetugas: number;
  includedSupervisor: 0 | 1;
  includesAkrilik: boolean;
  includesGladi: boolean;
  includesGoogleSheetLive: boolean;
  includesPostEventReport: boolean;
  features: string[];
}

export const BUKU_TAMU_PACKAGE_CODES = [
  'INTIMATE',
  'SIGNATURE',
  'MAJESTIC',
] as const;
export type BukuTamuPackageCode = (typeof BUKU_TAMU_PACKAGE_CODES)[number];

export interface UndanganShowcaseCard {
  id: string;
  packageCode: 'SACRED';
  capacityTier: CapacityTier;
  name: string;
  tagline: string;
  description: string;
  popular?: boolean;
  price: number;
  originalPrice: number;
  features: string[];
}

export const UNDANGAN_SHOWCASE_CARDS: readonly UndanganShowcaseCard[] = [
  {
    id: 'UNDANGAN_50',
    packageCode: 'SACRED',
    capacityTier: 50,
    name: 'Sacred 50',
    tagline: 'Akad & syukuran hangat',
    description:
      'Undangan digital pernikahan eksklusif dan buku tamu QR mandiri untuk acara akad atau syukuran intim hingga 50 undangan.',
    price: 149_000,
    originalPrice: 199_000,
    features: [
      'Kapasitas hingga 50 undangan (1 undangan bisa untuk keluarga)',
      'Semua tema katalog & kustomisasi konten penuh',
      'Tautan personal nama tamu via WhatsApp',
      'RSVP real-time, ucapan doa & amplop digital / QRIS',
      'QR check-in tamu mandiri (tanpa petugas lokasi)',
    ],
  },
  {
    id: 'UNDANGAN_150',
    packageCode: 'SACRED',
    capacityTier: 150,
    name: 'Sacred 150',
    tagline: 'Pilihan favorit undangan mandiri',
    description:
      'Solusi undangan digital elegan dengan kuota lebih lega hingga 150 undangan tanpa biaya pendampingan petugas lapangan.',
    popular: true,
    price: 199_000,
    originalPrice: 269_000,
    features: [
      'Kapasitas hingga 150 undangan (1 undangan bisa untuk keluarga)',
      'Semua tema katalog & kustomisasi konten penuh',
      'Tautan personal nama tamu & ekspor daftar tamu',
      'RSVP real-time, ucapan doa & amplop digital / QRIS',
      'Dashboard portal pengantin & QR check-in mandiri',
    ],
  },
  {
    id: 'UNDANGAN_300',
    packageCode: 'SACRED',
    capacityTier: 300,
    name: 'Sacred 300',
    tagline: 'Sebar undangan keluarga besar',
    description:
      'Kuota leluasa hingga 300 undangan untuk penyebaran undangan online masif dengan pengelolaan RSVP terpusat.',
    price: 299_000,
    originalPrice: 399_000,
    features: [
      'Kapasitas hingga 300 undangan (1 undangan bisa untuk keluarga)',
      'Semua tema katalog & kustomisasi konten penuh',
      'Tautan personal nama tamu & ekspor CSV kehadiran',
      'RSVP real-time, ucapan doa & amplop digital / QRIS',
      'Dapat di-upgrade ke Buku Tamu Digital kapan saja',
    ],
  },
];

export const WEDDING_PACKAGE_CATALOG: Record<
  PresetPackageCode,
  WeddingPackageCatalogItem
> = {
  SACRED: {
    code: 'SACRED',
    serviceCategory: 'UNDANGAN',
    name: 'Sacred',
    tagline: 'Akad & syukuran hangat',
    description:
      'Undangan digital pernikahan dan buku tamu QR mandiri untuk acara akad atau syukuran intim hingga 50 undangan (1 undangan bisa untuk keluarga).',
    includesUndanganDigital: true,
    baseCapacity: 50,
    includedPetugas: 0,
    includedSupervisor: 0,
    includesAkrilik: false,
    includesGladi: false,
    includesGoogleSheetLive: false,
    includesPostEventReport: false,
    features: [
      'Kapasitas hingga 50 undangan (1 undangan bisa untuk keluarga)',
      'Semua tema katalog & kustomisasi penuh',
      'RSVP, ucapan & amplop digital / QRIS',
      'QR check-in tamu mandiri (tanpa petugas)',
      'Stand akrilik QRIS meja tersedia sebagai add-on',
    ],
  },
  INTIMATE: {
    code: 'INTIMATE',
    serviceCategory: 'BUKU_TAMU',
    name: 'Intimate',
    tagline: 'Resepsi intim terkelola',
    description:
      'Sudah termasuk Undangan Digital penuh, didampingi 1 petugas check-in di lokasi serta 1 set stand akrilik QRIS meja hingga 150 undangan.',
    includesUndanganDigital: true,
    baseCapacity: 150,
    includedPetugas: 1,
    includedSupervisor: 0,
    includesAkrilik: true,
    includesGladi: false,
    includesGoogleSheetLive: false,
    includesPostEventReport: false,
    features: [
      'Kapasitas hingga 150 undangan (1 undangan bisa untuk keluarga)',
      'Sudah termasuk Undangan Digital semua tema katalog',
      '1 petugas check-in di lokasi (24/hari)',
      'Termasuk 1 set stand akrilik QRIS meja',
      'Dashboard buku tamu real-time, RSVP & amplop digital',
    ],
  },
  SIGNATURE: {
    code: 'SIGNATURE',
    serviceCategory: 'BUKU_TAMU',
    name: 'Signature',
    tagline: 'Pilihan terpopuler resepsi menengah',
    description:
      'Sudah termasuk Undangan Digital penuh dengan 2 petugas check-in, sesi gladi H-1, stand akrilik QRIS, dan sinkronisasi Google Sheet live.',
    popular: true,
    includesUndanganDigital: true,
    baseCapacity: 300,
    includedPetugas: 2,
    includedSupervisor: 0,
    includesAkrilik: true,
    includesGladi: true,
    includesGoogleSheetLive: true,
    includesPostEventReport: false,
    features: [
      'Kapasitas hingga 300 undangan (1 undangan bisa untuk keluarga)',
      'Sudah termasuk Undangan Digital semua tema katalog',
      '2 petugas check-in di lokasi (24/hari)',
      'Termasuk 1 set stand akrilik QRIS meja & sesi gladi bersih H-1',
      'Sinkronisasi kehadiran buku tamu ke Google Sheet live',
    ],
  },
  MAJESTIC: {
    code: 'MAJESTIC',
    serviceCategory: 'BUKU_TAMU',
    name: 'Majestic',
    tagline: 'Resepsi besar dengan tim penuh',
    description:
      'Sudah termasuk Undangan Digital penuh, didukung 4 petugas check-in dan 1 supervisor lapangan, gladi H-1, Google Sheet live, serta laporan pasca-acara.',
    includesUndanganDigital: true,
    baseCapacity: 600,
    includedPetugas: 4,
    includedSupervisor: 1,
    includesAkrilik: true,
    includesGladi: true,
    includesGoogleSheetLive: true,
    includesPostEventReport: true,
    features: [
      'Kapasitas hingga 600 undangan (1 undangan bisa untuk keluarga)',
      'Sudah termasuk Undangan Digital semua tema katalog',
      '4 petugas check-in (24/hari) + 1 supervisor lapangan',
      'Termasuk 1 set stand akrilik QRIS meja & sesi gladi H-1',
      'Google Sheet live & laporan rekapitulasi kehadiran pasca-acara',
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

export interface CustomServiceUnitPrices {
  basePrice?: number;
  petugasUnit?: number;
  petugasExtraHour?: number;
  supervisor?: number;
  akrilik?: number;
  gladi?: number;
}

export interface CustomExtraLineItemInput {
  label: string;
  quantity: number;
  unitPrice: number;
}

export interface SuperAdminPricingOverride {
  customPackageName?: string;
  customMaxGuests?: number;
  extraPetugas?: number;
  extraHoursPerPetugas?: number;
  unitPrices?: CustomServiceUnitPrices;
  customLineItems?: CustomExtraLineItemInput[];
  entitlements?: {
    googleSheetLive?: boolean;
    postEventReport?: boolean;
    akrilikQris?: boolean;
    gladiH1?: boolean;
    supervisorCount?: 0 | 1;
  };
  originalPriceAmount?: number | null;
}

export interface OrderEntitlements {
  maxGuests: number;
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
  superAdminOverride?: SuperAdminPricingOverride | null;
}

export interface CalculateOrderPriceResult {
  packageCode: SelectablePackageCode;
  customPackageName?: string;
  priceTier: PriceTier;
  total: number;
  normalTotal: number;
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

export function getPackageOriginalPrice(packageCode: PresetPackageCode): number {
  return PACKAGE_PRICES.NORMAL[packageCode];
}

export function getPackageDisplayLabel(
  packageCode?: string | null,
  customPackageName?: string | null,
): string {
  if (typeof customPackageName === 'string' && customPackageName.trim()) {
    return customPackageName.trim();
  }
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

function resolveNonNegativeInt(
  value: unknown,
  fallback: number,
  fieldName: string,
): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid unit price for ${fieldName}`);
  }
  return Math.round(value);
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

  const sa = input.superAdminOverride ?? null;
  const maxPetugasLimit = sa ? 100 : 20;
  const maxHoursLimit = sa ? 24 : 8;

  const extraPetugas = clampInteger(
    sa?.extraPetugas !== undefined ? sa.extraPetugas : rawOptions.extraPetugas,
    0,
    maxPetugasLimit,
    'extraPetugas',
  );
  const rawExtraHours = clampInteger(
    sa?.extraHoursPerPetugas !== undefined
      ? sa.extraHoursPerPetugas
      : rawOptions.extraHoursPerPetugas,
    0,
    maxHoursLimit,
    'extraHoursPerPetugas',
  );
  const supervisor = normalizeSupervisor(rawOptions.supervisor);
  const akrilik = normalizeBoolean(rawOptions.akrilik, 'akrilik');
  const gladi = normalizeBoolean(rawOptions.gladi, 'gladi');

  const unitPetugas = resolveNonNegativeInt(
    sa?.unitPrices?.petugasUnit,
    PETUGAS_UNIT,
    'petugasUnit',
  );
  const unitExtraHour = resolveNonNegativeInt(
    sa?.unitPrices?.petugasExtraHour,
    PETUGAS_EXTRA_HOUR,
    'petugasExtraHour',
  );
  const unitSupervisor = resolveNonNegativeInt(
    sa?.unitPrices?.supervisor,
    SUPERVISOR,
    'supervisor',
  );
  const unitAkrilik = resolveNonNegativeInt(
    sa?.unitPrices?.akrilik,
    AKRILIK_QRIS,
    'akrilik',
  );
  const unitGladi = resolveNonNegativeInt(
    sa?.unitPrices?.gladi,
    GLADI_H1,
    'gladi',
  );

  const requestedCapacity =
    input.capacityTier !== undefined
      ? input.capacityTier
      : rawOptions.capacityTier;

  const hasCustomMaxGuests =
    sa?.customMaxGuests !== undefined && sa.customMaxGuests !== null;

  if (hasCustomMaxGuests) {
    if (
      typeof sa.customMaxGuests !== 'number' ||
      !Number.isFinite(sa.customMaxGuests) ||
      Math.trunc(sa.customMaxGuests) < 1
    ) {
      throw new Error('Invalid customMaxGuests for Super Admin override');
    }
  } else if (
    requestedCapacity !== undefined &&
    requestedCapacity !== null &&
    !isCapacityTier(requestedCapacity)
  ) {
    throw new Error(
      `Invalid capacityTier: "${String(requestedCapacity)}". Allowed tiers: ${CAPACITY_TIERS.join(', ')}`,
    );
  }

  const customPackageName =
    typeof sa?.customPackageName === 'string' && sa.customPackageName.trim()
      ? sa.customPackageName.trim()
      : undefined;

  const extraCustomLineItems: OrderPriceLineItem[] = [];
  if (Array.isArray(sa?.customLineItems)) {
    sa.customLineItems.forEach((item, idx) => {
      if (!item || typeof item !== 'object') return;
      const lbl = typeof item.label === 'string' ? item.label.trim() : '';
      if (!lbl) return;
      const qty = clampInteger(item.quantity ?? 1, 1, 1000, `customLineItems[${idx}].quantity`);
      const uPrice = resolveNonNegativeInt(
        item.unitPrice,
        0,
        `customLineItems[${idx}].unitPrice`,
      );
      extraCustomLineItems.push({
        code: `CUSTOM_ITEM_${idx + 1}`,
        label: lbl,
        quantity: qty,
        unitPrice: uPrice,
        amount: qty * uPrice,
      });
    });
  }

  const lineItems: OrderPriceLineItem[] = [];

  if (rawCode === 'CUSTOM') {
    const effectiveCapacityTier: CapacityTier = isCapacityTier(requestedCapacity)
      ? requestedCapacity
      : 50;
    const effectiveMaxGuests = hasCustomMaxGuests
      ? Math.trunc(sa!.customMaxGuests!)
      : effectiveCapacityTier;

    const defaultBaseAmount = CAPACITY_BASE_PRICES[effectiveCapacityTier];
    const baseAmount = resolveNonNegativeInt(
      sa?.unitPrices?.basePrice,
      defaultBaseAmount,
      'basePrice',
    );

    lineItems.push({
      code: `CUSTOM_BASE_${effectiveMaxGuests}`,
      label: `Dasar Undangan Digital (hingga ${effectiveMaxGuests} undangan — 1 undangan bisa untuk keluarga)`,
      quantity: 1,
      unitPrice: baseAmount,
      amount: baseAmount,
    });

    if (extraPetugas > 0) {
      const petugasAmount = extraPetugas * unitPetugas;
      lineItems.push({
        code: 'EXTRA_PETUGAS',
        label: `Petugas Check-in (${extraPetugas} orang × 24/hari)`,
        quantity: extraPetugas,
        unitPrice: unitPetugas,
        amount: petugasAmount,
      });
    }

    const effectiveExtraHours = extraPetugas > 0 ? rawExtraHours : 0;
    if (extraPetugas > 0 && effectiveExtraHours > 0) {
      const totalExtraHourUnits = extraPetugas * effectiveExtraHours;
      const extraHourAmount = totalExtraHourUnits * unitExtraHour;
      lineItems.push({
        code: 'PETUGAS_EXTRA_HOUR',
        label: `Tambahan Jam Petugas (${extraPetugas} orang × ${effectiveExtraHours} jam)`,
        quantity: totalExtraHourUnits,
        unitPrice: unitExtraHour,
        amount: extraHourAmount,
      });
    }

    const finalSupervisor: 0 | 1 =
      sa?.entitlements?.supervisorCount !== undefined
        ? sa.entitlements.supervisorCount
        : supervisor;

    if (finalSupervisor === 1) {
      lineItems.push({
        code: 'SUPERVISOR',
        label: 'Supervisor Lapangan',
        quantity: 1,
        unitPrice: unitSupervisor,
        amount: unitSupervisor,
      });
    }

    const finalAkrilik =
      sa?.entitlements?.akrilikQris !== undefined
        ? Boolean(sa.entitlements.akrilikQris)
        : akrilik;

    if (finalAkrilik) {
      lineItems.push({
        code: 'AKRILIK_QRIS',
        label: 'Stand Akrilik QRIS Meja (1 set)',
        quantity: 1,
        unitPrice: unitAkrilik,
        amount: unitAkrilik,
      });
    }

    const finalGladi =
      sa?.entitlements?.gladiH1 !== undefined
        ? Boolean(sa.entitlements.gladiH1)
        : gladi;

    if (finalGladi) {
      lineItems.push({
        code: 'GLADI_H1',
        label: 'Sesi Gladi Bersih H-1',
        quantity: 1,
        unitPrice: unitGladi,
        amount: unitGladi,
      });
    }

    lineItems.push(...extraCustomLineItems);

    const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

    const standardNormalTotal =
      CAPACITY_NORMAL_PRICES[effectiveCapacityTier] +
      extraPetugas * PETUGAS_UNIT +
      (extraPetugas > 0 ? extraPetugas * effectiveExtraHours * PETUGAS_EXTRA_HOUR : 0) +
      (finalSupervisor === 1 ? SUPERVISOR : 0) +
      (finalAkrilik ? AKRILIK_QRIS : 0) +
      (finalGladi ? GLADI_H1 : 0) +
      extraCustomLineItems.reduce((s, i) => s + i.amount, 0);

    const normalTotal =
      typeof sa?.originalPriceAmount === 'number' &&
      Number.isFinite(sa.originalPriceAmount) &&
      sa.originalPriceAmount >= 0
        ? Math.round(sa.originalPriceAmount)
        : standardNormalTotal;

    return {
      packageCode: 'CUSTOM',
      ...(customPackageName ? { customPackageName } : {}),
      priceTier,
      total,
      normalTotal,
      lineItems,
      entitlements: {
        maxGuests: effectiveMaxGuests,
        petugasCount: extraPetugas,
        extraHoursPerPetugas: effectiveExtraHours,
        supervisorCount: finalSupervisor,
        akrilikQris: finalAkrilik,
        gladiH1: finalGladi,
        googleSheetLive: Boolean(sa?.entitlements?.googleSheetLive),
        postEventReport: Boolean(sa?.entitlements?.postEventReport),
      },
      normalizedOptions: {
        extraPetugas,
        extraHoursPerPetugas: effectiveExtraHours,
        supervisor: finalSupervisor,
        akrilik: finalAkrilik,
        gladi: finalGladi,
        capacityTier: effectiveCapacityTier,
      },
    };
  }

  // Preset packages: SACRED, INTIMATE, SIGNATURE, MAJESTIC
  const pkg = WEDDING_PACKAGE_CATALOG[rawCode];
  const defaultBasePackagePrice = PACKAGE_PRICES[priceTier][rawCode];
  const basePackagePrice = resolveNonNegativeInt(
    sa?.unitPrices?.basePrice,
    defaultBasePackagePrice,
    'basePrice',
  );

  lineItems.push({
    code: `PACKAGE_${rawCode}`,
    label: `Paket ${customPackageName ?? pkg.name} (hingga ${hasCustomMaxGuests ? Math.trunc(sa!.customMaxGuests!) : pkg.baseCapacity} undangan — 1 undangan bisa untuk keluarga)`,
    quantity: 1,
    unitPrice: basePackagePrice,
    amount: basePackagePrice,
  });

  // Capacity upgrade only applies if requestedCapacity > pkg.baseCapacity (never reduces base capacity or price)
  const effectiveCapacity: CapacityTier =
    isCapacityTier(requestedCapacity) && requestedCapacity > pkg.baseCapacity
      ? requestedCapacity
      : pkg.baseCapacity;
  const effectiveMaxGuests = hasCustomMaxGuests
    ? Math.trunc(sa!.customMaxGuests!)
    : effectiveCapacity;

  if (!hasCustomMaxGuests && effectiveCapacity > pkg.baseCapacity) {
    const upgradeAmount =
      CAPACITY_BASE_PRICES[effectiveCapacity] -
      CAPACITY_BASE_PRICES[pkg.baseCapacity];
    lineItems.push({
      code: 'CAPACITY_UPGRADE',
      label: `Upgrade Kapasitas Tamu (hingga ${effectiveCapacity} undangan — 1 undangan bisa untuk keluarga)`,
      quantity: 1,
      unitPrice: upgradeAmount,
      amount: upgradeAmount,
    });
  }

  if (extraPetugas > 0) {
    const petugasAmount = extraPetugas * unitPetugas;
    lineItems.push({
      code: 'EXTRA_PETUGAS',
      label: `Tambahan Petugas Check-in (${extraPetugas} orang × 24/hari)`,
      quantity: extraPetugas,
      unitPrice: unitPetugas,
      amount: petugasAmount,
    });
  }

  const totalPetugas = pkg.includedPetugas + extraPetugas;
  const effectiveExtraHours = totalPetugas > 0 ? rawExtraHours : 0;

  if (totalPetugas > 0 && effectiveExtraHours > 0) {
    const totalExtraHourUnits = totalPetugas * effectiveExtraHours;
    const extraHourAmount = totalExtraHourUnits * unitExtraHour;
    lineItems.push({
      code: 'PETUGAS_EXTRA_HOUR',
      label: `Tambahan Jam Petugas (${totalPetugas} orang × ${effectiveExtraHours} jam)`,
      quantity: totalExtraHourUnits,
      unitPrice: unitExtraHour,
      amount: extraHourAmount,
    });
  }

  const addSupervisor = pkg.includedSupervisor === 0 && supervisor === 1;
  if (addSupervisor) {
    lineItems.push({
      code: 'SUPERVISOR',
      label: 'Supervisor Lapangan',
      quantity: 1,
      unitPrice: unitSupervisor,
      amount: unitSupervisor,
    });
  }

  const addAkrilik = !pkg.includesAkrilik && akrilik;
  if (addAkrilik) {
    lineItems.push({
      code: 'AKRILIK_QRIS',
      label: 'Stand Akrilik QRIS Meja (1 set)',
      quantity: 1,
      unitPrice: unitAkrilik,
      amount: unitAkrilik,
    });
  }

  const addGladi = !pkg.includesGladi && gladi;
  if (addGladi) {
    lineItems.push({
      code: 'GLADI_H1',
      label: 'Sesi Gladi Bersih H-1',
      quantity: 1,
      unitPrice: unitGladi,
      amount: unitGladi,
    });
  }

  lineItems.push(...extraCustomLineItems);

  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const normalUpgrade =
    !hasCustomMaxGuests && effectiveCapacity > pkg.baseCapacity
      ? CAPACITY_NORMAL_PRICES[effectiveCapacity] -
        CAPACITY_NORMAL_PRICES[pkg.baseCapacity]
      : 0;

  const standardNormalTotal =
    PACKAGE_PRICES.NORMAL[rawCode] +
    normalUpgrade +
    extraPetugas * PETUGAS_UNIT +
    (totalPetugas > 0 ? totalPetugas * effectiveExtraHours * PETUGAS_EXTRA_HOUR : 0) +
    (addSupervisor ? SUPERVISOR : 0) +
    (addAkrilik ? AKRILIK_QRIS : 0) +
    (addGladi ? GLADI_H1 : 0) +
    extraCustomLineItems.reduce((s, i) => s + i.amount, 0);

  const normalTotal =
    typeof sa?.originalPriceAmount === 'number' &&
    Number.isFinite(sa.originalPriceAmount) &&
    sa.originalPriceAmount >= 0
      ? Math.round(sa.originalPriceAmount)
      : standardNormalTotal;

  return {
    packageCode: rawCode,
    ...(customPackageName ? { customPackageName } : {}),
    priceTier,
    total,
    normalTotal,
    lineItems,
    entitlements: {
      maxGuests: effectiveMaxGuests,
      petugasCount: totalPetugas,
      extraHoursPerPetugas: effectiveExtraHours,
      supervisorCount:
        sa?.entitlements?.supervisorCount !== undefined
          ? sa.entitlements.supervisorCount
          : pkg.includedSupervisor === 1 || supervisor === 1
            ? 1
            : 0,
      akrilikQris:
        sa?.entitlements?.akrilikQris !== undefined
          ? Boolean(sa.entitlements.akrilikQris)
          : pkg.includesAkrilik || akrilik,
      gladiH1:
        sa?.entitlements?.gladiH1 !== undefined
          ? Boolean(sa.entitlements.gladiH1)
          : pkg.includesGladi || gladi,
      googleSheetLive:
        sa?.entitlements?.googleSheetLive !== undefined
          ? Boolean(sa.entitlements.googleSheetLive)
          : pkg.includesGoogleSheetLive,
      postEventReport:
        sa?.entitlements?.postEventReport !== undefined
          ? Boolean(sa.entitlements.postEventReport)
          : pkg.includesPostEventReport,
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
