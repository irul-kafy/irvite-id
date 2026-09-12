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

describe('TemplatesController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let superAdminToken: string;
  let adminToken: string;
  let staffToken: string;

  let templateId: string;

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
    // Clean up test templates
    await prisma.template.deleteMany({
      where: { name: { in: ['E2E Test Template', 'E2E Admin Template'] } },
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
    await prisma.template.deleteMany({
      where: { name: { in: ['E2E Test Template', 'E2E Admin Template'] } },
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
    it('ADMIN should get list of templates', () => {
      return request(app.getHttpServer())
        .get('/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeDefined();
          expect(res.body.meta).toBeDefined();
        });
    });

    it('SUPER_ADMIN should get template detail', () => {
      return request(app.getHttpServer())
        .get(`/templates/${templateId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(templateId);
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
});
