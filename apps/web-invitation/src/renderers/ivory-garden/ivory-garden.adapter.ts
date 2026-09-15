import type { PublicMediaDescriptor } from '../../types/public-invitation';
import type {
  IvoryGardenContent,
  IvoryGardenMedia,
  CeremonyItem,
  GiftAccountItem,
} from './ivory-garden.types';

/**
 * Normalizes and validates persisted content for IVORY_GARDEN.
 * - Preserves exact schema keys.
 * - Bounds ceremonies to max 2 items.
 * - Bounds giftAccounts to max 3 items.
 * - Strictly maintains accountNumber as a string (never coerces to number).
 * - Strips prohibited fields (no QRIS, no giftQr, no payment gateways).
 * - Fails closed (returns null) on empty or invalid structure.
 */
export function adaptIvoryGardenContent(
  rawContent: unknown,
): IvoryGardenContent | null {
  if (!rawContent || typeof rawContent !== 'object' || Array.isArray(rawContent)) {
    return null;
  }

  const raw = rawContent as Record<string, unknown>;

  const candidateKeys = [
    'partnerOneName',
    'partnerTwoName',
    'partnerOneParents',
    'partnerTwoParents',
    'openingText',
    'prayerText',
    'prayerSource',
    'closingText',
    'timeZone',
    'ceremonies',
    'giftTitle',
    'giftMessage',
    'giftAccounts',
    'mapsUrl',
  ];

  const hasAnyKey = candidateKeys.some(
    (k) => raw[k] !== undefined && raw[k] !== null && raw[k] !== '',
  );

  if (!hasAnyKey) {
    return null;
  }

  const result: IvoryGardenContent = {};

  if (typeof raw.partnerOneName === 'string') result.partnerOneName = raw.partnerOneName.trim();
  if (typeof raw.partnerTwoName === 'string') result.partnerTwoName = raw.partnerTwoName.trim();
  if (typeof raw.partnerOneParents === 'string') result.partnerOneParents = raw.partnerOneParents.trim();
  if (typeof raw.partnerTwoParents === 'string') result.partnerTwoParents = raw.partnerTwoParents.trim();
  if (typeof raw.openingText === 'string') result.openingText = raw.openingText.trim();
  if (typeof raw.prayerText === 'string') result.prayerText = raw.prayerText.trim();
  if (typeof raw.prayerSource === 'string') result.prayerSource = raw.prayerSource.trim();
  if (typeof raw.closingText === 'string') result.closingText = raw.closingText.trim();
  if (typeof raw.timeZone === 'string') result.timeZone = raw.timeZone.trim();
  if (typeof raw.giftTitle === 'string') result.giftTitle = raw.giftTitle.trim();
  if (typeof raw.giftMessage === 'string') result.giftMessage = raw.giftMessage.trim();
  if (typeof raw.mapsUrl === 'string') result.mapsUrl = raw.mapsUrl.trim();
  if (typeof raw._schemaVersion === 'number') result._schemaVersion = raw._schemaVersion;

  // Ceremonies (max 2)
  if (Array.isArray(raw.ceremonies)) {
    const ceremonies: CeremonyItem[] = [];
    for (const c of raw.ceremonies) {
      if (ceremonies.length >= 2) break;
      if (!c || typeof c !== 'object') continue;
      const item = c as Record<string, unknown>;
      if (item.title && item.dateTime && item.venue && item.address) {
        ceremonies.push({
          title: String(item.title).trim(),
          dateTime: String(item.dateTime).trim(),
          venue: String(item.venue).trim(),
          address: String(item.address).trim(),
          ...(item.mapsUrl ? { mapsUrl: String(item.mapsUrl).trim() } : {}),
        });
      }
    }
    if (ceremonies.length > 0) {
      result.ceremonies = ceremonies;
    }
  }

  // Gift Accounts (max 3, accountNumber strictly string)
  if (Array.isArray(raw.giftAccounts)) {
    const accounts: GiftAccountItem[] = [];
    for (const a of raw.giftAccounts) {
      if (accounts.length >= 3) break;
      if (!a || typeof a !== 'object') continue;
      const acc = a as Record<string, unknown>;
      if (acc.bankName && acc.accountNumber && acc.accountHolderName) {
        accounts.push({
          bankName: String(acc.bankName).trim(),
          accountNumber: String(acc.accountNumber).trim(), // Preserved as string
          accountHolderName: String(acc.accountHolderName).trim(),
        });
      }
    }
    if (accounts.length > 0) {
      result.giftAccounts = accounts;
    }
  }

  return result;
}

/**
 * Maps public media projection to IVORY_GARDEN slot descriptors:
 * - hero: single PHOTO
 * - gallery: 0–6 PHOTO items (preserving deterministic ordering)
 * - bgMusic: single AUDIO
 *
 * Never leaks raw storage keys or internal filesystem paths.
 */
export function adaptIvoryGardenMedia(
  mediaBySlot?: Record<string, PublicMediaDescriptor[]>,
  mediaList?: PublicMediaDescriptor[],
): IvoryGardenMedia {
  const result: IvoryGardenMedia = {
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

  // Hero: single PHOTO
  const heroItems = resolveSlotItems('hero').filter((m) => m.type === 'PHOTO');
  if (heroItems.length > 0) {
    result.hero = heroItems[0];
  }

  // Gallery: 0–6 PHOTO items
  const galleryItems = resolveSlotItems('gallery')
    .filter((m) => m.type === 'PHOTO')
    .slice(0, 6);
  result.gallery = galleryItems;

  // Background Music: single AUDIO
  const musicItems = resolveSlotItems('bg-music').filter((m) => m.type === 'AUDIO');
  if (musicItems.length > 0) {
    result.bgMusic = musicItems[0];
  }

  return result;
}
