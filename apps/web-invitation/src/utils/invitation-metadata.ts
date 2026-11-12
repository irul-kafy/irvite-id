import type { Metadata } from 'next';
import {
  cleanInvitationEventTitle,
  extractCoupleNamesFromTitle,
} from '../renderers/adapter-utils';
import {
  getCanonicalInvitationUrl,
  getCanonicalEventUrl,
  getPublicInvitationBaseUrl,
} from './url';
import type { PublicInvitationResponse } from '../types/public-invitation';
import type { PublicEventResponse } from '../types/public-event';

export interface BuildInvitationMetadataOptions {
  uniqueCode?: string;
  slug?: string;
  publicRecipient?: string | null;
}

/**
 * Converts a raw media or asset path into a fully qualified absolute URL suitable for OpenGraph / WhatsApp preview crawlers.
 */
export function makeAbsoluteUrl(
  rawSrc?: string | null,
  baseUrl: string = getPublicInvitationBaseUrl(),
): string {
  if (!rawSrc || typeof rawSrc !== 'string') {
    return `${baseUrl}/logo.png`;
  }

  const trimmed = rawSrc.trim();
  if (!trimmed) {
    return `${baseUrl}/logo.png`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('/api-proxy')) {
    return `${baseUrl}${trimmed}`;
  }

  if (trimmed.startsWith('/invitations/') || trimmed.startsWith('/events/')) {
    return `${baseUrl}/api-proxy${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    return `${baseUrl}${trimmed}`;
  }

  return `${baseUrl}/${trimmed}`;
}

/**
 * Formats ISO date string into Indonesian readable format for social preview descriptions.
 * e.g. "Minggu, 14 Februari 2027"
 */
export function formatInvitationEventDate(
  isoDate?: string | null,
): string | null {
  if (!isoDate) return null;
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return null;
  }
}

/**
 * Selects the optimal hero or cover photograph from available event media,
 * falling back gracefully to the template's signature photo or Irvite brand asset.
 */
export function resolveOgImageUrl(
  mediaList?: Array<{ slot?: string; src: string; type?: string }>,
  themeCode?: string | null,
  baseUrl: string = getPublicInvitationBaseUrl(),
): string {
  // 1. Look for preferred hero/cover slots in mediaList
  if (Array.isArray(mediaList) && mediaList.length > 0) {
    const preferredSlots = [
      'hero',
      'photo-hero',
      'cover',
      'thumbnail',
      'photo_hero',
      'photo-bride',
      'groom',
      'bride',
    ];

    let chosen = mediaList.find(
      (m) =>
        m.slot &&
        preferredSlots.includes(m.slot.toLowerCase()) &&
        m.type !== 'AUDIO' &&
        m.type !== 'VIDEO',
    );

    if (!chosen) {
      chosen = mediaList.find(
        (m) =>
          (m.type === 'PHOTO' || !m.type || m.type === 'THUMBNAIL') &&
          m.type !== 'AUDIO' &&
          m.type !== 'VIDEO',
      );
    }

    if (chosen && chosen.src) {
      return makeAbsoluteUrl(chosen.src, baseUrl);
    }
  }

  // 2. Fallback to known template signature hero photo
  if (themeCode) {
    const cleanTheme = themeCode.toLowerCase().trim();
    const knownThemes = [
      'royal-velvet',
      'sekar-kedaton',
      'swarga-dewata',
      'aetheria',
      'opaline-nocturne',
      'ranah-cinta',
    ];
    if (knownThemes.includes(cleanTheme)) {
      return `${baseUrl}/templates/${cleanTheme}/photo-hero.webp`;
    }
  }

  // 3. Fallback to logo / default brand asset
  return `${baseUrl}/logo.png`;
}

/**
 * Builds standard OpenGraph, Twitter Card, and SEO metadata for digital invitations.
 * Tailored for Indonesian WhatsApp link unfurling and luxury digital cards.
 */
export function buildInvitationMetadata(
  data: PublicInvitationResponse | PublicEventResponse | null,
  options: BuildInvitationMetadataOptions = {},
): Metadata {
  const baseUrl = getPublicInvitationBaseUrl();

  if (!data || !data.event) {
    return {
      title: 'Undangan Pernikahan Digital | IRVITE',
      description: 'Undangan pernikahan digital eksklusif dan mewah dari IRVITE.',
    };
  }

  const rawTitle = data.event.title || 'Pernikahan';
  const cleanTitle = cleanInvitationEventTitle(rawTitle, 'Pernikahan');
  const coupleNames = extractCoupleNamesFromTitle(rawTitle);
  const displayTitle = coupleNames
    ? `The Wedding of ${coupleNames[0]} & ${coupleNames[1]}`
    : cleanTitle;

  // Determine recipient name (personal vs public link)
  const guestName =
    'guest' in data && data.guest?.name && !data.guest.isPublicRecipient
      ? data.guest.name
      : options.publicRecipient || null;

  // Personalized Page Title
  const pageTitle = guestName
    ? `${displayTitle} — Khusus Kepada Yth. ${guestName}`
    : `${displayTitle} — Digital Wedding Invitation`;

  // Concise luxury description
  const dateFormatted = formatInvitationEventDate(data.event.eventDate);
  const location = data.event.locationDetails?.trim() || null;
  const eventDetailsPrefix = [dateFormatted, location].filter(Boolean).join(' • ');

  let description = '';
  if (guestName) {
    description = eventDetailsPrefix
      ? `${eventDetailsPrefix}. Kepada Yth. ${guestName}, tanpa mengurangi rasa hormat, kami mengundang Anda untuk hadir pada hari bahagia kami.`
      : `Kepada Yth. ${guestName}, tanpa mengurangi rasa hormat, kami mengundang Anda untuk hadir pada hari bahagia kami. Buka tautan untuk melihat undangan digital selengkapnya.`;
  } else if (data.event.description) {
    description = eventDetailsPrefix
      ? `${eventDetailsPrefix}. ${data.event.description}`
      : data.event.description;
  } else {
    description = eventDetailsPrefix
      ? `${eventDetailsPrefix}. Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri perayaan pernikahan kami.`
      : `Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri perayaan pernikahan kami. Buka tautan untuk melihat undangan digital selengkapnya.`;
  }

  // Resolve Image
  const imageUrl = resolveOgImageUrl(
    data.media,
    data.template?.themeCode,
    baseUrl,
  );

  // Canonical URL
  let canonicalUrl = baseUrl;
  if (options.uniqueCode) {
    canonicalUrl =
      getCanonicalInvitationUrl(options.uniqueCode) ||
      `${baseUrl}/i/${encodeURIComponent(options.uniqueCode)}`;
  } else if (options.slug) {
    canonicalUrl =
      getCanonicalEventUrl(options.slug, options.publicRecipient) ||
      `${baseUrl}/e/${encodeURIComponent(options.slug)}`;
  }

  return {
    title: pageTitle,
    description,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageTitle,
      description,
      url: canonicalUrl,
      siteName: 'IRVITE — Premium Digital Invitation',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: pageTitle,
        },
      ],
      type: 'website',
      locale: 'id_ID',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [imageUrl],
    },
  };
}
