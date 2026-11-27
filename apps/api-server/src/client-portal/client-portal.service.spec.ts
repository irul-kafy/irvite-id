import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InvitationStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  ClientPortalService,
  generateClientPortalKey,
  isClientKeyValid,
  MAX_PORTAL_GUESTS_PER_EVENT,
  MAX_PORTAL_PAX_PER_GUEST,
} from './client-portal.service';

describe('ClientPortalService', () => {
  let service: ClientPortalService;
  let prisma: {
    event: {
      findUnique: jest.Mock;
    };
    order: {
      findUnique: jest.Mock;
    };
    guest: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    invitation: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    wish: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
  };

  const mockCreatedAt = new Date('2026-06-01T10:00:00.000Z');
  const storedClientKey = 'a1b2c3d4e5f60718293a4b5c';
  const mockEvent = {
    id: 'evt-test-123',
    title: 'Pernikahan Romeo & Juliet',
    slug: 'romeo-juliet',
    eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    activeUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    locationDetails: 'Grand Ballroom Hotel Mulia',
    status: 'PUBLISHED',
    content: { clientKey: storedClientKey },
    createdAt: mockCreatedAt,
  };

  beforeEach(async () => {
    prisma = {
      event: {
        findUnique: jest.fn(),
      },
      order: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      guest: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      invitation: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      wish: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientPortalService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ClientPortalService>(ClientPortalService);
  });

  describe('Key Generation & Timing-Safe Validation', () => {
    it('generates random 24-hex-character portal key without relying on JWT_SECRET or eventId', () => {
      const key1 = generateClientPortalKey();
      const key2 = generateClientPortalKey();
      expect(key1).toMatch(/^[a-f0-9]{24}$/);
      expect(key2).toMatch(/^[a-f0-9]{24}$/);
      expect(key1).not.toBe(key2);
    });

    it('validates stored clientKey using timingSafeEqual and rejects events without stored key', () => {
      expect(isClientKeyValid(mockEvent, storedClientKey)).toBe(true);
      expect(isClientKeyValid(mockEvent, 'wrong-key-value')).toBe(false);
      expect(isClientKeyValid(mockEvent, 'a1b2c3d4e5f60718293a4b5d')).toBe(
        false,
      );
      expect(isClientKeyValid(mockEvent, '')).toBe(false);
      expect(
        isClientKeyValid({ ...mockEvent, content: {} }, storedClientKey),
      ).toBe(false);
    });

    it('immediately invalidates old key after regeneration', () => {
      const oldKey = generateClientPortalKey();
      const newKey = generateClientPortalKey();
      const regeneratedEvent = {
        ...mockEvent,
        content: { clientKey: newKey },
      };

      expect(isClientKeyValid(regeneratedEvent, newKey)).toBe(true);
      expect(isClientKeyValid(regeneratedEvent, oldKey)).toBe(false);
      expect(isClientKeyValid(regeneratedEvent, storedClientKey)).toBe(false);
    });

    it('migration 20261124072000_rotate_uuid_client_portal_keys rotates only keys lacking explicit clientKeyVersion = 2 using LOWER(HEX(RANDOM_BYTES(12))) and sets clientKeyVersion = 2', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs') as typeof import('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path') as typeof import('path');
      const migrationPath = path.resolve(
        __dirname,
        '../../../../packages/database/prisma/migrations/20261124072000_rotate_uuid_client_portal_keys/migration.sql',
      );
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('LOWER(HEX(RANDOM_BYTES(12)))');
      expect(sql).toContain('$.clientKeyVersion');
      expect(sql).toContain('< 2');
      expect(sql).not.toContain('REGEXP');
    });
  });

  describe('Access Control', () => {
    it('throws NotFoundException if event does not exist', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      await expect(
        service.getPortalData('non-existent', 'any-key'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws UnauthorizedException if key is invalid or not stored', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      await expect(
        service.getPortalData(mockEvent.id, 'invalid-key'),
      ).rejects.toThrow(UnauthorizedException);

      prisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        content: {},
      });
      await expect(
        service.getPortalData(mockEvent.id, storedClientKey),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException if client portal is disabled by admin', async () => {
      const disabledEvent = {
        ...mockEvent,
        content: { clientKey: storedClientKey, clientPortalEnabled: false },
      };
      prisma.event.findUnique.mockResolvedValue(disabledEvent);
      await expect(
        service.getPortalData(mockEvent.id, storedClientKey),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Portal Data & Stats', () => {
    it('retrieves event info and accurate guest statistics without mutating invitations on GET', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);

      prisma.guest.findMany.mockResolvedValueOnce([
        {
          id: 'g-1',
          name: 'Budi Santoso',
          category: 'VIP',
          phoneNumber: '081234567890',
          email: 'budi@example.com',
          tableNumber: 'A1',
          maxPax: 2,
          customGreeting: null,
          createdAt: new Date('2026-06-01T11:00:00Z'),
          invitation: {
            id: 'inv-1',
            uniqueCode: 'code-budi',
            status: InvitationStatus.SENT,
            rsvpPax: 2,
            updatedAt: new Date(),
            attendances: [{ scannedPax: 2, scannedAt: new Date() }],
          },
        },
        {
          id: 'g-2',
          name: 'Siti Aminah',
          category: 'REGULAR',
          phoneNumber: '081987654321',
          email: null,
          tableNumber: 'B2',
          maxPax: 1,
          customGreeting: null,
          createdAt: new Date('2026-06-01T12:00:00Z'),
          invitation: {
            id: 'inv-2',
            uniqueCode: 'code-siti',
            status: InvitationStatus.PENDING,
            rsvpPax: null,
            updatedAt: new Date(),
            attendances: [],
          },
        },
      ]);

      const data = await service.getPortalData(mockEvent.id, storedClientKey);

      expect(data.event.id).toBe(mockEvent.id);
      expect(data.event.title).toBe(mockEvent.title);
      expect(data.stats.totalGuests).toBe(2);
      expect(data.stats.totalPax).toBe(3);
      expect(data.stats.waSentCount).toBe(1);
      expect(data.stats.waPendingCount).toBe(1);
      expect(data.stats.attendedCount).toBe(1);
      expect(data.guests.length).toBe(2);
      expect(data.guests[0].isWaSent).toBe(true);
      expect(data.guests[0].hasAttended).toBe(true);
      expect(data.guests[1].isWaSent).toBe(false);
      expect(data.guests[1].hasAttended).toBe(false);
      expect(prisma.invitation.create).not.toHaveBeenCalled();
    });

    it('excludes guests with isWalkIn=true from RSVP stats while including non-walkIn guests even with category ON_THE_SPOT', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);

      prisma.guest.findMany.mockResolvedValueOnce([
        {
          id: 'g-walkin',
          name: 'Walk-in Guest',
          category: 'ON_THE_SPOT',
          isWalkIn: true,
          phoneNumber: null,
          email: null,
          tableNumber: null,
          maxPax: 2,
          customGreeting: null,
          createdAt: new Date('2026-06-01T11:00:00Z'),
          invitation: {
            id: 'inv-walkin',
            uniqueCode: 'code-walkin',
            status: InvitationStatus.PENDING,
            rsvpPax: null,
            updatedAt: new Date(),
            attendances: [{ scannedPax: 2, scannedAt: new Date() }],
          },
        },
        {
          id: 'g-regular-ots',
          name: 'Invited Guest with ON_THE_SPOT Category',
          category: 'ON_THE_SPOT',
          isWalkIn: false,
          phoneNumber: null,
          email: null,
          tableNumber: null,
          maxPax: 1,
          customGreeting: null,
          createdAt: new Date('2026-06-01T12:00:00Z'),
          invitation: {
            id: 'inv-regular-ots',
            uniqueCode: 'code-reg-ots',
            status: InvitationStatus.PENDING,
            rsvpPax: null,
            updatedAt: new Date(),
            attendances: [],
          },
        },
      ]);

      const data = await service.getPortalData(mockEvent.id, storedClientKey);

      expect(data.stats.totalGuests).toBe(2);
      expect(data.stats.rsvpPendingCount).toBe(1);
    });

    it('syncMissingInvitations generates missing invitations in a dedicated write operation', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.guest.findMany.mockResolvedValueOnce([
        { id: 'g-missing-1' },
        { id: 'g-missing-2' },
      ]);
      prisma.invitation.create.mockResolvedValue({ id: 'inv-gen' });

      const res = await service.syncMissingInvitations(
        mockEvent.id,
        storedClientKey,
      );
      expect(res.createdCount).toBe(2);
      expect(prisma.invitation.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('Guest CRUD Operations', () => {
    it('adds a new guest with automatic invitation generation', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.guest.create.mockResolvedValue({
        id: 'new-guest-id',
        name: 'Ahmad Dahlan',
        category: 'FAMILY',
        phoneNumber: '0812333444',
        email: null,
        tableNumber: 'VIP-1',
        maxPax: 2,
        customGreeting: 'Selamat berbahagia',
        createdAt: new Date(),
      });
      prisma.invitation.create.mockResolvedValue({
        id: 'new-inv-id',
        uniqueCode: 'mock-unique-code',
        status: InvitationStatus.PENDING,
        rsvpPax: null,
        updatedAt: new Date(),
      });

      const res = await service.addGuest(mockEvent.id, storedClientKey, {
        name: 'Ahmad Dahlan',
        category: 'FAMILY',
        phoneNumber: '0812333444',
        maxPax: 2,
        tableNumber: 'VIP-1',
        customGreeting: 'Selamat berbahagia',
      });

      expect(res.name).toBe('Ahmad Dahlan');
      expect(res.invitation?.uniqueCode).toBe('mock-unique-code');
      expect(res.isWaSent).toBe(false);
    });

    it('validates guest name cannot be empty', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      await expect(
        service.addGuest(mockEvent.id, storedClientKey, { name: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates guest successfully', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.guest.findFirst.mockResolvedValue({
        id: 'g-1',
        eventId: mockEvent.id,
      });
      prisma.guest.update.mockResolvedValue({
        id: 'g-1',
        name: 'Budi Santoso Update',
        category: 'VIP',
        phoneNumber: '081234567899',
        email: 'budi_new@example.com',
        tableNumber: 'V-2',
        maxPax: 3,
        customGreeting: null,
        createdAt: new Date(),
        invitation: {
          id: 'inv-1',
          uniqueCode: 'code-1',
          status: InvitationStatus.SENT,
          rsvpPax: 3,
          updatedAt: new Date(),
        },
      });

      const res = await service.updateGuest(
        mockEvent.id,
        'g-1',
        storedClientKey,
        {
          name: 'Budi Santoso Update',
          maxPax: 3,
        },
      );

      expect(res.name).toBe('Budi Santoso Update');
      expect(res.maxPax).toBe(3);
      expect(res.isWaSent).toBe(true);
    });

    it('deletes guest successfully', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.guest.findFirst.mockResolvedValue({
        id: 'g-1',
        eventId: mockEvent.id,
      });
      prisma.guest.delete.mockResolvedValue({ id: 'g-1' });

      const res = await service.deleteGuest(
        mockEvent.id,
        'g-1',
        storedClientKey,
      );
      expect(res.success).toBe(true);
    });

    it('sets WhatsApp status to SENT and toggles properly', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.invitation.findFirst.mockResolvedValue({
        id: 'inv-1',
        status: InvitationStatus.PENDING,
      });
      prisma.invitation.update.mockResolvedValue({
        id: 'inv-1',
        status: InvitationStatus.SENT,
      });

      const res = await service.setGuestWaStatus(
        mockEvent.id,
        'g-1',
        storedClientKey,
        true,
      );
      expect(res.isWaSent).toBe(true);
      expect(res.status).toBe(InvitationStatus.SENT);
    });

    it('deletes wish successfully via portal key', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.wish.findFirst.mockResolvedValue({
        id: 'wish-1',
        eventId: mockEvent.id,
      });
      prisma.wish.delete.mockResolvedValue({ id: 'wish-1' });

      const res = await service.deleteWish(
        mockEvent.id,
        'wish-1',
        storedClientKey,
      );
      expect(res.success).toBe(true);
      expect(prisma.wish.delete).toHaveBeenCalledWith({
        where: { id: 'wish-1' },
      });
    });

    it('throws NotFoundException if wish to delete does not exist', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.wish.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteWish(mockEvent.id, 'wish-x', storedClientKey),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects deleteGuest when guest already has attendance history', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      prisma.guest.findFirst.mockResolvedValue({
        id: 'g-attended',
        eventId: mockEvent.id,
        invitation: {
          id: 'inv-attended',
          attendances: [{ id: 'att-1', scannedPax: 2 }],
        },
      });

      await expect(
        service.deleteGuest(mockEvent.id, 'g-attended', storedClientKey),
      ).rejects.toThrow(ConflictException);
      expect(prisma.guest.delete).not.toHaveBeenCalled();
    });

    it('enforces maxPax and max guests per event limits', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);

      await expect(
        service.addGuest(mockEvent.id, storedClientKey, {
          name: 'Tamu Kuota Berlebih',
          maxPax: MAX_PORTAL_PAX_PER_GUEST + 1,
        }),
      ).rejects.toThrow(BadRequestException);

      prisma.guest.count.mockResolvedValue(MAX_PORTAL_GUESTS_PER_EVENT);

      await expect(
        service.addGuest(mockEvent.id, storedClientKey, {
          name: 'Tamu Melebihi Kapasitas Event',
          maxPax: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('enforces order package maxGuests entitlement in ClientPortalService.addGuest while keeping 2000 for events without an order', async () => {
      prisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        order: {
          packageCode: 'SACRED',
          options: { entitlements: { maxGuests: 50 } },
        },
      });
      prisma.guest.count.mockResolvedValue(50);

      await expect(
        service.addGuest(mockEvent.id, storedClientKey, {
          name: 'Tamu ke-51',
          maxPax: 1,
        }),
      ).rejects.toThrow(/hingga 50 undangan \(1 undangan bisa untuk keluarga\)/);

      // Event without an order allows > 50 guests up to MAX_PORTAL_GUESTS_PER_EVENT (2000)
      prisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        order: null,
      });
      prisma.guest.count.mockResolvedValue(50);
      prisma.guest.create.mockResolvedValue({
        id: 'g-51',
        name: 'Tamu Tanpa Order ke-51',
        category: 'REGULAR',
        phoneNumber: null,
        email: null,
        tableNumber: null,
        maxPax: 1,
        customGreeting: null,
        createdAt: new Date(),
      });
      prisma.invitation.create.mockResolvedValue({
        id: 'inv-51',
        uniqueCode: 'code-51',
        status: InvitationStatus.PENDING,
        rsvpPax: null,
        updatedAt: new Date(),
      });

      const created = await service.addGuest(mockEvent.id, storedClientKey, {
        name: 'Tamu Tanpa Order ke-51',
        maxPax: 1,
      });
      expect(created.id).toBe('g-51');
    });

    it('rejects write operations when event is ARCHIVED or expired', async () => {
      prisma.event.findUnique.mockResolvedValueOnce({
        ...mockEvent,
        status: 'ARCHIVED',
      });
      await expect(
        service.addGuest(mockEvent.id, storedClientKey, { name: 'Tamu Baru' }),
      ).rejects.toThrow(ConflictException);

      const pastDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      prisma.event.findUnique.mockResolvedValueOnce({
        ...mockEvent,
        eventDate: pastDate,
        activeUntil: pastDate,
      });
      await expect(
        service.deleteGuest(mockEvent.id, 'g-1', storedClientKey),
      ).rejects.toThrow(ConflictException);
    });

    it('validates Guest.category enum and blocks duplicate phone number per event in client portal', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);

      await expect(
        service.addGuest(mockEvent.id, storedClientKey, {
          name: 'Tamu Kategori Salah',
          category: 'INVALID_CAT',
        }),
      ).rejects.toThrow(BadRequestException);

      prisma.guest.findFirst.mockResolvedValueOnce({ id: 'existing-guest-1' });
      await expect(
        service.addGuest(mockEvent.id, storedClientKey, {
          name: 'Tamu Nomor Dobel',
          category: 'VIP',
          phoneNumber: '081234567890',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
