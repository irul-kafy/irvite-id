import type { RendererData } from '../../renderers/registry';

export const CLASSIC_LETTER_DEMO_FIXTURE: RendererData = {
  event: {
    title: 'The Wedding of Nadira & Arga',
    description: 'Undangan Pernikahan Nadira Putri & Arga Pratama',
    eventDate: '2026-11-22T08:00:00.000Z',
    locationDetails: 'Gedung Kesenian Jakarta, Jakarta Pusat',
    content: {
      partnerOneName: 'Nadira',
      partnerTwoName: 'Arga',
      partnerOneFullName: 'Nadira Putri Maharani, S.Ds.',
      partnerTwoFullName: 'Arga Pratama Wicaksono, M.B.A.',
      partnerOneFamily: 'Putri pertama dari Bapak Hendra Kusuma & Ibu Maya Indrawati',
      partnerTwoFamily: 'Putra kedua dari Bapak Surya Wicaksono & Ibu Diana Kartika',
      intro:
        'Dengan memohon rahmat dan ridho Allah SWT, kami bermaksud menyelenggarakan syukuran pernikahan putra-putri kami tercinta. Merupakan sebuah kehormatan bagi kami atas kehadiran dan doa restu Bapak/Ibu sekalian.',
      quote:
        'Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.',
      prayer:
        'Ya Allah, berkahilah pernikahan kami, limpahkanlah rasa cinta dan kasih sayang di antara kami sebagaimana Engkau mencurahkan kasih sayang-Mu kepada hamba-hamba-Mu yang saleh.',
      closing:
        'Ungkapan terima kasih yang tulus dari lubuk hati kami atas kehadiran, doa, dan cinta yang telah tercurah untuk menyertai awal perjalanan hidup baru kami.',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        {
          title: 'Akad Nikah',
          startDateTime: '2026-11-22T08:00',
          endDateTime: '2026-11-22T10:00',
          venue: 'Gedung Kesenian Jakarta',
          address: 'Jl. Gedung Kesenian No. 1, Pasar Baru, Jakarta Pusat',
          mapsUrl: 'https://maps.google.com/?q=Gedung+Kesenian+Jakarta',
        },
        {
          title: 'Resepsi Pernikahan',
          startDateTime: '2026-11-22T11:30',
          endDateTime: '2026-11-22T14:00',
          venue: 'Grand Ballroom Hotel Indonesia Kempinski',
          address: 'Jl. M.H. Thamrin No. 1, Menteng, Jakarta Pusat',
          mapsUrl: 'https://maps.google.com/?q=Hotel+Indonesia+Kempinski',
        },
      ],
      giftAccounts: [
        {
          bankName: 'Bank Central Asia (BCA)',
          accountNumber: '0123456789',
          accountHolder: 'Nadira Putri Maharani',
        },
        {
          bankName: 'Bank Mandiri',
          accountNumber: '9876543210',
          accountHolder: 'Arga Pratama Wicaksono',
        },
      ],
    },
  },
  template: {
    themeCode: 'CLASSIC_LETTER',
    config: null,
  },
  media: [
    {
      type: 'PHOTO',
      slot: 'bg-photo',
      order: 0,
      src: '/templates/classic-letter/garden.jpg',
    },
  ],
  mediaBySlot: {
    'bg-photo': [
      {
        type: 'PHOTO',
        slot: 'bg-photo',
        order: 0,
        src: '/templates/classic-letter/garden.jpg',
      },
    ],
  },
  guest: undefined,
  invitation: undefined,
  rsvp: undefined,
};
