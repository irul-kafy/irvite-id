import {
  ACTIVE_PRICE_TIER,
  ALL_ORDER_PACKAGE_CODES,
  LEGACY_PACKAGE_CAPACITY,
  PACKAGE_PRICES,
  WEDDING_PACKAGE_CATALOG,
  calculateOrderPrice,
  createDefaultMasterPricingConfig,
  getPackageDisplayLabel,
  isOrderQrCheckInEnabled,
  isPresetPackageCode,
  isSelectablePackageCode,
  normalizeMasterPricingConfig,
  type MasterPricingConfig,
  type OrderEntitlements,
  type OrderPackageCode,
  type OrderPriceLineItem,
  type OrderPricingOptionsInput,
  type SuperAdminPricingOverride,
} from 'pricing';

export { isOrderQrCheckInEnabled };

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
  SEWA_SISTEM: {
    code: 'SEWA_SISTEM',
    name: WEDDING_PACKAGE_CATALOG.SEWA_SISTEM.name,
    priceAmount: PACKAGE_PRICES[ACTIVE_PRICE_TIER].SEWA_SISTEM,
    durationDays: 180,
    maxGuests: WEDDING_PACKAGE_CATALOG.SEWA_SISTEM.baseCapacity,
    maxStaff: 5, // Self-operated by family committee accounts
    description: WEDDING_PACKAGE_CATALOG.SEWA_SISTEM.description,
    features: WEDDING_PACKAGE_CATALOG.SEWA_SISTEM.features,
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

export const PRICING_MASTER_LOG_ACTION = 'PRICING_MASTER_CONFIG';
export const PRICING_MASTER_ENTITY_TYPE = 'PricingCatalog';
export const PRICING_MASTER_ENTITY_ID = 'MASTER_CONFIG_V1';

let inMemoryMasterPricingCache: {
  config: MasterPricingConfig;
  fetchedAt: number;
} | null = null;

export interface LoadMasterPricingOptions {
  strict?: boolean;
  bypassCache?: boolean;
  resetCache?: boolean;
  logger?: {
    warn: (message: string, ...args: unknown[]) => void;
    error?: (message: string, ...args: unknown[]) => void;
  };
}

export interface MasterPricingLoadResult {
  config: MasterPricingConfig;
  source: 'database' | 'cache' | 'default';
}

export type PrismaPricingReader = {
  masterPricingConfig?: {
    findFirst?: (args: unknown) => Promise<{
      id?: string;
      version?: number;
      config?: unknown;
      createdBy?: string | null;
      createdAt?: Date | string;
    } | null>;
  };
  activityLog?: {
    findFirst?: (args: unknown) => Promise<{
      metadata?: unknown;
      createdAt?: Date | string;
    } | null>;
  };
};

export async function loadMasterPricingConfigWithSource(
  prisma?: PrismaPricingReader,
  options?: LoadMasterPricingOptions,
): Promise<MasterPricingLoadResult> {
  if (options?.resetCache) {
    inMemoryMasterPricingCache = null;
  }
  const now = Date.now();
  const logger = options?.logger ?? console;

  if (
    !options?.bypassCache &&
    !options?.strict &&
    inMemoryMasterPricingCache &&
    now - inMemoryMasterPricingCache.fetchedAt < 5_000
  ) {
    return {
      config: inMemoryMasterPricingCache.config,
      source: 'cache',
    };
  }

  let dbReadError: Error | null = null;

  // 1. Primary storage: dedicated masterPricingConfig table
  if (prisma?.masterPricingConfig?.findFirst) {
    try {
      const latest = await prisma.masterPricingConfig.findFirst({
        orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
      });
      if (latest?.config) {
        const normalized = normalizeMasterPricingConfig(latest.config);
        const withTs: MasterPricingConfig = {
          ...normalized,
          ...(typeof latest.version === 'number'
            ? { version: latest.version }
            : {}),
          updatedAt:
            normalized.updatedAt ||
            (latest.createdAt instanceof Date
              ? latest.createdAt.toISOString()
              : typeof latest.createdAt === 'string'
                ? latest.createdAt
                : undefined),
        };
        inMemoryMasterPricingCache = { config: withTs, fetchedAt: now };
        return { config: withTs, source: 'database' };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn(
        `[MasterPricing] Gagal membaca konfigurasi dari tabel master_pricing_configs: ${errMsg}`,
      );
      dbReadError = err instanceof Error ? err : new Error(errMsg);
    }
  }

  // 2. Legacy fallback: activityLog
  if (prisma?.activityLog?.findFirst) {
    try {
      const latest = await prisma.activityLog.findFirst({
        where: {
          action: PRICING_MASTER_LOG_ACTION,
          entityType: PRICING_MASTER_ENTITY_TYPE,
          entityId: PRICING_MASTER_ENTITY_ID,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (latest?.metadata) {
        const normalized = normalizeMasterPricingConfig(latest.metadata);
        const withTs: MasterPricingConfig = {
          ...normalized,
          updatedAt:
            normalized.updatedAt ||
            (latest.createdAt instanceof Date
              ? latest.createdAt.toISOString()
              : typeof latest.createdAt === 'string'
                ? latest.createdAt
                : undefined),
        };
        inMemoryMasterPricingCache = { config: withTs, fetchedAt: now };
        return { config: withTs, source: 'database' };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn(
        `[MasterPricing] Gagal membaca konfigurasi harga legacy dari activity_logs: ${errMsg}`,
      );
      if (!dbReadError) {
        dbReadError = err instanceof Error ? err : new Error(errMsg);
      }
    }
  }

  // If reading threw an error and strict mode is requested, fail immediately
  if (dbReadError) {
    if (options?.strict) {
      throw new Error(
        `Gagal membaca konfigurasi harga master dari database: ${dbReadError.message}`,
      );
    }
  }

  // If strict mode is requested and neither database model is available
  if (
    options?.strict &&
    !prisma?.masterPricingConfig?.findFirst &&
    !prisma?.activityLog?.findFirst
  ) {
    throw new Error(
      'Gagal membaca konfigurasi harga master: model database tidak tersedia',
    );
  }

  // Fallback to cache if available, or default
  if (inMemoryMasterPricingCache?.config) {
    return { config: inMemoryMasterPricingCache.config, source: 'cache' };
  }

  return { config: createDefaultMasterPricingConfig(), source: 'default' };
}

export async function loadMasterPricingConfigFromPrisma(
  prisma?: PrismaPricingReader,
  options?: LoadMasterPricingOptions,
): Promise<MasterPricingConfig> {
  const result = await loadMasterPricingConfigWithSource(prisma, options);
  return result.config;
}

export async function saveMasterPricingConfigToPrisma(
  prisma:
    | {
        masterPricingConfig?: {
          findFirst?: (args: unknown) => Promise<{ version?: number } | null>;
          create: (args: unknown) => Promise<unknown>;
        };
        activityLog?: {
          create?: (args: unknown) => Promise<unknown>;
        };
      }
    | undefined,
  rawConfig: unknown,
  actor?: { userId?: string; id?: string; role?: unknown },
): Promise<MasterPricingConfig> {
  if (!prisma?.masterPricingConfig?.create) {
    throw new Error('Master pricing database model is unavailable');
  }

  const normalized = normalizeMasterPricingConfig(rawConfig);
  const saved: MasterPricingConfig = {
    ...normalized,
    updatedAt: new Date().toISOString(),
  };

  let nextVersion = 1;
  if (typeof prisma.masterPricingConfig.findFirst === 'function') {
    try {
      const latest = await prisma.masterPricingConfig.findFirst({
        orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
      });
      if (typeof latest?.version === 'number') {
        nextVersion = latest.version + 1;
      }
    } catch {
      nextVersion = 1;
    }
  }

  // Must throw if create fails - do NOT swallow error!
  await prisma.masterPricingConfig.create({
    data: {
      version: nextVersion,
      config: saved,
      createdBy: actor?.userId ?? actor?.id ?? null,
    },
  });

  inMemoryMasterPricingCache = {
    config: saved,
    fetchedAt: Date.now(),
  };

  // ActivityLog records ONLY an audit of the modification event
  if (prisma.activityLog?.create) {
    try {
      await prisma.activityLog.create({
        data: {
          actorUserId: actor?.userId ?? actor?.id ?? null,
          actorRole: actor?.role ?? 'SUPER_ADMIN',
          action: PRICING_MASTER_LOG_ACTION,
          entityType: PRICING_MASTER_ENTITY_TYPE,
          entityId: PRICING_MASTER_ENTITY_ID,
          metadata: {
            version: nextVersion,
            updatedAt: saved.updatedAt,
            actorId: actor?.userId ?? actor?.id ?? null,
            action: 'UPDATE_MASTER_PRICING',
          },
        },
      });
    } catch {
      // Audit log failures do not invalidate the successfully persisted pricing config
    }
  }

  return saved;
}

export function buildOrderPricingSnapshot(
  packageCode?: string | null,
  options?: OrderPricingOptionsInput | null,
  superAdminOverride?: SuperAdminPricingOverride | null,
  masterConfig?: MasterPricingConfig | null,
): {
  packageCode: PackageCode;
  priceAmount: number;
  pricingVersion: number;
  options: OrderOptionsSnapshot;
} {
  const resolvedPricingVersion =
    typeof masterConfig?.version === 'number' && masterConfig.version > 0
      ? masterConfig.version
      : 1;

  const normalized = (packageCode || '').trim().toUpperCase();
  if (!normalized || normalized === 'UNSELECTED') {
    return {
      packageCode: 'UNSELECTED',
      priceAmount: 0,
      pricingVersion: resolvedPricingVersion,
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
      masterConfig: masterConfig ?? undefined,
    });
    const resolvedOriginalPrice =
      superAdminOverride?.originalPriceAmount !== undefined
        ? superAdminOverride.originalPriceAmount
        : calculated.normalTotal;
    return {
      packageCode: calculated.packageCode,
      priceAmount: calculated.total,
      pricingVersion: resolvedPricingVersion,
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
    pricingVersion: resolvedPricingVersion,
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
