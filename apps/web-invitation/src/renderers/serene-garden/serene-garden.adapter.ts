import type { PublicMediaDescriptor } from '../../types/public-invitation';
import type {
  SereneGardenContent,
  SereneGardenMedia,
  SereneCeremonyItem,
  SereneGiftAccountItem,
} from './serene-garden.types';

export function adaptSereneGardenContent(
  rawContent: unknown,
): SereneGardenContent | null {
  if (!rawContent || typeof rawContent !== 'object' || Array.isArray(rawContent)) {
    return null;
  }

  const raw = rawContent as Record<string, unknown>;

  const candidateKeys = [
    'partnerOneName',
    'partnerTwoName',
    'partnerOneFullName',
    'partnerTwoFullName',
    'partnerOneParents',
    'partnerTwoParents',
    'openingText',
    'prayerText',
    'closingText',
    'timeZone',
    'ceremonies',
    'giftTitle',
    'giftMessage',
    'giftAccounts',
  ];

  const hasAnyKey = candidateKeys.some(
    (k) => raw[k] !== undefined && raw[k] !== null && raw[k] !== '',
  );

  if (!hasAnyKey) {
    return null;
  }

  const result: SereneGardenContent = {};

  if (typeof raw.partnerOneName === 'string') result.partnerOneName = raw.partnerOneName.trim();
  if (typeof raw.partnerTwoName === 'string') result.partnerTwoName = raw.partnerTwoName.trim();
  if (typeof raw.partnerOneFullName === 'string') result.partnerOneFullName = raw.partnerOneFullName.trim();
  if (typeof raw.partnerTwoFullName === 'string') result.partnerTwoFullName = raw.partnerTwoFullName.trim();
  if (typeof raw.partnerOneParents === 'string') result.partnerOneParents = raw.partnerOneParents.trim();
  if (typeof raw.partnerTwoParents === 'string') result.partnerTwoParents = raw.partnerTwoParents.trim();
  if (typeof raw.openingText === 'string') result.openingText = raw.openingText.trim();
  if (typeof raw.prayerText === 'string') result.prayerText = raw.prayerText.trim();
  if (typeof raw.closingText === 'string') result.closingText = raw.closingText.trim();
  if (typeof raw.timeZone === 'string') result.timeZone = raw.timeZone.trim();
  if (typeof raw.giftTitle === 'string') result.giftTitle = raw.giftTitle.trim();
  if (typeof raw.giftMessage === 'string') result.giftMessage = raw.giftMessage.trim();
  if (typeof raw._schemaVersion === 'number') result._schemaVersion = raw._schemaVersion;

  // Ceremonies (max 2)
  if (Array.isArray(raw.ceremonies)) {
    const ceremonies: SereneCeremonyItem[] = [];
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

  // Gift Accounts (max 3, accountNumber strictly string)
  if (Array.isArray(raw.giftAccounts)) {
    const accounts: SereneGiftAccountItem[] = [];
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

export function adaptSereneGardenMedia(
  mediaBySlot?: Record<string, PublicMediaDescriptor[]>,
  mediaList?: PublicMediaDescriptor[],
): SereneGardenMedia {
  const result: SereneGardenMedia = {};

  const resolveSlotItems = (slotName: string): PublicMediaDescriptor[] => {
    if (mediaBySlot && mediaBySlot[slotName]) {
      return mediaBySlot[slotName];
    }
    if (mediaList) {
      return mediaList.filter((m) => m.slot === slotName);
    }
    return [];
  };

  const p1Items = resolveSlotItems('partner-one-photo').filter((m) => m.type === 'PHOTO');
  if (p1Items.length > 0) {
    result.partnerOnePhoto = p1Items[0];
  }

  const p2Items = resolveSlotItems('partner-two-photo').filter((m) => m.type === 'PHOTO');
  if (p2Items.length > 0) {
    result.partnerTwoPhoto = p2Items[0];
  }

  return result;
}
