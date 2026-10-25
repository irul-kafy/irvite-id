import type { RendererData } from '../../renderers/registry';

export const OPALINE_NOCTURNE_DEMO_FIXTURE: RendererData = {
  event: {
    title: 'The Wedding Celebration of Anindya & Rafi',
    description: 'Undangan Pernikahan Enchanted Woodland Anindya Kirana & Rafi Adhitama',
    eventDate: '2026-12-20T16:00:00+07:00',
    locationDetails: 'The Enchanted Conservatory, Lembang, Bandung, Jawa Barat',
    content: {
      _schemaVersion: 1,
      partnerOneName: 'Anindya',
      partnerTwoName: 'Rafi',
      partnerOneFullName: 'Anindya Kirana, S.Ds.',
      partnerTwoFullName: 'Rafi Adhitama, S.T.',
      partnerOneFamily: 'Putri dari Bapak Aditya Pratama\ndan Ibu Ratih Permatasari',
      partnerTwoFamily: 'Putra dari Bapak Hendra Wijaya\ndan Ibu Laras Kusuma',
      timeZone: 'Asia/Jakarta',
      openingText:
        'Di bawah naungan malam yang hening dan kilau bintang, kami mengundang Anda untuk merayakan babak baru kisah kami.',
      statement: 'Dua perjalanan, satu tujuan. Di antara gemerisik dedaunan dan temaram malam, kami menemukan rumah.',
      prayer:
        'Ya Allah, jadikanlah cinta ini setenang malam yang damai, seteguh pepohonan rimba, dan seindah cahaya fajar.',
      prayerSource: 'Doa kami untuk awal yang baru',
      closingMessage:
        'Kehadiran dan doa restu Anda adalah pelita terindah bagi langkah perjalanan kami ke depan.',
      ceremonies: [
        {
          title: 'Pemberkatan & Akad',
          startDateTime: '2026-12-20T16:00',
          endDateTime: '2026-12-20T17:30',
          venue: 'The Enchanted Glasshouse',
          address: 'Jl. Maribaya No. 120, Lembang, Bandung, Jawa Barat',
          mapsUrl: 'https://maps.google.com/?q=Lembang+Bandung',
        },
        {
          title: 'Nocturne Dinner & Reception',
          startDateTime: '2026-12-20T18:30',
          endDateTime: '2026-12-20T21:30',
          venue: 'The Pine Conservatory',
          address: 'Jl. Maribaya No. 120, Lembang, Bandung, Jawa Barat',
          mapsUrl: 'https://maps.google.com/?q=Lembang+Bandung',
        },
      ],
      story: [
        {
          year: '2021',
          title: 'Di Bawah Langit Temaram',
          description:
            'Sebuah pertemuan sederhana menjadi awal percakapan panjang yang tak pernah ingin kami akhiri.',
        },
        {
          year: '2026',
          title: 'Ikrar di Hening Hutan',
          description:
            'Setelah menyusuri rute panjang kehidupan, kami memilih untuk melangkah bersama selamanya.',
        },
      ],
      giftAccounts: [
        {
          bankName: 'Bank Central Asia (BCA)',
          accountNumber: '8830192831',
          accountHolder: 'Anindya Kirana',
        },
        {
          bankName: 'Bank Mandiri',
          accountNumber: '1370019283742',
          accountHolder: 'Rafi Adhitama',
        },
      ],
    },
  },
  template: {
    themeCode: 'OPALINE_NOCTURNE',
    config: {
      primaryColor: '#0b1d19',
      accentColor: '#52b788',
    },
  },
  media: [
    {
      id: 'demo-hero',
      type: 'PHOTO',
      slot: 'hero',
      order: 0,
      src: '/templates/opaline-nocturne/images/couple-evening.webp',
    },
    {
      id: 'demo-closing',
      type: 'PHOTO',
      slot: 'closing',
      order: 0,
      src: '/templates/opaline-nocturne/images/closing.webp',
    },
    {
      id: 'demo-story',
      type: 'PHOTO',
      slot: 'story',
      order: 0,
      src: '/templates/opaline-nocturne/images/enchanted-forest.webp',
    },
    {
      id: 'demo-gallery-0',
      type: 'PHOTO',
      slot: 'gallery',
      order: 0,
      src: '/templates/opaline-nocturne/images/couple-evening.webp',
    },
    {
      id: 'demo-gallery-1',
      type: 'PHOTO',
      slot: 'gallery',
      order: 1,
      src: '/templates/opaline-nocturne/images/enchanted-forest.webp',
    },
    {
      id: 'demo-gallery-2',
      type: 'PHOTO',
      slot: 'gallery',
      order: 2,
      src: '/templates/opaline-nocturne/images/nocturne-garden.webp',
    },
    {
      id: 'demo-gallery-3',
      type: 'PHOTO',
      slot: 'gallery',
      order: 3,
      src: '/templates/opaline-nocturne/images/closing.webp',
    },
  ],
  mediaBySlot: {
    hero: [
      {
        id: 'demo-hero',
        type: 'PHOTO',
        slot: 'hero',
        order: 0,
        src: '/templates/opaline-nocturne/images/couple-evening.webp',
      },
    ],
    closing: [
      {
        id: 'demo-closing',
        type: 'PHOTO',
        slot: 'closing',
        order: 0,
        src: '/templates/opaline-nocturne/images/closing.webp',
      },
    ],
    story: [
      {
        id: 'demo-story',
        type: 'PHOTO',
        slot: 'story',
        order: 0,
        src: '/templates/opaline-nocturne/images/enchanted-forest.webp',
      },
    ],
    gallery: [
      {
        id: 'demo-gallery-0',
        type: 'PHOTO',
        slot: 'gallery',
        order: 0,
        src: '/templates/opaline-nocturne/images/couple-evening.webp',
      },
      {
        id: 'demo-gallery-1',
        type: 'PHOTO',
        slot: 'gallery',
        order: 1,
        src: '/templates/opaline-nocturne/images/enchanted-forest.webp',
      },
      {
        id: 'demo-gallery-2',
        type: 'PHOTO',
        slot: 'gallery',
        order: 2,
        src: '/templates/opaline-nocturne/images/nocturne-garden.webp',
      },
      {
        id: 'demo-gallery-3',
        type: 'PHOTO',
        slot: 'gallery',
        order: 3,
        src: '/templates/opaline-nocturne/images/closing.webp',
      },
    ],
  },
};
