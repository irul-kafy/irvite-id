import type { RendererData } from '../../renderers/registry';

export const IVORY_GARDEN_DEMO_FIXTURE: RendererData = {
  event: {
    title: 'The Wedding of Rian & Maya',
    description: 'Pernikahan Rian Pratama & Maya Anggraini',
    eventDate: '2026-11-20T08:00:00.000Z',
    locationDetails: 'Grand Ballroom Hotel Harmoni, Jakarta Selatan',
    content: {
      partnerOneName: 'Rian',
      partnerTwoName: 'Maya',
      partnerOneParents: 'Putra pertama dari Bpk. Bambang & Ibu Siti',
      partnerTwoParents: 'Putri kedua dari Bpk. Hendra & Ibu Dewi',
      openingText:
        'Maha Suci Allah yang telah menciptakan makhluk-Nya berpasang-pasangan. Dengan memohon rahmat dan ridho-Nya, kami bermaksud menyelenggarakan syukuran pernikahan putra-putri kami:',
      prayerText:
        'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu isteri-isteri dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya, dan dijadikan-Nya diantaramu rasa kasih dan sayang.',
      prayerSource: 'QS. Ar-Rum: 21',
      closingText:
        'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir untuk memberikan doa restu kepada kedua mempelai.',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        {
          title: 'Akad Nikah',
          dateTime: 'Jumat, 20 November 2026 • 08:00 - 10:00 WIB',
          venue: 'Masjid Al-Ikhlas',
          address: 'Jl. Taman Melati No. 12, Kebayoran Baru, Jakarta Selatan',
          mapsUrl: 'https://maps.google.com/?q=Jakarta',
        },
        {
          title: 'Resepsi Pernikahan',
          dateTime: 'Jumat, 20 November 2026 • 11:00 - 14:00 WIB',
          venue: 'Grand Ballroom Hotel Harmoni',
          address: 'Jl. Jenderal Sudirman No. 45, Jakarta Selatan',
          mapsUrl: 'https://maps.google.com/?q=Jakarta',
        },
      ],
      giftTitle: 'Tanda Kasih Digital',
      giftMessage:
        'Doa restu Anda merupakan karunia terindah bagi kami. Namun jika Anda bermaksud memberikan tanda kasih, dapat disalurkan melalui rekening berikut:',
      giftAccounts: [
        {
          bankName: 'Bank Central Asia (BCA)',
          accountNumber: '1234567890',
          accountHolderName: 'Rian Pratama',
        },
        {
          bankName: 'Bank Mandiri',
          accountNumber: '9876543210',
          accountHolderName: 'Maya Anggraini',
        },
      ],
    },
  },
  template: {
    themeCode: 'IVORY_GARDEN',
    config: null,
  },
  media: [],
  mediaBySlot: {},
  guest: undefined,
  invitation: undefined,
  rsvp: undefined,
};
