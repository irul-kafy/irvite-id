/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { PrismaService } from '../database/prisma.service';
import { MediaStorageService } from './media-storage.service';
import {
  NotFoundException,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Role, MediaType } from 'database';
import * as signatureModule from './media-signature';
import { Readable } from 'stream';

jest.mock('./media-signature', () => ({
  detectSignature: jest.fn(),
}));

describe('MediaService', () => {
  let service: MediaService;
  let prisma: PrismaService;
  let storage: MediaStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: PrismaService,
          useValue: {
            event: { findFirst: jest.fn() },
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
            writeFile: jest.fn(),
            deleteFile: jest.fn(),
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

  it('ADMIN owned Event allowed', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: 'evt1' });
    await expect(
      service.findAll('evt1', {}, 'usr1', Role.ADMIN),
    ).resolves.toBeDefined();
    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'evt1', userId: 'usr1' },
      }),
    );
  });

  it('cross ADMIN rejected', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      service.findAll('evt1', {}, 'usr1', Role.ADMIN),
    ).rejects.toThrow(NotFoundException);
  });

  it('SUPER_ADMIN Event allowed', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: 'evt1' });
    await expect(
      service.findAll('evt1', {}, 'usr1', Role.SUPER_ADMIN),
    ).resolves.toBeDefined();
    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'evt1' }, // No userId restriction
      }),
    );
  });

  it('wrong-parent Media rejected', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: 'evt1' });
    (prisma.media.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      service.findOne('evt1', 'med1', 'usr1', Role.ADMIN),
    ).rejects.toThrow(NotFoundException);
  });

  describe('Create Validation', () => {
    const fileBase = {
      buffer: Buffer.from('test'),
      size: 100,
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      stream: null as unknown as Readable,
      destination: '',
      filename: '',
      path: '',
    };

    beforeEach(() => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: 'evt1' });
    });

    it('valid content accepted', async () => {
      (signatureModule.detectSignature as jest.Mock).mockReturnValue({
        extension: 'jpg',
        mime: 'image/jpeg',
      });
      (prisma.media.create as jest.Mock).mockResolvedValue({ id: 'm1' });

      const res = await service.create(
        'evt1',
        { type: MediaType.PHOTO },
        fileBase,
        'usr1',
        Role.ADMIN,
      );
      expect(res.id).toBe('m1');
    });

    it('invalid signature rejected', async () => {
      (signatureModule.detectSignature as jest.Mock).mockReturnValue(undefined);
      await expect(
        service.create(
          'evt1',
          { type: MediaType.PHOTO },
          fileBase,
          'usr1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('type/content mismatch rejected', async () => {
      (signatureModule.detectSignature as jest.Mock).mockReturnValue({
        extension: 'mp3',
        mime: 'audio/mpeg',
      });
      await expect(
        service.create(
          'evt1',
          { type: MediaType.PHOTO },
          fileBase,
          'usr1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('per-type size exceeded rejected', async () => {
      (signatureModule.detectSignature as jest.Mock).mockReturnValue({
        extension: 'jpg',
        mime: 'image/jpeg',
      });
      const largeFile = { ...fileBase, size: 10 * 1024 * 1024 }; // 10 MiB, Photo limit is 5 MiB
      await expect(
        service.create(
          'evt1',
          { type: MediaType.PHOTO },
          largeFile,
          'usr1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('DB create failure -> storage cleanup invoked', async () => {
      (signatureModule.detectSignature as jest.Mock).mockReturnValue({
        extension: 'jpg',
        mime: 'image/jpeg',
      });
      const dbError = new Error('DB failed');
      (prisma.media.create as jest.Mock).mockRejectedValue(dbError);

      await expect(
        service.create(
          'evt1',
          { type: MediaType.PHOTO },
          fileBase,
          'usr1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(dbError);

      expect(storage.deleteFile).toHaveBeenCalled();
    });

    it('DB create failure + cleanup failure -> original DB error remains primary', async () => {
      (signatureModule.detectSignature as jest.Mock).mockReturnValue({
        extension: 'jpg',
        mime: 'image/jpeg',
      });
      const dbError = new Error('DB failed');
      const cleanupError = new Error('Cleanup failed');
      (prisma.media.create as jest.Mock).mockRejectedValue(dbError);
      (storage.deleteFile as jest.Mock).mockRejectedValue(cleanupError);

      await expect(
        service.create(
          'evt1',
          { type: MediaType.PHOTO },
          fileBase,
          'usr1',
          Role.ADMIN,
        ),
      ).rejects.toThrow('DB failed');
    });
  });

  describe('Delete logic', () => {
    beforeEach(() => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: 'evt1' });
      (prisma.media.findFirst as jest.Mock).mockResolvedValue({
        url: 'media/test.jpg',
      });
    });

    it('DB DELETE failure -> storage delete NOT called, request fails', async () => {
      const dbError = new Error('DB delete failed');
      (prisma.media.delete as jest.Mock).mockRejectedValue(dbError);

      await expect(
        service.remove('evt1', 'med1', 'usr1', Role.ADMIN),
      ).rejects.toThrow('DB delete failed');
      expect(storage.deleteFile).not.toHaveBeenCalled();
    });

    it('DB DELETE success + fs failure -> logical deletion succeeds, cleanup failure logged', async () => {
      (prisma.media.delete as jest.Mock).mockResolvedValue({});
      (storage.deleteFile as jest.Mock).mockRejectedValue(new Error('FS fail'));

      await expect(
        service.remove('evt1', 'med1', 'usr1', Role.ADMIN),
      ).resolves.toBeUndefined();
      expect(prisma.media.delete).toHaveBeenCalled();
      expect(storage.deleteFile).toHaveBeenCalled();
    });
  });
});
