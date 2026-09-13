export interface PublicMediaDescriptor {
  id?: string;
  type: 'PHOTO' | 'VIDEO' | 'AUDIO' | 'THUMBNAIL';
  slot?: string;
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
  event: {
    title: string;
    description: string | null;
    eventDate: string;
    locationDetails: string | null;
    content?: Record<string, unknown> | null;
  };
  template: {
    themeCode: string;
    config: Record<string, unknown> | null;
  } | null;
  media: PublicMediaDescriptor[];
  mediaBySlot?: Record<string, PublicMediaDescriptor[]>;
  rsvp: {
    response: 'PENDING' | 'YES' | 'NO';
    pax: number | null;
    canRespond: boolean;
  };
}
