import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EventContentDto } from './dto/event-content.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { projectEventContent } from './public-event-content';
import { EventsService } from './events.service';
import { PrismaService } from '../database/prisma.service';
import { Role } from 'database';

const id = '4b759c6d-2a4b-4c89-86ec-4bd65efc82bd';
describe('Wedding content', () => {
  it('rejects null content and nested unknown fields; accepts empty replacement', async () => {
    expect(
      await validate(plainToInstance(UpdateEventDto, { content: null })),
    ).not.toHaveLength(0);
    expect(
      await validate(
        plainToInstance(CreateEventDto, {
          title: 'A',
          slug: 'a',
          eventDate: '2026-10-10',
          content: null,
        }),
      ),
    ).not.toHaveLength(0);
    expect(
      await validate(plainToInstance(UpdateEventDto, { content: {} })),
    ).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(UpdateEventDto, {
          content: {
            ceremonies: [
              {
                title: 'Akad',
                dateTime: '2026-10-10T09:00:00+07:00',
                venue: 'Garden',
                address: 'Address',
                privateField: 'x',
              },
            ],
          },
        }),
        { whitelist: true, forbidNonWhitelisted: true },
      ),
    ).not.toHaveLength(0);
  });
  it.each([
    'javascript:alert(1)',
    'http://maps.google.com/',
    'https://google.com.evil.test/maps',
    'https://www.google.com/search?q=x',
  ])('rejects unsafe map link %s', async (mapsUrl) => {
    expect(
      await validate(plainToInstance(EventContentDto, { mapsUrl })),
    ).not.toHaveLength(0);
  });
  it('validates limits and duplicate selected photos', async () => {
    expect(
      await validate(
        plainToInstance(EventContentDto, {
          galleryMediaIds: [id, id],
          partnerOneName: 'a'.repeat(121),
          ceremonies: [{ title: 'Akad', dateTime: 'bad' }],
        }),
      ),
    ).not.toHaveLength(0);
    expect(
      await validate(
        plainToInstance(EventContentDto, {
          galleryMediaIds: [id],
          mapsUrl: 'https://maps.app.goo.gl/example',
          timeZone: 'Asia/Jakarta',
        }),
      ),
    ).toHaveLength(0);
  });
  it('excludes gift and unselected photos, preserves audio, omits internal IDs', () => {
    const media = [
      { id: 'gift', type: 'PHOTO' },
      { id: 'old-gift', type: 'PHOTO' },
      { id: 'photo', type: 'PHOTO' },
      { id: 'audio', type: 'AUDIO' },
    ];
    const result = projectEventContent(
      {
        giftQrMediaId: 'gift',
        galleryMediaIds: ['photo'],
        partnerOneName: 'A',
        private: 'secret',
      },
      media,
      '/media',
    );
    expect(result.content).toEqual({ partnerOneName: 'A' });
    expect(result.giftQr).toEqual({ src: '/media/gift' });
    expect(result.galleryMedia.map((m) => m.id)).toEqual(['photo', 'audio']);
    expect(
      projectEventContent({ galleryMediaIds: [] }, media, '/media')
        .galleryMedia,
    ).toEqual([{ id: 'audio', type: 'AUDIO' }]);
    expect(
      projectEventContent(undefined, media, '/media').galleryMedia,
    ).toEqual(media);
  });
  it('rejects a foreign gift photo and does not write', async () => {
    const prisma = {
      event: {
        findFirst: jest.fn().mockResolvedValue({ id: 'event' }),
        update: jest.fn(),
      },
      media: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new EventsService(prisma as unknown as PrismaService);
    await expect(
      service.update('event', 'owner', Role.ADMIN, {
        content: { giftQrMediaId: id },
      }),
    ).rejects.toThrow('Gift QR');
    expect(prisma.media.findFirst).toHaveBeenCalledWith({
      where: { id, eventId: 'event', type: 'PHOTO' },
      select: { id: true },
    });
    expect(prisma.event.update).not.toHaveBeenCalled();
  });
  it('replaces content as a whole and leaves absent content untouched', async () => {
    const prisma = {
      event: { update: jest.fn().mockResolvedValue({ id: 'event' }) },
    };
    const service = new EventsService(prisma as unknown as PrismaService);
    await service.update('event', 'owner', Role.ADMIN, { content: {} });
    expect(prisma.event.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: { content: {} } }),
    );
    await service.update('event', 'owner', Role.ADMIN, { title: 'Updated' });
    expect(prisma.event.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: { title: 'Updated' } }),
    );
  });
  it('rejects foreign gallery photos before saving', async () => {
    const prisma = {
      event: {
        findFirst: jest.fn().mockResolvedValue({ id: 'event' }),
        update: jest.fn(),
      },
      media: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new EventsService(prisma as unknown as PrismaService);
    await expect(
      service.update('event', 'owner', Role.ADMIN, {
        content: { galleryMediaIds: [id] },
      }),
    ).rejects.toThrow('Gallery photos');
    expect(prisma.event.update).not.toHaveBeenCalled();
  });
});
