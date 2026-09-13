/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { PrismaService } from '../database/prisma.service';
import { Role, Prisma } from 'database';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as argon2 from 'argon2';

describe('StaffService', () => {
  let service: StaffService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCandidates', () => {
    it('should fetch active staff candidates and omit passwordHash', async () => {
      prisma.user.findMany.mockResolvedValueOnce([
        { id: '1', email: 's@s.com' },
      ]);
      const result = await service.getCandidates();

      expect(result.data).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: Role.STAFF, isActive: true },
        select: { id: true, email: true },
        orderBy: [{ email: 'asc' }, { id: 'asc' }],
      });
    });
  });

  describe('findAll', () => {
    it('1. list returns STAFF only and maps assignedEventCount', async () => {
      prisma.user.findMany.mockResolvedValueOnce([
        {
          id: 'staff-1',
          email: 'staff1@test.com',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { staffEvents: 3 },
        },
      ]);
      prisma.user.count.mockResolvedValueOnce(1);

      const result = await service.findAll({});

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: Role.STAFF },
        }),
      );
      expect(result.data[0].assignedEventCount).toBe(3);
      expect((result.data[0] as any).passwordHash).toBeUndefined();
    });

    it('2. pagination: handles page and limit correctly', async () => {
      prisma.user.findMany.mockResolvedValueOnce([]);
      prisma.user.count.mockResolvedValueOnce(25);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it('3. search: filters by email substring (lowercased)', async () => {
      prisma.user.findMany.mockResolvedValueOnce([]);
      prisma.user.count.mockResolvedValueOnce(0);

      await service.findAll({ search: ' Operator ' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            role: Role.STAFF,
            email: { contains: 'operator' },
          },
        }),
      );
    });

    it('4. active filter: status = active sets isActive = true', async () => {
      prisma.user.findMany.mockResolvedValueOnce([]);
      prisma.user.count.mockResolvedValueOnce(0);

      await service.findAll({ status: 'active' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: Role.STAFF, isActive: true },
        }),
      );
    });

    it('5. inactive filter: status = inactive sets isActive = false', async () => {
      prisma.user.findMany.mockResolvedValueOnce([]);
      prisma.user.count.mockResolvedValueOnce(0);

      await service.findAll({ status: 'inactive' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: Role.STAFF, isActive: false },
        }),
      );
    });

    it('6. passwordHash never selected/returned in findAll', async () => {
      prisma.user.findMany.mockResolvedValueOnce([
        {
          id: 'staff-1',
          email: 'staff1@test.com',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { staffEvents: 0 },
        },
      ]);
      prisma.user.count.mockResolvedValueOnce(1);

      const result = await service.findAll({});
      expect((result.data[0] as any).passwordHash).toBeUndefined();
    });
  });

  describe('create', () => {
    it('7, 8, 9. create forces STAFF role, defaults active, and hashes password with argon2id', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null); // No existing
      prisma.user.create.mockImplementationOnce((args) =>
        Promise.resolve({
          id: 'new-staff-id',
          email: args.data.email,
          role: args.data.role,
          isActive: args.data.isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.create({
        email: ' NewStaff@Test.com ',
        password: 'securepassword1234',
      });

      expect(result.email).toBe('newstaff@test.com');
      expect(result.role).toBe(Role.STAFF);
      expect(result.isActive).toBe(true);
      expect((result as any).passwordHash).toBeUndefined();

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'newstaff@test.com',
            role: Role.STAFF,
            isActive: true,
            passwordHash: expect.any(String),
          }),
        }),
      );

      const createdHash = prisma.user.create.mock.calls[0][0].data.passwordHash;
      const verify = await argon2.verify(createdHash, 'securepassword1234');
      expect(verify).toBe(true);
    });

    it('10. duplicate email -> 409 ConflictException', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'existing-id',
        email: 'duplicate@test.com',
      });

      await expect(
        service.create({
          email: 'duplicate@test.com',
          password: 'securepassword1234',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('10b. Prisma P2002 race condition -> 409 ConflictException', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.x' },
      );
      prisma.user.create.mockRejectedValueOnce(p2002Error);

      await expect(
        service.create({
          email: 'duplicate@test.com',
          password: 'securepassword1234',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('11. findOne STAFF returns safe details with assignedEvents', async () => {
      const now = new Date();
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'staff-123',
        email: 'staff@test.com',
        role: Role.STAFF,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        staffEvents: [
          {
            createdAt: now,
            event: {
              id: 'event-1',
              title: 'Grand Wedding',
              slug: 'grand-wedding',
              status: 'PUBLISHED',
              eventDate: now,
            },
          },
        ],
      });

      const result = await service.findOne('staff-123');

      expect(result.id).toBe('staff-123');
      expect(result.role).toBe(Role.STAFF);
      expect(result.assignedEvents).toHaveLength(1);
      expect(result.assignedEvents[0]).toEqual({
        id: 'event-1',
        title: 'Grand Wedding',
        slug: 'grand-wedding',
        status: 'PUBLISHED',
        eventDate: now,
        assignedAt: now,
      });
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('12. findOne ADMIN -> opaque 404 NotFoundException', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'admin-123',
        email: 'admin@test.com',
        role: Role.ADMIN,
      });

      await expect(service.findOne('admin-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('13. findOne SUPER_ADMIN -> opaque 404 NotFoundException', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'super-123',
        email: 'super@test.com',
        role: Role.SUPER_ADMIN,
      });

      await expect(service.findOne('super-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('14. unknown -> 404 NotFoundException', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne('unknown-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('throws BadRequestException if no fields provided', async () => {
      await expect(service.update('staff-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('15, 16. update email normalizes email and updates User', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'staff-1',
          role: Role.STAFF,
          email: 'old@test.com',
        }) // target check
        .mockResolvedValueOnce(null); // uniqueness check for new email

      prisma.user.update.mockResolvedValueOnce({
        id: 'staff-1',
        email: 'newemail@test.com',
        role: Role.STAFF,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update('staff-1', {
        email: '  NewEmail@Test.com ',
      });

      expect(result.email).toBe('newemail@test.com');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'staff-1' },
          data: { email: 'newemail@test.com' },
        }),
      );
    });

    it('17. duplicate update email -> 409 ConflictException', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'staff-1',
          role: Role.STAFF,
          email: 'old@test.com',
        })
        .mockResolvedValueOnce({
          id: 'other-user',
          email: 'taken@test.com',
        });

      await expect(
        service.update('staff-1', { email: 'taken@test.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('18, 19. deactivate updates isActive = false and preserves staffEvents', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'staff-1',
        role: Role.STAFF,
        email: 'staff@test.com',
      });

      prisma.user.update.mockResolvedValueOnce({
        id: 'staff-1',
        email: 'staff@test.com',
        role: Role.STAFF,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update('staff-1', { isActive: false });

      expect(result.isActive).toBe(false);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'staff-1' },
        data: { isActive: false },
        select: expect.any(Object),
      });
    });

    it('20. reactivate updates isActive = true', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'staff-1',
        role: Role.STAFF,
        email: 'staff@test.com',
      });

      prisma.user.update.mockResolvedValueOnce({
        id: 'staff-1',
        email: 'staff@test.com',
        role: Role.STAFF,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update('staff-1', { isActive: true });
      expect(result.isActive).toBe(true);
    });

    it('update rejects targeting non-STAFF with opaque 404', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'admin-1',
        role: Role.ADMIN,
        email: 'admin@test.com',
      });

      await expect(
        service.update('admin-1', { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resetPassword', () => {
    it('21, 22. password reset hashes new password with argon2id and returns nothing', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'staff-1',
        role: Role.STAFF,
      });
      prisma.user.update.mockResolvedValueOnce({});

      await service.resetPassword('staff-1', {
        password: 'brandnewpassword1234',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'staff-1' },
          data: { passwordHash: expect.any(String) },
        }),
      );

      const savedHash = prisma.user.update.mock.calls[0][0].data.passwordHash;
      const valid = await argon2.verify(savedHash, 'brandnewpassword1234');
      expect(valid).toBe(true);
    });

    it('password reset rejects targeting non-STAFF with opaque 404', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'super-1',
        role: Role.SUPER_ADMIN,
      });

      await expect(
        service.resetPassword('super-1', {
          password: 'newpassword1234',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
