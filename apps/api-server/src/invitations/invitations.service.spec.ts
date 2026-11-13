/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsService } from './invitations.service';
import { PrismaService } from '../database/prisma.service';
import { PublicInvitationAccessService } from './public-invitation-access.service';
import {
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Role, Prisma } from 'database';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let prisma: PrismaService;

  const mockPrisma = {
    event: {
      findFirst: jest.fn(),
    },
    guest: {
      findFirst: jest.fn(),
    },
    invitation: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    media: {
      findMany: jest.fn(),
    },
  };

  const mockPublicAccessService = {
    getEligibleContext: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: PublicInvitationAccessService,
          useValue: mockPublicAccessService,
        },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Authorization', () => {
    it('throws NotFoundException if ADMIN tries to access inaccessible Event', async () => {
      mockPrisma.event.findFirst.mockResolvedValue(null);

      await expect(
        service.create('event-id', 'guest-id', 'user-id', Role.ADMIN, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if Guest does not belong to Event', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.guest.findFirst.mockResolvedValue(null);

      await expect(
        service.create('event-id', 'guest-id', 'user-id', Role.ADMIN, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('generates a secure 16-byte base64url code', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.guest.findFirst.mockResolvedValue({ id: 'guest-id' });
      mockPrisma.invitation.create.mockResolvedValue({ id: 'invitation-id' });

      jest
        .spyOn(service, 'generateSecureCode')
        .mockReturnValue('mock-secure-code');

      await service.create('event-id', 'guest-id', 'user-id', Role.ADMIN, {});

      expect(mockPrisma.invitation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uniqueCode: 'mock-secure-code',
          guestId: 'guest-id',
          eventId: 'event-id',
        }),
        select: expect.any(Object),
      });
    });

    it('throws ConflictException on duplicate Guest', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.guest.findFirst.mockResolvedValue({ id: 'guest-id' });

      const error = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { target: ['guest_id'] },
      });
      mockPrisma.invitation.create.mockRejectedValue(error);

      await expect(
        service.create('event-id', 'guest-id', 'user-id', Role.ADMIN, {}),
      ).rejects.toThrow(ConflictException);
    });

    it('retries on uniqueCode collision and succeeds', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.guest.findFirst.mockResolvedValue({ id: 'guest-id' });

      const collisionError = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { target: ['unique_code'] },
      });

      mockPrisma.invitation.create
        .mockRejectedValueOnce(collisionError)
        .mockResolvedValueOnce({ id: 'invitation-id' });

      await service.create('event-id', 'guest-id', 'user-id', Role.ADMIN, {});

      expect(mockPrisma.invitation.create).toHaveBeenCalledTimes(2);
    });

    it('exhausts retries on uniqueCode collision and throws InternalServerErrorException', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.guest.findFirst.mockResolvedValue({ id: 'guest-id' });

      const collisionError = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { target: ['unique_code'] },
      });

      mockPrisma.invitation.create.mockRejectedValue(collisionError);

      await expect(
        service.create('event-id', 'guest-id', 'user-id', Role.ADMIN, {}),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockPrisma.invitation.create).toHaveBeenCalledTimes(3);
    });

    it('throws InternalServerErrorException on unknown P2002 target format', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.guest.findFirst.mockResolvedValue({ id: 'guest-id' });

      const collisionError = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { target: ['unknown_field'] },
      });

      mockPrisma.invitation.create.mockRejectedValue(collisionError);

      await expect(
        service.create('event-id', 'guest-id', 'user-id', Role.ADMIN, {}),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockPrisma.invitation.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('scopes update to id and eventId, updates only allowed fields', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-id' });
      mockPrisma.invitation.update.mockResolvedValue({ id: 'invitation-id' });

      await service.update('event-id', 'invitation-id', 'user-id', Role.ADMIN, {
        customMessage: 'Hello',
      });

      expect(mockPrisma.invitation.update).toHaveBeenCalledWith({
        where: { id: 'invitation-id', eventId: 'event-id' },
        data: { customMessage: 'Hello' },
        select: expect.any(Object),
      });
    });
  });

  describe('resolvePublic', () => {
    it('resolves public invitation with event content, slot-aware media, and mediaBySlot', async () => {
      mockPublicAccessService.getEligibleContext.mockResolvedValue({
        invitationId: 'inv-1',
        eventId: 'event-1',
        eventDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      });

      mockPrisma.invitation.findUnique.mockResolvedValue({
        customMessage: 'Welcome!',
        status: 'OPENED',
        rsvpPax: null,
        guest: {
          name: 'Budi Santoso',
          customGreeting: 'Keluarga',
          maxPax: 2,
        },
        event: {
          title: 'Aditya & Citra',
          description: 'Wedding',
          eventDate: new Date('2026-10-15'),
          locationDetails: 'Grand Ballroom',
          content: {
            partnerOneName: 'Aditya',
            partnerTwoName: 'Citra',
            _schemaVersion: 1,
          },
          template: {
            themeCode: 'IVORY_GARDEN',
            config: { version: 1 },
          },
        },
      });

      mockPrisma.media.findMany.mockResolvedValue([
        { id: 'media-1', type: 'PHOTO', slot: 'hero', order: 0 },
        { id: 'media-2', type: 'PHOTO', slot: 'gallery', order: 0 },
      ]);

      const res = await service.resolvePublic('test-code-1234');

      expect(res.guest.name).toBe('Budi Santoso');
      expect(res.event.content).toEqual({
        partnerOneName: 'Aditya',
        partnerTwoName: 'Citra',
        _schemaVersion: 1,
      });
      expect(res.media).toHaveLength(2);
      expect(res.media[0]).toEqual({
        id: 'media-1',
        type: 'PHOTO',
        slot: 'hero',
        order: 0,
        src: '/invitations/public/test-code-1234/media/media-1',
      });
      expect(res.mediaBySlot).toBeDefined();
      expect(res.mediaBySlot?.hero).toHaveLength(1);
      expect(res.mediaBySlot?.gallery).toHaveLength(1);
    });

    it('fails closed (content null) when persisted invitation event content is malformed', async () => {
      mockPublicAccessService.getEligibleContext.mockResolvedValue({
        invitationId: 'inv-1',
        eventId: 'event-1',
        eventDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      });

      mockPrisma.invitation.findUnique.mockResolvedValue({
        customMessage: 'Welcome!',
        status: 'OPENED',
        rsvpPax: null,
        guest: { name: 'Budi', customGreeting: null, maxPax: 1 },
        event: {
          title: 'Aditya & Citra',
          description: 'Wedding',
          eventDate: new Date('2026-10-15'),
          locationDetails: 'Grand Ballroom',
          content: {
            malformedField: 'bad',
            __proto__: { poisoned: true },
          },
          template: { themeCode: 'IVORY_GARDEN', config: { version: 1 } },
        },
      });

      mockPrisma.media.findMany.mockResolvedValue([]);

      const res = await service.resolvePublic('test-code-1234');
      expect(res.event.content).toBeNull();
    });
  });

  describe('getInvitationStats', () => {
    it('aggregates invitation funnel and open statistics accurately', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-1' });

      mockPrisma.invitation.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          uniqueCode: 'code-1',
          status: 'OPENED',
          rsvpPax: null,
          firstOpenedAt: new Date('2026-11-13T10:00:00Z'),
          lastOpenedAt: new Date('2026-11-13T10:30:00Z'),
          openCount: 3,
          createdAt: new Date('2026-11-12T10:00:00Z'),
          guest: {
            id: 'g-1',
            name: 'Andi',
            phoneNumber: '08123456789',
            category: 'VIP',
          },
        },
        {
          id: 'inv-2',
          uniqueCode: 'code-2',
          status: 'RSVP_YES',
          rsvpPax: 2,
          firstOpenedAt: new Date('2026-11-13T11:00:00Z'),
          lastOpenedAt: new Date('2026-11-13T11:00:00Z'),
          openCount: 1,
          createdAt: new Date('2026-11-12T10:00:00Z'),
          guest: {
            id: 'g-2',
            name: 'Budi',
            phoneNumber: '08129876543',
            category: 'FAMILY',
          },
        },
        {
          id: 'inv-3',
          uniqueCode: 'code-3',
          status: 'SENT',
          rsvpPax: null,
          firstOpenedAt: null,
          lastOpenedAt: null,
          openCount: 0,
          createdAt: new Date('2026-11-12T10:00:00Z'),
          guest: {
            id: 'g-3',
            name: 'Citra',
            phoneNumber: '08131112223',
            category: 'REGULAR',
          },
        },
        {
          id: 'inv-4',
          uniqueCode: 'code-4',
          status: 'PENDING',
          rsvpPax: null,
          firstOpenedAt: null,
          lastOpenedAt: null,
          openCount: 0,
          createdAt: new Date('2026-11-12T10:00:00Z'),
          guest: {
            id: 'g-4',
            name: 'Dewi',
            phoneNumber: null,
            category: 'REGULAR',
          },
        },
      ]);

      const result = await service.getInvitationStats(
        'event-1',
        'user-1',
        Role.ADMIN,
      );

      expect(result.summary.totalInvitations).toBe(4);
      expect(result.summary.totalEverOpened).toBe(2);
      expect(result.summary.openRatePercent).toBe(50);
      expect(result.summary.rsvpYesCount).toBe(1);
      expect(result.summary.totalPaxConfirmed).toBe(2);
      expect(result.summary.unopenedCount).toBe(2);
      expect(result.unopenedGuests).toHaveLength(2);
      expect(result.unopenedGuests[0].guestName).toBe('Citra');
      expect(result.unopenedGuests[1].guestName).toBe('Dewi');
      expect(result.recentlyOpened).toHaveLength(2);
      expect(result.recentlyOpened[0].guestName).toBe('Budi'); // latest lastOpenedAt (11:00 vs 10:30)
    });
  });
});
