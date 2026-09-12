/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, INestApplication, Request } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './../src/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from './../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from './../src/auth/guards/roles.guard';
import { APP_GUARD } from '@nestjs/core';
import { Roles } from './../src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from './../src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from './../src/auth/types/authenticated-user.type';

import { PrismaService } from './../src/database/prisma.service';

const prismaMock = {
  user: {
    findUnique: jest.fn(),
  },
};

// Test-only controller
@Controller('protected-test')
class TestProtectedController {
  @Get()
  getProtectedResource(@Request() req: any) {
    return { success: true, user: req.user };
  }

  @Roles(Role.SUPER_ADMIN)
  @Get('super-admin')
  getSuperAdminOnly() {
    return { success: true };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin')
  getAdminAndSuperAdmin() {
    return { success: true };
  }

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}

describe('Protected Routes (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  const TEST_SECRET = 'test-e2e-secret-do-not-use-in-prod';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_ACCESS_SECRET: TEST_SECRET,
              JWT_ACCESS_EXPIRATION: '12h',
            }),
          ],
        }),
        JwtModule.register({
          secret: TEST_SECRET,
          signOptions: { expiresIn: '12h' },
        }),
      ],
      controllers: [TestProtectedController],
      providers: [
        JwtStrategy,
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: RolesGuard,
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should deny access without JWT (401)', () => {
    return request(app.getHttpServer()).get('/protected-test').expect(401);
  });

  it('should deny access with malformed token (401)', () => {
    return request(app.getHttpServer())
      .get('/protected-test')
      .set('Authorization', 'Bearer not-a-real-jwt-token')
      .expect(401);
  });

  it('should deny access with invalid signature (401)', () => {
    const fakeJwtService = new JwtService({ secret: 'wrong-secret' });
    const invalidToken = fakeJwtService.sign({ sub: '123' });

    return request(app.getHttpServer())
      .get('/protected-test')
      .set('Authorization', `Bearer ${invalidToken}`)
      .expect(401);
  });

  it('should deny access with expired token (401)', () => {
    const fakeJwtService = new JwtService({
      secret: TEST_SECRET,
      signOptions: { expiresIn: '-1s' },
    });
    const expiredToken = fakeJwtService.sign({ sub: '123' });

    return request(app.getHttpServer())
      .get('/protected-test')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('should deny access if valid JWT but User is inactive (401)', async () => {
    const validToken = jwtService.sign({
      sub: 'user-1',
      email: 'test@example.com',
      role: 'ADMIN',
    });

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      isActive: false,
    });

    await request(app.getHttpServer())
      .get('/protected-test')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(401);
  });

  it('should deny access if valid JWT but User is missing/deleted (401)', async () => {
    const validToken = jwtService.sign({
      sub: 'user-1',
      email: 'test@example.com',
      role: 'ADMIN',
    });

    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .get('/protected-test')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(401);
  });

  it('should allow access if valid JWT and active User (200)', async () => {
    const validToken = jwtService.sign({
      sub: 'user-1',
      email: 'test@example.com',
      role: 'ADMIN',
    });

    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'test@example.com',
      role: 'ADMIN',
      isActive: true,
    });

    const response = await request(app.getHttpServer())
      .get('/protected-test')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.user).toEqual({
      id: 'user-1',
      email: 'test@example.com',
      role: 'ADMIN',
    });
  });

  it('RBAC: SUPER_ADMIN route allowed for SUPER_ADMIN (200)', async () => {
    const validToken = jwtService.sign({
      sub: 'user-sa',
      email: 'sa@example.com',
      role: 'SUPER_ADMIN',
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-sa',
      email: 'sa@example.com',
      role: 'SUPER_ADMIN',
      isActive: true,
    });
    await request(app.getHttpServer())
      .get('/protected-test/super-admin')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
  });

  it('RBAC: SUPER_ADMIN route forbidden for ADMIN (403)', async () => {
    const validToken = jwtService.sign({
      sub: 'user-admin',
      email: 'admin@example.com',
      role: 'ADMIN',
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-admin',
      email: 'admin@example.com',
      role: 'ADMIN',
      isActive: true,
    });
    await request(app.getHttpServer())
      .get('/protected-test/super-admin')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(403);
  });

  it('RBAC: SUPER_ADMIN route forbidden for STAFF (403)', async () => {
    const validToken = jwtService.sign({
      sub: 'user-staff',
      email: 'staff@example.com',
      role: 'STAFF',
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-staff',
      email: 'staff@example.com',
      role: 'STAFF',
      isActive: true,
    });
    await request(app.getHttpServer())
      .get('/protected-test/super-admin')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(403);
  });

  it('RBAC: ADMIN route allowed for SUPER_ADMIN (200)', async () => {
    const validToken = jwtService.sign({
      sub: 'user-sa',
      email: 'sa@example.com',
      role: 'SUPER_ADMIN',
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-sa',
      email: 'sa@example.com',
      role: 'SUPER_ADMIN',
      isActive: true,
    });
    await request(app.getHttpServer())
      .get('/protected-test/admin')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
  });

  it('RBAC: ADMIN route allowed for ADMIN (200)', async () => {
    const validToken = jwtService.sign({
      sub: 'user-admin',
      email: 'admin@example.com',
      role: 'ADMIN',
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-admin',
      email: 'admin@example.com',
      role: 'ADMIN',
      isActive: true,
    });
    await request(app.getHttpServer())
      .get('/protected-test/admin')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
  });

  it('RBAC: ADMIN route forbidden for STAFF (403)', async () => {
    const validToken = jwtService.sign({
      sub: 'user-staff',
      email: 'staff@example.com',
      role: 'STAFF',
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-staff',
      email: 'staff@example.com',
      role: 'STAFF',
      isActive: true,
    });
    await request(app.getHttpServer())
      .get('/protected-test/admin')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(403);
  });

  it('RBAC: No Roles metadata allowed for any role (200)', async () => {
    const validToken = jwtService.sign({
      sub: 'user-staff',
      email: 'staff@example.com',
      role: 'STAFF',
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-staff',
      email: 'staff@example.com',
      role: 'STAFF',
      isActive: true,
    });
    await request(app.getHttpServer())
      .get('/protected-test')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
  });

  it('RBAC: No JWT on route with Roles metadata still returns 401, not 403', async () => {
    await request(app.getHttpServer())
      .get('/protected-test/super-admin')
      .expect(401);
  });

  it('/auth/me: Returns CurrentUser without sensitive fields (200)', async () => {
    const validToken = jwtService.sign({
      sub: 'user-admin',
      email: 'admin@example.com',
      role: 'ADMIN',
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'user-admin',
      email: 'admin@example.com',
      role: 'ADMIN',
      isActive: true,
      passwordHash: 'hash',
    });
    const response = await request(app.getHttpServer())
      .get('/protected-test/me')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
    expect(response.body).toEqual({
      id: 'user-admin',
      email: 'admin@example.com',
      role: 'ADMIN',
    });
    expect(response.body.passwordHash).toBeUndefined();
    expect(response.body.isActive).toBeUndefined();
  });
});
