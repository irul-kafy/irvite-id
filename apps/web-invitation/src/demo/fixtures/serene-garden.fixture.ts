import type { RendererData } from '../../renderers/registry';

export const SERENE_GARDEN_DEMO_FIXTURE: RendererData = {
  event: {
    title: 'The Wedding of Dimas & Alya',
    description: 'Pernikahan Dimas Wahyu Pratama & Alya Nurul Hidayah',
    eventDate: '2026-12-12T09:00:00.000Z',
    locationDetails: 'The Glass House Gardens, Jakarta Selatan',
    content: {
      partnerOneName: 'Dimas',
      partnerTwoName: 'Alya',
      partnerOneFullName: 'Dimas Wahyu Pratama',
      partnerTwoFullName: 'Alya Nurul Hidayah',
      partnerOneParents: 'Putra dari Bpk. Joko Susilo & Ibu Rini Astuti',
      partnerTwoParents: 'Putri dari Bpk. Ahmad Yani & Ibu Sri Wahyuni',
      openingText:
        'Dengan rasa syukur dan bahagia atas karunia Tuhan Yang Maha Esa, kami mengundang Anda untuk merayakan pernikahan kami:',
      prayerText:
        'Kasih itu sabar; kasih itu murah hati; ia tidak cemburu. Ia tidak memegahkan diri dan tidak sombong. Kasih menutupi segala sesuatu, percaya segala sesuatu, mengharapkan segala sesuatu, sabar menanggung segala sesuatu.',
      closingText:
        'Atas kehadiran dan doa restu yang tulus, kami sekeluarga mengucapkan terima kasih yang sebesar-besarnya.',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        {
          title: 'Pemberkatan / Ijab Kabul',
          startDateTime: '2026-12-12T09:00:00+07:00',
          endDateTime: '2026-12-12T11:00:00+07:00',
          venue: 'Gereja Katedral / Pendopo Taman',
          address: 'Jl. Katedral No. 7B, Pasar Baru, Jakarta Pusat',
          mapsUrl: 'https://maps.google.com/?q=Jakarta',
        },
        {
          title: 'Resepsi Taman',
          startDateTime: '2026-12-12T18:30:00+07:00',
          endDateTime: '2026-12-12T21:00:00+07:00',
          venue: 'The Glass House Gardens',
          address: 'Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan',
          mapsUrl: 'https://maps.google.com/?q=Jakarta',
        },
      ],
      giftTitle: 'Tanda Kasih Digital',
      giftMessage:
        'Kehadiran dan doa restu Anda adalah kado paling berharga bagi kami. Jika ingin memberikan tanda kasih secara cashless:',
      giftAccounts: [
        {
          bankName: 'Bank BCA',
          accountNumber: '8820192831',
          accountHolderName: 'Dimas Wahyu Pratama',
        },
      ],
    },
  },
  template: {
    themeCode: 'SERENE_GARDEN',
    config: null,
  },
  media: [],
  mediaBySlot: {},
  guest: undefined,
  invitation: undefined,
  rsvp: undefined,
};
