/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { Role, Guest } from 'database';

describe('PublicInvitationsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Event IDs
  let publishedEventId: string;
  let draftEventId: string;
  let expiredEventId: string;
  let eventWithTemplateId: string;

  // Codes
  let publishedCodeA: string;
  let publishedCodeB: string;
  let draftCode: string;
  let expiredCode: string;
  let templateCode: string;
  let noConfigTemplateCode: string;
  let guestTemplate: Guest;

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

    // CLEANUP defensively
    await prisma.attendance.deleteMany({
      where: { invitation: { uniqueCode: { startsWith: 'CODE_' } } },
    });
    await prisma.invitation.deleteMany({
      where: { uniqueCode: { startsWith: 'CODE_' } },
    });
    await prisma.guest.deleteMany({
      where: { name: { startsWith: 'TEST_PUB_GUEST_' } },
    });
    await prisma.event.deleteMany({
      where: { slug: { startsWith: 'pub-event-' } },
    });
    await prisma.event.deleteMany({
      where: { slug: { in: ['rsvp-event', 'rsvp-cutoff-event'] } },
    });
    await prisma.template.deleteMany({
      where: { themeCode: { startsWith: 'THEME_00' } },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['super_pub@e2e.test', 'admin_pub@e2e.test'] },
      },
    });

    // Create Users
    await prisma.user.create({
      data: {
        email: 'super_pub@e2e.test',
        passwordHash: 'hash',
        role: Role.SUPER_ADMIN,
      },
    });
    const admin = await prisma.user.create({
      data: {
        email: 'admin_pub@e2e.test',
        passwordHash: 'hash',
        role: Role.ADMIN,
      },
    });

    // Create Templates
    const templateWithConfig = await prisma.template.create({
      data: {
        name: 'Template Config',
        themeCode: 'THEME_001',
        config: JSON.stringify({ color: 'red' }),
        previewImageUrl: 'http://img.com/a',
      },
    });

    const templateNoConfig = await prisma.template.create({
      data: {
        name: 'Template No Config',
        themeCode: 'THEME_002',
        previewImageUrl: 'http://img.com/b',
      },
    });

    // Events
    const publishedEvent = await prisma.event.create({
      data: {
        userId: admin.id,
        title: 'Published Event',
        slug: 'pub-event-published',
        eventDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'PUBLISHED',
      },
    });
    publishedEventId = publishedEvent.id;

    const draftEvent = await prisma.event.create({
      data: {
        userId: admin.id,
        title: 'Draft Event',
        slug: 'pub-event-draft',
        eventDate: new Date(Date.now() + 86400000).toISOString(),
        status: 'DRAFT',
      },
    });
    draftEventId = draftEvent.id;

    const expiredEvent = await prisma.event.create({
      data: {
        userId: admin.id,
        title: 'Expired Event',
        slug: 'pub-event-expired',
        eventDate: new Date(
          Date.now() - 31 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        status: 'PUBLISHED',
      },
    });
    expiredEventId = expiredEvent.id;

    const eventWithTemplate = await prisma.event.create({
      data: {
        userId: admin.id,
        title: 'Template Event',
        slug: 'pub-event-template',
        eventDate: new Date(),
        status: 'PUBLISHED',
        templateId: templateWithConfig.id,
      },
    });
    eventWithTemplateId = eventWithTemplate.id;

    const eventWithNoConfigTemplate = await prisma.event.create({
      data: {
        userId: admin.id,
        title: 'No Config Template Event',
        slug: 'pub-event-noconfig',
        eventDate: new Date(),
        status: 'PUBLISHED',
        templateId: templateNoConfig.id,
      },
    });
    const eventWithNoConfigTemplateId = eventWithNoConfigTemplate.id;

    // Guests
    const guestPubA = await prisma.guest.create({
      data: {
        eventId: publishedEventId,
        name: 'TEST_PUB_GUEST_A',
        customGreeting: 'Hello A',
        maxPax: 2,
      },
    });
    const guestPubB = await prisma.guest.create({
      data: {
        eventId: publishedEventId,
        name: 'TEST_PUB_GUEST_B',
        customGreeting: 'Hello B',
      },
    });
    const guestDraft = await prisma.guest.create({
      data: {
        eventId: draftEventId,
        name: 'TEST_PUB_GUEST_DRAFT',
        customGreeting: 'Hello Draft',
      },
    });
    const guestExpired = await prisma.guest.create({
      data: {
        eventId: expiredEventId,
        name: 'TEST_PUB_GUEST_EXP',
      },
    });

    guestTemplate = await prisma.guest.create({
      data: {
        eventId: eventWithTemplateId,
        name: 'TEST_PUB_GUEST_TPL',
      },
    });

    const guestNoConfig = await prisma.guest.create({
      data: {
        eventId: eventWithNoConfigTemplateId,
        name: 'TEST_PUB_GUEST_NOCONFIG',
      },
    });

    // Invitations
    const invPubA = await prisma.invitation.create({
      data: {
        eventId: publishedEventId,
        guestId: guestPubA.id,
        uniqueCode: 'CODE_PUB_A_12345678901',
        customMessage: 'Message A',
      },
    });
    publishedCodeA = invPubA.uniqueCode;

    const invPubB = await prisma.invitation.create({
      data: {
        eventId: publishedEventId,
        guestId: guestPubB.id,
        uniqueCode: 'CODE_PUB_B_12345678901',
        customMessage: 'Message B',
      },
    });
    publishedCodeB = invPubB.uniqueCode;

    const invDraft = await prisma.invitation.create({
      data: {
        eventId: draftEventId,
        guestId: guestDraft.id,
        uniqueCode: 'CODE_DRAFT_12345678901',
      },
    });
    draftCode = invDraft.uniqueCode;

    const invExpired = await prisma.invitation.create({
      data: {
        eventId: expiredEventId,
        guestId: guestExpired.id,
        uniqueCode: 'CODE_EXPIR_12345678901',
      },
    });
    expiredCode = invExpired.uniqueCode;

    const invTemplate = await prisma.invitation.create({
      data: {
        eventId: eventWithTemplateId,
        guestId: guestTemplate.id,
        uniqueCode: 'CODE_TEMPL_12345678901',
      },
    });
    templateCode = invTemplate.uniqueCode;

    const invNoConfig = await prisma.invitation.create({
      data: {
        eventId: eventWithNoConfigTemplateId,
        guestId: guestNoConfig.id,
        uniqueCode: 'CODE_NOCON_12345678901',
      },
    });
    noConfigTemplateCode = invNoConfig.uniqueCode;
  });

  afterAll(async () => {
    // Teardown
    const codesToCleanup = [
      publishedCodeA,
      publishedCodeB,
      draftCode,
      expiredCode,
      templateCode,
      noConfigTemplateCode,
    ].filter(Boolean);

    if (codesToCleanup.length > 0) {
      await prisma.invitation.deleteMany({
        where: {
          uniqueCode: {
            in: codesToCleanup,
          },
        },
      });
    }
    // Cleanup any legacy invs created in test
    await prisma.invitation.deleteMany({
      where: { uniqueCode: { startsWith: 'CODE_' } },
    });
    await prisma.attendance.deleteMany({
      where: { invitation: { uniqueCode: { startsWith: 'CODE_' } } },
    });
    await prisma.guest.deleteMany({
      where: { name: { startsWith: 'TEST_PUB_GUEST_' } },
    });
    await prisma.guest.deleteMany({
      where: { name: { startsWith: 'RSVP ' } },
    });
    await prisma.event.deleteMany({
      where: { slug: { startsWith: 'pub-event-' } },
    });
    await prisma.event.deleteMany({
      where: { slug: { startsWith: 'rsvp-' } },
    });
    await prisma.guest.deleteMany({
      where: { name: 'Cutoff Guest' },
    });
    await prisma.template.deleteMany({
      where: { themeCode: { startsWith: 'THEME_00' } },
    });
    await prisma.user.deleteMany({
      where: {
        email: { in: ['super_pub@e2e.test', 'admin_pub@e2e.test'] },
      },
    });
    await app.close();
  });

  describe('Public Resolving & Eligibility', () => {
    it('GET valid PUBLISHED invitation without JWT -> 200 with Cache-Control no-store', async () => {
      await request(app.getHttpServer())
        .get(`/invitations/public/${publishedCodeA}`)
        .expect(200)
        .expect('Cache-Control', 'no-store')
        .expect((res) => {
          // 1. Assert Root Shape EXACTLY
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const rootKeys = Object.keys(res.body).sort();
          expect(rootKeys).toEqual([
            'event',
            'guest',
            'invitation',
            'media',
            'rsvp',
            'template',
          ]);

          // 2. Assert Invitation shape EXACTLY
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const invKeys = Object.keys(res.body.invitation);
          expect(invKeys).toEqual(['customMessage']);
          expect(res.body.invitation.customMessage).toBe('Message A');

          // 3. Assert Guest shape EXACTLY
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const guestKeys = Object.keys(res.body.guest).sort();
          expect(guestKeys).toEqual(['customGreeting', 'maxPax', 'name']);
          expect(res.body.guest.name).toBe('TEST_PUB_GUEST_A');
          expect(res.body.guest.customGreeting).toBe('Hello A');
          expect(res.body.guest.maxPax).toBe(2);

          // 4. Assert Event shape EXACTLY
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const eventKeys = Object.keys(res.body.event).sort();
          expect(eventKeys).toEqual([
            'description',
            'eventDate',
            'locationDetails',
            'title',
          ]);
          expect(res.body.event.title).toBe('Published Event');

          // 5. Assert Template is null (no template assigned)
          expect(res.body.template).toBeNull();

          // Assert NO Guest B leakage
          expect(JSON.stringify(res.body)).not.toContain('TEST_PUB_GUEST_B');

          // Deep negative assertions for safety
          const serialized = JSON.stringify(res.body);
          const sensitiveKeys = [
            'id',
            'guestId',
            'eventId',
            'templateId',
            'userId',
            'uniqueCode',
            'status',
            'rsvpPax',
            'email',
            'phoneNumber',
            'category',
            'slug',
            'createdAt',
            'updatedAt',
            'previewImageUrl',
            'passwordHash',
          ];
          sensitiveKeys.forEach((key) => {
            expect(serialized).not.toContain(`"${key}":`);
          });
        });

      // Verify no DB mutations occurred
      const invAfter = await prisma.invitation.findUnique({
        where: { uniqueCode: publishedCodeA },
      });
      expect(invAfter?.status).toBe('PENDING');
    });

    it('GET Event with Template -> 200 (Exact Template shape)', () => {
      return request(app.getHttpServer())
        .get(`/invitations/public/${templateCode}`)
        .expect(200)
        .expect((res) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          const templateKeys = Object.keys(res.body.template).sort();
          expect(templateKeys).toEqual(['config', 'themeCode']);
          expect(res.body.template.themeCode).toBe('THEME_001');
          expect(res.body.template.config).toEqual(
            JSON.stringify({ color: 'red' }),
          );

          const serialized = JSON.stringify(res.body);
          expect(serialized).not.toContain('previewImageUrl');
          expect(serialized).not.toContain('createdAt');
          expect(serialized).not.toContain('id"');
        });
    });

    it('GET Event with Template (config=null) -> 200', () => {
      return request(app.getHttpServer())
        .get(`/invitations/public/${noConfigTemplateCode}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.template.themeCode).toBe('THEME_002');
          expect(res.body.template.config).toBeNull();
        });
    });

    it('GET valid PUBLISHED invitation B -> 200 (Personalization Isolation)', () => {
      return request(app.getHttpServer())
        .get(`/invitations/public/${publishedCodeB}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.guest.name).toBe('TEST_PUB_GUEST_B');
          expect(JSON.stringify(res.body)).not.toContain('TEST_PUB_GUEST_A');
        });
    });

    it('GET valid DRAFT invitation -> 404 (Opaque rejection)', () => {
      return request(app.getHttpServer())
        .get(`/invitations/public/${draftCode}`)
        .expect(404);
    });

    it('GET valid EXPIRED invitation -> 404 (Opaque rejection)', () => {
      return request(app.getHttpServer())
        .get(`/invitations/public/${expiredCode}`)
        .expect(404);
    });

    it('GET malformed uniqueCode -> 404 (Opaque rejection)', () => {
      return request(app.getHttpServer())
        .get(`/invitations/public/TOO_SHORT`)
        .expect(404);
    });

    it('GET valid-format unknown uniqueCode -> 404 (Opaque rejection)', () => {
      return request(app.getHttpServer())
        .get(`/invitations/public/CODE_UNKNO_12345678901`)
        .expect(404);
    });

    it('GET legacy invalid status Event -> 404 (Opaque rejection)', async () => {
      // Direct insertion of invalid status
      const admin = await prisma.user.findFirst({
        where: { email: 'admin_pub@e2e.test' },
      });
      const legacyEvent = await prisma.event.create({
        data: {
          userId: admin!.id,
          title: 'Legacy Event',
          slug: 'pub-event-legacy',
          eventDate: new Date(),
          status: 'INVALID_LEGACY',
        },
      });
      const legacyGuest = await prisma.guest.create({
        data: { eventId: legacyEvent.id, name: 'TEST_PUB_GUEST_LEGACY' },
      });
      const legacyInv = await prisma.invitation.create({
        data: {
          eventId: legacyEvent.id,
          guestId: legacyGuest.id,
          uniqueCode: 'CODE_LEGAC_12345678901',
        },
      });

      await request(app.getHttpServer())
        .get(`/invitations/public/${legacyInv.uniqueCode}`)
        .expect(404);
    });
    describe('Public RSVP (Phase 5D)', () => {
      let rsvpEventId: string;
      let cutoffEventId: string;
      let rsvpGuestId: string;
      let rsvpInvId: string;
      const rsvpUniqueCode = 'CODE_RSVP_123456789012';

      beforeAll(async () => {
        const admin = await prisma.user.findFirst({
          where: { email: 'admin_pub@e2e.test' },
        });
        // 1. Normal Event
        const rEvent = await prisma.event.create({
          data: {
            userId: admin!.id,
            title: 'RSVP Event',
            slug: 'rsvp-event',
            eventDate: new Date(Date.now() + 86400000), // Tomorrow
            status: 'PUBLISHED',
          },
        });
        rsvpEventId = rEvent.id;

        // 2. Cutoff Event (Event Date is in the past, but not 30 days)
        const cEvent = await prisma.event.create({
          data: {
            userId: admin!.id,
            title: 'RSVP Cutoff Event',
            slug: 'rsvp-cutoff-event',
            eventDate: new Date(Date.now() - 86400000), // Yesterday
            status: 'PUBLISHED',
          },
        });
        cutoffEventId = cEvent.id;

        const rGuest = await prisma.guest.create({
          data: {
            eventId: rsvpEventId,
            name: 'RSVP Guest',
            maxPax: 5,
          },
        });
        rsvpGuestId = rGuest.id;

        const rInv = await prisma.invitation.create({
          data: {
            eventId: rsvpEventId,
            guestId: rsvpGuestId,
            uniqueCode: rsvpUniqueCode,
            status: 'PENDING',
          },
        });
        rsvpInvId = rInv.id;
      });

      afterEach(async () => {
        // Reset RSVP state between tests
        if (rsvpInvId) {
          await prisma.invitation.update({
            where: { id: rsvpInvId },
            data: { status: 'PENDING', rsvpPax: null },
          });
        }
      });

      it('should map PENDING to response PENDING and canRespond true', async () => {
        const res = await request(app.getHttpServer())
          .get(`/invitations/public/${rsvpUniqueCode}`)
          .expect(200);

        expect(res.body.rsvp).toBeDefined();
        expect(res.body.rsvp.response).toBe('PENDING');
        expect(res.body.rsvp.pax).toBeNull();
        expect(res.body.rsvp.canRespond).toBe(true);
        expect(res.body.invitation.status).toBeUndefined(); // internal status hidden
      });

      it('should allow valid YES RSVP without JWT', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({ response: 'YES', pax: 2 })
          .expect(200);

        expect(res.body.rsvp.response).toBe('YES');
        expect(res.body.rsvp.pax).toBe(2);
        expect(res.body.rsvp.canRespond).toBe(true);
        expect(res.header['cache-control']).toContain('no-store');

        const inv = await prisma.invitation.findUnique({
          where: { id: rsvpInvId },
        });
        expect(inv!.status).toBe('RSVP_YES');
        expect(inv!.rsvpPax).toBe(2);
      });

      it('should allow valid NO RSVP without pax, clearing pax', async () => {
        // Setup: Guest previously said YES pax 3
        await prisma.invitation.update({
          where: { id: rsvpInvId },
          data: { status: 'RSVP_YES', rsvpPax: 3 },
        });

        const res = await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({ response: 'NO' })
          .expect(200);

        expect(res.body.rsvp.response).toBe('NO');
        expect(res.body.rsvp.pax).toBeNull();

        const inv = await prisma.invitation.findUnique({
          where: { id: rsvpInvId },
        });
        expect(inv!.status).toBe('RSVP_NO');
        expect(inv!.rsvpPax).toBeNull();
      });

      it('should reject NO RSVP with pax (mass assignment / bad request)', async () => {
        await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({ response: 'NO', pax: 2 })
          .expect(400);
      });

      it('should reject YES RSVP without pax', async () => {
        await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({ response: 'YES' })
          .expect(400);
      });

      it('should reject YES RSVP with pax > maxPax', async () => {
        await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({ response: 'YES', pax: 6 }) // max is 5
          .expect(400);
      });

      it('should reject invalid pax types (string, negative, 0, decimal, null)', async () => {
        const invalids = ['2', -1, 0, 1.5, null];
        for (const val of invalids) {
          await request(app.getHttpServer())
            .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
            .send({ response: 'YES', pax: val })
            .expect(400);
        }
      });

      it('should reject unknown extra fields (mass assignment)', async () => {
        await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({
            response: 'YES',
            pax: 2,
            status: 'OPENED',
            invitationId: 'hacked',
          })
          .expect(400);
      });

      it('should reject RSVP after event cutoff with 409 Conflict', async () => {
        const cGuest = await prisma.guest.create({
          data: { eventId: cutoffEventId, name: 'Cutoff Guest', maxPax: 2 },
        });
        const cInv = await prisma.invitation.create({
          data: {
            eventId: cutoffEventId,
            guestId: cGuest.id,
            uniqueCode: 'CODE_CUTOF_12345678901',
            status: 'PENDING',
          },
        });

        // GET should return canRespond = false
        const getRes = await request(app.getHttpServer())
          .get(`/invitations/public/${cInv.uniqueCode}`)
          .expect(200);
        expect(getRes.body.rsvp.canRespond).toBe(false);

        // PATCH should return 409
        await request(app.getHttpServer())
          .patch(`/invitations/public/${cInv.uniqueCode}/rsvp`)
          .send({ response: 'YES', pax: 1 })
          .expect(409);
      });

      it('should maintain idempotency (repeated identical RSVP)', async () => {
        await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({ response: 'YES', pax: 2 })
          .expect(200);

        await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({ response: 'YES', pax: 2 })
          .expect(200); // Should succeed with no errors
      });

      it('should allow PENDING to NO RSVP', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({ response: 'NO' })
          .expect(200);
        expect(res.body.rsvp.response).toBe('NO');
        expect(res.body.rsvp.pax).toBeNull();
      });

      it('should allow NO to YES RSVP', async () => {
        await prisma.invitation.update({
          where: { id: rsvpInvId },
          data: { status: 'RSVP_NO', rsvpPax: null },
        });
        const res = await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({ response: 'YES', pax: 1 })
          .expect(200);
        expect(res.body.rsvp.response).toBe('YES');
        expect(res.body.rsvp.pax).toBe(1);
      });

      it('should allow YES pax change', async () => {
        await prisma.invitation.update({
          where: { id: rsvpInvId },
          data: { status: 'RSVP_YES', rsvpPax: 1 },
        });
        const res = await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({ response: 'YES', pax: 3 })
          .expect(200);
        expect(res.body.rsvp.response).toBe('YES');
        expect(res.body.rsvp.pax).toBe(3);
      });

      it('should maintain idempotency (repeated identical NO)', async () => {
        await prisma.invitation.update({
          where: { id: rsvpInvId },
          data: { status: 'RSVP_NO', rsvpPax: null },
        });
        await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({ response: 'NO' })
          .expect(200);
        await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({ response: 'NO' })
          .expect(200);
      });

      it('should allow pax 1', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({ response: 'YES', pax: 1 })
          .expect(200);
        expect(res.body.rsvp.pax).toBe(1);
      });

      it('should allow pax maxPax', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({ response: 'YES', pax: 5 })
          .expect(200);
        expect(res.body.rsvp.pax).toBe(5);
      });

      it('should map OPENED/SENT to PENDING response', async () => {
        await prisma.invitation.update({
          where: { id: rsvpInvId },
          data: { status: 'OPENED' },
        });
        let res = await request(app.getHttpServer())
          .get(`/invitations/public/${rsvpUniqueCode}`)
          .expect(200);
        expect(res.body.rsvp.response).toBe('PENDING');

        await prisma.invitation.update({
          where: { id: rsvpInvId },
          data: { status: 'SENT' },
        });
        res = await request(app.getHttpServer())
          .get(`/invitations/public/${rsvpUniqueCode}`)
          .expect(200);
        expect(res.body.rsvp.response).toBe('PENDING');
      });

      it('should leave Attendance unchanged when RSVP changes', async () => {
        const admin = await prisma.user.findFirst({
          where: { email: 'admin_pub@e2e.test' },
        });
        const att = await prisma.attendance.create({
          data: {
            invitationId: rsvpInvId,
            eventId: rsvpEventId,
            status: 'VALID',
            scannedAt: new Date(),
            scannedPax: 1,
            scannedById: admin.id,
          },
        });
        await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({ response: 'NO' })
          .expect(200);
        const check = await prisma.attendance.findUnique({
          where: { id: att.id },
        });
        expect(check.status).toBe('VALID'); // Unchanged
        await prisma.attendance.delete({ where: { id: att.id } });
      });
      it('should reject NO with null pax (if sent explicitly as null instead of undefined)', async () => {
        await request(app.getHttpServer())
          .patch(`/invitations/public/${rsvpUniqueCode}/rsvp`)
          .send({ response: 'NO', pax: null })
          .expect(400);
      });
    });
  });
});
