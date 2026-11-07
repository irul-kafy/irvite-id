export interface RoyalVelvetCeremonyItem {
  title: string;
  startDateTime: string;
  endDateTime?: string;
  venue: string;
  address?: string;
  mapsUrl?: string;
}

export interface RoyalVelvetStoryItem {
  year: string;
  title: string;
  description: string;
  date?: string;
}

export interface RoyalVelvetGiftAccountItem {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface RoyalVelvetContent {
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
  stories: RoyalVelvetStoryItem[];
  ceremonies: RoyalVelvetCeremonyItem[];
  giftTitle: string;
  giftMessage: string;
  giftAccounts: RoyalVelvetGiftAccountItem[];
}

export interface RoyalVelvetMedia {
  heroPhotoUrl: string;
  bridePhotoUrl: string;
  groomPhotoUrl: string;
  storyPhotoUrl: string;
  galleryPhotos: string[];
  bgMusicUrl: string | null;
}

