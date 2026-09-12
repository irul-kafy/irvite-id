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

  let staffActiveId: string;

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
      'staffc_super@e2e.test',
      'staffc_admin@e2e.test',
      'staffc_active@e2e.test',
      'staffc_inactive@e2e.test',
    ];

    await prisma.user.deleteMany({
      where: { email: { in: userEmails } },
    });

    const superAdmin = await prisma.user.create({
      data: {
        email: 'staffc_super@e2e.test',
        passwordHash: pwd,
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    const admin = await prisma.user.create({
      data: {
        email: 'staffc_admin@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
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
    const userEmails = [
      'staffc_super@e2e.test',
      'staffc_admin@e2e.test',
      'staffc_active@e2e.test',
      'staffc_inactive@e2e.test',
    ];
    await prisma.user.deleteMany({
      where: { email: { in: userEmails } },
    });
    await app.close();
  });

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
