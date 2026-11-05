import type { RendererData } from '../renderers/registry';
import type { PublicMediaDescriptor } from '../types/public-invitation';
import { getPublicWhatsAppNumber } from '../utils/contact';

export interface CeremonyFormState {
  title: string;
  startDateTime: string;
  endDateTime: string;
  venue: string;
  address: string;
  mapsUrl: string;
}

export interface GiftAccountFormState {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export type CustomPhotoSlotKey =
  | 'hero'
  | 'bride'
  | 'groom'
  | 'story'
  | 'gallery'
  | 'closing';

export interface CustomPhotoItem {
  slot: CustomPhotoSlotKey;
  previewUrl: string; // blob:... or /templates/...
  dataUrl?: string; // compressed data:image/jpeg;base64,... for admin submission
  fileName?: string;
  order: number;
}

export interface TemplatePhotoSlotConfig {
  slot: CustomPhotoSlotKey;
  title: string;
  hint: string;
  description: string;
  uploadButtonLabel: string;
  resetButtonLabel: string;
  multiple: boolean;
  maxItems: number;
}

const DEFAULT_SLOT_CATALOG: Record<
  CustomPhotoSlotKey,
  TemplatePhotoSlotConfig
> = {
  hero: {
    slot: 'hero',
    title: 'Foto Utama Mempelai (Hero / Sampul)',
    hint: 'Maks. 25 MB (JPG, PNG, WebP)',
    description: 'Tampil langsung di bingkai utama undangan',
    uploadButtonLabel: '📤 Pilih Foto Utama dari Perangkat',
    resetButtonLabel: 'Gunakan Foto Contoh',
    multiple: false,
    maxItems: 1,
  },
  bride: {
    slot: 'bride',
    title: 'Foto Mempelai Wanita',
    hint: 'Opsional • Bingkai 01',
    description: 'Tampil khusus di bingkai 01 Mempelai Wanita',
    uploadButtonLabel: '📤 Pilih Foto Mempelai Wanita',
    resetButtonLabel: 'Gunakan Foto Default',
    multiple: false,
    maxItems: 1,
  },
  groom: {
    slot: 'groom',
    title: 'Foto Mempelai Pria',
    hint: 'Opsional • Bingkai 02',
    description: 'Tampil khusus di bingkai 02 Mempelai Pria',
    uploadButtonLabel: '📤 Pilih Foto Mempelai Pria',
    resetButtonLabel: 'Gunakan Foto Default',
    multiple: false,
    maxItems: 1,
  },
  story: {
    slot: 'story',
    title: 'Foto Cerita / Kisah (Story Window)',
    hint: 'Opsional • Seksi Kisah Cinta',
    description: 'Tampil di seksi perjalanan kisah cinta mempelai',
    uploadButtonLabel: '📤 Pilih Foto Kisah Cinta',
    resetButtonLabel: 'Gunakan Foto Contoh',
    multiple: false,
    maxItems: 1,
  },
  gallery: {
    slot: 'gallery',
    title: 'Galeri Momen Bahagia',
    hint: 'Maks. 25 MB/foto',
    description: 'Tampil di galeri foto kenangan mempelai',
    uploadButtonLabel: '📤 Tambah Foto Galeri',
    resetButtonLabel: 'Reset Galeri',
    multiple: true,
    maxItems: 6,
  },
  closing: {
    slot: 'closing',
    title: 'Foto Penutup (Closing Portrait)',
    hint: 'Opsional • Maks. 25 MB',
    description: 'Tampil di bagian penutup undangan',
    uploadButtonLabel: '📤 Pilih Foto Penutup',
    resetButtonLabel: 'Reset',
    multiple: false,
    maxItems: 1,
  },
};

const TEMPLATE_PHOTO_SLOT_SCHEMAS: Record<
  string,
  readonly TemplatePhotoSlotConfig[]
> = {
  RANAH_CINTA: [
    {
      ...DEFAULT_SLOT_CATALOG.hero,
      title: 'Foto Utama Pasangan (Hero)',
    },
    {
      ...DEFAULT_SLOT_CATALOG.bride,
      title: 'Foto Mempelai Wanita (Anak Daro)',
    },
    {
      ...DEFAULT_SLOT_CATALOG.groom,
      title: 'Foto Mempelai Pria (Marapulai)',
    },
  ],
  SEKAR_KEDATON: [
    {
      ...DEFAULT_SLOT_CATALOG.hero,
      title: 'Foto Utama Pasangan (Hero)',
    },
    DEFAULT_SLOT_CATALOG.bride,
    DEFAULT_SLOT_CATALOG.groom,
    {
      ...DEFAULT_SLOT_CATALOG.gallery,
      title: 'Galeri Ronce Kenangan',
      maxItems: 6,
    },
  ],
  AETHERIA: [
    {
      ...DEFAULT_SLOT_CATALOG.hero,
      title: 'Foto Utama Mempelai (Hero / Intro)',
    },
    DEFAULT_SLOT_CATALOG.bride,
    DEFAULT_SLOT_CATALOG.groom,
    {
      ...DEFAULT_SLOT_CATALOG.story,
      hint: 'Opsional • Jendela "Every path led to you"',
    },
    {
      ...DEFAULT_SLOT_CATALOG.gallery,
      title: 'Galeri Fragmen Kenangan',
      maxItems: 6,
    },
    DEFAULT_SLOT_CATALOG.closing,
  ],
  OPALINE_NOCTURNE: [
    {
      ...DEFAULT_SLOT_CATALOG.hero,
      title: 'Foto Cover & Hero Pasangan',
    },
    DEFAULT_SLOT_CATALOG.bride,
    DEFAULT_SLOT_CATALOG.groom,
    DEFAULT_SLOT_CATALOG.story,
    {
      ...DEFAULT_SLOT_CATALOG.gallery,
      title: 'Galeri Momen Bahagia',
      maxItems: 4,
    },
    DEFAULT_SLOT_CATALOG.closing,
  ],
  CLASSIC_LETTER: [
    DEFAULT_SLOT_CATALOG.hero,
    {
      ...DEFAULT_SLOT_CATALOG.gallery,
      maxItems: 6,
    },
  ],
  VELVET_LETTER: [
    DEFAULT_SLOT_CATALOG.hero,
    {
      ...DEFAULT_SLOT_CATALOG.gallery,
      maxItems: 6,
    },
  ],
  GENERIC: [
    DEFAULT_SLOT_CATALOG.hero,
    {
      ...DEFAULT_SLOT_CATALOG.gallery,
      maxItems: 6,
    },
  ],
};

/**
 * Normalizes any template themeCode or slug variant (e.g. 'ranah-asmara', 'ranah-cinta', 'sekar-kedaton')
 * to the canonical dictionary key (e.g. 'RANAH_CINTA', 'SEKAR_KEDATON').
 */
export function normalizeThemeKey(code?: string): string {
  const upper = (code || '').trim().toUpperCase().replace(/-/g, '_');
  if (upper === 'RANAH_ASMARA' || upper === 'RANAH_CINTA') return 'RANAH_CINTA';
  if (upper === 'ENCHANTED_WOODLAND' || upper === 'AETHERIA') return 'AETHERIA';
  if (upper === 'OPALINE_NOCTURNE') return 'OPALINE_NOCTURNE';
  if (upper === 'SEKAR_KEDATON') return 'SEKAR_KEDATON';
  return upper;
}

/**
 * Returns the exact photo slots supported by a given template themeCode.
 * For any future template not yet in TEMPLATE_PHOTO_SLOT_SCHEMAS, it dynamically
 * inspects the template's fixture media slots so the Studio always matches the template content.
 */
export function getTemplatePhotoSlotsConfig(
  themeCode: string,
  fixture?: RendererData,
): readonly TemplatePhotoSlotConfig[] {
  const normalized = normalizeThemeKey(themeCode);
  if (TEMPLATE_PHOTO_SLOT_SCHEMAS[normalized]) {
    return TEMPLATE_PHOTO_SLOT_SCHEMAS[normalized];
  }

  // Dynamic derivation for future templates based on fixture media slots
  if (fixture) {
    const detectedSlots = new Set<string>();
    if (fixture.mediaBySlot) {
      for (const k of Object.keys(fixture.mediaBySlot)) {
        detectedSlots.add(k.toLowerCase());
      }
    }
    if (Array.isArray(fixture.media)) {
      for (const item of fixture.media) {
        if (item.type === 'PHOTO' && item.slot) {
          detectedSlots.add(item.slot.toLowerCase());
        }
      }
    }

    const orderedKeys: CustomPhotoSlotKey[] = [
      'hero',
      'bride',
      'groom',
      'story',
      'gallery',
      'closing',
    ];
    const dynamicConfigs: TemplatePhotoSlotConfig[] = [];
    for (const key of orderedKeys) {
      if (
        detectedSlots.has(key) ||
        (key === 'bride' && detectedSlots.has('couple_1')) ||
        (key === 'groom' && detectedSlots.has('couple_2'))
      ) {
        if (key === 'gallery') {
          const fixtureGalleryCount =
            fixture.mediaBySlot?.gallery?.length ||
            (fixture.media || []).filter((m) => m.slot === 'gallery').length ||
            6;
          dynamicConfigs.push({
            ...DEFAULT_SLOT_CATALOG.gallery,
            maxItems: Math.max(1, fixtureGalleryCount),
          });
        } else {
          dynamicConfigs.push(DEFAULT_SLOT_CATALOG[key]);
        }
      }
    }
    if (dynamicConfigs.length > 0) {
      return dynamicConfigs;
    }
  }

  return TEMPLATE_PHOTO_SLOT_SCHEMAS.AETHERIA;
}

export function countSupportedUploadedPhotos(
  themeCode: string,
  state: ClientCustomizationState,
  fixture?: RendererData,
): number {
  const slots = getTemplatePhotoSlotsConfig(themeCode, fixture);
  let total = 0;
  for (const s of slots) {
    if (s.slot === 'hero' && state.heroPhoto) total += 1;
    else if (s.slot === 'bride' && state.bridePhoto) total += 1;
    else if (s.slot === 'groom' && state.groomPhoto) total += 1;
    else if (s.slot === 'story' && state.storyPhoto) total += 1;
    else if (s.slot === 'closing' && state.closingPhoto) total += 1;
    else if (s.slot === 'gallery') {
      total += Math.min(state.galleryPhotos.length, s.maxItems);
    }
  }
  return total;
}

export interface ClientCustomizationState {
  partnerOneName: string;
  partnerTwoName: string;
  partnerOneFullName: string;
  partnerTwoFullName: string;
  partnerOneFamily: string;
  partnerTwoFamily: string;
  timeZone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura';
  openingText: string;
  quoteText: string;
  prayerText: string;
  prayerSource: string;
  closingText: string;
  ceremonies: CeremonyFormState[];
  giftAccounts: GiftAccountFormState[];
  heroPhoto: CustomPhotoItem | null;
  bridePhoto?: CustomPhotoItem | null;
  groomPhoto?: CustomPhotoItem | null;
  storyPhoto?: CustomPhotoItem | null;
  closingPhoto: CustomPhotoItem | null;
  galleryPhotos: CustomPhotoItem[];
}

export interface PatentedDesignRule {
  id: string;
  title: string;
  description: string;
  status: 'LOCKED_PATENT';
}

/**
 * Design elements that are strictly locked (patented) by IRVITE to preserve
 * visual harmony, luxury typography, and artistic proportions.
 */
export const PATENTED_DESIGN_RULES: readonly PatentedDesignRule[] = [
  {
    id: 'typography-hierarchy',
    title: 'Tipografi & Hierarki Aksara',
    description:
      'Kombinasi font serif editorial, ukuran teks, dan spasi huruf merupakan ketentuan baku agar tetap proporsional di semua layar.',
    status: 'LOCKED_PATENT',
  },
  {
    id: 'layout-ornaments',
    title: 'Struktur Tata Letak & Ornamen Budaya/Artistik',
    description:
      'Susunan seksi, ilustrasi gunungan/portal/rumah gadang, serta bingkai foto dirancang baku oleh desainer IRVITE.',
    status: 'LOCKED_PATENT',
  },
  {
    id: 'color-atmosphere',
    title: 'Palet Warna & Pencahayaan Tema',
    description:
      'Skema warna utama, gradasi latar, dan kontras visual dikunci untuk menjaga kemewahan estetika asli template.',
    status: 'LOCKED_PATENT',
  },
  {
    id: 'interactive-motion',
    title: 'Animasi Pembuka & Transisi Sinematik',
    description:
      'Gerakan bukaan sampul, partikel cahaya, dan efek scroll direkayasa khusus dan tidak dapat diubah.',
    status: 'LOCKED_PATENT',
  },
] as const;

export function extractInitialCustomizationState(
  fixture: RendererData,
): ClientCustomizationState {
  const raw = (fixture.event.content || {}) as Record<string, unknown>;

  const partnerOneName =
    typeof raw.partnerOneName === 'string' ? raw.partnerOneName : 'Nara';
  const partnerTwoName =
    typeof raw.partnerTwoName === 'string' ? raw.partnerTwoName : 'Arka';
  const partnerOneFullName =
    typeof raw.partnerOneFullName === 'string'
      ? raw.partnerOneFullName
      : partnerOneName;
  const partnerTwoFullName =
    typeof raw.partnerTwoFullName === 'string'
      ? raw.partnerTwoFullName
      : partnerTwoName;
  const partnerOneFamily =
    typeof raw.partnerOneFamily === 'string' ? raw.partnerOneFamily : '';
  const partnerTwoFamily =
    typeof raw.partnerTwoFamily === 'string' ? raw.partnerTwoFamily : '';

  const validTz = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] as const;
  const timeZone =
    typeof raw.timeZone === 'string' &&
    (validTz as readonly string[]).includes(raw.timeZone)
      ? (raw.timeZone as 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura')
      : 'Asia/Jakarta';

  const openingText =
    typeof raw.openingText === 'string'
      ? raw.openingText
      : typeof raw.intro === 'string'
        ? raw.intro
        : '';

  const quoteText =
    typeof raw.statement === 'string'
      ? raw.statement
      : typeof raw.quote === 'string'
        ? raw.quote
        : '';

  const prayerText = typeof raw.prayer === 'string' ? raw.prayer : '';
  const prayerSource =
    typeof raw.prayerSource === 'string' ? raw.prayerSource : '';

  const closingText =
    typeof raw.closingMessage === 'string'
      ? raw.closingMessage
      : typeof raw.closing === 'string'
        ? raw.closing
        : '';

  const rawCeremonies = Array.isArray(raw.ceremonies) ? raw.ceremonies : [];
  const ceremonies: CeremonyFormState[] = rawCeremonies
    .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
    .slice(0, 2)
    .map((c, idx) => ({
      title:
        typeof c.title === 'string'
          ? c.title
          : idx === 0
            ? 'Akad Nikah'
            : 'Resepsi',
      startDateTime:
        typeof c.startDateTime === 'string'
          ? c.startDateTime.slice(0, 16)
          : '2026-10-18T08:00',
      endDateTime:
        typeof c.endDateTime === 'string' ? c.endDateTime.slice(0, 16) : '',
      venue: typeof c.venue === 'string' ? c.venue : '',
      address: typeof c.address === 'string' ? c.address : '',
      mapsUrl: typeof c.mapsUrl === 'string' ? c.mapsUrl : '',
    }));

  if (ceremonies.length === 0) {
    ceremonies.push({
      title: 'Akad Nikah',
      startDateTime: '2026-10-18T08:00',
      endDateTime: '2026-10-18T10:00',
      venue: 'Lokasi Acara',
      address: 'Jakarta, Indonesia',
      mapsUrl: '',
    });
  }

  const rawGifts = Array.isArray(raw.giftAccounts) ? raw.giftAccounts : [];
  const giftAccounts: GiftAccountFormState[] = rawGifts
    .filter((g): g is Record<string, unknown> => Boolean(g && typeof g === 'object'))
    .slice(0, 2)
    .map((g) => ({
      bankName: typeof g.bankName === 'string' ? g.bankName : '',
      accountNumber: typeof g.accountNumber === 'string' ? g.accountNumber : '',
      accountHolder:
        typeof g.accountHolder === 'string'
          ? g.accountHolder
          : typeof g.accountHolderName === 'string'
            ? g.accountHolderName
            : '',
    }));

  return {
    partnerOneName,
    partnerTwoName,
    partnerOneFullName,
    partnerTwoFullName,
    partnerOneFamily,
    partnerTwoFamily,
    timeZone,
    openingText,
    quoteText,
    prayerText,
    prayerSource,
    closingText,
    ceremonies,
    giftAccounts,
    heroPhoto: null,
    bridePhoto: null,
    groomPhoto: null,
    storyPhoto: null,
    closingPhoto: null,
    galleryPhotos: [],
  };
}

/**
 * Applies the client's live customization state onto the base template fixture
 * without mutating the original fixture or altering locked design configs.
 */
export function applyClientCustomizationToFixture(
  baseFixture: RendererData,
  state: ClientCustomizationState,
): RendererData {
  const baseContent = (baseFixture.event.content || {}) as Record<
    string,
    unknown
  >;

  const p1 = state.partnerOneName.trim() || 'Mempelai Wanita';
  const p2 = state.partnerTwoName.trim() || 'Mempelai Pria';

  const firstCeremonyStart = state.ceremonies[0]?.startDateTime;
  const tzOffset =
    state.timeZone === 'Asia/Makassar'
      ? '+08:00'
      : state.timeZone === 'Asia/Jayapura'
        ? '+09:00'
        : '+07:00';

  const resolvedEventDate =
    firstCeremonyStart && !isNaN(Date.parse(firstCeremonyStart))
      ? `${firstCeremonyStart.slice(0, 16)}:00${tzOffset}`
      : baseFixture.event.eventDate;

  const firstVenue = state.ceremonies[0]?.venue?.trim();
  const firstAddress = state.ceremonies[0]?.address?.trim();
  const resolvedLocation =
    [firstVenue, firstAddress].filter(Boolean).join(', ') ||
    baseFixture.event.locationDetails;

  const updatedContent: Record<string, unknown> = {
    ...baseContent,
    partnerOneName: p1,
    partnerTwoName: p2,
    partnerOneFullName: state.partnerOneFullName.trim() || p1,
    partnerTwoFullName: state.partnerTwoFullName.trim() || p2,
    partnerOneFamily: state.partnerOneFamily.trim(),
    partnerTwoFamily: state.partnerTwoFamily.trim(),
    timeZone: state.timeZone,
    // Populate both key variants so all 4 renderers update in real time
    intro: state.openingText.trim(),
    openingText: state.openingText.trim(),
    quote: state.quoteText.trim(),
    statement: state.quoteText.trim(),
    prayer: state.prayerText.trim(),
    prayerSource: state.prayerSource.trim(),
    closing: state.closingText.trim(),
    closingMessage: state.closingText.trim(),
    ceremonies: state.ceremonies.map((c, idx) => ({
      title: c.title.trim() || (idx === 0 ? 'Akad Nikah' : 'Resepsi'),
      startDateTime: c.startDateTime || '2026-10-18T08:00',
      endDateTime: c.endDateTime || undefined,
      venue: c.venue.trim() || 'Lokasi Acara',
      address: c.address.trim() || c.venue.trim() || 'Indonesia',
      mapsUrl: c.mapsUrl.trim() || undefined,
    })),
    giftAccounts: state.giftAccounts
      .filter(
        (g) =>
          g.bankName.trim() !== '' ||
          g.accountNumber.trim() !== '' ||
          g.accountHolder.trim() !== '',
      )
      .map((g) => ({
        bankName: g.bankName.trim() || 'Bank Transfer',
        accountNumber: g.accountNumber.trim() || '-',
        accountHolder: g.accountHolder.trim() || `${p1} & ${p2}`,
      })),
  };

  // Clone media & mediaBySlot and overlay client-uploaded preview photos
  const baseMediaList: PublicMediaDescriptor[] = Array.isArray(baseFixture.media)
    ? [...baseFixture.media]
    : [];
  const baseMediaBySlot: Record<string, PublicMediaDescriptor[]> = {};
  if (baseFixture.mediaBySlot) {
    for (const [slotKey, items] of Object.entries(baseFixture.mediaBySlot)) {
      baseMediaBySlot[slotKey] = [...items];
    }
  }

  let updatedMediaList = [...baseMediaList];

  if (state.heroPhoto?.previewUrl) {
    const heroDescriptor: PublicMediaDescriptor = {
      id: 'custom-hero-photo',
      type: 'PHOTO',
      slot: 'hero',
      order: 0,
      src: state.heroPhoto.previewUrl,
    };
    baseMediaBySlot['hero'] = [heroDescriptor];
    updatedMediaList = [
      heroDescriptor,
      ...updatedMediaList.filter((m) => m.slot !== 'hero'),
    ];
  }

  if (state.bridePhoto?.previewUrl) {
    const brideDescriptor: PublicMediaDescriptor = {
      id: 'custom-bride-photo',
      type: 'PHOTO',
      slot: 'bride',
      order: 0,
      src: state.bridePhoto.previewUrl,
    };
    baseMediaBySlot['bride'] = [brideDescriptor];
    baseMediaBySlot['couple_1'] = [brideDescriptor];
    updatedMediaList = [
      brideDescriptor,
      ...updatedMediaList.filter(
        (m) => m.slot !== 'bride' && m.slot !== 'couple_1',
      ),
    ];
  }

  if (state.groomPhoto?.previewUrl) {
    const groomDescriptor: PublicMediaDescriptor = {
      id: 'custom-groom-photo',
      type: 'PHOTO',
      slot: 'groom',
      order: 0,
      src: state.groomPhoto.previewUrl,
    };
    baseMediaBySlot['groom'] = [groomDescriptor];
    baseMediaBySlot['couple_2'] = [groomDescriptor];
    updatedMediaList = [
      groomDescriptor,
      ...updatedMediaList.filter(
        (m) => m.slot !== 'groom' && m.slot !== 'couple_2',
      ),
    ];
  }

  if (state.storyPhoto?.previewUrl) {
    const storyDescriptor: PublicMediaDescriptor = {
      id: 'custom-story-photo',
      type: 'PHOTO',
      slot: 'story',
      order: 0,
      src: state.storyPhoto.previewUrl,
    };
    baseMediaBySlot['story'] = [storyDescriptor];
    updatedMediaList = [
      storyDescriptor,
      ...updatedMediaList.filter((m) => m.slot !== 'story'),
    ];
  }

  if (state.closingPhoto?.previewUrl) {
    const closingDescriptor: PublicMediaDescriptor = {
      id: 'custom-closing-photo',
      type: 'PHOTO',
      slot: 'closing',
      order: 0,
      src: state.closingPhoto.previewUrl,
    };
    baseMediaBySlot['closing'] = [closingDescriptor];
    updatedMediaList = [
      closingDescriptor,
      ...updatedMediaList.filter((m) => m.slot !== 'closing'),
    ];
  }

  if (state.galleryPhotos.length > 0) {
    const customGalleryDescriptors: PublicMediaDescriptor[] =
      state.galleryPhotos.map((item, idx) => ({
        id: `custom-gallery-${idx}`,
        type: 'PHOTO',
        slot: 'gallery',
        order: idx,
        src: item.previewUrl,
      }));
    baseMediaBySlot['gallery'] = customGalleryDescriptors;
    updatedMediaList = [
      ...updatedMediaList.filter((m) => m.slot !== 'gallery'),
      ...customGalleryDescriptors,
    ];
  }

  return {
    ...baseFixture,
    event: {
      ...baseFixture.event,
      title: `Pernikahan ${p1} & ${p2}`,
      eventDate: resolvedEventDate,
      locationDetails: resolvedLocation,
      content: updatedContent,
    },
    // Preserve template config strictly (locked/patented)
    template: baseFixture.template,
    media: updatedMediaList,
    mediaBySlot: baseMediaBySlot,
  };
}

/**
 * Builds the schema-compliant payload for POST /events/public/draft according to the template's themeCode.
 */
export function buildDraftSubmissionPayload(params: {
  themeCode: string;
  clientName: string;
  clientWhatsapp: string;
  clientNotes?: string;
  state: ClientCustomizationState;
}) {
  const { themeCode, clientName, clientWhatsapp, clientNotes, state } = params;
  const upperTheme = normalizeThemeKey(themeCode);

  const p1 = state.partnerOneName.trim() || 'Mempelai Wanita';
  const p2 = state.partnerTwoName.trim() || 'Mempelai Pria';

  const ceremonies = state.ceremonies
    .filter((c) => c.title.trim() !== '' || c.venue.trim() !== '')
    .map((c, idx) => {
      const item: Record<string, unknown> = {
        title: c.title.trim() || (idx === 0 ? 'Akad Nikah' : 'Resepsi'),
        startDateTime: c.startDateTime || '2026-10-18T08:00',
        venue: c.venue.trim() || 'Lokasi Acara',
        address: c.address.trim() || c.venue.trim() || 'Indonesia',
      };
      if (c.endDateTime && c.endDateTime.trim() !== '') {
        item.endDateTime = c.endDateTime.trim();
      }
      if (c.mapsUrl && /^https?:\/\/[^\s]+$/i.test(c.mapsUrl.trim())) {
        item.mapsUrl = c.mapsUrl.trim();
      }
      return item;
    });

  const giftAccounts = state.giftAccounts
    .filter(
      (g) =>
        g.bankName.trim() !== '' &&
        g.accountNumber.trim() !== '' &&
        g.accountHolder.trim() !== '',
    )
    .map((g) => ({
      bankName: g.bankName.trim(),
      accountNumber: g.accountNumber.trim(),
      accountHolder: g.accountHolder.trim(),
    }));

  const content: Record<string, unknown> = {
    partnerOneName: p1,
    partnerTwoName: p2,
    partnerOneFullName: state.partnerOneFullName.trim() || p1,
    partnerTwoFullName: state.partnerTwoFullName.trim() || p2,
    partnerOneFamily: state.partnerOneFamily.trim(),
    partnerTwoFamily: state.partnerTwoFamily.trim(),
    timeZone: state.timeZone,
    ceremonies,
  };

  if (giftAccounts.length > 0) {
    content.giftAccounts = giftAccounts;
  }

  if (upperTheme === 'SEKAR_KEDATON') {
    if (state.openingText.trim()) content.intro = state.openingText.trim();
    if (state.quoteText.trim()) content.quote = state.quoteText.trim();
    if (state.prayerText.trim()) content.prayer = state.prayerText.trim();
    if (state.closingText.trim()) content.closing = state.closingText.trim();
  } else {
    if (state.openingText.trim()) content.openingText = state.openingText.trim();
    if (state.quoteText.trim()) content.statement = state.quoteText.trim();
    if (state.prayerText.trim()) content.prayer = state.prayerText.trim();
    if (state.prayerSource.trim())
      content.prayerSource = state.prayerSource.trim();
    if (state.closingText.trim())
      content.closingMessage = state.closingText.trim();
  }

  const supportedSlots = getTemplatePhotoSlotsConfig(upperTheme);
  const supportedSlotMap = new Map(supportedSlots.map((s) => [s.slot, s]));

  const photos: Array<{ slot: string; dataUrl: string; order: number }> = [];
  if (state.heroPhoto?.dataUrl && supportedSlotMap.has('hero')) {
    photos.push({
      slot: 'hero',
      dataUrl: state.heroPhoto.dataUrl,
      order: 0,
    });
  }
  if (state.bridePhoto?.dataUrl && supportedSlotMap.has('bride')) {
    photos.push({
      slot: 'bride',
      dataUrl: state.bridePhoto.dataUrl,
      order: 0,
    });
  }
  if (state.groomPhoto?.dataUrl && supportedSlotMap.has('groom')) {
    photos.push({
      slot: 'groom',
      dataUrl: state.groomPhoto.dataUrl,
      order: 0,
    });
  }
  if (state.storyPhoto?.dataUrl && supportedSlotMap.has('story')) {
    photos.push({
      slot: 'story',
      dataUrl: state.storyPhoto.dataUrl,
      order: 0,
    });
  }
  if (state.closingPhoto?.dataUrl && supportedSlotMap.has('closing')) {
    photos.push({
      slot: 'closing',
      dataUrl: state.closingPhoto.dataUrl,
      order: 0,
    });
  }
  const gallerySlotCfg = supportedSlotMap.get('gallery');
  if (gallerySlotCfg) {
    state.galleryPhotos
      .slice(0, gallerySlotCfg.maxItems)
      .forEach((p, idx) => {
        if (p.dataUrl) {
          photos.push({
            slot: 'gallery',
            dataUrl: p.dataUrl,
            order: idx,
          });
        }
      });
  }

  const firstCeremony = state.ceremonies[0];
  const tzOffset =
    state.timeZone === 'Asia/Makassar'
      ? '+08:00'
      : state.timeZone === 'Asia/Jayapura'
        ? '+09:00'
        : '+07:00';
  const eventDate =
    firstCeremony?.startDateTime &&
    !isNaN(Date.parse(firstCeremony.startDateTime))
      ? `${firstCeremony.startDateTime.slice(0, 16)}:00${tzOffset}`
      : new Date(Date.now() + 90 * 86400000).toISOString();

  const locationDetails =
    [firstCeremony?.venue?.trim(), firstCeremony?.address?.trim()]
      .filter(Boolean)
      .join(', ') || 'Lokasi Acara';

  return {
    themeCode: upperTheme,
    clientName: clientName.trim(),
    clientWhatsapp: clientWhatsapp.trim(),
    clientNotes: clientNotes?.trim() || undefined,
    eventDate,
    locationDetails,
    content,
    photos,
  };
}

/**
 * Generates the pre-filled WhatsApp Admin URL so the client can immediately confirm their order
 * while referencing the saved Super Admin Dashboard Draft ID.
 */
export function buildWhatsappOrderUrl(params: {
  adminPhone?: string;
  referenceCode: string;
  templateDisplayName: string;
  themeCode?: string;
  clientName: string;
  clientWhatsapp: string;
  clientNotes?: string;
  state: ClientCustomizationState;
}): string {
  const configuredPhone = params.adminPhone
    ? params.adminPhone.replace(/[^0-9]/g, '')
    : getPublicWhatsAppNumber() || '';

  const p1 = params.state.partnerOneName.trim() || 'Mempelai Wanita';
  const p2 = params.state.partnerTwoName.trim() || 'Mempelai Pria';
  const firstCeremony = params.state.ceremonies[0];
  const dateStr = firstCeremony?.startDateTime
    ? firstCeremony.startDateTime.replace('T', ' Pukul ')
    : '-';
  const venueStr = firstCeremony?.venue || '-';
  const upperTheme = normalizeThemeKey(params.themeCode);
  const uploadedPhotoCount = upperTheme
    ? countSupportedUploadedPhotos(upperTheme, params.state)
    : (params.state.heroPhoto ? 1 : 0) +
      (params.state.bridePhoto ? 1 : 0) +
      (params.state.groomPhoto ? 1 : 0) +
      (params.state.storyPhoto ? 1 : 0) +
      (params.state.closingPhoto ? 1 : 0) +
      params.state.galleryPhotos.length;

  const lines = [
    `Halo Admin *IRVITE*, saya sudah melakukan simulasi personalisasi undangan dan ingin memesan dengan rincian berikut:`,
    ``,
    `▸ *Kode Draf Dashboard:* #${params.referenceCode}`,
    `▸ *Template:* ${params.templateDisplayName} (Ketentuan Desain IRVITE)`,
    `▸ *Mempelai:* ${p1} & ${p2}`,
    `▸ *Jadwal Utama:* ${dateStr} (${params.state.timeZone})`,
    `▸ *Lokasi:* ${venueStr}`,
    `▸ *Foto Simulasi Diunggah:* ${uploadedPhotoCount} foto`,
    ``,
    `*Data Pemesan:*`,
    `• Nama: ${params.clientName.trim()}`,
    `• WhatsApp: ${params.clientWhatsapp.trim()}`,
  ];

  if (params.clientNotes?.trim()) {
    lines.push(`• Catatan: ${params.clientNotes.trim()}`);
  }

  lines.push(
    ``,
    `Data draf ini sudah saya kirimkan ke Dashboard Super Admin IRVITE. Mohon dibantu proses selanjutnya hingga undangan siap dipublikasikan. Terima kasih!`,
  );

  const text = encodeURIComponent(lines.join('\n'));
  return configuredPhone
    ? `https://wa.me/${configuredPhone}?text=${text}`
    : `https://wa.me/?text=${text}`;
}
