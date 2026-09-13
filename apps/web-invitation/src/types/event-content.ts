/** Public, per-event copy. Asset IDs remain private to the admin API. */
export interface WeddingCeremony {
  title: string;
  dateTime: string;
  venue: string;
  address: string;
  mapsUrl?: string;
}

export interface EventContent {
  partnerOneName?: string;
  partnerTwoName?: string;
  partnerOneParents?: string;
  partnerTwoParents?: string;
  openingText?: string;
  prayerText?: string;
  prayerSource?: string;
  closingText?: string;
  mapsUrl?: string;
  timeZone?: "Asia/Jakarta" | "Asia/Makassar" | "Asia/Jayapura";
  ceremonies?: WeddingCeremony[];
  giftTitle?: string;
  giftAccountName?: string;
  giftMessage?: string;
}

export interface WeddingWish {
  name: string;
  message: string;
  createdAt: string;
}

export interface PublicEventContent {
  content?: EventContent | null;
  giftQr?: { src: string } | null;
  wishes?: WeddingWish[];
}
