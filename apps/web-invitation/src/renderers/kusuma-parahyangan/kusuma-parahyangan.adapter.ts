import type { PublicMediaDescriptor } from '../../types/public-invitation';
import type {
  KusumaCeremonyItem,
  KusumaGiftAccount,
  KusumaParahyanganContent,
  KusumaParahyanganMedia,
} from './types';

export function adaptKusumaParahyanganContent(
  rawContent: unknown,
  eventTitle?: string,
): KusumaParahyanganContent {
  const raw =
    rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)
      ? (rawContent as Record<string, unknown>)
      : {};

  let p1 = typeof raw.partnerOneName === 'string' ? raw.partnerOneName.trim() : '';
  let p2 = typeof raw.partnerTwoName === 'string' ? raw.partnerTwoName.trim() : '';

  // Extract from title if missing
  if ((!p1 || !p2) && eventTitle && typeof eventTitle === 'string') {
    const match = eventTitle.match(
      /(?:(?:pawiwahan|pernikahan|wedding(?:\s+of)?)\s+)?([a-zA-Z\s]+?)\s+(?:&|dan|and)\s+([a-zA-Z\s]+?)(?:\s*\(|$)/i,
    );
    if (match) {
      if (!p1 && match[1]?.trim()) p1 = match[1].trim();
      if (!p2 && match[2]?.trim()) p2 = match[2].trim();
    }
  }

  // Graceful defaults
  if (!p1) p1 = 'Citra';
  if (!p2) p2 = 'Galih';

  const validTz = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] as const;
  const tz =
    typeof raw.timeZone === 'string' &&
    (validTz as readonly string[]).includes(raw.timeZone)
      ? (raw.timeZone as 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura')
      : 'Asia/Jakarta';

  const res: KusumaParahyanganContent = {
    partnerOneName: p1,
    partnerTwoName: p2,
    timeZone: tz,
  };

  if (typeof raw.partnerOneFullName === 'string')
    res.partnerOneFullName = raw.partnerOneFullName.trim();
  if (typeof raw.partnerTwoFullName === 'string')
    res.partnerTwoFullName = raw.partnerTwoFullName.trim();

  if (typeof raw.partnerOneFamily === 'string')
    res.partnerOneFamily = raw.partnerOneFamily.trim();
  else if (typeof raw.partnerOneParents === 'string')
    res.partnerOneFamily = raw.partnerOneParents.trim();

  if (typeof raw.partnerTwoFamily === 'string')
    res.partnerTwoFamily = raw.partnerTwoFamily.trim();
  else if (typeof raw.partnerTwoParents === 'string')
    res.partnerTwoFamily = raw.partnerTwoParents.trim();

  if (typeof raw.openingGreeting === 'string')
    res.openingGreeting = raw.openingGreeting.trim();
  else if (typeof raw.coupleGreeting === 'string')
    res.openingGreeting = raw.coupleGreeting.trim();

  if (typeof raw.openingText === 'string')
    res.openingText = raw.openingText.trim();
  else if (typeof raw.intro === 'string')
    res.openingText = raw.intro.trim();

  if (typeof raw.quote === 'string') res.quote = raw.quote.trim();
  else if (typeof raw.statement === 'string') res.quote = raw.statement.trim();

  if (typeof raw.prayer === 'string') res.prayer = raw.prayer.trim();
  else if (typeof raw.prayerText === 'string') res.prayer = raw.prayerText.trim();

  if (typeof raw.closing === 'string') res.closing = raw.closing.trim();
  else if (typeof raw.closingText === 'string') res.closing = raw.closingText.trim();
  else if (typeof raw.closingMessage === 'string') res.closing = raw.closingMessage.trim();

  if (typeof raw.giftTitle === 'string') res.giftTitle = raw.giftTitle.trim();
  if (typeof raw.giftMessage === 'string') res.giftMessage = raw.giftMessage.trim();

  if (Array.isArray(raw.ceremonies)) {
    res.ceremonies = raw.ceremonies
      .filter((c: unknown): c is Record<string, unknown> => Boolean(c) && typeof c === 'object')
      .slice(0, 4)
      .map((c: Record<string, unknown>, idx: number) => ({
        title:
          typeof c.title === 'string'
            ? c.title
            : typeof c.name === 'string'
              ? c.name
              : idx === 0
                ? 'Akad Nikah (Ijáb Qobul)'
                : 'Resepsi & Mapag Panganten',
        startDateTime:
          typeof c.startDateTime === 'string'
            ? c.startDateTime
            : c.date && c.startTime
              ? `${c.date}T${c.startTime}`
              : '',
        endDateTime:
          typeof c.endDateTime === 'string'
            ? c.endDateTime
            : c.date && c.endTime
              ? `${c.date}T${c.endTime}`
              : undefined,
        venue:
          typeof c.venue === 'string'
            ? c.venue
            : typeof c.venueName === 'string'
              ? c.venueName
              : 'Gedung Acara',
        address: typeof c.address === 'string' ? c.address : undefined,
        mapsUrl: typeof c.mapsUrl === 'string' ? c.mapsUrl : undefined,
      }));
  }

  if (Array.isArray(raw.giftAccounts)) {
    res.giftAccounts = raw.giftAccounts
      .filter((g: unknown): g is Record<string, unknown> => Boolean(g) && typeof g === 'object')
      .slice(0, 4)
      .map((g: Record<string, unknown>) => ({
        bankName: typeof g.bankName === 'string' ? g.bankName.trim() : 'Bank',
        accountNumber: typeof g.accountNumber === 'string' ? g.accountNumber.trim() : '',
        accountHolder: typeof g.accountHolder === 'string' ? g.accountHolder.trim() : '',
      }))
      .filter((g: KusumaGiftAccount) => g.accountNumber.length > 0);
  }

  return res;
}

export function adaptKusumaParahyanganMedia(
  mediaBySlot?: Record<string, PublicMediaDescriptor[]>,
  mediaList?: PublicMediaDescriptor[],
): KusumaParahyanganMedia {
  const result: KusumaParahyanganMedia = {
    gallery: [],
  };

  if (mediaBySlot) {
    if (mediaBySlot['hero'] && mediaBySlot['hero'].length > 0) {
      result.hero = mediaBySlot['hero'][0];
    }
    if (mediaBySlot['bride'] && mediaBySlot['bride'].length > 0) {
      result.bride = mediaBySlot['bride'][0];
    } else if (mediaBySlot['couple_1'] && mediaBySlot['couple_1'].length > 0) {
      result.bride = mediaBySlot['couple_1'][0];
    }
    if (mediaBySlot['groom'] && mediaBySlot['groom'].length > 0) {
      result.groom = mediaBySlot['groom'][0];
    } else if (mediaBySlot['couple_2'] && mediaBySlot['couple_2'].length > 0) {
      result.groom = mediaBySlot['couple_2'][0];
    }
    if (mediaBySlot['gallery'] && mediaBySlot['gallery'].length > 0) {
      result.gallery = [...mediaBySlot['gallery']];
    }
    if (mediaBySlot['bg-music'] && mediaBySlot['bg-music'].length > 0) {
      result.bgMusic = mediaBySlot['bg-music'][0];
    } else if (mediaBySlot['music'] && mediaBySlot['music'].length > 0) {
      result.bgMusic = mediaBySlot['music'][0];
    }
  }

  if (Array.isArray(mediaList)) {
    if (!result.hero) {
      result.hero = mediaList.find((m) => m.slot === 'hero');
    }
    if (!result.bride) {
      result.bride = mediaList.find((m) => m.slot === 'bride' || m.slot === 'couple_1');
    }
    if (!result.groom) {
      result.groom = mediaList.find((m) => m.slot === 'groom' || m.slot === 'couple_2');
    }
    if (result.gallery.length === 0) {
      result.gallery = mediaList.filter((m) => m.slot === 'gallery');
    }
    if (!result.bgMusic) {
      result.bgMusic = mediaList.find((m) => m.slot === 'bg-music' || m.slot === 'music');
    }
  }

  return result;
}

