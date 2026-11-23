import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  IssuedTicketStatus,
  Role,
  TicketEventStatus,
  TicketOrderStatus,
  EoInquiryStatus,
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
    update: jest.Mock;
    updateMany: jest.Mock;
    count: jest.Mock;
  };
  ticketCheckInLog: {
    create: jest.Mock;
  };
  eoInquiry: {
    create: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
  $executeRaw: jest.Mock;
  $transaction: jest.Mock;
}

describe('TicketingService (Prisma single source of truth)', () => {
  let service: TicketingService;
  let paymentService: PaymentService;
  let mockPrisma: MockPrisma;

  const baseDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const futureStart = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const futureEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 3600000);

  const sampleEventDb = {
    id: 'evt-fiktif-001',
    userId: 'usr-admin-001',
    slug: 'panggung-senja-nusantara',
    title: 'Panggung Senja Nusantara',
    description: 'Pertunjukan musik akustik independen.',
    eventDate: baseDate,
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
    locationDetails: 'Arena Terbuka Taman Lembayung, Jakarta Selatan',
    status: 'PUBLISHED',
    content: {
      isTicketingEvent: true,
      category: 'Konser Musik',
      organizerName: 'Kolektif Suara Senja',
      venueName: 'Arena Terbuka Taman Lembayung',
      city: 'Jakarta Selatan',
      timeLabel: '18:00 - 22:30 WIB',
    },
    ticketStatus: TicketEventStatus.PUBLISHED,
    ticketTiers: [
      {
        id: 'tier-fiktif-reg',
        eventId: 'evt-fiktif-001',
        name: 'Tiket masuk reguler',
        description: 'Akses area utama.',
        price: 120000,
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
    process.env.TICKET_PAYMENT_WEBHOOK_SECRET =
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
        findFirst: jest.fn(
          (args?: {
            where?: { OR?: Array<{ slug?: string; id?: string }> };
          }) => {
            const orClauses = args?.where?.OR ?? [];
            const matches = orClauses.some(
              (c) => c.slug === sampleEventDb.slug || c.id === sampleEventDb.id,
            );
            return Promise.resolve(matches ? sampleEventDb : null);
            (args?: { where?: { slug?: string } }) => {
              if (args?.where?.slug === sampleEventDb.slug) {
                return Promise.resolve(sampleEventDb);
              }
              return Promise.resolve(null);
            },
        ),
        create: jest.fn(
          (args: {
            data: Record<string, unknown> & {
              ticketTiers?: { create?: Array<Record<string, unknown>> };
            };
          }) => {
            const createdTiers = (args.data.ticketTiers?.create ?? []).map(
              (t, idx) => ({
                id: `tier-created-${idx + 1}`,
                ...t,
              }),
            );
            return Promise.resolve({
              id: 'evt-created-001',
              ...args.data,
              ticketTiers: createdTiers,
            });
          },
        ),
        findUnique: jest.fn().mockResolvedValue(sampleEventDb),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      ticketTier: {
        findUnique: jest.fn().mockResolvedValue(sampleEventDb.ticketTiers[0]),
        update: jest.fn().mockResolvedValue(sampleEventDb.ticketTiers[0]),
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
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
      },
      issuedTicket: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      ticketCheckInLog: {
        create: jest.fn(),
      },
      eoInquiry: {
        create: jest.fn((args: { data: Record<string, unknown> }) =>
          Promise.resolve({
            id: 'inq-uuid-001',
            id: `tkt-id-${Math.random().toString(36).slice(2, 8)}`,
            ...args.data,
            checkedInAt: null,
            checkedInBy: null,
            checkedInGate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      ticketCheckInLog: {
        create: jest.fn(),
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

  it('lists public events from Prisma and filters by category and search', async () => {
    const res = await service.listPublicEvents();
    expect(res.total).toBe(1);
    expect(res.data[0].slug).toBe('panggung-senja-nusantara');
    it('activates MockPaymentService only when PAYMENT_MODE=mock and NODE_ENV != production', () => {
      process.env.PAYMENT_MODE = 'mock';
      expect(createPaymentService()).toBeInstanceOf(MockPaymentService);

      const filtered = await service.listPublicEvents({ search: 'Lembayung' });
      expect(filtered.total).toBe(1);

      const noMatch = await service.listPublicEvents({ category: 'Workshop' });
      expect(noMatch.total).toBe(0);
      process.env.PAYMENT_MODE = 'gateway';
      expect(createPaymentService()).toBeInstanceOf(GatewayPaymentService);
    });

    it('creates a new order strictly as PENDING with cryptographically random orderCode >= 10 chars', async () => {
      const confirmation = await service.checkoutTicket({
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

        expect(confirmation.status).toBe('PENDING');
        expect(confirmation.orderCode.length).toBeGreaterThanOrEqual(10);
        expect(confirmation.unitPrice).toBe(120000);
        expect(confirmation.serviceFee).toBe(6000);
        expect(confirmation.totalAmount).toBe(246000);
        expect(mockPrisma.ticketOrder.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: TicketOrderStatus.PENDING,
              paidAt: null,
            }) as unknown,
          }),
        );
        expect(res.status).toBe('PENDING');
        expect(res.orderCode.length).toBeGreaterThanOrEqual(10);
        expect(res.accessToken.length).toBeGreaterThanOrEqual(24);
        expect(res.subtotal).toBe(200000);
        expect(res.serviceFee).toBe(6000);
        expect(res.taxAmount).toBe(20000); // 10% tax not included
        expect(res.totalAmount).toBe(226000);
        expect(res.expiresAt).toBeTruthy();
        expect(res.tickets).toHaveLength(0);
        expect(mockPrisma.issuedTicket.create).not.toHaveBeenCalled();
      });

    it('rejects payment webhook with invalid HMAC signature and transitions PENDING -> PAID only on verified webhook', async () => {
      const orderCode = service.generateSecureCode('ORD');
      const pendingOrderDb = {
        id: 'ord-uuid-001',
        orderCode,
        eventId: sampleEventDb.id,
        tierId: 'tier-fiktif-reg',
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
          buyerWhatsapp: '6281234567890',
          quantity: 1,
          unitPrice: 120000,
          serviceFee: 3000,
          totalAmount: 123000,
          paymentMethod: 'QRIS',
          status: TicketOrderStatus.PENDING,
          paidAt: null,
          emailCorrectedAt: null,
          createdAt: new Date(),
          event: sampleEventDb,
          tier: sampleEventDb.ticketTiers[0],
          issuedTickets: [],
        };
        buyerWhatsapp: '081234567890',
    });

    mockPrisma.ticketOrder.findUnique.mockResolvedValue(pendingOrderDb);
    expect(res.status).toBe('PAID');
    expect(res.totalAmount).toBe(0);
    expect(res.tickets).toHaveLength(1);
    expect(res.tickets[0].qrPayload).toMatch(/^v1\.tkt-free-001\./);
  });

  it('rejects checkout for wrong tier, unopened sales window, quantity > maxPerOrder, or quota exceeded', async () => {
    // 1. Tier does not belong to event
    await expect(
      service.confirmPaymentWebhook(
        { orderCode, transactionStatus: 'PAID', grossAmount: 123000 },
        'invalid-signature',
      ),
    ).rejects.toThrow(UnauthorizedException);
    service.checkoutTicket({
      eventSlug: 'panggung-senja-nusantara',
      tierId: 'tier-other-event',
      quantity: 1,
      buyerName: 'Damar',
      buyerEmail: 'damar@contoh.id',
      buyerWhatsapp: '081234567890',
    }),
    ).rejects.toThrow(BadRequestException);

  const issuedTicketCode = service.generateSecureCode('TKT');
  mockPrisma.ticketOrder.update.mockResolvedValue({
    ...pendingOrderDb,
    status: TicketOrderStatus.PAID,
    paidAt: new Date(),
    paymentReference: 'REF-001',
    issuedTickets: [
      {
        id: 'tkt-uuid-001',
        orderId: pendingOrderDb.id,
        eventId: sampleEventDb.id,
        tierId: 'tier-fiktif-reg',
        ticketCode: issuedTicketCode,
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
  // 2. Unopened sales window
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

  const validSig = service.computeWebhookSignature({
    orderCode,
    transactionStatus: 'PAID',
    grossAmount: 123000,
  });
  // 3. Quantity exceeds tier.maxPerOrder (4)
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

  const paidView = await service.confirmPaymentWebhook(
    {
      orderCode,
      transactionStatus: 'PAID',
      grossAmount: 123000,
      paymentReference: 'REF-001',
    },
    validSig,
  );

  expect(paidView.status).toBe('PAID');
  expect(paidView.tickets).toHaveLength(1);
  expect(paidView.tickets[0].ticketCode.length).toBeGreaterThanOrEqual(10);
  expect(paidView.tickets[0].qrToken).toContain('IRV1.');
  // 4. Atomic quota check returns 0 affected rows -> ConflictException
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

it('prevents unverified public order lookup from exposing buyer PII', async () => {
  it('enforces accessToken on getPublicOrderByCode and lazy-expires overdue PENDING order', async () => {
    const orderCode = service.generateSecureCode('ORD');
    const { accessToken, accessTokenHash } = service.generateOrderAccessToken();
    const pastExpiresAt = new Date(Date.now() - 60000);

    mockPrisma.ticketOrder.findUnique.mockResolvedValue({
      id: 'ord-uuid-001',
      id: 'ord-exp-001',
      orderCode,
      accessTokenHash,
      status: TicketOrderStatus.PENDING,
      expiresAt: pastExpiresAt,
    });

    // Missing token -> UnauthorizedException
    await expect(
      service.getPublicOrderByCode(orderCode, undefined),
    ).rejects.toThrow(UnauthorizedException);

    // Invalid token -> ForbiddenException
    await expect(
      service.getPublicOrderByCode(orderCode, 'wrong-access-token'),
    ).rejects.toThrow(ForbiddenException);

    // Valid token on overdue PENDING order -> lazy-expires and returns EXPIRED
    mockPrisma.ticketOrder.findMany.mockResolvedValueOnce([
      { id: 'ord-exp-001', tierId: 'tier-fiktif-reg', quantity: 2 },
    ]);
    mockPrisma.ticketOrder.findUniqueOrThrow.mockResolvedValueOnce({
      id: 'ord-exp-001',
      orderCode,
      eventId: sampleEventDb.id,
      tierId: 'tier-fiktif-reg',
      buyerName: 'Damar Wijaya',
      buyerEmail: 'damar.wijaya@contoh-fiktif.id',
      buyerEmail: 'damar@contoh.id',
      buyerWhatsapp: '6281234567890',
      quantity: 1,
      unitPrice: 120000,
      serviceFee: 3000,
      totalAmount: 123000,
      quantity: 2,
      unitPrice: 100000,
      subtotal: 200000,
      serviceFee: 6000,
      taxAmount: 20000,
      totalAmount: 226000,
      paymentMethod: 'QRIS',
      status: TicketOrderStatus.PAID,
      paidAt: new Date(),
      emailCorrectedAt: null,
      paymentReference: null,
      status: TicketOrderStatus.EXPIRED,
      expiresAt: pastExpiresAt,
      paidAt: null,
      createdAt: new Date(),
      event: sampleEventDb,
      tier: sampleEventDb.ticketTiers[0],
      issuedTickets: [],
    });

    await expect(
      service.verifyAndGetPublicOrder({ code: orderCode }),
    ).rejects.toThrow(ForbiddenException);
    const view = await service.getPublicOrderByCode(orderCode, accessToken);
    expect(view.status).toBe('EXPIRED');
    expect(mockPrisma.ticketOrder.updateMany).toHaveBeenCalled();
  });

  await expect(
    service.verifyAndGetPublicOrder({
      code: orderCode,
      email: 'orang.lain@contoh.id',
    }),
  ).rejects.toThrow(ForbiddenException);
  it('signs and verifies v1.<ticketId>.<hmac> QR payloads and rejects tampered payloads', async () => {
    const ticketId = '550e8400-e29b-41d4-a716-446655440000';
    const qrPayload = service.signTicketQr(ticketId);

    const verified = await service.verifyAndGetPublicOrder({
      code: orderCode,
      email: 'damar.wijaya@contoh-fiktif.id',
      expect(qrPayload.startsWith(`v1.${ticketId}.`)).toBe(true);
    expect(service.verifyTicketQr(qrPayload)).toEqual({
      valid: true,
      ticketId,
    });
    expect(verified.order.buyerName).toBe('Damar Wijaya');
  });

  it('validates HMAC-signed QR token at gate check-in and rejects forged tokens or duplicate scans', async () => {
    const ticketCode = service.generateSecureCode('TKT');
    const validQrToken = service.signTicketQrToken(
      ticketCode,
      sampleEventDb.id,
    );
    // Tampered HMAC
    const tamperedHmac = `${qrPayload.slice(0, -2)}ab`;
    expect(service.verifyTicketQr(tamperedHmac).valid).toBe(false);

    const forgedResult = await service.checkInTicket(
      `IRV1.${ticketCode}.${sampleEventDb.id}.forgedSignature123`,
    );
    expect(forgedResult.valid).toBe(false);
    expect(forgedResult.status).toBe('INVALID');
    // Tampered ticketId
    const parts = qrPayload.split('.');
    const tamperedId = `v1.550e8400-e29b-41d4-a716-999999999999.${parts[2]}`;
    expect(service.verifyTicketQr(tamperedId).valid).toBe(false);

    const ticketDb = {
      id: 'tkt-uuid-001',
      orderId: 'ord-uuid-001',
      eventId: sampleEventDb.id,
      tierId: 'tier-fiktif-reg',
      ticketCode,
      attendeeName: 'Damar Wijaya',
      attendeeEmail: 'damar.wijaya@contoh-fiktif.id',
      status: IssuedTicketStatus.ISSUED,
      checkedInAt: null,
      checkedInBy: null,
      checkedInGate: null,
      createdAt: new Date(),
      order: {
        id: 'ord-uuid-001',
        orderCode: service.generateSecureCode('ORD'),
        eventId: sampleEventDb.id,
        tierId: 'tier-fiktif-reg',
        buyerName: 'Damar Wijaya',
        buyerEmail: 'damar.wijaya@contoh-fiktif.id',
        buyerWhatsapp: '6281234567890',
        quantity: 1,
        unitPrice: 120000,
        serviceFee: 3000,
        totalAmount: 123000,
        paymentMethod: 'QRIS',
        status: TicketOrderStatus.PAID,
        paidAt: new Date(),
        emailCorrectedAt: null,
        createdAt: new Date(),
        event: sampleEventDb,
        tier: sampleEventDb.ticketTiers[0],
        issuedTickets: [],
      },
    };
    mockPrisma.issuedTicket.findUnique.mockResolvedValueOnce(ticketDb);
    const checkInTampered = await service.checkInTicket({
      qrPayload: tamperedId,
    });
    expect(checkInTampered.valid).toBe(false);
    expect(checkInTampered.status).toBe('INVALID');

    const firstScan = await service.checkInTicket(
      validQrToken,
      'petugas@irvite.id',
      'Gerbang utama',
      // Non-published event throws NotFoundException
      mockPrisma.event.findFirst.mockResolvedValueOnce(null);
    await expect(service.getPublicEventBySlug('draft-event')).rejects.toThrow(
      NotFoundException,
    );
    expect(firstScan.valid).toBe(true);
    expect(firstScan.status).toBe('VALID');

    mockPrisma.issuedTicket.findUnique.mockResolvedValueOnce({
      ...ticketDb,
      status: IssuedTicketStatus.CHECKED_IN,
      checkedInAt: new Date(),
    });
    const secondScan = await service.checkInTicket(
      validQrToken,
      'petugas@irvite.id',
      'Gerbang utama',
    );
    expect(secondScan.valid).toBe(false);
    expect(secondScan.status).toBe('DUPLICATE');
  });

  it('saves EO partnership inquiry to Prisma with PENDING status', async () => {
    const result = await service.submitEoInquiry({
      organizerName: 'Kolektif Musik Nusantara',
      eventName: 'Panggung Harmoni Senja',
      category: 'Konser Musik',
      estimatedAudience: '500 - 1000',
      contactWhatsapp: '081299887766',
    });

    expect(result.inquiryCode.length).toBeGreaterThanOrEqual(10);
    expect(result.status).toBe(EoInquiryStatus.PENDING);
    expect(mockPrisma.eoInquiry.create).toHaveBeenCalledTimes(1);
  });
});
