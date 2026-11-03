/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../database/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Role, Prisma } from '@prisma/client';
import { ReportsService } from '../reports/reports.service';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockPrisma: any = {
      user: { findUnique: jest.fn() },
      event: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      guest: { findMany: jest.fn() },
      invitation: { findUnique: jest.fn() },
      attendance: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      attendanceCheckIn: {
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(async (cb: any) => await cb(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        { provide: ReportsService, useValue: {} },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('authorizeEvent', () => {
    it('SUPER_ADMIN -> authorized', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.SUPER_ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        userId: 'other',
        status: 'PUBLISHED',
      });

      const event = await (service as any).authorizeEvent('e1', 'u1');
      expect(event).toBeDefined();
    });

    it('ADMIN own event -> authorized', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        userId: 'u1',
        status: 'PUBLISHED',
      });

      const event = await (service as any).authorizeEvent('e1', 'u1');
      expect(event).toBeDefined();
    });

    it('ADMIN other event -> 404', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        userId: 'other',
        status: 'PUBLISHED',
      });

      await expect((service as any).authorizeEvent('e1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('STAFF assigned -> authorized', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.STAFF,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        userId: 'owner',
        staffEvents: [{ userId: 'u1' }],
        status: 'PUBLISHED',
      });

      const event = await (service as any).authorizeEvent('e1', 'u1');
      expect(event).toBeDefined();
    });

    it('STAFF unassigned -> 404', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.STAFF,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        userId: 'owner',
        staffEvents: [],
        status: 'PUBLISHED',
      });

      await expect((service as any).authorizeEvent('e1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('STAFF inactive -> 404', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: false,
        role: Role.STAFF,
      });

      await expect((service as any).authorizeEvent('e1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('DRAFT event -> 409', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        userId: 'u1',
        status: 'DRAFT',
      });

      await expect((service as any).authorizeEvent('e1', 'u1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('ARCHIVED event -> 409', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        userId: 'u1',
        status: 'ARCHIVED',
      });

      await expect((service as any).authorizeEvent('e1', 'u1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('expired published event -> 409', async () => {
      const expiredDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        userId: 'u1',
        status: 'PUBLISHED',
        eventDate: expiredDate,
      });

      await expect((service as any).authorizeEvent('e1', 'u1')).rejects.toThrow(
        new ConflictException('Event has expired'),
      );
    });
  });

  describe('resolve', () => {
    beforeEach(() => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        userId: 'u1',
        status: 'PUBLISHED',
      });
    });

    it('wrong event -> 404', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'other-event', name: 'John', maxPax: 2 },
        attendances: [],
      });

      await expect(
        service.resolve('e1', 'u1', Role.ADMIN, 'code'),
      ).rejects.toThrow(NotFoundException);
    });

    it('resolve NOT_CHECKED_IN (READY)', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', name: 'John', maxPax: 4 },
        attendances: [],
      });
      const res = await service.resolve('e1', 'u1', Role.ADMIN, 'code');
      expect(res.result).toBe('READY');
      expect(res.status).toBe('NOT_CHECKED_IN');
      expect(res.scannedPax).toBe(0);
      expect(res.remainingPax).toBe(4);
      expect(res.attendance).toBeNull();
      expect(res.checkIns).toEqual([]);
    });

    it('resolve PARTIAL (READY)', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', name: 'John', maxPax: 4 },
        attendances: [
          {
            scannedPax: 2,
            scannedAt: new Date(),
            checkIns: [
              {
                id: 'ci-1',
                scannedPax: 2,
                scannedAt: new Date(),
                scannedById: 'u1',
              },
            ],
          },
        ],
      });
      const res = await service.resolve('e1', 'u1', Role.ADMIN, 'code');
      expect(res.result).toBe('READY');
      expect(res.status).toBe('PARTIAL');
      expect(res.scannedPax).toBe(2);
      expect(res.remainingPax).toBe(2);
      expect(res.attendance).toBeDefined();
      expect(res.checkIns).toHaveLength(1);
    });

    it('resolve COMPLETE (ALREADY_CHECKED_IN)', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', name: 'John', maxPax: 2 },
        attendances: [
          {
            scannedPax: 2,
            scannedAt: new Date(),
            checkIns: [
              {
                id: 'ci-1',
                scannedPax: 2,
                scannedAt: new Date(),
                scannedById: 'u1',
              },
            ],
          },
        ],
      });
      const res = await service.resolve('e1', 'u1', Role.ADMIN, 'code');
      expect(res.result).toBe('ALREADY_CHECKED_IN');
      expect(res.status).toBe('COMPLETE');
      expect(res.scannedPax).toBe(2);
      expect(res.remainingPax).toBe(0);
      expect(res.attendance).toBeDefined();
    });

    it('RSVP mapping SENT -> PENDING', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        status: 'SENT',
        guest: { eventId: 'e1', name: 'John', maxPax: 2 },
        attendances: [],
      });
      const res = await service.resolve('e1', 'u1', Role.ADMIN, 'code');
      expect(res.rsvp.response).toBe('PENDING');
    });

    it('RSVP mapping RSVP_YES -> YES', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        status: 'RSVP_YES',
        rsvpPax: 2,
        guest: { eventId: 'e1', name: 'John', maxPax: 2 },
        attendances: [],
      });
      const res = await service.resolve('e1', 'u1', Role.ADMIN, 'code');
      expect(res.rsvp.response).toBe('YES');
      expect(res.rsvp.pax).toBe(2);
    });

    it('RSVP mapping RSVP_NO -> NO', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        status: 'RSVP_NO',
        guest: { eventId: 'e1', name: 'John', maxPax: 2 },
        attendances: [],
      });
      const res = await service.resolve('e1', 'u1', Role.ADMIN, 'code');
      expect(res.rsvp.response).toBe('NO');
      expect(res.rsvp.pax).toBeNull();
    });
  });

  describe('checkIn', () => {
    beforeEach(() => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        userId: 'u1',
        status: 'PUBLISHED',
      });
    });

    it('pax < 1 -> BadRequestException', async () => {
      await expect(
        service.checkIn('e1', 'u1', Role.ADMIN, 'code', 0),
      ).rejects.toThrow(BadRequestException);
    });

    it('pax > maxPax -> BadRequestException', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', maxPax: 2 },
      });
      await expect(
        service.checkIn('e1', 'u1', Role.ADMIN, 'code', 3),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.attendanceCheckIn.create).not.toHaveBeenCalled();
    });

    it('wrong event -> NotFoundException', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'other-event', maxPax: 2 },
      });
      await expect(
        service.checkIn('e1', 'u1', Role.ADMIN, 'code', 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('maxPax 1: +1 => COMPLETE', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', maxPax: 1 },
      });
      (prisma.attendance.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.attendance.create as jest.Mock).mockResolvedValue({
        id: 'att-1',
        invitationId: 'i1',
        scannedPax: 1,
        scannedAt: new Date(),
      });

      const res = await service.checkIn('e1', 'u1', Role.ADMIN, 'code', 1);
      expect(res.result).toBe('CHECKED_IN');
      expect(res.status).toBe('COMPLETE');
      expect(res.scannedPax).toBe(1);
      expect(res.remainingPax).toBe(0);
      expect(res.deltaPax).toBe(1);
      expect(prisma.attendance.create).toHaveBeenCalled();
      expect(prisma.attendanceCheckIn.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attendanceId: 'att-1',
            scannedById: 'u1',
            scannedPax: 1,
          }),
        }),
      );
    });

    it('maxPax 4: +2 => PARTIAL, then +2 => COMPLETE', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', maxPax: 4 },
      });

      // 1st scan (+2): no attendance yet
      (prisma.attendance.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.attendance.create as jest.Mock).mockResolvedValueOnce({
        id: 'att-1',
        invitationId: 'i1',
        scannedPax: 2,
        scannedAt: new Date(),
      });

      const res1 = await service.checkIn('e1', 'u1', Role.ADMIN, 'code', 2);
      expect(res1.result).toBe('CHECKED_IN');
      expect(res1.status).toBe('PARTIAL');
      expect(res1.scannedPax).toBe(2);
      expect(res1.remainingPax).toBe(2);

      // 2nd scan (+2): attendance exists with scannedPax: 2
      (prisma.attendance.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'att-1',
          invitationId: 'i1',
          scannedPax: 2,
          scannedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'att-1',
          invitationId: 'i1',
          scannedPax: 4,
          scannedAt: new Date(),
        });
      (prisma.attendance.updateMany as jest.Mock).mockResolvedValueOnce({
        count: 1,
      });

      const res2 = await service.checkIn('e1', 'u1', Role.ADMIN, 'code', 2);
      expect(res2.result).toBe('CHECKED_IN');
      expect(res2.status).toBe('COMPLETE');
      expect(res2.scannedPax).toBe(4);
      expect(res2.remainingPax).toBe(0);
      expect(prisma.attendanceCheckIn.create).toHaveBeenCalledTimes(2);
    });

    it('maxPax 4: +1, +1, +1, +1 => COMPLETE', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', maxPax: 4 },
      });

      // 1st scan (+1): create
      (prisma.attendance.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.attendance.create as jest.Mock).mockResolvedValueOnce({
        id: 'att-1',
        invitationId: 'i1',
        scannedPax: 1,
        scannedAt: new Date(),
      });
      const s1 = await service.checkIn('e1', 'u1', Role.ADMIN, 'code', 1);
      expect(s1.status).toBe('PARTIAL');
      expect(s1.scannedPax).toBe(1);

      // 2nd scan (+1): update
      (prisma.attendance.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'att-1',
          scannedPax: 1,
          scannedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'att-1',
          scannedPax: 2,
          scannedAt: new Date(),
        });
      (prisma.attendance.updateMany as jest.Mock).mockResolvedValueOnce({
        count: 1,
      });
      const s2 = await service.checkIn('e1', 'u1', Role.ADMIN, 'code', 1);
      expect(s2.status).toBe('PARTIAL');
      expect(s2.scannedPax).toBe(2);

      // 3rd scan (+1): update
      (prisma.attendance.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'att-1',
          scannedPax: 2,
          scannedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'att-1',
          scannedPax: 3,
          scannedAt: new Date(),
        });
      (prisma.attendance.updateMany as jest.Mock).mockResolvedValueOnce({
        count: 1,
      });
      const s3 = await service.checkIn('e1', 'u1', Role.ADMIN, 'code', 1);
      expect(s3.status).toBe('PARTIAL');
      expect(s3.scannedPax).toBe(3);

      // 4th scan (+1): update to complete
      (prisma.attendance.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'att-1',
          scannedPax: 3,
          scannedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'att-1',
          scannedPax: 4,
          scannedAt: new Date(),
        });
      (prisma.attendance.updateMany as jest.Mock).mockResolvedValueOnce({
        count: 1,
      });
      const s4 = await service.checkIn('e1', 'u1', Role.ADMIN, 'code', 1);
      expect(s4.status).toBe('COMPLETE');
      expect(s4.scannedPax).toBe(4);
      expect(s4.remainingPax).toBe(0);
      expect(prisma.attendanceCheckIn.create).toHaveBeenCalledTimes(4);
    });

    it('maxPax 4: +3 then +2 => second rejected', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', maxPax: 4 },
      });

      // Existing attendance already has 3 scanned pax
      (prisma.attendance.findUnique as jest.Mock).mockResolvedValue({
        id: 'att-1',
        invitationId: 'i1',
        scannedPax: 3,
        scannedAt: new Date(),
      });

      // Requesting 2 when remaining is 1 -> rejected with BadRequestException
      await expect(
        service.checkIn('e1', 'u1', Role.ADMIN, 'code', 2),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.attendanceCheckIn.create).not.toHaveBeenCalled();
    });

    it('COMPLETE invitation: another scan rejected/no-op', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', maxPax: 4 },
      });
      (prisma.attendance.findUnique as jest.Mock).mockResolvedValue({
        id: 'att-1',
        invitationId: 'i1',
        scannedPax: 4,
        scannedAt: new Date(),
      });

      const res = await service.checkIn('e1', 'u1', Role.ADMIN, 'code', 1);
      expect(res.result).toBe('ALREADY_CHECKED_IN');
      expect(res.status).toBe('COMPLETE');
      expect(res.remainingPax).toBe(0);
      expect(res.scannedPax).toBe(4);
      expect(prisma.attendanceCheckIn.create).not.toHaveBeenCalled();
      expect(prisma.attendance.updateMany).not.toHaveBeenCalled();
    });

    it('Concurrency protection: two simultaneous attempts (3 + 3 for maxPax 4) rejects second with conflict', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', maxPax: 4 },
      });

      // Suppose attendance exists with 1 scanned pax (remaining 3)
      (prisma.attendance.findUnique as jest.Mock).mockResolvedValue({
        id: 'att-1',
        invitationId: 'i1',
        scannedPax: 1,
        scannedAt: new Date(),
      });

      // Device B attempts +3, but another device raced ahead so updateMany affects 0 rows
      (prisma.attendance.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      await expect(
        service.checkIn('e1', 'u1', Role.ADMIN, 'code', 3),
      ).rejects.toThrow(ConflictException);

      // No invalid audit log written!
      expect(prisma.attendanceCheckIn.create).not.toHaveBeenCalled();
    });

    it('P2002 concurrent first scan: falls through to existing record', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', maxPax: 4 },
      });

      // First findUnique returns null
      (prisma.attendance.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        // Fresh read in retry attempt returns the record inserted by the concurrent request
        .mockResolvedValueOnce({
          id: 'att-1',
          invitationId: 'i1',
          scannedPax: 2,
          scannedAt: new Date(),
        })
        // Post-update re-read
        .mockResolvedValueOnce({
          id: 'att-1',
          invitationId: 'i1',
          scannedPax: 4,
          scannedAt: new Date(),
        });

      const error = new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'x',
        meta: { target: 'attendances_invitation_id_key' },
      });
      (prisma.attendance.create as jest.Mock).mockRejectedValueOnce(error);
      (prisma.attendance.updateMany as jest.Mock).mockResolvedValueOnce({
        count: 1,
      });

      const res = await service.checkIn('e1', 'u1', Role.ADMIN, 'code', 2);
      expect(res.result).toBe('CHECKED_IN');
      expect(res.status).toBe('COMPLETE');
      expect(res.scannedPax).toBe(4);
    });
    it('Successful concurrency: maxPax 4, existing 2, two +1 arrivals contend and complete capacity without stale totals', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', maxPax: 4 },
      });

      let dbScannedPax = 2;
      const auditRows: Array<{ pax: number; scannedBy: string }> = [];

      (prisma.attendance.findUnique as jest.Mock).mockImplementation(
        async () => ({
          id: 'att-1',
          invitationId: 'i1',
          scannedPax: dbScannedPax,
          scannedAt: new Date(),
        }),
      );

      (prisma.attendance.updateMany as jest.Mock).mockImplementation(
        async ({
          where,
          data,
        }: {
          where: { scannedPax: { lte: number } };
          data: { scannedPax: { increment: number } };
        }) => {
          if (dbScannedPax <= where.scannedPax.lte) {
            dbScannedPax += data.scannedPax.increment;
            return { count: 1 };
          }
          return { count: 0 };
        },
      );

      (prisma.attendanceCheckIn.create as jest.Mock).mockImplementation(
        async ({
          data,
        }: {
          data: { scannedPax: number; scannedById: string };
        }) => {
          auditRows.push({
            pax: data.scannedPax,
            scannedBy: data.scannedById,
          });
          return { id: `audit-${auditRows.length}`, ...data };
        },
      );

      // Request A arrives: +1 (pax increases from 2 to 3)
      const resA = await service.checkIn('e1', 'u1', Role.ADMIN, 'code', 1);
      expect(resA.result).toBe('CHECKED_IN');
      expect(resA.scannedPax).toBe(3);
      expect(resA.remainingPax).toBe(1);
      expect(resA.status).toBe('PARTIAL');

      // Request B arrives with a stale pre-update snapshot where scannedPax was 2
      // In old implementation, this would return 2 + 1 = 3 (PARTIAL).
      // With our post-update re-read fix, it re-reads persisted DB state and returns 4 (COMPLETE).
      let isFirstReadForB = true;
      (prisma.attendance.findUnique as jest.Mock).mockImplementation(
        async ({ where }) => {
          if (where.invitationId && isFirstReadForB) {
            isFirstReadForB = false;
            // Stale pre-update read: saw 2
            return {
              id: 'att-1',
              invitationId: 'i1',
              scannedPax: 2,
              scannedAt: new Date(),
            };
          }
          return {
            id: 'att-1',
            invitationId: 'i1',
            scannedPax: dbScannedPax,
            scannedAt: new Date(),
          };
        },
      );

      const resB = await service.checkIn('e1', 'u1', Role.ADMIN, 'code', 1);
      expect(resB.result).toBe('CHECKED_IN');

      // Final persisted aggregate MUST be 4
      expect(dbScannedPax).toBe(4);

      // Both successful audit rows must exist (+1 and +1)
      expect(auditRows).toHaveLength(2);
      expect(auditRows.reduce((sum, r) => sum + r.pax, 0)).toBe(2);

      // Request B (the completing request) MUST observe 4 and COMPLETE, NOT stale 3 / PARTIAL!
      expect(resB.scannedPax).toBe(4);
      expect(resB.remainingPax).toBe(0);
      expect(resB.status).toBe('COMPLETE');
    });
  });

  describe('getLiveAttendance', () => {
    it('returns aggregated summary, recent check-ins, and guest list', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.SUPER_ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        title: 'Wedding of Romeo & Juliet',
        slug: 'romeo-juliet',
        eventDate: new Date('2026-12-01'),
        status: 'PUBLISHED',
        content: {
          integrations: {
            googleSheetWebhookUrl: 'https://script.google.com/macros/s/xyz/exec',
          },
        },
      });

      const mockGuests = [
        {
          id: 'g1',
          name: 'Budi Santoso',
          category: 'VIP',
          maxPax: 2,
          customGreeting: 'Keluarga Budi',
          invitation: {
            uniqueCode: 'code1',
            status: 'RSVP_YES',
            rsvpPax: 2,
            attendances: [
              {
                scannedPax: 2,
                scannedAt: new Date('2026-12-01T10:00:00Z'),
                status: 'VALID',
                staff: { email: 'staff1@irvite.id' },
              },
            ],
          },
        },
        {
          id: 'g2',
          name: 'Siti Rahma',
          category: 'REGULAR',
          maxPax: 3,
          customGreeting: null,
          invitation: {
            uniqueCode: 'code2',
            status: 'PENDING',
            rsvpPax: null,
            attendances: [],
          },
        },
      ];
      (prisma.guest.findMany as jest.Mock).mockResolvedValue(mockGuests);

      const mockAudits = [
        {
          id: 'audit-1',
          scannedPax: 2,
          scannedAt: new Date('2026-12-01T10:00:00Z'),
          staff: { email: 'staff1@irvite.id' },
          attendance: {
            invitation: {
              guest: {
                id: 'g1',
                name: 'Budi Santoso',
                category: 'VIP',
                maxPax: 2,
                customGreeting: 'Keluarga Budi',
              },
            },
          },
        },
      ];
      (prisma.attendanceCheckIn.findMany as jest.Mock).mockResolvedValue(mockAudits);

      const live = await service.getLiveAttendance('e1', 'u1', Role.SUPER_ADMIN);

      expect(live.event.id).toBe('e1');
      expect(live.summary.totalGuests).toBe(2);
      expect(live.summary.totalInvitedPax).toBe(5);
      expect(live.summary.checkedInGuests).toBe(1);
      expect(live.summary.checkedInPax).toBe(2);
      expect(live.summary.remainingPax).toBe(3);
      expect(live.summary.checkInRate).toBe(40.0);
      expect(live.recentCheckIns).toHaveLength(1);
      expect(live.recentCheckIns[0].guestName).toBe('Budi Santoso');
      expect(live.googleSheet.connected).toBe(true);
      expect(live.googleSheet.webhookUrl).toBe('https://script.google.com/macros/s/xyz/exec');
    });
  });

  describe('Google Sheets Integration', () => {
    it('getGoogleSheetConfig returns connected status and sample script', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.SUPER_ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        title: 'Wedding Test',
        content: {
          integrations: {
            googleSheetWebhookUrl: 'https://script.google.com/macros/s/abc/exec',
          },
        },
      });

      const config = await service.getGoogleSheetConfig('e1', 'u1', Role.SUPER_ADMIN);
      expect(config.connected).toBe(true);
      expect(config.webhookUrl).toBe('https://script.google.com/macros/s/abc/exec');
      expect(config.sampleScriptTemplate).toContain('doPost(e)');
    });

    it('updateGoogleSheetConfig updates event content with webhookUrl', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.SUPER_ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        title: 'Wedding Test',
        content: {},
      });
      (prisma.event.update as jest.Mock).mockResolvedValue({});

      const result = await service.updateGoogleSheetConfig(
        'e1',
        'u1',
        Role.SUPER_ADMIN,
        'https://script.google.com/macros/s/new/exec',
      );
      expect(result.success).toBe(true);
      expect(result.connected).toBe(true);
      expect(prisma.event.update).toHaveBeenCalled();
    });

    it('resyncGoogleSheet sends all attendances to webhookUrl and returns count', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.SUPER_ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        title: 'Wedding Test',
        eventDate: new Date('2026-12-01'),
        status: 'PUBLISHED',
        content: {
          integrations: {
            googleSheetWebhookUrl: 'https://script.google.com/macros/s/xyz/exec',
          },
        },
      });
      (prisma.attendance.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'att-1',
          scannedPax: 2,
          scannedAt: new Date('2026-10-15T10:00:00Z'),
          invitation: {
            guest: {
              id: 'g1',
              name: 'John Doe',
              category: 'VIP',
              maxPax: 2,
            },
          },
          staff: { email: 'scanner@irvite.id' },
          checkIns: [],
        },
      ]);

      const globalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: 'success' }),
      } as any);

      try {
        const res = await service.resyncGoogleSheet('e1', 'u1', Role.SUPER_ADMIN);
        expect(res.success).toBe(true);
        expect(res.syncedCount).toBe(1);
        expect(global.fetch).toHaveBeenCalledWith(
          'https://script.google.com/macros/s/xyz/exec',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('John Doe'),
          }),
        );
      } finally {
        global.fetch = globalFetch;
      }
    });

    it('resyncGoogleSheet throws BadRequestException if webhookUrl not configured', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.SUPER_ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        title: 'Wedding Test',
        eventDate: new Date('2026-12-01'),
        status: 'PUBLISHED',
        content: {},
      });

      await expect(
        service.resyncGoogleSheet('e1', 'u1', Role.SUPER_ADMIN),
      ).rejects.toThrow('Tautan Webhook Google Sheets belum diatur');
    });
  });

  describe('undoCheckIn', () => {
    it('rolls back single checkIn and resets status to NOT_CHECKED_IN', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.SUPER_ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        status: 'PUBLISHED',
        eventDate: new Date('2026-12-01'),
        userId: 'u1',
      });
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'inv-1',
        uniqueCode: 'pPK_1Bskw6sCjPd2UlxOMA',
        guest: {
          id: 'g1',
          name: 'Salsabila Anjani',
          category: 'VIP',
          maxPax: 2,
          eventId: 'e1',
        },
      });
      (prisma.attendance.findUnique as jest.Mock).mockResolvedValue({
        id: 'att-1',
        scannedPax: 2,
        scannedAt: new Date('2026-11-03T10:00:00Z'),
      });
      (prisma.attendanceCheckIn.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'ci-1',
          attendanceId: 'att-1',
          scannedPax: 2,
          scannedAt: new Date('2026-11-03T10:00:00Z'),
          scannedById: 'u1',
        },
      ]);
      (prisma.attendanceCheckIn.delete as jest.Mock).mockResolvedValue({});
      (prisma.attendance.delete as jest.Mock).mockResolvedValue({});

      const result = await service.undoCheckIn(
        'e1',
        'u1',
        Role.SUPER_ADMIN,
        'pPK_1Bskw6sCjPd2UlxOMA',
      );

      expect(result.result).toBe('UNDONE');
      expect(result.rolledBackPax).toBe(2);
      expect(result.scannedPax).toBe(0);
      expect(result.remainingPax).toBe(2);
      expect(result.status).toBe('NOT_CHECKED_IN');
      expect(prisma.attendance.delete).toHaveBeenCalledWith({ where: { id: 'att-1' } });
    });

    it('rolls back latest partial checkIn and keeps previous checkIn count', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.SUPER_ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        status: 'PUBLISHED',
        eventDate: new Date('2026-12-01'),
        userId: 'u1',
      });
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'inv-1',
        uniqueCode: 'pPK_1Bskw6sCjPd2UlxOMA',
        guest: {
          id: 'g1',
          name: 'Rangga Wijaya',
          category: 'VIP',
          maxPax: 4,
          eventId: 'e1',
        },
      });
      (prisma.attendance.findUnique as jest.Mock).mockResolvedValue({
        id: 'att-1',
        scannedPax: 3,
        scannedAt: new Date('2026-11-03T10:30:00Z'),
      });
      (prisma.attendanceCheckIn.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'ci-2',
          attendanceId: 'att-1',
          scannedPax: 1,
          scannedAt: new Date('2026-11-03T10:30:00Z'),
          scannedById: 'u1',
        },
        {
          id: 'ci-1',
          attendanceId: 'att-1',
          scannedPax: 2,
          scannedAt: new Date('2026-11-03T10:00:00Z'),
          scannedById: 'u1',
        },
      ]);
      (prisma.attendanceCheckIn.delete as jest.Mock).mockResolvedValue({});
      (prisma.attendance.update as jest.Mock).mockResolvedValue({});

      const result = await service.undoCheckIn(
        'e1',
        'u1',
        Role.SUPER_ADMIN,
        'pPK_1Bskw6sCjPd2UlxOMA',
      );

      expect(result.result).toBe('UNDONE');
      expect(result.rolledBackPax).toBe(1);
      expect(result.scannedPax).toBe(2);
      expect(result.remainingPax).toBe(2);
      expect(result.status).toBe('PARTIAL');
      expect(prisma.attendance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'att-1' },
          data: expect.objectContaining({ scannedPax: 2 }),
        }),
      );
    });

    it('throws BadRequestException if guest has no check-in to undo', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.SUPER_ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        status: 'PUBLISHED',
        eventDate: new Date('2026-12-01'),
        userId: 'u1',
      });
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'inv-1',
        uniqueCode: 'pPK_1Bskw6sCjPd2UlxOMA',
        guest: {
          id: 'g1',
          name: 'Belum Hadir',
          category: 'REGULAR',
          maxPax: 2,
          eventId: 'e1',
        },
      });
      (prisma.attendance.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.undoCheckIn('e1', 'u1', Role.SUPER_ADMIN, 'pPK_1Bskw6sCjPd2UlxOMA'),
      ).rejects.toThrow('belum memiliki riwayat');
    });
  });
});

