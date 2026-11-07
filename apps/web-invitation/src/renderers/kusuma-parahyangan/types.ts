import type { PublicMediaDescriptor } from '../../types/public-invitation';

export interface KusumaCeremonyItem {
  title: string;
  startDateTime: string;
  endDateTime?: string;
  venue: string;
  address?: string;
  mapsUrl?: string;
}

export interface KusumaGiftAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface KusumaParahyanganContent {
  partnerOneName: string;
  partnerTwoName: string;
  timeZone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura';
  partnerOneFullName?: string;
  partnerTwoFullName?: string;
  partnerOneFamily?: string;
  partnerTwoFamily?: string;
  openingGreeting?: string;
  openingText?: string;
  quote?: string;
  prayer?: string;
  closing?: string;
  ceremonies?: KusumaCeremonyItem[];
  giftTitle?: string;
  giftMessage?: string;
  giftAccounts?: KusumaGiftAccount[];
}

export interface KusumaParahyanganMedia {
  hero?: PublicMediaDescriptor;
  bride?: PublicMediaDescriptor;
  groom?: PublicMediaDescriptor;
  gallery: PublicMediaDescriptor[];
  bgMusic?: PublicMediaDescriptor;
}

