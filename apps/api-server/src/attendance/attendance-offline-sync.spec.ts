import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../database/prisma.service';
import { ReportsService } from '../reports/reports.service';
import { Role } from 'database';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('AttendanceService - Offline Snapshot & Sync', () => {
  let service: AttendanceService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    guest: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    invitation: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    attendance: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    attendanceCheckIn: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
    offlineSyncOp: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  const mockReportsService = {
    generateExcel: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ReportsService, useValue: mockReportsService },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  const validEvent = {
    id: 'evt-100',
    userId: 'admin-1',
    title: 'The Wedding of Romeo & Juliet',
    status: 'PUBLISHED',
    eventDate: new Date('2027-10-10T10:00:00.000Z'),
    staffEvents: [],
  };

  const adminUser = {
    id: 'admin-1',
    role: Role.ADMIN,
    isActive: true,
  };

  describe('getOfflineSnapshot', () => {
    it('returns structured offline snapshot for authorized admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.event.findUnique.mockResolvedValue(validEvent);

      mockPrisma.guest.findMany.mockResolvedValue([
        {
          id: 'g-1',
          name: 'Budi Santoso (VIP)',
          category: 'VIP_FAMILY',
          maxPax: 2,
          tableNumber: 'A-01',
          invitation: {
            id: 'inv-1',
            uniqueCode: 'CODE-VIP-1',
            attendances: [
              {
                scannedPax: 2,
                scannedAt: new Date('2027-10-10T10:30:00.000Z'),
                checkIns: [],
              },
            ],
          },
        },
        {
          id: 'g-2',
          name: 'Siti Rahma',
          category: 'REGULAR',
          maxPax: 1,
          tableNumber: 'B-05',
          invitation: {
            id: 'inv-2',
            uniqueCode: 'CODE-REG-2',
            attendances: [],
          },
        },
      ]);

      const result = await service.getOfflineSnapshot(
        'evt-100',
        'admin-1',
        Role.ADMIN,
      );

      expect(result.eventId).toBe('evt-100');
      expect(result.totalGuests).toBe(2);
      expect(result.totalCheckedInGuests).toBe(1);
      expect(result.totalCheckedInPax).toBe(2);
      expect(result.guests).toHaveLength(2);

      const vipGuest = result.guests[0];
      expect(vipGuest.guestId).toBe('g-1');
      expect(vipGuest.isVip).toBe(true);
      expect(vipGuest.status).toBe('CHECKED_IN');
      expect(vipGuest.tableNumber).toBe('A-01');

      const regGuest = result.guests[1];
      expect(regGuest.guestId).toBe('g-2');
      expect(regGuest.isVip).toBe(false);
      expect(regGuest.status).toBe('NOT_CHECKED_IN');
    });

    it('rejects access if event is not published', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.event.findUnique.mockResolvedValue({
        ...validEvent,
        status: 'DRAFT',
      });

      await expect(
        service.getOfflineSnapshot('evt-100', 'admin-1', Role.ADMIN),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('syncAttendance', () => {
    it('is idempotent: duplicate opId returns DUPLICATE status without re-executing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.event.findUnique.mockResolvedValue(validEvent);

      // Simulates opId already recorded in offline_sync_ops
      mockPrisma.offlineSyncOp.findUnique.mockResolvedValue({
        id: 'op-uuid-1',
        eventId: 'evt-100',
        opType: 'CHECK_IN',
        status: 'APPLIED',
      });

      const batch = {
        operations: [
          {
            opId: 'op-uuid-1',
            type: 'CHECK_IN' as const,
            code: 'CODE-123',
            pax: 1,
            clientTimestamp: new Date().toISOString(),
          },
        ],
      };

      const result = await service.syncAttendance(
        'evt-100',
        'admin-1',
        Role.ADMIN,
        batch,
      );

      expect(result.totalOperations).toBe(1);
      expect(result.duplicateCount).toBe(1);
      expect(result.appliedCount).toBe(0);
      expect(result.results[0].status).toBe('DUPLICATE');

      // Verify that no check-in was executed
      expect(mockPrisma.invitation.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.attendanceCheckIn.create).not.toHaveBeenCalled();
    });

    it('processes valid walk-in operation and records offlineSyncOp', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.event.findUnique.mockResolvedValue(validEvent);
      mockPrisma.offlineSyncOp.findUnique.mockResolvedValue(null);

      mockPrisma.guest.create.mockResolvedValue({
        id: 'new-guest-id',
        eventId: 'evt-100',
        name: 'Tamu Dadakan',
        category: 'ON_THE_SPOT',
        maxPax: 2,
      });

      mockPrisma.invitation.create.mockResolvedValue({
        id: 'new-inv-id',
        guestId: 'new-guest-id',
        eventId: 'evt-100',
        uniqueCode: 'auto-code',
      });

      mockPrisma.attendance.create.mockResolvedValue({
        id: 'new-att-id',
        invitationId: 'new-inv-id',
        scannedPax: 2,
      });

      mockPrisma.attendanceCheckIn.create.mockResolvedValue({
        id: 'chk-1',
        attendanceId: 'new-att-id',
      });

      const batch = {
        operations: [
          {
            opId: 'op-walkin-101',
            type: 'WALK_IN' as const,
            walkInData: {
              name: 'Tamu Dadakan',
              pax: 2,
              category: 'VIP_SPONSOR',
              tableNumber: 'V-01',
            },
            clientTimestamp: new Date().toISOString(),
          },
        ],
      };

      const result = await service.syncAttendance(
        'evt-100',
        'admin-1',
        Role.ADMIN,
        batch,
      );

      expect(result.totalOperations).toBe(1);
      expect(result.appliedCount).toBe(1);
      expect(result.results[0].status).toBe('APPLIED');
      expect(result.results[0].type).toBe('WALK_IN');

      // Verify offlineSyncOp was persisted
      expect(mockPrisma.offlineSyncOp.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'op-walkin-101',
            opType: 'WALK_IN',
            status: 'APPLIED',
          }),
        }),
      );
    });
  });
});

