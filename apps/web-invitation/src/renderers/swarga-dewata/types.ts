export interface SwargaDewataCeremonyItem {
  title: string;
  startDateTime: string;
  endDateTime?: string;
  venue: string;
  address?: string;
  mapsUrl?: string;
}

export interface SwargaDewataStoryItem {
  year: string;
  title: string;
  description: string;
  date?: string;
}

export interface SwargaDewataGiftAccountItem {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface SwargaDewataContent {
  partnerOneName: string;
  partnerTwoName: string;
  partnerOneFullName: string;
  partnerTwoFullName: string;
  partnerOneFamily: string;
  partnerTwoFamily: string;
  timeZone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura';
  openingGreeting: string;
  openingText: string;
  quote: string;
  prayer: string;
  prayerSource: string;
  closingMessage: string;
  stories: SwargaDewataStoryItem[];
  ceremonies: SwargaDewataCeremonyItem[];
  giftTitle: string;
  giftMessage: string;
  giftAccounts: SwargaDewataGiftAccountItem[];
}

export interface SwargaDewataMedia {
  heroPhotoUrl: string;
  bridePhotoUrl: string;
  groomPhotoUrl: string;
  storyPhotoUrl: string;
  galleryPhotos: string[];
  bgMusicUrl: string | null;
  qrisUrl?: string | null;
}

