import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  EoInquiryStatus,
  IssuedTicketStatus,
  Prisma,
  Role,
  TicketEventStatus,
  TicketFeePayer,
  TicketOrderStatus,
} from 'database';
import { PrismaService } from '../database/prisma.service';
import { PAYMENT_SERVICE } from './payment.service';
import type { PaymentService } from './payment.service';
import { ListPublicEventsQueryDto } from './dto/list-public-events-query.dto';
import {
  CheckoutTicketDto,
  PaymentWebhookDto,
  QuoteTicketOrderDto,
} from './dto/checkout-ticket.dto';
import {
  CheckInTicketDto,
  CreateTicketingEventDto,
  CreateTicketTierDto,
  ListEventOrdersQueryDto,
  SearchEventTicketsQueryDto,
  SyncOfflineTicketCheckInsDto,
  UndoTicketCheckInDto,
  UpdateTicketingEventDto,
  UpdateTicketTierDto,
} from './dto/admin-ticketing.dto';
import {
  CreateEoInquiryDto,
  ListEoInquiriesQueryDto,
  UpdateEoInquiryStatusDto,
} from './dto/eo-inquiry.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import {
  CHECKIN_CLOSE_HOURS_AFTER,
  getCheckInOpenHoursBefore,
  getTicketQrSecret,
  safeCompareSecret,
  sha256Hex,
} from './ticketing-secrets';
import {
  assertPaymentMethodAllowed,
  computeOrderAmounts,
  getAllowedPaymentMethods,
  getDefaultServiceFeeBps,
  getOrderExpiryMinutes,
  resolveEffectiveServiceFeeBps,
  type TicketFeePayerType,
} from './ticketing-pricing';

/** @deprecated Flat serviceFee is deprecated; use serviceFeeBps and computeOrderAmounts */
export const DEFAULT_PLATFORM_SERVICE_FEE = 3000;
export const ORDER_EXPIRY_MINUTES = 30;

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
  statusLabel:
    'TERSEDIA' | 'HAMPIR HABIS' | 'HABIS' | 'BELUM DIBUKA' | 'DITUTUP';
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
  /** @deprecated Flat serviceFee is deprecated */
  serviceFee: number;
  serviceFeeBps: number;
  effectiveServiceFeeBps: number;
  isPromoActive: boolean;
  promoFeeBps: number | null;
  promoEndsAt: string | null;
  feePayer: TicketFeePayerType;
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
  serviceFeeBps: number;
  feePayer: TicketFeePayerType;
  taxAmount: number;
  total: number;
  totalAmount: number;
  organizerNet: number;
  holderNames: string[];
  paymentMethod: string;
  paymentRef: string | null;
  paymentReference: string | null;
  status:
    | 'PENDING'
    | 'PAID'
    | 'EXPIRED'
    | 'CANCELLED'
    | 'REFUNDED'
    | 'REFUND_PENDING';
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
  tickets: IssuedTicketView[];
}

const WIB_TIME_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  hourCycle: 'h23',
});

const WIB_DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatWibClock(date: Date): string {
  const parts = WIB_TIME_FORMATTER.formatToParts(date);
  const rawHour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const rawMinute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const hour = rawHour === '24' ? '00' : rawHour.padStart(2, '0');
  const minute = rawMinute.padStart(2, '0');
  return `${hour}:${minute}`;
}

export function formatWibTimeRange(startAt: Date, endAt?: Date | null): string {
  const startStr = formatWibClock(startAt);
  if (
    !endAt ||
    isNaN(endAt.getTime()) ||
    endAt.getTime() === startAt.getTime()
  ) {
    return `${startStr} WIB`;
  }
  const endStr = formatWibClock(endAt);
  return `${startStr} - ${endStr} WIB`;
}

export function formatWibDateLabel(date: Date): string {
  return WIB_DATE_FORMATTER.format(date);
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
  private readonly logger = new Logger(TicketingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_SERVICE) private readonly paymentService: PaymentService,
  ) {}

  /**
   * Generates a unique cryptographically random code >= 10 characters.
   */
  generateSecureCode(prefix: 'ORD' | 'TKT' | 'INQ'): string {
    const randomHex = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `${prefix}-${randomHex}`;
  }

  formatWibDateLabel(date: Date): string {
    return formatWibDateLabel(date);
  }

  formatWibTimeRange(startAt: Date, endAt?: Date | null): string {
    return formatWibTimeRange(startAt, endAt);
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
    return getTicketQrSecret();
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
   * Produces SHA-256 hex digest of the signed QR payload for offline snapshot matching
   * without exposing the HMAC secret or raw signed QR token on scanner devices.
   */
  computeTicketQrDigest(ticketId: string): string {
    return sha256Hex(this.signTicketQr(ticketId));
  }

  /**
   * Verifies QR payload: v1.<ticketId>.<hmac> using SHA-256 + timingSafeEqual.
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

    if (!safeCompareSecret(providedHmac, expectedHmac)) {
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
    serviceFeeBps?: number;
    feePayer?: TicketFeePayer | TicketFeePayerType;
    promoFeeBps?: number | null;
    promoEndsAt?: Date | null;
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
    const dateLabel = formatWibDateLabel(effectiveStart);
    const eventTime = formatWibTimeRange(effectiveStart, rawEvent.endAt);

    const venueName = (rawEvent.venue || rawEvent.locationDetails || '').trim();
    const city = (rawEvent.city || '').trim();
    const category = (rawEvent.category || '').trim();
    const organizerName = (rawEvent.organizerName || '').trim();

    const serviceFeeBps =
      typeof rawEvent.serviceFeeBps === 'number'
        ? rawEvent.serviceFeeBps
        : getDefaultServiceFeeBps();
    const feePayer: TicketFeePayerType =
      rawEvent.feePayer === 'ORGANIZER' ? 'ORGANIZER' : 'BUYER';
    const promoResolution = resolveEffectiveServiceFeeBps(
      {
        serviceFeeBps,
        promoFeeBps: rawEvent.promoFeeBps ?? null,
        promoEndsAt: rawEvent.promoEndsAt ?? null,
      },
      now,
    );

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
      eventTime,
      venueName,
      city,
      locationDetails:
        rawEvent.locationDetails ||
        [venueName, city].filter(Boolean).join(', '),
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
      serviceFeeBps,
      effectiveServiceFeeBps: promoResolution.effectiveBps,
      isPromoActive: promoResolution.isPromoActive,
      promoFeeBps: rawEvent.promoFeeBps ?? null,
      promoEndsAt: rawEvent.promoEndsAt
        ? rawEvent.promoEndsAt.toISOString()
        : null,
      feePayer,
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
    serviceFeeBps?: number;
    feePayer?: TicketFeePayer | TicketFeePayerType;
    taxAmount: number;
    totalAmount: number;
    paymentMethod: string;
    paymentReference: string | null;
    holderNames?: unknown;
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
      endAt?: Date | null;
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
    const dateLabel = formatWibDateLabel(effectiveStart);
    const eventTime = formatWibTimeRange(effectiveStart, rawOrder.event.endAt);
    const venueName = (
      rawOrder.event.venue ||
      rawOrder.event.locationDetails ||
      ''
    ).trim();

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
              eventTime,
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
    const feePayer: TicketFeePayerType =
      rawOrder.feePayer === 'ORGANIZER' ? 'ORGANIZER' : 'BUYER';
    const serviceFeeBps =
      typeof rawOrder.serviceFeeBps === 'number'
        ? rawOrder.serviceFeeBps
        : subtotal === 0
          ? 0
          : getDefaultServiceFeeBps();
    const organizerNet =
      feePayer === 'ORGANIZER'
        ? Math.max(0, subtotal - rawOrder.serviceFee)
        : subtotal;
    const holderNames = Array.isArray(rawOrder.holderNames)
      ? rawOrder.holderNames.filter((n): n is string => typeof n === 'string')
      : [];

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
      serviceFeeBps,
      feePayer,
      taxAmount: rawOrder.taxAmount,
      total: rawOrder.totalAmount,
      totalAmount: rawOrder.totalAmount,
      organizerNet,
      holderNames,
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
    const isFreeFilter = query.free !== undefined ? query.free : query.gratis;

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
   * POST /ticketing/events/:slug/quote
   * Pure server-side price quote and allowed payment methods without reserving quota or writing to DB.
   */
  async quoteTicketOrder(slug: string, dto: QuoteTicketOrderDto) {
    const now = new Date();
    const rawEvent = await this.prisma.event.findFirst({
      where: {
        slug,
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

    const unitPrice = Math.round(tier.price);
    const subtotal = unitPrice * dto.quantity;
    const feePayer: TicketFeePayerType =
      rawEvent.feePayer === 'ORGANIZER' ? 'ORGANIZER' : 'BUYER';
    const promoResolution = resolveEffectiveServiceFeeBps(rawEvent, now);
    const amounts = computeOrderAmounts(
      subtotal,
      promoResolution.effectiveBps,
      feePayer,
      rawEvent.taxRatePercent,
      rawEvent.taxIncluded,
    );
    const allowedPaymentMethods = getAllowedPaymentMethods(amounts.totalAmount);

    return {
      eventSlug: rawEvent.slug,
      tierId: tier.id,
      tierName: tier.name,
      unitPrice,
      quantity: dto.quantity,
      subtotal: amounts.subtotal,
      serviceFee: amounts.serviceFee,
      serviceFeeBps: amounts.serviceFeeBps,
      isPromoActive: promoResolution.isPromoActive,
      feePayer: amounts.feePayer,
      taxRatePercent: amounts.taxRatePercent,
      taxIncluded: amounts.taxIncluded,
      taxAmount: amounts.taxAmount,
      total: amounts.total,
      totalAmount: amounts.totalAmount,
      organizerNet: amounts.organizerNet,
      allowedPaymentMethods,
    };
  }

  /**
   * POST /ticketing/checkout
   * Atomic quota reservation inside a single DB transaction.
   * Free events -> immediately PAID + IssuedTickets created.
   * Paid events -> PENDING with expiresAt = now + ORDER_EXPIRY_MINUTES; IssuedTickets only created after PAID.
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

    // Server-side money computation (Int Rupiah) via shared pure computeOrderAmounts
    const unitPrice = Math.round(tier.price);
    const rawSubtotal = unitPrice * dto.quantity;
    const feePayer: TicketFeePayerType =
      rawEvent.feePayer === 'ORGANIZER' ? 'ORGANIZER' : 'BUYER';
    const promoResolution = resolveEffectiveServiceFeeBps(rawEvent, now);
    const amounts = computeOrderAmounts(
      rawSubtotal,
      promoResolution.effectiveBps,
      feePayer,
      rawEvent.taxRatePercent,
      rawEvent.taxIncluded,
    );
    const { subtotal, serviceFee, serviceFeeBps, taxAmount, totalAmount } =
      amounts;
    const isFreeOrder = totalAmount === 0;

    const requestedPaymentMethod =
      dto.paymentMethod && dto.paymentMethod.trim()
        ? dto.paymentMethod.trim()
        : isFreeOrder
          ? 'FREE'
          : 'QRIS';
    const paymentMethod = assertPaymentMethodAllowed(
      requestedPaymentMethod,
      totalAmount,
    );

    const orderCode = this.generateSecureCode('ORD');
    const { accessToken, accessTokenHash } = this.generateOrderAccessToken();
    const cleanWhatsapp = normalizeIndonesianWhatsapp(dto.buyerWhatsapp);
    const cleanEmail = dto.buyerEmail.trim().toLowerCase();
    const cleanName = dto.buyerName.trim();
    const holderNamesList = Array.from({ length: dto.quantity }, (_, i) => {
      const provided = dto.holderNames?.[i]?.trim();
      if (provided) return provided;
      return dto.quantity === 1 ? cleanName : `${cleanName} (Tiket ${i + 1})`;
    });
    const expiryMinutes = getOrderExpiryMinutes();
    const expiresAt = isFreeOrder
      ? null
      : new Date(now.getTime() + expiryMinutes * 60 * 1000);

    // Step 1: In a single DB transaction, atomically reserve quota and create PENDING (or PAID if free) order.
    // Never create a payment intent before the order exists in the database.
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
          serviceFeeBps,
          feePayer,
          taxAmount,
          totalAmount,
          paymentMethod,
          paymentReference: null,
          holderNames: holderNamesList,
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
          await tx.issuedTicket.create({
            data: {
              orderId: order.id,
              sequenceNumber: i + 1,
              eventId: rawEvent.id,
              tierId: tier.id,
              ticketCode: this.generateSecureCode('TKT'),
              attendeeName: holderNamesList[i],
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

    if (isFreeOrder) {
      const orderView = this.mapOrderToView(createdOrder);
      return {
        ...orderView,
        accessToken,
        paymentInstructions: null,
        order: orderView,
      };
    }

    // Step 2: AFTER the order creation transaction commits, create payment intent and store paymentReference.
    // If intent creation fails: mark order CANCELLED, release reserved quota, and respond 503 honestly.
    let paymentIntent: Awaited<
      ReturnType<PaymentService['createPaymentIntent']>
    >;
    try {
      paymentIntent = await this.paymentService.createPaymentIntent({
        orderCode,
        totalAmount,
        paymentMethod,
        expiresAt: expiresAt!,
      });
    } catch (error) {
      await this.prisma.$transaction(async (tx) => {
        const cancelled = await tx.ticketOrder.updateMany({
          where: {
            id: createdOrder.id,
            status: TicketOrderStatus.PENDING,
          },
          data: {
            status: TicketOrderStatus.CANCELLED,
          },
        });

        if (cancelled.count === 1) {
          await tx.$executeRaw`
            UPDATE \`ticket_tiers\`
            SET \`sold_count\` = GREATEST(0, \`sold_count\` - ${createdOrder.quantity}),
                \`updated_at\` = NOW(3)
            WHERE \`id\` = ${createdOrder.tierId}
          `;
        }
      });

      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        'Pembayaran belum tersedia. Pesanan dibatalkan dan kuota telah dikembalikan.',
      );
    }

    const updatedOrder = await this.prisma.ticketOrder.update({
      where: { id: createdOrder.id },
      data: {
        paymentReference: paymentIntent.paymentRef,
      },
      include: {
        event: true,
        tier: true,
        issuedTickets: true,
      },
    });

    const orderView = this.mapOrderToView(updatedOrder);

    return {
      ...orderView,
      accessToken,
      paymentInstructions: paymentIntent.instructions,
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
  ): Promise<
    TicketOrderView & {
      order: TicketOrderView;
      primaryTicket: IssuedTicketView | null;
    }
  > {
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
    if (!safeCompareSecret(providedHash, initialOrder.accessTokenHash)) {
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

    const view = this.mapOrderToView(freshOrder);
    return {
      ...view,
      order: view,
      primaryTicket: view.tickets[0] ?? null,
    };
  }

  private sanitizeJsonValue(
    value: unknown,
    depth = 0,
  ): Prisma.InputJsonValue | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'string' || typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (depth >= 4) {
      return '[TRUNCATED]';
    }
    if (Array.isArray(value)) {
      return value
        .slice(0, 50)
        .map((item) => this.sanitizeJsonValue(item, depth + 1));
    }
    if (typeof value === 'object') {
      const sanitizedObj: Record<string, Prisma.InputJsonValue | null> = {};
      for (const [key, entryVal] of Object.entries(
        value as Record<string, unknown>,
      )) {
        if (
          /secret|token|signature|password|authorization|credential|api[_-]?key|private[_-]?key/i.test(
            key,
          )
        ) {
          continue;
        }
        sanitizedObj[key] = this.sanitizeJsonValue(entryVal, depth + 1);
      }
      return sanitizedObj;
    }
    return null;
  }

  private sanitizeWebhookPayload(
    rawInput: unknown,
  ): Record<string, Prisma.InputJsonValue | null> {
    if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput)) {
      return { rawType: typeof rawInput };
    }
    const cleaned = this.sanitizeJsonValue(rawInput, 0);
    if (cleaned && typeof cleaned === 'object' && !Array.isArray(cleaned)) {
      return cleaned as Record<string, Prisma.InputJsonValue | null>;
    }
    return {};
  }

  private async recordPaymentEvent(params: {
    orderCode: string;
    provider: string;
    providerEventId?: string | null;
    rawStatus: string;
    grossAmount?: number | null;
    signatureValid: boolean;
    outcome: string;
    payload: Record<string, Prisma.InputJsonValue | null>;
  }): Promise<void> {
    // Only claim the UNIQUE provider_event_id column when signatureValid === true
    // so unauthenticated callers cannot poison legitimate providerEventIds.
    const persistedProviderEventId =
      params.signatureValid && params.providerEventId
        ? params.providerEventId
        : null;
    const finalPayload: Record<string, Prisma.InputJsonValue | null> =
      !params.signatureValid && params.providerEventId
        ? {
            ...params.payload,
            unverifiedProviderEventId: params.providerEventId,
          }
        : params.payload;

    try {
      await this.prisma.paymentEvent.create({
        data: {
          orderCode: params.orderCode,
          provider: params.provider,
          providerEventId: persistedProviderEventId,
          rawStatus: params.rawStatus,
          grossAmount:
            typeof params.grossAmount === 'number' &&
            Number.isFinite(params.grossAmount)
              ? Math.round(params.grossAmount)
              : null,
          signatureValid: params.signatureValid,
          outcome: params.outcome,
          payload: finalPayload,
        },
      });
    } catch (err: unknown) {
      // If providerEventId is duplicate (P2002), retry logging without providerEventId so every call is audited
      const code = (err as { code?: string })?.code;
      if (code === 'P2002' && persistedProviderEventId) {
        await this.prisma.paymentEvent.create({
          data: {
            orderCode: params.orderCode,
            provider: params.provider,
            providerEventId: null,
            rawStatus: params.rawStatus,
            grossAmount:
              typeof params.grossAmount === 'number' &&
              Number.isFinite(params.grossAmount)
                ? Math.round(params.grossAmount)
                : null,
            signatureValid: params.signatureValid,
            outcome: params.outcome,
            payload: {
              ...finalPayload,
              duplicateProviderEventId: persistedProviderEventId,
            },
          },
        });
        return;
      }
      this.logger.error(
        `Failed to record payment_events for orderCode=${params.orderCode}: ${(err as Error)?.message ?? 'unknown error'}`,
      );
    }
  }

  private resolveOrderHolderNames(order: {
    holderNames?: unknown;
    quantity: number;
    buyerName: string;
  }): string[] {
    const storedHolders = Array.isArray(order.holderNames)
      ? order.holderNames
          .filter((n): n is string => typeof n === 'string')
          .map((n) => n.trim())
          .filter(Boolean)
      : [];
    return Array.from({ length: order.quantity }, (_, i) => {
      return (
        storedHolders[i] ||
        (order.quantity === 1
          ? order.buyerName
          : `${order.buyerName} (Tiket ${i + 1})`)
      );
    });
  }

  /**
   * POST /ticketing/webhooks/payment
   * Verifies webhook signature, logs every webhook to payment_events, normalizes status,
   * validates grossAmount, and performs idempotent/atomic state transitions.
   */
  async handlePaymentWebhook(
    dto: PaymentWebhookDto,
    signatureHeader: string | undefined,
  ): Promise<TicketOrderView> {
    const rawBody =
      dto && typeof dto === 'object'
        ? (dto as unknown as Record<string, unknown>)
        : {};
    const rawOrderCode =
      typeof rawBody.orderCode === 'string' ? rawBody.orderCode : '';
    const rawTransactionStatus =
      typeof rawBody.transactionStatus === 'string'
        ? rawBody.transactionStatus
        : '';
    const rawProvider =
      typeof rawBody.provider === 'string' ? rawBody.provider : '';
    const rawProviderEventId =
      typeof rawBody.providerEventId === 'string'
        ? rawBody.providerEventId
        : '';
    const rawPaymentReference =
      typeof rawBody.paymentReference === 'string' &&
      rawBody.paymentReference.trim()
        ? rawBody.paymentReference.trim().slice(0, 120)
        : undefined;
    const parsedGrossAmount =
      typeof rawBody.grossAmount === 'number'
        ? rawBody.grossAmount
        : typeof rawBody.grossAmount === 'string' &&
            rawBody.grossAmount.trim() !== ''
          ? Number(rawBody.grossAmount)
          : undefined;

    const cleanCode = rawOrderCode.trim().toUpperCase().slice(0, 64);
    const rawStatus = rawTransactionStatus.trim().toUpperCase().slice(0, 40);
    const provider = (rawProvider.trim().toLowerCase() || 'default').slice(
      0,
      40,
    );
    const providerEventId = rawProviderEventId.trim().slice(0, 191) || null;
    const sanitizedPayload = this.sanitizeWebhookPayload(rawBody);

    if (!cleanCode || !rawStatus) {
      await this.recordPaymentEvent({
        orderCode: cleanCode || 'UNKNOWN',
        provider,
        providerEventId,
        rawStatus: rawStatus || 'UNKNOWN',
        grossAmount:
          typeof parsedGrossAmount === 'number' &&
          Number.isFinite(parsedGrossAmount)
            ? parsedGrossAmount
            : null,
        signatureValid: false,
        outcome: 'REJECTED_INVALID_PAYLOAD',
        payload: sanitizedPayload,
      });
      throw new BadRequestException(
        'Payload webhook wajib menyertakan orderCode dan transactionStatus.',
      );
    }

    const isValidSig = this.paymentService.verifyWebhookSignature(
      {
        orderCode: rawOrderCode,
        transactionStatus: rawTransactionStatus,
        grossAmount: parsedGrossAmount,
        provider: rawProvider || undefined,
      },
      signatureHeader,
    );

    if (!isValidSig) {
      await this.recordPaymentEvent({
        orderCode: cleanCode || 'UNKNOWN',
        provider,
        providerEventId,
        rawStatus: rawStatus || 'UNKNOWN',
        grossAmount:
          typeof parsedGrossAmount === 'number' &&
          Number.isFinite(parsedGrossAmount)
            ? parsedGrossAmount
            : null,
        signatureValid: false,
        outcome: 'REJECTED_INVALID_SIGNATURE',
        payload: sanitizedPayload,
      });
      throw new UnauthorizedException(
        'Tanda tangan digital webhook pembayaran tidak valid.',
      );
    }

    const existingOrder = await this.prisma.ticketOrder.findUnique({
      where: { orderCode: cleanCode },
      include: {
        event: true,
        tier: true,
        issuedTickets: true,
      },
    });

    if (!existingOrder) {
      await this.recordPaymentEvent({
        orderCode: cleanCode || 'UNKNOWN',
        provider,
        providerEventId,
        rawStatus: rawStatus || 'UNKNOWN',
        grossAmount:
          typeof parsedGrossAmount === 'number' &&
          Number.isFinite(parsedGrossAmount)
            ? parsedGrossAmount
            : null,
        signatureValid: true,
        outcome: 'REJECTED_ORDER_NOT_FOUND',
        payload: sanitizedPayload,
      });
      throw new NotFoundException('Pesanan tidak ditemukan.');
    }

    // Mandatory grossAmount validation: must be present, non-negative integer, and match order.totalAmount
    const grossAmountInt =
      typeof parsedGrossAmount === 'number' &&
      Number.isFinite(parsedGrossAmount) &&
      Number.isInteger(parsedGrossAmount) &&
      parsedGrossAmount >= 0
        ? parsedGrossAmount
        : NaN;
    if (
      !Number.isFinite(grossAmountInt) ||
      grossAmountInt !== existingOrder.totalAmount
    ) {
      this.logger.warn(
        `Webhook grossAmount mismatch for order ${cleanCode}: expected=${existingOrder.totalAmount}, received=${String(rawBody.grossAmount)}`,
      );
      await this.recordPaymentEvent({
        orderCode: cleanCode,
        provider,
        providerEventId,
        rawStatus: rawStatus || 'UNKNOWN',
        grossAmount:
          typeof parsedGrossAmount === 'number' &&
          Number.isFinite(parsedGrossAmount)
            ? Math.round(parsedGrossAmount)
            : null,
        signatureValid: true,
        outcome: 'REJECTED_AMOUNT_MISMATCH',
        payload: sanitizedPayload,
      });
      throw new BadRequestException(
        'Nominal pembayaran webhook wajib diisi dan harus sesuai dengan total tagihan pesanan.',
      );
    }

    // Explicit replay detection using UNIQUE provider_event_id
    if (providerEventId) {
      const priorEvent = await this.prisma.paymentEvent.findUnique({
        where: { providerEventId },
        select: { id: true },
      });
      if (priorEvent) {
        await this.recordPaymentEvent({
          orderCode: cleanCode,
          provider,
          providerEventId: null,
          rawStatus,
          grossAmount: grossAmountInt,
          signatureValid: true,
          outcome: 'REPLAY_IGNORED',
          payload: {
            ...sanitizedPayload,
            replayedProviderEventId: providerEventId,
          },
        });
        return this.mapOrderToView(existingOrder);
      }
    }

    // Status normalization
    const isSuccessStatus =
      rawStatus === 'PAID' ||
      rawStatus === 'SETTLEMENT' ||
      rawStatus === 'CAPTURE';
    const isReleaseStatus =
      rawStatus === 'EXPIRED' ||
      rawStatus === 'CANCELLED' ||
      rawStatus === 'FAILED';

    // Non-final statuses (e.g. PENDING, AUTHORIZE, CHALLENGE) are no-ops and return 200
    if (!isSuccessStatus && !isReleaseStatus) {
      await this.recordPaymentEvent({
        orderCode: cleanCode,
        provider,
        providerEventId,
        rawStatus,
        grossAmount: grossAmountInt,
        signatureValid: true,
        outcome: 'IGNORED_NON_FINAL_STATUS',
        payload: sanitizedPayload,
      });
      return this.mapOrderToView(existingOrder);
    }

    // Release statuses: EXPIRED, CANCELLED, FAILED release quota at most once from PENDING
    if (isReleaseStatus) {
      const targetStatus =
        rawStatus === 'EXPIRED'
          ? TicketOrderStatus.EXPIRED
          : TicketOrderStatus.CANCELLED;

      const { updatedOrder, outcome } = await this.prisma.$transaction(
        async (tx) => {
          const updated = await tx.ticketOrder.updateMany({
            where: {
              id: existingOrder.id,
              status: TicketOrderStatus.PENDING,
            },
            data: {
              status: targetStatus,
              paymentReference:
                rawPaymentReference || existingOrder.paymentReference,
            },
          });

          if (updated.count === 1) {
            await tx.$executeRaw`
              UPDATE \`ticket_tiers\`
              SET \`sold_count\` = GREATEST(0, \`sold_count\` - ${existingOrder.quantity}),
                  \`updated_at\` = NOW(3)
              WHERE \`id\` = ${existingOrder.tierId}
            `;
          }

          const fresh = await tx.ticketOrder.findUniqueOrThrow({
            where: { id: existingOrder.id },
            include: { event: true, tier: true, issuedTickets: true },
          });

          return {
            updatedOrder: fresh,
            outcome: updated.count === 1 ? 'QUOTA_RELEASED' : 'IDEMPOTENT_NOOP',
          };
        },
      );

      await this.recordPaymentEvent({
        orderCode: cleanCode,
        provider,
        providerEventId,
        rawStatus,
        grossAmount: grossAmountInt,
        signatureValid: true,
        outcome,
        payload: sanitizedPayload,
      });

      return this.mapOrderToView(updatedOrder);
    }

    // Success statuses: PAID, SETTLEMENT, CAPTURE
    // Fast-path idempotent check for terminal statuses: PAID, REFUND_PENDING, REFUNDED
    if (
      existingOrder.status === TicketOrderStatus.PAID ||
      existingOrder.status === TicketOrderStatus.REFUND_PENDING ||
      existingOrder.status === TicketOrderStatus.REFUNDED
    ) {
      await this.recordPaymentEvent({
        orderCode: cleanCode,
        provider,
        providerEventId,
        rawStatus,
        grossAmount: grossAmountInt,
        signatureValid: true,
        outcome: 'IDEMPOTENT_NOOP',
        payload: sanitizedPayload,
      });
      return this.mapOrderToView(existingOrder);
    }

    const now = new Date();
    const nextPaymentRef =
      rawPaymentReference || existingOrder.paymentReference;
    const holderNames = this.resolveOrderHolderNames(existingOrder);

    const { finalOrder, outcome } = await this.prisma.$transaction(
      async (tx) => {
        // 1. Try atomic transition from PENDING -> PAID.
        // Note: A PENDING order whose expiresAt has passed but has NOT been swept by cron
        // still holds its reserved quota. It MUST transition directly to PAID without releasing/re-reserving quota.
        const claimedPending = await tx.ticketOrder.updateMany({
          where: {
            id: existingOrder.id,
            status: TicketOrderStatus.PENDING,
          },
          data: {
            status: TicketOrderStatus.PAID,
            paidAt: now,
            paymentReference: nextPaymentRef,
          },
        });

        if (claimedPending.count === 1) {
          for (let i = 0; i < existingOrder.quantity; i++) {
            await tx.issuedTicket.create({
              data: {
                orderId: existingOrder.id,
                sequenceNumber: i + 1,
                eventId: existingOrder.eventId,
                tierId: existingOrder.tierId,
                ticketCode: this.generateSecureCode('TKT'),
                attendeeName: holderNames[i],
                attendeeEmail: existingOrder.buyerEmail,
                status: IssuedTicketStatus.ISSUED,
              },
            });
          }

          const paidOrder = await tx.ticketOrder.findUniqueOrThrow({
            where: { id: existingOrder.id },
            include: { event: true, tier: true, issuedTickets: true },
          });
          return { finalOrder: paidOrder, outcome: 'PAID_ISSUED' };
        }

        // 2. If count === 0, re-read current order status.
        const reread = await tx.ticketOrder.findUniqueOrThrow({
          where: { id: existingOrder.id },
          include: { event: true, tier: true, issuedTickets: true },
        });

        if (
          reread.status === TicketOrderStatus.PAID ||
          reread.status === TicketOrderStatus.REFUND_PENDING ||
          reread.status === TicketOrderStatus.REFUNDED
        ) {
          return { finalOrder: reread, outcome: 'IDEMPOTENT_NOOP' };
        }

        // 3. Late payment flow for orders already in EXPIRED or CANCELLED status:
        // Claim transition from EXPIRED/CANCELLED -> REFUND_PENDING atomically so parallel webhooks cannot double-reserve.
        const claimedLate = await tx.ticketOrder.updateMany({
          where: {
            id: existingOrder.id,
            status: {
              in: [TicketOrderStatus.EXPIRED, TicketOrderStatus.CANCELLED],
            },
          },
          data: {
            status: TicketOrderStatus.REFUND_PENDING,
            paymentReference: nextPaymentRef,
          },
        });

        if (claimedLate.count === 0) {
          const afterRace = await tx.ticketOrder.findUniqueOrThrow({
            where: { id: existingOrder.id },
            include: { event: true, tier: true, issuedTickets: true },
          });
          return { finalOrder: afterRace, outcome: 'IDEMPOTENT_NOOP' };
        }

        // Try to re-reserve quota atomically
        const reservedRows = await tx.$executeRaw`
          UPDATE \`ticket_tiers\`
          SET \`sold_count\` = \`sold_count\` + ${existingOrder.quantity},
              \`updated_at\` = NOW(3)
          WHERE \`id\` = ${existingOrder.tierId}
            AND \`event_id\` = ${existingOrder.eventId}
            AND (\`sold_count\` + ${existingOrder.quantity}) <= \`quota\`
        `;

        if (Number(reservedRows) === 1) {
          for (let i = 0; i < existingOrder.quantity; i++) {
            await tx.issuedTicket.create({
              data: {
                orderId: existingOrder.id,
                sequenceNumber: i + 1,
                eventId: existingOrder.eventId,
                tierId: existingOrder.tierId,
                ticketCode: this.generateSecureCode('TKT'),
                attendeeName: holderNames[i],
                attendeeEmail: existingOrder.buyerEmail,
                status: IssuedTicketStatus.ISSUED,
              },
            });
          }

          const recoveredOrder = await tx.ticketOrder.update({
            where: { id: existingOrder.id },
            data: {
              status: TicketOrderStatus.PAID,
              paidAt: now,
              paymentReference: nextPaymentRef,
            },
            include: { event: true, tier: true, issuedTickets: true },
          });

          return { finalOrder: recoveredOrder, outcome: 'LATE_PAID_ISSUED' };
        }

        // Quota exhausted: keep status as REFUND_PENDING and DO NOT throw inside transaction!
        const refundPendingOrder = await tx.ticketOrder.findUniqueOrThrow({
          where: { id: existingOrder.id },
          include: { event: true, tier: true, issuedTickets: true },
        });

        return {
          finalOrder: refundPendingOrder,
          outcome: 'LATE_PAID_REFUND_PENDING',
        };
      },
    );

    await this.recordPaymentEvent({
      orderCode: cleanCode,
      provider,
      providerEventId,
      rawStatus,
      grossAmount: grossAmountInt,
      signatureValid: true,
      outcome,
      payload: sanitizedPayload,
    });

    return this.mapOrderToView(finalOrder);
  }

  private parseEventStartAndEnd(params: {
    startAt?: string;
    endAt?: string;
    eventDate?: string;
    eventTime?: string;
  }): { startAt: Date; endAt: Date | null } {
    let startAt: Date | null = null;
    let endAt: Date | null = null;

    if (params.startAt && params.startAt.trim()) {
      startAt = new Date(params.startAt.trim());
    } else if (params.eventDate && params.eventDate.trim()) {
      const cleanDate = params.eventDate.trim();
      const timeMatch = (params.eventTime || '').match(
        /(\d{1,2})[:.](\d{2})(?:\s*-\s*(\d{1,2})[:.](\d{2}))?/,
      );
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate) && timeMatch) {
        const sh = timeMatch[1].padStart(2, '0');
        const sm = timeMatch[2].padStart(2, '0');
        startAt = new Date(`${cleanDate}T${sh}:${sm}:00+07:00`);
        if (timeMatch[3] && timeMatch[4] && !params.endAt) {
          const eh = timeMatch[3].padStart(2, '0');
          const em = timeMatch[4].padStart(2, '0');
          endAt = new Date(`${cleanDate}T${eh}:${em}:00+07:00`);
        }
      } else {
        startAt = new Date(cleanDate);
      }
    }

    if (!startAt) {
      throw new BadRequestException(
        'Tanggal mulai acara (startAt) wajib diisi.',
      );
    }
    if (isNaN(startAt.getTime())) {
      throw new BadRequestException('Format tanggal mulai acara tidak valid.');
    }

    if (params.endAt && params.endAt.trim()) {
      endAt = new Date(params.endAt.trim());
    }
    if (endAt) {
      if (isNaN(endAt.getTime())) {
        throw new BadRequestException(
          'Format tanggal selesai acara tidak valid.',
        );
      }
      if (endAt.getTime() <= startAt.getTime()) {
        throw new BadRequestException(
          'Waktu selesai acara (endAt) harus setelah waktu mulai acara (startAt).',
        );
      }
    }

    return { startAt, endAt };
  }

  private validateAndNormalizeTierInput(tier: {
    name?: string;
    description?: string;
    price?: number;
    quota?: number;
    maxPerOrder?: number;
    salesStartAt?: string | null;
    salesEndAt?: string | null;
    sortOrder?: number;
    benefits?: string[];
  }) {
    const name = (tier?.name || '').trim();
    if (!name) {
      throw new BadRequestException('Nama kategori tiket (tier) wajib diisi.');
    }

    const price = Number(tier.price);
    if (!Number.isFinite(price) || !Number.isInteger(price) || price < 0) {
      throw new BadRequestException(
        'Harga kategori tiket (price) harus bilangan bulat minimal 0.',
      );
    }

    const quota = Number(tier.quota);
    if (!Number.isFinite(quota) || !Number.isInteger(quota) || quota < 1) {
      throw new BadRequestException(
        'Kuota kategori tiket (quota) harus bilangan bulat minimal 1.',
      );
    }

    const maxPerOrder =
      tier.maxPerOrder !== undefined && tier.maxPerOrder !== null
        ? Number(tier.maxPerOrder)
        : 10;
    if (
      !Number.isFinite(maxPerOrder) ||
      !Number.isInteger(maxPerOrder) ||
      maxPerOrder < 1 ||
      maxPerOrder > 50
    ) {
      throw new BadRequestException(
        'Batas maksimal pembelian per pesanan (maxPerOrder) harus antara 1 hingga 50.',
      );
    }

    const salesStartAt = tier.salesStartAt ? new Date(tier.salesStartAt) : null;
    if (salesStartAt && isNaN(salesStartAt.getTime())) {
      throw new BadRequestException(
        'Format waktu mulai penjualan tier (salesStartAt) tidak valid.',
      );
    }

    const salesEndAt = tier.salesEndAt ? new Date(tier.salesEndAt) : null;
    if (salesEndAt && isNaN(salesEndAt.getTime())) {
      throw new BadRequestException(
        'Format waktu akhir penjualan tier (salesEndAt) tidak valid.',
      );
    }

    if (
      salesStartAt &&
      salesEndAt &&
      salesEndAt.getTime() <= salesStartAt.getTime()
    ) {
      throw new BadRequestException(
        'Waktu penutupan penjualan tier (salesEndAt) harus setelah waktu pembukaan (salesStartAt).',
      );
    }

    return {
      name,
      description:
        tier.description?.trim() || 'Tiket masuk resmi dengan kode QR.',
      price,
      quota,
      maxPerOrder,
      salesStartAt,
      salesEndAt,
      sortOrder: tier.sortOrder,
      benefits:
        Array.isArray(tier.benefits) && tier.benefits.length > 0
          ? tier.benefits
          : ['Tiket digital kode QR'],
    };
  }

  /**
   * Admin: Create a new ticketing event and its tiers.
   * Rejects (400) if title, organizerName, city, startAt (in the future), venue/location, or >= 1 tier is missing.
   */
  async createTicketingEvent(
    dto: CreateTicketingEventDto,
    actorUserId?: string,
  ): Promise<TicketingEventView> {
    const title = (dto?.title || '').trim();
    if (title.length < 3) {
      throw new BadRequestException(
        'Judul acara wajib diisi (minimal 3 karakter).',
      );
    }

    const organizerName = (dto?.organizerName || dto?.organizer || '').trim();
    if (organizerName.length < 2) {
      throw new BadRequestException(
        'Nama penyelenggara acara (organizerName) wajib diisi.',
      );
    }

    const city = (dto?.city || '').trim();
    if (city.length < 2) {
      throw new BadRequestException('Kota acara (city) wajib diisi.');
    }

    const venue = (
      dto?.venue ||
      dto?.venueName ||
      dto?.locationDetails ||
      ''
    ).trim();
    if (venue.length < 2) {
      throw new BadRequestException('Lokasi acara (venue) wajib diisi.');
    }

    const locationDetails = (dto.locationDetails || `${venue}, ${city}`).trim();

    const { startAt, endAt } = this.parseEventStartAndEnd({
      startAt: dto.startAt,
      endAt: dto.endAt,
      eventDate: dto.eventDate,
      eventTime: dto.eventTime,
    });

    if (startAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Tanggal mulai acara (startAt) harus berada di masa depan.',
      );
    }

    if (!Array.isArray(dto.tiers) || dto.tiers.length < 1) {
      throw new BadRequestException(
        'Minimal satu kategori tiket (tier) wajib diisi.',
      );
    }

    const normalizedTiers = dto.tiers.map((t, index) => {
      const validTier = this.validateAndNormalizeTierInput(t);
      return {
        ...validTier,
        sortOrder: validTier.sortOrder ?? index + 1,
      };
    });

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

    const baseSlug = (dto.slug || title)
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
    const category = (dto.category || 'Lainnya').trim();

    const created = await this.prisma.event.create({
      data: {
        userId: ownerId,
        title,
        slug,
        description:
          dto.description?.trim() ||
          'Acara resmi yang dikelola melalui layanan tiket IRVITE.',
        eventDate: startAt,
        startAt,
        endAt,
        venue,
        city,
        category,
        organizerName,
        bannerUrl: dto.bannerUrl?.trim() || null,
        taxRatePercent: dto.taxRatePercent ?? 0,
        taxIncluded: dto.taxIncluded ?? false,
        serviceFee: dto.serviceFee ?? DEFAULT_PLATFORM_SERVICE_FEE,
        serviceFeeBps: dto.serviceFeeBps ?? getDefaultServiceFeeBps(),
        feePayer: dto.feePayer ?? 'BUYER',
        promoFeeBps: dto.promoFeeBps ?? null,
        promoEndsAt: dto.promoEndsAt ? new Date(dto.promoEndsAt) : null,
        locationDetails,
        status: statusStr,
        ticketStatus,
        ticketTiers: {
          create: normalizedTiers.map((t) => ({
            name: t.name,
            description: t.description,
            price: t.price,
            quota: t.quota,
            soldCount: 0,
            salesStartAt: t.salesStartAt,
            salesEndAt: t.salesEndAt,
            maxPerOrder: t.maxPerOrder,
            sortOrder: t.sortOrder,
            benefits: t.benefits,
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

    let startAt: Date | undefined;
    let endAt: Date | null | undefined;
    if (
      dto.startAt !== undefined ||
      dto.eventDate !== undefined ||
      dto.eventTime !== undefined
    ) {
      const parsed = this.parseEventStartAndEnd({
        startAt: dto.startAt,
        endAt: dto.endAt,
        eventDate:
          dto.eventDate ??
          (existing.startAt || existing.eventDate).toISOString().slice(0, 10),
        eventTime: dto.eventTime,
      });
      startAt = parsed.startAt;
      if (parsed.endAt) {
        endAt = parsed.endAt;
      }
    } else if (dto.endAt !== undefined) {
      endAt = dto.endAt ? new Date(dto.endAt) : null;
      const effectiveStart = existing.startAt || existing.eventDate;
      if (endAt && endAt.getTime() <= effectiveStart.getTime()) {
        throw new BadRequestException(
          'Waktu selesai acara (endAt) harus setelah waktu mulai acara (startAt).',
        );
      }
    }

    const ticketStatus = dto.ticketStatus;
    const nextVenue =
      dto.venue !== undefined
        ? dto.venue.trim()
        : dto.venueName !== undefined
          ? dto.venueName.trim()
          : undefined;

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
        ...(endAt !== undefined ? { endAt } : {}),
        ...(nextVenue !== undefined ? { venue: nextVenue } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
        ...(dto.locationDetails !== undefined
          ? { locationDetails: dto.locationDetails.trim() }
          : {}),
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
        ...(dto.serviceFeeBps !== undefined
          ? { serviceFeeBps: dto.serviceFeeBps }
          : {}),
        ...(dto.feePayer !== undefined ? { feePayer: dto.feePayer } : {}),
        ...(dto.promoFeeBps !== undefined
          ? { promoFeeBps: dto.promoFeeBps }
          : {}),
        ...(dto.promoEndsAt !== undefined
          ? {
              promoEndsAt: dto.promoEndsAt ? new Date(dto.promoEndsAt) : null,
            }
          : {}),
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

    const validTier = this.validateAndNormalizeTierInput(dto);

    const tier = await this.prisma.ticketTier.create({
      data: {
        eventId,
        name: validTier.name,
        description: validTier.description,
        price: validTier.price,
        quota: validTier.quota,
        soldCount: 0,
        salesStartAt: validTier.salesStartAt,
        salesEndAt: validTier.salesEndAt,
        maxPerOrder: validTier.maxPerOrder,
        sortOrder: validTier.sortOrder ?? 1,
        benefits: validTier.benefits,
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

    const nextSalesStart =
      dto.salesStartAt !== undefined
        ? dto.salesStartAt
          ? new Date(dto.salesStartAt)
          : null
        : existing.salesStartAt;
    const nextSalesEnd =
      dto.salesEndAt !== undefined
        ? dto.salesEndAt
          ? new Date(dto.salesEndAt)
          : null
        : existing.salesEndAt;
    if (
      nextSalesStart &&
      nextSalesEnd &&
      nextSalesEnd.getTime() <= nextSalesStart.getTime()
    ) {
      throw new BadRequestException(
        'Waktu penutupan penjualan tier (salesEndAt) harus setelah waktu pembukaan (salesStartAt).',
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

  private toScannerTicketSummary(ticket: {
    id: string;
    ticketCode: string;
    attendeeName: string;
    tierId: string;
    status: IssuedTicketStatus;
    checkedInAt: Date | null;
    checkedInGate: string | null;
    tier: { name: string };
  }) {
    // Privacy rule: scanner & manual search responses NEVER include buyer/attendee email or WhatsApp.
    return {
      ticketId: ticket.id,
      ticketCode: ticket.ticketCode,
      attendeeName: ticket.attendeeName,
      holderName: ticket.attendeeName,
      tierId: ticket.tierId,
      tierName: ticket.tier.name,
      status: ticket.status,
      checkedInAt: ticket.checkedInAt ? ticket.checkedInAt.toISOString() : null,
      checkedInGate: ticket.checkedInGate ?? null,
    };
  }

  private async authorizeScannerEventAccess(
    eventId: string,
    actor?: AuthenticatedUser,
  ) {
    const cleanEventId = (eventId || '').trim();
    if (!cleanEventId) {
      throw new BadRequestException('ID acara (eventId) wajib diisi.');
    }

    const event = await this.prisma.event.findUnique({
      where: { id: cleanEventId },
      include: {
        ticketTiers: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Acara tidak ditemukan.');
    }

    if (actor) {
      if (actor.role === Role.STAFF) {
        const assignment = await this.prisma.staffEvent.findUnique({
          where: {
            eventId_userId: {
              eventId: cleanEventId,
              userId: actor.id,
            },
          },
        });
        if (!assignment) {
          throw new ForbiddenException(
            'Petugas tidak ditugaskan pada acara ini.',
          );
        }
      } else if (actor.role === Role.ADMIN) {
        if (event.userId !== actor.id) {
          throw new ForbiddenException(
            'Admin tidak memiliki akses ke acara milik penyelenggara lain.',
          );
        }
      } else if (actor.role !== Role.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Peran pengguna tidak memiliki akses ke pemindai acara ini.',
        );
      }
    }

    return event;
  }

  private isWithinCheckInWindow(
    event: {
      ticketStatus: TicketEventStatus;
      eventDate: Date;
      startAt: Date | null;
      endAt: Date | null;
    },
    referenceTime: Date,
  ): boolean {
    if (event.ticketStatus !== TicketEventStatus.PUBLISHED) {
      return false;
    }
    const openHoursBefore = getCheckInOpenHoursBefore();
    const effectiveStart = event.startAt || event.eventDate;
    const effectiveEnd = event.endAt || effectiveStart;
    const windowStart = new Date(
      effectiveStart.getTime() - openHoursBefore * 3600_000,
    );
    const windowEnd = new Date(
      effectiveEnd.getTime() + CHECKIN_CLOSE_HOURS_AFTER * 3600_000,
    );
    return referenceTime >= windowStart && referenceTime <= windowEnd;
  }

  private async logCheckInAttempt(params: {
    issuedTicketId: string | null;
    eventId: string;
    actorUserId?: string | null;
    scannedBy: string;
    gateName: string;
    result:
      | 'VALID'
      | 'DUPLICATE'
      | 'VOID'
      | 'WRONG_EVENT'
      | 'NOT_PAID'
      | 'OUTSIDE_WINDOW'
      | 'INVALID'
      | 'UNDO';
    reason?: string | null;
    syncOpId?: string | null;
    scannedAt?: Date;
  }): Promise<void> {
    await this.prisma.ticketCheckInLog.create({
      data: {
        issuedTicketId: params.issuedTicketId,
        eventId: params.eventId,
        actorUserId: params.actorUserId ?? null,
        scannedBy: params.scannedBy,
        gateName: params.gateName,
        result: params.result,
        reason: params.reason ?? null,
        syncOpId: params.syncOpId ?? null,
        ...(params.scannedAt ? { scannedAt: params.scannedAt } : {}),
      },
    });
  }

  private async resolveScannedTicket(params: {
    eventId: string;
    qrPayload?: string;
    qrDigest?: string;
    ticketId?: string;
    ticketCode?: string;
  }) {
    if (params.qrPayload && params.qrPayload.trim()) {
      const verified = this.verifyTicketQr(params.qrPayload.trim());
      if (!verified.valid || !verified.ticketId) {
        return { kind: 'INVALID_QR' as const, ticket: null };
      }
      const ticket = await this.prisma.issuedTicket.findUnique({
        where: { id: verified.ticketId },
        include: {
          tier: true,
          order: { select: { status: true } },
        },
      });
      if (!ticket) {
        return { kind: 'NOT_FOUND' as const, ticket: null };
      }
      return { kind: 'FOUND' as const, ticket };
    }

    if (params.qrDigest && params.qrDigest.trim()) {
      const providedDigest = params.qrDigest.trim().toLowerCase();
      if (params.ticketId && params.ticketId.trim()) {
        const candidate = await this.prisma.issuedTicket.findUnique({
          where: { id: params.ticketId.trim() },
          include: {
            tier: true,
            order: { select: { status: true } },
          },
        });
        if (
          candidate &&
          safeCompareSecret(
            providedDigest,
            this.computeTicketQrDigest(candidate.id),
          )
        ) {
          return { kind: 'FOUND' as const, ticket: candidate };
        }
        return { kind: 'INVALID_QR' as const, ticket: null };
      }

      const eventTickets = await this.prisma.issuedTicket.findMany({
        where: { eventId: params.eventId },
        include: {
          tier: true,
          order: { select: { status: true } },
        },
      });
      const matched = eventTickets.find((t) =>
        safeCompareSecret(providedDigest, this.computeTicketQrDigest(t.id)),
      );
      if (!matched) {
        return { kind: 'INVALID_QR' as const, ticket: null };
      }
      return { kind: 'FOUND' as const, ticket: matched };
    }

    if (params.ticketCode && params.ticketCode.trim()) {
      const cleanTicketCode = params.ticketCode.trim().toUpperCase();
      const ticket = await this.prisma.issuedTicket.findUnique({
        where: { ticketCode: cleanTicketCode },
        include: {
          tier: true,
          order: { select: { status: true } },
        },
      });
      if (!ticket) {
        return { kind: 'NOT_FOUND' as const, ticket: null };
      }
      return { kind: 'FOUND' as const, ticket };
    }

    return { kind: 'MISSING_IDENTIFIER' as const, ticket: null };
  }

  /**
   * Staff / Admin: Atomic ticket check-in scoped to a single eventId with staff_events check,
   * PUBLISHED + check-in window check, atomic updateMany(status: ISSUED -> CHECKED_IN),
   * full audit logging to ticket_check_in_logs, and zero buyer PII leakage.
   */
  async checkInTicket(
    dto: CheckInTicketDto,
    actorOrScannedBy:
      AuthenticatedUser | string | undefined = 'Petugas gerbang',
    defaultGateName = 'Gerbang utama',
  ) {
    if (!dto || !dto.eventId || !dto.eventId.trim()) {
      throw new BadRequestException('ID acara (eventId) wajib diisi.');
    }

    const actor =
      typeof actorOrScannedBy === 'object' && actorOrScannedBy !== null
        ? actorOrScannedBy
        : undefined;
    const scannedBy =
      typeof actorOrScannedBy === 'string'
        ? actorOrScannedBy
        : actor?.email || 'Petugas gerbang';
    const actorUserId = actor?.id ?? null;
    const gateName = (dto.gateName || defaultGateName || 'Gerbang utama')
      .trim()
      .slice(0, 80);

    const event = await this.authorizeScannerEventAccess(dto.eventId, actor);

    const rawQr = dto.qrPayload || dto.qrToken;
    const resolved = await this.resolveScannedTicket({
      eventId: event.id,
      qrPayload: rawQr,
      qrDigest: dto.qrDigest,
      ticketCode: !rawQr && !dto.qrDigest ? dto.ticketCode : undefined,
    });

    if (resolved.kind === 'MISSING_IDENTIFIER') {
      throw new BadRequestException(
        'Wajib menyertakan qrPayload, qrDigest, atau ticketCode untuk check-in.',
      );
    }

    if (!resolved.ticket) {
      await this.logCheckInAttempt({
        issuedTicketId: null,
        eventId: event.id,
        actorUserId,
        scannedBy,
        gateName,
        result: 'INVALID',
      });
      return {
        valid: false,
        status: 'INVALID' as const,
        message:
          resolved.kind === 'INVALID_QR'
            ? 'Token QR tiket tidak valid atau tanda tangan keamanan telah dimodifikasi.'
            : 'Tiket tidak ditemukan di basis data.',
        ticket: null,
      };
    }

    const ticket = resolved.ticket;

    // 1. Reject ticket from a different event (WRONG_EVENT)
    if (ticket.eventId !== event.id) {
      await this.logCheckInAttempt({
        issuedTicketId: ticket.id,
        eventId: event.id,
        actorUserId,
        scannedBy,
        gateName,
        result: 'WRONG_EVENT',
      });
      return {
        valid: false,
        status: 'WRONG_EVENT' as const,
        message: 'Tiket ini terdaftar untuk acara lain.',
        ticket: null,
      };
    }

    // 2. Reject ticket whose order is not PAID (NOT_PAID)
    if (ticket.order.status !== TicketOrderStatus.PAID) {
      await this.logCheckInAttempt({
        issuedTicketId: ticket.id,
        eventId: event.id,
        actorUserId,
        scannedBy,
        gateName,
        result: 'NOT_PAID',
      });
      return {
        valid: false,
        status: 'NOT_PAID' as const,
        message: 'Pesanan tiket ini belum berstatus lunas.',
        ticket: this.toScannerTicketSummary(ticket),
      };
    }

    // 3. Enforce PUBLISHED status and check-in time window [startAt - CHECKIN_OPEN_HOURS_BEFORE, endAt + 6h]
    const now = new Date();
    if (!this.isWithinCheckInWindow(event, now)) {
      await this.logCheckInAttempt({
        issuedTicketId: ticket.id,
        eventId: event.id,
        actorUserId,
        scannedBy,
        gateName,
        result: 'OUTSIDE_WINDOW',
      });
      return {
        valid: false,
        status: 'OUTSIDE_WINDOW' as const,
        message:
          'Check-in belum dibuka, sudah ditutup, atau acara belum berstatus PUBLISHED.',
        ticket: this.toScannerTicketSummary(ticket),
      };
    }

    // 4. Atomic transition ISSUED -> CHECKED_IN via updateMany inside a transaction
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.issuedTicket.updateMany({
        where: {
          id: ticket.id,
          eventId: event.id,
          status: IssuedTicketStatus.ISSUED,
        },
        data: {
          status: IssuedTicketStatus.CHECKED_IN,
          checkedInAt: now,
          checkedInBy: scannedBy,
          checkedInGate: gateName,
        },
      });

      if (updated.count === 1) {
        await tx.ticketCheckInLog.create({
          data: {
            issuedTicketId: ticket.id,
            eventId: event.id,
            actorUserId,
            scannedBy,
            gateName,
            result: 'VALID',
            scannedAt: now,
          },
        });

        return {
          valid: true,
          status: 'VALID' as const,
          message: `Check-in berhasil untuk ${ticket.attendeeName} (${ticket.tier.name}).`,
          ticket: this.toScannerTicketSummary({
            ...ticket,
            status: IssuedTicketStatus.CHECKED_IN,
            checkedInAt: now,
            checkedInGate: gateName,
          }),
        };
      }

      // count === 0: re-read ticket to distinguish DUPLICATE vs VOID
      const fresh = await tx.issuedTicket.findUniqueOrThrow({
        where: { id: ticket.id },
        include: { tier: true },
      });

      const failStatus =
        fresh.status === IssuedTicketStatus.VOID
          ? ('VOID' as const)
          : ('DUPLICATE' as const);

      await tx.ticketCheckInLog.create({
        data: {
          issuedTicketId: ticket.id,
          eventId: event.id,
          actorUserId,
          scannedBy,
          gateName,
          result: failStatus,
          scannedAt: now,
        },
      });

      return {
        valid: false,
        status: failStatus,
        message:
          failStatus === 'VOID'
            ? 'Tiket ini telah dibatalkan (VOID).'
            : `Tiket atas nama ${fresh.attendeeName} sudah pernah digunakan masuk.`,
        ticket: this.toScannerTicketSummary(fresh),
      };
    });
  }

  /**
   * POST /ticketing/check-in/undo (ADMIN / SUPER_ADMIN only)
   * Reverts CHECKED_IN -> ISSUED with mandatory reason and actor logging, allowed only while event is not ENDED.
   */
  async undoTicketCheckIn(
    dto: UndoTicketCheckInDto,
    actor: AuthenticatedUser | undefined,
  ) {
    if (!actor?.id) {
      throw new UnauthorizedException('Autentikasi admin diperlukan.');
    }
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Hanya ADMIN atau SUPER_ADMIN yang dapat membatalkan check-in.',
      );
    }

    const reason = (dto.reason || '').trim();
    if (reason.length < 3) {
      throw new BadRequestException(
        'Alasan pembatalan check-in wajib diisi (minimal 3 karakter).',
      );
    }

    const event = await this.authorizeScannerEventAccess(dto.eventId, actor);
    const now = new Date();
    if (
      event.ticketStatus === TicketEventStatus.ENDED ||
      (event.endAt && now > event.endAt)
    ) {
      throw new ConflictException(
        'Undo check-in tidak diizinkan karena acara telah berakhir (ENDED).',
      );
    }

    const ticket = dto.ticketId?.trim()
      ? await this.prisma.issuedTicket.findFirst({
          where: { id: dto.ticketId.trim(), eventId: event.id },
          include: { tier: true },
        })
      : dto.ticketCode?.trim()
        ? await this.prisma.issuedTicket.findFirst({
            where: {
              ticketCode: dto.ticketCode.trim().toUpperCase(),
              eventId: event.id,
            },
            include: { tier: true },
          })
        : null;

    if (!ticket) {
      throw new NotFoundException(
        'Tiket tidak ditemukan pada acara yang dipilih.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const reverted = await tx.issuedTicket.updateMany({
        where: {
          id: ticket.id,
          eventId: event.id,
          status: IssuedTicketStatus.CHECKED_IN,
        },
        data: {
          status: IssuedTicketStatus.ISSUED,
          checkedInAt: null,
          checkedInBy: null,
          checkedInGate: null,
        },
      });

      if (reverted.count === 0) {
        throw new ConflictException('Tiket tidak sedang berstatus CHECKED_IN.');
      }

      await tx.ticketCheckInLog.create({
        data: {
          issuedTicketId: ticket.id,
          eventId: event.id,
          actorUserId: actor.id,
          scannedBy: actor.email,
          gateName: ticket.checkedInGate || 'Gerbang utama',
          result: 'UNDO',
          reason,
          scannedAt: now,
        },
      });

      const fresh = await tx.issuedTicket.findUniqueOrThrow({
        where: { id: ticket.id },
        include: { tier: true },
      });

      return {
        undone: true,
        status: 'ISSUED' as const,
        actorUserId: actor.id,
        reason,
        ticket: this.toScannerTicketSummary(fresh),
      };
    });
  }

  /**
   * GET /ticketing/events/:eventId/offline-snapshot
   * Returns valid tickets for offline scanning with qrDigest = SHA-256(signedQr),
   * WITHOUT exposing HMAC secrets, raw signed QR payloads, buyer email, or buyer WhatsApp.
   * Restricted to ADMIN/SUPER_ADMIN or STAFF assigned to this event.
   */
  async getEventOfflineSnapshot(
    eventId: string,
    actor: AuthenticatedUser | undefined,
  ) {
    if (!actor?.id) {
      throw new UnauthorizedException('Autentikasi diperlukan.');
    }

    const event = await this.authorizeScannerEventAccess(eventId, actor);

    const tickets = await this.prisma.issuedTicket.findMany({
      where: {
        eventId: event.id,
        status: {
          in: [IssuedTicketStatus.ISSUED, IssuedTicketStatus.CHECKED_IN],
        },
        order: {
          status: TicketOrderStatus.PAID,
        },
      },
      include: {
        tier: {
          select: { name: true },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const snapshotItems = tickets.map((t) => ({
      ticketId: t.id,
      ticketCode: t.ticketCode,
      attendeeName: t.attendeeName,
      tierName: t.tier.name,
      status: t.status,
      qrDigest: this.computeTicketQrDigest(t.id),
    }));

    return {
      eventId: event.id,
      eventTitle: event.title,
      snapshotAt: new Date().toISOString(),
      totalTickets: snapshotItems.length,
      tickets: snapshotItems,
    };
  }

  /**
   * POST /ticketing/events/:eventId/offline-sync
   * Synchronizes offline ticket scans idempotently using OfflineSyncOp + TicketCheckInLog.syncOpId
   * inside the same DB transaction so retries never create duplicate check-ins or logs.
   */
  async syncOfflineTicketCheckIns(
    eventId: string,
    dto: SyncOfflineTicketCheckInsDto,
    actor: AuthenticatedUser | undefined,
  ) {
    if (!actor?.id) {
      throw new UnauthorizedException('Autentikasi diperlukan.');
    }

    const event = await this.authorizeScannerEventAccess(eventId, actor);
    const results: Array<{
      opId: string;
      status: 'APPLIED' | 'DUPLICATE' | 'REJECTED';
      checkInResult: string;
      message: string;
      ticket: ReturnType<TicketingService['toScannerTicketSummary']> | null;
    }> = [];

    for (const op of dto.operations || []) {
      const cleanOpId = (op.opId || '').trim();
      if (!cleanOpId) {
        continue;
      }

      const [existingSyncOp, existingSyncLog] = await Promise.all([
        this.prisma.offlineSyncOp.findUnique({ where: { id: cleanOpId } }),
        this.prisma.ticketCheckInLog.findUnique({
          where: { syncOpId: cleanOpId },
        }),
      ]);

      if (existingSyncOp || existingSyncLog) {
        results.push({
          opId: cleanOpId,
          status: 'DUPLICATE',
          checkInResult: 'ALREADY_SYNCED',
          message:
            'Operasi scan offline sudah pernah disinkronkan (idempoten).',
          ticket: null,
        });
        continue;
      }

      const scanTime = op.scannedAt ? new Date(op.scannedAt) : new Date();
      const effectiveScanTime = isNaN(scanTime.getTime())
        ? new Date()
        : scanTime;
      const gateName = (op.gateName || 'Gerbang utama').trim().slice(0, 80);

      // Compute qrDigest if client sent raw qrPayload scanned from camera
      const effectiveQrDigest =
        op.qrDigest?.trim() ||
        (op.qrPayload?.trim() ? sha256Hex(op.qrPayload.trim()) : undefined);

      const resolved = await this.resolveScannedTicket({
        eventId: event.id,
        qrDigest: effectiveQrDigest,
        ticketId: op.ticketId,
        ticketCode: !effectiveQrDigest ? op.ticketCode : undefined,
      });

      const opOutcome = await this.prisma.$transaction(async (tx) => {
        // Double-check idempotency inside transaction
        const raceSyncOp = await tx.offlineSyncOp.findUnique({
          where: { id: cleanOpId },
        });
        if (raceSyncOp) {
          return {
            opId: cleanOpId,
            status: 'DUPLICATE' as const,
            checkInResult: 'ALREADY_SYNCED',
            message:
              'Operasi scan offline sudah pernah disinkronkan (idempoten).',
            ticket: null,
          };
        }

        if (!resolved.ticket) {
          await tx.offlineSyncOp.create({
            data: {
              id: cleanOpId,
              eventId: event.id,
              opType: 'TICKET_CHECK_IN',
              status: 'REJECTED',
              deviceId: dto.deviceId || null,
              scannedById: actor.id,
              clientTimestamp: effectiveScanTime,
              details: JSON.stringify({ result: 'INVALID' }),
            },
          });
          await tx.ticketCheckInLog.create({
            data: {
              issuedTicketId: null,
              eventId: event.id,
              actorUserId: actor.id,
              scannedBy: actor.email,
              gateName,
              result: 'INVALID',
              syncOpId: cleanOpId,
              scannedAt: effectiveScanTime,
            },
          });
          return {
            opId: cleanOpId,
            status: 'REJECTED' as const,
            checkInResult: 'INVALID',
            message: 'Tiket atau digest QR tidak valid.',
            ticket: null,
          };
        }

        const ticket = resolved.ticket;

        if (ticket.eventId !== event.id) {
          await tx.offlineSyncOp.create({
            data: {
              id: cleanOpId,
              eventId: event.id,
              opType: 'TICKET_CHECK_IN',
              status: 'REJECTED',
              deviceId: dto.deviceId || null,
              scannedById: actor.id,
              clientTimestamp: effectiveScanTime,
              details: JSON.stringify({ result: 'WRONG_EVENT' }),
            },
          });
          await tx.ticketCheckInLog.create({
            data: {
              issuedTicketId: ticket.id,
              eventId: event.id,
              actorUserId: actor.id,
              scannedBy: actor.email,
              gateName,
              result: 'WRONG_EVENT',
              syncOpId: cleanOpId,
              scannedAt: effectiveScanTime,
            },
          });
          return {
            opId: cleanOpId,
            status: 'REJECTED' as const,
            checkInResult: 'WRONG_EVENT',
            message: 'Tiket milik acara lain.',
            ticket: null,
          };
        }

        if (ticket.order.status !== TicketOrderStatus.PAID) {
          await tx.offlineSyncOp.create({
            data: {
              id: cleanOpId,
              eventId: event.id,
              opType: 'TICKET_CHECK_IN',
              status: 'REJECTED',
              deviceId: dto.deviceId || null,
              scannedById: actor.id,
              clientTimestamp: effectiveScanTime,
              details: JSON.stringify({ result: 'NOT_PAID' }),
            },
          });
          await tx.ticketCheckInLog.create({
            data: {
              issuedTicketId: ticket.id,
              eventId: event.id,
              actorUserId: actor.id,
              scannedBy: actor.email,
              gateName,
              result: 'NOT_PAID',
              syncOpId: cleanOpId,
              scannedAt: effectiveScanTime,
            },
          });
          return {
            opId: cleanOpId,
            status: 'REJECTED' as const,
            checkInResult: 'NOT_PAID',
            message: 'Pesanan tiket belum lunas.',
            ticket: this.toScannerTicketSummary(ticket),
          };
        }

        if (!this.isWithinCheckInWindow(event, effectiveScanTime)) {
          await tx.offlineSyncOp.create({
            data: {
              id: cleanOpId,
              eventId: event.id,
              opType: 'TICKET_CHECK_IN',
              status: 'REJECTED',
              deviceId: dto.deviceId || null,
              scannedById: actor.id,
              clientTimestamp: effectiveScanTime,
              details: JSON.stringify({ result: 'OUTSIDE_WINDOW' }),
            },
          });
          await tx.ticketCheckInLog.create({
            data: {
              issuedTicketId: ticket.id,
              eventId: event.id,
              actorUserId: actor.id,
              scannedBy: actor.email,
              gateName,
              result: 'OUTSIDE_WINDOW',
              syncOpId: cleanOpId,
              scannedAt: effectiveScanTime,
            },
          });
          return {
            opId: cleanOpId,
            status: 'REJECTED' as const,
            checkInResult: 'OUTSIDE_WINDOW',
            message: 'Scan berada di luar jendela waktu check-in acara.',
            ticket: this.toScannerTicketSummary(ticket),
          };
        }

        const updated = await tx.issuedTicket.updateMany({
          where: {
            id: ticket.id,
            eventId: event.id,
            status: IssuedTicketStatus.ISSUED,
          },
          data: {
            status: IssuedTicketStatus.CHECKED_IN,
            checkedInAt: effectiveScanTime,
            checkedInBy: actor.email,
            checkedInGate: gateName,
          },
        });

        if (updated.count === 1) {
          await tx.offlineSyncOp.create({
            data: {
              id: cleanOpId,
              eventId: event.id,
              opType: 'TICKET_CHECK_IN',
              status: 'APPLIED',
              deviceId: dto.deviceId || null,
              scannedById: actor.id,
              clientTimestamp: effectiveScanTime,
              details: JSON.stringify({ ticketId: ticket.id, result: 'VALID' }),
            },
          });
          await tx.ticketCheckInLog.create({
            data: {
              issuedTicketId: ticket.id,
              eventId: event.id,
              actorUserId: actor.id,
              scannedBy: actor.email,
              gateName,
              result: 'VALID',
              syncOpId: cleanOpId,
              scannedAt: effectiveScanTime,
            },
          });

          return {
            opId: cleanOpId,
            status: 'APPLIED' as const,
            checkInResult: 'VALID',
            message: `Check-in offline disinkronkan untuk ${ticket.attendeeName}.`,
            ticket: this.toScannerTicketSummary({
              ...ticket,
              status: IssuedTicketStatus.CHECKED_IN,
              checkedInAt: effectiveScanTime,
              checkedInGate: gateName,
            }),
          };
        }

        const fresh = await tx.issuedTicket.findUniqueOrThrow({
          where: { id: ticket.id },
          include: { tier: true },
        });
        const conflictResult =
          fresh.status === IssuedTicketStatus.VOID ? 'VOID' : 'DUPLICATE';

        await tx.offlineSyncOp.create({
          data: {
            id: cleanOpId,
            eventId: event.id,
            opType: 'TICKET_CHECK_IN',
            status: 'REJECTED',
            deviceId: dto.deviceId || null,
            scannedById: actor.id,
            clientTimestamp: effectiveScanTime,
            details: JSON.stringify({
              ticketId: ticket.id,
              result: conflictResult,
            }),
          },
        });
        await tx.ticketCheckInLog.create({
          data: {
            issuedTicketId: ticket.id,
            eventId: event.id,
            actorUserId: actor.id,
            scannedBy: actor.email,
            gateName,
            result: conflictResult,
            syncOpId: cleanOpId,
            scannedAt: effectiveScanTime,
          },
        });

        return {
          opId: cleanOpId,
          status: 'REJECTED' as const,
          checkInResult: conflictResult,
          message:
            conflictResult === 'VOID'
              ? 'Tiket telah dibatalkan (VOID).'
              : 'Tiket sudah pernah check-in sebelumnya.',
          ticket: this.toScannerTicketSummary(fresh),
        };
      });

      results.push(opOutcome);
    }

    return {
      eventId: event.id,
      syncedCount: results.filter((r) => r.status === 'APPLIED').length,
      duplicateCount: results.filter((r) => r.status === 'DUPLICATE').length,
      rejectedCount: results.filter((r) => r.status === 'REJECTED').length,
      results,
    };
  }

  /**
   * GET /ticketing/events/:eventId/checkin-stats
   * Check-in counts per event, per tier, and per gate.
   */
  async getEventCheckInStats(
    eventId: string,
    actor: AuthenticatedUser | undefined,
  ) {
    if (!actor?.id) {
      throw new UnauthorizedException('Autentikasi diperlukan.');
    }

    const event = await this.authorizeScannerEventAccess(eventId, actor);

    const tickets = await this.prisma.issuedTicket.findMany({
      where: {
        eventId: event.id,
        order: { status: TicketOrderStatus.PAID },
      },
      select: {
        tierId: true,
        status: true,
        checkedInGate: true,
      },
    });

    let totalIssued = 0;
    let checkedInCount = 0;
    let voidCount = 0;

    const tierStatsMap = new Map<
      string,
      {
        tierId: string;
        tierName: string;
        totalIssued: number;
        checkedInCount: number;
        remainingCount: number;
      }
    >();

    for (const tier of event.ticketTiers) {
      tierStatsMap.set(tier.id, {
        tierId: tier.id,
        tierName: tier.name,
        totalIssued: 0,
        checkedInCount: 0,
        remainingCount: 0,
      });
    }

    const gateCounts = new Map<string, number>();

    for (const t of tickets) {
      if (t.status === IssuedTicketStatus.VOID) {
        voidCount += 1;
        continue;
      }

      totalIssued += 1;
      const tierEntry = tierStatsMap.get(t.tierId);
      if (tierEntry) {
        tierEntry.totalIssued += 1;
      }

      if (t.status === IssuedTicketStatus.CHECKED_IN) {
        checkedInCount += 1;
        if (tierEntry) {
          tierEntry.checkedInCount += 1;
        }
        const gateKey = (t.checkedInGate || 'Gerbang utama').trim();
        gateCounts.set(gateKey, (gateCounts.get(gateKey) || 0) + 1);
      }
    }

    const byTier = Array.from(tierStatsMap.values()).map((entry) => ({
      ...entry,
      remainingCount: Math.max(0, entry.totalIssued - entry.checkedInCount),
    }));

    const byGate = Array.from(gateCounts.entries())
      .map(([gateName, count]) => ({
        gateName,
        checkedInCount: count,
      }))
      .sort((a, b) => b.checkedInCount - a.checkedInCount);

    return {
      eventId: event.id,
      eventTitle: event.title,
      totalIssued,
      checkedInCount,
      remainingCount: Math.max(0, totalIssued - checkedInCount),
      voidCount,
      byTier,
      byGate,
    };
  }

  /**
   * GET /ticketing/events/:eventId/tickets/search?q=...
   * Manual backup search by attendeeName or ticketCode without exposing email or WhatsApp.
   */
  async searchEventTicketsManual(
    eventId: string,
    query: SearchEventTicketsQueryDto,
    actor: AuthenticatedUser | undefined,
  ) {
    if (!actor?.id) {
      throw new UnauthorizedException('Autentikasi diperlukan.');
    }

    const event = await this.authorizeScannerEventAccess(eventId, actor);
    const keyword = (query.q || '').trim();
    if (!keyword) {
      throw new BadRequestException('Kata kunci pencarian (q) wajib diisi.');
    }
    const take = Math.max(1, Math.min(100, Number(query.limit) || 25));

    const tickets = await this.prisma.issuedTicket.findMany({
      where: {
        eventId: event.id,
        order: { status: TicketOrderStatus.PAID },
        OR: [
          { attendeeName: { contains: keyword } },
          { ticketCode: { contains: keyword.toUpperCase() } },
        ],
      },
      include: {
        tier: true,
      },
      orderBy: [{ attendeeName: 'asc' }, { createdAt: 'asc' }],
      take,
    });

    return {
      eventId: event.id,
      query: keyword,
      items: tickets.map((t) => this.toScannerTicketSummary(t)),
    };
  }

  /**
   * POST /ticketing/public/inquiries (@Public, strict throttle)
   * If honeypot field `website` is filled, returns 200 with fake inquiryCode & accessToken without saving anything.
   */
  async createEoInquiry(dto: CreateEoInquiryDto) {
    if (dto.website && dto.website.trim().length > 0) {
      const fakeInquiryCode = this.generateSecureCode('INQ');
      const { accessToken: fakeAccessToken } = this.generateOrderAccessToken();
      return {
        inquiryCode: fakeInquiryCode,
        accessToken: fakeAccessToken,
        status: EoInquiryStatus.PENDING,
        message:
          'Pengajuan acara berhasil dikirim. Simpan kode pengajuan dan token akses Anda.',
      };
    }

    const inquiryCode = this.generateSecureCode('INQ');
    const { accessToken, accessTokenHash } = this.generateOrderAccessToken();
    const cleanWhatsapp = normalizeIndonesianWhatsapp(dto.contactWhatsapp);
    const cleanEmail = dto.contactEmail?.trim()
      ? dto.contactEmail.trim().toLowerCase()
      : null;

    const created = await this.prisma.eoInquiry.create({
      data: {
        inquiryCode,
        accessTokenHash,
        organizerName: dto.organizerName.trim(),
        eventName: dto.eventName.trim(),
        category: dto.category.trim(),
        estimatedAudience: dto.estimatedAudience.trim(),
        contactName: dto.contactName.trim(),
        contactEmail: cleanEmail,
        contactWhatsapp: cleanWhatsapp,
        notes: dto.notes?.trim() ? dto.notes.trim() : null,
        status: EoInquiryStatus.PENDING,
      },
    });

    return {
      inquiryCode: created.inquiryCode,
      accessToken,
      status: created.status,
      message:
        'Pengajuan acara berhasil dikirim. Simpan kode pengajuan dan token akses Anda.',
    };
  }

  /**
   * GET /ticketing/public/inquiries/:code (requires accessToken)
   */
  async getPublicEoInquiryByCode(
    code: string,
    accessToken: string | undefined,
  ) {
    if (!accessToken || !accessToken.trim()) {
      throw new UnauthorizedException(
        'Token akses pengajuan wajib disertakan.',
      );
    }

    const cleanCode = (code || '').trim().toUpperCase();
    const inquiry = await this.prisma.eoInquiry.findUnique({
      where: { inquiryCode: cleanCode },
    });

    if (!inquiry) {
      throw new NotFoundException('Pengajuan acara tidak ditemukan.');
    }

    if (
      !inquiry.accessTokenHash ||
      !safeCompareSecret(hashAccessToken(accessToken), inquiry.accessTokenHash)
    ) {
      throw new ForbiddenException('Token akses pengajuan tidak valid.');
    }

    return {
      id: inquiry.id,
      inquiryCode: inquiry.inquiryCode,
      organizerName: inquiry.organizerName,
      eventName: inquiry.eventName,
      category: inquiry.category,
      estimatedAudience: inquiry.estimatedAudience,
      contactName: inquiry.contactName,
      notes: inquiry.notes,
      adminNotes: inquiry.adminNotes ?? null,
      reviewedAt: inquiry.reviewedAt ? inquiry.reviewedAt.toISOString() : null,
      status: inquiry.status,
      createdAt: inquiry.createdAt.toISOString(),
      updatedAt: inquiry.updatedAt.toISOString(),
    };
  }

  /**
   * Admin: GET /ticketing/inquiries (status filter & pagination)
   */
  async listAdminEoInquiries(query: ListEoInquiriesQueryDto = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const where: Prisma.EoInquiryWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.eoInquiry.count({ where }),
      this.prisma.eoInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      inquiryCode: row.inquiryCode,
      organizerName: row.organizerName,
      eventName: row.eventName,
      category: row.category,
      estimatedAudience: row.estimatedAudience,
      contactName: row.contactName,
      contactEmail: row.contactEmail,
      contactWhatsapp: row.contactWhatsapp,
      notes: row.notes,
      adminNotes: row.adminNotes ?? null,
      reviewedBy: row.reviewedBy ?? null,
      reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

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
   * Admin: PATCH /ticketing/inquiries/:id/status
   * Updates status, adminNotes, reviewedBy, and reviewedAt WITHOUT overwriting applicant's notes.
   */
  async updateEoInquiryStatus(
    inquiryId: string,
    dto: UpdateEoInquiryStatusDto,
    actor?: AuthenticatedUser,
  ) {
    const existing = await this.prisma.eoInquiry.findUnique({
      where: { id: (inquiryId || '').trim() },
    });
    if (!existing) {
      throw new NotFoundException('Pengajuan acara tidak ditemukan.');
    }

    const rawAdminNotes =
      dto.adminNotes !== undefined ? dto.adminNotes : dto.notes;
    const nextAdminNotes =
      rawAdminNotes !== undefined
        ? rawAdminNotes.trim() || null
        : existing.adminNotes;
    const now = new Date();

    const updated = await this.prisma.eoInquiry.update({
      where: { id: existing.id },
      data: {
        status: dto.status,
        adminNotes: nextAdminNotes,
        reviewedBy: actor?.id || actor?.email || 'Admin IRVITE',
        reviewedAt: now,
      },
    });

    return {
      id: updated.id,
      inquiryCode: updated.inquiryCode,
      organizerName: updated.organizerName,
      eventName: updated.eventName,
      category: updated.category,
      estimatedAudience: updated.estimatedAudience,
      contactName: updated.contactName,
      contactEmail: updated.contactEmail,
      contactWhatsapp: updated.contactWhatsapp,
      notes: updated.notes,
      adminNotes: updated.adminNotes ?? null,
      reviewedBy: updated.reviewedBy ?? null,
      reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : null,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
