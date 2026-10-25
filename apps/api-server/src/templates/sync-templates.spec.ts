/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import {
  syncTemplateIdentities,
  APPROVED_TEMPLATE_SEEDS,
  isBuiltInTemplate,
  BUILT_IN_THEME_CODES,
} from './sync-templates';
import type { PrismaClient } from 'database';

describe('syncTemplateIdentities', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      template: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({
            id: `mock-id-${data.themeCode}`,
            ...data,
          }),
        ),
        update: jest.fn().mockImplementation(({ where, data }: any) =>
          Promise.resolve({
            id: where.id,
            ...data,
          }),
        ),
      },
    };
  });

  it('includes SEKAR_KEDATON in approved seeds matching contract', () => {
    expect(APPROVED_TEMPLATE_SEEDS).toHaveLength(4);
    const sekar = APPROVED_TEMPLATE_SEEDS.find(
      (s) => s.themeCode === 'SEKAR_KEDATON',
    );
    expect(sekar).toBeDefined();
    expect(sekar?.name).toBe('Sekar Kedaton');
    expect(sekar?.previewImageUrl).toBe(
      '/templates/sekar-kedaton/thumbnail.webp',
    );
  });

  it('includes AETHERIA in approved seeds matching contract', () => {
    const aet = APPROVED_TEMPLATE_SEEDS.find(
      (s) => s.themeCode === 'AETHERIA',
    );
    expect(aet).toBeDefined();
    expect(aet?.name).toBe('Aetheria');
    expect(aet?.previewImageUrl).toBe(
      '/templates/aetheria/thumbnail.webp',
    );
  });

  it('includes OPALINE_NOCTURNE in approved seeds matching contract', () => {
    const opn = APPROVED_TEMPLATE_SEEDS.find(
      (s) => s.themeCode === 'OPALINE_NOCTURNE',
    );
    expect(opn).toBeDefined();
    expect(opn?.name).toBe('Opaline Nocturne');
    expect(opn?.previewImageUrl).toBe(
      '/templates/opaline-nocturne/thumbnail.webp',
    );
  });

  it('includes RANAH_CINTA in approved seeds matching contract', () => {
    const rnc = APPROVED_TEMPLATE_SEEDS.find(
      (s) => s.themeCode === 'RANAH_CINTA',
    );
    expect(rnc).toBeDefined();
    expect(rnc?.name).toBe('Ranah Cinta');
    expect(rnc?.previewImageUrl).toBe(
      '/templates/ranah-cinta/thumbnail.webp',
    );
  });

  it('creates Template records when 0 matching records exist', async () => {
    mockPrisma.template.findMany.mockResolvedValue([]);

    const results = await syncTemplateIdentities(mockPrisma);

    expect(results).toHaveLength(APPROVED_TEMPLATE_SEEDS.length);
    for (const r of results) {
      expect(r.action).toBe('CREATED');
      expect(r.templateId).toBeDefined();
    }
    expect(mockPrisma.template.create).toHaveBeenCalledTimes(
      APPROVED_TEMPLATE_SEEDS.length,
    );
    expect(mockPrisma.template.update).not.toHaveBeenCalled();
  });

  it('updates Template records when 1 matching record exists with outdated data', async () => {
    mockPrisma.template.findMany.mockImplementation(({ where }: any) => {
      return Promise.resolve([
        {
          id: `id-${where.themeCode}`,
          themeCode: where.themeCode,
          name: 'Old Outdated Name',
          previewImageUrl: '/old-image.png',
        },
      ]);
    });

    const results = await syncTemplateIdentities(mockPrisma);

    expect(results).toHaveLength(APPROVED_TEMPLATE_SEEDS.length);
    for (const r of results) {
      expect(r.action).toBe('UPDATED');
    }
    expect(mockPrisma.template.update).toHaveBeenCalledTimes(
      APPROVED_TEMPLATE_SEEDS.length,
    );
    expect(mockPrisma.template.create).not.toHaveBeenCalled();
  });

  it('leaves Template records UNCHANGED when 1 matching record already matches approved seed', async () => {
    mockPrisma.template.findMany.mockImplementation(({ where }: any) => {
      const seed = APPROVED_TEMPLATE_SEEDS.find(
        (s) => s.themeCode === where.themeCode,
      );
      return Promise.resolve([
        {
          id: `id-${where.themeCode}`,
          themeCode: where.themeCode,
          name: seed?.name,
          previewImageUrl: seed?.previewImageUrl,
        },
      ]);
    });

    const results = await syncTemplateIdentities(mockPrisma);

    expect(results).toHaveLength(APPROVED_TEMPLATE_SEEDS.length);
    for (const r of results) {
      expect(r.action).toBe('UNCHANGED');
    }
    expect(mockPrisma.template.create).not.toHaveBeenCalled();
    expect(mockPrisma.template.update).not.toHaveBeenCalled();
  });

  it('FAILS CLOSED when duplicate records (>1) exist for a themeCode', async () => {
    mockPrisma.template.findMany.mockImplementation(({ where }: any) => {
      if (where.themeCode === 'SEKAR_KEDATON') {
        return Promise.resolve([
          { id: 'uuid-1', themeCode: 'SEKAR_KEDATON', name: 'Sekar 1' },
          { id: 'uuid-2', themeCode: 'SEKAR_KEDATON', name: 'Sekar 2' },
        ]);
      }
      return Promise.resolve([]);
    });

    await expect(
      syncTemplateIdentities(mockPrisma as unknown as PrismaClient),
    ).rejects.toThrow(/FAIL CLOSED: Multiple Template records/);

    expect(mockPrisma.template.create).not.toHaveBeenCalled();
    expect(mockPrisma.template.update).not.toHaveBeenCalled();
  });

  it('does not perform any DB writes when dryRun is true', async () => {
    mockPrisma.template.findMany.mockResolvedValue([]);

    const results = await syncTemplateIdentities(mockPrisma, {
      dryRun: true,
    });

    expect(results).toHaveLength(APPROVED_TEMPLATE_SEEDS.length);
    for (const r of results) {
      expect(r.action).toBe('DRY_RUN_CREATE');
    }
    expect(mockPrisma.template.create).not.toHaveBeenCalled();
    expect(mockPrisma.template.update).not.toHaveBeenCalled();
  });
  it('assigns initialStatus AVAILABLE when creating records for approved seeds', async () => {
    mockPrisma.template.findMany.mockResolvedValue([]);

    await syncTemplateIdentities(mockPrisma);

    expect(mockPrisma.template.create).toHaveBeenCalledTimes(
      APPROVED_TEMPLATE_SEEDS.length,
    );
    for (const call of mockPrisma.template.create.mock.calls) {
      expect(call[0].data.status).toBe('AVAILABLE');
    }
  });

  it('preserves existing DB status (AVAILABLE, HIDDEN, ARCHIVED) without resetting', async () => {
    mockPrisma.template.findMany.mockImplementation(({ where }: any) => {
      let status = 'AVAILABLE';
      if (where.themeCode === 'VELVET_LETTER') status = 'HIDDEN';
      if (where.themeCode === 'CLASSIC_LETTER') status = 'ARCHIVED';

      return Promise.resolve([
        {
          id: 'id-' + where.themeCode,
          themeCode: where.themeCode,
          name: 'Old Outdated Name',
          previewImageUrl: '/old-image.png',
          status,
        },
      ]);
    });

    const results = await syncTemplateIdentities(mockPrisma);

    expect(results).toHaveLength(APPROVED_TEMPLATE_SEEDS.length);
    expect(mockPrisma.template.update).toHaveBeenCalledTimes(
      APPROVED_TEMPLATE_SEEDS.length,
    );
    for (const call of mockPrisma.template.update.mock.calls) {
      expect(call[0].data.status).toBeUndefined();
    }
    expect(mockPrisma.template.create).not.toHaveBeenCalled();
  });
  describe('isBuiltInTemplate & BUILT_IN_THEME_CODES', () => {
    it('contains all 4 approved codex theme codes', () => {
      expect(BUILT_IN_THEME_CODES.size).toBe(4);
      expect(BUILT_IN_THEME_CODES.has('SEKAR_KEDATON')).toBe(true);
      expect(BUILT_IN_THEME_CODES.has('AETHERIA')).toBe(true);
      expect(BUILT_IN_THEME_CODES.has('OPALINE_NOCTURNE')).toBe(true);
      expect(BUILT_IN_THEME_CODES.has('RANAH_CINTA')).toBe(true);
      expect(BUILT_IN_THEME_CODES.has('SERENE_GARDEN')).toBe(false);
      expect(BUILT_IN_THEME_CODES.has('VELVET_LETTER')).toBe(false);
      expect(BUILT_IN_THEME_CODES.has('CHINESE_TRADITIONAL_LUXURY')).toBe(false);
      expect(BUILT_IN_THEME_CODES.has('JARDIN_DE_VELOURS')).toBe(false);
      expect(BUILT_IN_THEME_CODES.has('SYMPHONY_OF_US')).toBe(false);
      expect(BUILT_IN_THEME_CODES.has('IVORY_GARDEN')).toBe(false);
      expect(BUILT_IN_THEME_CODES.has('SUNDA_PUSPA')).toBe(false);
      expect(BUILT_IN_THEME_CODES.has('CLASSIC_LETTER')).toBe(false);
    });

    it('returns true for all approved built-in themeCodes case-insensitively', () => {
      expect(isBuiltInTemplate('SEKAR_KEDATON')).toBe(true);
      expect(isBuiltInTemplate(' Sekar_Kedaton ')).toBe(true);
      expect(isBuiltInTemplate('aetheria')).toBe(true);
      expect(isBuiltInTemplate('opaline_nocturne')).toBe(true);
      expect(isBuiltInTemplate('ranah_cinta')).toBe(true);
      expect(isBuiltInTemplate('serene_garden')).toBe(false);
      expect(isBuiltInTemplate('velvet_letter')).toBe(false);
      expect(isBuiltInTemplate('chinese_traditional_luxury')).toBe(false);
      expect(isBuiltInTemplate('jardin_de_velours')).toBe(false);
      expect(isBuiltInTemplate('symphony_of_us')).toBe(false);
      expect(isBuiltInTemplate('ivory_garden')).toBe(false);
      expect(isBuiltInTemplate('sunda_puspa')).toBe(false);
      expect(isBuiltInTemplate('classic_letter')).toBe(false);
    });

    it('returns false for dynamic/custom or missing themeCodes', () => {
      expect(isBuiltInTemplate('CUSTOM_THEME')).toBe(false);
      expect(isBuiltInTemplate('RANDOM_CODE')).toBe(false);
      expect(isBuiltInTemplate(null)).toBe(false);
      expect(isBuiltInTemplate(undefined)).toBe(false);
      expect(isBuiltInTemplate('')).toBe(false);
    });
  });
});
