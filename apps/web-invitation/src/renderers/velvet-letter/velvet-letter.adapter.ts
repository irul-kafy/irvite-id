import type { PublicMediaDescriptor } from '../../types/public-invitation';
import type {
  VelvetLetterContent,
  VelvetLetterMedia,
  VelvetCeremonyItem,
  VelvetGiftAccount,
} from './velvet-letter.types';

const VALID_TIMEZONES = [
  'Asia/Jakarta',
  'Asia/Makassar',
  'Asia/Jayapura',
] as const;
type ValidTimeZone = (typeof VALID_TIMEZONES)[number];

export function adaptVelvetLetterContent(
  rawContent: unknown,
): VelvetLetterContent | null {
  if (
    !rawContent ||
    typeof rawContent !== 'object' ||
    Array.isArray(rawContent)
  ) {
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

  const result: VelvetLetterContent = {
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
  if (typeof raw.prayer === 'string') {
    const trimmed = raw.prayer.trim();
    if (trimmed) result.prayer = trimmed;
  }
  if (typeof raw.closing === 'string') {
    const trimmed = raw.closing.trim();
    if (trimmed) result.closing = trimmed;
  }
  if (typeof raw.giftMessage === 'string') {
    const trimmed = raw.giftMessage.trim();
    if (trimmed) result.giftMessage = trimmed;
  }
  if (typeof raw._schemaVersion === 'number') {
    result._schemaVersion = raw._schemaVersion;
  }

  // Ceremonies (defensively capped at 2)
  if (Array.isArray(raw.ceremonies)) {
    const ceremonies: VelvetCeremonyItem[] = [];
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
          const ceremony: VelvetCeremonyItem = {
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

  // Gift Accounts (defensively capped at 2) - accountNumber MUST remain string to preserve leading zeroes
  if (Array.isArray(raw.giftAccounts)) {
    const giftAccounts: VelvetGiftAccount[] = [];
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

export function adaptVelvetLetterMedia(
  mediaBySlot?: Record<string, PublicMediaDescriptor[]>,
  mediaList?: PublicMediaDescriptor[],
): VelvetLetterMedia {
  const resolveSlotItems = (slotName: string): PublicMediaDescriptor[] => {
    if (mediaBySlot && mediaBySlot[slotName]) {
      return mediaBySlot[slotName];
    }
    if (mediaList) {
      return mediaList.filter((m) => m.slot === slotName);
    }
    return [];
  };

  const partnerOneItems = resolveSlotItems('partner-one-photo').filter(
    (m) => m.type === 'PHOTO',
  );
  const partnerOnePhoto =
    partnerOneItems.length > 0 ? partnerOneItems[0] : undefined;

  const partnerTwoItems = resolveSlotItems('partner-two-photo').filter(
    (m) => m.type === 'PHOTO',
  );
  const partnerTwoPhoto =
    partnerTwoItems.length > 0 ? partnerTwoItems[0] : undefined;

  return {
    partnerOnePhoto,
    partnerTwoPhoto,
  };
}
