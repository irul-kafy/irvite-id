import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InvitationStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  ClientPortalService,
  computeDefaultClientKey,
  isClientKeyValid,
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
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    invitation: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  const mockCreatedAt = new Date('2026-06-01T10:00:00.000Z');
  const mockEvent = {
    id: 'evt-test-123',
    title: 'Pernikahan Romeo & Juliet',
    slug: 'romeo-juliet',
    eventDate: new Date('2026-07-20T08:00:00.000Z'),
    locationDetails: 'Grand Ballroom Hotel Mulia',
    status: 'PUBLISHED',
    content: {},
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
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      invitation: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
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

  describe('Key Computation & Validation', () => {
    it('computes deterministic default key for event and creation date', () => {
      const key1 = computeDefaultClientKey(mockEvent.id, mockCreatedAt);
      const key2 = computeDefaultClientKey(mockEvent.id, mockCreatedAt);
      expect(key1).toBeDefined();
      expect(key1.length).toBe(16);
      expect(key1).toBe(key2);
    });

    it('validates default key correctly', () => {
      const validKey = computeDefaultClientKey(mockEvent.id, mockCreatedAt);
      expect(isClientKeyValid(mockEvent, validKey)).toBe(true);
      expect(isClientKeyValid(mockEvent, 'wrong-key-value')).toBe(false);
      expect(isClientKeyValid(mockEvent, '')).toBe(false);
    });

    it('respects custom clientKey in content if present', () => {
      const customEvent = {
        ...mockEvent,
        content: { clientKey: 'custom-secret-key-123' },
      };
      expect(isClientKeyValid(customEvent, 'custom-secret-key-123')).toBe(true);
      // Fallback key also accepted
      const defaultKey = computeDefaultClientKey(customEvent.id, mockCreatedAt);
      expect(isClientKeyValid(customEvent, defaultKey)).toBe(true);
      expect(isClientKeyValid(customEvent, 'invalid-key')).toBe(false);
    });
  });

  describe('Access Control', () => {
    it('throws NotFoundException if event does not exist', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      await expect(
        service.getPortalData('non-existent', 'any-key'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws UnauthorizedException if key is invalid', async () => {
      prisma.event.findUnique.mockResolvedValue(mockEvent);
      await expect(
        service.getPortalData(mockEvent.id, 'invalid-key'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Portal Data & Stats', () => {
    it('retrieves event info and accurate guest statistics', async () => {
      const validKey = computeDefaultClientKey(mockEvent.id, mockCreatedAt);
      prisma.event.findUnique.mockResolvedValue(mockEvent);

      // 1. guestsWithoutInvitation check: none
      prisma.guest.findMany
        .mockResolvedValueOnce([]) // for auto-heal check
        .mockResolvedValueOnce([
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

      const data = await service.getPortalData(mockEvent.id, validKey);

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
    const validKey = computeDefaultClientKey(mockEvent.id, mockCreatedAt);

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

      const res = await service.addGuest(mockEvent.id, validKey, {
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
        service.addGuest(mockEvent.id, validKey, { name: '   ' }),
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

      const res = await service.updateGuest(mockEvent.id, 'g-1', validKey, {
        name: 'Budi Santoso Update',
        maxPax: 3,
      });

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

      const res = await service.deleteGuest(mockEvent.id, 'g-1', validKey);
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
        validKey,
        true,
      );
      expect(res.isWaSent).toBe(true);
      expect(res.status).toBe(InvitationStatus.SENT);
    });
  });
});
