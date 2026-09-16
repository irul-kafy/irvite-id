import type { PublicMediaDescriptor } from '../../types/public-invitation';
import type {
  SundaPuspaContent,
  SundaPuspaMedia,
  SundaCeremonyItem,
  SundaStoryItem,
} from './sunda-puspa.types';

const VALID_TIMEZONES = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] as const;
type ValidTimeZone = (typeof VALID_TIMEZONES)[number];

export function adaptSundaPuspaContent(
  rawContent: unknown,
): SundaPuspaContent | null {
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

  const result: SundaPuspaContent = {
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
  if (typeof raw.partnerOneParents === 'string') {
    const trimmed = raw.partnerOneParents.trim();
    if (trimmed) result.partnerOneParents = trimmed;
  }
  if (typeof raw.partnerTwoParents === 'string') {
    const trimmed = raw.partnerTwoParents.trim();
    if (trimmed) result.partnerTwoParents = trimmed;
  }
  if (typeof raw.coupleGreeting === 'string') {
    const trimmed = raw.coupleGreeting.trim();
    if (trimmed) result.coupleGreeting = trimmed;
  }
  if (typeof raw.openingText === 'string') {
    const trimmed = raw.openingText.trim();
    if (trimmed) result.openingText = trimmed;
  }
  if (typeof raw.prayerText === 'string') {
    const trimmed = raw.prayerText.trim();
    if (trimmed) result.prayerText = trimmed;
  }
  if (typeof raw.prayerSource === 'string') {
    const trimmed = raw.prayerSource.trim();
    if (trimmed) result.prayerSource = trimmed;
  }
  if (typeof raw.closingText === 'string') {
    const trimmed = raw.closingText.trim();
    if (trimmed) result.closingText = trimmed;
  }
  if (typeof raw._schemaVersion === 'number') {
    result._schemaVersion = raw._schemaVersion;
  }

  // Ceremonies (max 2)
  if (Array.isArray(raw.ceremonies)) {
    const ceremonies: SundaCeremonyItem[] = [];
    for (const c of raw.ceremonies) {
      if (ceremonies.length >= 2) break;
      if (!c || typeof c !== 'object') continue;
      const item = c as Record<string, unknown>;
      if (item.title && item.startDateTime && item.venue) {
        ceremonies.push({
          title: String(item.title).trim(),
          startDateTime: String(item.startDateTime).trim(),
          ...(item.endDateTime ? { endDateTime: String(item.endDateTime).trim() } : {}),
          venue: String(item.venue).trim(),
          ...(item.address ? { address: String(item.address).trim() } : {}),
          ...(item.mapsUrl ? { mapsUrl: String(item.mapsUrl).trim() } : {}),
        });
      }
    }
    if (ceremonies.length > 0) {
      result.ceremonies = ceremonies;
    }
  }

  // Story (max 5)
  if (Array.isArray(raw.story)) {
    const stories: SundaStoryItem[] = [];
    for (const s of raw.story) {
      if (stories.length >= 5) break;
      if (!s || typeof s !== 'object') continue;
      const item = s as Record<string, unknown>;
      if (item.year && item.title && item.text) {
        stories.push({
          year: String(item.year).trim(),
          title: String(item.title).trim(),
          text: String(item.text).trim(),
        });
      }
    }
    if (stories.length > 0) {
      result.story = stories;
    }
  }

  return result;
}

export function adaptSundaPuspaMedia(
  mediaBySlot?: Record<string, PublicMediaDescriptor[]>,
  mediaList?: PublicMediaDescriptor[],
): SundaPuspaMedia {
  const result: SundaPuspaMedia = {
    gallery: [],
  };

  const resolveSlotItems = (slotName: string): PublicMediaDescriptor[] => {
    if (mediaBySlot && mediaBySlot[slotName]) {
      return mediaBySlot[slotName];
    }
    if (mediaList) {
      return mediaList.filter((m) => m.slot === slotName);
    }
    return [];
  };

  const coupleItems = resolveSlotItems('couple-photo').filter((m) => m.type === 'PHOTO');
  if (coupleItems.length > 0) {
    result.couplePhoto = coupleItems[0];
  }

  const galleryItems = resolveSlotItems('gallery').filter((m) => m.type === 'PHOTO');
  const seen = new Set<string>();
  for (const item of galleryItems) {
    const key = item.id || item.src;
    if (!seen.has(key)) {
      seen.add(key);
      result.gallery.push(item);
      if (result.gallery.length >= 2) break;
    }
  }

  const musicItems = resolveSlotItems('bg-music').filter((m) => m.type === 'AUDIO');
  if (musicItems.length > 0) {
    result.bgMusic = musicItems[0];
  }

  return result;
}
