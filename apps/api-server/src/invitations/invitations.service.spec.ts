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
});
