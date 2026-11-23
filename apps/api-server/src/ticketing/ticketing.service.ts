import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IssuedTicketStatus,
  Prisma,
  Role,
  TicketEventStatus,
  TicketOrderStatus,
} from 'database';
import { PrismaService } from '../database/prisma.service';
import { PAYMENT_SERVICE } from './payment.service';
import type { PaymentService } from './payment.service';
import { ListPublicEventsQueryDto } from './dto/list-public-events-query.dto';
import {
  CheckoutTicketDto,
  PaymentWebhookDto,
} from './dto/checkout-ticket.dto';
import {
  CheckInTicketDto,
  CreateTicketingEventDto,
  CreateTicketTierDto,
  ListEventOrdersQueryDto,
  UpdateTicketingEventDto,
  UpdateTicketTierDto,
} from './dto/admin-ticketing.dto';

export const DEFAULT_PLATFORM_SERVICE_FEE = 3000;
export const ORDER_EXPIRY_MINUTES = 15;

export interface TicketTierView {
  id: string;
  name: string;
  description: string;
  price: number;
  quota: number;
  soldCount: number;
  remainingQuota: number;
  salesStartAt: string | null;
  salesEndAt: string | null;
  maxPerOrder: number;
  statusLabel: 'TERSEDIA' | 'HAMPIR HABIS' | 'HABIS' | 'BELUM DIBUKA' | 'DITUTUP';
  benefits: string[];
}

export interface TicketingEventView {
  id: string;
  slug: string;
  title: string;
  category: string;
  organizerName: string;
  eventDate: string;
  startAt: string;
  endAt: string | null;
  dateLabel: string;
  eventTime: string;
  venueName: string;
  city: string;
  locationDetails: string;
  description: string;
  bannerUrl: string | null;
  bannerGradient: string;
  bannerTag: string;
  startingPrice: number;
  startingPriceLabel: string;
  isFree: boolean;
  status: string;
  ticketStatus: TicketEventStatus;
  taxRatePercent: number;
  taxIncluded: boolean;
  serviceFee: number;
  tiers: TicketTierView[];
}

export interface IssuedTicketView {
  id: string;
  orderId: string;
  orderCode: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  tierId: string;
  tierName: string;
  ticketCode: string;
  qrPayload: string;
  holderName: string;
  holderEmail: string;
  unitPrice: number;
  status: 'ISSUED' | 'CHECKED_IN' | 'VOID';
  checkedInAt: string | null;
  checkedInBy: string | null;
  checkedInGate: string | null;
  createdAt: string;
}

export interface TicketOrderView {
  id: string;
  orderCode: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  tierId: string;
  tierName: string;
  buyerName: string;
  buyerEmail: string;
  buyerWhatsapp: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  subtotalAmount: number;
  serviceFee: number;
  serviceFeeAmount: number;
  taxAmount: number;
  total: number;
  totalAmount: number;
  paymentMethod: string;
  paymentRef: string | null;
  paymentReference: string | null;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
  tickets: IssuedTicketView[];
}

function formatRupiahLabel(amount: number): string {
  if (amount <= 0) {
    return 'Gratis';
  }
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

function normalizeIndonesianWhatsapp(phone: string): string {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('08')) {
    return `62${digits.slice(1)}`;
  }
  return digits;
}

function hashAccessToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

@Injectable()
export class TicketingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_SERVICE) private readonly paymentService: PaymentService,
  ) { }

  /**
   * Generates a unique cryptographically random code >= 10 characters.
   */
  generateSecureCode(prefix: 'ORD' | 'TKT'): string {
    const randomHex = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `${prefix}-${randomHex}`;
  }

  /**
   * Generates a long random access token and its SHA-256 hash.
   */
  generateOrderAccessToken(): { accessToken: string; accessTokenHash: string } {
    const accessToken = crypto.randomBytes(24).toString('base64url');
    return {
      accessToken,
      accessTokenHash: hashAccessToken(accessToken),
    };
  }

  private getQrSecret(): string {
    const secret = process.env.TICKET_QR_SECRET;
    if (secret && secret.trim().length >= 16) {
      return secret.trim();
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Konfigurasi TICKET_QR_SECRET belum diatur di server produksi.',
      );
    }
    return 'dev-test-ticket-qr-secret-key-minimum-32-bytes';
  }

  /**
   * Produces QR payload: v1.<ticketId>.<hmac> signed with TICKET_QR_SECRET.
   */
  signTicketQr(ticketId: string): string {
    const secret = this.getQrSecret();
    const message = `v1.${ticketId}`;
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('base64url');
    return `v1.${ticketId}.${hmac}`;
  }

  /**
   * Verifies QR payload: v1.<ticketId>.<hmac> in constant time.
   */
  verifyTicketQr(qrPayload: string): { valid: boolean; ticketId?: string } {
    if (!qrPayload || typeof qrPayload !== 'string') {
      return { valid: false };
    }
    const parts = qrPayload.trim().split('.');
    if (parts.length !== 3 || parts[0] !== 'v1') {
      return { valid: false };
    }
    const [, ticketId, providedHmac] = parts;
    if (!ticketId || !providedHmac || ticketId.length < 3) {
      return { valid: false };
    }

    const secret = this.getQrSecret();
    const expectedHmac = crypto
      .createHmac('sha256', secret)
      .update(`v1.${ticketId}`)
      .digest('base64url');

    const providedBuf = Buffer.from(providedHmac, 'utf8');
    const expectedBuf = Buffer.from(expectedHmac, 'utf8');
    if (providedBuf.length !== expectedBuf.length) {
      return { valid: false };
    }

    if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      return { valid: false };
    }

    return { valid: true, ticketId };
  }

  private mapEventToView(rawEvent: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    eventDate: Date;
    startAt: Date | null;
    endAt: Date | null;
    venue: string | null;
    city: string | null;
    category: string | null;
    organizerName: string | null;
    bannerUrl: string | null;
    taxRatePercent: number;
    taxIncluded: boolean;
    serviceFee: number;
    locationDetails: string | null;
    status: string;
    ticketStatus: TicketEventStatus;
    ticketTiers: Array<{
      id: string;
      name: string;
      description: string | null;
      price: number;
      quota: number;
      soldCount: number;
      salesStartAt: Date | null;
      salesEndAt: Date | null;
      maxPerOrder: number;
      benefits: unknown;
      sortOrder: number;
    }>;
  }): TicketingEventView {
    const now = new Date();
    const tiers: TicketTierView[] = [...rawEvent.ticketTiers]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => {
        const remainingQuota = Math.max(0, t.quota - t.soldCount);
        let statusLabel: TicketTierView['statusLabel'] = 'TERSEDIA';
        if (t.salesStartAt && now < t.salesStartAt) {
          statusLabel = 'BELUM DIBUKA';
        } else if (t.salesEndAt && now > t.salesEndAt) {
          statusLabel = 'DITUTUP';
        } else if (remainingQuota === 0) {
          statusLabel = 'HABIS';
        } else if (remainingQuota <= 15) {
          statusLabel = 'HAMPIR HABIS';
        }

        const benefits = Array.isArray(t.benefits)
          ? t.benefits.map((b) => String(b))
          : ['Tiket digital kode QR'];

        return {
          id: t.id,
          name: t.name,
          description: t.description || 'Tiket masuk resmi dengan kode QR.',
          price: t.price,
          quota: t.quota,
          soldCount: t.soldCount,
          remainingQuota,
          salesStartAt: t.salesStartAt ? t.salesStartAt.toISOString() : null,
          salesEndAt: t.salesEndAt ? t.salesEndAt.toISOString() : null,
          maxPerOrder: t.maxPerOrder,
          statusLabel,
          benefits,
        };
      });

    const startingPrice =
      tiers.length > 0 ? Math.min(...tiers.map((t) => t.price)) : 0;

    const effectiveStart = rawEvent.startAt || rawEvent.eventDate;
    const dateLabel = effectiveStart.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const venueName =
      rawEvent.venue || rawEvent.locationDetails || 'Lokasi acara';
    const city = rawEvent.city || 'Jakarta';
    const category = rawEvent.category || 'Konser Musik';
    const organizerName = rawEvent.organizerName || 'Penyelenggara acara';

    return {
      id: rawEvent.id,
      slug: rawEvent.slug,
      title: rawEvent.title,
      category,
      organizerName,
      eventDate: effectiveStart.toISOString(),
      startAt: effectiveStart.toISOString(),
      endAt: rawEvent.endAt ? rawEvent.endAt.toISOString() : null,
      dateLabel,
      eventTime: '19:00 - 22:00 WIB',
      venueName,
      city,
      locationDetails: rawEvent.locationDetails || `${venueName}, ${city}`,
      description:
        rawEvent.description ||
        'Acara resmi terdaftar pada layanan penjualan tiket IRVITE.',
      bannerUrl: rawEvent.bannerUrl,
      bannerGradient:
        'linear-gradient(135deg, #1b3b2b 0%, #0f2419 55%, #2e5a42 100%)',
      bannerTag: category,
      startingPrice,
      startingPriceLabel: formatRupiahLabel(startingPrice),
      isFree: startingPrice === 0,
      status: rawEvent.status,
      ticketStatus: rawEvent.ticketStatus,
      taxRatePercent: rawEvent.taxRatePercent,
      taxIncluded: rawEvent.taxIncluded,
      serviceFee: rawEvent.serviceFee,
      tiers,
    };
  }

  private mapOrderToView(rawOrder: {
    id: string;
    orderCode: string;
    eventId: string;
    tierId: string;
    buyerName: string;
    buyerEmail: string;
    buyerWhatsapp: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    serviceFee: number;
    taxAmount: number;
    totalAmount: number;
    paymentMethod: string;
    paymentReference: string | null;
    status: TicketOrderStatus;
    expiresAt: Date | null;
    paidAt: Date | null;
    createdAt: Date;
    event: {
      id: string;
      slug: string;
      title: string;
      eventDate: Date;
      startAt: Date | null;
      venue: string | null;
      locationDetails: string | null;
    };
    tier: {
      id: string;
      name: string;
    };
    issuedTickets: Array<{
      id: string;
      orderId: string;
      eventId: string;
      tierId: string;
      ticketCode: string;
      attendeeName: string;
      attendeeEmail: string;
      status: IssuedTicketStatus;
      checkedInAt: Date | null;
      checkedInBy: string | null;
      checkedInGate: string | null;
      createdAt: Date;
    }>;
  }): TicketOrderView {
    const effectiveStart = rawOrder.event.startAt || rawOrder.event.eventDate;
    const dateLabel = effectiveStart.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const venueName =
      rawOrder.event.venue || rawOrder.event.locationDetails || 'Lokasi acara';

    const tickets: IssuedTicketView[] =
      rawOrder.status === TicketOrderStatus.PAID
        ? rawOrder.issuedTickets.map((t) => {
          const qrPayload = this.signTicketQr(t.id);
          return {
            id: t.id,
            orderId: t.orderId,
            orderCode: rawOrder.orderCode,
            eventId: t.eventId,
            eventSlug: rawOrder.event.slug,
            eventTitle: rawOrder.event.title,
            eventDate: dateLabel,
            eventTime: '19:00 - 22:00 WIB',
            venueName,
            tierId: t.tierId,
            tierName: rawOrder.tier.name,
            ticketCode: t.ticketCode,
            qrPayload,
            holderName: t.attendeeName,
            holderEmail: t.attendeeEmail,
            unitPrice: rawOrder.unitPrice,
            status: t.status,
            checkedInAt: t.checkedInAt ? t.checkedInAt.toISOString() : null,
            checkedInBy: t.checkedInBy,
            checkedInGate: t.checkedInGate,
            createdAt: t.createdAt.toISOString(),
          };
        })
        : [];

    const subtotal =
      rawOrder.subtotal > 0
        ? rawOrder.subtotal
        : rawOrder.unitPrice * rawOrder.quantity;

    return {
      id: rawOrder.id,
      orderCode: rawOrder.orderCode,
      eventId: rawOrder.eventId,
      eventSlug: rawOrder.event.slug,
      eventTitle: rawOrder.event.title,
      tierId: rawOrder.tierId,
      tierName: rawOrder.tier.name,
      buyerName: rawOrder.buyerName,
      buyerEmail: rawOrder.buyerEmail,
      buyerWhatsapp: rawOrder.buyerWhatsapp,
      quantity: rawOrder.quantity,
      unitPrice: rawOrder.unitPrice,
      subtotal,
      subtotalAmount: subtotal,
      serviceFee: rawOrder.serviceFee,
      serviceFeeAmount: rawOrder.serviceFee,
      taxAmount: rawOrder.taxAmount,
      total: rawOrder.totalAmount,
      totalAmount: rawOrder.totalAmount,
      paymentMethod: rawOrder.paymentMethod,
      paymentRef: rawOrder.paymentReference,
      paymentReference: rawOrder.paymentReference,
      status: rawOrder.status,
      expiresAt: rawOrder.expiresAt ? rawOrder.expiresAt.toISOString() : null,
      paidAt: rawOrder.paidAt ? rawOrder.paidAt.toISOString() : null,
      createdAt: rawOrder.createdAt.toISOString(),
      tickets,
    };
  }

  /**
   * Releases expired PENDING orders and restores held quota atomically.
   */
  async expireOverdueOrdersCron(filter?: {
    eventId?: string;
    tierId?: string;
    orderId?: string;
  }): Promise<{ expiredCount: number; releasedTicketsCount: number }> {
    const now = new Date();
    const overdueOrders = await this.prisma.ticketOrder.findMany({
      where: {
        status: TicketOrderStatus.PENDING,
        expiresAt: { lte: now },
        ...(filter?.eventId ? { eventId: filter.eventId } : {}),
        ...(filter?.tierId ? { tierId: filter.tierId } : {}),
        ...(filter?.orderId ? { id: filter.orderId } : {}),
      },
      select: {
        id: true,
        tierId: true,
        quantity: true,
      },
    });

    let expiredCount = 0;
    let releasedTicketsCount = 0;

    for (const ord of overdueOrders) {
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.ticketOrder.updateMany({
          where: {
            id: ord.id,
            status: TicketOrderStatus.PENDING,
          },
          data: {
            status: TicketOrderStatus.EXPIRED,
          },
        });

        if (updated.count === 1) {
          await tx.$executeRaw`
            UPDATE \`ticket_tiers\`
            SET \`sold_count\` = GREATEST(0, \`sold_count\` - ${ord.quantity}),
                \`updated_at\` = NOW(3)
            WHERE \`id\` = ${ord.tierId}
          `;
          expiredCount += 1;
          releasedTicketsCount += ord.quantity;
        }
      });
    }

    return { expiredCount, releasedTicketsCount };
  }

  /**
   * GET /ticketing/events
   * Only PUBLISHED and not-yet-ended events; supports q, category, city, date range, free, and pagination.
   */
  async listPublicEvents(query: ListPublicEventsQueryDto = {}) {
    const now = new Date();
    const searchTerm = (query.q || query.search || '').trim();
    const categoryTerm = (query.category || query.kategori || '').trim();
    const cityTerm = (query.city || query.kota || '').trim();
    const isFreeFilter =
      query.free !== undefined ? query.free : query.gratis;

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 12));

    const andConditions: Prisma.EventWhereInput[] = [
      { ticketStatus: TicketEventStatus.PUBLISHED },
      { status: 'PUBLISHED' },
      { ticketTiers: { some: {} } },
      {
        OR: [
          { endAt: { gte: now } },
          { endAt: null, startAt: { gte: now } },
          { endAt: null, startAt: null, eventDate: { gte: now } },
        ],
      },
    ];

    if (categoryTerm && categoryTerm.toLowerCase() !== 'semua') {
      andConditions.push({
        category: { contains: categoryTerm },
      });
    }

    if (cityTerm && cityTerm.toLowerCase() !== 'semua kota') {
      andConditions.push({
        city: { contains: cityTerm },
      });
    }

    if (searchTerm) {
      andConditions.push({
        OR: [
          { title: { contains: searchTerm } },
          { organizerName: { contains: searchTerm } },
          { venue: { contains: searchTerm } },
          { city: { contains: searchTerm } },
          { locationDetails: { contains: searchTerm } },
        ],
      });
    }

    if (query.dateFrom) {
      const fromDate = new Date(query.dateFrom);
      if (!isNaN(fromDate.getTime())) {
        andConditions.push({
          OR: [
            { startAt: { gte: fromDate } },
            { startAt: null, eventDate: { gte: fromDate } },
          ],
        });
      }
    }

    if (query.dateTo) {
      const toDate = new Date(query.dateTo);
      if (!isNaN(toDate.getTime())) {
        andConditions.push({
          OR: [
            { startAt: { lte: toDate } },
            { startAt: null, eventDate: { lte: toDate } },
          ],
        });
      }
    }

    if (isFreeFilter === true) {
      andConditions.push({
        ticketTiers: {
          some: { price: 0 },
        },
      });
    } else if (isFreeFilter === false) {
      andConditions.push({
        ticketTiers: {
          every: { price: { gt: 0 } },
        },
      });
    }

    const where: Prisma.EventWhereInput = { AND: andConditions };

    const [total, dbEvents] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        include: { ticketTiers: true },
        orderBy: [{ startAt: 'asc' }, { eventDate: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const items = dbEvents.map((ev) => this.mapEventToView(ev));
    const lastPage = Math.max(1, Math.ceil(total / limit));

    return {
      data: items,
      items,
      events: items,
      total,
      page,
      limit,
      lastPage,
      meta: {
        total,
        page,
        limit,
        lastPage,
      },
    };
  }

  /**
   * GET /ticketing/events/:slug
   * Only PUBLISHED and not-yet-ended event.
   */
  async getPublicEventBySlug(slug: string): Promise<TicketingEventView> {
    const now = new Date();
    const rawEvent = await this.prisma.event.findFirst({
      where: {
        slug,
        ticketStatus: TicketEventStatus.PUBLISHED,
        status: 'PUBLISHED',
        ticketTiers: { some: {} },
        OR: [
          { endAt: { gte: now } },
          { endAt: null, startAt: { gte: now } },
          { endAt: null, startAt: null, eventDate: { gte: now } },
        ],
      },
      include: {
        ticketTiers: true,
      },
    });

    if (!rawEvent) {
      throw new NotFoundException(
        `Acara tiket "${slug}" tidak ditemukan atau tidak tersedia.`,
      );
    }

    return this.mapEventToView(rawEvent);
  }

  /**
   * POST /ticketing/checkout
   * Atomic quota reservation inside a single DB transaction.
   * Free events -> immediately PAID + IssuedTickets created.
   * Paid events -> PENDING with expiresAt = now + 15m; IssuedTickets only created after PAID.
   */
  async checkoutTicket(dto: CheckoutTicketDto) {
    const now = new Date();

    const rawEvent = await this.prisma.event.findFirst({
      where: {
        slug: dto.eventSlug,
        ticketStatus: TicketEventStatus.PUBLISHED,
        status: 'PUBLISHED',
        OR: [
          { endAt: { gte: now } },
          { endAt: null, startAt: { gte: now } },
          { endAt: null, startAt: null, eventDate: { gte: now } },
        ],
      },
      include: {
        ticketTiers: true,
      },
    });

    if (!rawEvent) {
      throw new NotFoundException(
        'Acara tidak ditemukan, belum dipublikasikan, atau telah berakhir.',
      );
    }

    const tier = rawEvent.ticketTiers.find((t) => t.id === dto.tierId);
    if (!tier || tier.eventId !== rawEvent.id) {
      throw new BadRequestException(
        'Kategori tiket tidak valid atau bukan milik acara ini.',
      );
    }

    if (tier.salesStartAt && now < tier.salesStartAt) {
      throw new BadRequestException(
        'Penjualan untuk kategori tiket ini belum dibuka.',
      );
    }
    if (tier.salesEndAt && now > tier.salesEndAt) {
      throw new BadRequestException(
        'Penjualan untuk kategori tiket ini telah ditutup.',
      );
    }

    if (dto.quantity < 1 || dto.quantity > tier.maxPerOrder) {
      throw new BadRequestException(
        `Jumlah pembelian tiket harus antara 1 hingga ${tier.maxPerOrder} tiket per pesanan.`,
      );
    }

    // Lazily release any expired PENDING holds on this tier before reserving
    await this.expireOverdueOrdersCron({ tierId: tier.id });

    // Server-side money computation (Int Rupiah)
    const unitPrice = Math.round(tier.price);
    const subtotal = unitPrice * dto.quantity;
    const isFreeOrder = subtotal === 0;
    const serviceFee = isFreeOrder
      ? 0
      : Math.round(rawEvent.serviceFee) * dto.quantity;
    const taxAmount = isFreeOrder
      ? 0
      : rawEvent.taxIncluded
        ? 0
        : Math.round((subtotal * rawEvent.taxRatePercent) / 100);
    const totalAmount = subtotal + serviceFee + taxAmount;

    const orderCode = this.generateSecureCode('ORD');
    const { accessToken, accessTokenHash } = this.generateOrderAccessToken();
    const cleanWhatsapp = normalizeIndonesianWhatsapp(dto.buyerWhatsapp);
    const cleanEmail = dto.buyerEmail.trim().toLowerCase();
    const cleanName = dto.buyerName.trim();
    const paymentMethod = (dto.paymentMethod || (isFreeOrder ? 'FREE' : 'QRIS')).trim();
    const expiresAt = isFreeOrder
      ? null
      : new Date(now.getTime() + ORDER_EXPIRY_MINUTES * 60 * 1000);

    const paymentIntent = isFreeOrder
      ? null
      : await this.paymentService.createPaymentIntent({
        orderCode,
        totalAmount,
        paymentMethod,
        expiresAt: expiresAt!,
      });

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      // Atomic row-level quota reservation: prevents overselling under parallel requests
      const affectedRows = await tx.$executeRaw`
        UPDATE \`ticket_tiers\`
        SET \`sold_count\` = \`sold_count\` + ${dto.quantity},
            \`updated_at\` = NOW(3)
        WHERE \`id\` = ${tier.id}
          AND \`event_id\` = ${rawEvent.id}
          AND (\`sold_count\` + ${dto.quantity}) <= \`quota\`
      `;

      if (Number(affectedRows) === 0) {
        throw new ConflictException(
          'Kuota tiket untuk kategori ini tidak mencukupi.',
        );
      }

      const order = await tx.ticketOrder.create({
        data: {
          eventId: rawEvent.id,
          tierId: tier.id,
          orderCode,
          accessTokenHash,
          buyerName: cleanName,
          buyerEmail: cleanEmail,
          buyerWhatsapp: cleanWhatsapp,
          quantity: dto.quantity,
          unitPrice,
          subtotal,
          serviceFee,
          taxAmount,
          totalAmount,
          paymentMethod,
          paymentReference: paymentIntent?.paymentRef ?? null,
          status: isFreeOrder
            ? TicketOrderStatus.PAID
            : TicketOrderStatus.PENDING,
          expiresAt,
          paidAt: isFreeOrder ? now : null,
        },
      });

      // Rule: IssuedTicket is ONLY created after the order is PAID
      if (isFreeOrder) {
        for (let i = 0; i < dto.quantity; i++) {
          const holderName =
            dto.holderNames?.[i]?.trim() ||
            (dto.quantity === 1
              ? cleanName
              : `${cleanName} (Tiket ${i + 1})`);
          await tx.issuedTicket.create({
            data: {
              orderId: order.id,
              eventId: rawEvent.id,
              tierId: tier.id,
              ticketCode: this.generateSecureCode('TKT'),
              attendeeName: holderName,
              attendeeEmail: cleanEmail,
              status: IssuedTicketStatus.ISSUED,
            },
          });
        }
      }

      const fullOrder = await tx.ticketOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: {
          event: true,
          tier: true,
          issuedTickets: true,
        },
      });

      return fullOrder;
    });

    const orderView = this.mapOrderToView(createdOrder);

    return {
      ...orderView,
      accessToken,
      paymentInstructions: paymentIntent?.instructions ?? null,
      order: orderView,
    };
  }

  /**
   * GET /ticketing/orders/:orderCode (requires accessToken)
   * Performs lazy-expire if PENDING and expiresAt <= now.
   */
  async getPublicOrderByCode(
    orderCode: string,
    accessToken: string | undefined,
  ): Promise<TicketOrderView> {
    if (!accessToken || !accessToken.trim()) {
      throw new UnauthorizedException(
        'Token akses pesanan wajib disertakan untuk melihat detail pesanan.',
      );
    }

    const cleanCode = (orderCode || '').trim().toUpperCase();
    const initialOrder = await this.prisma.ticketOrder.findUnique({
      where: { orderCode: cleanCode },
      select: {
        id: true,
        accessTokenHash: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!initialOrder) {
      throw new NotFoundException('Pesanan tidak ditemukan.');
    }

    if (!initialOrder.accessTokenHash) {
      throw new ForbiddenException('Token akses pesanan tidak valid.');
    }

    const providedHash = hashAccessToken(accessToken);
    const providedBuf = Buffer.from(providedHash, 'utf8');
    const storedBuf = Buffer.from(initialOrder.accessTokenHash, 'utf8');
    if (
      providedBuf.length !== storedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, storedBuf)
    ) {
      throw new ForbiddenException('Token akses pesanan tidak valid.');
    }

    // Lazy-expire if overdue
    if (
      initialOrder.status === TicketOrderStatus.PENDING &&
      initialOrder.expiresAt &&
      initialOrder.expiresAt <= new Date()
    ) {
      await this.expireOverdueOrdersCron({ orderId: initialOrder.id });
    }

    const freshOrder = await this.prisma.ticketOrder.findUniqueOrThrow({
      where: { id: initialOrder.id },
      include: {
        event: true,
        tier: true,
        issuedTickets: true,
      },
    });

    return this.mapOrderToView(freshOrder);
  }

  /**
   * POST /ticketing/webhooks/payment
   * Verifies webhook signature, marks order PAID, and creates IssuedTickets.
   */
  async handlePaymentWebhook(
    dto: PaymentWebhookDto,
    signatureHeader: string | undefined,
  ): Promise<TicketOrderView> {
    const isValidSig = this.paymentService.verifyWebhookSignature(
      {
        orderCode: dto.orderCode,
        transactionStatus: dto.transactionStatus,
        grossAmount: dto.grossAmount,
      },
      signatureHeader,
    );

    if (!isValidSig) {
      throw new UnauthorizedException(
        'Tanda tangan digital webhook pembayaran tidak valid.',
      );
    }

    const cleanCode = dto.orderCode.trim().toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.ticketOrder.findUnique({
        where: { orderCode: cleanCode },
        include: {
          event: true,
          tier: true,
          issuedTickets: true,
        },
      });

      if (!order) {
        throw new NotFoundException(
          `Pesanan "${cleanCode}" tidak ditemukan.`,
        );
      }

      if (order.status === TicketOrderStatus.PAID) {
        return this.mapOrderToView(order);
      }

      if (order.status !== TicketOrderStatus.PENDING) {
        throw new ConflictException(
          `Pesanan dengan status ${order.status} tidak dapat diproses.`,
        );
      }

      const now = new Date();

      // If webhook says EXPIRED or CANCELLED, or order is already past expiresAt
      if (
        dto.transactionStatus === 'EXPIRED' ||
        dto.transactionStatus === 'CANCELLED' ||
        (order.expiresAt && order.expiresAt <= now)
      ) {
        const targetStatus =
          dto.transactionStatus === 'CANCELLED'
            ? TicketOrderStatus.CANCELLED
            : TicketOrderStatus.EXPIRED;

        const updated = await tx.ticketOrder.updateMany({
          where: {
            id: order.id,
            status: TicketOrderStatus.PENDING,
          },
          data: {
            status: targetStatus,
            paymentReference: dto.paymentReference || order.paymentReference,
          },
        });

        if (updated.count === 1) {
          await tx.$executeRaw`
            UPDATE \`ticket_tiers\`
            SET \`sold_count\` = GREATEST(0, \`sold_count\` - ${order.quantity}),
                \`updated_at\` = NOW(3)
            WHERE \`id\` = ${order.tierId}
          `;
        }

        if (
          dto.transactionStatus === 'PAID' ||
          dto.transactionStatus === 'SETTLEMENT'
        ) {
          throw new ConflictException(
            'Pesanan telah melewati batas waktu pembayaran (EXPIRED).',
          );
        }

        const expiredOrder = await tx.ticketOrder.findUniqueOrThrow({
          where: { id: order.id },
          include: { event: true, tier: true, issuedTickets: true },
        });
        return this.mapOrderToView(expiredOrder);
      }

      if (
        dto.grossAmount !== undefined &&
        Math.round(Number(dto.grossAmount)) !== order.totalAmount
      ) {
        throw new BadRequestException(
          'Nominal pembayaran webhook tidak sesuai dengan total tagihan pesanan.',
        );
      }

      // Issue tickets now that payment is confirmed
      for (let i = 0; i < order.quantity; i++) {
        await tx.issuedTicket.create({
          data: {
            orderId: order.id,
            eventId: order.eventId,
            tierId: order.tierId,
            ticketCode: this.generateSecureCode('TKT'),
            attendeeName:
              order.quantity === 1
                ? order.buyerName
                : `${order.buyerName} (Tiket ${i + 1})`,
            attendeeEmail: order.buyerEmail,
            status: IssuedTicketStatus.ISSUED,
          },
        });
      }

      const paidOrder = await tx.ticketOrder.update({
        where: { id: order.id },
        data: {
          status: TicketOrderStatus.PAID,
          paidAt: now,
          paymentReference: dto.paymentReference || order.paymentReference,
        },
        include: {
          event: true,
          tier: true,
          issuedTickets: true,
        },
      });

      return this.mapOrderToView(paidOrder);
    });
  }

  /**
   * Admin: Create a new ticketing event and its tiers.
   */
  async createTicketingEvent(
    dto: CreateTicketingEventDto,
    actorUserId?: string,
  ): Promise<TicketingEventView> {
    let ownerId = actorUserId;
    if (!ownerId) {
      const fallbackUser = await this.prisma.user.findFirst({
        where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN] } },
        select: { id: true },
      });
      if (!fallbackUser) {
        throw new BadRequestException(
          'Akun pengelola tidak ditemukan di basis data.',
        );
      }
      ownerId = fallbackUser.id;
    }

    const venue = (dto.venue || dto.venueName || dto.locationDetails || '').trim();
    const city = (dto.city || 'Jakarta').trim();
    const locationDetails = (
      dto.locationDetails || (venue ? `${venue}, ${city}` : city)
    ).trim();

    if (locationDetails.length < 3) {
      throw new BadRequestException('Lokasi acara wajib diisi.');
    }

    const rawStart = dto.startAt || dto.eventDate;
    const startAt = rawStart
      ? new Date(rawStart)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (isNaN(startAt.getTime())) {
      throw new BadRequestException('Format tanggal mulai acara tidak valid.');
    }

    const endAt = dto.endAt ? new Date(dto.endAt) : null;
    if (endAt && isNaN(endAt.getTime())) {
      throw new BadRequestException('Format tanggal selesai acara tidak valid.');
    }

    const baseSlug = (dto.slug || dto.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = dto.slug
      ? baseSlug
      : `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;

    const ticketStatus: TicketEventStatus =
      dto.ticketStatus || TicketEventStatus.DRAFT;
    const statusStr =
      ticketStatus === TicketEventStatus.PUBLISHED ? 'PUBLISHED' : 'DRAFT';
    const organizerName = (
      dto.organizerName ||
      dto.organizer ||
      'Mitra penyelenggara IRVITE'
    ).trim();
    const category = (dto.category || 'Konser Musik').trim();

    const tiersInput =
      dto.tiers && dto.tiers.length > 0
        ? dto.tiers
        : [
          {
            name: 'Tiket reguler',
            description: 'Tiket masuk reguler dengan kode QR.',
            price: 50000,
            quota: 100,
            maxPerOrder: 10,
            benefits: ['Tiket digital kode QR'],
          },
        ];

    const created = await this.prisma.event.create({
      data: {
        userId: ownerId,
        title: dto.title.trim(),
        slug,
        description:
          dto.description?.trim() ||
          'Acara resmi yang dikelola melalui layanan tiket IRVITE.',
        eventDate: startAt,
        startAt,
        endAt,
        venue: venue || locationDetails,
        city,
        category,
        organizerName,
        bannerUrl: dto.bannerUrl?.trim() || null,
        taxRatePercent: dto.taxRatePercent ?? 0,
        taxIncluded: dto.taxIncluded ?? false,
        serviceFee: dto.serviceFee ?? DEFAULT_PLATFORM_SERVICE_FEE,
        locationDetails,
        status: statusStr,
        ticketStatus,
        ticketTiers: {
          create: tiersInput.map((t, index) => ({
            name: t.name.trim(),
            description:
              t.description?.trim() || 'Tiket masuk resmi dengan kode QR.',
            price: Math.max(0, Math.round(Number(t.price) || 0)),
            quota: Math.max(1, Math.round(Number(t.quota) || 100)),
            soldCount: 0,
            salesStartAt: t.salesStartAt ? new Date(t.salesStartAt) : null,
            salesEndAt: t.salesEndAt ? new Date(t.salesEndAt) : null,
            maxPerOrder: Math.max(1, Math.round(Number(t.maxPerOrder) || 10)),
            sortOrder: t.sortOrder ?? index + 1,
            benefits:
              t.benefits && t.benefits.length > 0
                ? t.benefits
                : ['Tiket digital kode QR'],
          })),
        },
      },
      include: {
        ticketTiers: true,
      },
    });

    return this.mapEventToView(created);
  }

  /**
   * Admin: Update an existing ticketing event.
   */
  async updateTicketingEvent(
    eventId: string,
    dto: UpdateTicketingEventDto,
  ): Promise<TicketingEventView> {
    const existing = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!existing) {
      throw new NotFoundException('Acara tidak ditemukan.');
    }

    const startAt = dto.startAt ? new Date(dto.startAt) : undefined;
    const endAt = dto.endAt ? new Date(dto.endAt) : undefined;
    const ticketStatus = dto.ticketStatus;

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.category !== undefined
          ? { category: dto.category.trim() }
          : {}),
        ...(dto.organizerName !== undefined
          ? { organizerName: dto.organizerName.trim() }
          : {}),
        ...(startAt ? { startAt, eventDate: startAt } : {}),
        ...(endAt ? { endAt } : {}),
        ...(dto.venue !== undefined ? { venue: dto.venue.trim() } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.bannerUrl !== undefined
          ? { bannerUrl: dto.bannerUrl.trim() || null }
          : {}),
        ...(dto.taxRatePercent !== undefined
          ? { taxRatePercent: dto.taxRatePercent }
          : {}),
        ...(dto.taxIncluded !== undefined
          ? { taxIncluded: dto.taxIncluded }
          : {}),
        ...(dto.serviceFee !== undefined ? { serviceFee: dto.serviceFee } : {}),
        ...(ticketStatus !== undefined
          ? {
            ticketStatus,
            status:
              ticketStatus === TicketEventStatus.PUBLISHED
                ? 'PUBLISHED'
                : 'DRAFT',
          }
          : {}),
      },
      include: {
        ticketTiers: true,
      },
    });

    return this.mapEventToView(updated);
  }

  /**
   * Admin: Publish a ticketing event.
   */
  async publishTicketingEvent(eventId: string): Promise<TicketingEventView> {
    return this.updateTicketingEvent(eventId, {
      ticketStatus: 'PUBLISHED',
    });
  }

  /**
   * Admin: Add a tier to an event.
   */
  async createTicketTier(
    eventId: string,
    dto: CreateTicketTierDto,
  ): Promise<TicketTierView> {
    const existing = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!existing) {
      throw new NotFoundException('Acara tidak ditemukan.');
    }

    const tier = await this.prisma.ticketTier.create({
      data: {
        eventId,
        name: dto.name.trim(),
        description:
          dto.description?.trim() || 'Tiket masuk resmi dengan kode QR.',
        price: dto.price,
        quota: dto.quota,
        soldCount: 0,
        salesStartAt: dto.salesStartAt ? new Date(dto.salesStartAt) : null,
        salesEndAt: dto.salesEndAt ? new Date(dto.salesEndAt) : null,
        maxPerOrder: dto.maxPerOrder ?? 10,
        sortOrder: dto.sortOrder ?? 1,
        benefits:
          dto.benefits && dto.benefits.length > 0
            ? dto.benefits
            : ['Tiket digital kode QR'],
      },
    });

    return {
      id: tier.id,
      name: tier.name,
      description: tier.description || 'Tiket masuk resmi dengan kode QR.',
      price: tier.price,
      quota: tier.quota,
      soldCount: tier.soldCount,
      remainingQuota: Math.max(0, tier.quota - tier.soldCount),
      salesStartAt: tier.salesStartAt ? tier.salesStartAt.toISOString() : null,
      salesEndAt: tier.salesEndAt ? tier.salesEndAt.toISOString() : null,
      maxPerOrder: tier.maxPerOrder,
      statusLabel: 'TERSEDIA',
      benefits: Array.isArray(tier.benefits)
        ? tier.benefits.filter((b): b is string => typeof b === 'string')
        : ['Tiket digital kode QR'],
    };
  }

  /**
   * Admin: Update an existing tier.
   */
  async updateTicketTier(
    tierId: string,
    dto: UpdateTicketTierDto,
  ): Promise<TicketTierView> {
    const existing = await this.prisma.ticketTier.findUnique({
      where: { id: tierId },
    });
    if (!existing) {
      throw new NotFoundException('Kategori tiket tidak ditemukan.');
    }

    if (dto.quota !== undefined && dto.quota < existing.soldCount) {
      throw new BadRequestException(
        'Kuota baru tidak boleh lebih kecil dari jumlah tiket yang sudah terjual.',
      );
    }

    const tier = await this.prisma.ticketTier.update({
      where: { id: tierId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.quota !== undefined ? { quota: dto.quota } : {}),
        ...(dto.salesStartAt !== undefined
          ? {
            salesStartAt: dto.salesStartAt
              ? new Date(dto.salesStartAt)
              : null,
          }
          : {}),
        ...(dto.salesEndAt !== undefined
          ? { salesEndAt: dto.salesEndAt ? new Date(dto.salesEndAt) : null }
          : {}),
        ...(dto.maxPerOrder !== undefined
          ? { maxPerOrder: dto.maxPerOrder }
          : {}),
        ...(dto.benefits !== undefined ? { benefits: dto.benefits } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });

    return {
      id: tier.id,
      name: tier.name,
      description: tier.description || 'Tiket masuk resmi dengan kode QR.',
      price: tier.price,
      quota: tier.quota,
      soldCount: tier.soldCount,
      remainingQuota: Math.max(0, tier.quota - tier.soldCount),
      salesStartAt: tier.salesStartAt ? tier.salesStartAt.toISOString() : null,
      salesEndAt: tier.salesEndAt ? tier.salesEndAt.toISOString() : null,
      maxPerOrder: tier.maxPerOrder,
      statusLabel: tier.quota - tier.soldCount <= 0 ? 'HABIS' : 'TERSEDIA',
      benefits: Array.isArray(tier.benefits)
        ? tier.benefits.filter((b): b is string => typeof b === 'string')
        : ['Tiket digital kode QR'],
    };
  }

  /**
   * Admin: List orders for a specific event (with lazy-expire).
   */
  async listOrdersByEvent(
    eventId: string,
    query: ListEventOrdersQueryDto = {},
  ) {
    await this.expireOverdueOrdersCron({ eventId });

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const where: Prisma.TicketOrderWhereInput = {
      eventId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, orders] = await Promise.all([
      this.prisma.ticketOrder.count({ where }),
      this.prisma.ticketOrder.findMany({
        where,
        include: {
          event: true,
          tier: true,
          issuedTickets: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const items = orders.map((o) => this.mapOrderToView(o));

    return {
      data: items,
      items,
      total,
      page,
      limit,
      lastPage: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Admin: Get ticketing dashboard summary (protected by @Roles(SUPER_ADMIN, ADMIN)).
   */
  async getAdminSummary() {
    await this.expireOverdueOrdersCron();

    const [eventsCount, paidOrders, recentOrdersRaw, checkedInTickets] =
      await Promise.all([
        this.prisma.event.count({
          where: { ticketTiers: { some: {} } },
        }),
        this.prisma.ticketOrder.findMany({
          where: { status: TicketOrderStatus.PAID },
          select: {
            quantity: true,
            serviceFee: true,
            totalAmount: true,
          },
        }),
        this.prisma.ticketOrder.findMany({
          include: {
            event: true,
            tier: true,
            issuedTickets: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 25,
        }),
        this.prisma.issuedTicket.count({
          where: { status: IssuedTicketStatus.CHECKED_IN },
        }),
      ]);

    let totalTicketsSold = 0;
    let grossTicketRevenue = 0;
    let platformFeeRevenue = 0;

    for (const ord of paidOrders) {
      totalTicketsSold += ord.quantity;
      grossTicketRevenue += ord.totalAmount;
      platformFeeRevenue += ord.serviceFee;
    }

    return {
      totalPublicEvents: eventsCount,
      totalTicketsSold,
      grossTicketRevenue,
      grossTicketRevenueLabel: formatRupiahLabel(grossTicketRevenue),
      platformFeeRevenue,
      platformFeeRevenueLabel: formatRupiahLabel(platformFeeRevenue),
      checkedInTickets,
      recentOrders: recentOrdersRaw.map((o) => this.mapOrderToView(o)),
    };
  }

  /**
   * Staff / Admin: Verify v1.<ticketId>.<hmac> QR payload and perform gate check-in.
   */
  async checkInTicket(
    dto: CheckInTicketDto | string,
    scannedBy = 'Petugas gerbang',
    defaultGateName = 'Gerbang utama',
  ) {
    const rawPayload =
      typeof dto === 'string'
        ? dto
        : dto.qrPayload || dto.qrToken || dto.ticketCode || '';
    const gateName =
      typeof dto === 'string'
        ? defaultGateName
        : dto.gateName || defaultGateName;

    const verified = this.verifyTicketQr(rawPayload);
    if (!verified.valid || !verified.ticketId) {
      return {
        valid: false,
        status: 'INVALID' as const,
        message:
          'Token QR tiket tidak valid atau tanda tangan keamanan telah dimodifikasi.',
        ticket: null,
      };
    }

    const ticket = await this.prisma.issuedTicket.findUnique({
      where: { id: verified.ticketId },
      include: {
        order: {
          include: {
            event: true,
            tier: true,
            issuedTickets: true,
          },
        },
      },
    });

    if (!ticket) {
      return {
        valid: false,
        status: 'INVALID' as const,
        message: 'Tiket tidak ditemukan di basis data.',
        ticket: null,
      };
    }

    if (ticket.order.status !== TicketOrderStatus.PAID) {
      return {
        valid: false,
        status: 'INVALID' as const,
        message: 'Pesanan tiket ini belum berstatus lunas.',
        ticket: null,
      };
    }

    const orderView = this.mapOrderToView(ticket.order);
    const ticketView =
      orderView.tickets.find((t) => t.id === ticket.id) || null;

    if (ticket.status === IssuedTicketStatus.CHECKED_IN) {
      await this.prisma.ticketCheckInLog.create({
        data: {
          issuedTicketId: ticket.id,
          eventId: ticket.eventId,
          scannedBy,
          gateName,
          result: 'DUPLICATE',
        },
      });
      return {
        valid: false,
        status: 'DUPLICATE' as const,
        message: `Tiket atas nama ${ticket.attendeeName} sudah pernah digunakan masuk.`,
        ticket: ticketView,
      };
    }

    if (ticket.status === IssuedTicketStatus.VOID) {
      await this.prisma.ticketCheckInLog.create({
        data: {
          issuedTicketId: ticket.id,
          eventId: ticket.eventId,
          scannedBy,
          gateName,
          result: 'VOID',
        },
      });
      return {
        valid: false,
        status: 'INVALID' as const,
        message: 'Tiket ini telah dibatalkan (VOID).',
        ticket: ticketView,
      };
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.issuedTicket.update({
        where: { id: ticket.id },
        data: {
          status: IssuedTicketStatus.CHECKED_IN,
          checkedInAt: now,
          checkedInBy: scannedBy,
          checkedInGate: gateName,
        },
      }),
      this.prisma.ticketCheckInLog.create({
        data: {
          issuedTicketId: ticket.id,
          eventId: ticket.eventId,
          scannedBy,
          gateName,
          result: 'VALID',
        },
      }),
    ]);

    return {
      valid: true,
      status: 'VALID' as const,
      message: `Check-in berhasil untuk ${ticket.attendeeName} (${ticket.order.tier.name}).`,
      ticket: ticketView
        ? {
          ...ticketView,
          status: 'CHECKED_IN' as const,
          checkedInAt: now.toISOString(),
          checkedInBy: scannedBy,
          checkedInGate: gateName,
        }
        : null,
    };
  }
}
