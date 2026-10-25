import type { RendererData } from '../../renderers/registry';

export const AETHERIA_DEMO_FIXTURE: RendererData = {
  event: {
    title: 'The Wedding Celebration of Lyra & Elian',
    description: 'Undangan Pernikahan Aetheria Celestial Fantasy Lyra Adeline & Elian Mahendra',
    eventDate: '2027-06-20T16:00:00+07:00',
    locationDetails: 'The Glasshouse, Ciumbuleuit, Bandung, Jawa Barat',
    content: {
      _schemaVersion: 1,
      partnerOneName: 'Lyra',
      partnerTwoName: 'Elian',
      partnerOneFullName: 'Lyra Adeline, S.Ars.',
      partnerTwoFullName: 'Elian Mahendra, M.Sc.',
      partnerOneFamily: 'Putri dari Bapak Arya Pranata\ndan Ibu Laras Kirana',
      partnerTwoFamily: 'Putra dari Bapak Surya Mahendra\ndan Ibu Maya Andriani',
      timeZone: 'Asia/Jakarta',
      openingText:
        'Di bawah langit yang sama, dua perjalanan menemukan satu rumah. Dengan penuh kebahagiaan, kami mengundang Anda menjadi bagian dari awal kisah kami.',
      statement: 'Di dunia seluas apa pun, aku akan selalu menemukanmu.',
      prayer:
        'Ya Tuhan, jadikan perjalanan ini tempat kami saling menguatkan. Tumbuhkan kasih yang sabar, hati yang penuh syukur, dan keberanian untuk memilih satu sama lain, setiap hari.',
      prayerSource: 'Sebuah doa untuk perjalanan seumur hidup',
      closingMessage:
        'Cerita ini menjadi lebih indah karena Anda ada di dalamnya. Terima kasih untuk setiap doa, kasih, dan kehadiran yang menyertai langkah pertama kami.',
      ceremonies: [
        {
          title: 'Pemberkatan',
          startDateTime: '2027-06-20T16:00',
          endDateTime: '2027-06-20T17:00',
          venue: 'The Glasshouse',
          address: 'Ciumbuleuit, Bandung, Jawa Barat',
          mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ciumbuleuit+Bandung',
        },
        {
          title: 'Resepsi Senja',
          startDateTime: '2027-06-20T18:30',
          endDateTime: '2027-06-20T21:00',
          venue: 'The Glasshouse Garden',
          address: 'Ciumbuleuit, Bandung, Jawa Barat',
          mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ciumbuleuit+Bandung',
        },
      ],
      story: [
        {
          year: '2022',
          title: 'Dua orbit bertemu',
          description:
            'Sebuah pertemuan sederhana membawa kami pada percakapan yang tidak ingin diakhiri. Tanpa disadari, dunia terasa sedikit lebih hangat.',
        },
        {
          year: '2025',
          title: 'Menemukan arah pulang',
          description:
            'Kami belajar mencintai bukan hanya pada hari yang mudah, tetapi juga saat jalan berliku. Bersama, setiap langkah terasa berarti.',
        },
        {
          year: '2027',
          title: 'Memilih selamanya',
          description:
            'Dari sekian banyak kemungkinan, kami memilih satu janji: berjalan bersama, merawat kasih, dan menulis cerita yang belum pernah ada.',
        },
      ],
      giftAccounts: [
        {
          bankName: 'Bank Central Asia (BCA)',
          accountNumber: '8830192831',
          accountHolder: 'Lyra Adeline',
        },
        {
          bankName: 'Bank Mandiri',
          accountNumber: '1370019283742',
          accountHolder: 'Elian Mahendra',
        },
      ],
    },
  },
  template: {
    themeCode: 'AETHERIA',
    config: {
      primaryColor: '#281b37',
      accentColor: '#efbfa3',
    },
  },
  media: [
    {
      id: 'demo-hero',
      type: 'PHOTO',
      slot: 'hero',
      order: 0,
      src: '/templates/aetheria/images/couple-garden.webp',
    },
    {
      id: 'demo-closing',
      type: 'PHOTO',
      slot: 'closing',
      order: 0,
      src: '/templates/aetheria/images/closing.webp',
    },
    {
      id: 'demo-story',
      type: 'PHOTO',
      slot: 'story',
      order: 0,
      src: '/templates/aetheria/images/couple.webp',
    },
    {
      id: 'demo-gallery-0',
      type: 'PHOTO',
      slot: 'gallery',
      order: 0,
      src: '/templates/aetheria/images/couple.webp',
    },
    {
      id: 'demo-gallery-1',
      type: 'PHOTO',
      slot: 'gallery',
      order: 1,
      src: '/templates/aetheria/images/couple-garden.webp',
    },
    {
      id: 'demo-gallery-2',
      type: 'PHOTO',
      slot: 'gallery',
      order: 2,
      src: '/templates/aetheria/images/bride-night.webp',
    },
    {
      id: 'demo-gallery-3',
      type: 'PHOTO',
      slot: 'gallery',
      order: 3,
      src: '/templates/aetheria/images/closing.webp',
    },
  ],
  mediaBySlot: {
    hero: [
      {
        id: 'demo-hero',
        type: 'PHOTO',
        slot: 'hero',
        order: 0,
        src: '/templates/aetheria/images/couple-garden.webp',
      },
    ],
    closing: [
      {
        id: 'demo-closing',
        type: 'PHOTO',
        slot: 'closing',
        order: 0,
        src: '/templates/aetheria/images/closing.webp',
      },
    ],
    story: [
      {
        id: 'demo-story',
        type: 'PHOTO',
        slot: 'story',
        order: 0,
        src: '/templates/aetheria/images/couple.webp',
      },
    ],
    gallery: [
      {
        id: 'demo-gallery-0',
        type: 'PHOTO',
        slot: 'gallery',
        order: 0,
        src: '/templates/aetheria/images/couple.webp',
      },
      {
        id: 'demo-gallery-1',
        type: 'PHOTO',
        slot: 'gallery',
        order: 1,
        src: '/templates/aetheria/images/couple-garden.webp',
      },
      {
        id: 'demo-gallery-2',
        type: 'PHOTO',
        slot: 'gallery',
        order: 2,
        src: '/templates/aetheria/images/bride-night.webp',
      },
      {
        id: 'demo-gallery-3',
        type: 'PHOTO',
        slot: 'gallery',
        order: 3,
        src: '/templates/aetheria/images/closing.webp',
      },
    ],
  },
};
