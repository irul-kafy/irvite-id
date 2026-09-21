/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'database';
import * as argon2 from 'argon2';
import { syncTemplateIdentities } from '../src/templates/sync-templates';

describe('TemplatesController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let superAdminToken: string;
  let adminToken: string;
  let staffToken: string;
  let superAdminUserId: string;

  let templateId: string;
  const testTemplateNames = [
    'E2E Test Template',
    'E2E Admin Template',
    'E2E Dynamic Avail',
    'E2E Dynamic Hidden',
    'E2E Dynamic Used',
    'E2E Dynamic Unused',
    'E2E Built-in Archived Mock',
  ];

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

    // Clean up test events first
    await prisma.event.deleteMany({
      where: { slug: { in: ['e2e-test-event-ref-tpl'] } },
    });
    // Clean up test templates
    await prisma.template.deleteMany({
      where: { name: { in: testTemplateNames } },
    });
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'super_tpl@e2e.test',
            'admin_tpl@e2e.test',
            'staff_tpl@e2e.test',
          ],
        },
      },
    });

    const pwd = await argon2.hash('password1234');

    const superAdmin = await prisma.user.create({
      data: {
        email: 'super_tpl@e2e.test',
        passwordHash: pwd,
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    superAdminUserId = superAdmin.id;

    const admin = await prisma.user.create({
      data: {
        email: 'admin_tpl@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    const staff = await prisma.user.create({
      data: {
        email: 'staff_tpl@e2e.test',
        passwordHash: pwd,
        role: Role.STAFF,
        isActive: true,
      },
    });

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
    // Clean up test events
    await prisma.event.deleteMany({
      where: { slug: { in: ['e2e-test-event-ref-tpl'] } },
    });
    // Clean up test templates
    await prisma.template.deleteMany({
      where: { name: { in: testTemplateNames } },
    });
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'super_tpl@e2e.test',
            'admin_tpl@e2e.test',
            'staff_tpl@e2e.test',
          ],
        },
      },
    });
    await app.close();
  });

  describe('POST /templates', () => {
    it('SUPER_ADMIN should create a template', () => {
      const validV1Config = {
        version: 1,
        theme: {
          primaryColor: '#111827',
          secondaryColor: '#4b5563',
          backgroundColor: '#f9fafb',
          textColor: '#111827',
        },
        typography: {
          headingFont: 'INTER',
          bodyFont: 'INTER',
        },
        sections: [
          { id: 'hero', enabled: true, order: 1, variant: 'default' },
          { id: 'eventDetails', enabled: true, order: 2, variant: 'default' },
        ],
      };

      return request(app.getHttpServer())
        .post('/templates')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'E2E Test Template',
          themeCode: 'THEME_E2E',
          config: validV1Config,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('E2E Test Template');
          expect(res.body.config).toEqual(validV1Config);
          templateId = res.body.id; // Save for GET tests
        });
    });

    it('ADMIN should be forbidden from creating', () => {
      return request(app.getHttpServer())
        .post('/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E Admin Template',
          themeCode: 'THEME_E2E_ADMIN',
        })
        .expect(403);
    });
  });

  describe('GET /templates', () => {
    it('ADMIN should get list of templates with eventUsageCount', () => {
      return request(app.getHttpServer())
        .get('/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta).toBeDefined();
          // Verify eventUsageCount is present as number and raw _count is not exposed
          for (const t of res.body.data) {
            expect(typeof t.eventUsageCount).toBe('number');
            expect(t._count).toBeUndefined();
          }
        });
    });

    it('SUPER_ADMIN should get template detail with eventUsageCount', () => {
      return request(app.getHttpServer())
        .get(`/templates/${templateId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(templateId);
          expect(typeof res.body.eventUsageCount).toBe('number');
          expect(res.body._count).toBeUndefined();
        });
    });

    it('STAFF should be forbidden', () => {
      return request(app.getHttpServer())
        .get('/templates')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('No token should be unauthorized', () => {
      return request(app.getHttpServer()).get('/templates').expect(401);
    });
  });

  describe('DELETE /templates/:id/permanent', () => {
    const nonexistentUuid = 'a0000000-0000-0000-0000-000000000000';

    it('should return 401 if unauthenticated', async () => {
      await request(app.getHttpServer())
        .delete(`/templates/${nonexistentUuid}/permanent`)
        .expect(401);
    });

    it('should return 403 if requester is STAFF', async () => {
      await request(app.getHttpServer())
        .delete(`/templates/${nonexistentUuid}/permanent`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('should return 403 if requester is ADMIN', async () => {
      await request(app.getHttpServer())
        .delete(`/templates/${nonexistentUuid}/permanent`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should return 404 for nonexistent valid UUID', async () => {
      await request(app.getHttpServer())
        .delete(`/templates/${nonexistentUuid}/permanent`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);
    });

    it('should return 409 Conflict if attempting to delete built-in AVAILABLE template', async () => {
      const builtIn = await prisma.template.findFirst({
        where: { themeCode: 'IVORY_GARDEN' },
      });
      expect(builtIn).toBeDefined();

      const res = await request(app.getHttpServer())
        .delete(`/templates/${builtIn!.id}/permanent`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(409);

      expect(res.body.message).toMatch(
        /Built-in system templates cannot be permanently deleted/,
      );

      // Verify row still exists in DB untouched
      const afterCheck = await prisma.template.findUnique({
        where: { id: builtIn!.id },
      });
      expect(afterCheck).not.toBeNull();
      expect(afterCheck!.status).toBe(builtIn!.status);
    });

    it('should return 409 Conflict if attempting to delete built-in ARCHIVED template', async () => {
      // Create isolated test fixture for built-in archived template
      const builtInArchivedFixture = await prisma.template.create({
        data: {
          name: 'E2E Built-in Archived Mock',
          themeCode: 'SERENE_GARDEN',
          status: 'ARCHIVED',
        },
      });

      try {
        const res = await request(app.getHttpServer())
          .delete(`/templates/${builtInArchivedFixture.id}/permanent`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(409);

        expect(res.body.message).toMatch(
          /Built-in system templates cannot be permanently deleted/,
        );
      } finally {
        await prisma.template.deleteMany({
          where: { id: builtInArchivedFixture.id },
        });
      }
    });

    it('should return 400 BadRequest if dynamic template is AVAILABLE', async () => {
      const dynAvail = await prisma.template.create({
        data: {
          name: 'E2E Dynamic Avail',
          themeCode: 'E2E_DYN_AVAIL',
          status: 'AVAILABLE',
        },
      });

      try {
        const res = await request(app.getHttpServer())
          .delete(`/templates/${dynAvail.id}/permanent`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(400);

        expect(res.body.message).toMatch(
          /Only archived templates can be permanently deleted/,
        );
      } finally {
        await prisma.template.deleteMany({ where: { id: dynAvail.id } });
      }
    });

    it('should return 400 BadRequest if dynamic template is HIDDEN', async () => {
      const dynHidden = await prisma.template.create({
        data: {
          name: 'E2E Dynamic Hidden',
          themeCode: 'E2E_DYN_HIDDEN',
          status: 'HIDDEN',
        },
      });

      try {
        const res = await request(app.getHttpServer())
          .delete(`/templates/${dynHidden.id}/permanent`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(400);

        expect(res.body.message).toMatch(
          /Only archived templates can be permanently deleted/,
        );
      } finally {
        await prisma.template.deleteMany({ where: { id: dynHidden.id } });
      }
    });

    it('should return 409 Conflict if dynamic archived template is referenced by an Event, and keep event untouched', async () => {
      const dynUsed = await prisma.template.create({
        data: {
          name: 'E2E Dynamic Used',
          themeCode: 'E2E_DYN_USED',
          status: 'ARCHIVED',
        },
      });

      const eventRef = await prisma.event.create({
        data: {
          title: 'E2E Template Ref Event',
          slug: 'e2e-test-event-ref-tpl',
          userId: superAdminUserId,
          templateId: dynUsed.id,
          eventDate: new Date(),
        },
      });

      try {
        const res = await request(app.getHttpServer())
          .delete(`/templates/${dynUsed.id}/permanent`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(409);

        expect(res.body.message).toMatch(/referenced by 1 event/);

        // Verify Event row and Template row remain completely untouched
        const eventCheck = await prisma.event.findUnique({
          where: { id: eventRef.id },
        });
        expect(eventCheck).not.toBeNull();
        expect(eventCheck?.templateId).toBe(dynUsed.id);

        const templateCheck = await prisma.template.findUnique({
          where: { id: dynUsed.id },
        });
        expect(templateCheck).not.toBeNull();
      } finally {
        await prisma.event.deleteMany({ where: { id: eventRef.id } });
        await prisma.template.deleteMany({ where: { id: dynUsed.id } });
      }
    });

    it('should succeed (200) when SUPER_ADMIN deletes unused ARCHIVED dynamic template without affecting other records', async () => {
      const dynUnused = await prisma.template.create({
        data: {
          name: 'E2E Dynamic Unused',
          themeCode: 'E2E_DYN_UNUSED',
          status: 'ARCHIVED',
        },
      });

      const res = await request(app.getHttpServer())
        .delete(`/templates/${dynUnused.id}/permanent`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.message).toMatch(/permanently deleted successfully/);
      expect(res.body.data.id).toBe(dynUnused.id);
      expect(res.body.data.themeCode).toBe('E2E_DYN_UNUSED');

      // Verify row is deleted from DB
      const checkDb = await prisma.template.findUnique({
        where: { id: dynUnused.id },
      });
      expect(checkDb).toBeNull();

      // Verify syncTemplateIdentities does NOT recreate a deleted dynamic template
      const syncResults = await syncTemplateIdentities(prisma);
      expect(syncResults.filter((r) => r.action === 'CREATED').length).toBe(0);

      const checkRecreated = await prisma.template.findFirst({
        where: { themeCode: 'E2E_DYN_UNUSED' },
      });
      expect(checkRecreated).toBeNull();

      // Verify all 5 built-in templates are still present
      const builtInCount = await prisma.template.count({
        where: {
          themeCode: {
            in: [
              'IVORY_GARDEN',
              'SERENE_GARDEN',
              'SUNDA_PUSPA',
              'CLASSIC_LETTER',
              'VELVET_LETTER',
            ],
          },
        },
      });
      expect(builtInCount).toBe(5);
    });
  });
});
