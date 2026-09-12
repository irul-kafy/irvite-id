import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { Role } from 'database';
import { MediaStorageService } from '../src/media/media-storage.service';

describe('PublicMediaController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let storage: MediaStorageService;

  let publishedCode: string;
  let draftCode: string;
  let expiredCode: string;

  let photoId: string;
  let videoId: string;
  let draftPhotoId: string;
  let expiredPhotoId: string;

  const testFileBuffer = Buffer.from('test-image-data-1234567890');
  const testVideoBuffer = Buffer.from('test-video-data-1234567890-video');
  let testPhotoKey: string;
  let testVideoKey: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    storage = app.get<MediaStorageService>(MediaStorageService);

    // CLEANUP defensively
    await prisma.media.deleteMany({
      where: { event: { slug: { startsWith: 'pub-med-' } } },
    });
    await prisma.invitation.deleteMany({
      where: { uniqueCode: { startsWith: 'PUB_MED_CODE_' } },
    });
    await prisma.guest.deleteMany({
      where: { name: { startsWith: 'PUB_MED_GUEST_' } },
    });
    await prisma.event.deleteMany({
      where: { slug: { startsWith: 'pub-med-' } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ['super_pub_med@e2e.test'] } },
    });

    const superAdmin = await prisma.user.create({
      data: {
        email: 'super_pub_med@e2e.test',
        passwordHash: 'hash',
        role: Role.SUPER_ADMIN,
      },
    });

    // Create events
    const publishedEvent = await prisma.event.create({
      data: {
        userId: superAdmin.id,
        title: 'Pub Med Published',
        slug: 'pub-med-published',
        eventDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'PUBLISHED',
      },
    });

    const draftEvent = await prisma.event.create({
      data: {
        userId: superAdmin.id,
        title: 'Pub Med Draft',
        slug: 'pub-med-draft',
        eventDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'DRAFT',
      },
    });

    const expiredEvent = await prisma.event.create({
      data: {
        userId: superAdmin.id,
        title: 'Pub Med Expired',
        slug: 'pub-med-expired',
        eventDate: new Date(Date.now() - 32 * 86400000).toISOString(),
        status: 'PUBLISHED',
      },
    });

    // Create guests and invitations
    const g1 = await prisma.guest.create({
      data: { eventId: publishedEvent.id, name: 'PUB_MED_GUEST_1' },
    });
    const inv1 = await prisma.invitation.create({
      data: {
        eventId: publishedEvent.id,
        guestId: g1.id,
        uniqueCode: 'PUB_MED_CODE_123456789', // 22 chars
      },
    });
    publishedCode = inv1.uniqueCode;

    const g2 = await prisma.guest.create({
      data: { eventId: draftEvent.id, name: 'PUB_MED_GUEST_2' },
    });
    const inv2 = await prisma.invitation.create({
      data: {
        eventId: draftEvent.id,
        guestId: g2.id,
        uniqueCode: 'PUB_MED_CODE_DRAFT_890', // 22 chars
      },
    });
    draftCode = inv2.uniqueCode;

    const g3 = await prisma.guest.create({
      data: { eventId: expiredEvent.id, name: 'PUB_MED_GUEST_3' },
    });
    const inv3 = await prisma.invitation.create({
      data: {
        eventId: expiredEvent.id,
        guestId: g3.id,
        uniqueCode: 'PUB_MED_CODE_EXP_89012', // 22 chars
      },
    });
    expiredCode = inv3.uniqueCode;

    // Write dummy physical files
    testPhotoKey = storage.generateKey('jpg');
    await storage.writeFile(testPhotoKey, testFileBuffer);
    testVideoKey = storage.generateKey('mp4');
    await storage.writeFile(testVideoKey, testVideoBuffer);

    // Create medias
    const photo = await prisma.media.create({
      data: {
        eventId: publishedEvent.id,
        url: testPhotoKey,
        type: 'PHOTO',
      },
    });
    photoId = photo.id;

    const video = await prisma.media.create({
      data: {
        eventId: publishedEvent.id,
        url: testVideoKey,
        type: 'VIDEO',
      },
    });
    videoId = video.id;

    const dPhoto = await prisma.media.create({
      data: {
        eventId: draftEvent.id,
        url: testPhotoKey,
        type: 'PHOTO',
      },
    });
    draftPhotoId = dPhoto.id;

    const ePhoto = await prisma.media.create({
      data: {
        eventId: expiredEvent.id,
        url: testPhotoKey,
        type: 'PHOTO',
      },
    });
    expiredPhotoId = ePhoto.id;
  });

  afterAll(async () => {
    // Clean files
    try {
      await storage.deleteFile(testPhotoKey);
      await storage.deleteFile(testVideoKey);
    } catch {
      // ignore missing test files during cleanup
    }

    // Teardown
    await prisma.media.deleteMany({
      where: { event: { slug: { startsWith: 'pub-med-' } } },
    });
    await prisma.invitation.deleteMany({
      where: { uniqueCode: { startsWith: 'PUB_MED_CODE_' } },
    });
    await prisma.guest.deleteMany({
      where: { name: { startsWith: 'PUB_MED_GUEST_' } },
    });
    await prisma.event.deleteMany({
      where: { slug: { startsWith: 'pub-med-' } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ['super_pub_med@e2e.test'] } },
    });

    await app.close();
  });

  describe('GET Public Media', () => {
    it('should return 200 and image body with proper headers for missing range', async () => {
      const res = await request(app.getHttpServer())
        .get(`/invitations/public/${publishedCode}/media/${photoId}`)
        .expect(200);

      expect(res.header['content-type']).toBe('image/jpeg');
      expect(res.header['cache-control']).toBe(
        'no-store, no-cache, must-revalidate, proxy-revalidate',
      );
      expect(res.header['accept-ranges']).toBe('bytes');
      expect(res.header['content-length']).toBe(
        testFileBuffer.length.toString(),
      );
      expect(res.body).toEqual(testFileBuffer);
    });

    it('should return 206 for valid byte range', async () => {
      const res = await request(app.getHttpServer())
        .get(`/invitations/public/${publishedCode}/media/${videoId}`)
        .set('Range', 'bytes=0-10')
        .expect(206);

      expect(res.header['content-type']).toBe('video/mp4');
      expect(res.header['content-range']).toBe(
        `bytes 0-10/${testVideoBuffer.length}`,
      );
      expect(res.header['content-length']).toBe('11');
      expect(res.body).toEqual(testVideoBuffer.subarray(0, 11));
    });

    it('should return 416 for unsatisfiable range', async () => {
      const res = await request(app.getHttpServer())
        .get(`/invitations/public/${publishedCode}/media/${videoId}`)
        .set('Range', 'bytes=100-200')
        .expect(416);

      expect(res.header['content-range']).toBe(
        `bytes */${testVideoBuffer.length}`,
      );
    });

    it('should return 404 for DRAFT event media', async () => {
      await request(app.getHttpServer())
        .get(`/invitations/public/${draftCode}/media/${draftPhotoId}`)
        .expect(404);
    });

    it('should return 404 for Expired event media', async () => {
      await request(app.getHttpServer())
        .get(`/invitations/public/${expiredCode}/media/${expiredPhotoId}`)
        .expect(404);
    });

    it('should return 404 for malformed mediaId', async () => {
      await request(app.getHttpServer())
        .get(`/invitations/public/${publishedCode}/media/not-a-uuid`)
        .expect(404);
    });

    it('should return 404 for unknown mediaId', async () => {
      await request(app.getHttpServer())
        .get(
          `/invitations/public/${publishedCode}/media/12345678-1234-1234-1234-123456789012`,
        )
        .expect(404);
    });
  });

  describe('HEAD Public Media', () => {
    it('should return 200 headers without body', async () => {
      const res = await request(app.getHttpServer())
        .head(`/invitations/public/${publishedCode}/media/${photoId}`)
        .expect(200);

      expect(res.header['content-type']).toBe('image/jpeg');
      expect(res.header['content-length']).toBe(
        testFileBuffer.length.toString(),
      );
      // Object.keys(res.body).length should be 0 or res.text empty
      expect(res.text).toBeFalsy();
    });
  });
});
