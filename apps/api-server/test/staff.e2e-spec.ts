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

describe('StaffController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let superToken: string;
  let adminToken: string;
  let staffToken: string;

  let superAdminId: string;
  let adminId: string;
  let staffActiveId: string;

  const testEmails = [
    'staffc_super@e2e.test',
    'staffc_admin@e2e.test',
    'staffc_active@e2e.test',
    'staffc_inactive@e2e.test',
    'staffc_crud@e2e.test',
    'staffc_crud_updated@e2e.test',
    'staff.spaced.operator@example.com',
    'staff.updated.operator@example.com',
    'staff_jwt_mvp@e2e.test',
    'scanner_p6_staff@e2e.test',
  ];

  const cleanupUsersAndEvents = async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: testEmails } },
      select: { id: true },
    });
    const uids = users.map((u) => u.id);
    if (uids.length > 0) {
      await prisma.attendance.deleteMany({
        where: { scannedById: { in: uids } },
      });
      await prisma.staffEvent.deleteMany({ where: { userId: { in: uids } } });
      const events = await prisma.event.findMany({
        where: {
          OR: [
            { userId: { in: uids } },
            { slug: { startsWith: 'p6-integration-event' } },
          ],
        },
        select: { id: true },
      });
      const eids = events.map((e) => e.id);
      if (eids.length > 0) {
        await prisma.attendance.deleteMany({
          where: { eventId: { in: eids } },
        });
        await prisma.invitation.deleteMany({
          where: { eventId: { in: eids } },
        });
        await prisma.guest.deleteMany({ where: { eventId: { in: eids } } });
        await prisma.staffEvent.deleteMany({
          where: { eventId: { in: eids } },
        });
        await prisma.event.deleteMany({ where: { id: { in: eids } } });
      }
      await prisma.user.deleteMany({ where: { id: { in: uids } } });
    }
  };

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

    const pwd = await argon2.hash('password1234');

    await cleanupUsersAndEvents();

    const superAdmin = await prisma.user.create({
      data: {
        email: 'staffc_super@e2e.test',
        passwordHash: pwd,
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    superAdminId = superAdmin.id;

    const admin = await prisma.user.create({
      data: {
        email: 'staffc_admin@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    adminId = admin.id;

    const staffActive = await prisma.user.create({
      data: {
        email: 'staffc_active@e2e.test',
        passwordHash: pwd,
        role: Role.STAFF,
        isActive: true,
      },
    });
    staffActiveId = staffActive.id;

    await prisma.user.create({
      data: {
        email: 'staffc_inactive@e2e.test',
        passwordHash: pwd,
        role: Role.STAFF,
        isActive: false,
      },
    });

    superToken = await jwtService.signAsync({
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
      sub: staffActive.id,
      email: staffActive.email,
      role: staffActive.role,
    });
  });

  afterAll(async () => {
    await cleanupUsersAndEvents();
    await app.close();
  });

  describe('Existing GET /staff/candidates', () => {
    it('No JWT -> 401', () => {
      return request(app.getHttpServer()).get('/staff/candidates').expect(401);
    });

    it('SUPER_ADMIN -> 200', () => {
      return request(app.getHttpServer())
        .get('/staff/candidates')
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200)
        .expect((res) => {
          const ids = res.body.data.map((u: any) => u.id);
          expect(ids).toContain(staffActiveId);
          const emails = res.body.data.map((u: any) => u.email);
          expect(emails).not.toContain('staffc_super@e2e.test');
          expect(emails).not.toContain('staffc_admin@e2e.test');
          expect(emails).not.toContain('staffc_inactive@e2e.test');
          expect(res.body.data[0].passwordHash).toBeUndefined();
        });
    });

    it('ADMIN -> 200', () => {
      return request(app.getHttpServer())
        .get('/staff/candidates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          const ids = res.body.data.map((u: any) => u.id);
          expect(ids).toContain(staffActiveId);
        });
    });

    it('STAFF -> 403', () => {
      return request(app.getHttpServer())
        .get('/staff/candidates')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });
  });

  describe('SUPER_ADMIN staff management endpoints', () => {
    let createdStaffId: string;

    it('GET /staff -> 200 list with pagination and meta', async () => {
      const res = await request(app.getHttpServer())
        .get('/staff?page=1&limit=10')
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(10);
      expect(res.body.data[0].passwordHash).toBeUndefined();
      expect(res.body.data[0]).toHaveProperty('assignedEventCount');
    });

    it('POST /staff -> 201 creates STAFF, forces role STAFF, omits password', async () => {
      const res = await request(app.getHttpServer())
        .post('/staff')
        .set('Authorization', `Bearer ${superToken}`)
        .send({
          email: 'staffc_crud@e2e.test',
          password: 'initialpassword1234',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      createdStaffId = res.body.id;
      expect(res.body.email).toBe('staffc_crud@e2e.test');
      expect(res.body.role).toBe(Role.STAFF);
      expect(res.body.isActive).toBe(true);
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('POST /staff duplicate email -> 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/staff')
        .set('Authorization', `Bearer ${superToken}`)
        .send({
          email: 'staffc_crud@e2e.test',
          password: 'initialpassword1234',
        })
        .expect(409);
    });

    it('POST /staff with password < 12 chars -> 400', async () => {
      await request(app.getHttpServer())
        .post('/staff')
        .set('Authorization', `Bearer ${superToken}`)
        .send({
          email: 'short_pwd@e2e.test',
          password: 'short',
        })
        .expect(400);
    });

    it('POST /staff with role field rejected by whitelist -> 400', async () => {
      await request(app.getHttpServer())
        .post('/staff')
        .set('Authorization', `Bearer ${superToken}`)
        .send({
          email: 'role_escalation@e2e.test',
          password: 'initialpassword1234',
          role: Role.SUPER_ADMIN,
        })
        .expect(400);
    });

    it('GET /staff/:staffId -> 200 returns detail with assignedEvents', async () => {
      const res = await request(app.getHttpServer())
        .get(`/staff/${createdStaffId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdStaffId);
      expect(res.body.email).toBe('staffc_crud@e2e.test');
      expect(res.body.role).toBe(Role.STAFF);
      expect(res.body.assignedEvents).toBeInstanceOf(Array);
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('PATCH /staff/:staffId -> 200 updates email', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/staff/${createdStaffId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ email: 'staffc_crud_updated@e2e.test' })
        .expect(200);

      expect(res.body.email).toBe('staffc_crud_updated@e2e.test');
    });

    it('POST /staff with spaced and uppercase email normalizes stored email -> 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/staff')
        .set('Authorization', `Bearer ${superToken}`)
        .send({
          email: '  Staff.Spaced.Operator@Example.COM  ',
          password: 'password1234',
        })
        .expect(201);

      expect(res.body.email).toBe('staff.spaced.operator@example.com');
      const inDb = await prisma.user.findUnique({
        where: { email: 'staff.spaced.operator@example.com' },
      });
      expect(inDb).not.toBeNull();
      expect(inDb?.email).toBe('staff.spaced.operator@example.com');
    });

    it('PATCH /staff/:id with spaced and uppercase email normalizes email -> 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/staff/${staffActiveId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({
          email: '  Staff.Updated.Operator@Example.COM  ',
        })
        .expect(200);

      expect(res.body.email).toBe('staff.updated.operator@example.com');
      const inDb = await prisma.user.findUnique({
        where: { email: 'staff.updated.operator@example.com' },
      });
      expect(inDb).not.toBeNull();
      expect(inDb?.email).toBe('staff.updated.operator@example.com');
    });

    it('PATCH /staff/:staffId -> 200 deactivates staff', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/staff/${createdStaffId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(res.body.isActive).toBe(false);

      // Verify excluded from candidates list
      const candRes = await request(app.getHttpServer())
        .get('/staff/candidates')
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);

      const ids = candRes.body.data.map((u: any) => u.id);
      expect(ids).not.toContain(createdStaffId);
    });

    it('PATCH /staff/:staffId -> 200 reactivates staff', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/staff/${createdStaffId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ isActive: true })
        .expect(200);

      expect(res.body.isActive).toBe(true);

      // Verify included in candidates list again
      const candRes = await request(app.getHttpServer())
        .get('/staff/candidates')
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);

      const ids = candRes.body.data.map((u: any) => u.id);
      expect(ids).toContain(createdStaffId);
    });

    it('PATCH /staff/:staffId/password -> 204 resets password', async () => {
      await request(app.getHttpServer())
        .patch(`/staff/${createdStaffId}/password`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ password: 'brandnewpassword1234' })
        .expect(204);

      // Verify login with new password works
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'staffc_crud_updated@e2e.test',
          password: 'brandnewpassword1234',
        })
        .expect(200);

      expect(loginRes.body.accessToken).toBeDefined();

      // Verify old password fails
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'staffc_crud_updated@e2e.test',
          password: 'initialpassword1234',
        })
        .expect(401);

      // Verify previously-issued JWT remains valid while account remains active (Known MVP limitation)
      const tokenBeforeReset = await jwtService.signAsync({
        sub: createdStaffId,
        email: 'staffc_crud_updated@e2e.test',
        role: Role.STAFF,
      });
      await request(app.getHttpServer())
        .get('/scanner/events')
        .set('Authorization', `Bearer ${tokenBeforeReset}`)
        .expect(200);
    });

    it('GET /staff/:id targeting ADMIN -> 404 opaque', async () => {
      await request(app.getHttpServer())
        .get(`/staff/${adminId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .expect(404);
    });

    it('GET /staff/:id targeting SUPER_ADMIN -> 404 opaque', async () => {
      await request(app.getHttpServer())
        .get(`/staff/${superAdminId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .expect(404);
    });
  });

  describe('ADMIN RBAC restrictions on global staff management', () => {
    it('GET /staff -> 403', () => {
      return request(app.getHttpServer())
        .get('/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('POST /staff -> 403', () => {
      return request(app.getHttpServer())
        .post('/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'hacker@test.com', password: 'password1234' })
        .expect(403);
    });

    it('GET /staff/:id -> 403', () => {
      return request(app.getHttpServer())
        .get(`/staff/${staffActiveId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('PATCH /staff/:id -> 403', () => {
      return request(app.getHttpServer())
        .patch(`/staff/${staffActiveId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(403);
    });

    it('PATCH /staff/:id/password -> 403', () => {
      return request(app.getHttpServer())
        .patch(`/staff/${staffActiveId}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'newpassword1234' })
        .expect(403);
    });
  });

  describe('STAFF RBAC restrictions on all global staff management', () => {
    it('GET /staff -> 403', () => {
      return request(app.getHttpServer())
        .get('/staff')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('POST /staff -> 403', () => {
      return request(app.getHttpServer())
        .post('/staff')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ email: 'hacker@test.com', password: 'password1234' })
        .expect(403);
    });

    it('GET /staff/:id -> 403', () => {
      return request(app.getHttpServer())
        .get(`/staff/${staffActiveId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('PATCH /staff/:id -> 403', () => {
      return request(app.getHttpServer())
        .patch(`/staff/${staffActiveId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ isActive: false })
        .expect(403);
    });

    it('PATCH /staff/:id/password -> 403', () => {
      return request(app.getHttpServer())
        .patch(`/staff/${staffActiveId}/password`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ password: 'newpassword1234' })
        .expect(403);
    });
  });

  describe('Unauthenticated access -> 401', () => {
    it('GET /staff -> 401', () => {
      return request(app.getHttpServer()).get('/staff').expect(401);
    });

    it('POST /staff -> 401', () => {
      return request(app.getHttpServer()).post('/staff').expect(401);
    });

    it('GET /staff/:id -> 401', () => {
      return request(app.getHttpServer())
        .get(`/staff/${staffActiveId}`)
        .expect(401);
    });

    it('PATCH /staff/:id -> 401', () => {
      return request(app.getHttpServer())
        .patch(`/staff/${staffActiveId}`)
        .expect(401);
    });

    it('PATCH /staff/:id/password -> 401', () => {
      return request(app.getHttpServer())
        .patch(`/staff/${staffActiveId}/password`)
        .expect(401);
    });
  });

  describe('Known MVP JWT limitation behavior', () => {
    it('password reset invalidates old password login, allows new password, and existing JWT remains valid while active', async () => {
      // 1. Create dedicated staff
      const pwd = await argon2.hash('InitialPass1234');
      const staffUser = await prisma.user.create({
        data: {
          email: 'staff_jwt_mvp@e2e.test',
          passwordHash: pwd,
          role: Role.STAFF,
          isActive: true,
        },
      });

      // 2. Login with initial password to obtain JWT
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'staff_jwt_mvp@e2e.test',
          password: 'InitialPass1234',
        })
        .expect(200);
      const originalJwt = loginRes.body.accessToken;
      expect(originalJwt).toBeDefined();

      // Verify token works on authenticated endpoint
      await request(app.getHttpServer())
        .get('/scanner/events')
        .set('Authorization', `Bearer ${originalJwt}`)
        .expect(200);

      // 3. SUPER_ADMIN resets staff password
      await request(app.getHttpServer())
        .patch(`/staff/${staffUser.id}/password`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ password: 'NewSecurePassword1234' })
        .expect(204);

      // 4. Old password login is invalidated -> 401
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'staff_jwt_mvp@e2e.test',
          password: 'InitialPass1234',
        })
        .expect(401);

      // 5. New password login works -> 200
      const newLoginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'staff_jwt_mvp@e2e.test',
          password: 'NewSecurePassword1234',
        })
        .expect(200);
      expect(newLoginRes.body.accessToken).toBeDefined();

      // 6. Previously-issued JWT remains valid while account remains active (Known MVP limitation)
      await request(app.getHttpServer())
        .get('/scanner/events')
        .set('Authorization', `Bearer ${originalJwt}`)
        .expect(200);

      // Clean up
      await prisma.user.delete({ where: { id: staffUser.id } });
    });
  });

  describe('Phase #6 Scanner Integration Scenario', () => {
    it('full staff lifecycle: assign -> scan -> deactivate (reject same JWT) -> reactivate (retains assignment & history) -> unassign (404)', async () => {
      // 1. Create active STAFF
      const pwd = await argon2.hash('password1234');
      const staffUser = await prisma.user.create({
        data: {
          email: 'scanner_p6_staff@e2e.test',
          passwordHash: pwd,
          role: Role.STAFF,
          isActive: true,
        },
      });

      // 2. Create PUBLISHED event
      const publishedEvent = await prisma.event.create({
        data: {
          userId: adminId,
          title: 'Phase 6 Integration Event',
          slug: 'p6-integration-event-' + Date.now(),
          eventDate: new Date().toISOString(),
          status: 'PUBLISHED',
        },
      });

      // Create guest, invitation, and historical attendance
      const guest = await prisma.guest.create({
        data: {
          eventId: publishedEvent.id,
          name: 'VIP Guest',
          maxPax: 2,
          invitation: {
            create: {
              uniqueCode: 'p6code1234567890123456',
              status: 'RSVP_YES',
              rsvpPax: 1,
              event: { connect: { id: publishedEvent.id } },
            },
          },
        },
        include: { invitation: true },
      });

      const invitation = guest.invitation!;

      const attendance = await prisma.attendance.create({
        data: {
          eventId: publishedEvent.id,
          invitationId: invitation.id,
          scannedById: staffUser.id,
          scannedPax: 1,
          status: 'VALID',
        },
      });

      // 3. Assign STAFF through StaffEvent
      const staffEvent = await prisma.staffEvent.create({
        data: {
          userId: staffUser.id,
          eventId: publishedEvent.id,
        },
      });

      // 4. Obtain STAFF JWT
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'scanner_p6_staff@e2e.test',
          password: 'password1234',
        })
        .expect(200);
      const staffJwt = loginRes.body.accessToken;
      expect(staffJwt).toBeDefined();

      // 5. Verify assigned STAFF scanner access works
      const scanRes1 = await request(app.getHttpServer())
        .get('/scanner/events')
        .set('Authorization', `Bearer ${staffJwt}`)
        .expect(200);
      const eventIds1 = scanRes1.body.data.map((e: any) => e.id);
      expect(eventIds1).toContain(publishedEvent.id);

      // 6. SUPER_ADMIN deactivates STAFF
      await request(app.getHttpServer())
        .patch(`/staff/${staffUser.id}`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ isActive: false })
        .expect(200);

      // 7. Reuse SAME previously-issued JWT
      // 8. Next scanner/authenticated request must be rejected because JwtStrategy re-queries isActive
      await request(app.getHttpServer())
        .get('/scanner/events')
        .set('Authorization', `Bearer ${staffJwt}`)
        .expect(401);

      // Assert deactivation does NOT delete StaffEvent assignment or historical Attendance data
      const staffEventInDb = await prisma.staffEvent.findUnique({
        where: {
          id: staffEvent.id,
        },
      });
      expect(staffEventInDb).not.toBeNull();
      expect(staffEventInDb?.id).toBe(staffEvent.id);

      const attendanceInDb = await prisma.attendance.findUnique({
        where: { id: attendance.id },
      });
      expect(attendanceInDb).not.toBeNull();
      expect(attendanceInDb?.id).toBe(attendance.id);

      // 9. SUPER_ADMIN reactivates STAFF
      await request(app.getHttpServer())
        .patch(`/staff/${staffUser.id}`)
        .set('Authorization', `Bearer ${superToken}`)
        .send({ isActive: true })
        .expect(200);

      // 10. Confirm original StaffEvent assignment still exists
      const staffEventAfterReactivate = await prisma.staffEvent.findUnique({
        where: {
          id: staffEvent.id,
        },
      });
      expect(staffEventAfterReactivate).not.toBeNull();

      // 11. Reuse valid token / login as appropriate (same JWT is valid again since isActive is true)
      // 12. Scanner access works again
      const scanRes2 = await request(app.getHttpServer())
        .get('/scanner/events')
        .set('Authorization', `Bearer ${staffJwt}`)
        .expect(200);
      const eventIds2 = scanRes2.body.data.map((e: any) => e.id);
      expect(eventIds2).toContain(publishedEvent.id);

      // 13. Remove StaffEvent assignment
      await prisma.staffEvent.delete({
        where: {
          id: staffEvent.id,
        },
      });

      // 14. Verify scanner event access is removed according to existing opaque authorization semantics
      const scanRes3 = await request(app.getHttpServer())
        .get('/scanner/events')
        .set('Authorization', `Bearer ${staffJwt}`)
        .expect(200);
      const eventIds3 = scanRes3.body.data.map((e: any) => e.id);
      expect(eventIds3).not.toContain(publishedEvent.id);

      // Attendance resolve for unassigned staff returns 404 (opaque authorization)
      await request(app.getHttpServer())
        .post(`/events/${publishedEvent.id}/attendance/resolve`)
        .set('Authorization', `Bearer ${staffJwt}`)
        .send({ code: 'p6code1234567890123456' })
        .expect(404);

      // Clean up test entities
      await prisma.attendance.deleteMany({
        where: { eventId: publishedEvent.id },
      });
      await prisma.invitation.deleteMany({
        where: { eventId: publishedEvent.id },
      });
      await prisma.guest.deleteMany({ where: { eventId: publishedEvent.id } });
      await prisma.event.delete({ where: { id: publishedEvent.id } });
      await prisma.user.delete({ where: { id: staffUser.id } });
    });
  });
});
