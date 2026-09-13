/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { PrismaService } from '../database/prisma.service';
import { MediaStorageService } from './media-storage.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Role, MediaType } from 'database';
import * as signatureModule from './media-signature';

jest.mock('./media-signature', () => ({
  detectSignature: jest.fn(),
}));

describe('MediaService - Media Slots', () => {
  let service: MediaService;
  let prisma: PrismaService;
  let storage: MediaStorageService;

  const validBuffer = Buffer.from('mock-image-bytes');
  const mockFile = {
    buffer: validBuffer,
    size: 1024,
  } as Express.Multer.File;

  beforeEach(async () => {
    (signatureModule.detectSignature as jest.Mock).mockReturnValue({
      extension: 'jpg',
      mime: 'image/jpeg',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: PrismaService,
          useValue: {
            event: {
              findFirst: jest.fn(),
            },
            media: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: MediaStorageService,
          useValue: {
            generateKey: jest.fn().mockReturnValue('media/test-key.jpg'),
            writeFile: jest.fn().mockResolvedValue(undefined),
            deleteFile: jest.fn().mockResolvedValue(undefined),
            getFileStat: jest.fn().mockResolvedValue({ size: 1024 }),
          },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    prisma = module.get<PrismaService>(PrismaService);
    storage = module.get<MediaStorageService>(MediaStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Slot validation and defaults on upload', () => {
    it('defaults slot to general when omitted', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        template: { themeCode: 'IVORY_GARDEN' },
      });
      (prisma.media.create as jest.Mock).mockResolvedValue({
        id: 'media-1',
        slot: 'general',
      });

      const res = (await service.create(
        'event-1',
        { type: MediaType.PHOTO },
        mockFile,
        'user-1',
        Role.ADMIN,
      )) as { slot: string };

      expect(prisma.media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slot: 'general',
          }),
        }),
      );
      expect(res.slot).toBe('general');
    });

    it('accepts valid declared kebab-case slot for IVORY_GARDEN (hero)', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        template: { themeCode: 'IVORY_GARDEN' },
      });
      (prisma.media.count as jest.Mock).mockResolvedValue(0);
      (prisma.media.create as jest.Mock).mockResolvedValue({
        id: 'media-1',
        slot: 'hero',
      });

      const res = await service.create(
        'event-1',
        { type: MediaType.PHOTO, slot: 'hero' },
        mockFile,
        'user-1',
        Role.ADMIN,
      );

      expect(prisma.media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slot: 'hero',
          }),
        }),
      );
      expect(res.slot).toBe('hero');
    });

    it('rejects slot with invalid syntax (uppercase, camelCase, special chars)', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        template: { themeCode: 'IVORY_GARDEN' },
      });

      // Uppercase rejected
      await expect(
        service.create(
          'event-1',
          { type: MediaType.PHOTO, slot: 'INVALID_UPPERCASE!' },
          mockFile,
          'user-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);

      // CamelCase rejected (canonical naming is strictly lowercase kebab-case ^[a-z][a-z0-9-]{0,49}$)
      await expect(
        service.create(
          'event-1',
          { type: MediaType.PHOTO, slot: 'heroPhoto' },
          mockFile,
          'user-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects undeclared slot for registered template', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        template: { themeCode: 'IVORY_GARDEN' },
      });

      await expect(
        service.create(
          'event-1',
          { type: MediaType.PHOTO, slot: 'unknown-slot' },
          mockFile,
          'user-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(
        "Slot 'unknown-slot' is not declared in template definition",
      );
    });

    it('rejects custom slot if event template has no registered definition', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        template: { themeCode: 'UNREGISTERED_THEME' },
      });

      await expect(
        service.create(
          'event-1',
          { type: MediaType.PHOTO, slot: 'custom-slot' },
          mockFile,
          'user-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow('Template does not support custom media slots');
    });

    it('allows general slot even if template is unregistered', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        template: { themeCode: 'UNREGISTERED_THEME' },
      });
      (prisma.media.create as jest.Mock).mockResolvedValue({
        id: 'media-1',
        slot: 'general',
      });

      const res = await service.create(
        'event-1',
        { type: MediaType.PHOTO, slot: 'general' },
        mockFile,
        'user-1',
        Role.ADMIN,
      );

      expect(res.slot).toBe('general');
    });
  });

  describe('Slot MediaType and Capacity limits on upload', () => {
    it('rejects media type mismatch for slot', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        template: { themeCode: 'IVORY_GARDEN' },
      });

      // hero is PHOTO, but dto passes AUDIO
      (signatureModule.detectSignature as jest.Mock).mockReturnValue({
        extension: 'mp3',
        mime: 'audio/mpeg',
      });

      await expect(
        service.create(
          'event-1',
          { type: MediaType.AUDIO, slot: 'hero' },
          mockFile,
          'user-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(
        "Media type 'AUDIO' does not match slot 'hero' type 'PHOTO'",
      );
    });

    it('rejects duplicate upload to single slot with 409 Conflict', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        template: { themeCode: 'IVORY_GARDEN' },
      });
      (prisma.media.count as jest.Mock).mockResolvedValue(1);

      await expect(
        service.create(
          'event-1',
          { type: MediaType.PHOTO, slot: 'hero' },
          mockFile,
          'user-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('enforces maxItems limit on multiple slots (gallery max 6)', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        template: { themeCode: 'IVORY_GARDEN' },
      });
      (prisma.media.count as jest.Mock).mockResolvedValue(6);

      await expect(
        service.create(
          'event-1',
          { type: MediaType.PHOTO, slot: 'gallery' },
          mockFile,
          'user-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow("Slot 'gallery' exceeds limit of 6 items");
    });
  });

  describe('Slot move and revalidation (PATCH /events/:eventId/media/:mediaId)', () => {
    it('allows moving media from general to valid template slot (gallery)', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        template: { themeCode: 'IVORY_GARDEN' },
      });
      (prisma.media.findFirst as jest.Mock).mockResolvedValue({
        id: 'media-1',
        slot: 'general',
        type: MediaType.PHOTO,
        url: 'media/test-photo.jpg',
      });
      (storage.getFileStat as jest.Mock).mockResolvedValue({ size: 1024 });
      (prisma.media.count as jest.Mock).mockResolvedValue(2);
      (prisma.media.update as jest.Mock).mockResolvedValue({
        id: 'media-1',
        slot: 'gallery',
        type: MediaType.PHOTO,
      });

      const res = await service.update(
        'event-1',
        'media-1',
        { slot: 'gallery' },
        'user-1',
        Role.ADMIN,
      );

      expect(prisma.media.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slot: 'gallery' }),
        }),
      );
      expect(res.slot).toBe('gallery');
    });

    it('rejects moving media to single slot that is already occupied with 409 Conflict', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        template: { themeCode: 'IVORY_GARDEN' },
      });
      (prisma.media.findFirst as jest.Mock).mockResolvedValue({
        id: 'media-1',
        slot: 'general',
        type: MediaType.PHOTO,
        url: 'media/test-photo.jpg',
      });
      (storage.getFileStat as jest.Mock).mockResolvedValue({ size: 1024 });
      // hero already has 1 media
      (prisma.media.count as jest.Mock).mockResolvedValue(1);

      await expect(
        service.update(
          'event-1',
          'media-1',
          { slot: 'hero' },
          'user-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects moving media to multiple slot that has reached maxItems', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        template: { themeCode: 'IVORY_GARDEN' },
      });
      (prisma.media.findFirst as jest.Mock).mockResolvedValue({
        id: 'media-1',
        slot: 'general',
        type: MediaType.PHOTO,
        url: 'media/test-photo.jpg',
      });
      (storage.getFileStat as jest.Mock).mockResolvedValue({ size: 1024 });
      // gallery already has 6 items
      (prisma.media.count as jest.Mock).mockResolvedValue(6);

      await expect(
        service.update(
          'event-1',
          'media-1',
          { slot: 'gallery' },
          'user-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow("Slot 'gallery' exceeds limit of 6 items");
    });

    it('rejects moving media when existing file exceeds target slot maxSizeBytes', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        template: { themeCode: 'IVORY_GARDEN' },
      });
      (prisma.media.findFirst as jest.Mock).mockResolvedValue({
        id: 'media-1',
        slot: 'general',
        type: MediaType.PHOTO,
        url: 'media/huge-photo.jpg',
      });
      // 6 MiB file, but hero slot allows max 5 MiB
      (storage.getFileStat as jest.Mock).mockResolvedValue({
        size: 6 * 1024 * 1024,
      });

      await expect(
        service.update(
          'event-1',
          'media-1',
          { slot: 'hero' },
          'user-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(/exceeds target slot maximum size/);
    });

    it('rejects moving media if media type does not match target slot', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'event-1',
        template: { themeCode: 'IVORY_GARDEN' },
      });
      (prisma.media.findFirst as jest.Mock).mockResolvedValue({
        id: 'media-1',
        slot: 'general',
        type: MediaType.AUDIO, // Audio file
        url: 'media/test-audio.mp3',
      });

      await expect(
        service.update(
          'event-1',
          'media-1',
          { slot: 'hero' }, // hero is PHOTO
          'user-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(
        "Media type 'AUDIO' does not match slot 'hero' type 'PHOTO'",
      );
    });
  });

  describe('Event isolation', () => {
    it('rejects upload when event is not accessible by current user', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(
          'inaccessible-event',
          { type: MediaType.PHOTO },
          mockFile,
          'user-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
