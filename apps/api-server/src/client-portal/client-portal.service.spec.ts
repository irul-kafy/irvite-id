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
    it('retrieves event info and accurate guest statistics', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);

      prisma.guest.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
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
  });
});
