import type { PublicMediaDescriptor } from '../../types/public-invitation';
import type { PublicInvitationResponse } from '../../types/public-invitation';

export type InvitationMode = 'PUBLIC' | 'PERSONAL' | 'PERSONALIZED';

export interface VelvetCeremonyItem {
  title: string;
  startDateTime: string;
  endDateTime?: string;
  venue: string;
  address?: string;
  mapsUrl?: string;
}

export interface VelvetGiftAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface VelvetLetterContent {
  partnerOneName: string;
  partnerTwoName: string;
  timeZone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura';
  partnerOneFullName?: string;
  partnerTwoFullName?: string;
  partnerOneFamily?: string;
  partnerTwoFamily?: string;
  intro?: string;
  prayer?: string;
  closing?: string;
  giftMessage?: string;
  ceremonies?: VelvetCeremonyItem[];
  giftAccounts?: VelvetGiftAccount[];
  _schemaVersion?: number;
}

export interface VelvetLetterMedia {
  partnerOnePhoto?: PublicMediaDescriptor;
  partnerTwoPhoto?: PublicMediaDescriptor;
}

export interface VelvetLetterProps {
  data: Partial<PublicInvitationResponse> & {
    event: PublicInvitationResponse['event'];
    template?: PublicInvitationResponse['template'];
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
