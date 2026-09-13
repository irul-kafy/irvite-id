import { PublicMediaDescriptor } from './public-invitation';

export interface PublicEventResponse {
  event: {
    title: string;
    description: string | null;
    eventDate: string;
    locationDetails: string | null;
    slug: string;
    content?: Record<string, unknown> | null;
  };
  template: {
    themeCode: string;
    config: Record<string, unknown> | null;
  } | null;
  media: PublicMediaDescriptor[];
  mediaBySlot?: Record<string, PublicMediaDescriptor[]>;
}
