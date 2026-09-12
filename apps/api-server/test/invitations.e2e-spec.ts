/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'database';
import * as argon2 from 'argon2';

describe('InvitationsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let superToken: string;
  let adminAToken: string;
  let adminBToken: string;
  let staffToken: string;

  let eventA1Id: string;
  let eventA2Id: string;
  let eventBId: string;

  let guestA1Id: string;
  let guestA2Id: string;
  let guestBId: string;

  let invitationA1Id: string;

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

    // CLEANUP defensively
    const userEmails = [
      'super_inv@e2e.test',
      'admin_a_inv@e2e.test',
      'admin_b_inv@e2e.test',
      'staff_inv@e2e.test',
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
      where: {
        email: {
          in: userEmails,
        },
      },
    });

    const pwd = await argon2.hash('password1234');

    const superAdmin = await prisma.user.create({
      data: {
        email: 'super_inv@e2e.test',
        passwordHash: pwd,
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    const adminA = await prisma.user.create({
      data: {
        email: 'admin_a_inv@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    const adminB = await prisma.user.create({
      data: {
        email: 'admin_b_inv@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    const staff = await prisma.user.create({
      data: {
        email: 'staff_inv@e2e.test',
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

    const eventA1 = await prisma.event.create({
      data: {
        userId: adminA.id,
        title: 'Event A1',
        slug: 'inv-event-a1',
        eventDate: new Date().toISOString(),
      },
    });
    eventA1Id = eventA1.id;

    const eventA2 = await prisma.event.create({
      data: {
        userId: adminA.id,
        title: 'Event A2',
        slug: 'inv-event-a2',
        eventDate: new Date().toISOString(),
      },
    });
    eventA2Id = eventA2.id;

    const eventB = await prisma.event.create({
      data: {
        userId: adminB.id,
        title: 'Event B',
        slug: 'inv-event-b',
        eventDate: new Date().toISOString(),
      },
    });
    eventBId = eventB.id;

    const guestA1 = await prisma.guest.create({
      data: { eventId: eventA1Id, name: 'TEST_GUEST_INV_A1' },
    });
    guestA1Id = guestA1.id;
    const guestA2 = await prisma.guest.create({
      data: { eventId: eventA2Id, name: 'TEST_GUEST_INV_A2' },
    });
    guestA2Id = guestA2.id;
    const guestB = await prisma.guest.create({
      data: { eventId: eventBId, name: 'TEST_GUEST_INV_B' },
    });
    guestBId = guestB.id;
  });

  afterAll(async () => {
    // Teardown
    await prisma.guest.deleteMany({
      where: { name: { startsWith: 'TEST_GUEST_INV_' } },
    });
    const userEmails = [
      'super_inv@e2e.test',
      'admin_a_inv@e2e.test',
      'admin_b_inv@e2e.test',
      'staff_inv@e2e.test',
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
      where: {
        email: {
          in: userEmails,
        },
      },
    });
    await app.close();
  });

  describe('Creation and IDOR Protections', () => {
    it('POST invitation successfully creates uniqueCode and defaults to PENDING', () => {
      return request(app.getHttpServer())
        .post(`/events/${eventA1Id}/guests/${guestA1Id}/invitation`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(201)
        .expect((res) => {
          invitationA1Id = res.body.id;
          expect(res.body.eventId).toBe(eventA1Id);
          expect(res.body.guestId).toBe(guestA1Id);
          expect(res.body.uniqueCode).toBeDefined();
          expect(res.body.status).toBe('PENDING');
          expect(res.body).not.toHaveProperty('guest');
          expect(res.body).not.toHaveProperty('event');
        });
    });

    it('POST duplicate invitation for same guest -> 409 Conflict', () => {
      return request(app.getHttpServer())
        .post(`/events/${eventA1Id}/guests/${guestA1Id}/invitation`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(409);
    });

    it('POST cross-tenant Event/Guest pair -> 404', () => {
      return request(app.getHttpServer())
        .post(`/events/${eventBId}/guests/${guestBId}/invitation`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(404);
    });

    it('POST same-admin but wrong Event/Guest parent pair -> 404', () => {
      return request(app.getHttpServer())
        .post(`/events/${eventA1Id}/guests/${guestA2Id}/invitation`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(404); // Guest A2 does not belong to Event A1
    });

    it('GET Event A1 invitations list', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventA1Id}/invitations`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.meta.lastPage).toBe(1);
        });
    });

    it('GET Event B invitations list -> 404 (Cross-tenant)', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventBId}/invitations`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(404);
    });
  });

  describe('Update and Detail', () => {
    it('PATCH customMessage -> 200', () => {
      return request(app.getHttpServer())
        .patch(`/events/${eventA1Id}/invitations/${invitationA1Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ customMessage: 'Welcome!' })
        .expect(200)
        .expect((res) => {
          expect(res.body.customMessage).toBe('Welcome!');
        });
    });

    it('GET Detail -> 200', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventA1Id}/invitations/${invitationA1Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(invitationA1Id);
          expect(res.body.customMessage).toBe('Welcome!');
        });
    });

    it('PATCH ignores or rejects mass-assignment status/rsvpPax', async () => {
      await request(app.getHttpServer())
        .patch(`/events/${eventA1Id}/invitations/${invitationA1Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ status: 'RSVP_YES', rsvpPax: 2 })
        .expect(400); // ValidationPipe blocks unknown fields!

      const inv = await prisma.invitation.findUnique({
        where: { id: invitationA1Id },
      });
      expect(inv.status).toBe('PENDING'); // Unchanged
    });

    it('GET wrong Event parent (Same-admin) -> 404', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventA2Id}/invitations/${invitationA1Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(404);
    });
  });

  describe('SUPER_ADMIN Security Matrix', () => {
    it('SUPER_ADMIN can access Invitation globally', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventA1Id}/invitations/${invitationA1Id}`)
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);
    });

    it('SUPER_ADMIN restricted by nested integrity', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventA2Id}/invitations/${invitationA1Id}`)
        .set('Authorization', `Bearer ${superToken}`)
        .expect(404); // Wrong Event for this Invitation
    });
  });

  describe('Malicious Payloads & Mass Assignment', () => {
    it('POST ignores or rejects mass assignment -> 400', () => {
      return request(app.getHttpServer())
        .post(`/events/${eventA1Id}/guests/${guestA1Id}/invitation`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          eventId: eventBId,
          guestId: guestBId,
          uniqueCode: 'hacked-code',
          status: 'OPENED',
          rsvpPax: 10,
          id: 'fake-id',
        })
        .expect(400);
    });

    it('PATCH ignores or rejects mass assignment and does not alter relations', async () => {
      await request(app.getHttpServer())
        .patch(`/events/${eventA1Id}/invitations/${invitationA1Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          eventId: eventBId,
          guestId: guestBId,
          uniqueCode: 'hacked-code',
          status: 'OPENED',
          rsvpPax: 10,
          id: 'fake-id',
        })
        .expect(400);

      // Verify relationship and status unchanged
      const inv = await prisma.invitation.findUnique({
        where: { id: invitationA1Id },
      });
      expect(inv.eventId).toBe(eventA1Id);
      expect(inv.guestId).toBe(guestA1Id);
      expect(inv.uniqueCode).not.toBe('hacked-code');
      expect(inv.status).toBe('PENDING');
      expect(inv.rsvpPax).toBeNull();
    });
  });

  describe('STAFF / No JWT', () => {
    it('STAFF GET -> 403', () =>
      request(app.getHttpServer())
        .get(`/events/${eventA1Id}/invitations`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403));
    it('STAFF POST -> 403', () =>
      request(app.getHttpServer())
        .post(`/events/${eventA1Id}/guests/${guestA1Id}/invitation`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403));
    it('STAFF PATCH -> 403', () =>
      request(app.getHttpServer())
        .patch(`/events/${eventA1Id}/invitations/${invitationA1Id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ customMessage: 'Hi' })
        .expect(403));

    it('No JWT GET -> 401', () =>
      request(app.getHttpServer())
        .get(`/events/${eventA1Id}/invitations`)
        .expect(401));
    it('No JWT POST -> 401', () =>
      request(app.getHttpServer())
        .post(`/events/${eventA1Id}/guests/${guestA1Id}/invitation`)
        .expect(401));
    it('No JWT PATCH -> 401', () =>
      request(app.getHttpServer())
        .patch(`/events/${eventA1Id}/invitations/${invitationA1Id}`)
        .send({ customMessage: 'Hi' })
        .expect(401));
  });
});
