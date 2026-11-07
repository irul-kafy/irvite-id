import type { RendererData } from '../../renderers/registry';

export const SWARGA_DEWATA_DEMO_FIXTURE: RendererData = {
  event: {
    title: 'Pawiwahan Agung Ayu & Bagus — Swarga Dewata',
    description:
      'Karya Agung Manusa Yadnya Pawiwahan dr. Anak Agung Ayu Saraswati, S.Ked. & Tjokorda Gde Bagus Mahendra, M.Ars.',
    eventDate: '2026-10-18T08:00:00+08:00',
    locationDetails:
      'Puri Agung Ubud, Jl. Raya Ubud No. 88, Kecamatan Ubud, Kabupaten Gianyar, Bali',
    content: {
      _schemaVersion: 1,
      partnerOneName: 'Ayu',
      partnerTwoName: 'Bagus',
      partnerOneFullName: 'dr. Anak Agung Ayu Saraswati, S.Ked.',
      partnerTwoFullName: 'Tjokorda Gde Bagus Mahendra, M.Ars.',
      partnerOneFamily:
        'Putri Pertama dari Pasangan Anak Agung Gde Rai Dharmaputra & Jero Puspa Kemala Dewi — Puri Agung Ubud, Gianyar',
      partnerTwoFamily:
        'Putra Kedua dari Pasangan Tjokorda Raka Sudarsana & Anak Agung Istri Ratna Ningrum — Puri Agung Semarapura, Klungkung',
      timeZone: 'Asia/Makassar',
      openingGreeting: 'Om Swastyastu • Atas Asung Kertha Wara Nugraha',
      openingText:
        'Atas Asung Kertha Wara Nugraha Ida Sang Hyang Widhi Wasa / Tuhan Yang Maha Esa, perkenankan kami mengundang Bapak/Ibu/Saudara/i pada upacara suci Manusa Yadnya Pawiwahan putra-putri kami.',
      quote:
        'Ihaiva stam ma vi yaustam, visvam ayur vyasnutam, kridantau putrair naptrbhih, modamanau sve grhe.',
      prayer:
        'Wahai pasangan suami-istri, semoga kalian tetap bersatu dan tidak pernah terpisahkan. Semoga kalian mencapai hidup penuh kebahagiaan, bermain bersama anak-cucu, dan tinggal di rumah yang penuh kegembiraan.',
      prayerSource: 'Rgveda X.85.42 • Sloka Pawiwahan',
      closingMessage:
        'Merupakan suatu kehormatan dan kebahagiaan bagi keluarga besar kami apabila Bapak/Ibu/Saudara/i berkenan hadir untuk memberikan doa restu kepada kedua mempelai. Atas kehadiran dan doa restunya, kami haturkan terima kasih.',
      ceremonies: [
        {
          title: 'Upacara Mabyakala & Mejaya-Jaya',
          startDateTime: '2026-10-18T08:00:00+08:00',
          endDateTime: '2026-10-18T11:30:00+08:00',
          venue: 'Bale Gede Pemerajan Agung Puri Ubud',
          address:
            'Jl. Raya Ubud No. 88, Kecamatan Ubud, Kabupaten Gianyar, Bali',
          mapsUrl: 'https://maps.google.com/?q=Puri+Saren+Agung+Ubud+Bali',
        },
        {
          title: 'Resepsi Dharma Suaka Agung',
          startDateTime: '2026-10-18T17:00:00+08:00',
          endDateTime: '2026-10-18T21:30:00+08:00',
          venue: 'Wantilan Kencana & Taman Sanga Mandala Puri Ubud',
          address:
            'Jl. Raya Ubud No. 88, Kecamatan Ubud, Kabupaten Gianyar, Bali',
          mapsUrl: 'https://maps.google.com/?q=Puri+Saren+Agung+Ubud+Bali',
        },
      ],
      story: [
        {
          year: '2022',
          title: 'Pertemuan Pertama di Pelataran Puri',
          description:
            'Di bawah teduhnya beringin pelataran Puri Ubud, pandangan kami pertama kali bertemu dalam kehangatan upacara piodalan.',
        },
        {
          year: '2024',
          title: 'Menjalin Janji Suci Menuju Grihasta',
          description:
            'Menapaki bukit Campuhan bersama, mengikrarkan niat tulus menyatukan dua rasa dalam bimbingan dharma Hyang Widhi Wasa.',
        },
        {
          year: '2026',
          title: 'Pawiwahan Agung Swarga Dewata',
          description:
            'Mengikat janji suci lahir batin di hadapan keluarga besar dan para leluhur, melangkah menuju gerbang kehidupan baru.',
        },
      ],
      giftTitle: 'Prada Dana Kasih',
      giftMessage:
        'Kehadiran serta doa restu Bapak/Ibu/Saudara/i merupakan anugerah terindah bagi kami. Namun apabila bermaksud mengirimkan tanda kasih, dapat melalui rekening berikut:',
      giftAccounts: [
        {
          bankName: 'BCA',
          accountNumber: '7720918834',
          accountHolder: 'Tjokorda Gde Bagus Mahendra',
        },
        {
          bankName: 'Bank Mandiri',
          accountNumber: '1450028910442',
          accountHolder: 'dr. Anak Agung Ayu Saraswati',
        },
      ],
    },
  },
  template: {
    themeCode: 'SWARGA_DEWATA',
    config: {
      accent: '#E5B84B',
    },
  },
  media: [
    {
      id: 'demo-hero',
      slot: 'hero',
      src: '/templates/swarga-dewata/bali-photo-1.webp',
      type: 'PHOTO',
      order: 0,
    },
    {
      id: 'demo-bride',
      slot: 'bride',
      src: '/templates/swarga-dewata/bali-photo-2.webp',
      type: 'PHOTO',
      order: 1,
    },
    {
      id: 'demo-groom',
      slot: 'groom',
      src: '/templates/swarga-dewata/bali-photo-3.webp',
      type: 'PHOTO',
      order: 2,
    },
    {
      id: 'demo-story',
      slot: 'story',
      src: '/templates/swarga-dewata/bali-photo-4.webp',
      type: 'PHOTO',
      order: 3,
    },
    {
      id: 'demo-gallery-0',
      slot: 'gallery',
      src: '/templates/swarga-dewata/bali-photo-1.webp',
      type: 'PHOTO',
      order: 4,
    },
    {
      id: 'demo-gallery-1',
      slot: 'gallery',
      src: '/templates/swarga-dewata/bali-photo-2.webp',
      type: 'PHOTO',
      order: 4,
    },
    {
      id: 'demo-gallery-2',
      slot: 'gallery',
      src: '/templates/swarga-dewata/bali-photo-3.webp',
      type: 'PHOTO',
      order: 5,
    },
    {
      id: 'demo-gallery-3',
      slot: 'gallery',
      src: '/templates/swarga-dewata/bali-photo-0.webp',
      type: 'PHOTO',
      order: 6,
    },
  ],
  mediaBySlot: {
    hero: [
      {
        id: 'demo-hero',
        slot: 'hero',
        src: '/templates/swarga-dewata/bali-photo-1.webp',
        type: 'PHOTO',
        order: 0,
      },
    ],
    bride: [
      {
        id: 'demo-bride',
        slot: 'bride',
        src: '/templates/swarga-dewata/bali-photo-2.webp',
        type: 'PHOTO',
        order: 1,
      },
    ],
    groom: [
      {
        id: 'demo-groom',
        slot: 'groom',
        src: '/templates/swarga-dewata/bali-photo-3.webp',
        type: 'PHOTO',
        order: 2,
      },
    ],
    gallery: [
      {
        id: 'demo-gallery-0',
        slot: 'gallery',
        src: '/templates/swarga-dewata/bali-photo-1.webp',
        type: 'PHOTO',
        order: 3,
      },
      {
        id: 'demo-gallery-1',
        slot: 'gallery',
        src: '/templates/swarga-dewata/bali-photo-2.webp',
        type: 'PHOTO',
        order: 4,
      },
      {
        id: 'demo-gallery-2',
        slot: 'gallery',
        src: '/templates/swarga-dewata/bali-photo-3.webp',
        type: 'PHOTO',
        order: 5,
      },
      {
        id: 'demo-gallery-3',
        slot: 'gallery',
        src: '/templates/swarga-dewata/bali-photo-0.webp',
        type: 'PHOTO',
        order: 6,
      },
    ],
  },
};

