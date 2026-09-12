/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { Role } from 'database';

describe('AttendanceController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let superAdminToken: string;
  let adminToken: string;
  let foreignAdminToken: string;
  let staffToken: string;
  let noAuthToken: string;
  let inactiveStaffToken: string;
  let testEventId: string;
  let foreignEventId: string;
  let testUniqueCode: string;

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

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await prisma.staffEvent.deleteMany({
      where: { user: { email: { contains: '_attendance@e2e.test' } } },
    });
    await prisma.event.deleteMany({
      where: { user: { email: { contains: '_attendance@e2e.test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: '_attendance@e2e.test' } },
    });

    const superAdmin = await prisma.user.create({
      data: {
        email: 'superadmin_attendance@e2e.test',
        passwordHash: 'hash',
        role: Role.SUPER_ADMIN,
      },
    });
    const admin = await prisma.user.create({
      data: {
        email: 'admin_attendance@e2e.test',
        passwordHash: 'hash',
        role: Role.ADMIN,
      },
    });
    const foreignAdmin = await prisma.user.create({
      data: {
        email: 'foreignadmin_attendance@e2e.test',
        passwordHash: 'hash',
        role: Role.ADMIN,
      },
    });
    const staffUser = await prisma.user.create({
      data: {
        email: 'staff_attendance@e2e.test',
        passwordHash: 'hash',
        role: Role.STAFF,
      },
    });
    const unassignedStaff = await prisma.user.create({
      data: {
        email: 'noauth_attendance@e2e.test',
        passwordHash: 'hash',
        role: Role.STAFF,
      },
    });
    const inactiveStaff = await prisma.user.create({
      data: {
        email: 'inactive_attendance@e2e.test',
        passwordHash: 'hash',
        role: Role.STAFF,
        isActive: false,
      },
    });

    const jwtService = moduleFixture.get(JwtService);
    superAdminToken = await jwtService.signAsync({
      sub: superAdmin.id,
      email: superAdmin.email,
      role: Role.SUPER_ADMIN,
    });
    adminToken = await jwtService.signAsync({
      sub: admin.id,
      email: admin.email,
      role: Role.ADMIN,
    });
    foreignAdminToken = await jwtService.signAsync({
      sub: foreignAdmin.id,
      email: foreignAdmin.email,
      role: Role.ADMIN,
    });
    staffToken = await jwtService.signAsync({
      sub: staffUser.id,
      email: staffUser.email,
      role: Role.STAFF,
    });
    noAuthToken = await jwtService.signAsync({
      sub: unassignedStaff.id,
      email: unassignedStaff.email,
      role: Role.STAFF,
    });
    inactiveStaffToken = await jwtService.signAsync({
      sub: inactiveStaff.id,
      email: inactiveStaff.email,
      role: Role.STAFF,
    });

    const event = await prisma.event.create({
      data: {
        userId: admin.id,
        title: 'Attendance Event',
        slug: 'attendance-event',
        eventDate: new Date('2050-01-01'),
        locationDetails: 'Earth',
        status: 'PUBLISHED',
        staffEvents: {
          create: { userId: staffUser.id },
        },
      },
    });
    testEventId = event.id;

    const foreignEvent = await prisma.event.create({
      data: {
        userId: foreignAdmin.id,
        title: 'Foreign Event',
        slug: 'foreign-event',
        eventDate: new Date('2050-01-01'),
        locationDetails: 'Earth',
        status: 'PUBLISHED',
      },
    });
    foreignEventId = foreignEvent.id;

    await prisma.guest.create({
      data: {
        eventId: event.id,
        name: 'Attendance Guest',
        maxPax: 2,
        invitation: {
          create: {
            uniqueCode: 'ATTENDANCE_TEST_123456',
            status: 'RSVP_YES',
            rsvpPax: 2,
            event: { connect: { id: event.id } },
          },
        },
      },
    });
    testUniqueCode = 'ATTENDANCE_TEST_123456';
  });

  afterAll(async () => {
    await prisma.staffEvent.deleteMany({
      where: { user: { email: { contains: '_attendance@e2e.test' } } },
    });
    await prisma.event.deleteMany({
      where: { user: { email: { contains: '_attendance@e2e.test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: '_attendance@e2e.test' } },
    });
    await app.close();
  });

  afterEach(async () => {
    await prisma.attendance.deleteMany({
      where: { eventId: testEventId },
    });
  });

  describe('Authorization', () => {
    it('no JWT -> 401', () => {
      return request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/resolve`)
        .send({ code: testUniqueCode })
        .expect(401);
    });

    it('SUPER_ADMIN -> success', () => {
      return request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/resolve`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ code: testUniqueCode })
        .expect(200);
    });

    it('ADMIN owner -> success', () => {
      return request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: testUniqueCode })
        .expect(200);
    });

    it('ADMIN foreign Event -> 404', () => {
      return request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/resolve`)
        .set('Authorization', `Bearer ${foreignAdminToken}`)
        .send({ code: testUniqueCode })
        .expect(404);
    });

    it('STAFF assigned -> success', () => {
      return request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/resolve`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: testUniqueCode })
        .expect(200);
    });

    it('STAFF unassigned -> 404', () => {
      return request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/resolve`)
        .set('Authorization', `Bearer ${noAuthToken}`)
        .send({ code: testUniqueCode })
        .expect(404);
    });

    it('STAFF inactive -> 404', () => {
      return request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/resolve`)
        .set('Authorization', `Bearer ${inactiveStaffToken}`)
        .send({ code: testUniqueCode })
        .expect(401);
    });
  });

  describe('Event State', () => {
    it('DRAFT -> 409', async () => {
      await prisma.event.update({
        where: { id: testEventId },
        data: { status: 'DRAFT' },
      });
      await request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: testUniqueCode })
        .expect(409);
      await prisma.event.update({
        where: { id: testEventId },
        data: { status: 'PUBLISHED' },
      });
    });
  });

  describe('Resolve', () => {
    it('valid READY', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/resolve`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: testUniqueCode })
        .expect(200);

      const body = res.body as Record<string, any>;
      const guest = body.guest as Record<string, any>;
      const rsvp = body.rsvp as Record<string, any>;
      expect(body.result).toBe('READY');
      expect(guest.name).toBeDefined();
      expect(guest.maxPax).toBe(2);
      expect(rsvp.response).toBe('YES');
      expect(rsvp.pax).toBe(2);
      expect(body.attendance).toBeNull();

      // Privacy check

      expect(guest.email).toBeUndefined();

      expect(guest.phoneNumber).toBeUndefined();
    });

    it('already checked in -> ALREADY_CHECKED_IN', async () => {
      const inv = await prisma.invitation.findUnique({
        where: { uniqueCode: testUniqueCode },
      });

      const staffId = app.get(JwtService).decode(staffToken).sub;
      await prisma.attendance.create({
        data: {
          invitationId: inv!.id,
          eventId: testEventId,
          scannedById: staffId,
          scannedPax: 2,
          status: 'VALID',
        },
      });

      const res = await request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/resolve`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: testUniqueCode })
        .expect(200);

      const body = res.body as Record<string, any>;
      const attendance = body.attendance as Record<string, any>;
      expect(body.result).toBe('ALREADY_CHECKED_IN');
      expect(attendance.scannedPax).toBe(2);
    });

    it('malformed code -> 400', () => {
      return request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/resolve`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: 'short' })
        .expect(400);
    });

    it('unknown code -> 404', () => {
      return request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/resolve`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: 'UNKNOWN_TEST_123456789' })
        .expect(404);
    });

    it('Invitation from another Event -> 404', () => {
      return request(app.getHttpServer())
        .post(`/events/${foreignEventId}/attendance/resolve`)
        .set('Authorization', `Bearer ${foreignAdminToken}`)
        .send({ code: testUniqueCode })
        .expect(404);
    });
  });

  describe('Check-In & Concurrency', () => {
    it('first check-in creates exactly one Attendance', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/check-in`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: testUniqueCode, pax: 2 })
        .expect(200);

      const body = res.body as Record<string, any>;
      expect(body.result).toBe('CHECKED_IN');
      const count = await prisma.attendance.count({
        where: { eventId: testEventId },
      });
      expect(count).toBe(1);
    });

    it('sequential duplicate returns ALREADY_CHECKED_IN and does not change row count', async () => {
      await request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/check-in`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: testUniqueCode, pax: 2 })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/check-in`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: testUniqueCode, pax: 1 })
        .expect(200);

      const body = res.body as Record<string, any>;
      expect(body.result).toBe('ALREADY_CHECKED_IN');
      const count = await prisma.attendance.count({
        where: { eventId: testEventId },
      });
      expect(count).toBe(1);
    });

    it('concurrent check-in requests create exactly one Attendance', async () => {
      const req1 = request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/check-in`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: testUniqueCode, pax: 2 });

      const req2 = request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/check-in`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: testUniqueCode, pax: 2 });

      const responses = await Promise.all([req1, req2]);

      const results = responses.map((r) =>
        String((r.body as Record<string, any>).result),
      );
      expect(results).toContain('CHECKED_IN');
      expect(results).toContain('ALREADY_CHECKED_IN');

      const count = await prisma.attendance.count({
        where: { eventId: testEventId },
      });
      expect(count).toBe(1);
    });
  });

  describe('PAX DTO Validation', () => {
    it.each([
      { pax: 1, expected: 200 },
      { pax: 2, expected: 200 },
      { pax: 3, expected: 400 }, // > maxPax
      { pax: 0, expected: 400 },
      { pax: -1, expected: 400 },
      { pax: 1.5, expected: 400 },
      { pax: '2', expected: 400 },
      { pax: null, expected: 400 },
    ])('pax $pax -> $expected', async ({ pax, expected }) => {
      await request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/check-in`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: testUniqueCode, pax })
        .expect(expected);
    });

    it('pax missing -> 400', async () => {
      await request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/check-in`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: testUniqueCode })
        .expect(400);
    });
  });

  describe('RSVP Policy', () => {
    it.each(['PENDING', 'SENT', 'OPENED', 'RSVP_YES', 'RSVP_NO'])(
      'RSVP %s -> check-in allowed',
      async (status) => {
        await prisma.invitation.update({
          where: { uniqueCode: testUniqueCode },
          data: { status: status as any },
        });
        await request(app.getHttpServer())
          .post(`/events/${testEventId}/attendance/check-in`)
          .set('Authorization', `Bearer ${staffToken}`)
          .send({ code: testUniqueCode, pax: 1 })
          .expect(200);
      },
    );
  });

  describe('Mass Assignment', () => {
    it('unexpected fields -> 400', async () => {
      await request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/check-in`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          code: testUniqueCode,
          pax: 1,
          role: 'SUPER_ADMIN',
          status: 'INVALID',
          scannedById: '123',
        })
        .expect(400);
    });
  });

  describe('Data Integrity', () => {
    it('verifies created fields correctly', async () => {
      await request(app.getHttpServer())
        .post(`/events/${testEventId}/attendance/check-in`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: testUniqueCode, pax: 2 })
        .expect(200);

      const attendance = await prisma.attendance.findFirst({
        where: { eventId: testEventId },
      });

      const decodedStaff = app.get(JwtService).decode(staffToken);
      expect(attendance!.scannedById).toBe(decodedStaff.sub);
      expect(attendance!.scannedPax).toBe(2);
      expect(attendance!.status).toBe('VALID');
      expect(attendance!.scannedAt).toBeDefined();
    });
  });
});
