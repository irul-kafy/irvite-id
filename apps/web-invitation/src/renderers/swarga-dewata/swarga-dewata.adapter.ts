import type { PublicMediaDescriptor } from '../../types/public-invitation';
import type {
  SwargaDewataContent,
  SwargaDewataMedia,
  SwargaDewataStoryItem,
} from './types';

const DEFAULT_HERO_PHOTO = '/templates/swarga-dewata/bali-photo-1.webp';
const DEFAULT_BRIDE_PHOTO = '/templates/swarga-dewata/bali-photo-2.webp';
const DEFAULT_GROOM_PHOTO = '/templates/swarga-dewata/bali-photo-3.webp';
const DEFAULT_STORY_PHOTO = '/templates/swarga-dewata/bali-photo-4.webp';
const DEFAULT_GALLERY_PHOTOS = [
  '/templates/swarga-dewata/bali-photo-1.webp',
  '/templates/swarga-dewata/bali-photo-2.webp',
  '/templates/swarga-dewata/bali-photo-3.webp',
  '/templates/swarga-dewata/bali-photo-0.webp',
];

function asString(val: unknown, fallback = ''): string {
  return typeof val === 'string' && val.trim().length > 0
    ? val.trim()
    : fallback;
}

/**
 * Ensures cover/hero/closing display concise nickname (Nama Panggilan)
 * even if full name with academic titles was accidentally passed into partnerOneName/partnerTwoName.
 */
function toShortNickname(rawName: string, fallback: string): string {
  const cleaned = rawName.trim();
  if (!cleaned) return fallback;
  if (!cleaned.includes(',') && !cleaned.includes('.') && cleaned.length <= 20) {
    return cleaned;
  }
  const withoutSuffix = cleaned.split(',')[0].trim();
  const withoutPrefixes = withoutSuffix
    .replace(
      /^(dr\.|drg\.|Ir\.|Prof\.|H\.|Hj\.|Anak Agung Ayu|Anak Agung Gde|Anak Agung|Tjokorda Gde|Tjokorda|I Gusti Ngurah|I Gusti Ayu|Ida Bagus|Ida Ayu|Ni Luh|I Made|I Putu|I Nyoman|I Ketut)\s+/i,
      '',
    )
    .trim();
  const words = withoutPrefixes.split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallback;
  return words[0];
}

export function adaptSwargaDewataContent(
  rawContent?: unknown,
  eventTitle?: string,
  eventDate?: string | Date | null,
  locationDetails?: string | null,
): SwargaDewataContent {
  const c =
    rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)
      ? (rawContent as Record<string, unknown>)
      : {};

  let rawP1 = asString(c.partnerOneName, '');
  let rawP2 = asString(c.partnerTwoName, '');

  if ((!rawP1 || !rawP2) && eventTitle && typeof eventTitle === 'string') {
    const match = eventTitle.match(
      /(?:(?:pawiwahan(?:\s+agung)?|pernikahan|wedding(?:\s+of)?)\s+)?([a-zA-Z\s]+?)\s+(?:&|dan|and)\s+([a-zA-Z\s]+?)(?:\s*[—(-]|$)/i,
    );
    if (match) {
      if (!rawP1 && match[1]?.trim()) rawP1 = match[1].trim();
      if (!rawP2 && match[2]?.trim()) rawP2 = match[2].trim();
    }
  }

  if (!rawP1) rawP1 = 'Ayu';
  if (!rawP2) rawP2 = 'Bagus';

  const partnerOneName = toShortNickname(rawP1, 'Ayu');
  const partnerTwoName = toShortNickname(rawP2, 'Bagus');

  const partnerOneFullName = asString(
    c.partnerOneFullName,
    partnerOneName !== 'Ayu'
      ? rawP1
      : rawP1.length > partnerOneName.length
        ? rawP1
        : 'dr. Anak Agung Ayu Saraswati, S.Ked.',
  );
  const partnerTwoFullName = asString(
    c.partnerTwoFullName,
    partnerTwoName !== 'Bagus'
      ? rawP2
      : rawP2.length > partnerTwoName.length
        ? rawP2
        : 'Tjokorda Gde Bagus Mahendra, M.Ars.',
  );

  const partnerOneFamily = asString(
    c.partnerOneFamily,
    asString(
      c.partnerOneParents,
      'Putri Pertama dari Pasangan Anak Agung Gde Rai Dharmaputra & Jero Puspa Kemala Dewi — Puri Agung Ubud, Gianyar',
    ),
  );
  const partnerTwoFamily = asString(
    c.partnerTwoFamily,
    asString(
      c.partnerTwoParents,
      'Putra Kedua dari Pasangan Tjokorda Raka Sudarsana & Anak Agung Istri Ratna Ningrum — Puri Agung Semarapura, Klungkung',
    ),
  );

  const tzRaw = asString(c.timeZone, 'Asia/Makassar');
  const timeZone =
    tzRaw === 'Asia/Jakarta' ||
    tzRaw === 'Asia/Makassar' ||
    tzRaw === 'Asia/Jayapura'
      ? tzRaw
      : 'Asia/Makassar';

  const openingGreeting = asString(
    c.openingGreeting,
    'Om Swastyastu • Atas Asung Kertha Wara Nugraha',
  );

  const openingText = asString(
    c.openingText,
    asString(
      c.intro,
      'Atas Asung Kertha Wara Nugraha Ida Sang Hyang Widhi Wasa / Tuhan Yang Maha Esa, perkenankan kami mengundang Bapak/Ibu/Saudara/i pada upacara suci Manusa Yadnya Pawiwahan putra-putri kami.',
    ),
  );

  const quote = asString(
    c.quote,
    asString(
      c.statement,
      'Ihaiva stam ma vi yaustam, visvam ayur vyasnutam, kridantau putrair naptrbhih, modamanau sve grhe.',
    ),
  );

  const prayer = asString(
    c.prayer,
    asString(
      c.prayerText,
      'Wahai pasangan suami-istri, semoga kalian tetap bersatu dan tidak pernah terpisahkan. Semoga kalian mencapai hidup penuh kebahagiaan, bermain bersama anak-cucu, dan tinggal di rumah yang penuh kegembiraan.',
    ),
  );

  const prayerSource = asString(
    c.prayerSource,
    'Rgveda X.85.42 • Sloka Pawiwahan',
  );

  const closingMessage = asString(
    c.closingMessage,
    asString(
      c.closing,
      asString(
        c.closingText,
        'Merupakan suatu kehormatan dan kebahagiaan bagi keluarga besar kami apabila Bapak/Ibu/Saudara/i berkenan hadir untuk memberikan doa restu kepada kedua mempelai. Atas kehadiran dan doa restunya, kami haturkan terima kasih.',
      ),
    ),
  );

  const rawEventDateIso =
    eventDate instanceof Date
      ? eventDate.toISOString()
      : typeof eventDate === 'string' && eventDate.trim() && !isNaN(Date.parse(eventDate))
        ? eventDate.trim()
        : '';
  const fallbackLocation = asString(locationDetails, '');

  const rawCeremonies = Array.isArray(c.ceremonies) ? c.ceremonies : [];
  const ceremonies =
    rawCeremonies.length > 0
      ? rawCeremonies
          .filter(
            (item): item is Record<string, unknown> =>
              Boolean(item) && typeof item === 'object',
          )
          .map((item) => ({
            title: asString(item.title, 'Upacara Mabyakala & Mejaya-Jaya'),
            startDateTime: asString(
              item.startDateTime,
              asString(
                item.dateTime,
                rawEventDateIso || '2026-10-18T08:00:00+08:00',
              ),
            ),
            endDateTime: asString(item.endDateTime, ''),
            venue: asString(
              item.venue,
              fallbackLocation || 'Bale Gede Pemerajan Agung Puri Ubud',
            ),
            address: asString(
              item.address,
              fallbackLocation ||
                'Jl. Raya Ubud No. 88, Kecamatan Ubud, Kabupaten Gianyar, Bali',
            ),
            mapsUrl: asString(
              item.mapsUrl,
              'https://maps.google.com/?q=Puri+Saren+Agung+Ubud+Bali',
            ),
          }))
      : [
          {
            title: 'Upacara Mabyakala & Mejaya-Jaya',
            startDateTime: rawEventDateIso || '2026-10-18T08:00:00+08:00',
            endDateTime: '2026-10-18T11:30:00+08:00',
            venue: fallbackLocation || 'Bale Gede Pemerajan Agung Puri Ubud',
            address:
              fallbackLocation ||
              'Jl. Raya Ubud No. 88, Kecamatan Ubud, Kabupaten Gianyar, Bali',
            mapsUrl: 'https://maps.google.com/?q=Puri+Saren+Agung+Ubud+Bali',
          },
          {
            title: 'Resepsi Dharma Suaka Agung',
            startDateTime: rawEventDateIso || '2026-10-18T17:00:00+08:00',
            endDateTime: '2026-10-18T21:30:00+08:00',
            venue:
              fallbackLocation ||
              'Wantilan Kencana & Taman Sanga Mandala Puri Ubud',
            address:
              fallbackLocation ||
              'Jl. Raya Ubud No. 88, Kecamatan Ubud, Kabupaten Gianyar, Bali',
            mapsUrl: 'https://maps.google.com/?q=Puri+Saren+Agung+Ubud+Bali',
          },
        ];

  const giftTitle = asString(c.giftTitle, 'Prada Dana Kasih');
  const giftMessage = asString(
    c.giftMessage,
    'Kehadiran serta doa restu Bapak/Ibu/Saudara/i merupakan anugerah terindah bagi kami. Namun apabila bermaksud mengirimkan tanda kasih, dapat melalui rekening berikut:',
  );

  const rawGifts = Array.isArray(c.giftAccounts) ? c.giftAccounts : [];
  const giftAccounts =
    rawGifts.length > 0
      ? rawGifts
          .filter(
            (item): item is Record<string, unknown> =>
              Boolean(item) && typeof item === 'object',
          )
          .map((item) => ({
            bankName: asString(item.bankName, 'BCA'),
            accountNumber: asString(item.accountNumber, '7720918834'),
            accountHolder: asString(
              item.accountHolder,
              asString(
                item.accountHolderName,
                'Tjokorda Gde Bagus Mahendra',
              ),
            ),
          }))
      : [
          {
            bankName: 'BCA',
            accountNumber: '7720918834',
            accountHolder: 'Tjokorda Gde Bagus Mahendra',
          },
          {
            bankName: 'Bank Mandiri',
            accountNumber: '1450028910442',
            accountHolder: 'dr. Anak Agung Ayu Saraswati',
          },
        ];

  const rawStories = Array.isArray(c.story)
    ? c.story
    : Array.isArray(c.stories)
      ? c.stories
      : [];
  const stories: SwargaDewataStoryItem[] =
    rawStories.length > 0
      ? rawStories
          .filter(
            (item): item is Record<string, unknown> =>
              Boolean(item) && typeof item === 'object',
          )
          .map((item) => ({
            year: asString(item.year, asString(item.date, '')),
            title: asString(item.title, 'Langkah Pertama Kasih'),
            description: asString(
              item.description,
              asString(item.content, ''),
            ),
            date: asString(item.date, ''),
          }))
      : [
          {
            year: '2022',
            title: 'Pertemuan Pertama di Pelataran Puri',
            description:
              'Di bawah teduhnya beringin pelataran Puri Ubud, pandangan kami pertama kali bertemu dalam kehangatan upacara piodalan.',
          },
          {
            year: '2024',
            title: 'Menjalin Janji Suci Menuju Grihasta',
            description:
              'Menapaki bukit Campuhan bersama, mengikrarkan niat tulus menyatukan dua rasa dalam bimbingan dharma Hyang Widhi Wasa.',
          },
          {
            year: '2026',
            title: 'Pawiwahan Agung Swarga Dewata',
            description:
              'Mengikat janji suci lahir batin di hadapan keluarga besar dan para leluhur, melangkah menuju gerbang kehidupan baru.',
          },
        ];

  return {
    partnerOneName,
    partnerTwoName,
    partnerOneFullName,
    partnerTwoFullName,
    partnerOneFamily,
    partnerTwoFamily,
    timeZone,
    openingGreeting,
    openingText,
    quote,
    prayer,
    prayerSource,
    closingMessage,
    stories,
    ceremonies,
    giftTitle,
    giftMessage,
    giftAccounts,
  };
}

function normalizeMediaUrl(src: string | undefined, isPreview = false): string {
  if (!src) return '';
  const trimmed = src.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (trimmed.startsWith('/templates/')) {
    return trimmed;
  }
  if (trimmed.startsWith('/api-proxy')) {
    return trimmed;
  }
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return isPreview ? trimmed : `/api-proxy${trimmed}`;
  }
  return trimmed;
}

export function adaptSwargaDewataMedia(
  mediaBySlot?: Record<string, PublicMediaDescriptor[]> | null,
  mediaList?: PublicMediaDescriptor[] | null,
  isPreview = false,
): SwargaDewataMedia {
  const resolveSlot = (slot: string): PublicMediaDescriptor[] => {
    if (mediaBySlot && Array.isArray(mediaBySlot[slot])) {
      return mediaBySlot[slot];
    }
    if (Array.isArray(mediaList)) {
      return mediaList.filter((m) => m.slot === slot);
    }
    return [];
  };

  const heroDesc = resolveSlot('hero').find((m) => m.type === 'PHOTO');
  const brideDesc =
    resolveSlot('bride').find((m) => m.type === 'PHOTO') ||
    resolveSlot('couple_1').find((m) => m.type === 'PHOTO');
  const groomDesc =
    resolveSlot('groom').find((m) => m.type === 'PHOTO') ||
    resolveSlot('couple_2').find((m) => m.type === 'PHOTO');
  const storyDesc = resolveSlot('story').find((m) => m.type === 'PHOTO');
  const galleryDescs = resolveSlot('gallery')
    .filter((m) => m.type === 'PHOTO')
    .slice(0, 8);
  const bgMusicDesc = resolveSlot('bg-music').find((m) => m.type === 'AUDIO');

  const heroPhotoUrl =
    normalizeMediaUrl(heroDesc?.src, isPreview) || DEFAULT_HERO_PHOTO;
  const bridePhotoUrl =
    normalizeMediaUrl(brideDesc?.src, isPreview) || DEFAULT_BRIDE_PHOTO;
  const groomPhotoUrl =
    normalizeMediaUrl(groomDesc?.src, isPreview) || DEFAULT_GROOM_PHOTO;
  const storyPhotoUrl =
    normalizeMediaUrl(storyDesc?.src, isPreview) || DEFAULT_STORY_PHOTO;

  const galleryPhotos =
    galleryDescs.length > 0
      ? galleryDescs
          .map((d) => normalizeMediaUrl(d.src, isPreview))
          .filter(Boolean)
      : DEFAULT_GALLERY_PHOTOS;

  const bgMusicUrl = normalizeMediaUrl(bgMusicDesc?.src, isPreview) || null;

  return {
    heroPhotoUrl,
    bridePhotoUrl,
    groomPhotoUrl,
    storyPhotoUrl,
    galleryPhotos:
      galleryPhotos.length > 0 ? galleryPhotos : DEFAULT_GALLERY_PHOTOS,
    bgMusicUrl,
  };
}
