import type { RendererData } from '../registry';
import {
  cleanInvitationEventTitle,
  extractCoupleNamesFromTitle,
} from '../adapter-utils';
import type { InvitationData, WeddingEvent, GiftAccount } from './types';

const DEFAULT_ASSET_BASE = '/templates/ranah-cinta';

function resolveMediaUrl(src?: string, isPreview?: boolean): string | undefined {
  if (!src) return undefined;
  if (isPreview && /^blob:https?:\/\//.test(src)) return src;
  if (!src.startsWith('/') || src.startsWith('//') || /[\\\u0000-\u0020]/.test(src)) {
    return undefined;
  }
  return isPreview || src.startsWith('/api-proxy') ? src : `/api-proxy${src}`;
}

export function adaptRanahCintaData(
  payload: RendererData,
  isPreview: boolean = false,
): InvitationData {
  const content = (payload.event.content || {}) as Record<string, unknown>;
  const timeZone = (typeof content.timeZone === 'string' && content.timeZone) || 'Asia/Jakarta';
  const extractedCouple = extractCoupleNamesFromTitle(payload.event.title);

  const partnerOneName =
    (typeof content.partnerOneName === 'string' && content.partnerOneName.trim()) ||
    extractedCouple?.[0] ||
    'Salma';
  const partnerTwoName =
    (typeof content.partnerTwoName === 'string' && content.partnerTwoName.trim()) ||
    extractedCouple?.[1] ||
    'Fadli';
  const partnerOneFullName =
    (typeof content.partnerOneFullName === 'string' && content.partnerOneFullName.trim()) ||
    (partnerOneName === 'Salma' ? 'Salma Putri Maharani' : partnerOneName);
  const partnerTwoFullName =
    (typeof content.partnerTwoFullName === 'string' && content.partnerTwoFullName.trim()) ||
    (partnerTwoName === 'Fadli' ? 'Fadli Aditya Pratama' : partnerTwoName);

  const partnerOneFamily = (typeof content.partnerOneFamily === 'string' && content.partnerOneFamily.trim()) || 'Putri dari Bapak Hendra Wijaya\ndan Ibu Ratna Puspita';
  const partnerTwoFamily = (typeof content.partnerTwoFamily === 'string' && content.partnerTwoFamily.trim()) || 'Putra dari Bapak Bambang Pratama\ndan Ibu Dewi Lestari';

  const openingText =
    (typeof content.openingText === 'string' && content.openingText.trim()) ||
    (typeof content.intro === 'string' && content.intro.trim()) ||
    'Dengan memohon rahmat dan rida Allah SWT, kami bermaksud menyatukan langkah dalam ikatan pernikahan. Dengan penuh sukacita, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu di hari bahagia kami.';

  const statement =
    (typeof content.statement === 'string' && content.statement.trim()) ||
    (typeof content.quote === 'string' && content.quote.trim()) ||
    'Bertemu dalam cinta, berpulang pada kita.';

  const prayer =
    (typeof content.prayer === 'string' && content.prayer.trim()) ||
    'Ya Allah, jadikanlah pernikahan ini tempat kami bertumbuh dalam kebaikan. Lembutkan hati kami untuk saling memahami, lapangkan sabar kami untuk saling menjaga, dan tuntun langkah kami untuk tetap memilih satu sama lain. Semoga rumah yang kami bangun dipenuhi ketenteraman, kasih sayang, dan keberkahan-Mu.';

  const prayerSource =
    (typeof content.prayerSource === 'string' && content.prayerSource.trim()) ||
    'Doa Pernikahan';

  const closingMessage =
    (typeof content.closingMessage === 'string' && content.closingMessage.trim()) ||
    (typeof content.closing === 'string' && content.closing.trim()) ||
    'Terima kasih telah menjadi bagian dari kisah kami. Kehadiran, doa, dan kasih yang Anda berikan akan selalu memiliki tempat istimewa di hati kami.';

  // Ceremonies -> events
  const rawCeremonies = Array.isArray(content.ceremonies) ? content.ceremonies : [];
  const rawEventDateStr =
    typeof payload.event.eventDate === 'string' && payload.event.eventDate.trim()
      ? payload.event.eventDate.trim()
      : '';
  const fallbackDatePart =
    rawEventDateStr && !isNaN(Date.parse(rawEventDateStr))
      ? new Date(rawEventDateStr).toISOString().split('T')[0]
      : '2026-11-22';
  const fallbackLocation =
    typeof payload.event.locationDetails === 'string' &&
    payload.event.locationDetails.trim()
      ? payload.event.locationDetails.trim()
      : '';
  let events: WeddingEvent[] = [];

  if (rawCeremonies.length > 0) {
    events = rawCeremonies.map((c: Record<string, unknown>, idx: number) => ({
      id: `event-${idx + 1}`,
      title: (typeof c.title === 'string' && c.title.trim()) || (idx === 0 ? 'Akad Nikah' : 'Resepsi'),
      date: (typeof c.startDateTime === 'string' && c.startDateTime.split('T')[0]) || fallbackDatePart,
      startTime: (typeof c.startDateTime === 'string' && c.startDateTime.split('T')[1]?.substring(0, 5)) || '08:00',
      endTime: (typeof c.endDateTime === 'string' && c.endDateTime.split('T')[1]?.substring(0, 5)) || undefined,
      venue: (typeof c.venue === 'string' && c.venue.trim()) || fallbackLocation || 'Balairung Keluarga',
      address: (typeof c.address === 'string' && c.address.trim()) || fallbackLocation || 'Padang, Sumatera Barat',
      mapsUrl: typeof c.mapsUrl === 'string' && c.mapsUrl.startsWith('http') ? c.mapsUrl : undefined,
    }));
  } else {
    events = [
      {
        id: 'ceremony',
        title: 'Akad Nikah',
        date: fallbackDatePart,
        startTime: '08:00 WIB',
        endTime: '10:00 WIB',
        venue: fallbackLocation || 'Balairung Keluarga',
        address: fallbackLocation || 'Padang, Sumatera Barat',
        mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Padang%2C+Sumatera+Barat',
      },
      {
        id: 'reception',
        title: 'Resepsi',
        date: fallbackDatePart,
        startTime: '11:00 WIB',
        endTime: '14:00 WIB',
        venue: fallbackLocation || 'Balairung Keluarga',
        address: fallbackLocation || 'Padang, Sumatera Barat',
        mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Padang%2C+Sumatera+Barat',
      },
    ];
  }

  // Story
  const rawStory = Array.isArray(content.story) ? content.story : [];
  const story = rawStory.map((s: Record<string, unknown>, idx: number) => ({
    year: (typeof s.year === 'string' && s.year.trim()) || String(2022 + idx),
    title: (typeof s.title === 'string' && s.title.trim()) || 'Kisah Kami',
    description: (typeof s.description === 'string' && s.description.trim()) || '',
  }));

  // Gift accounts
  const rawAccounts = Array.isArray(content.giftAccounts) ? content.giftAccounts : [];
  let accounts: GiftAccount[] = [];

  if (rawAccounts.length > 0) {
    accounts = rawAccounts.map((a: Record<string, unknown>, idx: number) => ({
      id: `account-${idx + 1}`,
      kind: 'bank' as const,
      provider: (typeof a.bankName === 'string' && a.bankName.trim()) || 'Bank Transfer',
      number: (typeof a.accountNumber === 'string' && a.accountNumber.trim()) || '',
      owner: (typeof a.accountHolder === 'string' && a.accountHolder.trim()) || `${partnerOneName} & ${partnerTwoName}`,
    }));
  } else if (typeof content.accountNumber === 'string' && content.accountNumber.trim()) {
    accounts = [
      {
        id: 'default-account',
        kind: 'bank' as const,
        provider: (typeof content.bankLabel === 'string' && content.bankLabel.trim()) || 'Bank Transfer',
        number: content.accountNumber.trim(),
        owner: (typeof content.giftOwner === 'string' && content.giftOwner.trim()) || `${partnerOneName} & ${partnerTwoName}`,
      },
    ];
  }

  // Media
  const mediaBySlot = payload.mediaBySlot || {};
  const findMedia = (slotKey: string): string | undefined => {
    const fromSlot = mediaBySlot[slotKey]?.[0]?.src || mediaBySlot[slotKey.toLowerCase()]?.[0]?.src;
    if (fromSlot) return resolveMediaUrl(fromSlot, isPreview);
    const item = (payload.media || []).find(
      (m) => m.slot === slotKey || m.slot === slotKey.toLowerCase(),
    );
    return item ? resolveMediaUrl(item.src, isPreview) : undefined;
  };

  const coverMedia = findMedia('COVER') || `${DEFAULT_ASSET_BASE}/ranah-landscape.png`;
  const heroMedia = findMedia('HERO') || `${DEFAULT_ASSET_BASE}/couple-hero.jpg`;
  const couple1Media =
    findMedia('BRIDE') ||
    findMedia('COUPLE_1') ||
    `${DEFAULT_ASSET_BASE}/couple-hero.jpg`;
  const couple2Media =
    findMedia('GROOM') ||
    findMedia('COUPLE_2') ||
    `${DEFAULT_ASSET_BASE}/couple-hero.jpg`;
  const bgMusic = findMedia('BG-MUSIC') || findMedia('BACKGROUND_MUSIC');
  const qrisUrl = findMedia('QRIS') || undefined;

  const firstCeremonyStart =
    rawCeremonies.length > 0 &&
    typeof (rawCeremonies[0] as Record<string, unknown>)?.startDateTime === 'string' &&
    ((rawCeremonies[0] as Record<string, unknown>).startDateTime as string).trim()
      ? ((rawCeremonies[0] as Record<string, unknown>).startDateTime as string).trim()
      : '';

  const rawEventDate = firstCeremonyStart || payload.event.eventDate || '2026-11-22T08:00:00+07:00';
  const dateLabel =
    !isNaN(Date.parse(rawEventDate))
      ? new Date(rawEventDate).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone,
        })
      : '22 November 2026';

  return {
    event: {
      title: cleanInvitationEventTitle(
        payload.event.title,
        `Pernikahan ${partnerOneName} & ${partnerTwoName}`,
      ),
      datetime: rawEventDate,
      dateLabel,
      locale: 'id-ID',
      timeZone,
      openingText,
      statement,
      prayer,
      prayerSource,
      closingMessage,
    },
    couple: {
      bride: {
        name: partnerOneFullName,
        shortName: partnerOneName,
        parents: partnerOneFamily,
        portrait: couple1Media
          ? { src: couple1Media, alt: `Foto ${partnerOneName}` }
          : undefined,
      },
      groom: {
        name: partnerTwoFullName,
        shortName: partnerTwoName,
        parents: partnerTwoFamily,
        portrait: couple2Media
          ? { src: couple2Media, alt: `Foto ${partnerTwoName}` }
          : undefined,
      },
    },
    media: {
      cover: { src: coverMedia, alt: 'Ranah Cinta Cover' },
      hero: { src: heroMedia, alt: 'Hero Minang Couple' },
      closing: { src: `${DEFAULT_ASSET_BASE}/ranah-landscape.png`, alt: 'Closing Landscape' },
    },
    events,
    story,
    gallery: [],
    gifts: {
      title: (typeof content.giftTitle === 'string' && content.giftTitle.trim()) || 'Tanda Kasih',
      message:
        (typeof content.giftMessage === 'string' && content.giftMessage.trim()) ||
        'Kehadiran dan doa restu Anda adalah hadiah terindah bagi kami. Apabila Anda ingin berbagi tanda kasih, kami menerimanya dengan penuh rasa syukur.',
      accounts,
      qrisUrl,
    },
    features: {
      countdown: true,
      couple: true,
      story: story.length > 0,
      events: events.length > 0,
      gallery: false,
      rsvp: true,
      wishes: false,
      gift: accounts.length > 0 || Boolean(content.giftMessage) || Boolean(qrisUrl),
      music: Boolean(bgMusic),
    },
    musicUrl: bgMusic,
  };
}
