/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AuthService } from './../src/auth/auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let authService: AuthService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue({
        login: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/auth/login (POST) - DTO Validation', () => {
    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'pass' })
        .expect(400);
    });

    it('should return 400 for missing password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);
    });

    it('should return 400 for unexpected extra fields (forbidNonWhitelisted)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'pass', admin: true })
        .expect(400);
    });
  });

  describe('/api/v1/auth/login (POST) - Authentication', () => {
    it('should return 401 for nonexistent email, wrong password, or inactive account', () => {
      jest
        .spyOn(authService, 'login')
        .mockRejectedValueOnce(
          new UnauthorizedException('Invalid email or password'),
        );

      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'wrong@example.com', password: 'pass' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid email or password');
        });
    });

    it('should return 200 and safe user object on success', async () => {
      const mockToken = jwtService.sign({
        sub: '123',
        email: 'test@example.com',
        role: 'ADMIN',
      });

      jest.spyOn(authService, 'login').mockResolvedValueOnce({
        accessToken: mockToken,
        user: { id: '123', email: 'test@example.com', role: 'ADMIN' },
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'correct_password' })
        .expect(200);

      expect(res.body.accessToken).toBe(mockToken);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe('123');
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.role).toBe('ADMIN');
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.passwordHash).toBeUndefined();

      // Verify JWT payload
      const payload = jwtService.verify(mockToken);
      expect(payload.sub).toBe('123');
      expect(payload.email).toBe('test@example.com');
      expect(payload.role).toBe('ADMIN');
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });
  });
});
