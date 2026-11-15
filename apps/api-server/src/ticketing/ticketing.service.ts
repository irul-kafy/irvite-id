import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';

export interface TicketTierView {
  id: string;
  name: string;
  description: string;
  price: number;
  quota: number;
  soldCount: number;
  remainingQuota: number;
  benefits: string[];
}

export interface TicketingEventView {
  id: string;
  slug: string;
  title: string;
  category: 'Konser' | 'Seminar' | 'Kampus' | 'Festival';
  organizer: string;
  eventDate: string;
  dateLabel: string;
  timeLabel: string;
  locationDetails: string;
  description: string;
  bannerGradient: string;
  bannerTitle: string;
  startingPrice: number;
  isFree: boolean;
  status: string;
  isFeaturedBanner?: boolean;
  bannerHeadline?: string;
  bannerSubheadline?: string;
  tiers: TicketTierView[];
}

export interface IssuedTicketRecord {
  id: string;
  orderId: string;
  orderCode: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventDateLabel: string;
  eventTimeLabel: string;
  eventLocation: string;
  tierId: string;
  tierName: string;
  ticketCode: string;
  attendeeName: string;
  attendeeEmail: string;
  buyerWhatsapp: string;
  unitPrice: number;
  status: 'ISSUED' | 'CHECKED_IN' | 'VOID';
  checkedInAt: string | null;
  checkedInBy: string | null;
  createdAt: string;
}

export interface TicketOrderRecord {
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
  serviceFee: number;
  totalAmount: number;
  paymentMethod: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  paidAt: string | null;
  emailCorrectedAt: string | null;
  createdAt: string;
  tickets: IssuedTicketRecord[];
}

export interface CreateTicketingEventInput {
  title: string;
  slug?: string;
  category?: 'Konser' | 'Seminar' | 'Kampus' | 'Festival';
  organizer?: string;
  eventDate: string;
  timeLabel?: string;
  locationDetails: string;
  description?: string;
  tiers?: Array<{
    name: string;
    description?: string;
    price: number;
    quota: number;
    benefits?: string[];
  }>;
}

export interface CheckoutTicketInput {
  eventSlug: string;
  tierId: string;
  quantity: number;
  buyerName: string;
  buyerEmail: string;
  buyerWhatsapp: string;
  paymentMethod?: string;
}

export interface CorrectTypoEmailInput {
  identifier: string; // orderCode, ticketCode, or old email
  newEmail: string;
}

const DEFAULT_TICKETING_EVENTS: TicketingEventView[] = [
  {
    id: 'evt-teknik-ui-2026',
    slug: 'teknik-open-house-ui-2026',
    title: 'TEKNIK OPEN HOUSE UNIVERSITAS INDONESIA',
    category: 'Kampus',
    organizer: 'BEM FT Universitas Indonesia',
    eventDate: '2026-11-21T06:45:00.000Z',
    dateLabel: '21 Nov 2026',
    timeLabel: '06:45 - 16:00 WIB',
    locationDetails: 'Fakultas Teknik Universitas Indonesia, KOTA DEPOK',
    description:
      'Pameran inovasi keteknikan, tur laboratorium terpadu, talkshow alumni inspiratif, dan panggung hiburan kampus terbesar di Fakultas Teknik UI.',
    bannerGradient: 'linear-gradient(135deg, #0c4a6e 0%, #1e1b4b 100%)',
    bannerTitle: 'TEKNIK OPEN HOUSE 2026',
    startingPrice: 45000,
    isFree: false,
    status: 'PUBLISHED',
    isFeaturedBanner: true,
    bannerHeadline: 'Pameran Inovasi Keteknikan & Talkshow Inspiratif UI 2026',
    bannerSubheadline: 'Tiket Presale Terbatas • Mulai Rp 45.000',
    tiers: [
      {
        id: 'tier-ui-reg',
        name: 'Regular Pass + Lab Tour',
        description: 'Akses pameran inovasi, tur laboratorium, dan e-sertifikat.',
        price: 45000,
        quota: 350,
        soldCount: 218,
        remainingQuota: 132,
        benefits: ['Akses Pameran & Talkshow', 'Tur Laboratorium FTUI', 'E-Sertifikat Resmi'],
      },
      {
        id: 'tier-ui-vip',
        name: 'VIP All-Access + Merchandise',
        description: 'Kursi terdepan talkshow utama, kit merchandise eksklusif, dan fast track gate.',
        price: 95000,
        quota: 100,
        soldCount: 74,
        remainingQuota: 26,
        benefits: ['VIP Front Row Talkshow', 'Official Tote Bag & Lanyard', 'Fast Track Gate'],
      },
    ],
  },
  {
    id: 'evt-gissense-2026',
    slug: 'gissense-2026-music-festival',
    title: 'GISSENSE 2026',
    category: 'Konser',
    organizer: 'OSIS Global Islamic School 2 Serpong',
    eventDate: '2026-11-21T13:00:00.000Z',
    dateLabel: '21 Nov 2026',
    timeLabel: '13:00 - 18:00 WIB',
    locationDetails: 'LAPANGAN HIJAU GIS 2 SERPONG, KOTA TANGERANG SELATAN',
    description:
      'Festival seni dan konser musik tahunan menghadirkan penampilan spesial musisi nasional, instalasi seni interaktif, serta bazar kuliner pilihan.',
    bannerGradient: 'linear-gradient(135deg, #7c2d12 0%, #450a0a 100%)',
    bannerTitle: 'GISSENSE 2026',
    startingPrice: 65000,
    isFree: false,
    status: 'PUBLISHED',
    tiers: [
      {
        id: 'tier-gis-presale',
        name: 'Presale 1 Festival',
        description: 'Tiket masuk area festival standing dan bazar seni.',
        price: 65000,
        quota: 500,
        soldCount: 412,
        remainingQuota: 88,
        benefits: ['Festival Standing Area', 'QR E-Ticket Gate Access'],
      },
      {
        id: 'tier-gis-vip',
        name: 'VIP Pit + Gelang Tyvek',
        description: 'Area terdepan panggung utama termasuk gelang Tyvek anti-sobek.',
        price: 135000,
        quota: 150,
        soldCount: 110,
        remainingQuota: 40,
        benefits: ['Front Stage Pit Area', 'Tiket Gelang Tyvek Eksklusif', 'Dedicated VIP Gate'],
      },
    ],
  },
  {
    id: 'evt-himasik-concert-2026',
    slug: 'himasik-concert-samasta-senandika',
    title: 'HIMASIK CONCERT',
    category: 'Konser',
    organizer: 'Himpunan Mahasiswa Musik FBSB UNY',
    eventDate: '2026-12-15T17:00:00.000Z',
    dateLabel: '15 Dec 2026',
    timeLabel: '17:00 - 21:00 WIB',
    locationDetails: 'Performance Hall FBSB UNY, KAB. SLEMAN, DI YOGYAKARTA',
    description:
      'Pertunjukan drama musikal orkestra "Samasta Senandika" dengan aransemen simfoni kolaboratif dan tata panggung teatrikal.',
    bannerGradient: 'linear-gradient(135deg, #1e1b4b 0%, #3b0764 100%)',
    bannerTitle: 'SAMASTA SENANDIKA',
    startingPrice: 45000,
    isFree: false,
    status: 'PUBLISHED',
    isFeaturedBanner: true,
    bannerHeadline: 'Pameran Inovasi Keteknikan & Talkshow Inspiratif UI 2026',
    bannerSubheadline: 'Tiket Presale Terbatas • Mulai Rp 45.000',
    tiers: [
      {
        id: 'tier-himasik-balcony',
        name: 'Tribun Balcony Seat',
        description: 'Tempat duduk area balkon dengan pandangan menyeluruh ke panggung orkestra.',
        price: 45000,
        quota: 250,
        soldCount: 180,
        remainingQuota: 70,
        benefits: ['Numbered Balcony Seat', 'Program Booklet Digital'],
      },
      {
        id: 'tier-himasik-orchestra',
        name: 'VVIP Orchestra Floor',
        description: 'Tempat duduk utama lantai dasar tepat di depan konduktor dan panggung.',
        price: 85000,
        quota: 100,
        soldCount: 82,
        remainingQuota: 18,
        benefits: ['Front Orchestra Seating', 'Welcome Drink & Booklet Cetak'],
      },
    ],
  },
  {
    id: 'evt-natal-ugm-2026',
    slug: 'natal-mahasiswa-kristen-ugm-2026',
    title: 'NATAL MAHASISWA KRISTEN UGM 2026',
    category: 'Seminar',
    organizer: 'Unit Kerohanian Kristen UGM',
    eventDate: '2026-12-03T17:00:00.000Z',
    dateLabel: '03 Dec 2026',
    timeLabel: '17:00 - 20:00 WIB',
    locationDetails: 'Grha Sabha Pramana Gadjah Mada University, SLEMAN',
    description:
      'Perayaan dan refleksi Natal civitas akademika Universitas Gadjah Mada bertajuk "The King" bersama paduan suara simfoni.',
    bannerGradient: 'linear-gradient(135deg, #1b4332 0%, #0f172a 100%)',
    bannerTitle: 'THE KING - UGM 2026',
    startingPrice: 0,
    isFree: true,
    status: 'PUBLISHED',
    tiers: [
      {
        id: 'tier-ugm-free',
        name: 'General Admission (Gratis)',
        description: 'E-Ticket wajib ditunjukkan untuk pemindaian QR di pintu masuk Grha Sabha Pramana.',
        price: 0,
        quota: 1200,
        soldCount: 840,
        remainingQuota: 360,
        benefits: ['Bebas Biaya Masuk', 'QR Fast Check-in GSP UGM'],
      },
    ],
  },
];

@Injectable()
export class TicketingService {
  private readonly customEvents: Map<string, TicketingEventView> = new Map();
  private readonly orders: Map<string, TicketOrderRecord> = new Map();
  private readonly ticketsByCode: Map<string, IssuedTicketRecord> = new Map();

  constructor(private readonly prisma: PrismaService) {
    this.seedInitialOrders();
  }

  private seedInitialOrders() {
    const sampleEvent = DEFAULT_TICKETING_EVENTS[0];
    const sampleTier = sampleEvent.tiers[0];
    const orderId = 'ord-demo-001';
    const orderCode = 'IRV-ORD-2026-8821';
    const ticketCode = 'IRV-TIX-2026-8821-01';
    const now = new Date().toISOString();

    const ticket: IssuedTicketRecord = {
      id: 'tix-demo-001',
      orderId,
      orderCode,
      eventId: sampleEvent.id,
      eventSlug: sampleEvent.slug,
      eventTitle: sampleEvent.title,
      eventDateLabel: sampleEvent.dateLabel,
      eventTimeLabel: sampleEvent.timeLabel,
      eventLocation: sampleEvent.locationDetails,
      tierId: sampleTier.id,
      tierName: sampleTier.name,
      ticketCode,
      attendeeName: 'Rian Pratama',
      attendeeEmail: 'rian.pratama@gmail.co', // Intentional typo example ready for 5-second CS fix
      buyerWhatsapp: '081234567890',
      unitPrice: sampleTier.price,
      status: 'ISSUED',
      checkedInAt: null,
      checkedInBy: null,
      createdAt: now,
    };

    const order: TicketOrderRecord = {
      id: orderId,
      orderCode,
      eventId: sampleEvent.id,
      eventSlug: sampleEvent.slug,
      eventTitle: sampleEvent.title,
      tierId: sampleTier.id,
      tierName: sampleTier.name,
      buyerName: 'Rian Pratama',
      buyerEmail: 'rian.pratama@gmail.co',
      buyerWhatsapp: '081234567890',
      quantity: 1,
      unitPrice: sampleTier.price,
      serviceFee: 3000,
      totalAmount: sampleTier.price + 3000,
      paymentMethod: 'QRIS',
      status: 'PAID',
      paidAt: now,
      emailCorrectedAt: null,
      createdAt: now,
      tickets: [ticket],
    };

    this.orders.set(orderCode, order);
    this.ticketsByCode.set(ticketCode, ticket);
  }

  private getAllCatalogEvents(): TicketingEventView[] {
    const customList = Array.from(this.customEvents.values());
    return [...customList, ...DEFAULT_TICKETING_EVENTS];
  }

  async listPublicEvents(query?: { search?: string; category?: string }) {
    let events = this.getAllCatalogEvents();

    if (query?.category && query.category !== 'Semua') {
      events = events.filter(
        (e) => e.category.toLowerCase() === query.category?.toLowerCase(),
      );
    }

    if (query?.search && query.search.trim() !== '') {
      const q = query.search.trim().toLowerCase();
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.locationDetails.toLowerCase().includes(q) ||
          e.organizer.toLowerCase().includes(q),
      );
    }

    return {
      data: events,
      total: events.length,
    };
  }

  async getPublicEventBySlug(slug: string): Promise<TicketingEventView> {
    const all = this.getAllCatalogEvents();
    const found = all.find((e) => e.slug === slug || e.id === slug);
    if (!found) {
      throw new NotFoundException(`Event tiket "${slug}" tidak ditemukan`);
    }
    return found;
  }

  async createTicketingEvent(input: CreateTicketingEventInput): Promise<TicketingEventView> {
    if (!input.title || input.title.trim().length < 3) {
      throw new BadRequestException('Nama event minimal 3 karakter');
    }
    if (!input.locationDetails || input.locationDetails.trim().length < 3) {
      throw new BadRequestException('Lokasi venue wajib diisi');
    }

    const baseSlug = (input.slug || input.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
    const id = `evt-${crypto.randomBytes(4).toString('hex')}`;

    const rawTiers =
      input.tiers && input.tiers.length > 0
        ? input.tiers
        : [
            {
              name: 'Regular Pass',
              description: 'Tiket masuk reguler dengan QR code check-in.',
              price: 50000,
              quota: 200,
              benefits: ['Akses Acara Utama', 'QR E-Ticket Resmi'],
            },
          ];

    const tiers: TicketTierView[] = rawTiers.map((t, idx) => ({
      id: `tier-${id}-${idx + 1}`,
      name: t.name,
      description: t.description || 'Tiket resmi dengan QR gate check-in.',
      price: Math.max(0, Number(t.price) || 0),
      quota: Math.max(1, Number(t.quota) || 100),
      soldCount: 0,
      remainingQuota: Math.max(1, Number(t.quota) || 100),
      benefits: t.benefits && t.benefits.length > 0 ? t.benefits : ['QR Gate Access'],
    }));

    const minPrice = Math.min(...tiers.map((t) => t.price));
    const parsedDate = new Date(input.eventDate || Date.now());
    const dateLabel = isNaN(parsedDate.getTime())
      ? input.eventDate
      : parsedDate.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

    const newEvent: TicketingEventView = {
      id,
      slug,
      title: input.title.trim().toUpperCase(),
      category: input.category || 'Seminar',
      organizer: input.organizer?.trim() || 'IRVITE Official Partner',
      eventDate: isNaN(parsedDate.getTime())
        ? new Date().toISOString()
        : parsedDate.toISOString(),
      dateLabel,
      timeLabel: input.timeLabel || '09:00 - 17:00 WIB',
      locationDetails: input.locationDetails.trim(),
      description:
        input.description?.trim() ||
        'Event resmi terdaftar di platform manajemen e-ticketing IRVITE.ID.',
      bannerGradient: 'linear-gradient(135deg, #1b4332 0%, #0f172a 100%)',
      bannerTitle: input.title.trim().toUpperCase().slice(0, 28),
      startingPrice: minPrice,
      isFree: minPrice === 0,
      status: 'PUBLISHED',
      tiers,
    };

    this.customEvents.set(slug, newEvent);
    return newEvent;
  }

  async checkoutTicket(input: CheckoutTicketInput): Promise<TicketOrderRecord> {
    const event = await this.getPublicEventBySlug(input.eventSlug);
    const tier = event.tiers.find((t) => t.id === input.tierId) || event.tiers[0];
    if (!tier) {
      throw new NotFoundException('Kategori tiket tidak ditemukan');
    }

    const quantity = Math.max(1, Math.min(10, Number(input.quantity) || 1));
    if (tier.remainingQuota < quantity) {
      throw new ConflictException('Kuota tiket untuk kategori ini tidak mencukupi');
    }

    if (!input.buyerName || input.buyerName.trim().length < 2) {
      throw new BadRequestException('Nama lengkap pemesan wajib diisi');
    }
    if (!input.buyerEmail || !input.buyerEmail.includes('@')) {
      throw new BadRequestException('Alamat email pemesan tidak valid');
    }

    // Deduct quota
    tier.soldCount += quantity;
    tier.remainingQuota = Math.max(0, tier.quota - tier.soldCount);

    const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const orderCode = `IRV-ORD-2026-${suffix}`;
    const orderId = `ord-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const serviceFee = tier.price === 0 ? 0 : 3000 * quantity;
    const totalAmount = tier.price * quantity + serviceFee;

    const issuedTickets: IssuedTicketRecord[] = [];
    for (let i = 1; i <= quantity; i++) {
      const ticketCode = `IRV-TIX-2026-${suffix}-0${i}`;
      const ticket: IssuedTicketRecord = {
        id: `tix-${crypto.randomBytes(4).toString('hex')}`,
        orderId,
        orderCode,
        eventId: event.id,
        eventSlug: event.slug,
        eventTitle: event.title,
        eventDateLabel: event.dateLabel,
        eventTimeLabel: event.timeLabel,
        eventLocation: event.locationDetails,
        tierId: tier.id,
        tierName: tier.name,
        ticketCode,
        attendeeName:
          quantity === 1
            ? input.buyerName.trim()
            : `${input.buyerName.trim()} (Tiket #${i})`,
        attendeeEmail: input.buyerEmail.trim().toLowerCase(),
        buyerWhatsapp: (input.buyerWhatsapp || '').trim(),
        unitPrice: tier.price,
        status: 'ISSUED',
        checkedInAt: null,
        checkedInBy: null,
        createdAt: now,
      };
      issuedTickets.push(ticket);
      this.ticketsByCode.set(ticketCode, ticket);
    }

    const order: TicketOrderRecord = {
      id: orderId,
      orderCode,
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      tierId: tier.id,
      tierName: tier.name,
      buyerName: input.buyerName.trim(),
      buyerEmail: input.buyerEmail.trim().toLowerCase(),
      buyerWhatsapp: (input.buyerWhatsapp || '').trim(),
      quantity,
      unitPrice: tier.price,
      serviceFee,
      totalAmount,
      paymentMethod: input.paymentMethod || 'QRIS',
      status: 'PAID',
      paidAt: now,
      emailCorrectedAt: null,
      createdAt: now,
      tickets: issuedTickets,
    };

    this.orders.set(orderCode, order);
    return order;
  }

  async getTicketOrOrderByCode(code: string) {
    const clean = (code || '').trim().toUpperCase();
    const order = this.orders.get(clean);
    if (order) {
      return {
        type: 'ORDER',
        order,
        primaryTicket: order.tickets[0] || null,
      };
    }

    const ticket = this.ticketsByCode.get(clean);
    if (ticket) {
      const parentOrder = this.orders.get(ticket.orderCode) || null;
      return {
        type: 'TICKET',
        order: parentOrder,
        primaryTicket: ticket,
      };
    }

    throw new NotFoundException(`Kode tiket atau pesanan "${code}" tidak ditemukan`);
  }

  async correctTypoEmail(input: CorrectTypoEmailInput) {
    const query = (input.identifier || '').trim().toLowerCase();
    const newEmail = (input.newEmail || '').trim().toLowerCase();

    if (!query) {
      throw new BadRequestException('Masukkan kode pesanan, kode tiket, atau email lama');
    }
    if (!newEmail || !newEmail.includes('@') || !newEmail.includes('.')) {
      throw new BadRequestException('Format email baru tidak valid');
    }

    let matchedOrder: TicketOrderRecord | undefined;

    for (const ord of this.orders.values()) {
      if (
        ord.orderCode.toLowerCase() === query ||
        ord.buyerEmail.toLowerCase() === query ||
        ord.buyerWhatsapp.toLowerCase() === query ||
        ord.tickets.some((t) => t.ticketCode.toLowerCase() === query)
      ) {
        matchedOrder = ord;
        break;
      }
    }

    if (!matchedOrder) {
      throw new NotFoundException(
        `Pesanan atau tiket dengan identitas "${input.identifier}" tidak ditemukan`,
      );
    }

    const previousEmail = matchedOrder.buyerEmail;
    const now = new Date().toISOString();
    matchedOrder.buyerEmail = newEmail;
    matchedOrder.emailCorrectedAt = now;
    for (const t of matchedOrder.tickets) {
      t.attendeeEmail = newEmail;
    }

    return {
      success: true,
      message: `Email berhasil dikoreksi dari ${previousEmail} ke ${newEmail} dan E-Ticket telah dikirim ulang otomatis.`,
      orderCode: matchedOrder.orderCode,
      previousEmail,
      newEmail,
      correctedAt: now,
      ticketsCount: matchedOrder.tickets.length,
      primaryTicketCode: matchedOrder.tickets[0]?.ticketCode || null,
    };
  }

  async checkInTicket(ticketCode: string, scannedBy = 'Gate Scanner', gateName = 'Main Gate') {
    const clean = (ticketCode || '').trim().toUpperCase();
    const ticket = this.ticketsByCode.get(clean);

    if (!ticket) {
      return {
        valid: false,
        status: 'INVALID' as const,
        message: `Kode tiket "${clean}" tidak terdaftar di sistem.`,
        ticket: null,
      };
    }

    if (ticket.status === 'CHECKED_IN') {
      return {
        valid: false,
        status: 'DUPLICATE' as const,
        message: `Tiket atas nama ${ticket.attendeeName} sudah pernah check-in pada ${ticket.checkedInAt}.`,
        ticket,
      };
    }

    if (ticket.status === 'VOID') {
      return {
        valid: false,
        status: 'INVALID' as const,
        message: `Tiket "${clean}" telah dibatalkan (VOID).`,
        ticket,
      };
    }

    ticket.status = 'CHECKED_IN';
    ticket.checkedInAt = new Date().toISOString();
    ticket.checkedInBy = `${scannedBy} (${gateName})`;

    return {
      valid: true,
      status: 'VALID' as const,
      message: `Check-in Berhasil! Selamat datang, ${ticket.attendeeName} (${ticket.tierName}).`,
      ticket,
    };
  }

  async getTicketingSummary() {
    const allEvents = this.getAllCatalogEvents();
    const ordersList = Array.from(this.orders.values());

    let catalogSold = 0;
    let catalogRevenue = 0;
    for (const evt of allEvents) {
      for (const tier of evt.tiers) {
        catalogSold += tier.soldCount;
        catalogRevenue += tier.soldCount * tier.price;
      }
    }

    const checkedInCount = Array.from(this.ticketsByCode.values()).filter(
      (t) => t.status === 'CHECKED_IN',
    ).length;

    return {
      activeTicketEvents: allEvents.length,
      totalTicketsSold: catalogSold,
      grossRevenue: catalogRevenue,
      platformFeeRevenue: catalogSold * 3000,
      checkedInTickets: checkedInCount,
      recentOrders: ordersList.slice(0, 10),
    };
  }
}
