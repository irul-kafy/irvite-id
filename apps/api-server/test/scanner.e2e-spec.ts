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

describe('ScannerController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let superToken: string;
  let adminToken: string;
  let staffAssignedToken: string;
  let staffUnassignedToken: string;
  let staffInactiveToken: string;

  let adminId: string;
  let staffAssignedId: string;
  let eventPublishedId: string;
  let eventDraftId: string;

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
    const userEmails = [
      'scan_super@e2e.test',
      'scan_admin@e2e.test',
      'scan_staff_a@e2e.test',
      'scan_staff_u@e2e.test',
      'scan_staff_i@e2e.test',
    ];

    const usersToDelete = await prisma.user.findMany({
      where: { email: { in: userEmails } },
      select: { id: true },
    });
    const userIds = usersToDelete.map((u) => u.id);

    await prisma.staffEvent.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.event.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: userEmails } },
    });

    const superAdmin = await prisma.user.create({
      data: {
        email: 'scan_super@e2e.test',
        passwordHash: pwd,
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    const admin = await prisma.user.create({
      data: {
        email: 'scan_admin@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    adminId = admin.id;

    const staffAssigned = await prisma.user.create({
      data: {
        email: 'scan_staff_a@e2e.test',
        passwordHash: pwd,
        role: Role.STAFF,
        isActive: true,
      },
    });
    staffAssignedId = staffAssigned.id;

    const staffUnassigned = await prisma.user.create({
      data: {
        email: 'scan_staff_u@e2e.test',
        passwordHash: pwd,
        role: Role.STAFF,
        isActive: true,
      },
    });
    const staffInactive = await prisma.user.create({
      data: {
        email: 'scan_staff_i@e2e.test',
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
    staffAssignedToken = await jwtService.signAsync({
      sub: staffAssigned.id,
      email: staffAssigned.email,
      role: staffAssigned.role,
    });
    staffUnassignedToken = await jwtService.signAsync({
      sub: staffUnassigned.id,
      email: staffUnassigned.email,
      role: staffUnassigned.role,
    });
    staffInactiveToken = await jwtService.signAsync({
      sub: staffInactive.id,
      email: staffInactive.email,
      role: staffInactive.role,
    });

    const eventPublished = await prisma.event.create({
      data: {
        userId: adminId,
        title: 'Scan Event Published',
        slug: 'scan-event-pub',
        eventDate: new Date().toISOString(),
        status: 'PUBLISHED',
      },
    });
    eventPublishedId = eventPublished.id;

    const eventDraft = await prisma.event.create({
      data: {
        userId: adminId,
        title: 'Scan Event Draft',
        slug: 'scan-event-draft',
        eventDate: new Date().toISOString(),
        status: 'DRAFT',
      },
    });
    eventDraftId = eventDraft.id;

    await prisma.staffEvent.create({
      data: {
        userId: staffAssignedId,
        eventId: eventPublishedId,
      },
    });
  });

  afterAll(async () => {
    const userEmails = [
      'scan_super@e2e.test',
      'scan_admin@e2e.test',
      'scan_staff_a@e2e.test',
      'scan_staff_u@e2e.test',
      'scan_staff_i@e2e.test',
    ];
    const usersToDelete = await prisma.user.findMany({
      where: { email: { in: userEmails } },
      select: { id: true },
    });
    const userIds = usersToDelete.map((u) => u.id);

    await prisma.staffEvent.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.event.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: userEmails } },
    });
    await app.close();
  });

  it('No JWT -> 401', () => {
    return request(app.getHttpServer()).get('/scanner/events').expect(401);
  });

  it('SUPER_ADMIN sees published events', () => {
    return request(app.getHttpServer())
      .get('/scanner/events')
      .set('Authorization', `Bearer ${superToken}`)
      .expect(200)
      .expect((res) => {
        const ids = res.body.data.map((e: any) => e.id);
        expect(ids).toContain(eventPublishedId);
        expect(ids).not.toContain(eventDraftId);
      });
  });

  it('ADMIN sees own published events', () => {
    return request(app.getHttpServer())
      .get('/scanner/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        const ids = res.body.data.map((e: any) => e.id);
        expect(ids).toContain(eventPublishedId);
        expect(ids).not.toContain(eventDraftId);
      });
  });

  it('STAFF assigned sees published assigned event', () => {
    return request(app.getHttpServer())
      .get('/scanner/events')
      .set('Authorization', `Bearer ${staffAssignedToken}`)
      .expect(200)
      .expect((res) => {
        const ids = res.body.data.map((e: any) => e.id);
        expect(ids).toContain(eventPublishedId);
        expect(ids).not.toContain(eventDraftId);
      });
  });

  it('STAFF unassigned sees empty', () => {
    return request(app.getHttpServer())
      .get('/scanner/events')
      .set('Authorization', `Bearer ${staffUnassignedToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toHaveLength(0);
      });
  });

  it('STAFF inactive blocked/empty', () => {
    return request(app.getHttpServer())
      .get('/scanner/events')
      .set('Authorization', `Bearer ${staffInactiveToken}`)
      .expect(401); // Global Guard blocks inactive users
  });
});
