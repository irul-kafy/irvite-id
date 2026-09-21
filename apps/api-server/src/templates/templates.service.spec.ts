/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesService } from './templates.service';
import { PrismaService } from '../database/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from 'database';

jest.mock('./utils/config-validator');

describe('TemplatesService', () => {
  let service: TemplatesService;

  const mockPrismaService = {
    template: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    event: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new template with config', async () => {
      const dto = {
        name: 'Test',
        themeCode: 'TEST',
        config: { color: 'red' },
      } as any;

      const createdTemplate = {
        id: '1',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.template.create.mockResolvedValue(createdTemplate);

      const result = await service.create(dto);

      expect(mockPrismaService.template.create).toHaveBeenCalledWith({
        data: {
          name: 'Test',
          themeCode: 'TEST',
          config: { color: 'red' },
          previewImageUrl: undefined,
        },
      });
      expect(result).toEqual(createdTemplate);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if template to update does not exist', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update and return a template', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue({
        id: '2',
        _count: { events: 0 },
      });
      const updated = { id: '2', name: 'Updated' };
      mockPrismaService.template.update.mockResolvedValue(updated);

      const result = await service.update('2', { name: 'Updated' });

      expect(mockPrismaService.template.update).toHaveBeenCalledWith({
        where: { id: '2' },
        data: { name: 'Updated' },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('findAll', () => {
    it('should return paginated templates safely with eventUsageCount', async () => {
      const mockRaw = [
        { id: '1', name: 'T1', _count: { events: 3 } },
        { id: '2', name: 'T2', _count: null },
      ];
      mockPrismaService.template.findMany.mockResolvedValue(mockRaw);
      mockPrismaService.template.count.mockResolvedValue(10);

      const result = await service.findAll({ page: 1, limit: 5 });

      expect(mockPrismaService.template.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { events: true },
          },
        },
      });
      expect(result).toEqual({
        data: [
          { id: '1', name: 'T1', eventUsageCount: 3 },
          { id: '2', name: 'T2', eventUsageCount: 0 },
        ],
        meta: {
          total: 10,
          page: 1,
          limit: 5,
          lastPage: 2,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return template with eventUsageCount if found', async () => {
      const t = { id: '1', name: 'T1', _count: { events: 4 } };
      mockPrismaService.template.findUnique.mockResolvedValue(t);

      const result = await service.findOne('1');
      expect(mockPrismaService.template.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          _count: {
            select: { events: true },
          },
        },
      });
      expect(result).toEqual({ id: '1', name: 'T1', eventUsageCount: 4 });
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue(null);
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('permanentDelete', () => {
    const validDynamicUuid = '11111111-2222-3333-4444-555555555555';

    it('should throw NotFoundException if template does not exist', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue(null);

      await expect(service.permanentDelete(validDynamicUuid)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.template.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if template is built-in (IVORY_GARDEN), even if ARCHIVED', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue({
        id: validDynamicUuid,
        name: 'Ivory Garden',
        themeCode: 'IVORY_GARDEN',
        status: 'ARCHIVED',
      });

      await expect(service.permanentDelete(validDynamicUuid)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.permanentDelete(validDynamicUuid)).rejects.toThrow(
        /Built-in system templates cannot be permanently deleted/,
      );
      expect(mockPrismaService.template.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictException for all other built-in themeCodes', async () => {
      for (const themeCode of [
        'SERENE_GARDEN',
        'SUNDA_PUSPA',
        'CLASSIC_LETTER',
        'VELVET_LETTER',
      ]) {
        mockPrismaService.template.findUnique.mockResolvedValue({
          id: validDynamicUuid,
          name: themeCode,
          themeCode,
          status: 'ARCHIVED',
        });

        await expect(service.permanentDelete(validDynamicUuid)).rejects.toThrow(
          ConflictException,
        );
      }
      expect(mockPrismaService.template.delete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if dynamic template status is AVAILABLE', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue({
        id: validDynamicUuid,
        name: 'Custom Theme',
        themeCode: 'CUSTOM_THEME',
        status: 'AVAILABLE',
      });

      await expect(service.permanentDelete(validDynamicUuid)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.permanentDelete(validDynamicUuid)).rejects.toThrow(
        /Only archived templates can be permanently deleted/,
      );
      expect(mockPrismaService.template.delete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if dynamic template status is HIDDEN', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue({
        id: validDynamicUuid,
        name: 'Custom Theme',
        themeCode: 'CUSTOM_THEME',
        status: 'HIDDEN',
      });

      await expect(service.permanentDelete(validDynamicUuid)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.permanentDelete(validDynamicUuid)).rejects.toThrow(
        /Only archived templates can be permanently deleted/,
      );
      expect(mockPrismaService.template.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if dynamic archived template is referenced by 1 or more events', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue({
        id: validDynamicUuid,
        name: 'Custom Theme',
        themeCode: 'CUSTOM_THEME',
        status: 'ARCHIVED',
      });
      mockPrismaService.event.count.mockResolvedValue(2);

      await expect(service.permanentDelete(validDynamicUuid)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.permanentDelete(validDynamicUuid)).rejects.toThrow(
        /referenced by 2 event\(s\)/,
      );
      expect(mockPrismaService.event.count).toHaveBeenCalledWith({
        where: { templateId: validDynamicUuid },
      });
      expect(mockPrismaService.template.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if Prisma throws P2003 FK error during delete race condition', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue({
        id: validDynamicUuid,
        name: 'Custom Theme',
        themeCode: 'CUSTOM_THEME',
        status: 'ARCHIVED',
      });
      mockPrismaService.event.count.mockResolvedValue(0);

      const p2003Error = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed on the field: events_template_id_fkey',
        {
          code: 'P2003',
          clientVersion: '5.0.0',
        },
      );
      mockPrismaService.template.delete.mockRejectedValue(p2003Error);

      await expect(service.permanentDelete(validDynamicUuid)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.permanentDelete(validDynamicUuid)).rejects.toThrow(
        /referenced by one or more events/,
      );
    });

    it('should successfully permanently delete dynamic template with ARCHIVED status and 0 event usage', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue({
        id: validDynamicUuid,
        name: 'Custom Theme',
        themeCode: 'CUSTOM_THEME',
        status: 'ARCHIVED',
      });
      mockPrismaService.event.count.mockResolvedValue(0);
      mockPrismaService.template.delete.mockResolvedValue({
        id: validDynamicUuid,
        name: 'Custom Theme',
        themeCode: 'CUSTOM_THEME',
      });

      const result = await service.permanentDelete(validDynamicUuid);

      expect(mockPrismaService.template.findUnique).toHaveBeenCalledWith({
        where: { id: validDynamicUuid },
        select: {
          id: true,
          name: true,
          themeCode: true,
          status: true,
        },
      });
      expect(mockPrismaService.event.count).toHaveBeenCalledWith({
        where: { templateId: validDynamicUuid },
      });
      expect(mockPrismaService.template.delete).toHaveBeenCalledWith({
        where: { id: validDynamicUuid },
      });
      expect(result).toEqual({
        status: 'success',
        message: 'Template "Custom Theme" permanently deleted successfully',
        data: {
          id: validDynamicUuid,
          name: 'Custom Theme',
          themeCode: 'CUSTOM_THEME',
        },
      });
    });
  });

  describe('getDefinition', () => {
    it('should return safe metadata for template with registered definition', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue({
        id: 'tpl-ivory-uuid',
        themeCode: 'IVORY_GARDEN',
      });

      const result = await service.getDefinition('tpl-ivory-uuid');

      expect(result).toBeDefined();
      expect(result.templateId).toBe('tpl-ivory-uuid');
      expect(result.themeCode).toBe('IVORY_GARDEN');
      expect(result.schemaVersion).toBe(1);
      expect(Array.isArray(result.contentFields)).toBe(true);
      expect(Array.isArray(result.mediaSlots)).toBe(true);

      // Verify no executable functions or server internal paths
      const jsonStr = JSON.stringify(result);
      expect(jsonStr).not.toContain('function');
      expect(jsonStr).not.toContain('/storage');
      expect(jsonStr).not.toContain('\\storage');

      // Verify exact IVORY_GARDEN media definition slots and limits
      expect(result.mediaSlots).toHaveLength(3);
      expect(result.mediaSlots.map((s) => s.key)).toEqual([
        'hero',
        'gallery',
        'bg-music',
      ]);
      const heroSlot = result.mediaSlots.find((s) => s.key === 'hero');
      expect(heroSlot?.maxItems).toBe(1);
      expect(heroSlot?.mediaType).toBe('PHOTO');

      const gallerySlot = result.mediaSlots.find((s) => s.key === 'gallery');
      expect(gallerySlot?.maxItems).toBe(6);
      expect(gallerySlot?.multiple).toBe(true);
      expect(gallerySlot?.mediaType).toBe('PHOTO');

      const bgMusicSlot = result.mediaSlots.find((s) => s.key === 'bg-music');
      expect(bgMusicSlot?.maxItems).toBe(1);
      expect(bgMusicSlot?.mediaType).toBe('AUDIO');

      expect(
        result.mediaSlots.find((s) => s.key === 'bride-photo'),
      ).toBeUndefined();
      expect(
        result.mediaSlots.find((s) => s.key === 'groom-photo'),
      ).toBeUndefined();
    });

    it('should throw NotFoundException if template does not exist', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue(null);

      await expect(service.getDefinition('non-existent-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if template has unsupported/legacy themeCode', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue({
        id: 'tpl-legacy-uuid',
        themeCode: 'LEGACY_UNSUPPORTED_THEME',
      });

      await expect(service.getDefinition('tpl-legacy-uuid')).rejects.toThrow(
        /No structured definition found/,
      );
    });
  });

  describe('lifecycle status update & public availability', () => {
    it('should update template status to AVAILABLE, HIDDEN, or ARCHIVED', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue({
        id: 'tpl-1',
        status: 'AVAILABLE',
        _count: { events: 0 },
      });
      mockPrismaService.template.update.mockResolvedValue({
        id: 'tpl-1',
        status: 'HIDDEN',
      });

      const result = await service.update('tpl-1', { status: 'HIDDEN' });

      expect(mockPrismaService.template.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tpl-1' },

          data: expect.objectContaining({ status: 'HIDDEN' }),
        }),
      );
      expect(result.status).toBe('HIDDEN');
    });

    it('should return minimal public availability list with only themeCode and status', async () => {
      const mockList = [
        { themeCode: 'CLASSIC_LETTER', status: 'AVAILABLE' },
        { themeCode: 'IVORY_GARDEN', status: 'AVAILABLE' },
        { themeCode: 'SERENE_GARDEN', status: 'AVAILABLE' },
        { themeCode: 'SUNDA_PUSPA', status: 'AVAILABLE' },
        { themeCode: 'VELVET_LETTER', status: 'HIDDEN' },
      ];
      mockPrismaService.template.findMany.mockResolvedValue(mockList);

      const result = await service.getPublicAvailability();

      expect(mockPrismaService.template.findMany).toHaveBeenCalledWith({
        select: {
          themeCode: true,
          status: true,
        },
        orderBy: { themeCode: 'asc' },
      });
      expect(result).toEqual(mockList);
    });

    it('should still return definition for HIDDEN or ARCHIVED templates', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue({
        id: 'tpl-hidden-uuid',
        themeCode: 'VELVET_LETTER',
      });

      const result = await service.getDefinition('tpl-hidden-uuid');

      expect(result).toBeDefined();
      expect(result.themeCode).toBe('VELVET_LETTER');
    });
  });
});
