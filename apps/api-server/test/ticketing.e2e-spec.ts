import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as argon2 from 'argon2';
import { TicketEventStatus, TicketOrderStatus } from 'database';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { TicketingService } from '../src/ticketing/ticketing.service';
import {
  PAYMENT_SERVICE,
  PaymentService,
} from '../src/ticketing/payment.service';

describe('Ticketing Module (e2e MySQL)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ticketingService: TicketingService;
  let paymentService: PaymentService;

  const adminEmail = 'e2e_ticketing_admin@fiktif-irvite.test';
  const pubSlug = 'e2e-konser-senja-fiktif';
  const draftSlug = 'e2e-draf-acara-fiktif';
  const otherSlug = 'e2e-seminar-lain-fiktif';

  let adminUserId: string;
  let adminToken: string;
  let publishedEventId: string;
  let draftEventId: string;

  let limitedTierId: string;
  let unopenedTierId: string;
  let otherEventTierId: string;

  beforeAll(async () => {
    process.env.TICKETING_ENABLED = 'true';
    process.env.TICKET_QR_SECRET =
      'e2e-test-ticket-qr-hmac-secret-minimum-32-chars';
    process.env.PAYMENT_WEBHOOK_SECRET =
      'e2e-test-payment-webhook-hmac-secret-32-chars';
    process.env.PAYMENT_MODE = 'mock';
    process.env.CRON_SECRET = 'e2e-cron-secret-key-minimum-16-chars';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    ticketingService = app.get<TicketingService>(TicketingService);
    paymentService = app.get<PaymentService>(PAYMENT_SERVICE);

    await cleanupFixtures();

    const passwordHash = await argon2.hash('Password123!');
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
    });
    adminUserId = adminUser.id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: 'Password123!' })
      .expect(200);
    adminToken = (loginRes.body as { accessToken: string }).accessToken;

    const now = new Date();
    const futureStart = new Date(now.getTime() + 2 * 3600000); // 2h ahead: upcoming AND inside 6h check-in window
    const futureEnd = new Date(now.getTime() + 8 * 3600000);

    // 1. Published Event with limited tier (quota = 5), free tier, and unopened tier
    const pubEvent = await prisma.event.create({
      data: {
        userId: adminUserId,
        title: 'Konser Senja Nusantara Fiktif',
        slug: pubSlug,
        description: 'Acara pengujian e2e modul tiket.',
        eventDate: futureStart,
        startAt: futureStart,
        endAt: futureEnd,
        venue: 'Panggung Lembayung',
        city: 'Jakarta Selatan',
        category: 'Konser Musik',
        organizerName: 'Kolektif Musik Fiktif',
        taxRatePercent: 10,
        taxIncluded: false,
        serviceFee: 3000,
        status: 'PUBLISHED',
        ticketStatus: TicketEventStatus.PUBLISHED,
        ticketTiers: {
          create: [
            {
              name: 'Tiket kuota terbatas',
              price: 100000,
              quota: 5,
              soldCount: 0,
              maxPerOrder: 2,
              salesStartAt: new Date(now.getTime() - 3600000),
              salesEndAt: futureStart,
              sortOrder: 1,
            },
            {
              name: 'Tiket komunitas gratis',
              price: 0,
              quota: 20,
              soldCount: 0,
              maxPerOrder: 2,
              salesStartAt: new Date(now.getTime() - 3600000),
              salesEndAt: futureStart,
              sortOrder: 2,
            },
            {
              name: 'Tiket gelombang depan (Belum dibuka)',
              price: 150000,
              quota: 20,
              soldCount: 0,
              maxPerOrder: 2,
              salesStartAt: new Date(now.getTime() + 3600000),
              salesEndAt: futureStart,
              sortOrder: 3,
            },
          ],
        },
      },
      include: { ticketTiers: true },
    });
    publishedEventId = pubEvent.id;
    limitedTierId = pubEvent.ticketTiers.find(
      (t) => t.name === 'Tiket kuota terbatas',
    )!.id;
    unopenedTierId = pubEvent.ticketTiers.find((t) =>
      t.name.includes('Belum dibuka'),
    )!.id;

    // 2. Draft Event (must NOT be accessible publicly)
    const draftEvent = await prisma.event.create({
      data: {
        userId: adminUserId,
        title: 'Acara Draf Fiktif',
        slug: draftSlug,
        eventDate: futureStart,
        startAt: futureStart,
        venue: 'Gedung Draf',
        city: 'Bandung',
        category: 'Seminar',
        organizerName: 'Komunitas Draf Fiktif',
        status: 'DRAFT',
        ticketStatus: TicketEventStatus.DRAFT,
        ticketTiers: {
          create: [
            {
              name: 'Tiket draf',
              price: 50000,
              quota: 50,
              soldCount: 0,
              maxPerOrder: 4,
            },
          ],
        },
      },
    });
    draftEventId = draftEvent.id;

    // 3. Another Event (to test cross-event tier mismatch)
    const otherEvent = await prisma.event.create({
      data: {
        userId: adminUserId,
        title: 'Seminar Lain Fiktif',
        slug: otherSlug,
        eventDate: futureStart,
        startAt: futureStart,
        venue: 'Balai Kota Fiktif',
        city: 'Surabaya',
        category: 'Seminar',
        organizerName: 'Lembaga Fiktif',
        status: 'PUBLISHED',
        ticketStatus: TicketEventStatus.PUBLISHED,
        ticketTiers: {
          create: [
            {
              name: 'Tiket seminar lain',
              price: 75000,
              quota: 30,
              soldCount: 0,
              maxPerOrder: 3,
            },
          ],
        },
      },
      include: { ticketTiers: true },
    });
    otherEventTierId = otherEvent.ticketTiers[0].id;
  });

  async function cleanupFixtures() {
    const slugs = [pubSlug, draftSlug, otherSlug];
    await prisma.ticketCheckInLog.deleteMany({
      where: { issuedTicket: { event: { slug: { in: slugs } } } },
    });
    await prisma.issuedTicket.deleteMany({
      where: { event: { slug: { in: slugs } } },
    });
    await prisma.ticketOrder.deleteMany({
      where: { event: { slug: { in: slugs } } },
    });
    await prisma.ticketTier.deleteMany({
      where: { event: { slug: { in: slugs } } },
    });
    await prisma.event.deleteMany({
      where: { slug: { in: slugs } },
    });
    await prisma.user.deleteMany({
      where: { email: adminEmail },
    });
  }

  afterAll(async () => {
    await cleanupFixtures();
    await app.close();
  });

  it('1. Public catalog only returns PUBLISHED events and hides DRAFT events', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/ticketing/events?q=Fiktif')
      .expect(200);

    const slugs = (
      listRes.body as { items: Array<{ slug: string }> }
    ).items.map((e) => e.slug);
    expect(slugs).toContain(pubSlug);
    expect(slugs).not.toContain(draftSlug);

    // Direct slug access to DRAFT event returns 404
    await request(app.getHttpServer())
      .get(`/ticketing/events/${draftSlug}`)
      .expect(404);

    // Checkout on DRAFT event returns 404
    const draftTier = await prisma.ticketTier.findFirstOrThrow({
      where: { eventId: draftEventId },
    });
    await request(app.getHttpServer())
      .post('/ticketing/checkout')
      .send({
        eventSlug: draftSlug,
        tierId: draftTier.id,
        quantity: 1,
        buyerName: 'Damar Wijaya',
        buyerEmail: 'damar@contoh-fiktif.id',
        buyerWhatsapp: '081234567890',
      })
      .expect(404);
  });

  it('2. Rejects invalid quantity, wrong tier from another event, unopened tier, and invalid WA/email DTO', async () => {
    // Qty > maxPerOrder (2)
    await request(app.getHttpServer())
      .post('/ticketing/checkout')
      .send({
        eventSlug: pubSlug,
        tierId: limitedTierId,
        quantity: 3,
        buyerName: 'Damar Wijaya',
        buyerEmail: 'damar@contoh-fiktif.id',
        buyerWhatsapp: '081234567890',
      })
      .expect(400);

    // Tier belongs to another event
    await request(app.getHttpServer())
      .post('/ticketing/checkout')
      .send({
        eventSlug: pubSlug,
        tierId: otherEventTierId,
        quantity: 1,
        buyerName: 'Damar Wijaya',
        buyerEmail: 'damar@contoh-fiktif.id',
        buyerWhatsapp: '081234567890',
      })
      .expect(400);

    // Sales period not yet open
    await request(app.getHttpServer())
      .post('/ticketing/checkout')
      .send({
        eventSlug: pubSlug,
        tierId: unopenedTierId,
        quantity: 1,
        buyerName: 'Damar Wijaya',
        buyerEmail: 'damar@contoh-fiktif.id',
        buyerWhatsapp: '081234567890',
      })
      .expect(400);

    // Invalid Indonesian WhatsApp number
    await request(app.getHttpServer())
      .post('/ticketing/checkout')
      .send({
        eventSlug: pubSlug,
        tierId: limitedTierId,
        quantity: 1,
        buyerName: 'Damar Wijaya',
        buyerEmail: 'damar@contoh-fiktif.id',
        buyerWhatsapp: '12345',
      })
      .expect(400);
  });

  it('3. Prevents overselling under parallel concurrent checkouts (quota = 5, 8 parallel requests)', async () => {
    // Direct service-level parallel invocations against real MySQL transaction lock
    const attempts = Array.from({ length: 8 }, (_, idx) =>
      ticketingService
        .checkoutTicket({
          eventSlug: pubSlug,
          tierId: limitedTierId,
          quantity: 1,
          buyerName: `Pembeli Paralel ${idx + 1}`,
          buyerEmail: `pembeli${idx + 1}@contoh-fiktif.id`,
          buyerWhatsapp: `08123456780${idx}`,
          paymentMethod: 'QRIS',
        })
        .then((res) => ({ ok: true as const, res }))
        .catch((err: { status?: number }) => ({
          ok: false as const,
          status: err?.status,
        })),
    );

    const results = await Promise.all(attempts);
    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    expect(succeeded).toHaveLength(5);
    expect(failed).toHaveLength(3);
    expect(failed.every((f) => f.status === 409)).toBe(true);

    const tierAfter = await prisma.ticketTier.findUniqueOrThrow({
      where: { id: limitedTierId },
    });
    expect(tierAfter.soldCount).toBe(5);
  });

  it('4. Enforces accessToken on order lookup and releases quota when PENDING order expires (lazy & cron)', async () => {
    const pendingOrders = await prisma.ticketOrder.findMany({
      where: { tierId: limitedTierId, status: TicketOrderStatus.PENDING },
    });
    expect(pendingOrders.length).toBe(5);

    const targetOrder = pendingOrders[0];
    const { accessToken, accessTokenHash } =
      ticketingService.generateOrderAccessToken();

    // Set expiresAt in the past for targetOrder and secondOrder
    await prisma.ticketOrder.update({
      where: { id: targetOrder.id },
      data: {
        accessTokenHash,
        expiresAt: new Date(Date.now() - 60000),
      },
    });
    await prisma.ticketOrder.update({
      where: { id: pendingOrders[1].id },
      data: {
        expiresAt: new Date(Date.now() - 60000),
      },
    });

    // Without accessToken -> 401
    await request(app.getHttpServer())
      .get(`/ticketing/orders/${targetOrder.orderCode}`)
      .expect(401);

    // With wrong accessToken -> 403
    await request(app.getHttpServer())
      .get(`/ticketing/orders/${targetOrder.orderCode}?accessToken=wrong-token`)
      .expect(403);

    // With valid accessToken -> lazy-expires targetOrder and releases 1 ticket
    const lazyRes = await request(app.getHttpServer())
      .get(
        `/ticketing/orders/${targetOrder.orderCode}?accessToken=${encodeURIComponent(accessToken)}`,
      )
      .expect(200);
    expect((lazyRes.body as { status: string }).status).toBe('EXPIRED');

    const tierAfterLazy = await prisma.ticketTier.findUniqueOrThrow({
      where: { id: limitedTierId },
    });
    expect(tierAfterLazy.soldCount).toBe(4);

    // Run periodic cron endpoint to expire pendingOrders[1] and release 1 more ticket
    const cronRes = await request(app.getHttpServer())
      .post('/ticketing/cron/expire-orders')
      .set('x-cron-secret', 'e2e-cron-secret-key-minimum-16-chars')
      .expect(201);
    expect((cronRes.body as { expiredCount: number }).expiredCount).toBe(1);

    const tierAfterCron = await prisma.ticketTier.findUniqueOrThrow({
      where: { id: limitedTierId },
    });
    expect(tierAfterCron.soldCount).toBe(3);
  });

  it('5. Confirms PAID via verified webhook, issues tickets with v1.<ticketId>.<hmac> QR, and rejects modified QR at check-in', async () => {
    const activePending = await prisma.ticketOrder.findFirstOrThrow({
      where: { tierId: limitedTierId, status: TicketOrderStatus.PENDING },
    });

    // Before webhook: 0 IssuedTickets exist for this order
    const ticketsBefore = await prisma.issuedTicket.count({
      where: { orderId: activePending.id },
    });
    expect(ticketsBefore).toBe(0);

    // Verified payment webhook transitions PENDING -> PAID and issues tickets
    const validSig = paymentService.computeWebhookSignature({
      orderCode: activePending.orderCode,
      transactionStatus: 'PAID',
      grossAmount: activePending.totalAmount,
    });

    const webhookRes = await request(app.getHttpServer())
      .post('/ticketing/webhooks/payment')
      .set('x-payment-signature', validSig)
      .send({
        orderCode: activePending.orderCode,
        transactionStatus: 'PAID',
        grossAmount: activePending.totalAmount,
        paymentReference: 'PAY-E2E-001',
      })
      .expect(200);

    const paidBody = webhookRes.body as {
      status: string;
      tickets: Array<{ id: string; qrPayload: string }>;
    };
    expect(paidBody.status).toBe('PAID');
    expect(paidBody.tickets).toHaveLength(1);

    const validQr = paidBody.tickets[0].qrPayload;
    expect(validQr).toMatch(/^v1\.[^.]+\.[^.]+$/);

    // Tampered QR payload is rejected at gate scanner check-in
    const tamperedQr = `${validQr.slice(0, -3)}XYZ`;
    const badScanRes = await request(app.getHttpServer())
      .post('/ticketing/check-in')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        eventId: publishedEventId,
        qrPayload: tamperedQr,
        gateName: 'Gerbang A',
      })
      .expect(201);
    expect((badScanRes.body as { valid: boolean; status: string }).valid).toBe(
      false,
    );
    expect((badScanRes.body as { status: string }).status).toBe('INVALID');

    // Valid QR payload succeeds on first scan (and does NOT leak buyer email/WA)
    const goodScanRes = await request(app.getHttpServer())
      .post('/ticketing/check-in')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        eventId: publishedEventId,
        qrPayload: validQr,
        gateName: 'Gerbang A',
      })
      .expect(201);
    expect((goodScanRes.body as { valid: boolean; status: string }).valid).toBe(
      true,
    );
    expect((goodScanRes.body as { status: string }).status).toBe('VALID');
    expect(JSON.stringify(goodScanRes.body)).not.toContain('@');

    // Second scan of same QR returns DUPLICATE
    const dupScanRes = await request(app.getHttpServer())
      .post('/ticketing/check-in')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        eventId: publishedEventId,
        qrPayload: validQr,
        gateName: 'Gerbang A',
      })
      .expect(201);
    expect((dupScanRes.body as { valid: boolean; status: string }).valid).toBe(
      false,
    );
    expect((dupScanRes.body as { status: string }).status).toBe('DUPLICATE');
  });

  it('6. Quote endpoint computes 3.5% vs 3% promo & BUYER vs ORGANIZER without holding quota, and checkout rejects client money fields or disallowed payment methods', async () => {
    const tierBefore = await prisma.ticketTier.findUniqueOrThrow({
      where: { id: limitedTierId },
    });

    // 1. Public quote on 1x Rp 100.000 (350 bps = 3.5%, 10% tax, BUYER) -> total = 113.500 (< 150.000, so VA_* not in allowedPaymentMethods)
    const quoteRes = await request(app.getHttpServer())
      .post(`/ticketing/events/${pubSlug}/quote`)
      .send({ tierId: limitedTierId, quantity: 1 })
      .expect(201);

    const quoteBody = quoteRes.body as {
      subtotal: number;
      serviceFee: number;
      serviceFeeBps: number;
      feePayer: string;
      taxAmount: number;
      totalAmount: number;
      organizerNet: number;
      allowedPaymentMethods: string[];
    };
    expect(quoteBody.subtotal).toBe(100000);
    expect(quoteBody.serviceFee).toBe(3500);
    expect(quoteBody.serviceFeeBps).toBe(350);
    expect(quoteBody.feePayer).toBe('BUYER');
    expect(quoteBody.taxAmount).toBe(10000);
    expect(quoteBody.totalAmount).toBe(113500);
    expect(quoteBody.organizerNet).toBe(100000);
    expect(quoteBody.allowedPaymentMethods).toEqual(['QRIS', 'EWALLET']);

    // Verify quote did NOT increment soldCount
    const tierAfterQuote = await prisma.ticketTier.findUniqueOrThrow({
      where: { id: limitedTierId },
    });
    expect(tierAfterQuote.soldCount).toBe(tierBefore.soldCount);

    // 2. Rejects client-supplied money fields (subtotal, serviceFee, total) due to forbidNonWhitelisted
    await request(app.getHttpServer())
      .post('/ticketing/checkout')
      .send({
        eventSlug: pubSlug,
        tierId: limitedTierId,
        quantity: 1,
        buyerName: 'Damar Wijaya',
        buyerEmail: 'damar@contoh-fiktif.id',
        buyerWhatsapp: '081234567890',
        paymentMethod: 'QRIS',
        subtotal: 1000,
        serviceFee: 0,
        total: 1000,
      })
      .expect(400);

    // 3. Rejects VA_BCA when totalAmount (113.500) < 150.000, and always rejects CARD
    await request(app.getHttpServer())
      .post('/ticketing/checkout')
      .send({
        eventSlug: pubSlug,
        tierId: limitedTierId,
        quantity: 1,
        buyerName: 'Damar Wijaya',
        buyerEmail: 'damar@contoh-fiktif.id',
        buyerWhatsapp: '081234567890',
        paymentMethod: 'VA_BCA',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/ticketing/checkout')
      .send({
        eventSlug: pubSlug,
        tierId: limitedTierId,
        quantity: 2,
        buyerName: 'Damar Wijaya',
        buyerEmail: 'damar@contoh-fiktif.id',
        buyerWhatsapp: '081234567890',
        paymentMethod: 'CARD',
      })
      .expect(400);

    // 4. Enable 3% promo (300 bps) and ORGANIZER feePayer on event, verify quote reflects promo & organizerNet
    await prisma.event.update({
      where: { slug: pubSlug },
      data: {
        feePayer: 'ORGANIZER',
        promoFeeBps: 300,
        promoEndsAt: new Date(Date.now() + 3600000),
      },
    });

    const promoQuoteRes = await request(app.getHttpServer())
      .post(`/ticketing/events/${pubSlug}/quote`)
      .send({ tierId: limitedTierId, quantity: 2 })
      .expect(201);

    const promoQuote = promoQuoteRes.body as {
      subtotal: number;
      serviceFee: number;
      serviceFeeBps: number;
      isPromoActive: boolean;
      feePayer: string;
      taxAmount: number;
      totalAmount: number;
      organizerNet: number;
      allowedPaymentMethods: string[];
    };
    expect(promoQuote.subtotal).toBe(200000);
    expect(promoQuote.serviceFeeBps).toBe(300);
    expect(promoQuote.isPromoActive).toBe(true);
    expect(promoQuote.serviceFee).toBe(6000);
    expect(promoQuote.taxAmount).toBe(20000);
    expect(promoQuote.totalAmount).toBe(220000); // ORGANIZER pays fee, buyer pays subtotal + tax
    expect(promoQuote.organizerNet).toBe(194000); // 200.000 - 6.000 (tax is separate)
    expect(promoQuote.allowedPaymentMethods).toContain('VA_BCA');
  });

  it('7. Money flow & webhook state machine: parallel PAID idempotency, overdue unswept PENDING -> PAID, EXPIRED/CANCELLED late payment -> PAID or REFUND_PENDING, grossAmount check, payment_events audit, and 503 checkout rollback', async () => {
    // Create a dedicated tier with quota = 2 for testing parallel webhooks, overdue PENDING, and late payments
    const tier2 = await prisma.ticketTier.create({
      data: {
        eventId: publishedEventId,
        name: 'Tier Uji Alur Uang',
        description: 'Kuota 2 tiket',
        price: 100000,
        quota: 2,
        soldCount: 0,
        maxPerOrder: 2,
        sortOrder: 2,
      },
    });

    // A. Checkout a 2-ticket order (reserves all 2 seats -> soldCount = 2) with custom holderNames
    const order2Body = await ticketingService.checkoutTicket({
      eventSlug: pubSlug,
      tierId: tier2.id,
      quantity: 2,
      buyerName: 'Budi Santoso',
      buyerEmail: 'budi@contoh-fiktif.id',
      buyerWhatsapp: '081298765432',
      paymentMethod: 'QRIS',
      holderNames: ['Budi Satu', 'Budi Dua'],
    });

    // B. Non-final webhook status (PENDING) -> 200 OK, 0 tickets issued
    const pendingSig = paymentService.computeWebhookSignature({
      orderCode: order2Body.orderCode,
      transactionStatus: 'PENDING',
      grossAmount: order2Body.totalAmount,
    });
    const pendingRes = await request(app.getHttpServer())
      .post('/ticketing/webhooks/payment')
      .set('x-payment-signature', pendingSig)
      .send({
        orderCode: order2Body.orderCode,
        transactionStatus: 'PENDING',
        grossAmount: order2Body.totalAmount,
      })
      .expect(200);
    expect((pendingRes.body as { status: string }).status).toBe('PENDING');
    expect(
      await prisma.issuedTicket.count({ where: { orderId: order2Body.id } }),
    ).toBe(0);

    // C. Mismatched grossAmount -> 400 Bad Request, recorded in payment_events
    const mismatchSig = paymentService.computeWebhookSignature({
      orderCode: order2Body.orderCode,
      transactionStatus: 'PAID',
      grossAmount: order2Body.totalAmount - 1000,
    });
    await request(app.getHttpServer())
      .post('/ticketing/webhooks/payment')
      .set('x-payment-signature', mismatchSig)
      .send({
        orderCode: order2Body.orderCode,
        transactionStatus: 'PAID',
        grossAmount: order2Body.totalAmount - 1000,
      })
      .expect(400);

    // D. Unknown orderCode -> 404 Not Found without leaking details, recorded in payment_events,
    // and secret/signature/token keys in raw body must NEVER be stored in payment_events.payload!
    const notFoundSig = paymentService.computeWebhookSignature({
      orderCode: 'ORD-UNKNOWN9999',
      transactionStatus: 'PAID',
      grossAmount: 100000,
    });
    const secretProbeCode = `ORD-NOSECRET-${Date.now()}`;
    const secretProbeSig = paymentService.computeWebhookSignature({
      orderCode: secretProbeCode,
      transactionStatus: 'PAID',
      grossAmount: 100000,
    });
    await request(app.getHttpServer())
      .post('/ticketing/webhooks/payment')
      .set('x-payment-signature', notFoundSig)
      .send({
        orderCode: 'ORD-UNKNOWN9999',
        transactionStatus: 'PAID',
        grossAmount: 100000,
      })
      .expect(404);

    await request(app.getHttpServer())
      .post('/ticketing/webhooks/payment')
      .set('x-payment-signature', secretProbeSig)
      .send({
        orderCode: secretProbeCode,
        transactionStatus: 'PAID',
        grossAmount: 100000,
        fraudStatus: 'accept',
        signature_key: 'super-secret-sig-value',
        apiSecret: 'do-not-save-me',
        accessToken: 'do-not-save-token',
      })
      .expect(404);

    const storedProbeEvent = await prisma.paymentEvent.findFirstOrThrow({
      where: { orderCode: secretProbeCode },
      orderBy: { createdAt: 'desc' },
    });
    const storedPayloadJson = JSON.stringify(storedProbeEvent.payload);
    expect(storedPayloadJson).toContain('fraudStatus');
    expect(storedPayloadJson).not.toContain('super-secret-sig-value');
    expect(storedPayloadJson).not.toContain('do-not-save-me');
    expect(storedPayloadJson).not.toContain('do-not-save-token');

    // Invalid signature with providerEventId must be logged in payment_events WITHOUT poisoning provider_event_id
    const targetProviderEventId = `evt-parallel-${order2Body.orderCode}`;
    await request(app.getHttpServer())
      .post('/ticketing/webhooks/payment')
      .set('x-payment-signature', 'invalid-forged-signature')
      .send({
        orderCode: order2Body.orderCode,
        transactionStatus: 'PAID',
        grossAmount: order2Body.totalAmount,
        providerEventId: targetProviderEventId,
      })
      .expect(401);

    // E. Overdue PENDING order (expiresAt in the past, NOT yet swept by cron) + 2 parallel PAID webhooks:
    // Even though remaining quota on tier2 is 0 (soldCount=2, quota=2), the unswept PENDING order still holds its 2 seats.
    // Both parallel webhooks must return 200 PAID, and strictly 2 tickets (sequenceNumber 1 and 2) must be created (no duplicates).
    await prisma.ticketOrder.update({
      where: { id: order2Body.id },
      data: { expiresAt: new Date(Date.now() - 120000) },
    });

    const paidSig = paymentService.computeWebhookSignature({
      orderCode: order2Body.orderCode,
      transactionStatus: 'PAID',
      grossAmount: order2Body.totalAmount,
    });

    const [parallel1, parallel2] = await Promise.all([
      request(app.getHttpServer())
        .post('/ticketing/webhooks/payment')
        .set('x-payment-signature', paidSig)
        .send({
          orderCode: order2Body.orderCode,
          transactionStatus: 'PAID',
          grossAmount: order2Body.totalAmount,
          providerEventId: `evt-parallel-${order2Body.orderCode}`,
        }),
      request(app.getHttpServer())
        .post('/ticketing/webhooks/payment')
        .set('x-payment-signature', paidSig)
        .send({
          orderCode: order2Body.orderCode,
          transactionStatus: 'PAID',
          grossAmount: order2Body.totalAmount,
          providerEventId: `evt-parallel-${order2Body.orderCode}`,
        }),
    ]);

    expect(parallel1.status).toBe(200);
    expect(parallel2.status).toBe(200);
    expect((parallel1.body as { status: string }).status).toBe('PAID');
    expect((parallel2.body as { status: string }).status).toBe('PAID');

    const issuedForOrder2 = await prisma.issuedTicket.findMany({
      where: { orderId: order2Body.id },
      orderBy: { sequenceNumber: 'asc' },
    });
    expect(issuedForOrder2).toHaveLength(2);
    expect(issuedForOrder2.map((t) => t.sequenceNumber)).toEqual([1, 2]);
    expect(issuedForOrder2.map((t) => t.attendeeName)).toEqual([
      'Budi Satu',
      'Budi Dua',
    ]);

    // Verify duplicate webhook produced only one PAID_ISSUED outcome in payment_events
    const paidIssuedEvents = await prisma.paymentEvent.count({
      where: {
        orderCode: order2Body.orderCode,
        outcome: 'PAID_ISSUED',
      },
    });
    expect(paidIssuedEvents).toBe(1);

    // F. Late payment on EXPIRED order:
    // Expand tier2 quota to 3 so 1 seat is available (soldCount=2, quota=3).
    await prisma.ticketTier.update({
      where: { id: tier2.id },
      data: { quota: 3 },
    });

    // Create two 1-ticket orders, then expire both so soldCount drops back to 2 (1 seat left).
    const expOrderA = await ticketingService.checkoutTicket({
      eventSlug: pubSlug,
      tierId: tier2.id,
      quantity: 1,
      buyerName: 'Siti Terlambat A',
      buyerEmail: 'siti.a@contoh-fiktif.id',
      buyerWhatsapp: '081233334444',
      paymentMethod: 'QRIS',
    });

    // Expire expOrderA via EXPIRED webhook -> releases 1 seat (soldCount = 2)
    const expireASig = paymentService.computeWebhookSignature({
      orderCode: expOrderA.orderCode,
      transactionStatus: 'EXPIRED',
      grossAmount: expOrderA.totalAmount,
    });
    await request(app.getHttpServer())
      .post('/ticketing/webhooks/payment')
      .set('x-payment-signature', expireASig)
      .send({
        orderCode: expOrderA.orderCode,
        transactionStatus: 'EXPIRED',
        grossAmount: expOrderA.totalAmount,
      })
      .expect(200);

    // Create expOrderB (takes the 1 remaining seat -> soldCount = 3), then expire it too (soldCount = 2)
    const expOrderB = await ticketingService.checkoutTicket({
      eventSlug: pubSlug,
      tierId: tier2.id,
      quantity: 1,
      buyerName: 'Siti Terlambat B',
      buyerEmail: 'siti.b@contoh-fiktif.id',
      buyerWhatsapp: '081233335555',
      paymentMethod: 'QRIS',
    });
    const expireBSig = paymentService.computeWebhookSignature({
      orderCode: expOrderB.orderCode,
      transactionStatus: 'EXPIRED',
      grossAmount: expOrderB.totalAmount,
    });
    await request(app.getHttpServer())
      .post('/ticketing/webhooks/payment')
      .set('x-payment-signature', expireBSig)
      .send({
        orderCode: expOrderB.orderCode,
        transactionStatus: 'EXPIRED',
        grossAmount: expOrderB.totalAmount,
      })
      .expect(200);

    // Late PAID webhook arrives for expOrderA while 1 seat is still free -> re-reserves seat, becomes PAID, issues 1 ticket!
    const latePaidASig = paymentService.computeWebhookSignature({
      orderCode: expOrderA.orderCode,
      transactionStatus: 'PAID',
      grossAmount: expOrderA.totalAmount,
    });
    const latePaidARes = await request(app.getHttpServer())
      .post('/ticketing/webhooks/payment')
      .set('x-payment-signature', latePaidASig)
      .send({
        orderCode: expOrderA.orderCode,
        transactionStatus: 'PAID',
        grossAmount: expOrderA.totalAmount,
      })
      .expect(200);
    expect((latePaidARes.body as { status: string }).status).toBe('PAID');
    expect(
      await prisma.issuedTicket.count({ where: { orderId: expOrderA.id } }),
    ).toBe(1);

    // Late PAID webhook arrives for expOrderB when quota is now full (soldCount=3, quota=3) -> becomes REFUND_PENDING in DB!
    const latePaidBSig = paymentService.computeWebhookSignature({
      orderCode: expOrderB.orderCode,
      transactionStatus: 'PAID',
      grossAmount: expOrderB.totalAmount,
    });
    const latePaidBRes = await request(app.getHttpServer())
      .post('/ticketing/webhooks/payment')
      .set('x-payment-signature', latePaidBSig)
      .send({
        orderCode: expOrderB.orderCode,
        transactionStatus: 'PAID',
        grossAmount: expOrderB.totalAmount,
      })
      .expect(200);
    expect((latePaidBRes.body as { status: string }).status).toBe(
      'REFUND_PENDING',
    );
    const dbExpOrderB = await prisma.ticketOrder.findUniqueOrThrow({
      where: { id: expOrderB.id },
    });
    expect(dbExpOrderB.status).toBe(TicketOrderStatus.REFUND_PENDING);

    // G. Checkout when createPaymentIntent fails (503) -> marks order CANCELLED and releases quota,
    // and subsequent late payment on CANCELLED order transitions to PAID (if quota available) or REFUND_PENDING (if quota full).
    await prisma.ticketTier.update({
      where: { id: tier2.id },
      data: { quota: 4 }, // 1 seat available (soldCount=3, quota=4)
    });

    const intentSpy = jest
      .spyOn(paymentService, 'createPaymentIntent')
      .mockRejectedValueOnce(new Error('Gateway payment service down'));

    await request(app.getHttpServer())
      .post('/ticketing/checkout')
      .send({
        eventSlug: pubSlug,
        tierId: tier2.id,
        quantity: 1,
        buyerName: 'Agus Gagal Intent',
        buyerEmail: 'agus@contoh-fiktif.id',
        buyerWhatsapp: '081277778888',
        paymentMethod: 'QRIS',
      })
      .expect(503);

    intentSpy.mockRestore();

    // Verify order was saved as CANCELLED and quota was released back to soldCount = 3
    const cancelledOrder = await prisma.ticketOrder.findFirstOrThrow({
      where: {
        tierId: tier2.id,
        buyerEmail: 'agus@contoh-fiktif.id',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(cancelledOrder.status).toBe(TicketOrderStatus.CANCELLED);
    const tierAfterFailedIntent = await prisma.ticketTier.findUniqueOrThrow({
      where: { id: tier2.id },
    });
    expect(tierAfterFailedIntent.soldCount).toBe(3);

    // Now buyer pays for the CANCELLED order while 1 seat is available -> transitions to PAID and issues ticket!
    const cancelledPaidSig = paymentService.computeWebhookSignature({
      orderCode: cancelledOrder.orderCode,
      transactionStatus: 'CAPTURE',
      grossAmount: cancelledOrder.totalAmount,
    });
    const cancelledPaidRes = await request(app.getHttpServer())
      .post('/ticketing/webhooks/payment')
      .set('x-payment-signature', cancelledPaidSig)
      .send({
        orderCode: cancelledOrder.orderCode,
        transactionStatus: 'CAPTURE',
        grossAmount: cancelledOrder.totalAmount,
      })
      .expect(200);
    expect((cancelledPaidRes.body as { status: string }).status).toBe('PAID');
    expect(
      await prisma.issuedTicket.count({
        where: { orderId: cancelledOrder.id },
      }),
    ).toBe(1);
  });

  it('8. Atomic check-in & scanner features: 2 parallel scans -> 1 VALID + 1 DUPLICATE, WRONG_EVENT, OUTSIDE_WINDOW, STAFF assignment, qrDigest snapshot & idempotent offline sync, undo rules, stats, manual search (no PII), and TICKETING_ENABLED=false 404 gate', async () => {
    const passwordHash = await argon2.hash('Password123!');
    const assignedStaffEmail = `staff_assigned_${Date.now()}@fiktif-irvite.test`;
    const unassignedStaffEmail = `staff_unassigned_${Date.now()}@fiktif-irvite.test`;

    const [assignedStaff, unassignedStaff] = await Promise.all([
      prisma.user.create({
        data: {
          email: assignedStaffEmail,
          passwordHash,
          role: 'STAFF',
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: unassignedStaffEmail,
          passwordHash,
          role: 'STAFF',
          isActive: true,
        },
      }),
    ]);

    await prisma.staffEvent.create({
      data: {
        eventId: publishedEventId,
        userId: assignedStaff.id,
      },
    });

    const assignedLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: assignedStaffEmail, password: 'Password123!' })
      .expect(200);
    const assignedStaffToken = (assignedLogin.body as { accessToken: string })
      .accessToken;

    const unassignedLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: unassignedStaffEmail, password: 'Password123!' })
      .expect(200);
    const unassignedStaffToken = (
      unassignedLogin.body as { accessToken: string }
    ).accessToken;

    // Issue 2 free tickets on publishedEventId and 1 paid ticket on otherEvent
    const freeTier = await prisma.ticketTier.findFirstOrThrow({
      where: { eventId: publishedEventId, price: 0 },
    });
    const freeOrder = await ticketingService.checkoutTicket({
      eventSlug: pubSlug,
      tierId: freeTier.id,
      quantity: 2,
      buyerName: 'Rina Penonton',
      buyerEmail: 'rina.rahasia@contoh-fiktif.id',
      buyerWhatsapp: '081266667777',
      holderNames: ['Rina Paralel', 'Rina Offline'],
    });
    expect(freeOrder.tickets).toHaveLength(2);
    const ticketParallel = freeOrder.tickets[0];
    const ticketOffline = freeOrder.tickets[1];

    // A. Unassigned STAFF gets 403 on check-in and offline-snapshot
    await request(app.getHttpServer())
      .post('/ticketing/check-in')
      .set('Authorization', `Bearer ${unassignedStaffToken}`)
      .send({
        eventId: publishedEventId,
        qrPayload: ticketParallel.qrPayload,
        gateName: 'Gerbang Barat',
      })
      .expect(403);

    await request(app.getHttpServer())
      .get(`/ticketing/events/${publishedEventId}/offline-snapshot`)
      .set('Authorization', `Bearer ${unassignedStaffToken}`)
      .expect(403);

    // B. Two parallel check-ins by assigned STAFF -> strictly ONE VALID and ONE DUPLICATE!
    const [scanA, scanB] = await Promise.all([
      request(app.getHttpServer())
        .post('/ticketing/check-in')
        .set('Authorization', `Bearer ${assignedStaffToken}`)
        .send({
          eventId: publishedEventId,
          qrPayload: ticketParallel.qrPayload,
          gateName: 'Gerbang Barat',
        }),
      request(app.getHttpServer())
        .post('/ticketing/check-in')
        .set('Authorization', `Bearer ${assignedStaffToken}`)
        .send({
          eventId: publishedEventId,
          qrPayload: ticketParallel.qrPayload,
          gateName: 'Gerbang Barat',
        }),
    ]);

    expect(scanA.status).toBe(201);
    expect(scanB.status).toBe(201);
    const parallelStatuses = [
      (scanA.body as { status: string }).status,
      (scanB.body as { status: string }).status,
    ].sort();
    expect(parallelStatuses).toEqual(['DUPLICATE', 'VALID']);
    expect(JSON.stringify(scanA.body)).not.toContain(
      'rina.rahasia@contoh-fiktif.id',
    );
    expect(JSON.stringify(scanA.body)).not.toContain('6281266667777');

    // C. Ticket from another event -> WRONG_EVENT
    const otherCheckout = await ticketingService.checkoutTicket({
      eventSlug: otherSlug,
      tierId: otherEventTierId,
      quantity: 1,
      buyerName: 'Tamu Acara Lain',
      buyerEmail: 'lain@contoh-fiktif.id',
      buyerWhatsapp: '081255554444',
      paymentMethod: 'QRIS',
    });
    const otherPaidSig = paymentService.computeWebhookSignature({
      orderCode: otherCheckout.orderCode,
      transactionStatus: 'PAID',
      grossAmount: otherCheckout.totalAmount,
    });
    const otherPaidOrder = await ticketingService.handlePaymentWebhook(
      {
        orderCode: otherCheckout.orderCode,
        transactionStatus: 'PAID',
        grossAmount: otherCheckout.totalAmount,
      },
      otherPaidPaidSigHelper(otherPaidSig),
    );
    const wrongEventRes = await request(app.getHttpServer())
      .post('/ticketing/check-in')
      .set('Authorization', `Bearer ${assignedStaffToken}`)
      .send({
        eventId: publishedEventId,
        qrPayload: otherPaidOrder.tickets[0].qrPayload,
        gateName: 'Gerbang Barat',
      })
      .expect(201);
    expect((wrongEventRes.body as { status: string }).status).toBe(
      'WRONG_EVENT',
    );

    // D. Outside check-in window -> OUTSIDE_WINDOW (move otherEvent startAt to +48h)
    const otherEventDb = await prisma.event.findUniqueOrThrow({
      where: { slug: otherSlug },
    });
    await prisma.event.update({
      where: { id: otherEventDb.id },
      data: {
        startAt: new Date(Date.now() + 48 * 3600_000),
        endAt: new Date(Date.now() + 52 * 3600_000),
      },
    });
    const outsideWinRes = await request(app.getHttpServer())
      .post('/ticketing/check-in')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        eventId: otherEventDb.id,
        qrPayload: otherPaidOrder.tickets[0].qrPayload,
        gateName: 'Gerbang Utama',
      })
      .expect(201);
    expect((outsideWinRes.body as { status: string }).status).toBe(
      'OUTSIDE_WINDOW',
    );

    // E. Offline snapshot for assigned STAFF -> qrDigest only, NO secret, NO qrPayload, NO email/WA
    const snapRes = await request(app.getHttpServer())
      .get(`/ticketing/events/${publishedEventId}/offline-snapshot`)
      .set('Authorization', `Bearer ${assignedStaffToken}`)
      .expect(200);
    const snapBody = snapRes.body as {
      tickets: Array<{
        ticketId: string;
        ticketCode: string;
        attendeeName: string;
        tierName: string;
        status: string;
        qrDigest: string;
      }>;
    };
    const offlineSnapItem = snapBody.tickets.find(
      (t) => t.ticketId === ticketOffline.id,
    );
    expect(offlineSnapItem).toBeDefined();
    expect(offlineSnapItem?.qrDigest).toBe(
      ticketingService.computeTicketQrDigest(ticketOffline.id),
    );
    expect(JSON.stringify(snapBody)).not.toContain(
      'rina.rahasia@contoh-fiktif.id',
    );
    expect(JSON.stringify(snapBody)).not.toContain(ticketOffline.qrPayload);

    // Offline sync matching qrDigest -> 1st call APPLIED, 2nd retry with same opId -> DUPLICATE without double log
    const opId = `op-ticket-sync-${Date.now()}`;
    const sync1 = await request(app.getHttpServer())
      .post(`/ticketing/events/${publishedEventId}/offline-sync`)
      .set('Authorization', `Bearer ${assignedStaffToken}`)
      .send({
        deviceId: 'scanner-android-01',
        operations: [
          {
            opId,
            ticketId: ticketOffline.id,
            qrDigest: offlineSnapItem!.qrDigest,
            gateName: 'Gerbang Offline',
            scannedAt: new Date().toISOString(),
          },
        ],
      })
      .expect(201);
    expect((sync1.body as { syncedCount: number }).syncedCount).toBe(1);

    const sync2 = await request(app.getHttpServer())
      .post(`/ticketing/events/${publishedEventId}/offline-sync`)
      .set('Authorization', `Bearer ${assignedStaffToken}`)
      .send({
        deviceId: 'scanner-android-01',
        operations: [
          {
            opId,
            ticketId: ticketOffline.id,
            qrDigest: offlineSnapItem!.qrDigest,
            gateName: 'Gerbang Offline',
            scannedAt: new Date().toISOString(),
          },
        ],
      })
      .expect(201);
    expect((sync2.body as { duplicateCount: number }).duplicateCount).toBe(1);

    const syncLogsCount = await prisma.ticketCheckInLog.count({
      where: { syncOpId: opId },
    });
    expect(syncLogsCount).toBe(1);

    // F. Check-in stats & Manual search (no PII)
    const statsRes = await request(app.getHttpServer())
      .get(`/ticketing/events/${publishedEventId}/checkin-stats`)
      .set('Authorization', `Bearer ${assignedStaffToken}`)
      .expect(200);
    const statsBody = statsRes.body as {
      checkedInCount: number;
      byTier: Array<{ tierName: string; checkedInCount: number }>;
      byGate: Array<{ gateName: string; checkedInCount: number }>;
    };
    expect(statsBody.checkedInCount).toBeGreaterThanOrEqual(3);
    expect(statsBody.byGate.some((g) => g.gateName === 'Gerbang Offline')).toBe(
      true,
    );

    const searchRes = await request(app.getHttpServer())
      .get(`/ticketing/events/${publishedEventId}/tickets/search?q=Rina`)
      .set('Authorization', `Bearer ${assignedStaffToken}`)
      .expect(200);
    const searchJson = JSON.stringify(searchRes.body);
    expect(searchJson).toContain('Rina Paralel');
    expect(searchJson).not.toContain('rina.rahasia@contoh-fiktif.id');
    expect(searchJson).not.toContain('6281266667777');

    // G. Undo check-in (ADMIN): records actorUserId & reason, reverts to ISSUED, and blocks undo if ENDED
    const undoRes = await request(app.getHttpServer())
      .post('/ticketing/check-in/undo')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        eventId: publishedEventId,
        ticketId: ticketParallel.id,
        reason: 'Tamu keluar sebelum masuk area panggung',
      })
      .expect(201);
    expect((undoRes.body as { status: string }).status).toBe('ISSUED');

    const undoLog = await prisma.ticketCheckInLog.findFirstOrThrow({
      where: { issuedTicketId: ticketParallel.id, result: 'UNDO' },
      orderBy: { scannedAt: 'desc' },
    });
    expect(undoLog.actorUserId).toBe(adminUserId);
    expect(undoLog.reason).toBe('Tamu keluar sebelum masuk area panggung');

    // Mark otherEvent ENDED -> undo must be rejected with 409
    await prisma.issuedTicket.update({
      where: { id: otherPaidOrder.tickets[0].id },
      data: { status: 'CHECKED_IN', checkedInAt: new Date() },
    });
    await prisma.event.update({
      where: { id: otherEventDb.id },
      data: { ticketStatus: TicketEventStatus.ENDED },
    });
    await request(app.getHttpServer())
      .post('/ticketing/check-in/undo')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        eventId: otherEventDb.id,
        ticketId: otherPaidOrder.tickets[0].id,
        reason: 'Acara sudah selesai',
      })
      .expect(409);

    // H. When TICKETING_ENABLED=false, ticketing routes return 404 (so wedding deployment stays isolated)
    process.env.TICKETING_ENABLED = 'false';
    try {
      await request(app.getHttpServer()).get('/ticketing/events').expect(404);
      await request(app.getHttpServer())
        .post('/ticketing/check-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          eventId: publishedEventId,
          qrPayload: ticketParallel.qrPayload,
        })
        .expect(404);
    } finally {
      process.env.TICKETING_ENABLED = 'true';
    }

    // Cleanup extra staff users created in this test
    await prisma.offlineSyncOp.deleteMany({
      where: { eventId: publishedEventId },
    });
    await prisma.staffEvent.deleteMany({
      where: { userId: { in: [assignedStaff.id, unassignedStaff.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [assignedStaff.id, unassignedStaff.id] } },
    });
  });
});

function otherPaidPaidSigHelper(sig: string): string {
  return sig;
}
