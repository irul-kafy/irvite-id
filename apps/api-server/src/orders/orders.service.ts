import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { OrderStatus, Prisma } from 'database';
import { PrismaService } from '../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import {
  calculateActiveUntil,
  getPackageDefinition,
} from './packages';

// Valid transitions mapping
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.DRAFT]: [
    OrderStatus.DRAFT,
    OrderStatus.AWAITING_PAYMENT,
    OrderStatus.PAID,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.AWAITING_PAYMENT]: [
    OrderStatus.AWAITING_PAYMENT,
    OrderStatus.PAID,
    OrderStatus.CANCELLED,
    OrderStatus.DRAFT,
  ],
  [OrderStatus.PAID]: [
    OrderStatus.PAID,
    OrderStatus.IN_PROGRESS,
    OrderStatus.LIVE,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.IN_PROGRESS]: [
    OrderStatus.IN_PROGRESS,
    OrderStatus.LIVE,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.LIVE]: [
    OrderStatus.LIVE,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.COMPLETED]: [
    OrderStatus.COMPLETED,
    OrderStatus.LIVE,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.CANCELLED]: [
    OrderStatus.CANCELLED,
    OrderStatus.DRAFT,
    OrderStatus.AWAITING_PAYMENT,
  ],
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List orders with optional status filter, search, and pagination.
   */
  async listOrders(query: OrderQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { referenceCode: { contains: term } },
        { clientName: { contains: term } },
        { clientWhatsapp: { contains: term } },
        { event: { title: { contains: term } } },
      ];
    }

    const [total, orders, counts] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              eventDate: true,
              activeUntil: true,
              status: true,
              template: {
                select: {
                  id: true,
                  name: true,
                  themeCode: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      TOTAL: 0,
      DRAFT: 0,
      AWAITING_PAYMENT: 0,
      PAID: 0,
      IN_PROGRESS: 0,
      LIVE: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    counts.forEach((c) => {
      statusCounts[c.status] = c._count._all;
      statusCounts.TOTAL += c._count._all;
    });

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      counts: statusCounts,
    };
  }

  /**
   * Get single order by id or reference code.
   */
  async getOrder(id: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id }, { referenceCode: id }],
      },
      include: {
        event: {
          include: {
            template: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order '${id}' not found`);
    }

    return order;
  }

  /**
   * Create an order for an event.
   */
  async createOrder(dto: CreateOrderDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
      include: { order: true },
    });

    if (!event) {
      throw new NotFoundException(`Event '${dto.eventId}' not found`);
    }

    if (event.order) {
      throw new ConflictException(
        `Event '${dto.eventId}' already has an associated order (${event.order.referenceCode})`,
      );
    }

    const pkg = getPackageDefinition(dto.packageCode);
    const referenceCode =
      (dto.referenceCode && dto.referenceCode.trim()) ||
      `IRV-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const priceAmount =
      typeof dto.priceAmount === 'number' && dto.priceAmount >= 0
        ? dto.priceAmount
        : pkg.priceAmount;

    // Calculate activeUntil if event doesn't already have one
    if (!event.activeUntil) {
      const activeUntil = calculateActiveUntil(event.eventDate, pkg.code);
      await this.prisma.event.update({
        where: { id: event.id },
        data: { activeUntil },
      });
    }

    return this.prisma.order.create({
      data: {
        eventId: event.id,
        referenceCode,
        clientName: dto.clientName.trim(),
        clientWhatsapp: dto.clientWhatsapp.trim(),
        packageCode: pkg.code,
        priceAmount,
        status: OrderStatus.DRAFT,
        notes: dto.notes?.trim() || null,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            eventDate: true,
            activeUntil: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Update order status, package, payment proof, or notes.
   */
  async updateOrder(id: string, dto: UpdateOrderDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id }, { referenceCode: id }],
      },
      include: {
        event: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order '${id}' not found`);
    }

    // Validate status transition if status is being updated
    if (dto.status && dto.status !== order.status) {
      const allowed = VALID_TRANSITIONS[order.status] || [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Transisi status dari '${order.status}' ke '${dto.status}' tidak diizinkan.`,
        );
      }
    }

    const updateData: Prisma.OrderUpdateInput = {};

    if (dto.status) {
      updateData.status = dto.status;

      // When transition to PAID or LIVE, auto-populate paidAt if null
      if (
        (dto.status === OrderStatus.PAID || dto.status === OrderStatus.LIVE) &&
        !order.paidAt &&
        !dto.paidAt
      ) {
        updateData.paidAt = new Date();
      }

      // If marked LIVE, also ensure event status is PUBLISHED
      if (dto.status === OrderStatus.LIVE && order.event.status !== 'PUBLISHED') {
        await this.prisma.event.update({
          where: { id: order.eventId },
          data: { status: 'PUBLISHED' },
        });
      }
    }

    if (dto.packageCode) {
      const pkg = getPackageDefinition(dto.packageCode);
      updateData.packageCode = pkg.code;
      if (dto.priceAmount === undefined) {
        updateData.priceAmount = pkg.priceAmount;
      }
    }

    if (typeof dto.priceAmount === 'number' && dto.priceAmount >= 0) {
      updateData.priceAmount = dto.priceAmount;
    }

    if (dto.paidAt) {
      updateData.paidAt = new Date(dto.paidAt);
    }

    if (dto.paymentProofMediaId !== undefined) {
      updateData.paymentProofMediaId = dto.paymentProofMediaId || null;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes?.trim() || null;
    }

    // Update activeUntil on event if requested
    if (dto.activeUntil && !isNaN(Date.parse(dto.activeUntil))) {
      await this.prisma.event.update({
        where: { id: order.eventId },
        data: { activeUntil: new Date(dto.activeUntil) },
      });
    } else if (
      (dto.status === OrderStatus.PAID || dto.status === OrderStatus.LIVE) &&
      !order.event.activeUntil
    ) {
      // Auto-set activeUntil on payment if not present
      const pkgCode = dto.packageCode || order.packageCode;
      const computedExpiry = calculateActiveUntil(order.event.eventDate, pkgCode);
      await this.prisma.event.update({
        where: { id: order.eventId },
        data: { activeUntil: computedExpiry },
      });
    }

    return this.prisma.order.update({
      where: { id: order.id },
      data: updateData,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            eventDate: true,
            activeUntil: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Cron job utility: Archives all published events that have exceeded their activeUntil deadline.
   * Idempotent & safe.
   */
  async expireEventsCron() {
    const now = new Date();

    // Find all published events that are expired:
    // 1) activeUntil is set and <= now
    // 2) OR activeUntil is null and eventDate <= now - 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const expiredEvents = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          {
            activeUntil: {
              not: null,
              lte: now,
            },
          },
          {
            activeUntil: null,
            eventDate: {
              lte: thirtyDaysAgo,
            },
          },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        activeUntil: true,
        eventDate: true,
      },
    });

    if (expiredEvents.length === 0) {
      return {
        archivedCount: 0,
        eventIds: [],
        timestamp: now.toISOString(),
      };
    }

    const ids = expiredEvents.map((e) => e.id);

    await this.prisma.event.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        status: 'ARCHIVED',
      },
    });

    return {
      archivedCount: ids.length,
      eventIds: ids,
      timestamp: now.toISOString(),
    };
  }
}

