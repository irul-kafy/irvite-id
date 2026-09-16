import type { PublicMediaDescriptor } from '../../types/public-invitation';
import type { PublicInvitationResponse } from '../../types/public-invitation';
import type { PublicEventResponse } from '../../types/public-event';

export type InvitationMode = 'PUBLIC' | 'PERSONAL' | 'PERSONALIZED';

export interface SundaCeremonyItem {
  title: string;
  startDateTime: string;
  endDateTime?: string;
  venue: string;
  address?: string;
  mapsUrl?: string;
}

export interface SundaStoryItem {
  year: string;
  title: string;
  text: string;
}

export interface SundaPuspaContent {
  partnerOneName: string;
  partnerTwoName: string;
  partnerOneFullName?: string;
  partnerTwoFullName?: string;
  partnerOneParents?: string;
  partnerTwoParents?: string;
  coupleGreeting?: string;
  openingText?: string;
  prayerText?: string;
  prayerSource?: string;
  closingText?: string;
  timeZone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura';
  ceremonies?: SundaCeremonyItem[];
  story?: SundaStoryItem[];
  _schemaVersion?: number;
}

export interface SundaPuspaMedia {
  couplePhoto?: PublicMediaDescriptor;
  gallery: PublicMediaDescriptor[];
  bgMusic?: PublicMediaDescriptor;
}

export interface SundaPuspaProps {
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
