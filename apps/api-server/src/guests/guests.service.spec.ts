/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { GuestsService } from './guests.service';
import { PrismaService } from '../database/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Role, Prisma } from 'database';
import { ReportsService } from '../reports/reports.service';

describe('GuestsService', () => {
  let service: GuestsService;
  let prisma: PrismaService;

  const mockPrisma = {
    event: {
      findFirst: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
    },
    guest: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ReportsService, useValue: {} },
      ],
    }).compile();

    service = module.get<GuestsService>(GuestsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Authorization', () => {
    it('scopes Event lookup to userId for ADMIN and throws NotFoundException if Event is not owned', async () => {
      mockPrisma.event.findFirst.mockResolvedValue(null);

      await expect(
        service.create('event-id', 'user-id', Role.ADMIN, { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.event.findFirst).toHaveBeenCalledWith({
        where: { id: 'event-id', userId: 'user-id' },
        select: { id: true },
      });
    });

    it('allows SUPER_ADMIN to access any Event', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.guest.create.mockResolvedValue({ id: 'guest-id' });

      await service.create('event-id', 'user-id', Role.SUPER_ADMIN, {
        name: 'Test',
      });

      expect(mockPrisma.event.findFirst).toHaveBeenCalledWith({
        where: { id: 'event-id' },
        select: { id: true },
      });
    });
  });

  describe('create', () => {
    it('forces eventId from route and creates Guest', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.guest.create.mockResolvedValue({
        id: 'guest-id',
        eventId: 'event-id',
        name: 'Test',
      });

      await service.create('event-id', 'user-id', Role.ADMIN, { name: 'Test' });

      expect(mockPrisma.guest.create).toHaveBeenCalledWith({
        data: {
          eventId: 'event-id',
          name: 'Test',
        },
        select: expect.any(Object),
      });
    });

    it('does not create an Invitation', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.guest.create.mockResolvedValue({
        id: 'guest-id',
        eventId: 'event-id',
        name: 'Test',
      });

      await service.create('event-id', 'user-id', Role.ADMIN, { name: 'Test' });

      // Should only call guest.create, not invitation.create
      expect(mockPrisma.guest.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('scopes list to eventId and paginates', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.guest.count.mockResolvedValue(1);
      mockPrisma.guest.findMany.mockResolvedValue([{ id: 'guest-id' }]);

      const result = await service.findAll('event-id', 'user-id', Role.ADMIN, {
        page: 2,
        limit: 5,
      });

      expect(mockPrisma.guest.findMany).toHaveBeenCalledWith({
        where: { eventId: 'event-id' },
        skip: 5,
        take: 5,
        select: expect.any(Object),
      });

      expect(result.meta.page).toBe(2);
    });
  });

  describe('findOne', () => {
    it('scopes findOne to id and eventId', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.guest.findFirst.mockResolvedValue({ id: 'guest-id' });

      await service.findOne('event-id', 'guest-id', 'user-id', Role.ADMIN);

      expect(mockPrisma.guest.findFirst).toHaveBeenCalledWith({
        where: { id: 'guest-id', eventId: 'event-id' },
        select: expect.any(Object),
      });
    });

    it('throws NotFoundException if wrong parent', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.guest.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('event-id', 'guest-id', 'user-id', Role.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('scopes update to id and eventId and clears nullable fields', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.guest.update.mockResolvedValue({ id: 'guest-id' });

      await service.update('event-id', 'guest-id', 'user-id', Role.ADMIN, {
        customGreeting: null,
      });

      expect(mockPrisma.guest.update).toHaveBeenCalledWith({
        where: { id: 'guest-id', eventId: 'event-id' },
        data: { customGreeting: null },
        select: expect.any(Object),
      });
    });

    it('maps P2025 to NotFoundException', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });

      const error = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2025',
        clientVersion: '5.22.0',
      });
      mockPrisma.guest.update.mockRejectedValue(error);

      await expect(
        service.update('event-id', 'guest-id', 'user-id', Role.ADMIN, {
          name: 'Update',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects unknown guest category and maps aliases like KELUARGA -> FAMILY, KELUARGA PRIA -> FAMILY_GROOM, KELUARGA WANITA -> FAMILY_BRIDE', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.guest.create.mockResolvedValue({
        id: 'g-1',
        category: 'FAMILY',
      });

      await service.create('event-id', 'user-id', Role.ADMIN, {
        name: 'Tamu Keluarga',
        category: 'KELUARGA',
      });
      expect(mockPrisma.guest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ category: 'FAMILY' }),
        }),
      );

      await service.create('event-id', 'user-id', Role.ADMIN, {
        name: 'Tamu Keluarga Pria',
        category: 'KELUARGA PRIA',
      });
      expect(mockPrisma.guest.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ category: 'FAMILY_GROOM' }),
        }),
      );

      await service.create('event-id', 'user-id', Role.ADMIN, {
        name: 'Tamu Keluarga Wanita',
        category: 'KELUARGA WANITA',
      });
      expect(mockPrisma.guest.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ category: 'FAMILY_BRIDE' }),
        }),
      );

      await expect(
        service.create('event-id', 'user-id', Role.ADMIN, {
          name: 'Tamu Invalid',
          category: 'RANDOM_INVALID_CATEGORY',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('prevents duplicate phone numbers per event on create and update (after normalizing 08... to 628...)', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.guest.findFirst.mockResolvedValueOnce({ id: 'existing-g' });

      await expect(
        service.create('event-id', 'user-id', Role.ADMIN, {
          name: 'Duplicate Phone Guest',
          phoneNumber: '081234567890',
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.guest.findFirst).toHaveBeenCalledWith({
        where: {
          eventId: 'event-id',
          phoneNumber: '6281234567890',
        },
        select: { id: true },
      });
    });

    it('migration 20261124073000 records guests_migration_audit before UPDATE and strips spaces/hyphens in phone numbers', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs') as typeof import('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path') as typeof import('path');
      const migrationPath = path.resolve(
        __dirname,
        '../../../../packages/database/prisma/migrations/20261124073000_guest_category_and_unique_event_phone/migration.sql',
      );
      const sql = fs.readFileSync(migrationPath, 'utf8');

      const auditTableIdx = sql.indexOf(
        'CREATE TABLE IF NOT EXISTS `guests_migration_audit`',
      );
      const firstUpdateIdx = sql.indexOf('UPDATE `guests`');
      expect(auditTableIdx).toBeGreaterThanOrEqual(0);
      expect(firstUpdateIdx).toBeGreaterThan(auditTableIdx);
      expect(sql).toContain('`old_category`');
      expect(sql).toContain('`old_phone_number`');
      expect(sql).toContain("REPLACE(TRIM(`phone_number`), ' ', ''), '-', ''");
      expect(sql).toContain('PHONE_DEDUP_CLEARED');
    });

    it('enforces maxGuests entitlement from event order in GuestsService.create', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.order.findUnique.mockResolvedValue({
        packageCode: 'SACRED',
        options: {
          entitlements: { maxGuests: 50 },
        },
      });
      mockPrisma.guest.count.mockResolvedValue(50);

      await expect(
        service.create('event-id', 'user-id', Role.ADMIN, {
          name: 'Tamu ke-51',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.guest.create).not.toHaveBeenCalled();
    });
  });
});
