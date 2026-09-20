/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn() },
            event: { findUnique: jest.fn() },
            invitation: { findUnique: jest.fn() },
            attendance: { create: jest.fn(), findUnique: jest.fn() },
          },
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

    it('ADMIN owner -> authorized', async () => {
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

    it('ADMIN foreign -> 404', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        userId: 'u2',
        status: 'PUBLISHED',
      });

      await expect((service as any).authorizeEvent('e1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('STAFF assigned active -> authorized', async () => {
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

    it('STAFF current role mismatch -> 404', async () => {
      // e.g. token was STAFF, but db says ADMIN. It will fall through to ADMIN check.
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        userId: 'owner',
        staffEvents: [{ userId: 'u1' }],
        status: 'PUBLISHED',
      });

      await expect((service as any).authorizeEvent('e1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('resolve', () => {
    it('expired published event -> resolve denied', async () => {
      const expiredDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        userId: 'u1',
        status: 'PUBLISHED',
        eventDate: expiredDate,
      });

      await expect(
        service.resolve('e1', 'u1', Role.ADMIN, 'code'),
      ).rejects.toThrow(new ConflictException('Event has expired'));
    });

    beforeEach(() => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        userId: 'u1',
        status: 'PUBLISHED',
      });
    });

    it('DRAFT -> 409', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        userId: 'u1',
        status: 'DRAFT',
      });
      await expect(
        service.resolve('e1', 'u1', Role.ADMIN, 'code'),
      ).rejects.toThrow(ConflictException);
    });

    it('resolve READY', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', name: 'John', maxPax: 2 },
        attendances: [],
      });
      const res = await service.resolve('e1', 'u1', Role.ADMIN, 'code');
      expect(res.result).toBe('READY');
      expect(res.attendance).toBeNull();
    });

    it('resolve ALREADY_CHECKED_IN', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', name: 'John', maxPax: 2 },
        attendances: [{ scannedPax: 2, scannedAt: new Date() }],
      });
      const res = await service.resolve('e1', 'u1', Role.ADMIN, 'code');
      expect(res.result).toBe('ALREADY_CHECKED_IN');
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
    it('expired published event -> check-in denied', async () => {
      const expiredDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'e1',
        userId: 'u1',
        status: 'PUBLISHED',
        eventDate: expiredDate,
      });

      await expect(
        service.checkIn('e1', 'u1', Role.ADMIN, 'code', 1),
      ).rejects.toThrow(new ConflictException('Event has expired'));
    });

    beforeEach(() => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: Role.ADMIN,
      });
      (prisma.event.findUnique as jest.Mock).mockResolvedValue({
        userId: 'u1',
        status: 'PUBLISHED',
      });
    });

    it('pax max validation', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', maxPax: 2 },
      });
      await expect(
        service.checkIn('e1', 'u1', Role.ADMIN, 'code', 3),
      ).rejects.toThrow(BadRequestException);
    });

    it('P2002 expected duplicate -> ALREADY_CHECKED_IN', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', maxPax: 2 },
      });
      const error = new Prisma.PrismaClientKnownRequestError('msg', {
        code: 'P2002',
        clientVersion: 'x',
        meta: { target: 'attendances_invitation_id_key' },
      });
      (prisma.attendance.create as jest.Mock).mockRejectedValue(error);
      (prisma.attendance.findUnique as jest.Mock).mockResolvedValue({
        scannedPax: 2,
        scannedAt: new Date(),
      });

      const res = await service.checkIn('e1', 'u1', Role.ADMIN, 'code', 2);
      expect(res.result).toBe('ALREADY_CHECKED_IN');
      expect(res.attendance).toBeDefined();
    });

    it('unrelated P2002 -> rethrows', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', maxPax: 2 },
      });
      const error = new Prisma.PrismaClientKnownRequestError('msg', {
        code: 'P2002',
        clientVersion: 'x',
        meta: { target: 'some_other_key' },
      });
      (prisma.attendance.create as jest.Mock).mockRejectedValue(error);

      await expect(
        service.checkIn('e1', 'u1', Role.ADMIN, 'code', 2),
      ).rejects.toThrow(error);
    });

    it('non-P2002 -> rethrows', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        id: 'i1',
        guest: { eventId: 'e1', maxPax: 2 },
      });
      const error = new Error('Random DB Error');
      (prisma.attendance.create as jest.Mock).mockRejectedValue(error);

      await expect(
        service.checkIn('e1', 'u1', Role.ADMIN, 'code', 2),
      ).rejects.toThrow(error);
    });
  });
});
