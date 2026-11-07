import type { RendererData } from '../../renderers/registry';

export const KUSUMA_PARAHYANGAN_DEMO_FIXTURE: RendererData = {
  event: {
    title: 'Pawiwahan Citra Kirana & Galih Prakoso',
    description: 'Undangan Pawiwahan Adat Sunda Citra Kirana, S.Ds. & Galih Prakoso, S.T.',
    eventDate: '2027-07-24T08:00:00+07:00',
    locationDetails: 'Bale Asri Pusdai Bandung, Kota Bandung, Jawa Barat',
    content: {
      _schemaVersion: 1,
      partnerOneName: 'Citra',
      partnerTwoName: 'Galih',
      partnerOneFullName: 'Citra Kirana, S.Ds.',
      partnerTwoFullName: 'Galih Prakoso, S.T.',
      partnerOneFamily: 'Putri bungsu ti Bapa Asep Hidayat & Ibu Nining Rustini',
      partnerTwoFamily: 'Putra cikal ti Bapa Dudung Suherman & Ibu Euis Kartini',
      timeZone: 'Asia/Jakarta',
      openingGreeting: 'Silih asih, silih asah, silih asuh',
      openingText:
        'Kalayan nyebat asma Allah Nu Maha Welas tur Maha Asih. Sinareng hormat, simkuring sakulawargi ngahaturanan sumping ka Bapa/Ibu/Wargi sadaya dina raraga nyakseni sareng ngiring bingah dina akad tikah tur resepsi murangkalih simkuring.',
      quote:
        'Silih asih, silih asah, silih asuh — ngambah sagara rumah tangga dina panangtayungan Gusti.',
      prayer:
        'Maha Suci Allah anu parantos nyiptakeun mahluk-Na sapasang-sapasang. Mugia Gusti maparinan kaberkahan, ngarumat dina katengtreman lahir sinareng batin.',
      closing:
        'Mangrupi hiji kahormatan sareng kabagjaan kanggo simkuring sakulawargi saupami Bapa/Ibu/Saderek kersa sumping ngaluuhan sarta maparin pidua restu. Hatur nuhun kana sagala perhatosan sareng piduana.',
      ceremonies: [
        {
          title: 'Akad Nikah (Ijáb Qobul)',
          startDateTime: '2027-07-24T08:00',
          endDateTime: '2027-07-24T10:00',
          venue: 'Bale Asri Pusdai Bandung',
          address: 'Jl. Diponegoro No.63, Citarum, Kec. Bandung Wetan, Kota Bandung, Jawa Barat',
          mapsUrl: 'https://maps.google.com/?q=Pusdai+Bandung',
        },
        {
          title: 'Resepsi & Mapag Panganten',
          startDateTime: '2027-07-24T11:00',
          endDateTime: '2027-07-24T14:00',
          venue: 'Grand Ballroom Pusdai Bandung',
          address: 'Jl. Diponegoro No.63, Citarum, Kec. Bandung Wetan, Kota Bandung, Jawa Barat',
          mapsUrl: 'https://maps.google.com/?q=Pusdai+Bandung',
        },
      ],
      giftTitle: 'Kado & Tanda Kasih Digital',
      giftMessage:
        'Kagem wargi sadaya anu badé ngintunkeun tanda asih, tiasa ngalangkungan rekening ieu di handap:',
      giftAccounts: [
        {
          bankName: 'Bank Central Asia (BCA)',
          accountNumber: '8830192831',
          accountHolder: 'Citra Kirana',
        },
        {
          bankName: 'Bank Mandiri',
          accountNumber: '1370019283742',
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
