/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

import { PrismaService } from '../database/prisma.service';

const prismaMock = {
  user: {
    findUnique: jest.fn(),
  },
};

describe('AuthService Integration', () => {
  let service: AuthService;
  let jwtService: JwtService;
  const TEST_SECRET = 'test-only-jwt-secret-do-not-use-in-prod';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: TEST_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('Integration Core Path', () => {
    it('should login, verify real argon2 hash, and return a real verifiable JWT', async () => {
      const plainPassword = 'disposable-test-password';
      const passwordHash = await argon2.hash(plainPassword, {
        type: argon2.argon2id,
      });

      // Mock database response
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'user-123',
        email: 'integration@example.com',
        isActive: true,
        passwordHash,
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Execute REAL AuthService login
      const result = await service.login({
        email: 'integration@example.com',
        password: plainPassword,
      });

      // Verify the response shape
      expect(result.accessToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('integration@example.com');
      expect(result.user.role).toBe('ADMIN');
      expect((result.user as any).password).toBeUndefined();
      expect((result.user as any).passwordHash).toBeUndefined();
      expect((result.user as any).isActive).toBeUndefined();

      // Verify the real token using the real JwtService and TEST_SECRET
      const decoded = await jwtService.verifyAsync(result.accessToken, {
        secret: TEST_SECRET,
      });

      expect(decoded.sub).toBe('user-123');
      expect(decoded.email).toBe('integration@example.com');
      expect(decoded.role).toBe('ADMIN');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });
  });

  describe('Authentication Failures', () => {
    it('should throw UnauthorizedException for nonexistent user', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'pass' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const passwordHash = await argon2.hash('pass', { type: argon2.argon2id });

      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: '1',
        email: 'inactive@example.com',
        isActive: false,
        passwordHash,
        role: 'ADMIN',
      });

      await expect(
        service.login({ email: 'inactive@example.com', password: 'pass' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const passwordHash = await argon2.hash('correct-pass', {
        type: argon2.argon2id,
      });

      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: '1',
        email: 'wrongpass@example.com',
        isActive: true,
        passwordHash,
        role: 'ADMIN',
      });

      await expect(
        service.login({
          email: 'wrongpass@example.com',
          password: 'wrong-pass',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });
  });
});
