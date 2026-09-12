/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'database';
import * as argon2 from 'argon2';

describe('GuestsController (e2e)', () => {
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
    await prisma.guest.deleteMany({
      where: { name: { startsWith: 'TEST_GUEST_G_' } },
    });
    await prisma.event.deleteMany({
      where: { slug: { startsWith: 'test-event-' } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'super_g@e2e.test',
            'admin_a_g@e2e.test',
            'admin_b_g@e2e.test',
            'staff_g@e2e.test',
          ],
        },
      },
    });

    const pwd = await argon2.hash('password1234');

    const superAdmin = await prisma.user.create({
      data: {
        email: 'super_g@e2e.test',
        passwordHash: pwd,
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    const adminA = await prisma.user.create({
      data: {
        email: 'admin_a_g@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    const adminB = await prisma.user.create({
      data: {
        email: 'admin_b_g@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    const staff = await prisma.user.create({
      data: {
        email: 'staff_g@e2e.test',
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
        slug: 'test-event-a1',
        eventDate: new Date().toISOString(),
      },
    });
    eventA1Id = eventA1.id;

    const eventA2 = await prisma.event.create({
      data: {
        userId: adminA.id,
        title: 'Event A2',
        slug: 'test-event-a2',
        eventDate: new Date().toISOString(),
      },
    });
    eventA2Id = eventA2.id;

    const eventB = await prisma.event.create({
      data: {
        userId: adminB.id,
        title: 'Event B',
        slug: 'test-event-b',
        eventDate: new Date().toISOString(),
      },
    });
    eventBId = eventB.id;

    const guestA1 = await prisma.guest.create({
      data: { eventId: eventA1Id, name: 'TEST_GUEST_G_A1' },
    });
    guestA1Id = guestA1.id;

    const guestA2 = await prisma.guest.create({
      data: { eventId: eventA2Id, name: 'TEST_GUEST_G_A2' },
    });
    guestA2Id = guestA2.id;

    const guestB = await prisma.guest.create({
      data: { eventId: eventBId, name: 'TEST_GUEST_G_B' },
    });
    guestBId = guestB.id;
  });

  afterAll(async () => {
    // Teardown Guests first
    await prisma.guest.deleteMany({
      where: { name: { startsWith: 'TEST_GUEST_G_' } },
    });
    await prisma.event.deleteMany({
      where: { slug: { startsWith: 'test-event-' } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'super_g@e2e.test',
            'admin_a_g@e2e.test',
            'admin_b_g@e2e.test',
            'staff_g@e2e.test',
          ],
        },
      },
    });
    await app.close();
  });

  describe('ADMIN Security Matrix', () => {
    it('list Event A1 Guests -> A1 only', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventA1Id}/guests`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
          expect(res.body.data[0].id).toBe(guestA1Id);
        });
    });

    it('GET Guest A1 -> 200', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventA1Id}/guests/${guestA1Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('TEST_GUEST_G_A1');
          expect(res.body).not.toHaveProperty('event');
          expect(res.body).not.toHaveProperty('invitation');
        });
    });

    it('GET Guest A2 through Event A1 -> 404 (Parent/Child integrity)', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventA1Id}/guests/${guestA2Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(404);
    });

    it('GET Event B Guest list -> 404 (Cross-tenant)', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventBId}/guests`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(404);
    });

    it('GET Guest B -> 404 (Cross-tenant)', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventBId}/guests/${guestBId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(404);
    });

    it('PATCH Guest A1 -> 200', () => {
      return request(app.getHttpServer())
        .patch(`/events/${eventA1Id}/guests/${guestA1Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ name: 'TEST_GUEST_G_A1_UPDATED' })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('TEST_GUEST_G_A1_UPDATED');
        });
    });

    it('PATCH Guest A2 through Event A1 -> 404', () => {
      return request(app.getHttpServer())
        .patch(`/events/${eventA1Id}/guests/${guestA2Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ name: 'HACKED' })
        .expect(404);
    });

    it('PATCH Guest B -> 404', () => {
      return request(app.getHttpServer())
        .patch(`/events/${eventBId}/guests/${guestBId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ name: 'HACKED' })
        .expect(404);
    });

    it('POST Guest under Event B -> 404', () => {
      return request(app.getHttpServer())
        .post(`/events/${eventBId}/guests`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ name: 'TEST_GUEST_HACK' })
        .expect(404);
    });
  });

  describe('SUPER_ADMIN Security Matrix', () => {
    it('can access Guests globally under correct Events', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventBId}/guests/${guestBId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .expect(200);
    });

    it('wrong Event/Guest pairing -> 404', () => {
      return request(app.getHttpServer())
        .get(`/events/${eventA1Id}/guests/${guestBId}`)
        .set('Authorization', `Bearer ${superToken}`)
        .expect(404);
    });
  });

  describe('Malicious Payloads & Mass Assignment', () => {
    it('malicious POST eventId -> 400', () => {
      return request(app.getHttpServer())
        .post(`/events/${eventA1Id}/guests`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ name: 'TEST_GUEST_NEW', eventId: eventBId })
        .expect(400); // ValidationPipe blocks it
    });

    it('malicious PATCH eventId -> 400', async () => {
      await request(app.getHttpServer())
        .patch(`/events/${eventA1Id}/guests/${guestA1Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ eventId: eventBId })
        .expect(400);

      // Verify relationship unchanged
      const guest = await prisma.guest.findUnique({ where: { id: guestA1Id } });
      expect(guest.eventId).toBe(eventA1Id);
    });
  });

  describe('Nullability and Validation Rules', () => {
    it('PATCH clears nullable fields when passed null', async () => {
      await request(app.getHttpServer())
        .patch(`/events/${eventA1Id}/guests/${guestA1Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ customGreeting: null, email: null, phoneNumber: null })
        .expect(200)
        .expect((res) => {
          expect(res.body.customGreeting).toBeNull();
          expect(res.body.email).toBeNull();
          expect(res.body.phoneNumber).toBeNull();
        });
    });

    it('PATCH rejects null for maxPax (400)', () => {
      return request(app.getHttpServer())
        .patch(`/events/${eventA1Id}/guests/${guestA1Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ maxPax: null })
        .expect(400);
    });

    it('PATCH rejects maxPax 0 (400)', () => {
      return request(app.getHttpServer())
        .patch(`/events/${eventA1Id}/guests/${guestA1Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ maxPax: 0 })
        .expect(400);
    });

    it('PATCH rejects maxPax negative (400)', () => {
      return request(app.getHttpServer())
        .patch(`/events/${eventA1Id}/guests/${guestA1Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ maxPax: -1 })
        .expect(400);
    });

    it('PATCH rejects maxPax non-integer (400)', () => {
      return request(app.getHttpServer())
        .patch(`/events/${eventA1Id}/guests/${guestA1Id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ maxPax: 1.5 })
        .expect(400);
    });

    it('POST rejects null for maxPax (400)', () => {
      return request(app.getHttpServer())
        .post(`/events/${eventA1Id}/guests`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ name: 'TEST_GUEST_NULL_PAX', maxPax: null })
        .expect(400);
    });

    it('POST rejects null for category (400)', () => {
      return request(app.getHttpServer())
        .post(`/events/${eventA1Id}/guests`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ name: 'TEST_GUEST_NULL_CATEGORY', category: null })
        .expect(400);
    });

    it('POST accepts valid maxPax=1', () => {
      return request(app.getHttpServer())
        .post(`/events/${eventA1Id}/guests`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ name: 'TEST_GUEST_VALID_PAX', maxPax: 1 })
        .expect(201)
        .expect((res) => {
          expect(res.body.maxPax).toBe(1);
        });
    });

    it('POST accepts omitted category and maxPax', () => {
      return request(app.getHttpServer())
        .post(`/events/${eventA1Id}/guests`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ name: 'TEST_GUEST_OMITTED_ALL' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
        });
    });
  });

  describe('STAFF Matrix', () => {
    it('POST -> 403', () =>
      request(app.getHttpServer())
        .post(`/events/${eventA1Id}/guests`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'TEST' })
        .expect(403));
    it('GET list -> 403', () =>
      request(app.getHttpServer())
        .get(`/events/${eventA1Id}/guests`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403));
    it('GET detail -> 403', () =>
      request(app.getHttpServer())
        .get(`/events/${eventA1Id}/guests/${guestA1Id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403));
    it('PATCH -> 403', () =>
      request(app.getHttpServer())
        .patch(`/events/${eventA1Id}/guests/${guestA1Id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'TEST' })
        .expect(403));
  });

  describe('No JWT Matrix', () => {
    it('POST -> 401', () =>
      request(app.getHttpServer())
        .post(`/events/${eventA1Id}/guests`)
        .send({ name: 'TEST' })
        .expect(401));
    it('GET list -> 401', () =>
      request(app.getHttpServer())
        .get(`/events/${eventA1Id}/guests`)
        .expect(401));
    it('GET detail -> 401', () =>
      request(app.getHttpServer())
        .get(`/events/${eventA1Id}/guests/${guestA1Id}`)
        .expect(401));
    it('PATCH -> 401', () =>
      request(app.getHttpServer())
        .patch(`/events/${eventA1Id}/guests/${guestA1Id}`)
        .send({ name: 'TEST' })
        .expect(401));
  });
});
