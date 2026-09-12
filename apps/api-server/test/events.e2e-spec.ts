/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'database';
import * as argon2 from 'argon2';

describe('EventsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let superToken: string;
  let adminAToken: string;
  let adminBToken: string;
  let staffToken: string;

  let adminAId: string;
  let adminBId: string;
  let eventAId: string;
  let eventBId: string;
  let lifecycleEventId: string;

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

    // Clean up potentially conflicting records
    const userEmails = [
      'super_e@e2e.test',
      'admin_a@e2e.test',
      'admin_b@e2e.test',
      'staff_e@e2e.test',
    ];

    const usersToDelete = await prisma.user.findMany({
      where: { email: { in: userEmails } },
      select: { id: true },
    });
    const userIds = usersToDelete.map((u) => u.id);

    await prisma.event.deleteMany({
      where: { userId: { in: userIds } },
    });

    await prisma.user.deleteMany({
      where: { email: { in: userEmails } },
    });

    const pwd = await argon2.hash('password1234');

    const superAdmin = await prisma.user.create({
      data: {
        email: 'super_e@e2e.test',
        passwordHash: pwd,
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    const adminA = await prisma.user.create({
      data: {
        email: 'admin_a@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    adminAId = adminA.id;

    const adminB = await prisma.user.create({
      data: {
        email: 'admin_b@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    adminBId = adminB.id;

    const staff = await prisma.user.create({
      data: {
        email: 'staff_e@e2e.test',
        passwordHash: pwd,
        role: Role.STAFF,
        isActive: true,
      },
    });

    superToken = await jwtService.signAsync({
      sub: superAdmin.id,
      email: superAdmin.email,
      role: superAdmin.role,
    });
    adminAToken = await jwtService.signAsync({
      sub: adminA.id,
      email: adminA.email,
      role: adminA.role,
    });
    adminBToken = await jwtService.signAsync({
      sub: adminB.id,
      email: adminB.email,
      role: adminB.role,
    });
    staffToken = await jwtService.signAsync({
      sub: staff.id,
      email: staff.email,
      role: staff.role,
    });

    // Create Event A
    const eventA = await prisma.event.create({
      data: {
        userId: adminAId,
        title: 'Admin A Event',
        slug: 'admin-a-event',
        eventDate: new Date().toISOString(),
      },
    });
    eventAId = eventA.id;

    // Create Event B
    const eventB = await prisma.event.create({
      data: {
        userId: adminBId,
        title: 'Admin B Event',
        slug: 'admin-b-event',
        eventDate: new Date().toISOString(),
      },
    });
    eventBId = eventB.id;
  });

  afterAll(async () => {
    // Teardown Events FIRST
    await prisma.event.deleteMany({
      where: {
        slug: {
          in: [
            'admin-a-event',
            'admin-b-event',
            'super-admin-event',
            'new-admin-event',
          ],
        },
      },
    });
    // Teardown Users
    const userEmails = [
      'super_e@e2e.test',
      'admin_a@e2e.test',
      'admin_b@e2e.test',
      'staff_e@e2e.test',
    ];

    const usersToDelete = await prisma.user.findMany({
      where: { email: { in: userEmails } },
      select: { id: true },
    });
    const userIds = usersToDelete.map((u) => u.id);

    await prisma.event.deleteMany({
      where: { userId: { in: userIds } },
    });

    await prisma.user.deleteMany({
      where: { email: { in: userEmails } },
    });
    await app.close();
  });

  describe('Event Status Lifecycle', () => {
    it('POST Event without status -> created status DRAFT', () => {
      return request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          title: 'Draft Event',
          slug: 'draft-event',
          eventDate: new Date().toISOString(),
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.status).toBe('DRAFT');
          lifecycleEventId = res.body.id;
        });
    });

    it('POST Event with status field -> 400', () => {
      return request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          title: 'Hacked Event',
          slug: 'hacked-event',
          eventDate: new Date().toISOString(),
          status: 'PUBLISHED',
        })
        .expect(400);
    });

    it('PATCH owned Event: DRAFT -> PUBLISHED -> 200', () => {
      return request(app.getHttpServer())
        .patch(`/events/${lifecycleEventId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ status: 'PUBLISHED' })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('PUBLISHED');
        });
    });

    it('PATCH: PUBLISHED -> DRAFT -> 200', () => {
      return request(app.getHttpServer())
        .patch(`/events/${lifecycleEventId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ status: 'DRAFT' })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('DRAFT');
        });
    });

    it('PATCH arbitrary status -> 400', () => {
      return request(app.getHttpServer())
        .patch(`/events/${lifecycleEventId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });

    it('PATCH status null -> 400', () => {
      return request(app.getHttpServer())
        .patch(`/events/${lifecycleEventId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ status: null })
        .expect(400);
    });

    it('Cross-tenant status PATCH -> 404', () => {
      return request(app.getHttpServer())
        .patch(`/events/${lifecycleEventId}`)
        .set('Authorization', `Bearer ${adminBToken}`) // Admin B trying to publish Admin A's event
        .send({ status: 'PUBLISHED' })
        .expect(404);
    });
  });

  describe('IDOR & Isolation Tests', () => {
    it('ADMIN A can read their own Event A', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventAId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Admin A Event');
        });
    });

    it('ADMIN A CANNOT read ADMIN B Event B (404)', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventBId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(404);
    });

    it('ADMIN B CANNOT read ADMIN A Event A (404)', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventAId}`)
        .set('Authorization', `Bearer ${adminBToken}`)
        .expect(404);
    });

    it('ADMIN A can list events and only sees Event A', () => {
      return request(app.getHttpServer())
        .get('/events')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200)
        .expect((res) => {
          const ids = res.body.data.map((e: any) => e.id);
          expect(ids).toContain(eventAId);
          // Lifecycle event might or might not exist depending on test order
          const expectedLength = ids.includes(lifecycleEventId) ? 2 : 1;
          expect(ids).toHaveLength(expectedLength);
          expect(ids).toHaveLength(expectedLength);
        });
    });

    it('ADMIN A can update Event A', () => {
      return request(app.getHttpServer())
        .patch(`/events/${eventAId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ title: 'Admin A Updated' })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Admin A Updated');
        });
    });

    it('ADMIN A CANNOT update Event B (404)', () => {
      return request(app.getHttpServer())
        .patch(`/events/${eventBId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ title: 'Hacked by A' })
        .expect(404);
    });

    it('SUPER_ADMIN can read all events (global access)', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventAId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);
    });

    it('SUPER_ADMIN can list all events and see both Event A and B', () => {
      return request(app.getHttpServer())
        .get('/events?limit=50')
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200)
        .expect((res) => {
          const ids = res.body.data.map((e: any) => e.id);
          expect(ids).toContain(eventAId);
          expect(ids).toContain(eventBId);
        });
    });

    it('SUPER_ADMIN can update Event B', () => {
      return request(app.getHttpServer())
        .patch(`/events/${eventBId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ title: 'Super Updated' })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Super Updated');
        });
    });
  });

  describe('Security Body/Malicious Injection', () => {
    it('ADMIN A cannot assign event to ADMIN B through body', () => {
      return request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          title: 'New Admin Event',
          slug: 'new-admin-event',
          eventDate: new Date().toISOString(),
          userId: adminBId, // Malicious injection
        })
        .expect(400); // ValidationPipe (forbidNonWhitelisted) blocks it
    });

    it('ADMIN A cannot modify ownership through PATCH', async () => {
      await request(app.getHttpServer())
        .patch(`/events/${eventAId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          userId: adminBId,
        })
        .expect(400);

      // Verify ownership remains unchanged
      return request(app.getHttpServer())
        .get(`/events/${eventAId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);
    });
  });

  describe('STAFF Access', () => {
    it('STAFF cannot list events (403)', () => {
      return request(app.getHttpServer())
        .get('/events')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('STAFF cannot read event (403)', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventAId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('STAFF cannot create event (403)', () => {
      return request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Staff Event',
          slug: 'staff-ev',
          eventDate: new Date().toISOString(),
        })
        .expect(403);
    });

    it('STAFF cannot patch event (403)', () => {
      return request(app.getHttpServer())
        .patch(`/events/${eventAId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ title: 'Staff Patch' })
        .expect(403);
    });
  });

  describe('No JWT', () => {
    it('Returns 401 for GET /events', () => {
      return request(app.getHttpServer()).get('/events').expect(401);
    });

    it('Returns 401 for GET /events/:id', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventAId}`)
        .expect(401);
    });

    it('Returns 401 for POST /events', () => {
      return request(app.getHttpServer()).post('/events').send({}).expect(401);
    });

    it('Returns 401 for PATCH /events/:id', () => {
      return request(app.getHttpServer())
        .patch(`/events/${eventAId}`)
        .send({})
        .expect(401);
    });
  });
});
