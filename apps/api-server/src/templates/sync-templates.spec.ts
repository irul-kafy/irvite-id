/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import {
  syncTemplateIdentities,
  APPROVED_TEMPLATE_SEEDS,
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

  it('includes CLASSIC_LETTER in approved seeds matching contract', () => {
    expect(APPROVED_TEMPLATE_SEEDS).toHaveLength(5);
    const classic = APPROVED_TEMPLATE_SEEDS.find(
      (s) => s.themeCode === 'CLASSIC_LETTER',
    );
    expect(classic).toBeDefined();
    expect(classic?.name).toBe('Classic Letter');
    expect(classic?.previewImageUrl).toBe(
      '/templates/classic-letter/thumbnail.webp',
    );
  });

  it('includes VELVET_LETTER in approved seeds matching contract', () => {
    const velvet = APPROVED_TEMPLATE_SEEDS.find(
      (s) => s.themeCode === 'VELVET_LETTER',
    );
    expect(velvet).toBeDefined();
    expect(velvet?.name).toBe('Velvet Letter');
    expect(velvet?.previewImageUrl).toBe(
      '/templates/velvet-letter/thumbnail.webp',
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
      if (where.themeCode === 'IVORY_GARDEN') {
        return Promise.resolve([
          { id: 'uuid-1', themeCode: 'IVORY_GARDEN', name: 'Ivory 1' },
          { id: 'uuid-2', themeCode: 'IVORY_GARDEN', name: 'Ivory 2' },
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
});
