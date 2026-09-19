import type { RendererData } from '../../renderers/registry';

export const SUNDA_PUSPA_DEMO_FIXTURE: RendererData = {
  event: {
    title: 'Walimatul Ursy Galih & Ratna',
    description: 'Pernikahan Galih Aditya Nugraha & Ratna Puspa Dewi',
    eventDate: '2026-10-18T08:00:00.000Z',
    locationDetails: 'Bale Asri Sasana Budaya, Bandung',
    content: {
      partnerOneName: 'Galih',
      partnerTwoName: 'Ratna',
      partnerOneFullName: 'Galih Aditya Nugraha, S.T.',
      partnerTwoFullName: 'Ratna Puspa Dewi, S.Farm.',
      partnerOneParents: 'Putra munggaran ti Bpk. H. Asep Sunarya & Ibu Hj. Enok Maryati',
      partnerTwoParents: 'Putri bungsu ti Bpk. H. Cecep Dedi & Ibu Hj. Teti Rohaeti',
      coupleGreeting: 'Sampurasun! Kalayan widi ti Gusti Nu Maha Suci',
      openingText:
        "Bismillaahirrohmaanirrohiim. Kalayan nyuhunkeun widi sareng karidoan Gusti Nu Maha Welas Asih, sim kuring sakulawargi ngahaturanan rawuh dina raraga walimatul 'ursy pun anak:",
      prayerText:
        'Mugia rumah tangga ieu pinuh ku kabagjaan, runtut raut sauyunan, sarendeuk saigel, sabobot sapihanean, sakinah mawaddah warohmah.',
      prayerSource: 'Panggeuing Galih Adat Sunda',
      closingText:
        'Hatur nuhun kana sagala kaweningan galih sarta pangdua ti para wargi sadaya. Mugia Gusti Nu Maha Suci maparin ganjaran anu manglipat-lipat.',
      timeZone: 'Asia/Jakarta',
      ceremonies: [
        {
          title: 'Akad Nikah & Siraman',
          startDateTime: '2026-10-18T08:00:00+07:00',
          endDateTime: '2026-10-18T10:30:00+07:00',
          venue: 'Bale Asri Sasana Budaya',
          address: 'Jl. Cisangkuy No. 15, Citarum, Kota Bandung',
          mapsUrl: 'https://maps.google.com/?q=Bandung',
        },
        {
          title: 'Resepsi Adat Sunda',
          startDateTime: '2026-10-18T11:30:00+07:00',
          endDateTime: '2026-10-18T15:00:00+07:00',
          venue: 'Bale Asri Sasana Budaya',
          address: 'Jl. Cisangkuy No. 15, Citarum, Kota Bandung',
          mapsUrl: 'https://maps.google.com/?q=Bandung',
        },
      ],
      story: [
        {
          year: '2018',
          title: 'Patepung di Kampus',
          text: 'Mimiti patepung nalika sami-sami nuju kuliah di ITB Bandung.',
        },
        {
          year: '2022',
          title: 'Ngalengkah Babarengan',
          text: 'Saatos wisuda, mutuskeun kanggo sami-sami bajoang ngawangun impian.',
        },
        {
          year: '2026',
          title: 'Niat Suci',
          text: 'Niat suci diwujudkeun dina beungkeutan pernikahan anu pinuh barokah.',
        },
      ],
    },
  },
  template: {
    themeCode: 'SUNDA_PUSPA',
    config: null,
  },
  media: [],
  mediaBySlot: {},
  guest: undefined,
  invitation: undefined,
  rsvp: undefined,
};
