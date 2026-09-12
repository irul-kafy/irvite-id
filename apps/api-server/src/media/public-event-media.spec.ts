/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, HttpStatus } from '@nestjs/common';
import { PublicMediaService } from './public-media.service';
import { PublicEventMediaController } from './public-event-media.controller';
import { MediaStorageService } from './media-storage.service';
import { PrismaService } from '../database/prisma.service';
import { PublicInvitationAccessService } from '../invitations/public-invitation-access.service';
import { Response } from 'express';
import { Readable } from 'stream';

describe('Public Event Media Security & Streaming', () => {
  let service: PublicMediaService;
  let controller: PublicEventMediaController;
  let prisma: PrismaService;
  let storage: MediaStorageService;

  const validMediaId = '11111111-2222-3333-4444-555555555555';
  const otherMediaId = '99999999-8888-7777-6666-555555555555';
  const validSlug = 'sarah-michael-wedding';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicEventMediaController],
      providers: [
        PublicMediaService,
        {
          provide: PrismaService,
          useValue: {
            event: { findUnique: jest.fn() },
            media: { findFirst: jest.fn() },
          },
        },
        {
          provide: MediaStorageService,
          useValue: {
            getFileStat: jest.fn(),
            createReadStream: jest.fn(),
          },
        },
        {
          provide: PublicInvitationAccessService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<PublicMediaService>(PublicMediaService);
    controller = module.get<PublicEventMediaController>(
      PublicEventMediaController,
    );
    prisma = module.get<PrismaService>(PrismaService);
    storage = module.get<MediaStorageService>(MediaStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PublicMediaService.resolvePublicEventMedia (Visibility & Isolation)', () => {
    it('published + active event media => accessible', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'evt-100',
        status: 'PUBLISHED',
        eventDate: futureDate,
      });
      (prisma.media.findFirst as jest.Mock).mockResolvedValue({
        url: 'media/gallery-photo.jpg',
      });

      const result = await service.resolvePublicEventMedia(
        validSlug,
        validMediaId,
      );
      expect(result).toEqual({
        key: 'media/gallery-photo.jpg',
        mimeType: 'image/jpeg',
      });
      expect(prisma.media.findFirst).toHaveBeenCalledWith({
        where: { id: validMediaId, eventId: 'evt-100' },
        select: { url: true },
      });
    });

    it('Draft event media => 404 / unavailable', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'evt-100',
        status: 'DRAFT',
        eventDate: futureDate,
      });

      await expect(
        service.resolvePublicEventMedia(validSlug, validMediaId),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.media.findFirst).not.toHaveBeenCalled();
    });

    it('expired event media (>= eventDate + 30 days) => unavailable', async () => {
      const expiredDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'evt-100',
        status: 'PUBLISHED',
        eventDate: expiredDate,
      });

      await expect(
        service.resolvePublicEventMedia(validSlug, validMediaId),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.media.findFirst).not.toHaveBeenCalled();
    });

    it('media belonging to different Event => unavailable (cross-event IDOR prevented)', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'evt-100',
        status: 'PUBLISHED',
        eventDate: futureDate,
      });
      // Media exists in DB but belongs to evt-200, so query with eventId: 'evt-100' returns null
      (prisma.media.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.resolvePublicEventMedia(validSlug, otherMediaId),
      ).rejects.toThrow(NotFoundException);
    });

    it('invalid mediaId UUID format => safe 404 failure without DB query', async () => {
      await expect(
        service.resolvePublicEventMedia(validSlug, 'not-a-uuid'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.event.findUnique).not.toHaveBeenCalled();
    });

    it('missing event => safe 404 failure', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.resolvePublicEventMedia('non-existent-slug', validMediaId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PublicEventMediaController (HEAD & Range Streaming)', () => {
    let mockRes: Partial<Response>;
    let headers: Record<string, string>;

    beforeEach(() => {
      headers = {};
      mockRes = {
        header: jest.fn((k: any, v?: any) => {
          headers[k] = v;
          return mockRes as Response;
        }),
        status: jest.fn(() => mockRes as Response),
        end: jest.fn(),
      };

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'evt-100',
        status: 'PUBLISHED',
        eventDate: futureDate,
      });
      (prisma.media.findFirst as jest.Mock).mockResolvedValue({
        url: 'media/test.mp4',
      });
      (storage.getFileStat as jest.Mock).mockResolvedValue({ size: 1000 });
    });

    it('GET full file streams with 200 OK', async () => {
      const mockStream = new Readable({ read() {} });
      mockStream.pipe = jest.fn();
      (storage.createReadStream as jest.Mock).mockReturnValue(mockStream);

      await controller.getMedia(
        validSlug,
        validMediaId,
        undefined as any,
        mockRes as Response,
      );

      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(headers['Content-Type']).toBe('video/mp4');
      expect(headers['Content-Length']).toBe('1000');
      expect(headers['Accept-Ranges']).toBe('bytes');
      expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
    });

    it('GET byte range returns 206 Partial Content', async () => {
      const mockStream = new Readable({ read() {} });
      mockStream.pipe = jest.fn();
      (storage.createReadStream as jest.Mock).mockReturnValue(mockStream);

      await controller.getMedia(
        validSlug,
        validMediaId,
        'bytes=0-499',
        mockRes as Response,
      );

      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.PARTIAL_CONTENT);
      expect(headers['Content-Range']).toBe('bytes 0-499/1000');
      expect(headers['Content-Length']).toBe('500');
      expect(storage.createReadStream).toHaveBeenCalledWith('media/test.mp4', {
        start: 0,
        end: 499,
      });
    });

    it('HEAD request ends without streaming body', async () => {
      await controller.headMedia(
        validSlug,
        validMediaId,
        undefined as any,
        mockRes as Response,
      );

      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(headers['Content-Length']).toBe('1000');
      expect(headers['Content-Type']).toBe('video/mp4');
      expect(mockRes.end).toHaveBeenCalled();
      expect(storage.createReadStream).not.toHaveBeenCalled();
    });

    it('HEAD with Range header calculates Content-Length without streaming', async () => {
      await controller.headMedia(
        validSlug,
        validMediaId,
        'bytes=100-199',
        mockRes as Response,
      );

      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.PARTIAL_CONTENT);
      expect(headers['Content-Range']).toBe('bytes 100-199/1000');
      expect(headers['Content-Length']).toBe('100');
      expect(mockRes.end).toHaveBeenCalled();
      expect(storage.createReadStream).not.toHaveBeenCalled();
    });

    it('unsatisfiable Range returns 416', async () => {
      await controller.getMedia(
        validSlug,
        validMediaId,
        'bytes=5000-6000',
        mockRes as Response,
      );

      expect(mockRes.status).toHaveBeenCalledWith(
        HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
      );
      expect(headers['Content-Range']).toBe('bytes */1000');
      expect(mockRes.end).toHaveBeenCalled();
    });
  });
});
