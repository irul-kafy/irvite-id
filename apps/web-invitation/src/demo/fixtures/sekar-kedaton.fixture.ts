import type { RendererData } from '../../renderers/registry';

export const SEKAR_KEDATON_DEMO_FIXTURE: RendererData = {
  event: {
    title: 'Pernikahan Laras & Bagas',
    description: 'Undangan Pernikahan Adat Jawa Laras Ayu Prameswari & Bagas Aditya Pradana',
    eventDate: '2027-06-20T08:00:00+07:00',
    locationDetails: 'Pendopo Sekar Kedaton, Daerah Istimewa Yogyakarta',
    content: {
      _schemaVersion: 1,
      partnerOneName: 'Laras',
      partnerTwoName: 'Bagas',
      partnerOneFullName: 'Laras Ayu Prameswari, S.Sn.',
      partnerTwoFullName: 'Bagas Aditya Pradana, M.Arch.',
      partnerOneFamily: 'Putri dari Bapak Arya Prasetya\ndan Ibu Ratih Wulandari',
      partnerTwoFamily: 'Putra dari Bapak Suryo Pradana\ndan Ibu Sekar Utami',
      timeZone: 'Asia/Jakarta',
      intro:
        'Dengan memohon rahmat dan rida Allah SWT, kami mengundang Bapak, Ibu, serta Saudara/i untuk menjadi bagian dari hari pernikahan kami. Semoga pertemuan ini menjadi awal dari kasih yang terus tumbuh, dalam restu keluarga dan doa orang-orang tercinta.',
      quote: 'Sejauh apa pun langkah pergi, bersamamu kami menemukan rumah.',
      prayer:
        'Ya Allah, satukan hati kami dalam kebaikan. Jadikan rumah kami tempat tumbuhnya kasih, kesabaran, dan rasa syukur. Bimbing kami untuk saling menjaga dalam bahagia maupun ujian, hingga akhir perjalanan.',
      closing:
        'Merupakan kebahagiaan bagi kami apabila Anda berkenan hadir dan memberikan doa restu. Terima kasih telah mengiringi langkah awal kami dengan kasih yang tulus.',
      ceremonies: [
        {
          title: 'Akad Nikah',
          startDateTime: '2027-06-20T08:00',
          endDateTime: '2027-06-20T09:00',
          venue: 'Pendopo Sekar Kedaton',
          address: 'Jl. Kotagede No. 12, Purbayan, Kotagede, Kota Yogyakarta',
          mapsUrl: 'https://maps.google.com/?q=Kotagede+Yogyakarta',
        },
        {
          title: 'Resepsi Ageng',
          startDateTime: '2027-06-20T11:00',
          endDateTime: '2027-06-20T14:00',
          venue: 'Taman Pendopo Ageng Sekar Kedaton',
          address: 'Jl. Kotagede No. 12, Purbayan, Kotagede, Kota Yogyakarta',
          mapsUrl: 'https://maps.google.com/?q=Kotagede+Yogyakarta',
        },
      ],
      giftAccounts: [
        {
          bankName: 'Bank Central Asia (BCA)',
          accountNumber: '8830192831',
          accountHolder: 'Laras Ayu Prameswari',
        },
        {
          bankName: 'Bank Mandiri',
          accountNumber: '1370019283742',
          accountHolder: 'Bagas Aditya Pradana',
        },
      ],
    },
  },
  template: {
    themeCode: 'SEKAR_KEDATON',
    config: {
      primaryColor: '#183e37',
      accentColor: '#9e603d',
    },
  },
  media: [
    {
      id: 'demo-hero',
      type: 'PHOTO',
      slot: 'hero',
      order: 0,
      src: '/templates/sekar-kedaton/couple-jawa-demo.png',
    },
    {
      id: 'demo-gallery-0',
      type: 'PHOTO',
      slot: 'gallery',
      order: 0,
      src: '/templates/sekar-kedaton/couple-jawa-demo.png',
    },
    {
      id: 'demo-audio',
      type: 'AUDIO',
      slot: 'bg-music',
      order: 0,
      src: '/templates/sekar-kedaton/sekar-senja-original.wav',
    },
  ],
  mediaBySlot: {
    hero: [
      {
        id: 'demo-hero',
        type: 'PHOTO',
        slot: 'hero',
        order: 0,
        src: '/templates/sekar-kedaton/couple-jawa-demo.png',
      },
    ],
    gallery: [
      {
        id: 'demo-gallery-0',
        type: 'PHOTO',
        slot: 'gallery',
        order: 0,
        src: '/templates/sekar-kedaton/couple-jawa-demo.png',
      },
    ],
    'bg-music': [
      {
        id: 'demo-audio',
        type: 'AUDIO',
        slot: 'bg-music',
        order: 0,
        src: '/templates/sekar-kedaton/sekar-senja-original.wav',
      },
    ],
  },
};
