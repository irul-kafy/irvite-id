import type { RendererData } from '../../renderers/registry';

export const ROYAL_VELVET_DEMO_FIXTURE: RendererData = {
  event: {
    title: 'The Royal Wedding of Citra & Galih — Royal Velvet Nocturne',
    description:
      'Perayaan ikatan suci pernikahan Neng Citra Kirana, S.Ars. & Kang Galih Prakoso, M.B.A. bergaya keanggunan klasik Royal Baroque.',
    eventDate: '2027-02-14T08:00:00+07:00',
    locationDetails:
      'The Grand Heritage Glasshouse, Jl. Jenderal Sudirman Kav. 52-53, Senayan, Jakarta Selatan',
    content: {
      _schemaVersion: 1,
      partnerOneName: 'Citra',
      partnerTwoName: 'Galih',
      partnerOneFullName: 'Neng Citra Kirana, S.Ars.',
      partnerTwoFullName: 'Kang Galih Prakoso, M.B.A.',
      partnerOneFamily:
        'Putri Pertama dari Bpk. Ir. H. Hendra Wijaya & Ibu Hj. Ratna Ningrum',
      partnerTwoFamily:
        'Putra Kedua dari Bpk. Drs. H. Suryo Prakoso & Ibu Hj. Dewi Sartika',
      timeZone: 'Asia/Jakarta',
      openingGreeting: 'Royal Celebration of Eternal Love',
      openingText:
        'Assalamu’alaikum Warahmatullahi Wabarakatuh • Salam Sejahtera Bagi Kita Semua',
      quote:
        '“Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.” (QS. Ar-Rum: 21)',
      prayer:
        'Dengan memohon rahmat dan ridho Tuhan Yang Maha Esa, kami mengundang Bapak/Ibu/Saudara/i untuk menyaksikan dan merestui ikatan suci pernikahan putra-putri kami:',
      prayerSource: 'Surah Ar-Rum: 21',
      closingMessage:
        'Merupakan suatu kehormatan dan kebahagiaan yang mendalam bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu kepada kedua mempelai. Atas kehadiran serta doa restu yang tulus, kami haturkan terima kasih.',
      ceremonies: [
        {
          title: 'Akad Nikah / Upacara Utama',
          startDateTime: '2027-02-14T08:00:00+07:00',
          endDateTime: '2027-02-14T10:00:00+07:00',
          venue: 'Grand Heritage Glasshouse — Senayan',
          address:
            'Jl. Jenderal Sudirman Kav. 52-53, Senayan, Kebayoran Baru, Jakarta Selatan',
          mapsUrl:
            'https://maps.google.com/?q=Jl.+Jenderal+Sudirman+Kav+52-53+Jakarta+Selatan',
        },
        {
          title: 'Royal Evening Reception',
          startDateTime: '2027-02-14T18:30:00+07:00',
          endDateTime: '2027-02-14T21:30:00+07:00',
          venue: 'The Imperial Ballroom — Dharmawangsa',
          address:
            'Jl. Brawijaya Raya No. 26, Kebayoran Baru, Jakarta Selatan',
          mapsUrl:
            'https://maps.google.com/?q=Jl.+Brawijaya+Raya+No.+26+Kebayoran+Baru+Jakarta+Selatan',
        },
      ],
      story: [
        {
          year: '2022',
          title: 'Simfoni Pertemuan Pertama',
          description:
            'Takdir mempertemukan langkah kami di sebuah malam pameran seni klasik Jakarta. Percakapan hangat tentang karya dan mimpi menjadi awal dari segalanya.',
        },
        {
          year: '2024',
          title: 'Merajut Janji Setia',
          description:
            'Dua musim berlalu dengan saling menguatkan dan memahami. Kami belajar bahwa cinta sejati tumbuh dari ketulusan dan rasa saling menghargai.',
        },
        {
          year: '2026',
          title: 'Pertemuan Dua Keluarga',
          description:
            'Dalam suasana khidmat penuh kehangatan, kedua keluarga besar bersatu memberikan restu bagi langkah kami menuju ikatan suci.',
        },
        {
          year: '2027',
          title: 'Bahtera Suci Abadi',
          description:
            'Hari yang dinanti akhirnya tiba. Di bawah naungan doa restu keluarga dan sahabat, kami mengikrarkan janji sehidup semati.',
        },
      ],
      giftTitle: 'Tanda Kasih Digital',
      giftMessage:
        'Kehadiran serta doa restu Bapak/Ibu/Saudara/i merupakan anugerah terindah bagi kami. Namun apabila bermaksud mengirimkan tanda kasih, dapat melalui rekening berikut:',
      giftAccounts: [
        {
          bankName: 'BCA',
          accountNumber: '8720194821',
          accountHolder: 'Neng Citra Kirana',
        },
        {
          bankName: 'Bank Mandiri',
          accountNumber: '1240098765432',
          accountHolder: 'Kang Galih Prakoso',
        },
      ],
    },
  },
  template: {
    themeCode: 'ROYAL_VELVET',
    config: {
      accent: '#E5C88E',
    },
  },
  media: [
    {
      id: 'demo-hero',
      slot: 'hero',
      src: '/templates/royal-velvet/photo-hero.webp',
      type: 'PHOTO',
      order: 0,
    },
    {
      id: 'demo-bride',
      slot: 'bride',
      src: '/templates/royal-velvet/photo-bride.webp',
      type: 'PHOTO',
      order: 1,
    },
    {
      id: 'demo-groom',
      slot: 'groom',
      src: '/templates/royal-velvet/photo-groom.webp',
      type: 'PHOTO',
      order: 2,
    },
    {
      id: 'demo-story',
      slot: 'story',
      src: '/templates/royal-velvet/photo-story.webp',
      type: 'PHOTO',
      order: 3,
    },
    {
      id: 'demo-gallery-1',
      slot: 'gallery',
      src: '/templates/royal-velvet/gallery-1.webp',
      type: 'PHOTO',
      order: 4,
    },
    {
      id: 'demo-gallery-2',
      slot: 'gallery',
      src: '/templates/royal-velvet/gallery-2.webp',
      type: 'PHOTO',
      order: 5,
    },
    {
      id: 'demo-gallery-3',
      slot: 'gallery',
      src: '/templates/royal-velvet/gallery-3.webp',
      type: 'PHOTO',
      order: 6,
    },
    {
      id: 'demo-gallery-4',
      slot: 'gallery',
      src: '/templates/royal-velvet/gallery-4.webp',
      type: 'PHOTO',
      order: 7,
    },
    {
      id: 'demo-gallery-5',
      slot: 'gallery',
      src: '/templates/royal-velvet/gallery-5.webp',
      type: 'PHOTO',
      order: 8,
    },
    {
      id: 'demo-gallery-6',
      slot: 'gallery',
      src: '/templates/royal-velvet/gallery-6.webp',
      type: 'PHOTO',
      order: 9,
    },
    {
      id: 'demo-music',
      slot: 'bg-music',
      src: '/templates/royal-velvet/bg-music.mp3',
      type: 'AUDIO',
      order: 10,
    },
  ],
  mediaBySlot: {
    hero: [
      {
        id: 'demo-hero',
        slot: 'hero',
        src: '/templates/royal-velvet/photo-hero.webp',
        type: 'PHOTO',
        order: 0,
      },
    ],
    bride: [
      {
        id: 'demo-bride',
        slot: 'bride',
        src: '/templates/royal-velvet/photo-bride.webp',
        type: 'PHOTO',
        order: 1,
      },
    ],
    groom: [
      {
        id: 'demo-groom',
        slot: 'groom',
        src: '/templates/royal-velvet/photo-groom.webp',
        type: 'PHOTO',
        order: 2,
      },
    ],
    story: [
      {
        id: 'demo-story',
        slot: 'story',
        src: '/templates/royal-velvet/photo-story.webp',
        type: 'PHOTO',
        order: 3,
      },
    ],
    gallery: [
      {
        id: 'demo-gallery-1',
        slot: 'gallery',
        src: '/templates/royal-velvet/gallery-1.webp',
        type: 'PHOTO',
        order: 0,
      },
      {
        id: 'demo-gallery-2',
        slot: 'gallery',
        src: '/templates/royal-velvet/gallery-2.webp',
        type: 'PHOTO',
        order: 1,
      },
      {
        id: 'demo-gallery-3',
        slot: 'gallery',
        src: '/templates/royal-velvet/gallery-3.webp',
        type: 'PHOTO',
        order: 2,
      },
      {
        id: 'demo-gallery-4',
        slot: 'gallery',
        src: '/templates/royal-velvet/gallery-4.webp',
        type: 'PHOTO',
        order: 3,
      },
      {
        id: 'demo-gallery-5',
        slot: 'gallery',
        src: '/templates/royal-velvet/gallery-5.webp',
        type: 'PHOTO',
        order: 4,
      },
      {
        id: 'demo-gallery-6',
        slot: 'gallery',
        src: '/templates/royal-velvet/gallery-6.webp',
        type: 'PHOTO',
        order: 5,
      },
    ],
    'bg-music': [
      {
        id: 'demo-music',
        slot: 'bg-music',
        src: '/templates/royal-velvet/bg-music.mp3',
        type: 'AUDIO',
        order: 0,
      },
    ],
  },
};
