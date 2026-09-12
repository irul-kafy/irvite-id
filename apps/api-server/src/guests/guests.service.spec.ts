/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { GuestsService } from './guests.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Role, Prisma } from 'database';

describe('GuestsService', () => {
  let service: GuestsService;
  let prisma: PrismaService;

  const mockPrisma = {
    event: {
      findFirst: jest.fn(),
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
      ],
    }).compile();

    service = module.get<GuestsService>(GuestsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Authorization', () => {
    it('throws NotFoundException if ADMIN tries to access inaccessible Event', async () => {
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
  });
});
