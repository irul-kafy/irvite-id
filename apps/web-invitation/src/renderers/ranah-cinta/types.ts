import type { CSSProperties, ReactNode } from "react";

export type ImageAsset = {
  src: string;
  alt: string;
  position?: string;
  zoom?: number;
};

export type Partner = {
  name: string;
  shortName: string;
  parents?: string;
  portrait?: ImageAsset;
  social?: { label: string; url: string };
};

export type Guest = {
  kind: "personal" | "general";
  name?: string;
  maxPax?: number;
  invitationLabel?: string;
};

export type WeddingEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  venue: string;
  address: string;
  mapsUrl?: string;
  image?: ImageAsset;
};

export type Wish = {
  id: string;
  name: string;
  message: string;
  dateLabel?: string;
};

export type GiftAccount = {
  id: string;
  kind: "bank" | "ewallet";
  provider: string;
  owner: string;
  number: string;
};

export type Feature =
  | "countdown"
  | "couple"
  | "story"
  | "events"
  | "gallery"
  | "rsvp"
  | "wishes"
  | "gift"
  | "music";

export type ThemeTokens = CSSProperties & {
  [key: `--inv-${string}`]: string | number | undefined;
};

export interface InvitationData {
  event: {
    title: string;
    datetime: string;
    dateLabel: string;
    locale: string;
    timeZone: string;
    openingText: string;
    statement: string;
    prayer: string;
    prayerSource?: string;
    closingMessage: string;
  };
  couple: { bride: Partner; groom: Partner };
  media: {
    cover: ImageAsset;
    hero: ImageAsset;
    closing: ImageAsset;
    story?: ImageAsset;
    background?: ImageAsset;
  };
  events: WeddingEvent[];
  story: Array<{
    year: string;
    title: string;
    description: string;
    image?: ImageAsset;
  }>;
  gallery: ImageAsset[];
  gifts: {
    title?: string;
    message?: string;
    accounts: GiftAccount[];
  };
  features: Record<Feature, boolean>;
  tokens?: ThemeTokens;
  musicUrl?: string;
  demo?: boolean;
}

export interface InvitationTemplateProps {
  data: InvitationData;
  guest?: Guest;
  rsvpSlot?: ReactNode;
  wishesSlot?: ReactNode;
  onRsvpClick?: () => void;
  onSendWish?: (wish: { name: string; message: string }) => Promise<void> | void;
}
