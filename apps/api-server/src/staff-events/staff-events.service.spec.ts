/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { StaffEventsService } from './staff-events.service';
import { PrismaService } from '../database/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Role, Prisma } from '@prisma/client';

describe('StaffEventsService', () => {
  let service: StaffEventsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffEventsService,
        {
          provide: PrismaService,
          useValue: {
            event: { findUnique: jest.fn() },
            user: { findUnique: jest.fn() },
            staffEvent: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<StaffEventsService>(StaffEventsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('authorizeEventManagement', () => {
    it('should reject STAFF', async () => {
      await expect(
        (service as any).authorizeEventManagement('e1', { role: Role.STAFF }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject if event not found', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        (service as any).authorizeEventManagement('e1', {
          role: Role.SUPER_ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject ADMIN if not owner (IDOR protection)', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        userId: 'other',
      });
      await expect(
        (service as any).authorizeEventManagement('e1', {
          id: 'u1',
          role: Role.ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow ADMIN owner', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        userId: 'u1',
      });
      await expect(
        (service as any).authorizeEventManagement('e1', {
          id: 'u1',
          role: Role.ADMIN,
        }),
      ).resolves.toBeUndefined();
    });

    it('should allow SUPER_ADMIN', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        userId: 'other',
      });
      await expect(
        (service as any).authorizeEventManagement('e1', {
          role: Role.SUPER_ADMIN,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('getStaffForEvent', () => {
    it('should return deterministic order and project correctly', async () => {
      jest
        .spyOn(service as any, 'authorizeEventManagement')
        .mockResolvedValue(undefined);

      (prisma.staffEvent.findMany as jest.Mock).mockResolvedValue([
        {
          userId: 'u1',
          eventId: 'e1',
          createdAt: new Date('2023-01-01'),
          user: {
            id: 'u1',
            email: 'u1@test.com',
            role: Role.ADMIN,
            isActive: false,
          },
        },
      ]);

      const result = await service.getStaffForEvent('e1', {
        id: 'admin1',
        role: Role.ADMIN,
      });

      expect(prisma.staffEvent.findMany).toHaveBeenCalledWith({
        where: { eventId: 'e1' },
        orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
        include: {
          user: {
            select: { id: true, email: true, role: true, isActive: true },
          },
        },
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0]).toEqual({
        userId: 'u1',
        email: 'u1@test.com',
        role: Role.ADMIN,
        isActive: false,
        createdAt: new Date('2023-01-01'),
      });
      expect(result.data[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('assignStaff', () => {
    it('should reject if target user is unknown', async () => {
      jest
        .spyOn(service as any, 'authorizeEventManagement')
        .mockResolvedValue(undefined);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.assignStaff('e1', 'u1', {
          id: 'admin1',
          role: Role.SUPER_ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if target user is ADMIN', async () => {
      jest
        .spyOn(service as any, 'authorizeEventManagement')
        .mockResolvedValue(undefined);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: Role.ADMIN,
        isActive: true,
      });

      await expect(
        service.assignStaff('e1', 'u1', {
          id: 'admin1',
          role: Role.SUPER_ADMIN,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if target user is inactive STAFF', async () => {
      jest
        .spyOn(service as any, 'authorizeEventManagement')
        .mockResolvedValue(undefined);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: Role.STAFF,
        isActive: false,
      });

      await expect(
        service.assignStaff('e1', 'u1', {
          id: 'admin1',
          role: Role.SUPER_ADMIN,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should trap P2002 exact duplicate assignment', async () => {
      jest
        .spyOn(service as any, 'authorizeEventManagement')
        .mockResolvedValue(undefined);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: Role.STAFF,
        isActive: true,
      });
      (prisma.staffEvent.create as jest.Mock).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      (prisma.staffEvent.findUnique as jest.Mock).mockResolvedValue({
        userId: 'u1',
      });

      await expect(
        service.assignStaff('e1', 'u1', {
          id: 'admin1',
          role: Role.SUPER_ADMIN,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should rethrow P2002 if exact duplicate not found', async () => {
      jest
        .spyOn(service as any, 'authorizeEventManagement')
        .mockResolvedValue(undefined);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: Role.STAFF,
        isActive: true,
      });
      const error = new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      });
      (prisma.staffEvent.create as jest.Mock).mockRejectedValue(error);
      (prisma.staffEvent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.assignStaff('e1', 'u1', {
          id: 'admin1',
          role: Role.SUPER_ADMIN,
        }),
      ).rejects.toThrow(error);
    });

    it('should create assignment successfully', async () => {
      jest
        .spyOn(service as any, 'authorizeEventManagement')
        .mockResolvedValue(undefined);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: Role.STAFF,
        isActive: true,
      });
      (prisma.staffEvent.create as jest.Mock).mockResolvedValue({
        userId: 'u1',
        eventId: 'e1',
        createdAt: new Date(),
      });

      const result = await service.assignStaff('e1', 'u1', {
        id: 'admin1',
        role: Role.SUPER_ADMIN,
      });
      expect(result.userId).toBe('u1');
    });
  });

  describe('unassignStaff', () => {
    it('should trap P2025 missing assignment', async () => {
      jest
        .spyOn(service as any, 'authorizeEventManagement')
        .mockResolvedValue(undefined);
      (prisma.staffEvent.delete as jest.Mock).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.unassignStaff('e1', 'u1', {
          id: 'admin1',
          role: Role.SUPER_ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should unassign successfully', async () => {
      jest
        .spyOn(service as any, 'authorizeEventManagement')
        .mockResolvedValue(undefined);
      (prisma.staffEvent.delete as jest.Mock).mockResolvedValue({});

      await expect(
        service.unassignStaff('e1', 'u1', {
          id: 'admin1',
          role: Role.SUPER_ADMIN,
        }),
      ).resolves.toBeUndefined();
    });
  });
});
