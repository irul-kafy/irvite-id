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
  let draftEventId: string;

  let limitedTierId: string;
  let unopenedTierId: string;
  let otherEventTierId: string;

  beforeAll(async () => {
    process.env.TICKET_QR_SECRET =
      'e2e-test-ticket-qr-hmac-secret-minimum-32-chars';
    process.env.PAYMENT_WEBHOOK_SECRET =
      'e2e-test-payment-webhook-hmac-secret-32-chars';
    process.env.PAYMENT_MODE = 'mock';
    process.env.CRON_SECRET = 'e2e-cron-secret-key';

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
    const futureStart = new Date(now.getTime() + 14 * 86400000);
    const futureEnd = new Date(now.getTime() + 14 * 86400000 + 4 * 3600000);

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
              salesStartAt: new Date(now.getTime() + 5 * 86400000),
              salesEndAt: futureStart,
              sortOrder: 3,
            },
          ],
        },
      },
      include: { ticketTiers: true },
    });
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
      .set('x-cron-secret', 'e2e-cron-secret-key')
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
      .expect(201);

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
      .send({ qrPayload: tamperedQr, gateName: 'Gerbang A' })
      .expect(201);
    expect((badScanRes.body as { valid: boolean; status: string }).valid).toBe(
      false,
    );
    expect((badScanRes.body as { status: string }).status).toBe('INVALID');

    // Valid QR payload succeeds on first scan
    const goodScanRes = await request(app.getHttpServer())
      .post('/ticketing/check-in')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ qrPayload: validQr, gateName: 'Gerbang A' })
      .expect(201);
    expect((goodScanRes.body as { valid: boolean; status: string }).valid).toBe(
      true,
    );
    expect((goodScanRes.body as { status: string }).status).toBe('VALID');

    // Second scan of same QR returns DUPLICATE
    const dupScanRes = await request(app.getHttpServer())
      .post('/ticketing/check-in')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ qrPayload: validQr, gateName: 'Gerbang A' })
      .expect(201);
    expect((dupScanRes.body as { valid: boolean; status: string }).valid).toBe(
      false,
    );
    expect((dupScanRes.body as { status: string }).status).toBe('DUPLICATE');
  });
});
