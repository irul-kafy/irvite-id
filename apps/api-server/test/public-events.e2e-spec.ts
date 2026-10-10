import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import * as argon2 from 'argon2';

describe('Public Events API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const testUserEmail = 'super_pub_ev@e2e.test';
  const publishedSlug = 'e2e-pub-event-published';
  const draftSlug = 'e2e-pub-event-draft';
  const expiredSlug = 'e2e-pub-event-expired';
  const templateName = 'E2E Public Event Template';

  let publishedEventId: string;
  let templateId: string;
  let testUserId: string;

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

    // Scoped cleanup
    await prisma.media.deleteMany({
      where: {
        event: { slug: { in: [publishedSlug, draftSlug, expiredSlug] } },
      },
    });
    await prisma.event.deleteMany({
      where: { slug: { in: [publishedSlug, draftSlug, expiredSlug] } },
    });
    await prisma.template.deleteMany({
      where: { name: templateName },
    });
    await prisma.user.deleteMany({
      where: { email: testUserEmail },
    });

    // Create test user
    const pwd = await argon2.hash('password1234');
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        passwordHash: pwd,
        role: 'SUPER_ADMIN',
      },
    });
    testUserId = user.id;

    // Create test template with Config V1
    const tpl = await prisma.template.create({
      data: {
        name: templateName,
        themeCode: 'VERDANT',
        config: {
          version: 1,
          theme: {
            primaryColor: '#1E3A2F',
            secondaryColor: '#B4975A',
            backgroundColor: '#F7F8F5',
            textColor: '#1A2820',
          },
          typography: {
            headingFont: 'PLAYFAIR_DISPLAY',
            bodyFont: 'LORA',
          },
          sections: [
            { id: 'hero', enabled: true, order: 1, variant: 'default' },
            { id: 'eventDetails', enabled: true, order: 2, variant: 'default' },
          ],
        },
      },
    });
    templateId = tpl.id;

    // 1. Published event (Future date)
    const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const pubEvent = await prisma.event.create({
      data: {
        userId: testUserId,
        templateId,
        title: 'Sarah & Michael Wedding',
        slug: publishedSlug,
        description: 'Join us to celebrate our wedding',
        eventDate: futureDate,
        locationDetails: 'Grand Ballroom, Jakarta',
        status: 'PUBLISHED',
      },
    });
    publishedEventId = pubEvent.id;

    // Add media to published event
    await prisma.media.create({
      data: {
        eventId: publishedEventId,
        type: 'PHOTO',
        url: 'media/test-photo.jpg',
        order: 1,
      },
    });

    // 2. Draft event
    await prisma.event.create({
      data: {
        userId: testUserId,
        templateId,
        title: 'Draft Event Celebration',
        slug: draftSlug,
        description: 'Not yet published',
        eventDate: futureDate,
        status: 'DRAFT',
      },
    });

    // 3. Expired event (>30 days in the past)
    const expiredDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    await prisma.event.create({
      data: {
        userId: testUserId,
        templateId,
        title: 'Old Expired Celebration',
        slug: expiredSlug,
        eventDate: expiredDate,
        status: 'PUBLISHED',
      },
    });
  });

  afterAll(async () => {
    await prisma.media.deleteMany({
      where: {
        event: { slug: { in: [publishedSlug, draftSlug, expiredSlug] } },
      },
    });
    await prisma.event.deleteMany({
      where: { slug: { in: [publishedSlug, draftSlug, expiredSlug] } },
    });
    await prisma.template.deleteMany({
      where: { name: templateName },
    });
    await prisma.user.deleteMany({
      where: { email: testUserEmail },
    });
    await app.close();
  });

  describe('GET /events/public/:slug', () => {
    it('returns 200 and sanitized event + template + media for a published event', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/public/${publishedSlug}`)
        .expect(200);
      const body = res.body as {
        event: Record<string, unknown>;
        template: Record<string, unknown>;
        media: Array<{ src: string }>;
        guest?: unknown;
        invitation?: unknown;
      };

      expect(res.body).toHaveProperty('event');
      expect(body.event.title).toBe('Sarah & Michael Wedding');
      expect(body.event.slug).toBe(publishedSlug);
      expect(body.event.locationDetails).toBe('Grand Ballroom, Jakarta');

      expect(res.body).toHaveProperty('template');
      expect(body.template.themeCode).toBe('VERDANT');
      expect(body.template.config).toBeDefined();

      expect(res.body).toHaveProperty('media');
      expect(Array.isArray(body.media)).toBe(true);
      expect(body.media.length).toBe(1);
      expect(body.media[0].src).toMatch(
        new RegExp(`^/events/public/${publishedSlug}/media/`),
      );

      // Security: verify private / sensitive fields are NOT leaked
      expect(body.event.userId).toBeUndefined();
      expect(body.event.id).toBeUndefined();
      expect(body.event.status).toBeUndefined();
      expect(body.guest).toBeUndefined();
      expect(body.invitation).toBeUndefined();
    });

    it('returns 404 for a DRAFT event (opaque privacy protection)', async () => {
      await request(app.getHttpServer())
        .get(`/events/public/${draftSlug}`)
        .expect(404);
    });

    it('returns 404 for a non-existent slug', async () => {
      await request(app.getHttpServer())
        .get('/events/public/totally-nonexistent-event-slug-12345')
        .expect(404);
    });

    it('returns 404 for an expired event (>30 days post-event)', async () => {
      await request(app.getHttpServer())
        .get(`/events/public/${expiredSlug}`)
        .expect(404);
    });
  });
});
