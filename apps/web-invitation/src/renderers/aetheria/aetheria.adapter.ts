import type { PublicMediaDescriptor } from '../../types/public-invitation';
import type { RendererData } from '../registry';
import type { InvitationData, WeddingEvent, GiftAccount } from './types';

const DEFAULT_ASSET_BASE = '/templates/aetheria';

function resolveMediaUrl(src?: string, isPreview?: boolean): string | undefined {
  if (!src) return undefined;
  if (isPreview && /^blob:https?:\/\//.test(src)) return src;
  if (!src.startsWith('/') || src.startsWith('//') || /[\\\u0000-\u0020]/.test(src)) {
    return undefined;
  }
  return isPreview || src.startsWith('/api-proxy') ? src : `/api-proxy${src}`;
}

export function adaptAetheriaData(
  payload: RendererData,
  isPreview: boolean = false,
): InvitationData {
  const content = (payload.event.content || {}) as Record<string, unknown>;
  const timeZone = (typeof content.timeZone === 'string' && content.timeZone) || 'Asia/Jakarta';

  const partnerOneName = (typeof content.partnerOneName === 'string' && content.partnerOneName.trim()) || 'Lyra';
  const partnerTwoName = (typeof content.partnerTwoName === 'string' && content.partnerTwoName.trim()) || 'Elian';
  const partnerOneFullName = (typeof content.partnerOneFullName === 'string' && content.partnerOneFullName.trim()) || `${partnerOneName} Adeline`;
  const partnerTwoFullName = (typeof content.partnerTwoFullName === 'string' && content.partnerTwoFullName.trim()) || `${partnerTwoName} Mahendra`;

  const partnerOneFamily = (typeof content.partnerOneFamily === 'string' && content.partnerOneFamily.trim()) || 'Putri dari Bapak Arya Pranata & Ibu Laras Kirana';
  const partnerTwoFamily = (typeof content.partnerTwoFamily === 'string' && content.partnerTwoFamily.trim()) || 'Putra dari Bapak Surya Mahendra & Ibu Maya Andriani';

  const openingText =
    (typeof content.openingText === 'string' && content.openingText.trim()) ||
    (typeof content.intro === 'string' && content.intro.trim()) ||
    'Di bawah langit yang sama, dua perjalanan menemukan satu rumah. Dengan penuh kebahagiaan, kami mengundang Anda menjadi bagian dari awal kisah kami.';

  const statement =
    (typeof content.statement === 'string' && content.statement.trim()) ||
    (typeof content.quote === 'string' && content.quote.trim()) ||
    'Di dunia seluas apa pun, aku akan selalu menemukanmu.';

  const prayer =
    (typeof content.prayer === 'string' && content.prayer.trim()) ||
    'Ya Tuhan, jadikan perjalanan ini tempat kami saling menguatkan. Tumbuhkan kasih yang sabar, hati yang penuh syukur, dan keberanian untuk memilih satu sama lain, setiap hari.';

  const prayerSource =
    (typeof content.prayerSource === 'string' && content.prayerSource.trim()) ||
    'Sebuah doa untuk perjalanan seumur hidup';

  const closingMessage =
    (typeof content.closingMessage === 'string' && content.closingMessage.trim()) ||
    (typeof content.closing === 'string' && content.closing.trim()) ||
    'Cerita ini menjadi lebih indah karena Anda ada di dalamnya. Terima kasih untuk setiap doa, kasih, dan kehadiran yang menyertai langkah pertama kami.';

  // Ceremonies -> events
  const rawCeremonies = Array.isArray(content.ceremonies) ? content.ceremonies : [];
  let events: WeddingEvent[] = [];

  if (rawCeremonies.length > 0) {
    events = rawCeremonies.map((c: any, idx: number) => ({
      id: `event-${idx + 1}`,
      title: (typeof c.title === 'string' && c.title.trim()) || (idx === 0 ? 'Pemberkatan' : 'Resepsi'),
      date: (typeof c.startDateTime === 'string' && c.startDateTime.split('T')[0]) || '2027-06-20',
      startTime: (typeof c.startDateTime === 'string' && c.startDateTime.split('T')[1]?.substring(0, 5)) || '16.00',
      endTime: (typeof c.endDateTime === 'string' && c.endDateTime.split('T')[1]?.substring(0, 5)) || undefined,
      venue: (typeof c.venue === 'string' && c.venue.trim()) || 'The Glasshouse',
      address: (typeof c.address === 'string' && c.address.trim()) || 'Ciumbuleuit, Bandung, Jawa Barat',
      mapsUrl: typeof c.mapsUrl === 'string' && c.mapsUrl.startsWith('http') ? c.mapsUrl : undefined,
    }));
  } else {
    events = [
      {
        id: 'ceremony',
        title: 'Pemberkatan',
        date: '2027-06-20',
        startTime: '16.00 WIB',
        endTime: '17.00 WIB',
        venue: 'The Glasshouse',
        address: 'Ciumbuleuit, Bandung, Jawa Barat',
        mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ciumbuleuit+Bandung',
      },
      {
        id: 'reception',
        title: 'Resepsi',
        date: '2027-06-20',
        startTime: '18.30 WIB',
        endTime: '21.00 WIB',
        venue: 'The Glasshouse Garden',
        address: 'Ciumbuleuit, Bandung, Jawa Barat',
        mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ciumbuleuit+Bandung',
      },
    ];
  }

  // Story
  const rawStory = Array.isArray(content.story) ? content.story : [];
  let story: { year: string; title: string; description: string }[] = [];
  if (rawStory.length > 0) {
    story = rawStory.map((s: any, idx: number) => ({
      year: (typeof s.year === 'string' && s.year.trim()) || (typeof s.period === 'string' && s.period.trim()) || `202${idx + 2}`,
      title: (typeof s.title === 'string' && s.title.trim()) || `Kisah ${idx + 1}`,
      description: (typeof s.description === 'string' && s.description.trim()) || (typeof s.body === 'string' && s.body.trim()) || '',
    }));
  } else {
    story = [
      {
        year: '2022',
        title: 'Dua orbit bertemu',
        description: 'Sebuah pertemuan sederhana membawa kami pada percakapan yang tidak ingin diakhiri. Tanpa disadari, dunia terasa sedikit lebih hangat.',
      },
      {
        year: '2025',
        title: 'Menemukan arah pulang',
        description: 'Kami belajar mencintai bukan hanya pada hari yang mudah, tetapi juga saat jalan berliku. Bersama, setiap langkah terasa berarti.',
      },
      {
        year: '2027',
        title: 'Memilih selamanya',
        description: 'Dari sekian banyak kemungkinan, kami memilih satu janji: berjalan bersama, merawat kasih, dan menulis cerita yang belum pernah ada.',
      },
    ];
  }

  // Media
  const mediaBySlot = payload.mediaBySlot || {};
  const heroDesc: PublicMediaDescriptor | undefined = mediaBySlot['hero']?.[0] || payload.media?.find((m) => m.slot === 'hero' || m.slot === 'cover');
  const closingDesc: PublicMediaDescriptor | undefined = mediaBySlot['closing']?.[0] || payload.media?.find((m) => m.slot === 'closing');
  const storyDesc: PublicMediaDescriptor | undefined = mediaBySlot['story']?.[0] || payload.media?.find((m) => m.slot === 'story');
  const galleryDescList: PublicMediaDescriptor[] = mediaBySlot['gallery'] || payload.media?.filter((m) => m.slot === 'gallery') || [];

  const heroUrl = resolveMediaUrl(heroDesc?.src, isPreview) || `${DEFAULT_ASSET_BASE}/images/couple-garden.webp`;
  const closingUrl = resolveMediaUrl(closingDesc?.src, isPreview) || `${DEFAULT_ASSET_BASE}/images/closing.webp`;
  const storyUrl = resolveMediaUrl(storyDesc?.src, isPreview) || `${DEFAULT_ASSET_BASE}/images/couple.webp`;

  const defaultGallery = [
    { src: `${DEFAULT_ASSET_BASE}/images/couple.webp`, alt: 'Ketika semesta mempertemukan' },
    { src: `${DEFAULT_ASSET_BASE}/images/couple-garden.webp`, alt: 'Tempat paling tenang' },
    { src: `${DEFAULT_ASSET_BASE}/images/bride-night.webp`, alt: 'Seindah cahaya pertama' },
    { src: `${DEFAULT_ASSET_BASE}/images/couple-evening.webp`, alt: 'Dalam pelukan yang sama' },
    { src: `${DEFAULT_ASSET_BASE}/images/closing.webp`, alt: 'Langkah menuju selamanya' },
    { src: `${DEFAULT_ASSET_BASE}/images/aetheria-world.png`, alt: 'Dunia kecil milik kita' },
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

  const eventDate = payload.event.eventDate || '2027-06-20T16:00:00+07:00';

  return {
    event: {
      title: payload.event.title || 'The wedding of',
      datetime: eventDate,
      dateLabel: '20 JUNI 2027',
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
        portrait: { src: `${DEFAULT_ASSET_BASE}/images/couple-evening.webp`, alt: `Potret ${partnerOneName}`, position: '28% 33%', zoom: 1.75 },
      },
      groom: {
        name: partnerTwoFullName,
        shortName: partnerTwoName,
        parents: partnerTwoFamily,
        portrait: { src: `${DEFAULT_ASSET_BASE}/images/couple-evening.webp`, alt: `Potret ${partnerTwoName}`, position: '27% 15%', zoom: 2.8 },
      },
    },
    media: {
      cover: { src: `${DEFAULT_ASSET_BASE}/images/aetheria-world.png`, alt: 'Kerajaan melayang di langit Aetheria' },
      hero: { src: heroUrl, alt: 'Foto Mempelai' },
      closing: { src: closingUrl, alt: 'Foto Penutup' },
      story: { src: storyUrl, alt: 'Foto Kisah' },
      background: { src: `${DEFAULT_ASSET_BASE}/images/aetheria-world.png`, alt: 'Latar Aetheria' },
    },
    story,
    events,
    gallery,
    rsvp: {
      title: 'Satu tempat untuk Anda',
      description: 'Kami menantikan kehadiran Anda untuk merayakan awal perjalanan ini.',
    },
    wishes: {
      title: 'Doa yang menjadi cahaya',
      description: 'Setiap doa baik Anda akan menemani perjalanan panjang kami.',
      items: [],
    },
    gifts: {
      title: 'Sebuah tanda kasih',
      description: 'Kehadiran dan doa Anda adalah hadiah terindah. Jika berkenan berbagi tanda kasih, kami menerimanya dengan penuh syukur.',
      accounts,
    },
    music: bgMusicUrl ? { src: bgMusicUrl, title: 'Aetheria Melody' } : undefined,
  };
}
