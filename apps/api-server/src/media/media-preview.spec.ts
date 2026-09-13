import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { PrismaService } from '../database/prisma.service';
import { MediaStorageService } from './media-storage.service';
import { NotFoundException } from '@nestjs/common';
import { Role, MediaType } from 'database';
import { Readable } from 'stream';

describe('MediaService - previewFile', () => {
  let service: MediaService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: PrismaService,
          useValue: {
            event: { findFirst: jest.fn() },
            media: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: MediaStorageService,
          useValue: {
            getFileStat: jest.fn().mockResolvedValue({ size: 1024 }),
            createReadStream: jest
              .fn()
              .mockReturnValue(Readable.from(['data'])),
          },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('allows owner ADMIN to preview their photo file', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: 'event-1' });
    (prisma.media.findFirst as jest.Mock).mockResolvedValue({
      id: 'media-1',
      eventId: 'event-1',
      url: 'uploads/photo.jpg',
      type: MediaType.PHOTO,
    });

    const streamable = await service.previewFile(
      'event-1',
      'media-1',
      'user-1',
      Role.ADMIN,
    );

    expect(streamable).toBeDefined();
    expect(streamable.getHeaders()).toEqual(
      expect.objectContaining({
        type: 'image/jpeg',
        disposition: 'inline',
        length: 1024,
      }),
    );
  });

  it('allows SUPER_ADMIN to preview any event media', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: 'event-1' });
    (prisma.media.findFirst as jest.Mock).mockResolvedValue({
      id: 'media-1',
      eventId: 'event-1',
      url: 'uploads/photo.png',
      type: MediaType.PHOTO,
    });

    const streamable = await service.previewFile(
      'event-1',
      'media-1',
      'superadmin-1',
      Role.SUPER_ADMIN,
    );

    expect(streamable).toBeDefined();
    expect(streamable.getHeaders()).toEqual(
      expect.objectContaining({
        type: 'image/png',
      }),
    );
  });

  it('rejects preview if event is not accessible by user', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.previewFile('event-1', 'media-1', 'user-2', Role.ADMIN),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects preview if mediaId belongs to a different event', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: 'event-1' });
    (prisma.media.findFirst as jest.Mock).mockResolvedValue(null); // not found in event-1

    await expect(
      service.previewFile('event-1', 'media-999', 'user-1', Role.ADMIN),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects preview for non-image media types (e.g. VIDEO)', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: 'event-1' });
    (prisma.media.findFirst as jest.Mock).mockResolvedValue({
      id: 'media-1',
      eventId: 'event-1',
      url: 'uploads/video.mp4',
      type: MediaType.VIDEO,
    });

    await expect(
      service.previewFile('event-1', 'media-1', 'user-1', Role.ADMIN),
    ).rejects.toThrow('Image not found');
  });
});
