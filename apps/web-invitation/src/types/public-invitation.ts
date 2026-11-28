export interface PublicMediaDescriptor {
  id?: string;
  type: 'PHOTO' | 'VIDEO' | 'AUDIO' | 'THUMBNAIL';
  slot?: string;
  order: number;
  src: string;
}

export interface PublicTemplateAssetDescriptor {
  slot: 'thumbnail' | 'background' | 'ornament' | 'music';
  mimeType: string;
  order: number;
  src: string;
}

export interface PublicWishItem {
  id: string;
  name: string;
  message: string;
  createdAt?: string;
  dateLabel?: string;
}

export interface PublicWishesData {
  title?: string;
  description?: string;
  total?: number;
  items: PublicWishItem[];
}

export interface PublicInvitationResponse {
  invitation: {
    customMessage: string | null;
  };
  guest: {
    name: string;
    customGreeting: string | null;
    maxPax: number;
    tableNumber?: string | null;
    isPublicRecipient?: boolean;
  };
  event: {
    title: string;
    description: string | null;
    eventDate: string;
    locationDetails: string | null;
    slug?: string;
    content?: Record<string, unknown> | null;
    packageCode?: string | null;
    qrCheckInEnabled?: boolean;
  };
  template: {
    themeCode: string;
    config: Record<string, unknown> | null;
    assets?: PublicTemplateAssetDescriptor[];
  } | null;
  media: PublicMediaDescriptor[];
  mediaBySlot?: Record<string, PublicMediaDescriptor[]>;
  rsvp: {
    response: 'PENDING' | 'YES' | 'NO';
    pax: number | null;
    canRespond: boolean;
  };
  wishes?: PublicWishesData;
}
