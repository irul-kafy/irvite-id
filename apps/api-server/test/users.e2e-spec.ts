/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'database';
import * as argon2 from 'argon2';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let superAdminToken: string;
  let adminToken: string;
  let staffToken: string;

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

    // Clean up test users if they exist
    await prisma.user.deleteMany({
      where: {
        email: { in: ['super@e2e.test', 'admin@e2e.test', 'staff@e2e.test'] },
      },
    });

    const pwd = await argon2.hash('password1234');

    const superAdmin = await prisma.user.create({
      data: {
        email: 'super@e2e.test',
        passwordHash: pwd,
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    const admin = await prisma.user.create({
      data: {
        email: 'admin@e2e.test',
        passwordHash: pwd,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    const staff = await prisma.user.create({
      data: {
        email: 'staff@e2e.test',
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
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'super@e2e.test',
            'admin@e2e.test',
            'staff@e2e.test',
            'newadmin@e2e.test',
          ],
        },
      },
    });
    await app.close();
  });

  describe('GET /users', () => {
    it('SUPER_ADMIN should get users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.meta).toBeDefined();
          expect(res.body.data[0].passwordHash).toBeUndefined(); // Safe response
        });
    });

    it('ADMIN should be forbidden', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('STAFF should be forbidden', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('No token should be unauthorized', () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });
  });

  describe('POST /users', () => {
    it('SUPER_ADMIN should create an ADMIN user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'newadmin@e2e.test',
          password: 'securepassword1234',
          role: Role.ADMIN,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.email).toBe('newadmin@e2e.test');
          expect(res.body.role).toBe(Role.ADMIN);
          expect(res.body.passwordHash).toBeUndefined();
        });
    });

    it('SUPER_ADMIN should fail to create SUPER_ADMIN user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'fail@e2e.test',
          password: 'securepassword1234',
          role: Role.SUPER_ADMIN,
        })
        .expect(400); // Validation fails because SUPER_ADMIN is not in IsIn()
    });

    it('ADMIN should fail to create a user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'admin-fail@e2e.test',
          password: 'securepassword1234',
          role: Role.STAFF,
        })
        .expect(403);
    });
  });
});
