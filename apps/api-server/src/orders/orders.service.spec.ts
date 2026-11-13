import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from 'database';
import { PrismaService } from '../database/prisma.service';
import { OrdersService } from './orders.service';
import { PACKAGES } from './packages';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: {
    event: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    order: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  const mockEvent = {
    id: 'evt-123',
    title: 'Pernikahan Rian & Maya',
    slug: 'rian-maya',
    eventDate: new Date('2026-12-01T10:00:00.000Z'),
    activeUntil: null,
    status: 'DRAFT',
    order: null,
  };

  const mockOrder = {
    id: 'ord-123',
    eventId: 'evt-123',
    referenceCode: 'IRV-ABC123',
    clientName: 'Rian Pratama',
    clientWhatsapp: '081234567890',
    packageCode: 'GOLD',
    priceAmount: 199000,
    status: OrderStatus.DRAFT,
    paidAt: null,
    paymentProofMediaId: null,
    notes: 'Catatan pesanan',
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
    updatedAt: new Date('2026-11-01T00:00:00.000Z'),
    event: mockEvent,
  };

  beforeEach(async () => {
    prisma = {
      event: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      order: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('createOrder', () => {
    it('creates an order and sets activeUntil on event if missing', async () => {
      prisma.event.findUnique.mockResolvedValue({ ...mockEvent, activeUntil: null });
      prisma.event.update.mockResolvedValue({ ...mockEvent });
      prisma.order.create.mockResolvedValue({
        ...mockOrder,
        packageCode: 'GOLD',
        priceAmount: 199000,
      });

      const result = await service.createOrder({
        eventId: 'evt-123',
        clientName: 'Rian Pratama',
        clientWhatsapp: '081234567890',
        packageCode: 'GOLD',
      });

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'evt-123' },
        include: { order: true },
      });
      expect(prisma.event.update).toHaveBeenCalled();
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventId: 'evt-123',
            clientName: 'Rian Pratama',
            packageCode: 'GOLD',
            priceAmount: 199000,
            status: OrderStatus.DRAFT,
          }),
        }),
      );
      expect(result.packageCode).toBe('GOLD');
    });

    it('throws NotFoundException if event does not exist', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrder({
          eventId: 'non-existent',
          clientName: 'Test',
          clientWhatsapp: '08123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if event already has an order', async () => {
      prisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        order: { id: 'ord-existing', referenceCode: 'IRV-EXIST' },
      });

      await expect(
        service.createOrder({
          eventId: 'evt-123',
          clientName: 'Test',
          clientWhatsapp: '08123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getOrder', () => {
    it('returns an order by id or reference code', async () => {
      prisma.order.findFirst.mockResolvedValue(mockOrder);

      const res = await service.getOrder('ord-123');
      expect(res.id).toBe('ord-123');
      expect(prisma.order.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: 'ord-123' }, { referenceCode: 'ord-123' }],
        },
        include: {
          event: {
            include: { template: true },
          },
        },
      });
    });

    it('throws NotFoundException if order not found', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(service.getOrder('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOrder', () => {
    it('allows valid status transition and sets paidAt on payment', async () => {
      prisma.order.findFirst.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.AWAITING_PAYMENT,
      });
      prisma.event.update.mockResolvedValue({ ...mockEvent });
      prisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PAID,
        paidAt: new Date(),
      });

      const updated = await service.updateOrder('ord-123', {
        status: OrderStatus.PAID,
      });

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.PAID,
            paidAt: expect.any(Date),
          }),
        }),
      );
      expect(updated.status).toBe(OrderStatus.PAID);
    });

    it('publishes event when order becomes LIVE', async () => {
      prisma.order.findFirst.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PAID,
        event: { ...mockEvent, status: 'DRAFT' },
      });
      prisma.event.update.mockResolvedValue({ ...mockEvent, status: 'PUBLISHED' });
      prisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.LIVE,
      });

      await service.updateOrder('ord-123', {
        status: OrderStatus.LIVE,
      });

      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: mockOrder.eventId },
        data: { status: 'PUBLISHED' },
      });
    });

    it('rejects invalid status transition with BadRequestException', async () => {
      prisma.order.findFirst.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.DRAFT,
      });

      // DRAFT cannot directly jump to LIVE
      await expect(
        service.updateOrder('ord-123', {
          status: OrderStatus.LIVE,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('expireEventsCron', () => {
    it('archives published events that have passed their activeUntil date', async () => {
      const expiredEvent = {
        id: 'evt-expired-1',
        title: 'Acara Lampau',
        slug: 'acara-lampau',
        activeUntil: new Date('2026-01-01T00:00:00.000Z'),
        eventDate: new Date('2025-07-01T00:00:00.000Z'),
      };

      prisma.event.findMany.mockResolvedValue([expiredEvent]);
      prisma.event.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.expireEventsCron();

      expect(result.archivedCount).toBe(1);
      expect(result.eventIds).toContain('evt-expired-1');
      expect(prisma.event.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['evt-expired-1'] } },
        data: { status: 'ARCHIVED' },
      });
    });

    it('returns archivedCount 0 when no events are expired (idempotent)', async () => {
      prisma.event.findMany.mockResolvedValue([]);

      const result = await service.expireEventsCron();

      expect(result.archivedCount).toBe(0);
      expect(result.eventIds).toEqual([]);
      expect(prisma.event.updateMany).not.toHaveBeenCalled();
    });
  });
});

