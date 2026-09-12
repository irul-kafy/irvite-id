/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

const prismaMock = {
  user: {
    findUnique: jest.fn(),
  },
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    jest.clearAllMocks();
  });

  it('should validate and return safe user object if user exists and is active', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: '123',
      email: 'test@example.com',
      role: 'ADMIN',
      isActive: true,
      passwordHash: 'hash',
    });

    const result = await strategy.validate({
      sub: '123',
      email: 'test@example.com',
      role: 'ADMIN',
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: '123' },
    });
    expect(result).toEqual({
      id: '123',
      email: 'test@example.com',
      role: 'ADMIN',
    });
    expect((result as any).passwordHash).toBeUndefined();
    expect((result as any).isActive).toBeUndefined();
  });

  it('should throw UnauthorizedException if user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      strategy.validate({
        sub: '123',
        email: 'test@example.com',
        role: 'ADMIN',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user is inactive', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: '123',
      email: 'test@example.com',
      role: 'ADMIN',
      isActive: false,
    });

    await expect(
      strategy.validate({
        sub: '123',
        email: 'test@example.com',
        role: 'ADMIN',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException on database error', async () => {
    prismaMock.user.findUnique.mockRejectedValueOnce(new Error('DB Error'));

    await expect(
      strategy.validate({
        sub: '123',
        email: 'test@example.com',
        role: 'ADMIN',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
