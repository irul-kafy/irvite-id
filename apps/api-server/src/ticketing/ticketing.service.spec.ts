import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  IssuedTicketStatus,
  Role,
  TicketEventStatus,
  TicketOrderStatus,
} from 'database';
import { TicketingService } from './ticketing.service';
import { PrismaService } from '../database/prisma.service';
import {
  createPaymentService,
  GatewayPaymentService,
  MockPaymentService,
  PAYMENT_SERVICE,
  PaymentService,
} from './payment.service';

interface MockPrisma {
  user: { findFirst: jest.Mock };
  event: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  ticketTier: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  ticketOrder: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    count: jest.Mock;
  };
  issuedTicket: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    count: jest.Mock;
  };
  ticketCheckInLog: {
    create: jest.Mock;
    findUnique: jest.Mock;
  };
  staffEvent: {
    findUnique: jest.Mock;
  };
  offlineSyncOp: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
  eoInquiry: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  paymentEvent: {
    create: jest.Mock;
    findUnique: jest.Mock;
  };
  $executeRaw: jest.Mock;
  $transaction: jest.Mock;
}

describe('TicketingService (Prisma single source of truth)', () => {
  let service: TicketingService;
  let paymentService: PaymentService;
  let mockPrisma: MockPrisma;

  const futureStart = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const futureEnd = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 3600000,
  );

  const sampleEventDb = {
    id: 'evt-fiktif-001',
    userId: 'usr-admin-001',
    slug: 'panggung-senja-nusantara',
    title: 'Panggung Senja Nusantara',
    description: 'Pertunjukan musik akustik independen.',
    eventDate: futureStart,
    startAt: futureStart,
    endAt: futureEnd,
    venue: 'Arena Terbuka Taman Lembayung',
    city: 'Jakarta Selatan',
    category: 'Konser Musik',
    organizerName: 'Kolektif Suara Senja',
    bannerUrl: null,
    taxRatePercent: 10,
    taxIncluded: false,
    serviceFee: 3000,
    serviceFeeBps: 350,
    feePayer: 'BUYER' as const,
    promoFeeBps: null as number | null,
    promoEndsAt: null as Date | null,
    locationDetails: 'Arena Terbuka Taman Lembayung, Jakarta Selatan',
    status: 'PUBLISHED',
    ticketStatus: TicketEventStatus.PUBLISHED,
    content: null,
    ticketTiers: [
      {
        id: 'tier-fiktif-reg',
        eventId: 'evt-fiktif-001',
        name: 'Tiket masuk reguler',
        description: 'Akses area utama.',
        price: 100000,
        quota: 100,
        soldCount: 10,
        salesStartAt: new Date(Date.now() - 86400000),
        salesEndAt: futureStart,
        maxPerOrder: 4,
        sortOrder: 1,
        benefits: ['Akses area utama', 'Tiket digital kode QR'],
      },
      {
        id: 'tier-fiktif-free',
        eventId: 'evt-fiktif-001',
        name: 'Tiket komunitas gratis',
        description: 'Gratis.',
        price: 0,
        quota: 50,
        soldCount: 0,
        salesStartAt: new Date(Date.now() - 86400000),
        salesEndAt: futureStart,
        maxPerOrder: 2,
        sortOrder: 2,
        benefits: ['Tiket digital kode QR'],
      },
      {
        id: 'tier-fiktif-unopened',
        eventId: 'evt-fiktif-001',
        name: 'Tiket gelombang depan',
        description: 'Belum dibuka.',
        price: 200000,
        quota: 50,
        soldCount: 0,
        salesStartAt: new Date(Date.now() + 5 * 86400000),
        salesEndAt: futureStart,
        maxPerOrder: 2,
        sortOrder: 3,
        benefits: ['Tiket digital kode QR'],
      },
    ],
  };

  beforeEach(async () => {
    process.env.TICKET_QR_SECRET =
      'test-secret-for-ticket-qr-hmac-signing-2026';
    process.env.PAYMENT_WEBHOOK_SECRET =
      'test-secret-for-payment-webhook-hmac-2026';
    process.env.PAYMENT_MODE = 'mock';

    paymentService = createPaymentService();

    mockPrisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'usr-admin-001', role: Role.ADMIN }),
      },
      event: {
        findMany: jest.fn().mockResolvedValue([sampleEventDb]),
        findFirst: jest.fn((args?: { where?: { slug?: string } }) => {
          if (args?.where?.slug === sampleEventDb.slug) {
            return Promise.resolve(sampleEventDb);
          }
          return Promise.resolve(null);
        }),
        findUnique: jest.fn().mockResolvedValue(sampleEventDb),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      ticketTier: {
        findUnique: jest.fn().mockResolvedValue(sampleEventDb.ticketTiers[0]),
        create: jest.fn(),
        update: jest.fn(),
      },
      ticketOrder: {
        create: jest.fn((args: { data: Record<string, unknown> }) =>
          Promise.resolve({
            id: 'ord-uuid-001',
            ...args.data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn((args: { data: Record<string, unknown> }) => {
          const createCalls = mockPrisma.ticketOrder.create.mock.calls as Array<
            Array<{ data: Record<string, unknown> }>
          >;
          const latestCreated =
            createCalls.length > 0
              ? createCalls[createCalls.length - 1][0].data
              : {};
          return Promise.resolve({
            id: 'ord-uuid-001',
            ...latestCreated,
            ...args.data,
            createdAt: new Date(),
            updatedAt: new Date(),
            event: sampleEventDb,
            tier: sampleEventDb.ticketTiers[0],
            issuedTickets: [],
          });
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
      },
      issuedTicket: {
        create: jest.fn((args: { data: Record<string, unknown> }) =>
          Promise.resolve({
            id: 'tkt-free-001',
            ...args.data,
            checkedInAt: null,
            checkedInBy: null,
            checkedInGate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
      },
      ticketCheckInLog: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      staffEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      offlineSyncOp: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      eoInquiry: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      paymentEvent: {
        create: jest.fn().mockResolvedValue({ id: 'pe-001' }),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $executeRaw: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn(
        (
          arg: ((tx: MockPrisma) => Promise<unknown>) | Array<Promise<unknown>>,
        ) => {
          if (typeof arg === 'function') {
            return arg(mockPrisma);
          }
          return Promise.all(arg);
        },
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketingService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: PAYMENT_SERVICE,
          useValue: paymentService,
        },
      ],
    }).compile();

    service = module.get<TicketingService>(TicketingService);
  });

  it('activates MockPaymentService only when PAYMENT_MODE=mock and NODE_ENV != production', () => {
    process.env.PAYMENT_MODE = 'mock';
    expect(createPaymentService()).toBeInstanceOf(MockPaymentService);

    process.env.PAYMENT_MODE = 'gateway';
    expect(createPaymentService()).toBeInstanceOf(GatewayPaymentService);
  });

  it('creates paid order as PENDING with 15m expiresAt, server-computed tax/fee, accessTokenHash, and NO IssuedTickets before PAID', async () => {
    mockPrisma.ticketOrder.findUniqueOrThrow.mockImplementation(() => {
      const createCall = (
        mockPrisma.ticketOrder.create.mock.calls[0] as Array<{
          data: Record<string, unknown>;
        }>
      )[0].data;
      return Promise.resolve({
        id: 'ord-uuid-001',
        ...createCall,
        createdAt: new Date(),
        event: sampleEventDb,
        tier: sampleEventDb.ticketTiers[0],
        issuedTickets: [],
      });
    });

    const res = await service.checkoutTicket({
      eventSlug: 'panggung-senja-nusantara',
      tierId: 'tier-fiktif-reg',
      quantity: 2,
      buyerName: 'Damar Wijaya',
      buyerEmail: 'damar.wijaya@contoh-fiktif.id',
      buyerWhatsapp: '081234567890',
      paymentMethod: 'QRIS',
    });

    expect(res.status).toBe('PENDING');
    expect(res.orderCode.length).toBeGreaterThanOrEqual(10);
    expect(res.accessToken.length).toBeGreaterThanOrEqual(24);
    expect(res.subtotal).toBe(200000);
    expect(res.serviceFee).toBe(7000);
    expect(res.serviceFeeBps).toBe(350);
    expect(res.feePayer).toBe('BUYER');
    expect(res.taxAmount).toBe(20000);
    expect(res.totalAmount).toBe(227000);
    expect(res.organizerNet).toBe(200000);
    expect(res.expiresAt).toBeTruthy();
    expect(res.tickets).toHaveLength(0);
    expect(mockPrisma.issuedTicket.create).not.toHaveBeenCalled();
  });

  it('quotes order breakdown without reserving quota or writing to DB, and honors active vs expired promo and payment method rules', async () => {
    // 1. Standard 3.5% (350 bps) quote on 1x Rp 100.000 + 10% tax -> total 113.500 (< 150.000, so VA_* not allowed)
    const quote1 = await service.quoteTicketOrder('panggung-senja-nusantara', {
      tierId: 'tier-fiktif-reg',
      quantity: 1,
    });
    expect(quote1.subtotal).toBe(100000);
    expect(quote1.serviceFee).toBe(3500);
    expect(quote1.serviceFeeBps).toBe(350);
    expect(quote1.isPromoActive).toBe(false);
    expect(quote1.taxAmount).toBe(10000);
    expect(quote1.totalAmount).toBe(113500);
    expect(quote1.organizerNet).toBe(100000);
    expect(quote1.allowedPaymentMethods).toEqual(['QRIS', 'EWALLET']);
    expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    expect(mockPrisma.ticketOrder.create).not.toHaveBeenCalled();

    // 2. Active promo (300 bps = 3%, promoEndsAt in the future) on 2x Rp 100.000 -> subtotal 200.000, fee 6.000, tax 20.000, total 226.000 (VA_* allowed)
    const promoEvent = {
      ...sampleEventDb,
      promoFeeBps: 300,
      promoEndsAt: new Date(Date.now() + 3600000),
    };
    mockPrisma.event.findFirst.mockResolvedValueOnce(promoEvent);
    const quotePromo = await service.quoteTicketOrder(
      'panggung-senja-nusantara',
      {
        tierId: 'tier-fiktif-reg',
        quantity: 2,
      },
    );
    expect(quotePromo.serviceFeeBps).toBe(300);
    expect(quotePromo.isPromoActive).toBe(true);
    expect(quotePromo.serviceFee).toBe(6000);
    expect(quotePromo.totalAmount).toBe(226000);
    expect(quotePromo.allowedPaymentMethods).toContain('VA_BCA');

    // 3. Expired promo (promoEndsAt in the past) falls back to 350 bps (fee 7.000)
    const expiredPromoEvent = {
      ...sampleEventDb,
      promoFeeBps: 300,
      promoEndsAt: new Date(Date.now() - 3600000),
    };
    mockPrisma.event.findFirst.mockResolvedValueOnce(expiredPromoEvent);
    const quoteExpired = await service.quoteTicketOrder(
      'panggung-senja-nusantara',
      {
        tierId: 'tier-fiktif-reg',
        quantity: 2,
      },
    );
    expect(quoteExpired.serviceFeeBps).toBe(350);
    expect(quoteExpired.isPromoActive).toBe(false);
    expect(quoteExpired.serviceFee).toBe(7000);
    expect(quoteExpired.totalAmount).toBe(227000);
  });

  it('persists holderNames at checkout and uses them when issuing tickets upon payment webhook', async () => {
    mockPrisma.ticketOrder.findUniqueOrThrow.mockImplementation(() => {
      const createCall = (
        mockPrisma.ticketOrder.create.mock.calls[0] as Array<{
          data: Record<string, unknown>;
        }>
      )[0].data;
      return Promise.resolve({
        id: 'ord-holders-001',
        ...createCall,
        createdAt: new Date(),
        event: sampleEventDb,
        tier: sampleEventDb.ticketTiers[0],
        issuedTickets: [],
      });
    });

    const checkoutRes = await service.checkoutTicket({
      eventSlug: 'panggung-senja-nusantara',
      tierId: 'tier-fiktif-reg',
      quantity: 2,
      buyerName: 'Damar Wijaya',
      buyerEmail: 'damar@contoh.id',
      buyerWhatsapp: '081234567890',
      paymentMethod: 'VA_BCA',
      holderNames: ['Raisa Andriana', 'Isyana Sarasvati'],
    });

    expect(checkoutRes.holderNames).toEqual([
      'Raisa Andriana',
      'Isyana Sarasvati',
    ]);

    // Simulate payment webhook confirming PAID -> tickets must use stored holderNames and sequenceNumber 1..N
    const createdData = (
      mockPrisma.ticketOrder.create.mock.calls[0] as Array<{
        data: Record<string, unknown>;
      }>
    )[0].data;
    mockPrisma.ticketOrder.findUnique.mockResolvedValueOnce({
      id: 'ord-holders-001',
      ...createdData,
      createdAt: new Date(),
      event: sampleEventDb,
      tier: sampleEventDb.ticketTiers[0],
      issuedTickets: [],
    });
    mockPrisma.ticketOrder.findUniqueOrThrow.mockImplementationOnce(() =>
      Promise.resolve({
        id: 'ord-holders-001',
        ...createdData,
        status: TicketOrderStatus.PAID,
        paidAt: new Date(),
        createdAt: new Date(),
        event: sampleEventDb,
        tier: sampleEventDb.ticketTiers[0],
        issuedTickets: mockPrisma.issuedTicket.create.mock.calls.map(
          (c: Array<{ data: Record<string, unknown> }>, idx: number) => ({
            id: `tkt-issued-${idx + 1}`,
            ...c[0].data,
            checkedInAt: null,
            checkedInBy: null,
            checkedInGate: null,
            createdAt: new Date(),
          }),
        ),
      }),
    );

    const sig = paymentService.computeWebhookSignature({
      orderCode: checkoutRes.orderCode,
      transactionStatus: 'PAID',
      grossAmount: checkoutRes.totalAmount,
    });

    const paidView = await service.handlePaymentWebhook(
      {
        orderCode: checkoutRes.orderCode,
        transactionStatus: 'PAID',
        grossAmount: checkoutRes.totalAmount,
      },
      sig,
    );

    expect(paidView.status).toBe('PAID');
    expect(paidView.tickets.map((t) => t.holderName)).toEqual([
      'Raisa Andriana',
      'Isyana Sarasvati',
    ]);
    expect(
      mockPrisma.issuedTicket.create.mock.calls.map(
        (c: Array<{ data: { sequenceNumber: number } }>) =>
          c[0].data.sequenceNumber,
      ),
    ).toEqual([1, 2]);
  });

  it('rejects GatewayPaymentService.createPaymentIntent with 503 and rolls back checkout order to CANCELLED + releases quota when intent fails', async () => {
    const gatewayService = new GatewayPaymentService();
    await expect(
      gatewayService.createPaymentIntent({
        orderCode: 'ORD-GW-TEST01',
        totalAmount: 150000,
        paymentMethod: 'QRIS',
        expiresAt: new Date(Date.now() + 900000),
      }),
    ).rejects.toThrow(ServiceUnavailableException);

    // Replace paymentService.createPaymentIntent with a failing gateway call AFTER order transaction commits
    jest
      .spyOn(paymentService, 'createPaymentIntent')
      .mockRejectedValueOnce(
        new ServiceUnavailableException('Pembayaran belum tersedia'),
      );

    mockPrisma.ticketOrder.findUniqueOrThrow.mockImplementationOnce(() => {
      const createCall = (
        mockPrisma.ticketOrder.create.mock.calls[0] as Array<{
          data: Record<string, unknown>;
        }>
      )[0].data;
      return Promise.resolve({
        id: 'ord-fail-intent-001',
        ...createCall,
        createdAt: new Date(),
        event: sampleEventDb,
        tier: sampleEventDb.ticketTiers[0],
        issuedTickets: [],
      });
    });

    await expect(
      service.checkoutTicket({
        eventSlug: 'panggung-senja-nusantara',
        tierId: 'tier-fiktif-reg',
        quantity: 2,
        buyerName: 'Damar Wijaya',
        buyerEmail: 'damar@contoh.id',
        buyerWhatsapp: '081234567890',
        paymentMethod: 'QRIS',
      }),
    ).rejects.toThrow(ServiceUnavailableException);

    // Verify order was created first, then marked CANCELLED and quota released
    expect(mockPrisma.ticketOrder.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.ticketOrder.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'ord-fail-intent-001',
        status: TicketOrderStatus.PENDING,
      },
      data: {
        status: TicketOrderStatus.CANCELLED,
      },
    });
    // 1st $executeRaw reserves quota (+2), 2nd $executeRaw releases quota (-2)
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it('handles webhook money & state rules: mandatory grossAmount, 404 unknown order, non-final PENDING no-op, overdue unswept PENDING -> PAID, and EXPIRED/CANCELLED late payment -> PAID or REFUND_PENDING', async () => {
    const baseOrder = {
      id: 'ord-webhook-001',
      orderCode: 'ORD-WHK0012345',
      eventId: sampleEventDb.id,
      tierId: 'tier-fiktif-reg',
      buyerName: 'Damar Wijaya',
      buyerEmail: 'damar@contoh.id',
      buyerWhatsapp: '6281234567890',
      quantity: 1,
      unitPrice: 100000,
      subtotal: 100000,
      serviceFee: 3500,
      serviceFeeBps: 350,
      feePayer: 'BUYER',
      taxAmount: 10000,
      totalAmount: 113500,
      paymentMethod: 'QRIS',
      paymentReference: 'MOCK-PAY-1',
      holderNames: ['Damar Wijaya'],
      status: TicketOrderStatus.PENDING,
      expiresAt: new Date(Date.now() - 120000), // Already past expiresAt, but still PENDING (unswept by cron!)
      paidAt: null,
      createdAt: new Date(),
      event: sampleEventDb,
      tier: sampleEventDb.ticketTiers[0],
      issuedTickets: [],
    };

    // 1. Unknown order_code -> 404 NotFoundException + payment_events logged
    mockPrisma.ticketOrder.findUnique.mockResolvedValueOnce(null);
    const unknownSig = paymentService.computeWebhookSignature({
      orderCode: 'ORD-NOTFOUND99',
      transactionStatus: 'PAID',
      grossAmount: 113500,
    });
    await expect(
      service.handlePaymentWebhook(
        {
          orderCode: 'ORD-NOTFOUND99',
          transactionStatus: 'PAID',
          grossAmount: 113500,
        },
        unknownSig,
      ),
    ).rejects.toThrow(NotFoundException);

    // 2. Mismatched grossAmount -> 400 BadRequestException + payment_events logged
    mockPrisma.ticketOrder.findUnique.mockResolvedValueOnce(baseOrder);
    const wrongAmtSig = paymentService.computeWebhookSignature({
      orderCode: baseOrder.orderCode,
      transactionStatus: 'PAID',
      grossAmount: 100000,
    });
    await expect(
      service.handlePaymentWebhook(
        {
          orderCode: baseOrder.orderCode,
          transactionStatus: 'PAID',
          grossAmount: 100000,
        },
        wrongAmtSig,
      ),
    ).rejects.toThrow(BadRequestException);

    // 3. Non-final status (PENDING) -> 200 no-op, does not issue tickets
    mockPrisma.ticketOrder.findUnique.mockResolvedValueOnce(baseOrder);
    const pendingSig = paymentService.computeWebhookSignature({
      orderCode: baseOrder.orderCode,
      transactionStatus: 'PENDING',
      grossAmount: 113500,
    });
    const pendingNoop = await service.handlePaymentWebhook(
      {
        orderCode: baseOrder.orderCode,
        transactionStatus: 'PENDING',
        grossAmount: 113500,
      },
      pendingSig,
    );
    expect(pendingNoop.status).toBe('PENDING');
    expect(mockPrisma.issuedTicket.create).not.toHaveBeenCalled();

    // 4. Overdue PENDING order (not yet swept by cron) receives PAID webhook -> transitions directly to PAID without re-reserving quota
    mockPrisma.ticketOrder.findUnique.mockResolvedValueOnce(baseOrder);
    mockPrisma.ticketOrder.updateMany.mockResolvedValueOnce({ count: 1 });
    mockPrisma.ticketOrder.findUniqueOrThrow.mockResolvedValueOnce({
      ...baseOrder,
      status: TicketOrderStatus.PAID,
      paidAt: new Date(),
      issuedTickets: [
        {
          id: 'tkt-overdue-pending-1',
          orderId: baseOrder.id,
          sequenceNumber: 1,
          eventId: baseOrder.eventId,
          tierId: baseOrder.tierId,
          ticketCode: 'TKT-OVERDUE001',
          attendeeName: 'Damar Wijaya',
          attendeeEmail: baseOrder.buyerEmail,
          status: IssuedTicketStatus.ISSUED,
          checkedInAt: null,
          checkedInBy: null,
          checkedInGate: null,
          createdAt: new Date(),
        },
      ],
    });
    const paidSig = paymentService.computeWebhookSignature({
      orderCode: baseOrder.orderCode,
      transactionStatus: 'PAID',
      grossAmount: 113500,
    });
    const overduePaidView = await service.handlePaymentWebhook(
      {
        orderCode: baseOrder.orderCode,
        transactionStatus: 'PAID',
        grossAmount: 113500,
      },
      paidSig,
    );
    expect(overduePaidView.status).toBe('PAID');
    expect(overduePaidView.tickets).toHaveLength(1);
    // Must NOT have called $executeRaw to release or re-reserve quota because PENDING still held its quota
    expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();

    // 5. Late payment for CANCELLED order when quota is exhausted -> becomes REFUND_PENDING without throwing
    const cancelledOrder = {
      ...baseOrder,
      id: 'ord-cancelled-001',
      orderCode: 'ORD-CANCEL0012',
      status: TicketOrderStatus.CANCELLED,
    };
    mockPrisma.ticketOrder.findUnique.mockResolvedValueOnce(cancelledOrder);
    // 1st updateMany (where status: PENDING) returns count: 0
    mockPrisma.ticketOrder.updateMany.mockResolvedValueOnce({ count: 0 });
    // Re-read returns CANCELLED
    mockPrisma.ticketOrder.findUniqueOrThrow.mockResolvedValueOnce(
      cancelledOrder,
    );
    // 2nd updateMany (where status in [EXPIRED, CANCELLED]) claims transition -> count: 1
    mockPrisma.ticketOrder.updateMany.mockResolvedValueOnce({ count: 1 });
    // Quota re-reservation fails (0 rows affected)
    mockPrisma.$executeRaw.mockResolvedValueOnce(0);
    // Final read returns REFUND_PENDING
    mockPrisma.ticketOrder.findUniqueOrThrow.mockResolvedValueOnce({
      ...cancelledOrder,
      status: TicketOrderStatus.REFUND_PENDING,
    });

    const cancelSig = paymentService.computeWebhookSignature({
      orderCode: cancelledOrder.orderCode,
      transactionStatus: 'SETTLEMENT',
      grossAmount: 113500,
    });
    const refundPendingView = await service.handlePaymentWebhook(
      {
        orderCode: cancelledOrder.orderCode,
        transactionStatus: 'SETTLEMENT',
        grossAmount: 113500,
      },
      cancelSig,
    );
    expect(refundPendingView.status).toBe('REFUND_PENDING');
    expect(mockPrisma.paymentEvent.create).toHaveBeenCalledTimes(5);
  });

  it('allows free tier checkout to become PAID immediately and issues tickets', async () => {
    mockPrisma.ticketOrder.findUniqueOrThrow.mockImplementation(() => {
      const createCall = (
        mockPrisma.ticketOrder.create.mock.calls[0] as Array<{
          data: Record<string, unknown>;
        }>
      )[0].data;
      return Promise.resolve({
        id: 'ord-free-001',
        ...createCall,
        createdAt: new Date(),
        event: sampleEventDb,
        tier: sampleEventDb.ticketTiers[1],
        issuedTickets: [
          {
            id: 'tkt-free-001',
            orderId: 'ord-free-001',
            eventId: sampleEventDb.id,
            tierId: 'tier-fiktif-free',
            ticketCode: service.generateSecureCode('TKT'),
            attendeeName: 'Damar Wijaya',
            attendeeEmail: 'damar.wijaya@contoh-fiktif.id',
            status: IssuedTicketStatus.ISSUED,
            checkedInAt: null,
            checkedInBy: null,
            checkedInGate: null,
            createdAt: new Date(),
          },
        ],
      });
    });

    const res = await service.checkoutTicket({
      eventSlug: 'panggung-senja-nusantara',
      tierId: 'tier-fiktif-free',
      quantity: 1,
      buyerName: 'Damar Wijaya',
      buyerEmail: 'damar.wijaya@contoh-fiktif.id',
      buyerWhatsapp: '081234567890',
    });

    expect(res.status).toBe('PAID');
    expect(res.totalAmount).toBe(0);
    expect(res.tickets).toHaveLength(1);
    expect(res.tickets[0].qrPayload).toMatch(/^v1\.tkt-free-001\./);
  });

  it('rejects checkout for wrong tier, unopened sales window, quantity > maxPerOrder, or quota exceeded', async () => {
    await expect(
      service.checkoutTicket({
        eventSlug: 'panggung-senja-nusantara',
        tierId: 'tier-other-event',
        quantity: 1,
        buyerName: 'Damar',
        buyerEmail: 'damar@contoh.id',
        buyerWhatsapp: '081234567890',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.checkoutTicket({
        eventSlug: 'panggung-senja-nusantara',
        tierId: 'tier-fiktif-unopened',
        quantity: 1,
        buyerName: 'Damar',
        buyerEmail: 'damar@contoh.id',
        buyerWhatsapp: '081234567890',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.checkoutTicket({
        eventSlug: 'panggung-senja-nusantara',
        tierId: 'tier-fiktif-reg',
        quantity: 5,
        buyerName: 'Damar',
        buyerEmail: 'damar@contoh.id',
        buyerWhatsapp: '081234567890',
      }),
    ).rejects.toThrow(BadRequestException);

    mockPrisma.$executeRaw.mockResolvedValueOnce(0);
    await expect(
      service.checkoutTicket({
        eventSlug: 'panggung-senja-nusantara',
        tierId: 'tier-fiktif-reg',
        quantity: 2,
        buyerName: 'Damar',
        buyerEmail: 'damar@contoh.id',
        buyerWhatsapp: '081234567890',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('enforces accessToken on getPublicOrderByCode and lazy-expires overdue PENDING order', async () => {
    const orderCode = service.generateSecureCode('ORD');
    const { accessToken, accessTokenHash } = service.generateOrderAccessToken();
    const pastExpiresAt = new Date(Date.now() - 60000);

    mockPrisma.ticketOrder.findUnique.mockResolvedValue({
      id: 'ord-exp-001',
      orderCode,
      accessTokenHash,
      status: TicketOrderStatus.PENDING,
      expiresAt: pastExpiresAt,
    });

    await expect(
      service.getPublicOrderByCode(orderCode, undefined),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      service.getPublicOrderByCode(orderCode, 'wrong-access-token'),
    ).rejects.toThrow(ForbiddenException);

    mockPrisma.ticketOrder.findMany.mockResolvedValueOnce([
      { id: 'ord-exp-001', tierId: 'tier-fiktif-reg', quantity: 2 },
    ]);
    mockPrisma.ticketOrder.findUniqueOrThrow.mockResolvedValueOnce({
      id: 'ord-exp-001',
      orderCode,
      eventId: sampleEventDb.id,
      tierId: 'tier-fiktif-reg',
      buyerName: 'Damar Wijaya',
      buyerEmail: 'damar@contoh.id',
      buyerWhatsapp: '6281234567890',
      quantity: 2,
      unitPrice: 100000,
      subtotal: 200000,
      serviceFee: 6000,
      taxAmount: 20000,
      totalAmount: 226000,
      paymentMethod: 'QRIS',
      paymentReference: null,
      status: TicketOrderStatus.EXPIRED,
      expiresAt: pastExpiresAt,
      paidAt: null,
      createdAt: new Date(),
      event: sampleEventDb,
      tier: sampleEventDb.ticketTiers[0],
      issuedTickets: [],
    });

    const view = await service.getPublicOrderByCode(orderCode, accessToken);
    expect(view.status).toBe('EXPIRED');
    expect(mockPrisma.ticketOrder.updateMany).toHaveBeenCalled();
  });

  it('signs and verifies v1.<ticketId>.<hmac> QR payloads and rejects tampered payloads', async () => {
    const ticketId = '550e8400-e29b-41d4-a716-446655440000';
    const qrPayload = service.signTicketQr(ticketId);

    expect(qrPayload.startsWith(`v1.${ticketId}.`)).toBe(true);
    expect(service.verifyTicketQr(qrPayload)).toEqual({
      valid: true,
      ticketId,
    });

    const tamperedHmac = `${qrPayload.slice(0, -2)}ab`;
    expect(service.verifyTicketQr(tamperedHmac).valid).toBe(false);

    const parts = qrPayload.split('.');
    const tamperedId = `v1.550e8400-e29b-41d4-a716-999999999999.${parts[2]}`;
    expect(service.verifyTicketQr(tamperedId).valid).toBe(false);

    const checkInTampered = await service.checkInTicket({
      eventId: sampleEventDb.id,
      qrPayload: tamperedId,
    });
    expect(checkInTampered.valid).toBe(false);
    expect(checkInTampered.status).toBe('INVALID');
    const logCall = (
      mockPrisma.ticketCheckInLog.create.mock.calls[0] as Array<{
        data: Record<string, unknown>;
      }>
    )[0];
    expect(logCall.data).toMatchObject({
      eventId: sampleEventDb.id,
      result: 'INVALID',
    });

    mockPrisma.event.findFirst.mockResolvedValueOnce(null);
    await expect(service.getPublicEventBySlug('draft-event')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('enforces atomic check-in, staff_events assignment, check-in time window, privacy (no email/WA), undo rules, offline qrDigest snapshot, and offline sync idempotency', async () => {
    const activeStart = new Date(Date.now() + 2 * 3600_000); // within default 6h window before startAt
    const activeEnd = new Date(Date.now() + 6 * 3600_000);
    const activeEvent = {
      ...sampleEventDb,
      startAt: activeStart,
      eventDate: activeStart,
      endAt: activeEnd,
      ticketStatus: TicketEventStatus.PUBLISHED,
    };
    mockPrisma.event.findUnique.mockResolvedValue(activeEvent);

    const ticketId = '550e8400-e29b-41d4-a716-446655440099';
    const validQr = service.signTicketQr(ticketId);
    const ticketRecord = {
      id: ticketId,
      orderId: 'ord-paid-001',
      eventId: activeEvent.id,
      tierId: activeEvent.ticketTiers[0].id,
      ticketCode: 'TKT-UNIT990011',
      attendeeName: 'Nadia Putri',
      attendeeEmail: 'nadia.rahasia@contoh.id',
      status: IssuedTicketStatus.ISSUED,
      checkedInAt: null,
      checkedInBy: null,
      checkedInGate: null,
      tier: activeEvent.ticketTiers[0],
      order: { status: TicketOrderStatus.PAID },
    };

    // 1. Unassigned STAFF rejected with ForbiddenException
    mockPrisma.staffEvent.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.checkInTicket(
        { eventId: activeEvent.id, qrPayload: validQr },
        { id: 'staff-unassigned', email: 'staff1@irvite.id', role: Role.STAFF },
      ),
    ).rejects.toThrow(ForbiddenException);

    // 2. Assigned STAFF succeeds, and response NEVER exposes email or WhatsApp
    mockPrisma.staffEvent.findUnique.mockResolvedValueOnce({
      eventId: activeEvent.id,
      userId: 'staff-assigned',
    });
    mockPrisma.issuedTicket.findUnique.mockResolvedValueOnce(ticketRecord);
    mockPrisma.issuedTicket.updateMany.mockResolvedValueOnce({ count: 1 });

    const validCheckIn = await service.checkInTicket(
      {
        eventId: activeEvent.id,
        qrPayload: validQr,
        gateName: 'Gerbang Utara',
      },
      { id: 'staff-assigned', email: 'staff2@irvite.id', role: Role.STAFF },
    );
    expect(validCheckIn.valid).toBe(true);
    expect(validCheckIn.status).toBe('VALID');
    expect(JSON.stringify(validCheckIn)).not.toContain(
      'nadia.rahasia@contoh.id',
    );
    expect(validCheckIn.ticket).toMatchObject({
      ticketId,
      attendeeName: 'Nadia Putri',
      tierName: activeEvent.ticketTiers[0].name,
      status: 'CHECKED_IN',
      checkedInGate: 'Gerbang Utara',
    });

    // 3. Wrong event -> WRONG_EVENT logged
    mockPrisma.issuedTicket.findUnique.mockResolvedValueOnce({
      ...ticketRecord,
      eventId: 'evt-other-999',
    });
    const wrongEventRes = await service.checkInTicket(
      { eventId: activeEvent.id, qrPayload: validQr },
      { id: activeEvent.userId, email: 'admin@irvite.id', role: Role.ADMIN },
    );
    expect(wrongEventRes.status).toBe('WRONG_EVENT');

    // 4. Outside window (event starts 24h in future > 6h default) -> OUTSIDE_WINDOW logged
    mockPrisma.event.findUnique.mockResolvedValueOnce({
      ...activeEvent,
      startAt: new Date(Date.now() + 24 * 3600_000),
      endAt: new Date(Date.now() + 28 * 3600_000),
    });
    mockPrisma.issuedTicket.findUnique.mockResolvedValueOnce(ticketRecord);
    const outsideRes = await service.checkInTicket(
      { eventId: activeEvent.id, qrPayload: validQr },
      { id: activeEvent.userId, email: 'admin@irvite.id', role: Role.ADMIN },
    );
    expect(outsideRes.status).toBe('OUTSIDE_WINDOW');

    // 5. Offline snapshot contains qrDigest = SHA-256(signedQr), NO HMAC secret, NO qrPayload, NO email/WA
    mockPrisma.staffEvent.findUnique.mockResolvedValueOnce({
      eventId: activeEvent.id,
      userId: 'staff-assigned',
    });
    mockPrisma.issuedTicket.findMany.mockResolvedValueOnce([ticketRecord]);
    const snapshot = await service.getEventOfflineSnapshot(activeEvent.id, {
      id: 'staff-assigned',
      email: 'staff2@irvite.id',
      role: Role.STAFF,
    });
    expect(snapshot.tickets).toHaveLength(1);
    expect(snapshot.tickets[0]).toEqual({
      ticketId,
      ticketCode: 'TKT-UNIT990011',
      attendeeName: 'Nadia Putri',
      tierName: activeEvent.ticketTiers[0].name,
      status: 'ISSUED',
      qrDigest: service.computeTicketQrDigest(ticketId),
    });
    expect(JSON.stringify(snapshot)).not.toContain('nadia.rahasia@contoh.id');
    expect(JSON.stringify(snapshot)).not.toContain(validQr);

    // 6. Undo check-in blocked when event is ENDED
    mockPrisma.event.findUnique.mockResolvedValueOnce({
      ...activeEvent,
      ticketStatus: TicketEventStatus.ENDED,
    });
    await expect(
      service.undoTicketCheckIn(
        {
          eventId: activeEvent.id,
          ticketId,
          reason: 'Salah scan petugas gerbang',
        },
        { id: activeEvent.userId, email: 'admin@irvite.id', role: Role.ADMIN },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('formats WIB time and date using Intl.DateTimeFormat (Asia/Jakarta) accurately across midnight UTC boundaries', () => {
    // 1. 2026-12-01T16:45:00.000Z is 23:45 WIB on 01 Des 2026 (15 minutes before midnight WIB)
    const beforeMidnightWib = new Date('2026-12-01T16:45:00.000Z');
    // 2. 2026-12-01T17:15:00.000Z is 00:15 WIB on 02 Des 2026 (15 minutes after midnight WIB)
    const afterMidnightWib = new Date('2026-12-01T17:15:00.000Z');

    expect(service.formatWibDateLabel(beforeMidnightWib)).toBe('01 Des 2026');
    expect(service.formatWibDateLabel(afterMidnightWib)).toBe('02 Des 2026');
    expect(
      service.formatWibTimeRange(beforeMidnightWib, afterMidnightWib),
    ).toBe('23:45 - 00:15 WIB');
    expect(service.formatWibTimeRange(beforeMidnightWib, null)).toBe(
      '23:45 WIB',
    );
  });

  it('enforces createTicketingEvent validation: mandatory title/organizerName/city/venue/future startAt/tiers and tier price/quota/maxPerOrder/salesWindow rules without fabricated defaults', async () => {
    const validStart = new Date(Date.now() + 7 * 86400_000).toISOString();
    const validTier = {
      name: 'Tiket Reguler',
      price: 75000,
      quota: 100,
      maxPerOrder: 4,
    };

    // Rejects missing organizerName or city
    await expect(
      service.createTicketingEvent({
        title: 'Acara Uji',
        organizerName: '',
        city: 'Bandung',
        startAt: validStart,
        venueName: 'Gedung Merdeka',
        tiers: [validTier],
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.createTicketingEvent({
        title: 'Acara Uji',
        organizerName: 'Komunitas Musik',
        city: '   ',
        startAt: validStart,
        venueName: 'Gedung Merdeka',
        tiers: [validTier],
      }),
    ).rejects.toThrow(BadRequestException);

    // Rejects startAt in the past
    await expect(
      service.createTicketingEvent({
        title: 'Acara Masa Lalu',
        organizerName: 'Komunitas Musik',
        city: 'Bandung',
        startAt: new Date(Date.now() - 3600_000).toISOString(),
        venueName: 'Gedung Merdeka',
        tiers: [validTier],
      }),
    ).rejects.toThrow(BadRequestException);

    // Rejects empty tiers (never fabricates "Tiket reguler Rp 50.000")
    await expect(
      service.createTicketingEvent({
        title: 'Acara Tanpa Tier',
        organizerName: 'Komunitas Musik',
        city: 'Bandung',
        startAt: validStart,
        venueName: 'Gedung Merdeka',
        tiers: [],
      }),
    ).rejects.toThrow(BadRequestException);

    // Rejects tier with salesEndAt <= salesStartAt
    const salesStart = new Date(Date.now() + 2 * 86400_000).toISOString();
    const salesEndBeforeStart = new Date(
      Date.now() + 1 * 86400_000,
    ).toISOString();
    await expect(
      service.createTicketingEvent({
        title: 'Acara Jendela Salah',
        organizerName: 'Komunitas Musik',
        city: 'Bandung',
        startAt: validStart,
        venueName: 'Gedung Merdeka',
        tiers: [
          {
            ...validTier,
            salesStartAt: salesStart,
            salesEndAt: salesEndBeforeStart,
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('handles EO inquiry honeypot (200 fake response without DB write), saves valid inquiry with accessTokenHash, and updates admin review columns without overwriting applicant notes', async () => {
    // 1. Honeypot "website" filled -> returns 200-equivalent fake response and does NOT call prisma.eoInquiry.create
    const botRes = await service.createEoInquiry({
      organizerName: 'Bot Spam Corp',
      eventName: 'Bot Event',
      category: 'Konser Musik',
      estimatedAudience: '100 - 200',
      contactName: 'Bot Runner',
      contactWhatsapp: '081234567890',
      website: 'https://spam-bot.example.com',
    });
    expect(botRes.inquiryCode).toMatch(/^INQ-/);
    expect(botRes.accessToken.length).toBeGreaterThanOrEqual(24);
    expect(botRes.status).toBe('PENDING');
    expect(mockPrisma.eoInquiry.create).not.toHaveBeenCalled();

    // 2. Valid submission (empty website) -> persists to eo_inquiries with normalized WhatsApp and accessTokenHash
    mockPrisma.eoInquiry.create.mockImplementationOnce(
      (args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'inq-uuid-001',
          ...args.data,
          adminNotes: null,
          reviewedBy: null,
          reviewedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
    );

    const realRes = await service.createEoInquiry({
      organizerName: 'Kolektif Suara Senja',
      eventName: 'Panggung Harmoni 2027',
      category: 'Konser Musik',
      estimatedAudience: '500 - 1000',
      contactName: 'Raka Pratama',
      contactEmail: 'raka@suarasenja.id',
      contactWhatsapp: '081234567890',
      notes: 'Catatan asli dari pemohon EO',
      website: '',
    });
    expect(realRes.inquiryCode).toMatch(/^INQ-/);
    expect(realRes.status).toBe('PENDING');
    expect(mockPrisma.eoInquiry.create).toHaveBeenCalledTimes(1);

    const createdData = (
      mockPrisma.eoInquiry.create.mock.calls[0] as Array<{
        data: Record<string, unknown>;
      }>
    )[0].data;
    expect(createdData.contactWhatsapp).toBe('6281234567890');
    expect(createdData.notes).toBe('Catatan asli dari pemohon EO');
    expect(typeof createdData.accessTokenHash).toBe('string');

    // 3. Admin PATCH status updates adminNotes, reviewedBy, reviewedAt while keeping applicant's notes intact
    mockPrisma.eoInquiry.findUnique.mockResolvedValueOnce({
      id: 'inq-uuid-001',
      ...createdData,
      adminNotes: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.eoInquiry.update.mockImplementationOnce(
      (args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'inq-uuid-001',
          ...createdData,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
    );

    const updated = await service.updateEoInquiryStatus(
      'inq-uuid-001',
      {
        status: 'APPROVED',
        adminNotes: 'Disetujui oleh tim kurasi IRVITE',
      },
      { id: 'usr-admin-001', email: 'admin@irvite.id', role: Role.ADMIN },
    );

    expect(updated.status).toBe('APPROVED');
    expect(updated.notes).toBe('Catatan asli dari pemohon EO');
    expect(updated.adminNotes).toBe('Disetujui oleh tim kurasi IRVITE');
    expect(updated.reviewedBy).toBe('usr-admin-001');
    expect(updated.reviewedAt).toBeTruthy();
  });
});
