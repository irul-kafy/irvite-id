import * as crypto from 'crypto';
import {
  PrismaClient,
  Role,
  TicketEventStatus,
  TicketOrderStatus,
  IssuedTicketStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

function addDays(base: Date, days: number, hours = 19): Date {
  const result = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  result.setUTCHours(hours - 7, 0, 0, 0);
  return result;
}

function generateSecureCode(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function main() {
  const now = new Date();

  // 1. Ensure a fictional system organizer admin exists for seeded ticketing events
  let organizerUser = await prisma.user.findUnique({
    where: { email: 'seed.organizer@fiktif-irvite.local' },
  });

  if (!organizerUser) {
    organizerUser = await prisma.user.create({
      data: {
        email: 'seed.organizer@fiktif-irvite.local',
        passwordHash: 'seeded_non_interactive_account',
        role: Role.ADMIN,
        isActive: true,
      },
    });
  }

  // 2. Five fictional ticketing events (+7 to +60 days from seed time)
  // Includes:
  // - One sold-out tier (soldCount == quota)
  // - One not-yet-open tier (salesStartAt in the future)
  // - One free tier (price == 0)
  // - One event in DRAFT status
  const fictionalEvents = [
    {
      slug: 'panggung-senja-nusantara',
      title: 'Panggung Senja Nusantara',
      description:
        'Pertunjukan musik akustik dan kolaborasi seniman independen dengan tata panggung terbuka.',
      startAt: addDays(now, 7, 18),
      endAt: addDays(now, 7, 22),
      venue: 'Arena Terbuka Taman Lembayung',
      city: 'Jakarta Selatan',
      category: 'Konser Musik',
      organizerName: 'Kolektif Suara Senja',
      bannerUrl: '/images/banners/panggung-senja.webp',
      taxRatePercent: 0,
      taxIncluded: true,
      serviceFee: 3000,
      ticketStatus: TicketEventStatus.PUBLISHED,
      status: 'PUBLISHED',
      tiers: [
        {
          name: 'Gelombang awal (Habis)',
          description: 'Kuota harga khusus gelombang pertama telah terjual habis.',
          price: 85000,
          quota: 100,
          soldCount: 100, // Sold-out tier
          salesStartAt: addDays(now, -14, 9),
          salesEndAt: addDays(now, -1, 23),
          maxPerOrder: 4,
          sortOrder: 1,
          benefits: ['Akses area utama', 'Tiket digital kode QR'],
        },
        {
          name: 'Tiket masuk reguler',
          description: 'Akses area penonton utama dan kode QR masuk gerbang.',
          price: 120000,
          quota: 300,
          soldCount: 2,
          salesStartAt: addDays(now, -7, 9),
          salesEndAt: addDays(now, 7, 17),
          maxPerOrder: 6,
          sortOrder: 2,
          benefits: ['Akses area utama', 'Tiket digital kode QR'],
        },
        {
          name: 'Tiket akses depan panggung',
          description: 'Area berdiri dekat panggung utama dan jalur antrean khusus.',
          price: 240000,
          quota: 100,
          soldCount: 0,
          salesStartAt: addDays(now, -7, 9),
          salesEndAt: addDays(now, 7, 17),
          maxPerOrder: 4,
          sortOrder: 3,
          benefits: ['Jalur masuk khusus', 'Area depan panggung', 'Gelang penanda tamu'],
        },
      ],
    },
    {
      slug: 'forum-rekayasa-perangkat-lunak',
      title: 'Forum Rekayasa Perangkat Lunak Mandiri',
      description:
        'Diskusi arsitektur sistem terdistribusi, keamanan aplikasi, dan pengujian perangkat lunak.',
      startAt: addDays(now, 18, 9),
      endAt: addDays(now, 18, 16),
      venue: 'Balai Pertemuan Cakrawala',
      city: 'Bandung',
      category: 'Seminar & Edukasi',
      organizerName: 'Lingkar Studi Teknologi Mandiri',
      bannerUrl: '/images/banners/forum-rekayasa.webp',
      taxRatePercent: 11,
      taxIncluded: false,
      serviceFee: 3000,
      ticketStatus: TicketEventStatus.PUBLISHED,
      status: 'PUBLISHED',
      tiers: [
        {
          name: 'Peserta umum',
          description: 'Akses seluruh sesi diskusi dan materi presentasi digital.',
          price: 150000,
          quota: 250,
          soldCount: 0,
          salesStartAt: addDays(now, -5, 8),
          salesEndAt: addDays(now, 17, 23),
          maxPerOrder: 5,
          sortOrder: 1,
          benefits: ['Akses seluruh sesi', 'Materi digital', 'Sertifikat kehadiran'],
        },
        {
          name: 'Sesi diskusi malam eksklusif (Belum dibuka)',
          description: 'Tiket sesi makan malam dan tanya jawab mendalam bersama narasumber.',
          price: 300000,
          quota: 40,
          soldCount: 0,
          salesStartAt: addDays(now, 5, 10), // Not-yet-open tier (opens in +5 days)
          salesEndAt: addDays(now, 17, 23),
          maxPerOrder: 2,
          sortOrder: 2,
          benefits: ['Meja diskusi khusus', 'Makan malam', 'Materi cetak'],
        },
      ],
    },
    {
      slug: 'temu-komunitas-desain-terbuka',
      title: 'Temu Komunitas Desain Antarmuka Terbuka',
      description:
        'Pertemuan terbuka bagi perancang antarmuka untuk berbagi studi kasus aksesibilitas web.',
      startAt: addDays(now, 30, 13),
      endAt: addDays(now, 30, 17),
      venue: 'Ruang Kreasi Gedung Merpati',
      city: 'Surabaya',
      category: 'Workshop',
      organizerName: 'Studio Rancang Antarmuka',
      bannerUrl: '/images/banners/temu-desain.webp',
      taxRatePercent: 0,
      taxIncluded: true,
      serviceFee: 0,
      ticketStatus: TicketEventStatus.PUBLISHED,
      status: 'PUBLISHED',
      tiers: [
        {
          name: 'Tiket komunitas gratis',
          description: 'Tiket masuk tanpa biaya bagi anggota komunitas dengan registrasi kode QR.',
          price: 0, // Free tier
          quota: 150,
          soldCount: 0,
          salesStartAt: addDays(now, -3, 8),
          salesEndAt: addDays(now, 29, 23),
          maxPerOrder: 2,
          sortOrder: 1,
          benefits: ['Akses ruang diskusi', 'Tiket digital kode QR'],
        },
        {
          name: 'Kursi lokakarya praktik',
          description: 'Sesi latihan terbimbing beserta berkas komponen latihan.',
          price: 95000,
          quota: 60,
          soldCount: 0,
          salesStartAt: addDays(now, -3, 8),
          salesEndAt: addDays(now, 29, 23),
          maxPerOrder: 4,
          sortOrder: 2,
          benefits: ['Berkas komponen desain', 'Ulasan karya peserta'],
        },
      ],
    },
    {
      slug: 'malam-jenaka-panggung-kota',
      title: 'Malam Jenaka Panggung Kota',
      description:
        'Pertunjukan komedi tunggal akhir pekan bersama penampil komedi panggung.',
      startAt: addDays(now, 45, 19),
      endAt: addDays(now, 45, 22),
      venue: 'Teater Kecil Sanggar Purnama',
      city: 'Yogyakarta',
      category: 'Standup Comedy',
      organizerName: 'Sanggar Komedi Purnama',
      bannerUrl: '/images/banners/malam-jenaka.webp',
      taxRatePercent: 10,
      taxIncluded: true,
      serviceFee: 3000,
      ticketStatus: TicketEventStatus.PUBLISHED,
      status: 'PUBLISHED',
      tiers: [
        {
          name: 'Kursi tribun tengah',
          description: 'Tempat duduk bernomor di area tengah teater.',
          price: 110000,
          quota: 180,
          soldCount: 0,
          salesStartAt: addDays(now, -2, 10),
          salesEndAt: addDays(now, 45, 18),
          maxPerOrder: 4,
          sortOrder: 1,
          benefits: ['Kursi bernomor', 'Tiket digital kode QR'],
        },
      ],
    },
    {
      slug: 'gelar-karya-sinema-mandiri',
      title: 'Gelar Karya Sinema Mandiri',
      description:
        'Pemutaran karya film pendek independen dan diskusi tata sinematografi.',
      startAt: addDays(now, 60, 15),
      endAt: addDays(now, 60, 21),
      venue: 'Auditorium Layar Sentosa',
      city: 'Semarang',
      category: 'Seminar & Edukasi',
      organizerName: 'Lembaga Apresiasi Sinema Nusantara',
      bannerUrl: '/images/banners/sinema-mandiri.webp',
      taxRatePercent: 0,
      taxIncluded: true,
      serviceFee: 3000,
      ticketStatus: TicketEventStatus.DRAFT, // DRAFT event
      status: 'DRAFT',
      tiers: [
        {
          name: 'Tiket pemutaran sesi sore',
          description: 'Akses pemutaran tiga film pendek dan sesi diskusi sutradara.',
          price: 75000,
          quota: 120,
          soldCount: 0,
          salesStartAt: addDays(now, 10, 9),
          salesEndAt: addDays(now, 60, 14),
          maxPerOrder: 4,
          sortOrder: 1,
          benefits: ['Kursi auditorium', 'Katalog film digital'],
        },
      ],
    },
  ];

  for (const item of fictionalEvents) {
    const existing = await prisma.event.findUnique({ where: { slug: item.slug } });
    if (existing) {
      continue;
    }

    const createdEvent = await prisma.event.create({
      data: {
        userId: organizerUser.id,
        title: item.title,
        slug: item.slug,
        description: item.description,
        eventDate: item.startAt,
        startAt: item.startAt,
        endAt: item.endAt,
        venue: item.venue,
        city: item.city,
        category: item.category,
        organizerName: item.organizerName,
        bannerUrl: item.bannerUrl,
        taxRatePercent: item.taxRatePercent,
        taxIncluded: item.taxIncluded,
        serviceFee: item.serviceFee,
        ticketStatus: item.ticketStatus,
        status: item.status,
        locationDetails: `${item.venue}, ${item.city}`,
        content: {
          isTicketingEvent: true,
          category: item.category,
          organizerName: item.organizerName,
          venueName: item.venue,
          city: item.city,
          timeLabel: '18:00 - 22:00 WIB',
          bannerTag: item.category,
          isFeaturedBanner: item.ticketStatus === TicketEventStatus.PUBLISHED,
        },
        ticketTiers: {
          create: item.tiers.map((t) => ({
            name: t.name,
            description: t.description,
            price: t.price,
            quota: t.quota,
            soldCount: t.soldCount,
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

    // Seed one sample PAID order and one sample PENDING order on the first fictional event
    if (item.slug === 'panggung-senja-nusantara' && createdEvent.ticketTiers.length > 1) {
      const regularTier = createdEvent.ticketTiers[1];
      const paidOrderCode = generateSecureCode('ORD');
      const subtotal = regularTier.price * 2;
      const serviceFee = 6000;
      const taxAmount = 0;

      const paidOrder = await prisma.ticketOrder.create({
        data: {
          eventId: createdEvent.id,
          tierId: regularTier.id,
          orderCode: paidOrderCode,
          accessTokenHash: hashToken(paidOrderCode),
          buyerName: 'Damar Wijaya',
          buyerEmail: 'damar.wijaya@contoh-fiktif.id',
          buyerWhatsapp: '6281100001111',
          quantity: 2,
          unitPrice: regularTier.price,
          subtotal,
          serviceFee,
          taxAmount,
          totalAmount: subtotal + serviceFee + taxAmount,
          paymentMethod: 'QRIS',
          paymentReference: `PAY-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
          status: TicketOrderStatus.PAID,
          expiresAt: addDays(now, 1, 18),
          paidAt: now,
          issuedTickets: {
            create: [
              {
                eventId: createdEvent.id,
                tierId: regularTier.id,
                ticketCode: generateSecureCode('TKT'),
                attendeeName: 'Damar Wijaya',
                attendeeEmail: 'damar.wijaya@contoh-fiktif.id',
                status: IssuedTicketStatus.ISSUED,
              },
              {
                eventId: createdEvent.id,
                tierId: regularTier.id,
                ticketCode: generateSecureCode('TKT'),
                attendeeName: 'Saraswati Putri',
                attendeeEmail: 'damar.wijaya@contoh-fiktif.id',
                status: IssuedTicketStatus.ISSUED,
              },
            ],
          },
        },
      });

      const pendingOrderCode = generateSecureCode('ORD');
      await prisma.ticketOrder.create({
        data: {
          eventId: createdEvent.id,
          tierId: regularTier.id,
          orderCode: pendingOrderCode,
          accessTokenHash: hashToken(pendingOrderCode),
          buyerName: 'Bagas Prakoso',
          buyerEmail: 'bagas.prakoso@contoh-fiktif.id',
          buyerWhatsapp: '6281100002222',
          quantity: 1,
          unitPrice: regularTier.price,
          subtotal: regularTier.price,
          serviceFee: 3000,
          taxAmount: 0,
          totalAmount: regularTier.price + 3000,
          paymentMethod: 'QRIS',
          status: TicketOrderStatus.PENDING,
          expiresAt: addDays(now, 1, 18),
        },
      });

      console.log(`Seeded event "${createdEvent.title}" with sample order ${paidOrder.orderCode}`);
    }
  }

  // 3. Seed one sample fictional EO partnership inquiry
  const inquiryCount = await prisma.eoInquiry.count();
  if (inquiryCount === 0) {
    await prisma.eoInquiry.create({
      data: {
        inquiryCode: generateSecureCode('INQ'),
        organizerName: 'Komunitas Musik Lintas Kota',
        eventName: 'Festival Harmoni Musim Hujan',
        category: 'Konser Musik',
        estimatedAudience: '500 - 1000',
        contactName: 'Rangga Saputra',
        contactEmail: 'rangga@komunitas-fiktif.id',
        contactWhatsapp: '6281100003333',
        notes: 'Pengajuan pembuatan halaman penjualan tiket sistem terima beres.',
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Ticketing seed completed.');
  })
  .catch(async (err) => {
    console.error('Ticketing seed failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
