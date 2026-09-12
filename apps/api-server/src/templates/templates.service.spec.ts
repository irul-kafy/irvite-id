import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesService } from './templates.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException } from '@nestjs/common';

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
      const dto = { name: 'Test', themeCode: 'TEST', config: { color: 'red' } };

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
      mockPrismaService.template.findUnique.mockResolvedValue({ id: '2' });
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
    it('should return paginated templates safely', async () => {
      const mockData = [{ id: '1', name: 'T1' }];
      mockPrismaService.template.findMany.mockResolvedValue(mockData);
      mockPrismaService.template.count.mockResolvedValue(10);

      const result = await service.findAll({ page: 1, limit: 5 });

      expect(mockPrismaService.template.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual({
        data: mockData,
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
    it('should return template if found', async () => {
      const t = { id: '1', name: 'T1' };
      mockPrismaService.template.findUnique.mockResolvedValue(t);
      expect(await service.findOne('1')).toEqual(t);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue(null);
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });
});
