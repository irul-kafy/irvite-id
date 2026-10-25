import type { RendererData } from '../../renderers/registry';

export const RANAH_CINTA_DEMO_FIXTURE: RendererData = {
  event: {
    title: 'Pernikahan Salma & Fadli — Ranah Cinta',
    description: 'Undangan Pernikahan Adat Minangkabau Salma Putri Maharani & Fadli Aditya Pratama',
    eventDate: '2026-11-22T08:00:00+07:00',
    locationDetails: 'Balairung Keluarga, Padang, Sumatera Barat',
    content: {
      _schemaVersion: 1,
      partnerOneName: 'Salma',
      partnerTwoName: 'Fadli',
      partnerOneFullName: 'Salma Putri Maharani',
      partnerTwoFullName: 'Fadli Aditya Pratama',
      partnerOneFamily: 'Putri dari Bapak Hendra Wijaya\ndan Ibu Ratna Puspita',
      partnerTwoFamily: 'Putra dari Bapak Bambang Pratama\ndan Ibu Dewi Lestari',
      timeZone: 'Asia/Jakarta',
      openingText:
        'Dengan memohon rahmat dan rida Allah SWT, kami bermaksud menyatukan langkah dalam ikatan pernikahan. Dengan penuh sukacita, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu di hari bahagia kami.',
      statement: 'Bertemu dalam cinta, berpulang pada kita.',
      prayer:
        'Ya Allah, jadikanlah pernikahan ini tempat kami bertumbuh dalam kebaikan. Lembutkan hati kami untuk saling memahami, lapangkan sabar kami untuk saling menjaga, dan tuntun langkah kami untuk tetap memilih satu sama lain. Semoga rumah yang kami bangun dipenuhi ketenteraman, kasih sayang, dan keberkahan-Mu.',
      prayerSource: 'Doa Pernikahan',
      closingMessage:
        'Terima kasih telah menjadi bagian dari kisah kami. Kehadiran, doa, dan kasih yang Anda berikan akan selalu memiliki tempat istimewa di hati kami.',
      ceremonies: [
        {
          title: 'Akad Nikah',
          startDateTime: '2026-11-22T08:00',
          endDateTime: '2026-11-22T10:00',
          venue: 'Balairung Keluarga',
          address: 'Padang, Sumatera Barat',
          mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Padang%2C+Sumatera+Barat',
        },
        {
          title: 'Resepsi',
          startDateTime: '2026-11-22T11:00',
          endDateTime: '2026-11-22T14:00',
          venue: 'Balairung Keluarga',
          address: 'Padang, Sumatera Barat',
          mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Padang%2C+Sumatera+Barat',
        },
      ],
      story: [
        {
          year: '2023',
          title: 'Awal Pertemuan',
          description:
            'Sebuah langkah awal di ranah Minang mempertemukan kami dalam percakapan yang hangat dan penuh makna.',
        },
        {
          year: '2025',
          title: 'Menyatukan Niat',
          description:
            'Di hadapan keluarga besar, kami mengikat janji untuk melangkah bersama menuju babak baru kehidupan.',
        },
      ],
      giftTitle: 'Tanda Kasih',
      giftMessage:
        'Kehadiran dan doa restu Anda adalah hadiah terindah bagi kami. Apabila Anda ingin berbagi tanda kasih, kami menerimanya dengan penuh syukur melalui hadiah digital berikut.',
      giftAccounts: [
        {
          bankName: 'BCA',
          accountNumber: '1234567890',
          accountHolder: 'Salma & Fadli',
        },
        {
          bankName: 'Mandiri',
          accountNumber: '9876543210',
          accountHolder: 'Salma Putri Maharani',
        },
      ],
    },
  },
  template: {
    themeCode: 'RANAH_CINTA',
    config: {
      accent: '#245247',
    },
  },
  media: [
    {
      id: 'demo-cover',
      slot: 'cover',
      src: '/templates/ranah-cinta/ranah-landscape.png',
      type: 'PHOTO',
      order: 0,
    },
  ],
};
