import type { PublicEventContent } from './event-content';

export interface PublicMediaDescriptor {
  type: 'PHOTO' | 'VIDEO' | 'AUDIO' | 'THUMBNAIL';
  order: number;
  src: string;
}

export interface PublicInvitationResponse {
  invitation: {
    customMessage: string | null;
  };
  guest: {
    name: string;
    customGreeting: string | null;
    maxPax: number;
  };
  event: PublicEventContent & {
    title: string;
    description: string | null;
    eventDate: string;
    locationDetails: string | null;
  };
  template: {
    themeCode: string;
    config: Record<string, unknown> | null;
  } | null;
  media: PublicMediaDescriptor[];
  rsvp: {
    response: 'PENDING' | 'YES' | 'NO';
    pax: number | null;
    canRespond: boolean;
  };
}
