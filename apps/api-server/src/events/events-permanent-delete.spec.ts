/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaService } from '../database/prisma.service';
import { MediaStorageService } from '../media/media-storage.service';
import { Role } from 'database';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { EVENT_STATUS } from './event-status';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('EventsService - Permanent Event Delete & Lifecycle Safety', () => {
  let service: EventsService;
  let prisma: PrismaService;
  let mediaStorage: MediaStorageService;

  const mockTx = {
    attendanceCheckIn: { deleteMany: jest.fn() },
    attendance: { deleteMany: jest.fn() },
    invitation: { deleteMany: jest.fn() },
    guest: { deleteMany: jest.fn() },
    media: { deleteMany: jest.fn() },
    staffEvent: { deleteMany: jest.fn() },
    event: { delete: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockTx.attendanceCheckIn.deleteMany.mockResolvedValue({ count: 2 });
    mockTx.attendance.deleteMany.mockResolvedValue({ count: 2 });
    mockTx.invitation.deleteMany.mockResolvedValue({ count: 5 });
    mockTx.guest.deleteMany.mockResolvedValue({ count: 5 });
    mockTx.media.deleteMany.mockResolvedValue({ count: 3 });
    mockTx.staffEvent.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.event.delete.mockResolvedValue({ id: 'archived-event-1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: PrismaService,
          useValue: {
            event: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            media: {
              findMany: jest.fn(),
            },
            user: {
              count: jest.fn().mockResolvedValue(3),
            },
            template: {
              count: jest.fn().mockResolvedValue(5),
            },
            $transaction: jest.fn(
              async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
                await cb(mockTx),
            ),
          },
        },
        {
          provide: MediaStorageService,
          useValue: {
            deleteFile: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    prisma = module.get<PrismaService>(PrismaService);
    mediaStorage = module.get<MediaStorageService>(MediaStorageService);
  });

  describe('Authorization & Lifecycle State Pre-conditions', () => {
    it('service-layer RBAC directly rejects STAFF with ForbiddenException (defense-in-depth)', async () => {
      await expect(
        service.permanentDelete('any-event', 'staff-user-id', Role.STAFF),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.event.findFirst).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(mediaStorage.deleteFile).not.toHaveBeenCalled();
    });

    it('service-layer RBAC rejects unknown or unsupported roles with ForbiddenException', async () => {
      await expect(
        service.permanentDelete('any-event', 'user-id', 'UNKNOWN_ROLE' as Role),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.event.findFirst).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN can permanently delete any archived event', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'ev-archived',
        title: 'Archived Gala',
        status: EVENT_STATUS.ARCHIVED,
      });
      (prisma.media.findMany as jest.Mock).mockResolvedValue([
        { url: 'media/photo1.webp' },
      ]);

      const res = await service.permanentDelete(
        'ev-archived',
        'superadmin-1',
        Role.SUPER_ADMIN,
      );

      expect(prisma.event.findFirst).toHaveBeenCalledWith({
        where: { id: 'ev-archived' },
        select: { id: true, title: true, status: true },
      });
      expect(res.status).toBe('success');
      expect(res.data.id).toBe('ev-archived');
      expect(res.data.deletedCounts.events).toBe(1);
    });

    it('ADMIN owner can permanently delete their own archived event', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'ev-archived-owner',
        title: 'My Wedding',
        status: EVENT_STATUS.ARCHIVED,
      });
      (prisma.media.findMany as jest.Mock).mockResolvedValue([]);

      const res = await service.permanentDelete(
        'ev-archived-owner',
        'admin-owner-id',
        Role.ADMIN,
      );

      expect(prisma.event.findFirst).toHaveBeenCalledWith({
        where: { id: 'ev-archived-owner', userId: 'admin-owner-id' },
        select: { id: true, title: true, status: true },
      });
      expect(res.status).toBe('success');
      expect(res.data.title).toBe('My Wedding');
    });

    it('ADMIN cross-tenant receives opaque 404 NotFoundException', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.permanentDelete('foreign-event', 'admin-hacker-id', Role.ADMIN),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(mediaStorage.deleteFile).not.toHaveBeenCalled();
    });

    it('nonexistent event returns 404 NotFoundException', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.permanentDelete(
          'non-existent-uuid',
          'any-id',
          Role.SUPER_ADMIN,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('DRAFT event cannot be permanently deleted and throws 400 BadRequestException', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'ev-draft',
        title: 'Draft Event',
        status: EVENT_STATUS.DRAFT,
      });

      await expect(
        service.permanentDelete('ev-draft', 'owner-id', Role.ADMIN),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(mediaStorage.deleteFile).not.toHaveBeenCalled();
    });

    it('PUBLISHED event cannot be permanently deleted and throws 400 BadRequestException', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'ev-published',
        title: 'Published Event',
        status: EVENT_STATUS.PUBLISHED,
      });

      await expect(
        service.permanentDelete('ev-published', 'owner-id', Role.ADMIN),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(mediaStorage.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe('Atomic Bottom-Up Transaction & Data Integrity', () => {
    it('deletes child records in explicit bottom-up order and removes event', async () => {
      const order: string[] = [];
      mockTx.attendanceCheckIn.deleteMany.mockImplementation(() => {
        order.push('attendance_check_ins');
        return Promise.resolve({ count: 1 });
      });
      mockTx.attendance.deleteMany.mockImplementation(() => {
        order.push('attendances');
        return Promise.resolve({ count: 1 });
      });
      mockTx.invitation.deleteMany.mockImplementation(() => {
        order.push('invitations');
        return Promise.resolve({ count: 1 });
      });
      mockTx.guest.deleteMany.mockImplementation(() => {
        order.push('guests');
        return Promise.resolve({ count: 1 });
      });
      mockTx.media.deleteMany.mockImplementation(() => {
        order.push('medias');
        return Promise.resolve({ count: 1 });
      });
      mockTx.staffEvent.deleteMany.mockImplementation(() => {
        order.push('staff_events');
        return Promise.resolve({ count: 1 });
      });
      mockTx.event.delete.mockImplementation(() => {
        order.push('event');
        return Promise.resolve({ id: 'ev-1' });
      });

      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'ev-1',
        title: 'Order Test Event',
        status: EVENT_STATUS.ARCHIVED,
      });
      (prisma.media.findMany as jest.Mock).mockResolvedValue([]);

      await service.permanentDelete('ev-1', 'admin-id', Role.ADMIN);

      expect(order).toEqual([
        'attendance_check_ins',
        'attendances',
        'invitations',
        'guests',
        'medias',
        'staff_events',
        'event',
      ]);
    });

    it('rolls back entire transaction if any child deletion fails', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'ev-fail',
        title: 'Failing Child Event',
        status: EVENT_STATUS.ARCHIVED,
      });
      (prisma.media.findMany as jest.Mock).mockResolvedValue([
        { url: 'media/test.jpg' },
      ]);

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
          mockTx.attendanceCheckIn.deleteMany.mockResolvedValue({ count: 0 });
          mockTx.attendance.deleteMany.mockRejectedValue(
            new Error('Foreign key deadlock simulated'),
          );
          return await cb(mockTx);
        },
      );

      await expect(
        service.permanentDelete('ev-fail', 'admin-id', Role.ADMIN),
      ).rejects.toThrow('Foreign key deadlock simulated');

      // Crucial: physical files must NOT be deleted if DB transaction fails
      expect(mediaStorage.deleteFile).not.toHaveBeenCalled();
    });

    it('preserves unrelated users, templates, and events', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'ev-scoped',
        title: 'Scoped Event',
        status: EVENT_STATUS.ARCHIVED,
      });
      (prisma.media.findMany as jest.Mock).mockResolvedValue([]);

      await service.permanentDelete('ev-scoped', 'admin-id', Role.ADMIN);

      expect(mockTx.attendanceCheckIn.deleteMany).toHaveBeenCalledWith({
        where: { attendance: { eventId: 'ev-scoped' } },
      });
      expect(mockTx.attendance.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'ev-scoped' },
      });
      expect(mockTx.invitation.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'ev-scoped' },
      });
      expect(mockTx.guest.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'ev-scoped' },
      });
      expect(mockTx.media.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'ev-scoped' },
      });
      expect(mockTx.staffEvent.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'ev-scoped' },
      });
      expect(mockTx.event.delete).toHaveBeenCalledWith({
        where: { id: 'ev-scoped' },
      });
    });
  });

  describe('Media Physical File Cleanup & Failure Resilience', () => {
    it('collects media keys BEFORE DB deletion and unlinks only AFTER transaction commits', async () => {
      const callSequence: string[] = [];

      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'ev-media',
        title: 'Media Test',
        status: EVENT_STATUS.ARCHIVED,
      });

      (prisma.media.findMany as jest.Mock).mockImplementation(() => {
        callSequence.push('collect_keys');
        return Promise.resolve([
          { url: 'media/first.webp' },
          { url: 'media/second.webp' },
        ]);
      });

      (prisma.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
          callSequence.push('db_transaction');
          return await cb(mockTx);
        },
      );

      (mediaStorage.deleteFile as jest.Mock).mockImplementation(
        (url: string) => {
          callSequence.push(`unlink_${url}`);
          return Promise.resolve();
        },
      );

      const res = await service.permanentDelete(
        'ev-media',
        'admin-id',
        Role.ADMIN,
      );

      expect(callSequence).toEqual([
        'collect_keys',
        'db_transaction',
        'unlink_media/first.webp',
        'unlink_media/second.webp',
      ]);
      expect(res.status).toBe('success');
      expect(res.data.warnings).toBeUndefined();
    });

    it('file unlink failure does not roll back or corrupt DB transaction (succeeds with warnings)', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'ev-unlink-fail',
        title: 'Unlink Fail Event',
        status: EVENT_STATUS.ARCHIVED,
      });

      (prisma.media.findMany as jest.Mock).mockResolvedValue([
        { url: 'media/missing.jpg' },
      ]);

      (mediaStorage.deleteFile as jest.Mock).mockRejectedValue(
        new Error('EPERM: operation not permitted'),
      );

      const res = await service.permanentDelete(
        'ev-unlink-fail',
        'admin-id',
        Role.ADMIN,
      );

      expect(res.status).toBe('success');
      expect(res.data.warnings).toBeDefined();
      expect(res.data.warnings?.[0]).toContain(
        'EPERM: operation not permitted',
      );
    });
  });

  describe('Controller RBAC & Method Preservation', () => {
    it('EventsController delegates permanentDelete with current user credentials', async () => {
      const controller = new EventsController(service);
      const permSpy = jest.spyOn(service, 'permanentDelete').mockResolvedValue({
        status: 'success',
        message: 'Deleted',
        data: {
          id: 'ev-ctrl',
          title: 'Ctrl Test',
          deletedCounts: {} as any,
          warnings: undefined,
        },
      });

      const user: AuthenticatedUser = {
        id: 'u1',
        role: Role.ADMIN,
        email: 'a@test.id',
      };
      const res = await controller.permanentDelete('ev-ctrl', user);

      expect(permSpy).toHaveBeenCalledWith('ev-ctrl', 'u1', Role.ADMIN);
      expect(res.status).toBe('success');
    });

    it('RolesGuard rejects STAFF from EventsController endpoints with 403', () => {
      const reflector = new Reflector();
      const guard = new RolesGuard(reflector);

      const mockContext = {
        getHandler: () => EventsController.prototype.permanentDelete,
        getClass: () => EventsController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'staff-1', role: Role.STAFF },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('existing archive behavior remains unchanged (soft-delete to ARCHIVED)', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'ev-arch',
        status: EVENT_STATUS.DRAFT,
      });
      (prisma.event.update as jest.Mock).mockResolvedValue({
        id: 'ev-arch',
        status: EVENT_STATUS.ARCHIVED,
      });

      const res = await service.archive('ev-arch', 'u1', Role.ADMIN);
      expect(res).toEqual({
        success: true,
        message: 'Event archived successfully',
      });
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 'ev-arch' },
        data: { status: EVENT_STATUS.ARCHIVED },
      });
    });

    it('existing restore behavior remains unchanged (restores ARCHIVED to DRAFT)', async () => {
      (prisma.event.findFirst as jest.Mock).mockResolvedValue({
        id: 'ev-rest',
        status: EVENT_STATUS.ARCHIVED,
      });
      (prisma.event.update as jest.Mock).mockResolvedValue({
        id: 'ev-rest',
        status: EVENT_STATUS.DRAFT,
      });

      const res = await service.restore('ev-rest', 'u1', Role.ADMIN);
      expect(res.success).toBe(true);
      expect(res.message).toContain('restored successfully to DRAFT');
      expect(prisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ev-rest' },
          data: { status: EVENT_STATUS.DRAFT },
        }),
      );
    });
  });
});
