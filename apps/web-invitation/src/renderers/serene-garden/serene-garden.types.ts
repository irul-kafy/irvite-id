import type { PublicMediaDescriptor } from '../../types/public-invitation';
import type { PublicInvitationResponse } from '../../types/public-invitation';
import type { PublicEventResponse } from '../../types/public-event';

export type InvitationMode = 'PUBLIC' | 'PERSONAL' | 'PERSONALIZED';

export interface SereneCeremonyItem {
  title: string;
  startDateTime: string;
  endDateTime?: string;
  venue: string;
  address?: string;
  mapsUrl?: string;
}

export interface SereneGiftAccountItem {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

export interface SereneGardenContent {
  partnerOneName?: string;
  partnerTwoName?: string;
  partnerOneFullName?: string;
  partnerTwoFullName?: string;
  partnerOneParents?: string;
  partnerTwoParents?: string;
  openingText?: string;
  prayerText?: string;
  closingText?: string;
  timeZone?: string;
  ceremonies?: SereneCeremonyItem[];
  giftTitle?: string;
  giftMessage?: string;
  giftAccounts?: SereneGiftAccountItem[];
  _schemaVersion?: number;
}

export interface SereneGardenMedia {
  partnerOnePhoto?: PublicMediaDescriptor;
  partnerTwoPhoto?: PublicMediaDescriptor;
}

export interface SereneGardenProps {
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
