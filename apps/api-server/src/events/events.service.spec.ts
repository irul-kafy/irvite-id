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
              count: jest.fn(),
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

  describe('update - template switching', () => {
    it('allows changing template on DRAFT event with empty content and no template-specific media', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        status: 'DRAFT',
        templateId: 'tpl-old',
        content: null,
      });
      (prisma.media.count as jest.Mock).mockResolvedValue(0); // no template-specific media
      (prisma.template.findUnique as jest.Mock).mockResolvedValue({
        id: 'tpl-new',
        themeCode: 'IVORY_GARDEN',
      });
      (prisma.event.update as jest.Mock).mockResolvedValue({
        id: 'event-1',
        templateId: 'tpl-new',
      });

      const res = await service.update('event-1', 'admin-1', Role.ADMIN, {
        templateId: 'tpl-new',
      });

      expect(res.templateId).toBe('tpl-new');
      expect(prisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            templateId: 'tpl-new',
          }),
        }),
      );
    });

    it('allows changing template when general legacy media exists (does not corrupt change logic)', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        status: 'DRAFT',
        templateId: 'tpl-old',
        content: null,
      });
      // Slot != 'general' count is 0, even if general media exists
      (prisma.media.count as jest.Mock).mockResolvedValue(0);
      (prisma.template.findUnique as jest.Mock).mockResolvedValue({
        id: 'tpl-new',
        themeCode: 'IVORY_GARDEN',
      });
      (prisma.event.update as jest.Mock).mockResolvedValue({
        id: 'event-1',
        templateId: 'tpl-new',
      });

      const res = await service.update('event-1', 'admin-1', Role.ADMIN, {
        templateId: 'tpl-new',
      });

      expect(res.templateId).toBe('tpl-new');
    });

    it('rejects changing template on PUBLISHED event with 409 Conflict', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        status: 'PUBLISHED',
        templateId: 'tpl-old',
        content: null,
      });

      await expect(
        service.update('event-1', 'admin-1', Role.ADMIN, {
          templateId: 'tpl-new',
        }),
      ).rejects.toThrow('Cannot change template on a published event');
    });

    it('rejects changing template on DRAFT event with non-empty content with 409 Conflict', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        status: 'DRAFT',
        templateId: 'tpl-old',
        content: { partnerOneName: 'Aditya' },
      });

      await expect(
        service.update('event-1', 'admin-1', Role.ADMIN, {
          templateId: 'tpl-new',
        }),
      ).rejects.toThrow('Clear event content before changing template');
    });

    it('rejects changing template on DRAFT event with template-specific media with 409 Conflict', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        status: 'DRAFT',
        templateId: 'tpl-old',
        content: null,
      });
      // slot: { not: 'general' } count is > 0
      (prisma.media.count as jest.Mock).mockResolvedValue(2);

      await expect(
        service.update('event-1', 'admin-1', Role.ADMIN, {
          templateId: 'tpl-new',
        }),
      ).rejects.toThrow(
        'Remove template-specific media before changing template',
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

    it('should return sanitized event, content, template, and slot-aware medias', async () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event-1',
        title: 'Sarah & Michael',
        description: 'Wedding celebration',
        eventDate: futureDate,
        locationDetails: 'Grand Ballroom',
        content: {
          partnerOneName: 'Sarah',
          partnerTwoName: 'Michael',
          _schemaVersion: 1,
        },
        slug: 'sarah-michael-2026',
        status: 'PUBLISHED',
        template: {
          themeCode: 'IVORY_GARDEN',
          config: { version: 1 },
        },
      });

      (prisma.media.findMany as jest.Mock).mockResolvedValue([
        { id: 'media-1', type: 'PHOTO', slot: 'hero', order: 0 },
        { id: 'media-2', type: 'PHOTO', slot: 'gallery', order: 0 },
      ]);

      const res = await service.resolvePublic('sarah-michael-2026');

      expect(res.event.title).toBe('Sarah & Michael');
      expect(res.event.slug).toBe('sarah-michael-2026');
      expect(res.event.content).toEqual(
        expect.objectContaining({
          partnerOneName: 'Sarah',
          partnerTwoName: 'Michael',
          _schemaVersion: 1,
        }),
      );
      expect(res.template?.themeCode).toBe('IVORY_GARDEN');
      expect(res.media).toHaveLength(2);
      expect(res.media[0]).toEqual({
        id: 'media-1',
        type: 'PHOTO',
        slot: 'hero',
        order: 0,
        src: '/events/public/sarah-michael-2026/media/media-1',
      });
      expect(res.mediaBySlot).toBeDefined();
      expect(res.mediaBySlot.hero).toHaveLength(1);
      expect(res.mediaBySlot.gallery).toHaveLength(1);
    });

    it('should fail closed (content null) when persisted content is malformed', async () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event-1',
        title: 'Corrupted Event',
        status: 'PUBLISHED',
        eventDate: futureDate,
        slug: 'corrupted-event',
        content: {
          malformedUndeclaredField: 'danger',
          __proto__: { bad: true },
        },
        template: { themeCode: 'IVORY_GARDEN', config: {} },
      });
      (prisma.media.findMany as jest.Mock).mockResolvedValue([]);

      const res = await service.resolvePublic('corrupted-event');
      expect(res.event.content).toBeNull();
    });

    it('should project giftAccounts with string account numbers preserving leading zeros', async () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event-1',
        title: 'Sarah & Michael',
        status: 'PUBLISHED',
        eventDate: futureDate,
        slug: 'sarah-michael-2026',
        content: {
          partnerOneName: 'Sarah',
          partnerTwoName: 'Michael',
          giftAccounts: [
            {
              bankName: 'BCA',
              accountNumber: '001234567890',
              accountHolderName: 'Sarah Jenkins',
            },
          ],
          _schemaVersion: 1,
        },
        template: { themeCode: 'IVORY_GARDEN', config: {} },
      });
      (prisma.media.findMany as jest.Mock).mockResolvedValue([]);

      const res = await service.resolvePublic('sarah-michael-2026');
      expect(res.event.content).toBeDefined();
      const accounts = (
        res.event.content as { giftAccounts: Array<{ accountNumber: string }> }
      ).giftAccounts;
      expect(accounts[0].accountNumber).toBe('001234567890');
      expect(typeof accounts[0].accountNumber).toBe('string');
    });
  });
});
