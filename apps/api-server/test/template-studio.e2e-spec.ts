/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'database';
import * as argon2 from 'argon2';

describe('Template Studio & Public Parity (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let superAdminToken: string;
  let adminToken: string;
  let staffToken: string;

  let superAdminId: string;
  let adminId: string;
  let staffId: string;

  let templateId: string;
  let eventId: string;
  let guestId: string;
  let invitationId: string;
  let uniqueCode: string;

  const TEST_EMAIL_PREFIX = 'smk_studio_';
  const superAdminEmail = `${TEST_EMAIL_PREFIX}super@e2e.test`;
  const adminEmail = `${TEST_EMAIL_PREFIX}admin@e2e.test`;
  const staffEmail = `${TEST_EMAIL_PREFIX}staff@e2e.test`;

  async function cleanScopedData() {
    try {
      const users = await prisma.user.findMany({
        where: { email: { in: [superAdminEmail, adminEmail, staffEmail] } },
        select: { id: true },
      });
      const userIds = users.map((u) => u.id);

      if (userIds.length > 0) {
        const events = await prisma.event.findMany({
          where: { userId: { in: userIds } },
          select: { id: true },
        });
        const eventIds = events.map((e) => e.id);

        if (eventIds.length > 0) {
          await prisma.attendance.deleteMany({
            where: { eventId: { in: eventIds } },
          });
          await prisma.invitation.deleteMany({
            where: { eventId: { in: eventIds } },
          });
          await prisma.guest.deleteMany({
            where: { eventId: { in: eventIds } },
          });
          await prisma.staffEvent.deleteMany({
            where: { eventId: { in: eventIds } },
          });
          await prisma.event.deleteMany({
            where: { id: { in: eventIds } },
          });
        }
      }

      await prisma.template.deleteMany({
        where: { name: { startsWith: 'E2E Studio ' } },
      });

      await prisma.user.deleteMany({
        where: { email: { in: [superAdminEmail, adminEmail, staffEmail] } },
      });
    } catch {
      // ignore cleanup errors during init
    }
  }

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
    jwtService = app.get<JwtService>(JwtService);

    await cleanScopedData();

    const pwd = await argon2.hash('password1234');

    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        passwordHash: pwd,
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    superAdminId = superAdmin.id;

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    adminId = admin.id;

    const staff = await prisma.user.create({
      data: {
        email: staffEmail,
        passwordHash: pwd,
        role: Role.STAFF,
        isActive: true,
      },
    });
    staffId = staff.id;

    superAdminToken = await jwtService.signAsync({
      sub: superAdmin.id,
      email: superAdmin.email,
      role: superAdmin.role,
    });
    adminToken = await jwtService.signAsync({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });
    staffToken = await jwtService.signAsync({
      sub: staff.id,
      email: staff.email,
      role: staff.role,
    });
  });

  afterAll(async () => {
    await cleanScopedData();
    await app.close();
  });

  describe('Phase 7B-2 Studio Lifecycle & Public Invitation Parity', () => {
    const initialConfig = {
      version: 1,
      theme: {
        primaryColor: '#1c1917',
        secondaryColor: '#78716c',
        backgroundColor: '#fafaf9',
        textColor: '#292524',
      },
      typography: {
        headingFont: 'PLAYFAIR_DISPLAY',
        bodyFont: 'LORA',
      },
      sections: [
        { id: 'hero', enabled: true, order: 1, variant: 'default' },
        { id: 'greeting', enabled: true, order: 2, variant: 'default' },
        { id: 'eventDetails', enabled: true, order: 3, variant: 'default' },
        { id: 'location', enabled: true, order: 4, variant: 'default' },
        { id: 'rsvp', enabled: true, order: 5, variant: 'default' },
      ],
    };

    it('Step 1: SUPER_ADMIN creates template via POST /templates', async () => {
      const res = await request(app.getHttpServer())
        .post('/templates')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'E2E Studio Gold Template',
          themeCode: 'GENERIC',
          config: initialConfig,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('E2E Studio Gold Template');
      expect(res.body.themeCode).toBe('GENERIC');
      expect(res.body.config).toEqual(initialConfig);
      templateId = res.body.id;
    });

    it('Step 2: ADMIN cannot create template (403)', async () => {
      await request(app.getHttpServer())
        .post('/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E Studio Admin Attempt',
          themeCode: 'GENERIC',
          config: initialConfig,
        })
        .expect(403);
    });

    it('Step 3: GET /templates lists the template for ADMIN and SUPER_ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/templates?page=1&limit=50')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find(
        (t: { id: string }) => t.id === templateId,
      );
      expect(found).toBeDefined();
    });

    it('Step 4: STAFF is forbidden from GET /templates (403)', async () => {
      await request(app.getHttpServer())
        .get('/templates')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    const updatedConfig = {
      version: 1,
      theme: {
        primaryColor: '#881337',
        secondaryColor: '#9f1239',
        backgroundColor: '#fff1f2',
        textColor: '#4c0519',
      },
      typography: {
        headingFont: 'MONTSERRAT',
        bodyFont: 'INTER',
      },
      sections: [
        { id: 'hero', enabled: true, order: 1, variant: 'default' },
        { id: 'eventDetails', enabled: true, order: 2, variant: 'default' },
        { id: 'greeting', enabled: false, order: 3, variant: 'default' },
        { id: 'location', enabled: true, order: 4, variant: 'default' },
        { id: 'rsvp', enabled: true, order: 5, variant: 'default' },
      ],
    };

    it('Step 5: SUPER_ADMIN modifies config via PATCH /templates/:id', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/templates/${templateId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'E2E Studio Wine Template',
          config: updatedConfig,
          status: 'AVAILABLE',
        })
        .expect(200);

      expect(res.body.name).toBe('E2E Studio Wine Template');
      expect(res.body.config).toEqual(updatedConfig);
      expect(res.body.status).toBe('AVAILABLE');
    });

    it('Step 6: ADMIN cannot PATCH /templates/:id (403)', async () => {
      await request(app.getHttpServer())
        .patch(`/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E Studio Malicious Override',
        })
        .expect(403);
    });

    it('Step 7: Full domain chain -> Event -> Guest -> Invitation -> Public Parity', async () => {
      // 1. Create Event with assigned templateId
      const eventRes = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'E2E Studio Wedding Gala',
          slug: 'e2e-studio-wedding-gala',
          eventDate: new Date(Date.now() + 86400000).toISOString(),
          locationDetails: 'Grand Ballroom, Jakarta',
          templateId,
        })
        .expect(201);

      eventId = eventRes.body.id;
      expect(eventRes.body.templateId).toBe(templateId);

      // Publish event so invitation is publicly accessible
      await request(app.getHttpServer())
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PUBLISHED' })
        .expect(200);

      // 2. Create Guest
      const guestRes = await request(app.getHttpServer())
        .post(`/events/${eventId}/guests`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Budi Santoso',
          customGreeting: 'Yth. Budi Santoso & Keluarga',
          maxPax: 2,
        })
        .expect(201);

      guestId = guestRes.body.id;

      // 3. Create Invitation
      const invRes = await request(app.getHttpServer())
        .post(`/events/${eventId}/guests/${guestId}/invitation`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customMessage: 'We eagerly await your presence!',
        })
        .expect(201);

      invitationId = invRes.body.id;
      uniqueCode = invRes.body.uniqueCode;
      expect(uniqueCode).toBeDefined();

      // 4. Public Invitation endpoint resolves template and config
      const publicRes = await request(app.getHttpServer())
        .get(`/invitations/public/${uniqueCode}`)
        .expect(200);

      expect(publicRes.body.template).toBeDefined();
      expect(publicRes.body.template.themeCode).toBe('GENERIC');
      expect(publicRes.body.template.config).toEqual(updatedConfig);
      expect(publicRes.body.event.title).toBe('E2E Studio Wedding Gala');
      expect(publicRes.body.guest.name).toBe('Budi Santoso');
    });
  });
});
