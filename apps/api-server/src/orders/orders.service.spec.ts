/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, Role } from 'database';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../database/prisma.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { resolveOrderMaxGuests } from './packages';

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
    guest: {
      count: jest.Mock;
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
      guest: {
        count: jest.fn().mockResolvedValue(0),
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
      prisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        activeUntil: null,
      });
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

      await expect(service.getOrder('unknown')).rejects.toThrow(
        NotFoundException,
      );
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
      prisma.event.update.mockResolvedValue({
        ...mockEvent,
        status: 'PUBLISHED',
      });
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

    it('allows admin to update final priceAmount (discount) while preserving options.computedTotal', async () => {
      const existingOptions = {
        computedTotal: 499_000,
        lineItems: [
          {
            code: 'PACKAGE_SIGNATURE',
            label: 'Paket Signature (300 tamu)',
            quantity: 1,
            unitPrice: 499_000,
            amount: 499_000,
          },
        ],
        entitlements: { maxGuests: 300 },
      };
      prisma.order.findFirst.mockResolvedValue({
        ...mockOrder,
        packageCode: 'SIGNATURE',
        priceAmount: 499_000,
        options: existingOptions,
      });
      prisma.order.update.mockResolvedValue({
        ...mockOrder,
        packageCode: 'SIGNATURE',
        priceAmount: 450_000,
        options: existingOptions,
      });

      const updated = await service.updateOrder('ord-123', {
        priceAmount: 450_000,
      });

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priceAmount: 450_000,
          }),
        }),
      );
      const updateCallData = (
        prisma.order.update.mock.calls[0] as [{ data: Record<string, unknown> }]
      )[0].data;
      expect(updateCallData.options).toBeUndefined();
      expect(updated.priceAmount).toBe(450_000);
    });

    it('changes package and options to raise or lower maxGuests while preserving admin discounted priceAmount', async () => {
      prisma.order.findFirst.mockResolvedValue({
        ...mockOrder,
        packageCode: 'INTIMATE',
        priceAmount: 250_000, // Admin had given a discount from 299_000
        options: {
          computedTotal: 299_000,
          entitlements: { maxGuests: 150 },
        },
      });
      prisma.guest.count.mockResolvedValue(40);
      prisma.order.update.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => ({
          ...mockOrder,
          ...data,
        }),
      );

      // 1) Upgrade to SIGNATURE with capacityTier 600 and 1 extra petugas
      const upgraded = await service.updateOrder('ord-123', {
        packageCode: 'SIGNATURE',
        options: {
          capacityTier: 600,
          extraPetugas: 1,
        },
      });

      expect(upgraded.packageCode).toBe('SIGNATURE');
      // Discounted final price (250_000) is preserved when priceAmount is not overridden
      expect(upgraded.priceAmount).toBe(250_000);
      const upgradedOptions = upgraded.options as {
        computedTotal: number;
        entitlements: { maxGuests: number; petugasCount: number };
      };
      // SIGNATURE (499_000) + upgrade 300->600 (150_000) + 1 petugas (80_000) = 729_000
      expect(upgradedOptions.computedTotal).toBe(729_000);
      expect(upgradedOptions.entitlements.maxGuests).toBe(600);
      expect(upgradedOptions.entitlements.petugasCount).toBe(3);

      // 2) Lower package to SACRED (maxGuests 50) when event has 40 guests -> allowed
      const lowered = await service.updateOrder('ord-123', {
        packageCode: 'SACRED',
      });
      const loweredOptions = lowered.options as {
        computedTotal: number;
        entitlements: { maxGuests: number };
      };
      expect(lowered.packageCode).toBe('SACRED');
      expect(loweredOptions.entitlements.maxGuests).toBe(50);
      expect(loweredOptions.computedTotal).toBe(149_000);
      expect(lowered.priceAmount).toBe(250_000);
    });

    it('upgrades UNSELECTED order to SIGNATURE and updates event maxGuests from 50 to 300', async () => {
      prisma.order.findFirst.mockResolvedValue({
        ...mockOrder,
        packageCode: 'UNSELECTED',
        priceAmount: 0,
        options: {
          computedTotal: 0,
          entitlements: { maxGuests: 50 },
        },
      });
      prisma.guest.count.mockResolvedValue(50);
      prisma.order.update.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => ({
          ...mockOrder,
          ...data,
        }),
      );

      const updated = await service.updateOrder('ord-123', {
        packageCode: 'SIGNATURE',
      });

      expect(updated.packageCode).toBe('SIGNATURE');
      expect(updated.priceAmount).toBe(499_000);
      expect(
        resolveOrderMaxGuests({
          packageCode: updated.packageCode,
          options: updated.options,
        }),
      ).toBe(300);
    });

    it('rejects lowering package/capacity below existing guest count with a clear error message', async () => {
      prisma.order.findFirst.mockResolvedValue({
        ...mockOrder,
        packageCode: 'SIGNATURE',
        priceAmount: 499_000,
        options: {
          computedTotal: 499_000,
          entitlements: { maxGuests: 300 },
        },
      });
      prisma.guest.count.mockResolvedValue(120);

      await expect(
        service.updateOrder('ord-123', {
          packageCode: 'SACRED',
        }),
      ).rejects.toThrow(/sudah memiliki 120 tamu terdaftar/);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('enforces role access: rejects STAFF in updateOrder and restricts OrdersController endpoints to SUPER_ADMIN and ADMIN', async () => {
      await expect(
        service.updateOrder(
          'ord-123',
          { packageCode: 'INTIMATE' },
          { id: 'staff-1', role: Role.STAFF },
        ),
      ).rejects.toThrow(ForbiddenException);

      const patchRoles = Reflect.getMetadata(
        ROLES_KEY,
        OrdersController.prototype.updateOrder,
      );
      expect(patchRoles).toEqual([Role.SUPER_ADMIN, Role.ADMIN]);
    });

    it('resolveOrderMaxGuests returns null for legacy SILVER/GOLD/PLATINUM orders and orders without options', () => {
      expect(
        resolveOrderMaxGuests({ packageCode: 'GOLD', options: null }),
      ).toBeNull();
      expect(
        resolveOrderMaxGuests({
          packageCode: 'GOLD',
          options: { entitlements: { maxGuests: 300 } },
        }),
      ).toBeNull();
      expect(
        resolveOrderMaxGuests({ packageCode: 'SILVER', options: null }),
      ).toBeNull();
      expect(
        resolveOrderMaxGuests({ packageCode: 'PLATINUM', options: null }),
      ).toBeNull();
      expect(
        resolveOrderMaxGuests({ packageCode: 'SIGNATURE', options: null }),
      ).toBeNull();
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
