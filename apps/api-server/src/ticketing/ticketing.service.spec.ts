import { Test, TestingModule } from '@nestjs/testing';
import { TicketingService } from './ticketing.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('TicketingService', () => {
  let service: TicketingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketingService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TicketingService>(TicketingService);
  });

  it('should list public events and filter by category and search query', async () => {
    const all = await service.listPublicEvents();
    expect(all.total).toBeGreaterThanOrEqual(4);

    const konser = await service.listPublicEvents({ category: 'Konser' });
    expect(konser.data.every((e) => e.category === 'Konser')).toBe(true);

    const searchUi = await service.listPublicEvents({ search: 'Teknik Open House' });
    expect(searchUi.data.length).toBeGreaterThanOrEqual(1);
    expect(searchUi.data[0].slug).toBe('teknik-open-house-ui-2026');
  });

  it('should create a new ticketing event and expose it in public catalog', async () => {
    const created = await service.createTicketingEvent({
      title: 'AI Tech Summit Jakarta 2026',
      category: 'Seminar',
      organizer: 'TechVenture ID',
      eventDate: '2026-12-12',
      locationDetails: 'ICE BSD Hall 3, Tangerang',
      tiers: [
        {
          name: 'Early Bird Pass',
          price: 150000,
          quota: 100,
        },
      ],
    });

    expect(created.title).toBe('AI TECH SUMMIT JAKARTA 2026');
    expect(created.startingPrice).toBe(150000);
    expect(created.tiers).toHaveLength(1);

    const fetched = await service.getPublicEventBySlug(created.slug);
    expect(fetched.id).toBe(created.id);
  });

  it('should process ticket checkout with flat Rp 3.000 service fee and issue unique tickets', async () => {
    const order = await service.checkoutTicket({
      eventSlug: 'gissense-2026-music-festival',
      tierId: 'tier-gis-presale',
      quantity: 2,
      buyerName: 'Budi Santoso',
      buyerEmail: 'budi.santoso@example.com',
      buyerWhatsapp: '081299998888',
      paymentMethod: 'QRIS',
    });

    expect(order.quantity).toBe(2);
    expect(order.unitPrice).toBe(65000);
    expect(order.serviceFee).toBe(6000);
    expect(order.totalAmount).toBe(136000);
    expect(order.tickets).toHaveLength(2);

    const resolved = await service.getTicketOrOrderByCode(order.tickets[0].ticketCode);
    expect(resolved.primaryTicket?.attendeeName).toContain('Budi Santoso');
  });

  it('should correct typo email in 5-second CS flow and update all issued tickets', async () => {
    const result = await service.correctTypoEmail({
      identifier: 'IRV-ORD-2026-8821',
      newEmail: 'rian.pratama@gmail.com',
    });

    expect(result.success).toBe(true);
    expect(result.previousEmail).toBe('rian.pratama@gmail.co');
    expect(result.newEmail).toBe('rian.pratama@gmail.com');

    const resolved = await service.getTicketOrOrderByCode('IRV-ORD-2026-8821');
    expect(resolved.order?.buyerEmail).toBe('rian.pratama@gmail.com');
    expect(resolved.primaryTicket?.attendeeEmail).toBe('rian.pratama@gmail.com');
  });

  it('should validate gate check-in and prevent duplicate check-in', async () => {
    const firstScan = await service.checkInTicket('IRV-TIX-2026-8821-01', 'Gatekeeper 1', 'VIP Gate');
    expect(firstScan.valid).toBe(true);
    expect(firstScan.status).toBe('VALID');

    const duplicateScan = await service.checkInTicket('IRV-TIX-2026-8821-01', 'Gatekeeper 1', 'VIP Gate');
    expect(duplicateScan.valid).toBe(false);
    expect(duplicateScan.status).toBe('DUPLICATE');

    const invalidScan = await service.checkInTicket('IRV-TIX-UNKNOWN-999');
    expect(invalidScan.valid).toBe(false);
    expect(invalidScan.status).toBe('INVALID');
  });

  it('should reject invalid inputs appropriately', async () => {
    await expect(service.getPublicEventBySlug('non-existent-event')).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      service.correctTypoEmail({ identifier: 'IRV-ORD-2026-8821', newEmail: 'bad-email' }),
    ).rejects.toThrow(BadRequestException);
  });
});
