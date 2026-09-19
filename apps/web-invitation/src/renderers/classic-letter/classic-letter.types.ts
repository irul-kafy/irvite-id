import type { PublicMediaDescriptor } from '../../types/public-invitation';
import type { PublicInvitationResponse } from '../../types/public-invitation';
import type { PublicEventResponse } from '../../types/public-event';

export type InvitationMode = 'PUBLIC' | 'PERSONAL' | 'PERSONALIZED';

export interface ClassicCeremonyItem {
  title: string;
  startDateTime: string;
  endDateTime?: string;
  venue: string;
  address?: string;
  mapsUrl?: string;
}

export interface ClassicGiftAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface ClassicLetterContent {
  partnerOneName: string;
  partnerTwoName: string;
  timeZone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura';
  partnerOneFullName?: string;
  partnerTwoFullName?: string;
  partnerOneFamily?: string;
  partnerTwoFamily?: string;
  intro?: string;
  quote?: string;
  prayer?: string;
  closing?: string;
  ceremonies?: ClassicCeremonyItem[];
  giftAccounts?: ClassicGiftAccount[];
  _schemaVersion?: number;
}

export interface ClassicResolvedBackground {
  type: 'video' | 'photo';
  videoSrc?: string;
  posterSrc: string;
  photoSrc: string;
}

export interface ClassicLetterMedia {
  bgPhoto?: PublicMediaDescriptor;
  bgVideo?: PublicMediaDescriptor;
  bgPoster?: PublicMediaDescriptor;
  couplePhoto?: PublicMediaDescriptor;
  gallery: PublicMediaDescriptor[];
  resolvedBg: ClassicResolvedBackground;
}

export interface ClassicLetterProps {
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
