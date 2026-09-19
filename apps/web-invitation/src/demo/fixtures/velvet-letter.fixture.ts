import type { RendererData } from '../../renderers/registry';

export const VELVET_LETTER_DEMO_FIXTURE: RendererData = {
  event: {
    title: 'The Wedding of Gabriella & Jonathan',
    description: 'Undangan Pernikahan Gabriella Patricia & Jonathan Wijaya',
    eventDate: '2026-12-18T09:00:00.000Z',
    locationDetails: 'The Hermitage, a Tribute Portfolio Hotel, Menteng, Jakarta Pusat',
    content: {
      partnerOneName: 'Gabriella',
      partnerTwoName: 'Jonathan',
      partnerOneFullName: 'Gabriella Patricia Hartono, B.A.',
      partnerTwoFullName: 'Jonathan Christian Wijaya, B.Sc.',
      partnerOneFamily: 'Putri pertama dari Bapak Richard Hartono & Ibu Veronica Chandra',
      partnerTwoFamily: 'Putra sulung dari Bapak Hendra Wijaya & Ibu Irene Sasmita',
      intro:
        'Dengan penuh rasa syukur dan sukacita atas limpahan kasih karunia Tuhan Yang Maha Esa, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu pada hari pernikahan kami.',
      prayer:
        'Tuhan membuat segala sesuatu indah pada waktunya. Kiranya kasih dan damai sejahtera senantiasa melingkupi ikrar suci janji pernikahan kami berdua sepanjang masa.',
      closing:
        'Merupakan sebuah kehormatan dan kebahagiaan yang tak terhingga bagi kami atas kehadiran serta doa restu yang Bapak/Ibu/Saudara/i berikan dalam mengawali lembaran baru kehidupan ini.',
      giftMessage:
        'Doa restu Anda merupakan karunia terindah bagi kami. Namun jika Anda bermaksud memberikan tanda kasih, kami menyediakannya melalui fitur amplop digital di bawah ini.',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        {
          title: 'Pemberkatan Nikah',
          startDateTime: '2026-12-18T09:00',
          endDateTime: '2026-12-18T11:00',
          venue: 'Gereja Katedral Jakarta',
          address: 'Jl. Katedral No. 7-8, Pasar Baru, Sawah Besar, Jakarta Pusat',
          mapsUrl: 'https://maps.google.com/?q=Gereja+Katedral+Jakarta',
        },
        {
          title: 'Resepsi Pernikahan',
          startDateTime: '2026-12-18T18:30',
          endDateTime: '2026-12-18T21:30',
          venue: 'The Hermitage, A Tribute Portfolio Hotel',
          address: 'Jl. Cilacap No. 1, Menteng, Jakarta Pusat',
          mapsUrl: 'https://maps.google.com/?q=The+Hermitage+Jakarta',
        },
      ],
      giftAccounts: [
        {
          bankName: 'Bank Central Asia (BCA)',
          accountNumber: '5271928301',
          accountHolder: 'Gabriella Patricia',
        },
        {
          bankName: 'Bank Mandiri',
          accountNumber: '1220019283741',
          accountHolder: 'Jonathan Christian Wijaya',
        },
      ],
    },
  },
  template: {
    themeCode: 'VELVET_LETTER',
    config: null,
  },
  media: [],
  mediaBySlot: {},
  guest: undefined,
  invitation: undefined,
  rsvp: undefined,
};
