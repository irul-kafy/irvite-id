import { PublicMediaDescriptor } from './public-invitation';
import type { PublicEventContent } from './event-content';

export interface PublicEventResponse {
  event: PublicEventContent & {
    title: string;
    description: string | null;
    eventDate: string;
    locationDetails: string | null;
    slug: string;
  };
  template: {
    themeCode: string;
    config: Record<string, unknown> | null;
  } | null;
  media: PublicMediaDescriptor[];
}
