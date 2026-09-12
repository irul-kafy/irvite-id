/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from 'database';
import * as argon2 from 'argon2';

// Mock argon2
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user and return safely selected fields', async () => {
      const dto = {
        email: ' TEST@example.com ',
        password: 'password1234',
        role: Role.ADMIN,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const createdUser = {
        id: '1',
        email: 'test@example.com',
        role: Role.ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.create(dto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(argon2.hash).toHaveBeenCalledWith('password1234');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          role: Role.ADMIN,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(createdUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password1234',
        role: Role.ADMIN,
      };
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '2',
        role: Role.ADMIN,
      } as any);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should prevent mutating a SUPER_ADMIN account', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'root_id',
        role: Role.SUPER_ADMIN,
      } as any);

      await expect(
        service.update('root_id', { isActive: false }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user to update does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(
        service.update('missing', { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update and return a safely selected user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '2',
        role: Role.ADMIN,
      });
      const updated = {
        id: '2',
        email: 'a@b.c',
        role: Role.STAFF,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.user.update.mockResolvedValue(updated);

      const result = await service.update('2', {
        role: Role.STAFF,
        isActive: false,
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: '2' },
        data: { role: Role.STAFF, isActive: false },
        select: expect.any(Object),
      });
      expect(result).toEqual(updated);
    });
  });

  describe('findAll', () => {
    it('should return paginated users safely', async () => {
      const mockUsers = [{ id: '1', email: '1@test.com' }];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(15);

      const result = await service.findAll({ page: 2, limit: 5 });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual({
        data: mockUsers,
        meta: {
          total: 15,
          page: 2,
          limit: 5,
          lastPage: 3,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return safe user if found', async () => {
      const u = { id: '1', email: 'x@x.c' };
      mockPrismaService.user.findUnique.mockResolvedValue(u as any);
      expect(await service.findOne('1')).toEqual(u);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });
});
