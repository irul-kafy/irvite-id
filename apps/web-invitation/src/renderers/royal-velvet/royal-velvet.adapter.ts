import type { PublicMediaDescriptor } from '../../types/public-invitation';
import type {
  RoyalVelvetContent,
  RoyalVelvetMedia,
  RoyalVelvetStoryItem,
} from './types';

const DEFAULT_HERO_PHOTO = '/templates/royal-velvet/photo-hero.webp';
const DEFAULT_BRIDE_PHOTO = '/templates/royal-velvet/photo-bride.webp';
const DEFAULT_GROOM_PHOTO = '/templates/royal-velvet/photo-groom.webp';
const DEFAULT_STORY_PHOTO = '/templates/royal-velvet/photo-story.webp';
const DEFAULT_GALLERY_PHOTOS = [
  '/templates/royal-velvet/gallery-1.webp',
  '/templates/royal-velvet/gallery-2.webp',
  '/templates/royal-velvet/gallery-3.webp',
  '/templates/royal-velvet/gallery-4.webp',
  '/templates/royal-velvet/gallery-5.webp',
  '/templates/royal-velvet/gallery-6.webp',
];
const DEFAULT_BG_MUSIC = '/templates/royal-velvet/bg-music.mp3';

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
      /^(dr\.|drg\.|Ir\.|Prof\.|H\.|Hj\.|Kang|Neng|Raden|Rr\.|Rm\.|Bagus|Ayu)\s+/i,
      '',
    )
    .trim();
  const words = withoutPrefixes.split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallback;
  return words[0];
}

export function adaptRoyalVelvetContent(
  rawContent?: unknown,
  eventTitle?: string,
): RoyalVelvetContent {
  const c =
    rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)
      ? (rawContent as Record<string, unknown>)
      : {};

  let rawP1 = asString(c.partnerOneName, '');
  let rawP2 = asString(c.partnerTwoName, '');

  if ((!rawP1 || !rawP2) && eventTitle && typeof eventTitle === 'string') {
    const match = eventTitle.match(
      /(?:(?:pernikahan|wedding(?:\s+of)?|the royal wedding of)\s+)?([a-zA-Z\s]+?)\s+(?:&|dan|and)\s+([a-zA-Z\s]+?)(?:\s*[—(-]|$)/i,
    );
    if (match) {
      if (!rawP1 && match[1]?.trim()) rawP1 = match[1].trim();
      if (!rawP2 && match[2]?.trim()) rawP2 = match[2].trim();
    }
  }

  if (!rawP1) rawP1 = 'Citra';
  if (!rawP2) rawP2 = 'Galih';

  const partnerOneName = toShortNickname(rawP1, 'Citra');
  const partnerTwoName = toShortNickname(rawP2, 'Galih');

  const partnerOneFullName = asString(
    c.partnerOneFullName,
    rawP1.length > partnerOneName.length
      ? rawP1
      : 'Neng Citra Kirana, S.Ars.',
  );
  const partnerTwoFullName = asString(
    c.partnerTwoFullName,
    rawP2.length > partnerTwoName.length
      ? rawP2
      : 'Kang Galih Prakoso, M.B.A.',
  );

  const partnerOneFamily = asString(
    c.partnerOneFamily,
    asString(
      c.partnerOneParents,
      'Putri Pertama dari Bpk. Ir. H. Hendra Wijaya & Ibu Hj. Ratna Ningrum',
    ),
  );
  const partnerTwoFamily = asString(
    c.partnerTwoFamily,
    asString(
      c.partnerTwoParents,
      'Putra Kedua dari Bpk. Drs. H. Suryo Prakoso & Ibu Hj. Dewi Sartika',
    ),
  );

  const rawTz = asString(c.timeZone, 'Asia/Jakarta');
  const timeZone =
    rawTz === 'Asia/Makassar' || rawTz === 'Asia/Jayapura'
      ? rawTz
      : 'Asia/Jakarta';

  const openingGreeting = asString(
    c.openingGreeting,
    'Royal Celebration of Eternal Love',
  );

  const openingText = asString(
    c.openingText,
    asString(
      c.intro,
      'Assalamu’alaikum Warahmatullahi Wabarakatuh • Salam Sejahtera Bagi Kita Semua',
    ),
  );

  const quote = asString(
    c.quote,
    asString(
      c.statement,
      '“Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.” (QS. Ar-Rum: 21)',
    ),
  );

  const prayer = asString(
    c.prayer,
    asString(
      c.prayerText,
      'Dengan memohon rahmat dan ridho Tuhan Yang Maha Esa, kami mengundang Bapak/Ibu/Saudara/i untuk menyaksikan dan merestui ikatan suci pernikahan putra-putri kami:',
    ),
  );

  const prayerSource = asString(c.prayerSource, 'Surah Ar-Rum: 21');

  const closingMessage = asString(
    c.closingMessage,
    asString(
      c.closing,
      asString(
        c.closingText,
        'Merupakan suatu kehormatan dan kebahagiaan yang mendalam bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu kepada kedua mempelai. Atas kehadiran serta doa restu yang tulus, kami haturkan terima kasih.',
      ),
    ),
  );

  const rawCeremonies = Array.isArray(c.ceremonies) ? c.ceremonies : [];
  const ceremonies =
    rawCeremonies.length > 0
      ? rawCeremonies
          .filter(
            (item): item is Record<string, unknown> =>
              Boolean(item) && typeof item === 'object',
          )
          .map((item, idx) => ({
            title: asString(
              item.title,
              idx === 0
                ? 'Akad Nikah / Upacara Utama'
                : 'Royal Evening Reception',
            ),
            startDateTime: asString(
              item.startDateTime,
              idx === 0
                ? '2027-02-14T08:00:00+07:00'
                : '2027-02-14T18:30:00+07:00',
            ),
            endDateTime: asString(item.endDateTime, '') || undefined,
            venue: asString(
              item.venue,
              idx === 0
                ? 'Grand Heritage Glasshouse — Senayan'
                : 'The Imperial Ballroom — Dharmawangsa',
            ),
            address: asString(
              item.address,
              idx === 0
                ? 'Jl. Jenderal Sudirman Kav. 52-53, Senayan, Kebayoran Baru, Jakarta Selatan'
                : 'Jl. Brawijaya Raya No. 26, Kebayoran Baru, Jakarta Selatan',
            ),
            mapsUrl: asString(
              item.mapsUrl,
              idx === 0
                ? 'https://maps.google.com/?q=Jl.+Jenderal+Sudirman+Kav+52-53+Jakarta+Selatan'
                : 'https://maps.google.com/?q=Jl.+Brawijaya+Raya+No.+26+Kebayoran+Baru+Jakarta+Selatan',
            ),
          }))
      : [
          {
            title: 'Akad Nikah / Upacara Utama',
            startDateTime: '2027-02-14T08:00:00+07:00',
            endDateTime: '2027-02-14T10:00:00+07:00',
            venue: 'Grand Heritage Glasshouse — Senayan',
            address:
              'Jl. Jenderal Sudirman Kav. 52-53, Senayan, Kebayoran Baru, Jakarta Selatan',
            mapsUrl:
              'https://maps.google.com/?q=Jl.+Jenderal+Sudirman+Kav+52-53+Jakarta+Selatan',
          },
          {
            title: 'Royal Evening Reception',
            startDateTime: '2027-02-14T18:30:00+07:00',
            endDateTime: '2027-02-14T21:30:00+07:00',
            venue: 'The Imperial Ballroom — Dharmawangsa',
            address:
              'Jl. Brawijaya Raya No. 26, Kebayoran Baru, Jakarta Selatan',
            mapsUrl:
              'https://maps.google.com/?q=Jl.+Brawijaya+Raya+No.+26+Kebayoran+Baru+Jakarta+Selatan',
          },
        ];

  const giftTitle = asString(c.giftTitle, 'Tanda Kasih Digital');
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
            accountNumber: asString(item.accountNumber, '8720194821'),
            accountHolder: asString(
              item.accountHolder,
              asString(item.accountHolderName, 'Neng Citra Kirana'),
            ),
          }))
      : [
          {
            bankName: 'BCA',
            accountNumber: '8720194821',
            accountHolder: 'Neng Citra Kirana',
          },
          {
            bankName: 'Bank Mandiri',
            accountNumber: '1240098765432',
            accountHolder: 'Kang Galih Prakoso',
          },
        ];

  const rawStories = Array.isArray(c.story)
    ? c.story
    : Array.isArray(c.stories)
      ? c.stories
      : [];
  const stories: RoyalVelvetStoryItem[] =
    rawStories.length > 0
      ? rawStories
          .filter(
            (item): item is Record<string, unknown> =>
              Boolean(item) && typeof item === 'object',
          )
          .map((item) => ({
            year: asString(item.year, asString(item.date, '2022')),
            title: asString(item.title, 'Simfoni Pertemuan Pertama'),
            description: asString(
              item.description,
              asString(item.content, ''),
            ),
            date: asString(item.date, ''),
          }))
      : [
          {
            year: '2022',
            title: 'Simfoni Pertemuan Pertama',
            description:
              'Takdir mempertemukan langkah kami di sebuah malam pameran seni klasik Jakarta. Percakapan hangat tentang karya dan mimpi menjadi awal dari segalanya.',
          },
          {
            year: '2024',
            title: 'Merajut Janji Setia',
            description:
              'Dua musim berlalu dengan saling menguatkan dan memahami. Kami belajar bahwa cinta sejati tumbuh dari ketulusan dan rasa saling menghargai.',
          },
          {
            year: '2026',
            title: 'Pertemuan Dua Keluarga',
            description:
              'Dalam suasana khidmat penuh kehangatan, kedua keluarga besar bersatu memberikan restu bagi langkah kami menuju ikatan suci.',
          },
          {
            year: '2027',
            title: 'Bahtera Suci Abadi',
            description:
              'Hari yang dinanti akhirnya tiba. Di bawah naungan doa restu keluarga dan sahabat, kami mengikrarkan janji sehidup semati.',
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

export function adaptRoyalVelvetMedia(
  mediaBySlot?: Record<string, PublicMediaDescriptor[]> | null,
  mediaList?: PublicMediaDescriptor[] | null,
  isPreview = false,
): RoyalVelvetMedia {
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
    .slice(0, 6);
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

  const bgMusicUrl =
    normalizeMediaUrl(bgMusicDesc?.src, isPreview) || DEFAULT_BG_MUSIC;

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

