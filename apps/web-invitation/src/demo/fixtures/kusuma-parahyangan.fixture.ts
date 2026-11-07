import type { RendererData } from '../../renderers/registry';

export const KUSUMA_PARAHYANGAN_DEMO_FIXTURE: RendererData = {
  event: {
    title: 'Pawiwahan Citra Kirana & Galih Prakoso',
    description: 'Undangan Pawiwahan Adat Sunda Neng Citra Kirana, S.Ars. & Kang Galih Prakoso, M.B.A.',
    eventDate: '2027-02-14T08:00:00+07:00',
    locationDetails: 'Bale Julang Ngapak Parahyangan, Dago Pakar, Bandung',
    content: {
      _schemaVersion: 1,
      partnerOneName: 'Neng Citra',
      partnerTwoName: 'Kang Galih',
      partnerOneFullName: 'Neng Citra Kirana, S.Ars.',
      partnerTwoFullName: 'Kang Galih Prakoso, M.B.A.',
      partnerOneFamily:
        'Putri Cikal ti Pasangan Bapak H. Dedi Kusnandar & Ibu Hj. Ratna Ningrum (Kulawarga Ageng Sumedang Larang & Bandung)',
      partnerTwoFamily:
        'Putra Kadua ti Pasangan Bapak Ir. H. Suryono Wibowo & Ibu Hj. Dewi Sartika (Kulawarga Ageng Galuh Ciamis & Bogor)',
      timeZone: 'Asia/Jakarta',
      openingGreeting:
        'Silih asih, silih asah, silih asuh — ngambah sagara rumah tangga dina panangtayungan Gusti.',
      openingText:
        'Dengan memohon rahmat dan ridho Allah SWT, serta menjunjung tinggi nilai luhur budaya Tatar Pasundan, kami bermaksud menyelenggarakan syukuran pernikahan putra-putri kami.',
      quote:
        'Silih asih, silih asah, silih asuh — ngambah sagara rumah tangga dina panangtayungan Gusti.',
      prayer:
        'Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.',
      closing:
        'Kehadiran serta doa restu Bapak/Ibu/Saderek merupakan kado terindah bagi perjalanan awal bahtera rumah tangga kami. Hatur nuhun pisan kana sagala kasaean sareng perhatosanana.',
      ceremonies: [
        {
          title: 'Akad Nikah',
          startDateTime: '2027-02-14T08:00',
          endDateTime: '2027-02-14T10:00',
          venue: 'Bale Julang Ngapak Parahyangan',
          address:
            'Jl. Raya Resort Dago Pakar No. 88, Ciburial, Kec. Cimenyan, Kabupaten Bandung, Jawa Barat 40198',
          mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Dago+Pakar+Bandung',
        },
        {
          title: 'Resepsi Pernikahan',
          startDateTime: '2027-02-14T11:30',
          endDateTime: '2027-02-14T14:30',
          venue: 'Pendopo Agung Julang Ngapak, Bandung',
          address:
            'Jl. Raya Resort Dago Pakar No. 88, Ciburial, Kec. Cimenyan, Kabupaten Bandung, Jawa Barat 40198',
          mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Dago+Pakar+Bandung',
        },
      ],
      giftTitle: 'Kirimkan Tanda Kasih',
      giftMessage:
        'Doa restu Anda merupakan karunia terindah bagi kami. Namun apabila Anda ingin memberikan tanda kasih secara digital, dapat melalui rekening berikut:',
      giftAccounts: [
        {
          bankName: 'BANK CENTRAL ASIA (BCA)',
          accountNumber: '7740 9182 33',
          accountHolder: 'Citra Kirana',
        },
        {
          bankName: 'BANK MANDIRI',
          accountNumber: '1310 0982 7411 2',
          accountHolder: 'Galih Prakoso',
        },
      ],
    },
  },
  template: {
    themeCode: 'KUSUMA_PARAHYANGAN',
    config: {
      primaryColor: '#4a2c18',
      accentColor: '#d49b35',
      backgroundColor: '#fcf8f2',
      textColor: '#2b1b10',
    },
  },
  media: [
    {
      id: 'demo-hero',
      type: 'PHOTO',
      slot: 'hero',
      order: 0,
      src: '/templates/kusuma-parahyangan/couple-sunda-demo.webp',
    },
    {
      id: 'demo-bride',
      type: 'PHOTO',
      slot: 'bride',
      order: 0,
      src: '/templates/kusuma-parahyangan/bride-sunda-demo.webp',
    },
    {
      id: 'demo-groom',
      type: 'PHOTO',
      slot: 'groom',
      order: 0,
      src: '/templates/kusuma-parahyangan/groom-sunda-demo.webp',
    },
    {
      id: 'demo-gallery-0',
      type: 'PHOTO',
      slot: 'gallery',
      order: 0,
      src: '/templates/kusuma-parahyangan/gallery-1.webp',
    },
    {
      id: 'demo-gallery-1',
      type: 'PHOTO',
      slot: 'gallery',
      order: 1,
      src: '/templates/kusuma-parahyangan/gallery-2.webp',
    },
    {
      id: 'demo-gallery-2',
      type: 'PHOTO',
      slot: 'gallery',
      order: 2,
      src: '/templates/kusuma-parahyangan/gallery-3.webp',
    },
    {
      id: 'demo-gallery-3',
      type: 'PHOTO',
      slot: 'gallery',
      order: 3,
      src: '/templates/kusuma-parahyangan/gallery-4.webp',
    },
  ],
  mediaBySlot: {
    hero: [
      {
        id: 'demo-hero',
        type: 'PHOTO',
        slot: 'hero',
        order: 0,
        src: '/templates/kusuma-parahyangan/couple-sunda-demo.webp',
      },
    ],
    bride: [
      {
        id: 'demo-bride',
        type: 'PHOTO',
        slot: 'bride',
        order: 0,
        src: '/templates/kusuma-parahyangan/bride-sunda-demo.webp',
      },
    ],
    groom: [
      {
        id: 'demo-groom',
        type: 'PHOTO',
        slot: 'groom',
        order: 0,
        src: '/templates/kusuma-parahyangan/groom-sunda-demo.webp',
      },
    ],
    gallery: [
      {
        id: 'demo-gallery-0',
        type: 'PHOTO',
        slot: 'gallery',
        order: 0,
        src: '/templates/kusuma-parahyangan/gallery-1.webp',
      },
      {
        id: 'demo-gallery-1',
        type: 'PHOTO',
        slot: 'gallery',
        order: 1,
        src: '/templates/kusuma-parahyangan/gallery-2.webp',
      },
      {
        id: 'demo-gallery-2',
        type: 'PHOTO',
        slot: 'gallery',
        order: 2,
        src: '/templates/kusuma-parahyangan/gallery-3.webp',
      },
      {
        id: 'demo-gallery-3',
        type: 'PHOTO',
        slot: 'gallery',
        order: 3,
        src: '/templates/kusuma-parahyangan/gallery-4.webp',
      },
    ],
  },
};
