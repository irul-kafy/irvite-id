import type { PublicMediaDescriptor } from '../../types/public-invitation';
import type { PublicInvitationResponse } from '../../types/public-invitation';
import type { PublicEventResponse } from '../../types/public-event';

export type InvitationMode = 'PUBLIC' | 'PERSONAL' | 'PERSONALIZED';

export interface CeremonyItem {
  title: string;
  dateTime: string;
  venue: string;
  address: string;
  mapsUrl?: string;
}

export interface GiftAccountItem {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

export interface IvoryGardenContent {
  partnerOneName?: string;
  partnerTwoName?: string;
  partnerOneParents?: string;
  partnerTwoParents?: string;
  openingText?: string;
  prayerText?: string;
  prayerSource?: string;
  closingText?: string;
  timeZone?: string;
  ceremonies?: CeremonyItem[];
  giftTitle?: string;
  giftMessage?: string;
  giftAccounts?: GiftAccountItem[];
  mapsUrl?: string;
  _schemaVersion?: number;
}

export interface IvoryGardenMedia {
  hero?: PublicMediaDescriptor;
  gallery: PublicMediaDescriptor[];
  bgMusic?: PublicMediaDescriptor;
}

export interface IvoryGardenProps {
  data: Partial<PublicInvitationResponse> & {
    event: PublicEventResponse['event'];
    template?: PublicEventResponse['template'];
    media?: PublicMediaDescriptor[];
    mediaBySlot?: Record<string, PublicMediaDescriptor[]>;
    guest?: PublicInvitationResponse['guest'] | null;
    invitation?: PublicInvitationResponse['invitation'] | null;
    rsvp?: PublicInvitationResponse['rsvp'] | null;
  };
  uniqueCode?: string;
  isPreview?: boolean;
  mode?: InvitationMode;
}
