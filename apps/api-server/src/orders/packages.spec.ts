import {
  buildOrderPricingSnapshot,
  loadMasterPricingConfigFromPrisma,
  loadMasterPricingConfigWithSource,
} from './packages';
import { resetMasterPricingCacheForTests } from '../../test/test-utils';

describe('packages master pricing loader', () => {
  beforeEach(() => {
    resetMasterPricingCacheForTests();
  });

  it('strict=true throws error and logs clear warning when DB read fails', async () => {
    const warnings: string[] = [];
    const mockLogger = {
      warn: (msg: string) => warnings.push(msg),
    };

    const mockPrisma = {
      masterPricingConfig: {
        findFirst: jest
          .fn()
          .mockRejectedValue(new Error('Connection terminated unexpectedly')),
      },
      activityLog: {
        findFirst: jest
          .fn()
          .mockRejectedValue(new Error('Table activity_logs missing')),
      },
    };

    await expect(
      loadMasterPricingConfigFromPrisma(mockPrisma, {
        strict: true,
        logger: mockLogger,
      }),
    ).rejects.toThrow(/Gagal membaca konfigurasi harga master dari database/);

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain(
      '[MasterPricing] Gagal membaca konfigurasi dari tabel master_pricing_configs: Connection terminated unexpectedly',
    );
  });

  it('strict=false logs warning and falls back to default with source=default when DB fails', async () => {
    const warnings: string[] = [];
    const mockLogger = {
      warn: (msg: string) => warnings.push(msg),
    };

    const mockPrisma = {
      masterPricingConfig: {
        findFirst: jest
          .fn()
          .mockRejectedValue(new Error('DB read timeout')),
      },
    };

    const res = await loadMasterPricingConfigWithSource(mockPrisma, {
      strict: false,
      logger: mockLogger,
    });

    expect(res.source).toBe('default');
    expect(res.config).toBeDefined();
    expect(res.config.presetPackages).toBeDefined();
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('DB read timeout');
  });

  it('returns loaded config with source=database when masterPricingConfig has data', async () => {
    const mockConfig = {
      serviceRates: { petugasUnit: 90_000 },
    };
    const mockPrisma = {
      masterPricingConfig: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'mpc-123',
          version: 2,
          config: mockConfig,
          createdAt: new Date('2026-11-20T10:00:00Z'),
        }),
      },
    };

    const res = await loadMasterPricingConfigWithSource(mockPrisma);
    expect(res.source).toBe('database');
    expect(res.config.version).toBe(2);
    expect(res.config.serviceRates.petugasUnit).toBe(90_000);
  });

  it('falls back to legacy activityLog when masterPricingConfig is empty', async () => {
    const mockConfig = {
      serviceRates: { petugasUnit: 75_000 },
    };
    const mockPrisma = {
      masterPricingConfig: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      activityLog: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'log-1',
          metadata: mockConfig,
          createdAt: new Date('2026-11-15T10:00:00Z'),
        }),
      },
    };

    const res = await loadMasterPricingConfigWithSource(mockPrisma);
    expect(res.source).toBe('database');
    expect(res.config.serviceRates.petugasUnit).toBe(75_000);
  });

  it('serves from cache on subsequent reads when cache is fresh', async () => {
    const mockPrisma = {
      masterPricingConfig: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'mpc-1',
          version: 1,
          config: { serviceRates: { petugasUnit: 80_000 } },
        }),
      },
    };

    const first = await loadMasterPricingConfigWithSource(mockPrisma);
    expect(first.source).toBe('database');
    expect(mockPrisma.masterPricingConfig.findFirst).toHaveBeenCalledTimes(1);

    const second = await loadMasterPricingConfigWithSource(mockPrisma);
    expect(second.source).toBe('cache');
    expect(mockPrisma.masterPricingConfig.findFirst).toHaveBeenCalledTimes(1);
  });
});

describe('buildOrderPricingSnapshot pricingVersion resolution', () => {
  it('resolves pricingVersion from active MasterPricingConfig version for selectable packages', () => {
    const mockMasterConfig = {
      version: 5,
      serviceRates: {
        petugasUnit: 85_000,
        petugasExtraHour: 25_000,
        supervisor: 150_000,
        akrilik: 50_000,
        gladi: 100_000,
        capacityPrices: { 50: 199_000, 150: 249_000, 300: 299_000, 600: 349_000 },
        capacityNormalPrices: { 50: 299_000, 150: 349_000, 300: 399_000, 600: 449_000 },
      },
      presetPackages: {} as any,
      undanganShowcaseCards: [],
      customPresets: [],
    };

    const snap = buildOrderPricingSnapshot(
      'SACRED',
      { capacityTier: 150 },
      null,
      mockMasterConfig,
    );

    expect(snap.pricingVersion).toBe(5);
    expect(snap.packageCode).toBe('SACRED');
  });

  it('resolves pricingVersion from active MasterPricingConfig for UNSELECTED packages', () => {
    const mockMasterConfig = {
      version: 3,
      serviceRates: {} as any,
      presetPackages: {} as any,
      undanganShowcaseCards: [],
      customPresets: [],
    };

    const snap = buildOrderPricingSnapshot(
      'UNSELECTED',
      null,
      null,
      mockMasterConfig,
    );

    expect(snap.pricingVersion).toBe(3);
    expect(snap.packageCode).toBe('UNSELECTED');
  });

  it('falls back to pricingVersion 1 when masterConfig is null or omitted', () => {
    const snap = buildOrderPricingSnapshot('SACRED', { capacityTier: 50 });
    expect(snap.pricingVersion).toBe(1);
  });
});
