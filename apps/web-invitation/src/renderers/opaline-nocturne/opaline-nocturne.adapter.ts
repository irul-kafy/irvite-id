import type { PublicMediaDescriptor } from '../../types/public-invitation';
import type { RendererData } from '../registry';
import type { InvitationData, WeddingEvent, GiftAccount } from './types';

const DEFAULT_ASSET_BASE = '/templates/opaline-nocturne';

function resolveMediaUrl(src?: string, isPreview?: boolean): string | undefined {
  if (!src) return undefined;
  if (isPreview && /^blob:https?:\/\//.test(src)) return src;
  if (!src.startsWith('/') || src.startsWith('//') || /[\\\u0000-\u0020]/.test(src)) {
    return undefined;
  }
  return isPreview || src.startsWith('/api-proxy') ? src : `/api-proxy${src}`;
}

export function adaptOpalineNocturneData(
  payload: RendererData,
  isPreview: boolean = false,
): InvitationData {
  const content = (payload.event.content || {}) as Record<string, unknown>;
  const timeZone = (typeof content.timeZone === 'string' && content.timeZone) || 'Asia/Jakarta';

  const partnerOneName = (typeof content.partnerOneName === 'string' && content.partnerOneName.trim()) || 'Anindya';
  const partnerTwoName = (typeof content.partnerTwoName === 'string' && content.partnerTwoName.trim()) || 'Rafi';
  const partnerOneFullName = (typeof content.partnerOneFullName === 'string' && content.partnerOneFullName.trim()) || `${partnerOneName} Kirana`;
  const partnerTwoFullName = (typeof content.partnerTwoFullName === 'string' && content.partnerTwoFullName.trim()) || `${partnerTwoName} Adhitama`;

  const partnerOneFamily = (typeof content.partnerOneFamily === 'string' && content.partnerOneFamily.trim()) || 'Putri dari Bapak Pratama & Ibu Permatasari';
  const partnerTwoFamily = (typeof content.partnerTwoFamily === 'string' && content.partnerTwoFamily.trim()) || 'Putra dari Bapak Wijaya & Ibu Kusuma';

  const openingText =
    (typeof content.openingText === 'string' && content.openingText.trim()) ||
    (typeof content.intro === 'string' && content.intro.trim()) ||
    'Di bawah naungan malam yang hening dan kilau bintang, kami mengundang Anda untuk merayakan babak baru kisah kami.';

  const statement =
    (typeof content.statement === 'string' && content.statement.trim()) ||
    (typeof content.quote === 'string' && content.quote.trim()) ||
    'Dua perjalanan, satu tujuan. Di antara gemerisik dedaunan dan temaram malam, kami menemukan rumah.';

  const prayer =
    (typeof content.prayer === 'string' && content.prayer.trim()) ||
    'Ya Allah, jadikanlah cinta ini setenang malam yang damai, seteguh pepohonan rimba, dan seindah cahaya fajar.';

  const prayerSource =
    (typeof content.prayerSource === 'string' && content.prayerSource.trim()) ||
    'Doa kami untuk awal yang baru';

  const closingMessage =
    (typeof content.closingMessage === 'string' && content.closingMessage.trim()) ||
    (typeof content.closing === 'string' && content.closing.trim()) ||
    'Kehadiran dan doa restu Anda adalah pelita terindah bagi langkah perjalanan kami ke depan.';

  // Ceremonies -> events
  const rawCeremonies = Array.isArray(content.ceremonies) ? content.ceremonies : [];
  let events: WeddingEvent[] = [];

  if (rawCeremonies.length > 0) {
    events = rawCeremonies.map((c: any, idx: number) => ({
      id: `event-${idx + 1}`,
      title: (typeof c.title === 'string' && c.title.trim()) || (idx === 0 ? 'Akad Nikah' : 'Resepsi'),
      date: (typeof c.startDateTime === 'string' && c.startDateTime.split('T')[0]) || '2026-12-20',
      startTime: (typeof c.startDateTime === 'string' && c.startDateTime.split('T')[1]?.substring(0, 5)) || '16.00',
      endTime: (typeof c.endDateTime === 'string' && c.endDateTime.split('T')[1]?.substring(0, 5)) || undefined,
      venue: (typeof c.venue === 'string' && c.venue.trim()) || 'The Enchanted Conservatory',
      address: (typeof c.address === 'string' && c.address.trim()) || 'Lembang, Bandung, Jawa Barat',
      mapsUrl: typeof c.mapsUrl === 'string' && c.mapsUrl.startsWith('http') ? c.mapsUrl : undefined,
    }));
  } else {
    events = [
      {
        id: 'holy-matrimony',
        title: 'Pemberkatan & Akad',
        date: '2026-12-20',
        startTime: '16.00 WIB',
        endTime: '17.30 WIB',
        venue: 'The Enchanted Glasshouse',
        address: 'Jl. Maribaya, Lembang, Bandung, Jawa Barat',
      },
      {
        id: 'nocturne-reception',
        title: 'Nocturne Dinner & Reception',
        date: '2026-12-20',
        startTime: '18.30 WIB',
        endTime: '21.30 WIB',
        venue: 'The Pine Conservatory',
        address: 'Jl. Maribaya, Lembang, Bandung, Jawa Barat',
      },
    ];
  }

  // Story
  const rawStory = Array.isArray(content.story) ? content.story : [];
  let story: { year: string; title: string; description: string }[] = [];
  if (rawStory.length > 0) {
    story = rawStory.map((s: any, idx: number) => ({
      year: (typeof s.year === 'string' && s.year.trim()) || (typeof s.period === 'string' && s.period.trim()) || `202${idx + 1}`,
      title: (typeof s.title === 'string' && s.title.trim()) || `Kisah ${idx + 1}`,
      description: (typeof s.description === 'string' && s.description.trim()) || (typeof s.body === 'string' && s.body.trim()) || '',
    }));
  } else {
    story = [
      {
        year: '2021',
        title: 'Di Bawah Langit Temaram',
        description: 'Sebuah pertemuan sederhana menjadi awal percakapan panjang yang tak pernah ingin kami akhiri.',
      },
      {
        year: '2026',
        title: 'Ikrar di Hening Hutan',
        description: 'Setelah menyusuri rute panjang kehidupan, kami memilih untuk melangkah bersama selamanya.',
      },
    ];
  }

  // Media
  const mediaBySlot = payload.mediaBySlot || {};
  const heroDesc: PublicMediaDescriptor | undefined = mediaBySlot['hero']?.[0] || payload.media?.find((m) => m.slot === 'hero' || m.slot === 'cover');
  const closingDesc: PublicMediaDescriptor | undefined = mediaBySlot['closing']?.[0] || payload.media?.find((m) => m.slot === 'closing');
  const storyDesc: PublicMediaDescriptor | undefined = mediaBySlot['story']?.[0] || payload.media?.find((m) => m.slot === 'story');
  const galleryDescList: PublicMediaDescriptor[] = mediaBySlot['gallery'] || payload.media?.filter((m) => m.slot === 'gallery') || [];

  const heroUrl = resolveMediaUrl(heroDesc?.src, isPreview) || `${DEFAULT_ASSET_BASE}/images/couple-evening.webp`;
  const closingUrl = resolveMediaUrl(closingDesc?.src, isPreview) || `${DEFAULT_ASSET_BASE}/images/closing.webp`;
  const storyUrl = resolveMediaUrl(storyDesc?.src, isPreview) || `${DEFAULT_ASSET_BASE}/images/enchanted-forest.webp`;

  const defaultGallery = [
    { src: `${DEFAULT_ASSET_BASE}/images/couple-evening.webp`, alt: 'Keanggunan di Balik Malam' },
    { src: `${DEFAULT_ASSET_BASE}/images/enchanted-forest.webp`, alt: 'Hutan Keabadian' },
    { src: `${DEFAULT_ASSET_BASE}/images/nocturne-garden.webp`, alt: 'Taman Opaline' },
    { src: `${DEFAULT_ASSET_BASE}/images/closing.webp`, alt: 'Awal Langkah Abadi' },
  ];

  const gallery = galleryDescList.length > 0
    ? galleryDescList.map((g, idx) => ({
        src: resolveMediaUrl(g.src, isPreview) || defaultGallery[idx % defaultGallery.length].src,
        alt: `Galeri Foto ${idx + 1}`,
      }))
    : defaultGallery;

  // Gift Accounts
  const rawAccounts = Array.isArray(content.giftAccounts) ? content.giftAccounts : [];
  const accounts: GiftAccount[] = rawAccounts.map((a: any, idx: number) => ({
    id: `gift-${idx + 1}`,
    kind: 'bank',
    provider: (typeof a.bankName === 'string' && a.bankName.trim()) || 'BCA',
    number: (typeof a.accountNumber === 'string' && a.accountNumber.trim()) || '1234567890',
    owner: (typeof a.accountHolder === 'string' && a.accountHolder.trim()) || partnerOneFullName,
  }));

  const bgMusicDesc = mediaBySlot['bg-music']?.[0] || payload.media?.find((m) => m.slot === 'bg-music');
  const bgMusicUrl = resolveMediaUrl(bgMusicDesc?.src, isPreview);

  const eventDate = payload.event.eventDate || '2026-12-20T16:00:00+07:00';

  return {
    event: {
      title: payload.event.title || 'The Nocturne Celebration',
      datetime: eventDate,
      dateLabel: '20 DESEMBER 2026',
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
        portrait: { src: heroUrl, alt: `Potret ${partnerOneName}` },
      },
      groom: {
        name: partnerTwoFullName,
        shortName: partnerTwoName,
        parents: partnerTwoFamily,
        portrait: { src: heroUrl, alt: `Potret ${partnerTwoName}` },
      },
    },
    media: {
      cover: { src: heroUrl, alt: 'Cover Undangan' },
      hero: { src: heroUrl, alt: 'Foto Mempelai' },
      closing: { src: closingUrl, alt: 'Foto Penutup' },
      story: { src: storyUrl, alt: 'Foto Kisah' },
    },
    story,
    events,
    gallery,
    rsvp: {
      title: 'Reservasi Kehadiran',
      description: 'Konfirmasi kehadiran Anda di malam penuh keajaiban ini.',
      maxPax: payload.guest?.maxPax || 2,
    },
    wishes: {
      title: 'Doa & Ucapan',
      description: 'Kirimkan untaian doa dan harapan terbaik untuk kami.',
      items: [],
    },
    gifts: {
      title: 'Tanda Kasih',
      description: 'Doa restu Anda adalah hadiah terindah bagi pernikahan kami.',
      accounts,
    },
    music: bgMusicUrl ? { src: bgMusicUrl, title: 'Nocturne Melody' } : undefined,
  };
}
