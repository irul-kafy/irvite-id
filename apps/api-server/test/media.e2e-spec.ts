/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role, MediaType } from 'database';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Media API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let superAdminToken: string;
  let admin1Token: string;
  let staffToken: string;

  let admin1Id: string;

  let event1Id: string;
  let event2Id: string;

  const storagePath = path.join(os.tmpdir(), `media-test-${Date.now()}`);
  process.env.MEDIA_STORAGE_PATH = storagePath;

  beforeAll(async () => {
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

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
    jwtService = app.get<JwtService>(JwtService);

    // Clean DB
    await prisma.media.deleteMany({
      where: { event: { slug: { in: ['evt1', 'evt2'] } } },
    });
    await prisma.event.deleteMany({
      where: { slug: { in: ['evt1', 'evt2'] } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['sa@test.com', 'a1@test.com', 'a2@test.com', 'st@test.com'],
        },
      },
    });

    // Setup Users
    const superAdmin = await prisma.user.create({
      data: {
        email: 'sa@test.com',
        passwordHash: 'hash',
        role: Role.SUPER_ADMIN,
      },
    });
    const admin1 = await prisma.user.create({
      data: { email: 'a1@test.com', passwordHash: 'hash', role: Role.ADMIN },
    });
    const admin2 = await prisma.user.create({
      data: { email: 'a2@test.com', passwordHash: 'hash', role: Role.ADMIN },
    });
    const staff = await prisma.user.create({
      data: { email: 'st@test.com', passwordHash: 'hash', role: Role.STAFF },
    });

    admin1Id = admin1.id;

    superAdminToken = jwtService.sign({
      sub: superAdmin.id,
      role: superAdmin.role,
    });
    admin1Token = jwtService.sign({ sub: admin1.id, role: admin1.role });
    admin2Token = jwtService.sign({ sub: admin2.id, role: admin2.role });
    staffToken = jwtService.sign({ sub: staff.id, role: staff.role });

    // Setup Events
    const evt1 = await prisma.event.create({
      data: {
        userId: admin1.id,
        title: 'Evt1',
        slug: 'evt1',
        status: 'DRAFT',
        eventDate: new Date(),
        description: '',
        locationDetails: '',
      },
    });
    const evt2 = await prisma.event.create({
      data: {
        userId: admin2.id,
        title: 'Evt2',
        slug: 'evt2',
        status: 'DRAFT',
        eventDate: new Date(),
        description: '',
        locationDetails: '',
      },
    });

    event1Id = evt1.id;
    event2Id = evt2.id;
  });

  afterAll(async () => {
    await prisma.media.deleteMany({
      where: { event: { slug: { in: ['evt1', 'evt2', 'evt3'] } } },
    });
    await prisma.event.deleteMany({
      where: { slug: { in: ['evt1', 'evt2', 'evt3'] } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['sa@test.com', 'a1@test.com', 'a2@test.com', 'st@test.com'],
        },
      },
    });
    await app.close();

    if (fs.existsSync(storagePath)) {
      fs.rmSync(storagePath, { recursive: true, force: true });
    }
  });

  const createDummyJpeg = () =>
    Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
      0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff,
      0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00,
      0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x3f, 0xff, 0xd9,
    ]);
  const createDummyPng = () =>
    Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0b, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0x60, 0x00, 0x02, 0x00,
      0x00, 0x05, 0x00, 0x01, 0x24, 0x98, 0xe1, 0x80, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
  const createDummyWebp = () =>
    Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      0x56, 0x50, 0x38, 0x4c, 0x0d, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00,
      0x10, 0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe, 0x07, 0x00,
    ]);
  const createDummyMp4 = () =>
    Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32,
      0x00, 0x00, 0x00, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x32,
    ]);
  const createDummyMp3 = () =>
    Buffer.from([
      0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xfb,
      0x90, 0x44, 0x00, 0x00, 0x00, 0x00,
    ]);

  describe('Authorization', () => {
    it('No JWT -> 401', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/events/${event1Id}/media`)
        .expect(401);
    });

    it('STAFF -> 403', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('Cross ADMIN -> 404', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/events/${event2Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .expect(404);
    });

    it('ADMIN own -> success', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .expect(200);
    });

    it('SUPER_ADMIN any -> success', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/events/${event2Id}/media`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });
  });

  describe('Upload Signatures', () => {
    it('valid JPEG PHOTO', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .field('type', MediaType.PHOTO)
        .attach('file', createDummyJpeg(), 'test.jpg')
        .expect(201);

      expect(res.body.url).toMatch(/\.jpg$/);
    });

    it('valid PNG PHOTO', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .field('type', MediaType.PHOTO)
        .attach('file', createDummyPng(), 'test.png')
        .expect(201);
      expect(res.body.url).toMatch(/\.png$/);
    });

    it('valid WebP PHOTO', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .field('type', MediaType.PHOTO)
        .attach('file', createDummyWebp(), 'test.webp')
        .expect(201);
      expect(res.body.url).toMatch(/\.webp$/);
    });

    it('valid MP4 VIDEO', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .field('type', MediaType.VIDEO)
        .attach('file', createDummyMp4(), 'test.mp4')
        .expect(201);
      expect(res.body.url).toMatch(/\.mp4$/);
    });

    it('valid MP3 AUDIO', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .field('type', MediaType.AUDIO)
        .attach('file', createDummyMp3(), 'test.mp3')
        .expect(201);
      expect(res.body.url).toMatch(/\.mp3$/);
    });

    it('text bytes + HTTP image/jpeg -> 400', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .field('type', MediaType.PHOTO)
        .attach('file', Buffer.from('hello world'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);
    });

    it('JPEG requested VIDEO -> 400', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .field('type', MediaType.VIDEO)
        .attach('file', createDummyJpeg(), 'test.mp4')
        .expect(400);
    });

    it('valid PNG named .exe -> accepted, stored as .png', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .field('type', MediaType.PHOTO)
        .attach('file', createDummyPng(), 'virus.exe')
        .expect(201);

      expect(res.body.url).toMatch(/\.png$/);
    });

    it('zero-byte -> 400', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .field('type', MediaType.PHOTO)
        .attach('file', Buffer.from(''), 'empty.jpg')
        .expect(400);
    });
  });

  describe('Order validation (Multipart)', () => {
    it('order="3" -> stored 3', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .field('type', MediaType.PHOTO)
        .field('order', '3')
        .attach('file', createDummyJpeg(), 'test.jpg')
        .expect(201);
      expect(res.body.order).toBe(3);
    });

    it('order="" -> 400', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .field('type', MediaType.PHOTO)
        .field('order', '')
        .attach('file', createDummyJpeg(), 'test.jpg')
        .expect(400);
    });

    it('order="-1" -> 400', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .field('type', MediaType.PHOTO)
        .field('order', '-1')
        .attach('file', createDummyJpeg(), 'test.jpg')
        .expect(400);
    });

    it('order="abc" -> 400', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .field('type', MediaType.PHOTO)
        .field('order', 'abc')
        .attach('file', createDummyJpeg(), 'test.jpg')
        .expect(400);
    });
  });

  describe('Mass Assignment & Updates', () => {
    let mediaId: string;
    let url: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .field('type', MediaType.PHOTO)
        .attach('file', createDummyJpeg(), 'test.jpg');
      mediaId = res.body.id;
      url = res.body.url;
    });

    it('POST forbidden fields -> 400', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/events/${event1Id}/media`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .field('type', MediaType.PHOTO)
        .field('url', 'hacked')
        .attach('file', createDummyJpeg(), 'test.jpg')
        .expect(400);
    });

    it('PATCH forbidden fields -> 400', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/events/${event1Id}/media/${mediaId}`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .send({ type: MediaType.VIDEO })
        .expect(400);
    });

    it('PATCH order success', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/events/${event1Id}/media/${mediaId}`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .send({ order: 99 })
        .expect(200);
      expect(res.body.order).toBe(99);
      expect(res.body.url).toBe(url);
    });

    it('Same owner wrong parent -> 404', async () => {
      // Create evt3 owned by admin1
      const evt3 = await prisma.event.create({
        data: {
          userId: admin1Id,
          title: 'Evt3',
          slug: 'evt3',
          status: 'DRAFT',
          eventDate: new Date(),
          description: '',
          locationDetails: '',
        },
      });

      // Access event1's media through evt3 (which admin1 also owns)
      await request(app.getHttpServer())
        .get(`/api/v1/events/${evt3.id}/media/${mediaId}`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .expect(404);

      await prisma.event.delete({ where: { id: evt3.id } });
    });

    it('SUPER_ADMIN wrong parent -> 404', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/events/${event2Id}/media/${mediaId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);
    });

    it('Pagination check', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/events/${event1Id}/media?page=1&limit=10`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
    });

    it('DELETE -> 204', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/events/${event1Id}/media/${mediaId}`)
        .set('Authorization', `Bearer ${admin1Token}`)
        .expect(204);

      const dbCheck = await prisma.media.findUnique({ where: { id: mediaId } });
      expect(dbCheck).toBeNull();
    });
  });
});
