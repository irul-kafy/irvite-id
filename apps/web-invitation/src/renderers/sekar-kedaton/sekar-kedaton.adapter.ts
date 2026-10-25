import type { PublicMediaDescriptor } from '../../types/public-invitation';

export interface SekarCeremonyItem {
  title: string;
  startDateTime: string;
  endDateTime?: string;
  venue: string;
  address?: string;
  mapsUrl?: string;
}

export interface SekarGiftAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface SekarKedatonContent {
  partnerOneName: string;
  partnerTwoName: string;
  timeZone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura';
  partnerOneFullName?: string;
  partnerTwoFullName?: string;
  partnerOneFamily?: string;
  partnerTwoFamily?: string;
  intro?: string;
  quote?: string;
  prayer?: string;
  closing?: string;
  ceremonies?: SekarCeremonyItem[];
  giftAccounts?: SekarGiftAccount[];
}

export interface SekarKedatonMedia {
  hero?: PublicMediaDescriptor;
  gallery: PublicMediaDescriptor[];
  bgMusic?: PublicMediaDescriptor;
}

export function adaptSekarKedatonContent(rawContent: unknown): SekarKedatonContent | null {
  if (!rawContent || typeof rawContent !== 'object' || Array.isArray(rawContent)) {
    return null;
  }
  const raw = rawContent as Record<string, unknown>;
  const p1 = typeof raw.partnerOneName === 'string' ? raw.partnerOneName.trim() : '';
  const p2 = typeof raw.partnerTwoName === 'string' ? raw.partnerTwoName.trim() : '';
  if (!p1 || !p2) return null;

  const validTz = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] as const;
  const tz = typeof raw.timeZone === 'string' && (validTz as readonly string[]).includes(raw.timeZone)
    ? (raw.timeZone as 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura')
    : 'Asia/Jakarta';

  const res: SekarKedatonContent = {
    partnerOneName: p1,
    partnerTwoName: p2,
    timeZone: tz,
  };

  if (typeof raw.partnerOneFullName === 'string') res.partnerOneFullName = raw.partnerOneFullName.trim();
  if (typeof raw.partnerTwoFullName === 'string') res.partnerTwoFullName = raw.partnerTwoFullName.trim();
  if (typeof raw.partnerOneFamily === 'string') res.partnerOneFamily = raw.partnerOneFamily.trim();
  else if (typeof raw.partnerOneParents === 'string') res.partnerOneFamily = raw.partnerOneParents.trim();
  if (typeof raw.partnerTwoFamily === 'string') res.partnerTwoFamily = raw.partnerTwoFamily.trim();
  else if (typeof raw.partnerTwoParents === 'string') res.partnerTwoFamily = raw.partnerTwoParents.trim();

  if (typeof raw.intro === 'string') res.intro = raw.intro.trim();
  else if (typeof raw.openingText === 'string') res.intro = raw.openingText.trim();

  if (typeof raw.quote === 'string') res.quote = raw.quote.trim();
  if (typeof raw.prayer === 'string') res.prayer = raw.prayer.trim();
  else if (typeof raw.prayerText === 'string') res.prayer = raw.prayerText.trim();

  if (typeof raw.closing === 'string') res.closing = raw.closing.trim();
  else if (typeof raw.closingText === 'string') res.closing = raw.closingText.trim();

  if (Array.isArray(raw.ceremonies)) {
    res.ceremonies = raw.ceremonies
      .filter((c: any) => c && typeof c === 'object')
      .slice(0, 4)
      .map((c: any) => ({
        title: typeof c.title === 'string' ? c.title : typeof c.name === 'string' ? c.name : 'Acara',
        startDateTime: typeof c.startDateTime === 'string' ? c.startDateTime : (c.date && c.startTime ? `${c.date}T${c.startTime}` : ''),
        endDateTime: typeof c.endDateTime === 'string' ? c.endDateTime : (c.date && c.endTime ? `${c.date}T${c.endTime}` : undefined),
        venue: typeof c.venue === 'string' ? c.venue : typeof c.venueName === 'string' ? c.venueName : 'Lokasi Acara',
        address: typeof c.address === 'string' ? c.address : undefined,
        mapsUrl: typeof c.mapsUrl === 'string' ? c.mapsUrl : undefined,
      }));
  }

  if (Array.isArray(raw.giftAccounts)) {
    res.giftAccounts = raw.giftAccounts
      .filter((g: any) => g && typeof g === 'object')
      .slice(0, 3)
      .map((g: any) => ({
        bankName: typeof g.bankName === 'string' ? g.bankName : '',
        accountNumber: typeof g.accountNumber === 'string' ? g.accountNumber : '',
        accountHolder: typeof g.accountHolder === 'string' ? g.accountHolder : '',
      }));
  }

  return res;
}

export function adaptSekarKedatonMedia(
  mediaBySlot?: Record<string, PublicMediaDescriptor[]>,
  mediaList?: PublicMediaDescriptor[],
): SekarKedatonMedia {
  const resolveSlot = (slot: string) => {
    if (mediaBySlot?.[slot]) return mediaBySlot[slot];
    if (mediaList) return mediaList.filter((m) => m.slot === slot);
    return [];
  };

  const hero = resolveSlot('hero').find((m) => m.type === 'PHOTO');
  const gallery = resolveSlot('gallery').filter((m) => m.type === 'PHOTO').slice(0, 6);
  const bgMusic = resolveSlot('bg-music').find((m) => m.type === 'AUDIO');

  return { hero, gallery, bgMusic };
}
