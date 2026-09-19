import type { PublicMediaDescriptor } from '../../types/public-invitation';
import type {
  ClassicLetterContent,
  ClassicLetterMedia,
  ClassicCeremonyItem,
  ClassicGiftAccount,
  ClassicResolvedBackground,
} from './classic-letter.types';

const VALID_TIMEZONES = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] as const;
type ValidTimeZone = (typeof VALID_TIMEZONES)[number];

const STATIC_DEFAULT_GARDEN = '/templates/classic-letter/garden.jpg';
const STATIC_DEFAULT_POSTER = '/templates/classic-letter/flowers-poster.jpg';

export function adaptClassicLetterContent(
  rawContent: unknown,
): ClassicLetterContent | null {
  if (!rawContent || typeof rawContent !== 'object' || Array.isArray(rawContent)) {
    return null;
  }

  const raw = rawContent as Record<string, unknown>;

  // Required root fields validation - fail closed if missing, wrong type, empty, or invalid
  if (typeof raw.partnerOneName !== 'string') return null;
  const partnerOneName = raw.partnerOneName.trim();
  if (!partnerOneName) return null;

  if (typeof raw.partnerTwoName !== 'string') return null;
  const partnerTwoName = raw.partnerTwoName.trim();
  if (!partnerTwoName) return null;

  if (typeof raw.timeZone !== 'string') return null;
  const timeZone = raw.timeZone.trim() as ValidTimeZone;
  if (!VALID_TIMEZONES.includes(timeZone)) return null;

  const result: ClassicLetterContent = {
    partnerOneName,
    partnerTwoName,
    timeZone,
  };

  if (typeof raw.partnerOneFullName === 'string') {
    const trimmed = raw.partnerOneFullName.trim();
    if (trimmed) result.partnerOneFullName = trimmed;
  }
  if (typeof raw.partnerTwoFullName === 'string') {
    const trimmed = raw.partnerTwoFullName.trim();
    if (trimmed) result.partnerTwoFullName = trimmed;
  }
  if (typeof raw.partnerOneFamily === 'string') {
    const trimmed = raw.partnerOneFamily.trim();
    if (trimmed) result.partnerOneFamily = trimmed;
  }
  if (typeof raw.partnerTwoFamily === 'string') {
    const trimmed = raw.partnerTwoFamily.trim();
    if (trimmed) result.partnerTwoFamily = trimmed;
  }
  if (typeof raw.intro === 'string') {
    const trimmed = raw.intro.trim();
    if (trimmed) result.intro = trimmed;
  }
  if (typeof raw.quote === 'string') {
    const trimmed = raw.quote.trim();
    if (trimmed) result.quote = trimmed;
  }
  if (typeof raw.prayer === 'string') {
    const trimmed = raw.prayer.trim();
    if (trimmed) result.prayer = trimmed;
  }
  if (typeof raw.closing === 'string') {
    const trimmed = raw.closing.trim();
    if (trimmed) result.closing = trimmed;
  }
  if (typeof raw._schemaVersion === 'number') {
    result._schemaVersion = raw._schemaVersion;
  }

  // Ceremonies (max 2)
  if (Array.isArray(raw.ceremonies)) {
    const ceremonies: ClassicCeremonyItem[] = [];
    for (const c of raw.ceremonies) {
      if (ceremonies.length >= 2) break;
      if (!c || typeof c !== 'object') continue;
      const item = c as Record<string, unknown>;
      if (
        typeof item.title === 'string' &&
        typeof item.startDateTime === 'string' &&
        typeof item.venue === 'string'
      ) {
        const title = item.title.trim();
        const startDateTime = item.startDateTime.trim();
        const venue = item.venue.trim();

        if (title && startDateTime && venue) {
          const ceremony: ClassicCeremonyItem = {
            title,
            startDateTime,
            venue,
          };

          if (typeof item.endDateTime === 'string' && item.endDateTime.trim()) {
            ceremony.endDateTime = item.endDateTime.trim();
          }
          if (typeof item.address === 'string' && item.address.trim()) {
            ceremony.address = item.address.trim();
          }
          if (typeof item.mapsUrl === 'string' && item.mapsUrl.trim()) {
            ceremony.mapsUrl = item.mapsUrl.trim();
          }

          ceremonies.push(ceremony);
        }
      }
    }
    if (ceremonies.length > 0) {
      result.ceremonies = ceremonies;
    }
  }

  // Gift Accounts (max 2) - accountNumber MUST remain string to preserve leading zeroes
  if (Array.isArray(raw.giftAccounts)) {
    const giftAccounts: ClassicGiftAccount[] = [];
    for (const g of raw.giftAccounts) {
      if (giftAccounts.length >= 2) break;
      if (!g || typeof g !== 'object') continue;
      const item = g as Record<string, unknown>;
      if (
        typeof item.bankName === 'string' &&
        typeof item.accountNumber === 'string' &&
        typeof item.accountHolder === 'string'
      ) {
        const bankName = item.bankName.trim();
        const accountNumber = item.accountNumber.trim();
        const accountHolder = item.accountHolder.trim();

        if (bankName && accountNumber && accountHolder) {
          giftAccounts.push({
            bankName,
            accountNumber,
            accountHolder,
          });
        }
      }
    }
    if (giftAccounts.length > 0) {
      result.giftAccounts = giftAccounts;
    }
  }

  return result;
}

export function adaptClassicLetterMedia(
  mediaBySlot?: Record<string, PublicMediaDescriptor[]>,
  mediaList?: PublicMediaDescriptor[],
): ClassicLetterMedia {
  const resolveSlotItems = (slotName: string): PublicMediaDescriptor[] => {
    if (mediaBySlot && mediaBySlot[slotName]) {
      return mediaBySlot[slotName];
    }
    if (mediaList) {
      return mediaList.filter((m) => m.slot === slotName);
    }
    return [];
  };

  const bgPhotoItems = resolveSlotItems('bg-photo').filter((m) => m.type === 'PHOTO');
  const bgPhoto = bgPhotoItems.length > 0 ? bgPhotoItems[0] : undefined;

  const bgVideoItems = resolveSlotItems('bg-video').filter((m) => m.type === 'VIDEO');
  const bgVideo = bgVideoItems.length > 0 ? bgVideoItems[0] : undefined;

  const bgPosterItems = resolveSlotItems('bg-poster').filter((m) => m.type === 'PHOTO');
  const bgPoster = bgPosterItems.length > 0 ? bgPosterItems[0] : undefined;

  const coupleItems = resolveSlotItems('couple-photo').filter((m) => m.type === 'PHOTO');
  const couplePhoto = coupleItems.length > 0 ? coupleItems[0] : undefined;

  const galleryItems = resolveSlotItems('gallery').filter((m) => m.type === 'PHOTO');
  const gallery: PublicMediaDescriptor[] = [];
  const seen = new Set<string>();
  for (const item of galleryItems) {
    const key = item.id || item.src;
    if (!seen.has(key)) {
      seen.add(key);
      gallery.push(item);
      if (gallery.length >= 2) break;
    }
  }

  // Precedence rules:
  // If uploaded bg-video exists: use video. Poster precedence: 1. uploaded bg-poster, 2. flowers-poster.jpg
  // If NO uploaded bg-video: photo precedence: 1. uploaded bg-photo, 2. garden.jpg
  const resolvedBg: ClassicResolvedBackground = bgVideo && bgVideo.src
    ? {
        type: 'video',
        videoSrc: bgVideo.src,
        posterSrc: bgPoster?.src || STATIC_DEFAULT_POSTER,
        photoSrc: bgPhoto?.src || STATIC_DEFAULT_GARDEN,
      }
    : {
        type: 'photo',
        videoSrc: undefined,
        posterSrc: bgPoster?.src || STATIC_DEFAULT_POSTER,
        photoSrc: bgPhoto?.src || STATIC_DEFAULT_GARDEN,
      };

  return {
    bgPhoto,
    bgVideo,
    bgPoster,
    couplePhoto,
    gallery,
    resolvedBg,
  };
}
