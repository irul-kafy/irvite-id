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
  story: {
    year: string;
    title: string;
    description: string;
    image?: ImageAsset;
  }[];
  events: WeddingEvent[];
  gallery: ImageAsset[];
  rsvp: {
    title: string;
    description: string;
  };
  wishes: { title: string; description: string; items: Wish[] };
  gifts: {
    title: string;
    description: string;
    accounts: GiftAccount[];
    address?: { recipient: string; address: string };
  };
  music?: { src: string; title: string };
  features?: Partial<Record<Feature, boolean>>;
}

export interface InvitationTemplateProps {
  data: InvitationData;
  guest?: Guest;
  theme?: ThemeTokens;
  /** Mount the existing IRVITE RsvpForm here. No RSVP logic belongs to this template. */
  rsvpSlot?: ReactNode;
  /** Optional existing platform wishes UI; the template never persists submissions. */
  wishesSlot?: ReactNode;
  callbacks?: {
    onOpen?: () => void;
    onOpenMaps?: (event: WeddingEvent) => void;
    onCopyGift?: (account: GiftAccount) => Promise<void> | void;
    onMusicChange?: (playing: boolean) => void;
  };
}
