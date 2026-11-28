import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { OrderStatus, Prisma, Role } from 'database';
import {
  type MasterPricingConfig,
  type OrderPricingOptionsInput,
  type SuperAdminPricingOverride,
} from 'pricing';
import { PrismaService } from '../database/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import {
  buildOrderPricingSnapshot,
  calculateActiveUntil,
  getPackageDefinition,
  loadMasterPricingConfigFromPrisma,
  loadMasterPricingConfigWithSource,
  type LoadMasterPricingOptions,
  resolveOrderMaxGuests,
  saveMasterPricingConfigToPrisma,
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
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly activityLogs?: ActivityLogsService,
  ) {}

  /**
   * Read active Master Pricing Configuration with source info ('database' | 'cache' | 'default').
   */
  async getMasterPricingConfigWithSource(
    options?: LoadMasterPricingOptions,
  ): Promise<{
    config: MasterPricingConfig;
    source: 'database' | 'cache' | 'default';
  }> {
    return loadMasterPricingConfigWithSource(
      this.prisma as unknown as Parameters<
        typeof loadMasterPricingConfigWithSource
      >[0],
      options,
    );
  }

  /**
   * Read active Master Pricing Configuration (service rates, strikethrough catalog prices, custom presets).
   */
  async getMasterPricingConfig(
    options?: LoadMasterPricingOptions,
  ): Promise<MasterPricingConfig> {
    const { config } = await this.getMasterPricingConfigWithSource(options);
    return config;
  }

  /**
   * Save Master Pricing Configuration (Strictly SUPER_ADMIN).
   */
  async saveMasterPricingConfig(
    rawConfig: unknown,
    actor?: { userId?: string; id?: string; role?: Role },
  ): Promise<MasterPricingConfig> {
    if (actor?.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Hanya Super Admin yang diizinkan mengelola pengaturan master paket dan harga layanan.',
      );
    }

    return saveMasterPricingConfigToPrisma(
      this.prisma as unknown as Parameters<
        typeof saveMasterPricingConfigToPrisma
      >[0],
      rawConfig,
      actor,
    );
  }

  /**
   * List orders with optional status filter, search, and pagination.
   * Regular ADMINs are restricted to orders of events belonging to their tenant account.
   */
  async listOrders(
    query: OrderQueryDto,
    actor?: { userId?: string; id?: string; role?: Role },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (actor?.role === Role.ADMIN) {
      const adminUserId = actor.userId || actor.id;
      if (adminUserId) {
        where.event = { userId: adminUserId };
      }
    }

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

    const countWhere: Prisma.OrderWhereInput = { ...where };
    delete countWhere.status;

    // Do not swallow database errors; propagate to caller with clear reporting.
    const [total, orders, fetchedCounts] = await Promise.all([
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
      this.prisma.order
        .groupBy({
          by: ['status'],
          where: countWhere,
          _count: { _all: true },
        })
        .catch(() => []),
    ]);

    const counts = fetchedCounts as Array<{
      status?: string;
      _count?: { _all?: number } | number;
    }>;

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

    if (Array.isArray(counts)) {
      counts.forEach((c) => {
        if (c && typeof c.status === 'string' && c._count !== undefined) {
          const cnt =
            typeof c._count === 'object' &&
            c._count !== null &&
            typeof c._count._all === 'number'
              ? c._count._all
              : typeof c._count === 'number'
                ? c._count
                : 1;
          statusCounts[c.status] = cnt;
          statusCounts.TOTAL += cnt;
        }
      });
    }

    const sanitizedOrders = (orders || []).filter(Boolean);

    return {
      data: sanitizedOrders,
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
   * Regular ADMINs are restricted to orders belonging to their own tenant events.
   */
  async getOrder(
    id: string,
    actor?: { userId?: string; id?: string; role?: Role },
  ) {
    const where: Prisma.OrderWhereInput = {
      OR: [{ id }, { referenceCode: id }],
    };

    if (actor?.role === Role.ADMIN) {
      const adminUserId = actor.userId || actor.id;
      if (adminUserId) {
        where.event = { userId: adminUserId };
      }
    }

    const order = await this.prisma.order.findFirst({
      where,
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

    if (actor?.role === Role.ADMIN) {
      const adminUserId = actor.userId || actor.id;
      if (adminUserId && order.event?.userId !== adminUserId) {
        throw new ForbiddenException(
          'Akses ditolak: Anda tidak memiliki akses ke pesanan untuk acara ini.',
        );
      }
    }

    return order;
  }

  /**
   * Create an order for an event.
   */
  async createOrder(dto: CreateOrderDto) {
    try {
      await loadMasterPricingConfigFromPrisma(
        this.prisma as unknown as Parameters<
          typeof loadMasterPricingConfigFromPrisma
        >[0],
        { strict: true },
      );
    } catch (pricingErr) {
      throw new BadRequestException(
        `Gagal memproses pesanan: konfigurasi harga master tidak dapat dibaca (${pricingErr instanceof Error ? pricingErr.message : String(pricingErr)})`,
      );
    }

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

    const createdOrder = await this.prisma.order.create({
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

    void this.activityLogs?.record({
      action: 'ORDER_CREATE',
      entityType: 'Order',
      entityId: createdOrder.id,
      eventId: event.id,
      metadata: {
        referenceCode: createdOrder.referenceCode,
        packageCode: createdOrder.packageCode,
        priceAmount: createdOrder.priceAmount,
      },
    });

    return createdOrder;
  }

  /**
   * Update order status, package, options, final price, payment proof, or notes.
   */
  async updateOrder(
    id: string,
    dto: UpdateOrderDto,
    actor?: { userId?: string; id?: string; role?: Role },
  ) {
    if (
      actor?.role &&
      actor.role !== Role.SUPER_ADMIN &&
      actor.role !== Role.ADMIN
    ) {
      throw new ForbiddenException(
        'Hanya Admin atau Super Admin yang diizinkan mengubah pesanan.',
      );
    }

    const hasSuperAdminOnlyFields =
      dto.superAdminCustom !== undefined ||
      dto.originalPriceAmount !== undefined;

    if (hasSuperAdminOnlyFields && actor?.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Hanya Super Admin yang diizinkan merakit paket khusus, mengubah harga per layanan, atau mengatur harga coret.',
      );
    }

    if (
      actor?.role === Role.ADMIN &&
      (dto.priceAmount !== undefined ||
        dto.packageCode !== undefined ||
        dto.options !== undefined)
    ) {
      throw new ForbiddenException(
        'Hanya Super Admin yang diizinkan mengatur paket layanan atau mengubah harga pesanan.',
      );
    }

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

    if (actor?.role === Role.ADMIN) {
      const adminUserId = actor.userId || actor.id;
      if (adminUserId && order.event?.userId !== adminUserId) {
        throw new ForbiddenException(
          'Akses ditolak: Anda tidak memiliki akses ke pesanan untuk acara ini.',
        );
      }
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
      if (
        dto.status === OrderStatus.LIVE &&
        order.event &&
        order.eventId &&
        order.event.status !== 'PUBLISHED'
      ) {
        await this.prisma.event.update({
          where: { id: order.eventId },
          data: { status: 'PUBLISHED' },
        });
      }
    }

    if (
      dto.packageCode !== undefined ||
      dto.options !== undefined ||
      dto.superAdminCustom !== undefined
    ) {
      const targetPackageCode = (
        dto.packageCode ??
        order.packageCode ??
        'UNSELECTED'
      )
        .trim()
        .toUpperCase();
      const existingOptionsObj =
        order.options &&
        typeof order.options === 'object' &&
        !Array.isArray(order.options)
          ? (order.options as Record<string, unknown>)
          : {};
      const existingInput: OrderPricingOptionsInput =
        existingOptionsObj.input &&
        typeof existingOptionsObj.input === 'object' &&
        !Array.isArray(existingOptionsObj.input)
          ? { ...(existingOptionsObj.input as OrderPricingOptionsInput) }
          : {};
      const existingSuperAdminCustom: SuperAdminPricingOverride | undefined =
        existingOptionsObj.superAdminCustom &&
        typeof existingOptionsObj.superAdminCustom === 'object' &&
        !Array.isArray(existingOptionsObj.superAdminCustom)
          ? {
              ...(existingOptionsObj.superAdminCustom as SuperAdminPricingOverride),
            }
          : undefined;

      const packageChanged =
        dto.packageCode !== undefined &&
        targetPackageCode !== (order.packageCode || '').trim().toUpperCase();

      const mergedOptions: OrderPricingOptionsInput = packageChanged
        ? { ...(dto.options ?? {}) }
        : { ...existingInput, ...(dto.options ?? {}) };

      let resolvedSuperAdminOverride: SuperAdminPricingOverride | null = null;
      if (dto.superAdminCustom === null) {
        resolvedSuperAdminOverride = null;
      } else if (dto.superAdminCustom !== undefined) {
        resolvedSuperAdminOverride = {
          ...(packageChanged ? {} : (existingSuperAdminCustom ?? {})),
          ...dto.superAdminCustom,
          ...(dto.originalPriceAmount !== undefined
            ? { originalPriceAmount: dto.originalPriceAmount }
            : {}),
        };
      } else if (!packageChanged && existingSuperAdminCustom) {
        resolvedSuperAdminOverride = {
          ...existingSuperAdminCustom,
          ...(dto.originalPriceAmount !== undefined
            ? { originalPriceAmount: dto.originalPriceAmount }
            : {}),
        };
      } else if (dto.originalPriceAmount !== undefined) {
        resolvedSuperAdminOverride = {
          originalPriceAmount: dto.originalPriceAmount,
        };
      }

      const masterConfig = await this.getMasterPricingConfig();
      const snap = buildOrderPricingSnapshot(
        targetPackageCode,
        mergedOptions,
        resolvedSuperAdminOverride,
        masterConfig,
      );
      const nextMaxGuests = resolveOrderMaxGuests({
        packageCode: snap.packageCode,
        options: snap.options,
      });

      if (order.eventId && nextMaxGuests !== null) {
        const existingGuestCount = await this.prisma.guest.count({
          where: {
            eventId: order.eventId,
            isWalkIn: false,
          },
        });
        if (nextMaxGuests < existingGuestCount) {
          throw new BadRequestException(
            `Tidak dapat mengubah paket/kapasitas ke batas ${nextMaxGuests} undangan karena acara ini sudah memiliki ${existingGuestCount} tamu terdaftar.`,
          );
        }
      }

      updateData.packageCode = snap.packageCode;
      updateData.options = snap.options as unknown as Prisma.InputJsonValue;

      // Preserve admin's existing final price (discount) unless the order previously had no price (UNSELECTED / 0)
      const wasUnselectedOrZero =
        (order.packageCode || '').trim().toUpperCase() === 'UNSELECTED' ||
        order.priceAmount <= 0;
      if (dto.priceAmount === undefined) {
        updateData.priceAmount = wasUnselectedOrZero
          ? snap.priceAmount
          : order.priceAmount;
      }
    } else if (dto.originalPriceAmount !== undefined) {
      const existingOptionsObj =
        order.options &&
        typeof order.options === 'object' &&
        !Array.isArray(order.options)
          ? { ...(order.options as Record<string, unknown>) }
          : {};
      existingOptionsObj.originalPriceAmount = dto.originalPriceAmount;
      updateData.options =
        existingOptionsObj as unknown as Prisma.InputJsonValue;
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
    if (
      order.eventId &&
      dto.activeUntil &&
      !isNaN(Date.parse(dto.activeUntil))
    ) {
      await this.prisma.event.update({
        where: { id: order.eventId },
        data: { activeUntil: new Date(dto.activeUntil) },
      });
    } else if (
      order.event &&
      order.eventId &&
      (dto.status === OrderStatus.PAID || dto.status === OrderStatus.LIVE) &&
      !order.event.activeUntil
    ) {
      // Auto-set activeUntil on payment if not present
      const pkgCode = dto.packageCode || order.packageCode;
      const computedExpiry = calculateActiveUntil(
        order.event.eventDate,
        pkgCode,
      );
      await this.prisma.event.update({
        where: { id: order.eventId },
        data: { activeUntil: computedExpiry },
      });
    }

    const updated = await this.prisma.order.update({
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

    void this.activityLogs?.record({
      action: 'ORDER_UPDATE',
      entityType: 'Order',
      entityId: updated.id,
      eventId: order.eventId,
      metadata: {
        previousStatus: order.status,
        newStatus: dto.status || order.status,
        referenceCode: order.referenceCode,
      },
    });

    return updated;
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

    void this.activityLogs?.record({
      action: 'CRON_EXPIRE_EVENTS',
      entityType: 'Event',
      entityId: 'SYSTEM',
      metadata: {
        archivedCount: ids.length,
        eventIds: ids,
      },
    });

    return {
      archivedCount: ids.length,
      eventIds: ids,
      timestamp: now.toISOString(),
    };
  }
}
