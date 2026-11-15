export interface PublicTicketTier {
  id: string;
  name: string;
  description: string;
  price: number;
  quota: number;
  soldCount: number;
  remainingQuota: number;
  statusLabel: 'TERSEDIA' | 'HAMPIR HABIS' | 'HABIS';
  benefits: string[];
}

export interface PublicTicketingEvent {
  id: string;
  slug: string;
  title: string;
  category: 'Konser Musik' | 'Seminar & Edukasi' | 'Workshop' | 'Standup Comedy';
  organizerName: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  city: string;
  bannerGradient: string;
  bannerTag: string;
  startingPrice: number;
  startingPriceLabel: string;
  tiers: PublicTicketTier[];
}

export interface IssuedTicketRecord {
  id: string;
  ticketCode: string;
  qrPayload: string;
  orderCode: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  tierId: string;
  tierName: string;
  holderName: string;
  holderEmail: string;
  status: 'ISSUED' | 'CHECKED_IN' | 'CANCELLED' | 'EXPIRED';
  checkedInAt: string | null;
  checkedInGate: string | null;
}

export interface TicketOrderRecord {
  id: string;
  orderCode: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  buyerName: string;
  buyerEmail: string;
  buyerWhatsapp: string;
  paymentMethod: string;
  quantity: number;
  subtotalAmount: number;
  serviceFeeAmount: number;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  createdAt: string;
  tickets: IssuedTicketRecord[];
}

export const PLATFORM_FEE_PER_TICKET = 3000;

export function formatRupiah(amount: number): string {
  if (amount <= 0) {
    return 'Gratis';
  }
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export const INITIAL_EVENTS: PublicTicketingEvent[] = [
  {
    id: 'evt-tkt-01',
    slug: 'jakarta-indie-soundwave-2026',
    title: 'JAKARTA INDIE SOUNDWAVE FESTIVAL 2026',
    category: 'Konser Musik',
    organizerName: 'Soundwave Live Indonesia',
    eventDate: '24 Agu 2026',
    eventTime: '15:00 - 23:00 WIB',
    venueName: 'Stadion Madya GBK, Senayan',
    city: 'Jakarta Pusat',
    bannerGradient: 'linear-gradient(135deg, #1b3b2b 0%, #0f2419 55%, #2e5a42 100%)',
    bannerTag: 'HEADLINER STAGE • 12 LINEUP',
    startingPrice: 125000,
    startingPriceLabel: 'Rp 125.000',
    tiers: [
      {
        id: 'tier-01-presale',
        name: 'Presale 1 — Festival Pass',
        description: 'Akses area festival utama + digital e-ticket pass instan.',
        price: 125000,
        quota: 400,
        soldCount: 382,
        remainingQuota: 18,
        statusLabel: 'HAMPIR HABIS',
        benefits: ['E-Ticket QR Code Instan', 'Akses Main Stage & Indie Stage'],
      },
      {
        id: 'tier-01-reguler',
        name: 'Reguler — Festival Pass',
        description: 'Tiket masuk reguler area festival.',
        price: 175000,
        quota: 800,
        soldCount: 410,
        remainingQuota: 390,
        statusLabel: 'TERSEDIA',
        benefits: ['E-Ticket QR Code Instan', 'Akses Semua Area Festival'],
      },
      {
        id: 'tier-01-vip',
        name: 'VIP Emerald Deck + Fast Track',
        description: 'Jalur masuk antrean khusus, viewing deck depan panggung, & merchandise kit.',
        price: 350000,
        quota: 150,
        soldCount: 96,
        remainingQuota: 54,
        statusLabel: 'TERSEDIA',
        benefits: ['Jalur Gate VIP Khusus', 'Viewing Deck Depan Panggung', 'Merchandise Tote & Lanyard'],
      },
    ],
  },
  {
    id: 'evt-tkt-02',
    slug: 'indonesia-product-ai-summit-2026',
    title: 'INDONESIA PRODUCT & AI ENGINEERING SUMMIT 2026',
    category: 'Seminar & Edukasi',
    organizerName: 'TechBuilders Collective',
    eventDate: '05 Sep 2026',
    eventTime: '09:00 - 17:00 WIB',
    venueName: 'The Kasablanka Hall, Kota Kasablanka',
    city: 'Jakarta Selatan',
    bannerGradient: 'linear-gradient(135deg, #163024 0%, #244736 50%, #b58d3d 100%)',
    bannerTag: 'CONFERENCE • SERTIFIKAT RESMI',
    startingPrice: 150000,
    startingPriceLabel: 'Rp 150.000',
    tiers: [
      {
        id: 'tier-02-general',
        name: 'Conference Pass + E-Certificate',
        description: 'Akses seluruh sesi keynote, panel diskusi, dan sertifikat digital.',
        price: 150000,
        quota: 500,
        soldCount: 320,
        remainingQuota: 180,
        statusLabel: 'TERSEDIA',
        benefits: ['Akses 8 Sesi Keynote', 'E-Sertifikat Resmi', 'Coffee Break & Networking'],
      },
      {
        id: 'tier-02-executive',
        name: 'Executive Pass + Workshop Lounge',
        description: 'Kursi barisan depan + makan siang eksklusif bersama pembicara.',
        price: 325000,
        quota: 80,
        soldCount: 68,
        remainingQuota: 12,
        statusLabel: 'HAMPIR HABIS',
        benefits: ['Front Row Seating', 'Executive Lunch & Speaker Q&A', 'Materi Slide & Rekaman HD'],
      },
    ],
  },
  {
    id: 'evt-tkt-03',
    slug: 'ui-ux-design-system-masterclass',
    title: 'HANDS-ON DESIGN SYSTEM & FRONTEND ARCHITECTURE WORKSHOP',
    category: 'Workshop',
    organizerName: 'IRVITE Academy Studio',
    eventDate: '12 Sep 2026',
    eventTime: '13:00 - 17:30 WIB',
    venueName: 'GoWork Pacific Place Mall Lt. 3',
    city: 'Jakarta Selatan',
    bannerGradient: 'linear-gradient(135deg, #1f3a2e 0%, #2b5440 60%, #102018 100%)',
    bannerTag: 'INTENSIVE CLASS • KUOTA 60 PESERTA',
    startingPrice: 95000,
    startingPriceLabel: 'Rp 95.000',
    tiers: [
      {
        id: 'tier-03-workshop',
        name: 'Hands-On Seat + Starter Repo',
        description: 'Sesi praktik langsung 4.5 jam bersama Principal Frontend Engineer.',
        price: 95000,
        quota: 60,
        soldCount: 51,
        remainingQuota: 9,
        statusLabel: 'HAMPIR HABIS',
        benefits: ['Source Code Design System', 'Review Portofolio 1-on-1', 'Sertifikat Kompetensi'],
      },
    ],
  },
  {
    id: 'evt-tkt-04',
    slug: 'malam-tawa-standup-special-tour',
    title: 'MALAM TAWA JAKARTA: STANDUP COMEDY SPECIAL TOUR',
    category: 'Standup Comedy',
    organizerName: 'Komedi Panggung Nusantara',
    eventDate: '19 Sep 2026',
    eventTime: '19:30 - 22:00 WIB',
    venueName: 'Teater Besar Taman Ismail Marzuki',
    city: 'Jakarta Pusat',
    bannerGradient: 'linear-gradient(135deg, #233d31 0%, #12211a 60%, #8f6f2d 100%)',
    bannerTag: 'SPECIAL SHOW • 5 KOMIKA NASIONAL',
    startingPrice: 110000,
    startingPriceLabel: 'Rp 110.000',
    tiers: [
      {
        id: 'tier-04-balkon',
        name: 'Tribun & Balkon',
        description: 'Tempat duduk tribun atas dengan pandangan panggung penuh.',
        price: 110000,
        quota: 250,
        soldCount: 195,
        remainingQuota: 55,
        statusLabel: 'TERSEDIA',
        benefits: ['Nomor Kursi Otomatis', 'E-Ticket QR Code Instan'],
      },
      {
        id: 'tier-04-orchestra',
        name: 'Orchestra — Barisan Depan',
        description: 'Tempat duduk area depan panggung utama.',
        price: 185000,
        quota: 120,
        soldCount: 112,
        remainingQuota: 8,
        statusLabel: 'HAMPIR HABIS',
        benefits: ['Barisan Depan Panggung', 'Sesi Foto Bersama Komika'],
      },
    ],
  },
];

const INITIAL_ORDERS: TicketOrderRecord[] = [
  {
    id: 'ord-demo-01',
    orderCode: 'ORD-IRV-2026-8821',
    eventId: 'evt-tkt-01',
    eventSlug: 'jakarta-indie-soundwave-2026',
    eventTitle: 'JAKARTA INDIE SOUNDWAVE FESTIVAL 2026',
    buyerName: 'Rizky Pratama',
    buyerEmail: 'rizky.pratama@gmial.com',
    buyerWhatsapp: '081288997711',
    paymentMethod: 'QRIS Instan',
    quantity: 2,
    subtotalAmount: 250000,
    serviceFeeAmount: 6000,
    totalAmount: 256000,
    status: 'PAID',
    createdAt: '2026-08-10T10:15:00.000Z',
    tickets: [
      {
        id: 'tkt-demo-01',
        ticketCode: 'IRV-TKT-2026-8821',
        qrPayload: 'IRVITE-TICKET|IRV-TKT-2026-8821|evt-tkt-01|tier-01-presale',
        orderCode: 'ORD-IRV-2026-8821',
        eventId: 'evt-tkt-01',
        eventSlug: 'jakarta-indie-soundwave-2026',
        eventTitle: 'JAKARTA INDIE SOUNDWAVE FESTIVAL 2026',
        eventDate: '24 Agu 2026',
        eventTime: '15:00 - 23:00 WIB',
        venueName: 'Stadion Madya GBK, Senayan',
        tierId: 'tier-01-presale',
        tierName: 'Presale 1 — Festival Pass',
        holderName: 'Rizky Pratama',
        holderEmail: 'rizky.pratama@gmial.com',
        status: 'ISSUED',
        checkedInAt: null,
        checkedInGate: null,
      },
      {
        id: 'tkt-demo-02',
        ticketCode: 'IRV-TKT-2026-8822',
        qrPayload: 'IRVITE-TICKET|IRV-TKT-2026-8822|evt-tkt-01|tier-01-presale',
        orderCode: 'ORD-IRV-2026-8821',
        eventId: 'evt-tkt-01',
        eventSlug: 'jakarta-indie-soundwave-2026',
        eventTitle: 'JAKARTA INDIE SOUNDWAVE FESTIVAL 2026',
        eventDate: '24 Agu 2026',
        eventTime: '15:00 - 23:00 WIB',
        venueName: 'Stadion Madya GBK, Senayan',
        tierId: 'tier-01-presale',
        tierName: 'Presale 1 — Festival Pass',
        holderName: 'Nadia Maharani',
        holderEmail: 'rizky.pratama@gmial.com',
        status: 'ISSUED',
        checkedInAt: null,
        checkedInGate: null,
      },
    ],
  },
];

const globalForTicketing = globalThis as unknown as {
  irviteClientTicketingEvents?: PublicTicketingEvent[];
  irviteClientTicketingOrders?: TicketOrderRecord[];
};

function getEventsStore(): PublicTicketingEvent[] {
  if (!globalForTicketing.irviteClientTicketingEvents) {
    globalForTicketing.irviteClientTicketingEvents = structuredClone(INITIAL_EVENTS);
  }
  return globalForTicketing.irviteClientTicketingEvents;
}

function getOrdersStore(): TicketOrderRecord[] {
  if (!globalForTicketing.irviteClientTicketingOrders) {
    globalForTicketing.irviteClientTicketingOrders = structuredClone(INITIAL_ORDERS);
  }
  return globalForTicketing.irviteClientTicketingOrders;
}

export function listLocalEvents(params?: { category?: string; search?: string }) {
  const events = getEventsStore();
  const category = params?.category?.trim();
  const search = params?.search?.trim().toLowerCase();

  const filtered = events.filter((event) => {
    if (category && category !== 'Semua' && event.category.toLowerCase() !== category.toLowerCase()) {
      return false;
    }
    if (search) {
      const haystack = `${event.title} ${event.category} ${event.venueName} ${event.city} ${event.organizerName}`.toLowerCase();
      return haystack.includes(search);
    }
    return true;
  });

  return {
    items: filtered,
    events: filtered,
    total: filtered.length,
    totalEvents: filtered.length,
    platformFeePerTicket: PLATFORM_FEE_PER_TICKET,
  };
}

export function findLocalOrderOrTicket(code: string) {
  const normalized = code.trim().toUpperCase();
  const orders = getOrdersStore();
  for (const order of orders) {
    if (order.orderCode.toUpperCase() === normalized) {
      return { type: 'ORDER' as const, order, ticket: order.tickets[0] ?? null };
    }
    const matchedTicket = order.tickets.find((t) => t.ticketCode.toUpperCase() === normalized);
    if (matchedTicket) {
      return { type: 'TICKET' as const, order, ticket: matchedTicket };
    }
  }
  return null;
}

export function checkoutLocalOrder(payload: {
  eventSlug: string;
  tierId: string;
  quantity: number;
  buyerName: string;
  buyerEmail: string;
  buyerWhatsapp: string;
  paymentMethod?: string;
}) {
  const events = getEventsStore();
  const orders = getOrdersStore();

  const event = events.find((e) => e.slug === payload.eventSlug || e.id === payload.eventSlug);
  if (!event) {
    throw new Error(`Event "${payload.eventSlug}" tidak ditemukan.`);
  }
  const tier = event.tiers.find((t) => t.id === payload.tierId);
  if (!tier) {
    throw new Error('Kategori tiket tidak ditemukan.');
  }
  const quantity = Math.max(1, Math.min(10, Number(payload.quantity) || 1));
  if (tier.remainingQuota < quantity) {
    throw new Error(`Kuota tiket "${tier.name}" tersisa ${tier.remainingQuota} tiket.`);
  }

  tier.soldCount += quantity;
  tier.remainingQuota = Math.max(0, tier.quota - tier.soldCount);
  tier.statusLabel = tier.remainingQuota === 0 ? 'HABIS' : tier.remainingQuota <= 15 ? 'HAMPIR HABIS' : 'TERSEDIA';

  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const orderCode = `ORD-IRV-2026-${randomDigits}`;
  const subtotalAmount = tier.price * quantity;
  const serviceFeeAmount = tier.price > 0 ? PLATFORM_FEE_PER_TICKET * quantity : 0;
  const totalAmount = subtotalAmount + serviceFeeAmount;

  const tickets: IssuedTicketRecord[] = Array.from({ length: quantity }, (_, idx) => {
    const ticketCode = `IRV-TKT-2026-${randomDigits}${quantity > 1 ? `-${idx + 1}` : ''}`;
    return {
      id: `tkt-${Date.now()}-${idx + 1}`,
      ticketCode,
      qrPayload: `IRVITE-TICKET|${ticketCode}|${event.id}|${tier.id}`,
      orderCode,
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      eventDate: event.eventDate,
      eventTime: event.eventTime,
      venueName: `${event.venueName}, ${event.city}`,
      tierId: tier.id,
      tierName: tier.name,
      holderName: idx === 0 ? payload.buyerName.trim() : `${payload.buyerName.trim()} (Tamu #${idx + 1})`,
      holderEmail: payload.buyerEmail.trim().toLowerCase(),
      status: 'ISSUED',
      checkedInAt: null,
      checkedInGate: null,
    };
  });

  const newOrder: TicketOrderRecord = {
    id: `ord-${Date.now()}`,
    orderCode,
    eventId: event.id,
    eventSlug: event.slug,
    eventTitle: event.title,
    buyerName: payload.buyerName.trim(),
    buyerEmail: payload.buyerEmail.trim().toLowerCase(),
    buyerWhatsapp: payload.buyerWhatsapp.trim(),
    paymentMethod: payload.paymentMethod?.trim() || 'QRIS Instan',
    quantity,
    subtotalAmount,
    serviceFeeAmount,
    totalAmount,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    tickets,
  };

  orders.unshift(newOrder);
  return {
    message: 'Pembelian berhasil! E-Ticket telah diterbitkan dan dikirim ke email serta WhatsApp Anda.',
    order: newOrder,
  };
}

export function correctLocalOrderEmail(payload: {
  lookupCode: string;
  newEmail: string;
  correctedBy?: string;
}) {
  const newEmail = payload.newEmail?.trim().toLowerCase();
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    throw new Error('Format alamat email baru tidak valid.');
  }
  const found = findLocalOrderOrTicket(payload.lookupCode || '');
  if (!found) {
    throw new Error(`Kode tiket atau pesanan "${payload.lookupCode}" tidak ditemukan.`);
  }
  const previousEmail = found.order.buyerEmail;
  found.order.buyerEmail = newEmail;
  for (const ticket of found.order.tickets) {
    ticket.holderEmail = newEmail;
  }

  return {
    status: 'RESENT_SUCCESS' as const,
    lookupCode: payload.lookupCode.trim().toUpperCase(),
    orderCode: found.order.orderCode,
    ticketCodes: found.order.tickets.map((t) => t.ticketCode),
    buyerName: found.order.buyerName,
    eventTitle: found.order.eventTitle,
    previousEmail,
    updatedEmail: newEmail,
    correctedBy: payload.correctedBy?.trim() || 'Self-Service Buyer Portal',
    correctedAt: new Date().toISOString(),
    message: `Alamat email untuk pesanan ${found.order.orderCode} berhasil diperbarui dari ${previousEmail} ke ${newEmail} dan E-Ticket telah dikirim ulang secara instan.`,
  };
}
