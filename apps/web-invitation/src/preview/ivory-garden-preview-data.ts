import { GARDEN_DEFAULTS } from '../renderers/themes/ivory-garden-model';
import type { PublicInvitationResponse } from '../types/public-invitation';

/** Explicitly invalid and used only with `isPreview: true`. */
export const IVORY_GARDEN_PREVIEW_UNIQUE_CODE = '__IVORY_GARDEN_PREVIEW_NOT_REAL__';

const IVORY_GARDEN_PREVIEW_CONFIG = {
  version: 1,
  theme: {
    primaryColor: '#4A5741',
    secondaryColor: '#A38A59',
    backgroundColor: '#F8F4EB',
    textColor: '#343B30',
  },
  typography: {
    headingFont: 'PLAYFAIR_DISPLAY',
    bodyFont: 'LORA',
  },
  sections: [
    { id: 'hero', enabled: true, order: 1, variant: 'default' },
    { id: 'greeting', enabled: true, order: 2, variant: 'default' },
    { id: 'eventDetails', enabled: true, order: 3, variant: 'default' },
    { id: 'countdown', enabled: true, order: 4, variant: 'default' },
    { id: 'gallery', enabled: true, order: 5, variant: 'default' },
    { id: 'location', enabled: true, order: 6, variant: 'default' },
    { id: 'rsvp', enabled: true, order: 7, variant: 'default' },
    { id: 'guestQr', enabled: false, order: 8, variant: 'default' },
    { id: 'closing', enabled: true, order: 9, variant: 'default' },
  ],
} as const;

/**
 * Deterministic mock response used by the public demo and the trusted studio
 * iframe. It never reads from or writes to the backend.
 */
export function buildIvoryGardenPreviewData(): PublicInvitationResponse {
  return {
    invitation: {
      customMessage: null,
    },
    guest: {
      name: 'Tamu Undangan',
      customGreeting: null,
      maxPax: 2,
    },
    event: {
      title: 'Nara & Aditya',
      description:
        'Dengan penuh sukacita, kami mengundang Anda untuk merayakan awal perjalanan Nara dan Aditya.',
      eventDate: '2026-12-20T02:00:00Z',
      locationDetails:
        'The Westin Jakarta\nJl. H. R. Rasuna Said, Kuningan, Jakarta Selatan',
      content: {
        partnerOneName: 'Nara',
        partnerTwoName: 'Aditya',
        partnerOneParents: 'Putri dari Bapak Arif & Ibu Ratna',
        partnerTwoParents: 'Putra dari Bapak Dimas & Ibu Sari',
        openingText:
          'Dengan rasa syukur, kami mengundang Anda untuk menyaksikan dan berbagi kebahagiaan di hari istimewa kami.',
        prayerText: GARDEN_DEFAULTS.prayerText,
        closingText:
          'Kehadiran dan doa baik Anda akan menjadi hadiah yang paling kami syukuri dalam memulai perjalanan baru ini.',
        mapsUrl:
          'https://www.google.com/maps/search/?api=1&query=The%20Westin%20Jakarta',
        timeZone: 'Asia/Jakarta',
        ceremonies: [
          {
            title: 'Akad Nikah',
            dateTime: '2026-12-20T02:00:00Z',
            venue: 'The Westin Jakarta',
            address: 'Jl. H. R. Rasuna Said, Kuningan, Jakarta Selatan',
          },
          {
            title: 'Resepsi Pernikahan',
            dateTime: '2026-12-20T05:00:00Z',
            venue: 'The Westin Jakarta',
            address: 'Jl. H. R. Rasuna Said, Kuningan, Jakarta Selatan',
          },
        ],
        giftTitle: 'Tanda kasih untuk Nara & Aditya',
        giftAccountName: 'Nara & Aditya',
        giftMessage:
          'Kehadiran dan doa restu Anda adalah hadiah terindah. Contoh ini hanya menunjukkan area hadiah pada template.',
      },
      wishes: [
        {
          name: 'Dina Prameswari',
          message: 'Semoga selalu dipenuhi cinta, ketenangan, dan kebahagiaan.',
          createdAt: '2026-10-01T08:00:00.000Z',
        },
      ],
    },
    template: {
      themeCode: 'IVORY_GARDEN',
      config: IVORY_GARDEN_PREVIEW_CONFIG,
    },
    media: [],
    rsvp: {
      response: 'PENDING',
      pax: null,
      canRespond: false,
    },
  };
}
