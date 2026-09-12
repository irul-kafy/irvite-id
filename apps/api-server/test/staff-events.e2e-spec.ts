/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'database';
import { hash } from 'argon2';

describe('StaffEvents (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;

  let superAdminToken: string;
  let adminOwnerToken: string;
  let adminForeignToken: string;
  let staffToken: string;
  let testEventId: string;
  let staffUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwt = app.get<JwtService>(JwtService);

    // Setup users
    const pwd = await hash('password123');

    const superAdmin = await prisma.user.create({
      data: {
        email: 'superadmin_staffevents@e2e.test',
        passwordHash: pwd,
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    superAdminToken = jwt.sign({ sub: superAdmin.id, role: Role.SUPER_ADMIN });

    const adminOwner = await prisma.user.create({
      data: {
        email: 'adminowner_staffevents@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    adminOwnerToken = jwt.sign({ sub: adminOwner.id, role: Role.ADMIN });

    const adminForeign = await prisma.user.create({
      data: {
        email: 'adminforeign_staffevents@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    adminForeignToken = jwt.sign({ sub: adminForeign.id, role: Role.ADMIN });

    const staff = await prisma.user.create({
      data: {
        email: 'staff_staffevents@e2e.test',
        passwordHash: pwd,
        role: Role.STAFF,
        isActive: true,
      },
    });
    staffToken = jwt.sign({ sub: staff.id, role: Role.STAFF });
    staffUserId = staff.id;

    const event = await prisma.event.create({
      data: {
        userId: adminOwner.id,
        title: 'E2E Staff Events',
        slug: 'e2e-staff-events',
        eventDate: new Date(),
        status: 'PUBLISHED',
      },
    });
    testEventId = event.id;
  });

  afterAll(async () => {
    // Teardown
    await prisma.event.deleteMany({
      where: { slug: 'e2e-staff-events' },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'superadmin_staffevents@e2e.test',
            'adminowner_staffevents@e2e.test',
            'adminforeign_staffevents@e2e.test',
            'staff_staffevents@e2e.test',
          ],
        },
      },
    });
    await app.close();
  });

  describe('Authorization', () => {
    it('POST /events/:eventId/staff should return 401 without token', () => {
      return request(app.getHttpServer())
        .post(`/events/${testEventId}/staff`)
        .send({ userId: staffUserId })
        .expect(401);
    });

    it('POST /events/:eventId/staff should return 403 for STAFF', () => {
      return request(app.getHttpServer())
        .post(`/events/${testEventId}/staff`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ userId: staffUserId })
        .expect(403);
    });

    it('POST /events/:eventId/staff should return 404 for foreign ADMIN', () => {
      return request(app.getHttpServer())
        .post(`/events/${testEventId}/staff`)
        .set('Authorization', `Bearer ${adminForeignToken}`)
        .send({ userId: staffUserId })
        .expect(404);
    });

    it('GET /events/:eventId/staff should return 404 for foreign ADMIN', () => {
      return request(app.getHttpServer())
        .get(`/events/${testEventId}/staff`)
        .set('Authorization', `Bearer ${adminForeignToken}`)
        .expect(404);
    });

    it('DELETE /events/:eventId/staff/:userId should return 404 for foreign ADMIN', () => {
      return request(app.getHttpServer())
        .delete(`/events/${testEventId}/staff/${staffUserId}`)
        .set('Authorization', `Bearer ${adminForeignToken}`)
        .expect(404);
    });

    it('DELETE /events/:eventId/staff/:userId should return 403 for STAFF', () => {
      return request(app.getHttpServer())
        .delete(`/events/${testEventId}/staff/${staffUserId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });
  });

  describe('Management CRUD', () => {
    it('POST /events/:eventId/staff (Success) as OWNER', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${testEventId}/staff`)
        .set('Authorization', `Bearer ${adminOwnerToken}`)
        .send({ userId: staffUserId })
        .expect(201);

      expect(res.body.userId).toBe(staffUserId);
      expect(res.body.eventId).toBe(testEventId);
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('POST /events/:eventId/staff (Duplicate) -> 409', async () => {
      await request(app.getHttpServer())
        .post(`/events/${testEventId}/staff`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ userId: staffUserId })
        .expect(409);
    });

    it('POST /events/:eventId/staff with inactive STAFF -> 400', async () => {
      await prisma.user.update({
        where: { id: staffUserId },
        data: { isActive: false },
      });
      await request(app.getHttpServer())
        .post(`/events/${testEventId}/staff`)
        .set('Authorization', `Bearer ${adminOwnerToken}`)
        .send({ userId: staffUserId })
        .expect(400);
      await prisma.user.update({
        where: { id: staffUserId },
        data: { isActive: true },
      });
    });

    it('POST /events/:eventId/staff with ADMIN target -> 400', async () => {
      const adminOwnerId = jwt.decode(adminOwnerToken)?.sub as string;
      await request(app.getHttpServer())
        .post(`/events/${testEventId}/staff`)
        .set('Authorization', `Bearer ${adminOwnerToken}`)
        .send({ userId: adminOwnerId })
        .expect(400);
    });

    it('POST /events/:eventId/staff with SUPER_ADMIN target -> 400', async () => {
      const superAdminId = jwt.decode(superAdminToken)?.sub as string;
      await request(app.getHttpServer())
        .post(`/events/${testEventId}/staff`)
        .set('Authorization', `Bearer ${adminOwnerToken}`)
        .send({ userId: superAdminId })
        .expect(400);
    });

    it('POST /events/:eventId/staff with unknown target -> 404', async () => {
      await request(app.getHttpServer())
        .post(`/events/${testEventId}/staff`)
        .set('Authorization', `Bearer ${adminOwnerToken}`)
        .send({ userId: 'f3b4c1a2-5e6d-4f7c-8b9a-0e1d2c3b4a5f' })
        .expect(404);
    });

    it('POST /events/:eventId/staff with extra field -> 400', async () => {
      await request(app.getHttpServer())
        .post(`/events/${testEventId}/staff`)
        .set('Authorization', `Bearer ${adminOwnerToken}`)
        .send({ userId: staffUserId, extra: 'bad' })
        .expect(400);
    });

    it('POST /events/:eventId/staff on DRAFT Event is allowed', async () => {
      const draftEvent = await prisma.event.create({
        data: {
          userId: jwt.decode(adminOwnerToken)?.sub as string,
          title: 'Draft',
          slug: 'draft-e2e',
          status: 'DRAFT',
          eventDate: new Date(),
        },
      });
      await request(app.getHttpServer())
        .post(`/events/${draftEvent.id}/staff`)
        .set('Authorization', `Bearer ${adminOwnerToken}`)
        .send({ userId: staffUserId })
        .expect(201);
      await prisma.staffEvent.deleteMany({ where: { eventId: draftEvent.id } });
      await prisma.event.delete({ where: { id: draftEvent.id } });
    });

    it('GET /events/:eventId/staff -> lists assignments', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${testEventId}/staff`)
        .set('Authorization', `Bearer ${adminOwnerToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].userId).toBe(staffUserId);
      expect(res.body.data[0].email).toBe('staff_staffevents@e2e.test');
      expect(res.body.data[0].role).toBe(Role.STAFF);
      expect(res.body.data[0].isActive).toBe(true);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body.data[0]).not.toHaveProperty('passwordHash');
      expect(res.body.data[0]).toHaveProperty('createdAt');
    });

    it('GET /events/:eventId/staff -> shows stale assignment', async () => {
      // make staff inactive and change role
      await prisma.user.update({
        where: { id: staffUserId },
        data: { isActive: false, role: Role.ADMIN },
      });
      const res = await request(app.getHttpServer())
        .get(`/events/${testEventId}/staff`)
        .set('Authorization', `Bearer ${adminOwnerToken}`)
        .expect(200);

      expect(res.body.data[0].isActive).toBe(false);
      expect(res.body.data[0].role).toBe(Role.ADMIN);

      // restore
      await prisma.user.update({
        where: { id: staffUserId },
        data: { isActive: true, role: Role.STAFF },
      });
    });

    it('DELETE /events/:eventId/staff/:userId -> 204', async () => {
      await request(app.getHttpServer())
        .delete(`/events/${testEventId}/staff/${staffUserId}`)
        .set('Authorization', `Bearer ${adminOwnerToken}`)
        .expect(204);

      const res = await request(app.getHttpServer())
        .get(`/events/${testEventId}/staff`)
        .set('Authorization', `Bearer ${adminOwnerToken}`)
        .expect(200);
      expect(res.body.data.length).toBe(0);
    });

    it('DELETE /events/:eventId/staff/:userId (Missing) -> 404', async () => {
      await request(app.getHttpServer())
        .delete(`/events/${testEventId}/staff/${staffUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);
    });
  });

  describe('Integration with Phase 6A (Attendance)', () => {
    let testInvitationCode: string;

    beforeAll(async () => {
      // Create guest and invitation for testEventId
      const guest = await prisma.guest.create({
        data: {
          eventId: testEventId,
          name: 'E2E Int Guest',
          maxPax: 2,
        },
      });
      const inv = await prisma.invitation.create({
        data: {
          guestId: guest.id,
          eventId: testEventId,
          uniqueCode: 'E2ESTAFFINT00000000000',
          status: 'RSVP_YES',
          rsvpPax: 2,
        },
      });
      testInvitationCode = inv.uniqueCode;
    });

    it('STAFF receives 404 on attendance resolution if unassigned', async () => {
      // Make sure STAFF is not assigned
      await prisma.staffEvent.deleteMany({
        where: { userId: staffUserId, eventId: testEventId },
      });

      await request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/resolve`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: testInvitationCode })
        .expect(404);
    });

    it('STAFF succeeds on attendance resolution after being assigned', async () => {
      // Admin assigns STAFF
      await request(app.getHttpServer())
        .post(`/events/${testEventId}/staff`)
        .set('Authorization', `Bearer ${adminOwnerToken}`)
        .send({ userId: staffUserId })
        .expect(201);

      // STAFF resolves
      const res = await request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/resolve`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: testInvitationCode })
        .expect(200);

      expect(res.body.result).toBe('READY');

      // Admin unassigns STAFF
      await request(app.getHttpServer())
        .delete(`/events/${testEventId}/staff/${staffUserId}`)
        .set('Authorization', `Bearer ${adminOwnerToken}`)
        .expect(204);

      // STAFF resolves again -> 404
      await request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/resolve`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: testInvitationCode })
        .expect(404);
    });

    it('STAFF blocked if made inactive, even though assigned', async () => {
      // Re-assign for this test
      await prisma.staffEvent.create({
        data: { eventId: testEventId, userId: staffUserId },
      });
      // Make staff inactive
      await prisma.user.update({
        where: { id: staffUserId },
        data: { isActive: false },
      });

      // Staff tries to resolve (auth guard or service will block)
      await request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/resolve`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: testInvitationCode })
        .expect(401); // Global JWT guard throws 401 for inactive

      // Restore active for teardown
      await prisma.user.update({
        where: { id: staffUserId },
        data: { isActive: true },
      });
    });
  });
});
