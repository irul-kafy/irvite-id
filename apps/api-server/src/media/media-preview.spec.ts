import { Readable } from 'stream';
import { Role } from 'database';
import { MediaService } from './media.service';
import { PrismaService } from '../database/prisma.service';
import { MediaStorageService } from './media-storage.service';

describe('Authenticated media preview', () => {
  it('authorizes event ownership before reading storage and returns image bytes', async () => {
    const prisma = {
      event: { findFirst: jest.fn().mockResolvedValue(null) },
      media: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ url: 'media/image.png', type: 'PHOTO' }),
      },
    };
    const storage = {
      getFileStat: jest.fn().mockResolvedValue({ size: 3 }),
      createReadStream: jest
        .fn()
        .mockReturnValue(Readable.from(Buffer.from('png'))),
    };
    const service = new MediaService(
      prisma as unknown as PrismaService,
      storage as unknown as MediaStorageService,
    );
    await expect(
      service.previewFile('event', 'image', 'owner', Role.ADMIN),
    ).rejects.toThrow('Event not found');
    expect(storage.getFileStat).not.toHaveBeenCalled();
    prisma.event.findFirst.mockResolvedValue({ id: 'event' });
    const result = await service.previewFile(
      'event',
      'image',
      'owner',
      Role.ADMIN,
    );
    expect(result.getHeaders()).toMatchObject({ type: 'image/png', length: 3 });
    expect(prisma.event.findFirst).toHaveBeenCalledWith({
      where: { id: 'event', userId: 'owner' },
      select: { id: true },
    });
  });
});
