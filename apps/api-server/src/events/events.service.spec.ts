/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Role, Prisma } from 'database';

describe('EventsService', () => {
  let service: EventsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: PrismaService,
          useValue: {
            event: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            template: {
              findUnique: jest.fn(),
            },
            media: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an event with userId forced from context', async () => {
      (prisma.event.create as jest.Mock).mockResolvedValue({ id: 'event-1' });

      const dto = {
        title: 'Test Event',
        slug: 'test',
        eventDate: '2026-10-10',
      };
      const res = await service.create('user-1', dto);

      expect(prisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            title: 'Test Event',
          }),
        }),
      );
      expect(res.id).toBe('event-1');
    });

    it('should throw ConflictException on duplicate slug', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: '5',
      });
      (prisma.event.create as jest.Mock).mockRejectedValue(p2002);

      await expect(
        service.create('user-1', {
          title: 'Test',
          slug: 'test',
          eventDate: '2026',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if template does not exist', async () => {
      (prisma.template.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          title: 'Test',
          slug: 'test',
          eventDate: '2026',
          templateId: 'temp-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should scope query for ADMIN', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
      });

      await service.findOne('event-1', 'admin-1', Role.ADMIN);

      expect(prisma.event.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'event-1', userId: 'admin-1' },
        }),
      );
    });

    it('should NOT scope query for SUPER_ADMIN', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
      });

      await service.findOne('event-1', 'admin-1', Role.SUPER_ADMIN);

      expect(prisma.event.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'event-1' },
        }),
      );
    });
  });

  describe('resolvePublic', () => {
    it('should throw NotFoundException for empty or blank slug', async () => {
      await expect(service.resolvePublic('')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if event not found', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.resolvePublic('unknown-slug')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if event is DRAFT', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event-1',
        title: 'Draft Event',
        status: 'DRAFT',
        eventDate: new Date(),
      });

      await expect(service.resolvePublic('draft-slug')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if event is expired (>30 days)', async () => {
      const expiredDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event-1',
        title: 'Expired Event',
        status: 'PUBLISHED',
        eventDate: expiredDate,
      });

      await expect(service.resolvePublic('expired-slug')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return sanitized event and template payload when published', async () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event-1',
        title: 'Sarah & Michael',
        description: 'Wedding celebration',
        eventDate: futureDate,
        locationDetails: 'Grand Ballroom',
        slug: 'sarah-michael-2026',
        status: 'PUBLISHED',
        template: {
          themeCode: 'VERDANT',
          config: { version: 1 },
        },
      });

      (prisma.media.findMany as jest.Mock).mockResolvedValue([
        { id: 'media-1', type: 'PHOTO', order: 1 },
      ]);

      const res = await service.resolvePublic('sarah-michael-2026');

      expect(res.event.title).toBe('Sarah & Michael');
      expect(res.event.slug).toBe('sarah-michael-2026');
      expect(res.template?.themeCode).toBe('VERDANT');
      expect(res.media).toHaveLength(1);
      expect(res.media[0].src).toBe(
        '/events/public/sarah-michael-2026/media/media-1',
      );
    });
  });
});
