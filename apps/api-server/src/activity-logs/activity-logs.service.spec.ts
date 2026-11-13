import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from 'database';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../database/prisma.service';
import { ActivityLogsService } from './activity-logs.service';

describe('ActivityLogsService', () => {
  let service: ActivityLogsService;
  let prisma: {
    activityLog: {
      create: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  const superAdminUser: AuthenticatedUser = {
    id: 'user-super-admin',
    email: 'super@irvite.id',
    role: Role.SUPER_ADMIN,
  };

  const adminUser: AuthenticatedUser = {
    id: 'user-admin',
    email: 'admin@irvite.id',
    role: Role.ADMIN,
  };

  const staffUser: AuthenticatedUser = {
    id: 'user-staff',
    email: 'staff@irvite.id',
    role: Role.STAFF,
  };

  beforeEach(async () => {
    prisma = {
      activityLog: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ActivityLogsService>(ActivityLogsService);
  });

  describe('record', () => {
    it('creates an activity log successfully', async () => {
      const mockResult = {
        id: 'log-1',
        action: 'ORDER_CREATE',
        entityType: 'Order',
        entityId: 'ord-123',
        createdAt: new Date(),
      };
      prisma.activityLog.create.mockResolvedValue(mockResult);

      const res = await service.record({
        action: 'ORDER_CREATE',
        entityType: 'Order',
        entityId: 'ord-123',
        actorUserId: 'user-1',
        actorRole: Role.ADMIN,
        eventId: 'evt-1',
        metadata: { price: 199000 },
        ip: '127.0.0.1',
      });

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          actorUserId: 'user-1',
          actorRole: Role.ADMIN,
          action: 'ORDER_CREATE',
          entityType: 'Order',
          entityId: 'ord-123',
          eventId: 'evt-1',
          metadata: { price: 199000 },
          ip: '127.0.0.1',
        },
      });
      expect(res).toEqual(mockResult);
    });

    it('fails safely and returns null without throwing if DB error occurs', async () => {
      prisma.activityLog.create.mockRejectedValue(new Error('DB connection lost'));

      const res = await service.record({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        entityId: 'test@irvite.id',
      });

      expect(res).toBeNull();
    });
  });

  describe('listLogs', () => {
    it('throws ForbiddenException when accessed by STAFF role', async () => {
      await expect(service.listLogs({}, staffUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows SUPER_ADMIN to query all logs without ownership restriction', async () => {
      prisma.activityLog.count.mockResolvedValue(1);
      prisma.activityLog.findMany.mockResolvedValue([
        { id: 'log-1', action: 'EVENT_UPDATE' },
      ]);

      const res = await service.listLogs({ page: 1, limit: 10 }, superAdminUser);

      expect(prisma.activityLog.count).toHaveBeenCalledWith({ where: {} });
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });

    it('scopes ADMIN queries to their own actions or events', async () => {
      prisma.activityLog.count.mockResolvedValue(1);
      prisma.activityLog.findMany.mockResolvedValue([
        { id: 'log-2', action: 'CHECK_IN' },
      ]);

      await service.listLogs({ action: 'CHECK_IN' }, adminUser);

      expect(prisma.activityLog.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          action: 'CHECK_IN',
          OR: [
            { actorUserId: adminUser.id },
            { event: { userId: adminUser.id } },
          ],
        }),
      });
    });
  });

  describe('cleanupOldLogs', () => {
    it('deletes activity logs older than retention period', async () => {
      prisma.activityLog.deleteMany.mockResolvedValue({ count: 42 });

      const res = await service.cleanupOldLogs(180);

      expect(res.deletedCount).toBe(42);
      expect(prisma.activityLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });
});

