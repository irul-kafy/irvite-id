/**
 * Fixed Template Catalog Registry (Admin)
 * Authoritative admin presentation metadata for approved production templates.
 * Aligned with the public web-invitation catalog registry contract.
 *
 * DO NOT hardcode environment-specific DB UUIDs here.
 * DB identity is resolved dynamically via joinCatalogWithDbTemplates() by matching themeCode.
 */

import { TemplateConfigV1 } from './template-studio-model';

export type CatalogAvailability = 'AVAILABLE' | 'COMING_SOON' | 'DEPRECATED';

export type CatalogCategory =
  | 'All'
  | 'Floral & Botanical'
  | 'Modern Botanical'
  | 'Traditional Sundanese'
  | string;

export interface CatalogTemplate {
  id: string; // Stable slug identifier (e.g. 'ivory-garden')
  slug: string;
  themeCode: string;
  name: string;
  displayName: string;
  category: string;
  tags: string[];
  description: string;
  shortDescription: string;
  thumbnailPath: string;
  demoPath: string;
  sortOrder: number;
  availability: CatalogAvailability;
  badge?: string;
  isPhotoOptional?: boolean;
  config: TemplateConfigV1;
}

export const CATALOG_CATEGORIES: string[] = [
  'All',
  'Floral & Botanical',
  'Modern Botanical',
  'Traditional Sundanese',
];

export const FIXED_CATALOG_TEMPLATES: readonly CatalogTemplate[] = [
  {
    id: 'ivory-garden',
    slug: 'ivory-garden',
    themeCode: 'IVORY_GARDEN',
    name: 'Ivory Garden',
    displayName: 'Ivory Garden',
    category: 'Floral & Botanical',
    tags: ['Floral', 'Botanical', 'Elegant', 'Classic'],
    description:
      'Desain elegan bernuansa floral ivory dengan sentuhan botanical klasik yang abadi.',
    shortDescription:
      'Desain elegan bernuansa floral ivory dengan sentuhan botanical klasik yang abadi.',
    thumbnailPath: '/templates/ivory-garden/thumbnail.webp',
    demoPath: '/templates/ivory-garden/demo',
    sortOrder: 1,
    availability: 'AVAILABLE',
    badge: 'Popular',
    isPhotoOptional: false,
    config: {
      version: 1,
      theme: {
        primaryColor: '#C4A06A',
        secondaryColor: '#8A734D',
        backgroundColor: '#FDFBF7',
        textColor: '#171817',
      },
      typography: {
        headingFont: 'PLAYFAIR_DISPLAY',
        bodyFont: 'INTER',
      },
      sections: [
        { id: 'hero', enabled: true, order: 1, variant: 'default' },
        { id: 'greeting', enabled: true, order: 2, variant: 'default' },
        { id: 'eventDetails', enabled: true, order: 3, variant: 'default' },
        { id: 'countdown', enabled: true, order: 4, variant: 'default' },
        { id: 'gallery', enabled: true, order: 5, variant: 'default' },
        { id: 'location', enabled: true, order: 6, variant: 'default' },
        { id: 'rsvp', enabled: true, order: 7, variant: 'default' },
        { id: 'guestQr', enabled: false, order: 8, variant: 'default' },
        { id: 'closing', enabled: true, order: 9, variant: 'default' },
      ],
    },
  },
  {
    id: 'serene-garden',
    slug: 'serene-garden',
    themeCode: 'SERENE_GARDEN',
    name: 'Serene Garden',
    displayName: 'Serene Garden',
    category: 'Modern Botanical',
    tags: ['Botanical', 'Modern', 'Serene', 'Minimalist'],
    description:
      'Harmoni botanical modern yang menenangkan dengan tipografi anggun dan tata letak presisi.',
    shortDescription:
      'Harmoni botanical modern yang menenangkan dengan tipografi anggun dan tata letak presisi.',
    thumbnailPath: '/templates/serene-garden/thumbnail.webp',
    demoPath: '/templates/serene-garden/demo',
    sortOrder: 2,
    availability: 'AVAILABLE',
    badge: 'Trending',
    isPhotoOptional: false,
    config: {
      version: 1,
      theme: {
        primaryColor: '#2D5A3D',
        secondaryColor: '#7A9A7E',
        backgroundColor: '#F7FAF7',
        textColor: '#172019',
      },
      typography: {
        headingFont: 'PLAYFAIR_DISPLAY',
        bodyFont: 'LORA',
      },
      sections: [
        { id: 'hero', enabled: true, order: 1, variant: 'default' },
        { id: 'greeting', enabled: true, order: 2, variant: 'default' },
        { id: 'eventDetails', enabled: true, order: 3, variant: 'default' },
        { id: 'countdown', enabled: true, order: 4, variant: 'default' },
        { id: 'gallery', enabled: true, order: 5, variant: 'default' },
        { id: 'location', enabled: true, order: 6, variant: 'default' },
        { id: 'rsvp', enabled: true, order: 7, variant: 'default' },
        { id: 'guestQr', enabled: false, order: 8, variant: 'default' },
        { id: 'closing', enabled: true, order: 9, variant: 'default' },
      ],
    },
  },
  {
    id: 'sunda-puspa',
    slug: 'sunda-puspa',
    themeCode: 'SUNDA_PUSPA',
    name: 'Sunda Puspa',
    displayName: 'Sunda Puspa',
    category: 'Traditional Sundanese',
    tags: ['Traditional', 'Sunda', 'Puspa', 'Cultural'],
    description:
      'Pernikahan adat Sunda klasik nan agung dengan ornamen puspa dan kidung kabagjaan.',
    shortDescription:
      'Pernikahan adat Sunda klasik nan agung dengan ornamen puspa dan kidung kabagjaan.',
    thumbnailPath: '/templates/sunda-puspa/thumbnail.webp',
    demoPath: '/templates/sunda-puspa/demo',
    sortOrder: 3,
    availability: 'AVAILABLE',
    badge: 'Artisanal',
    isPhotoOptional: true,
    config: {
      version: 1,
      theme: {
        primaryColor: '#A17A38',
        secondaryColor: '#D4AF37',
        backgroundColor: '#FAF7F2',
        textColor: '#2A2318',
      },
      typography: {
        headingFont: 'PLAYFAIR_DISPLAY',
        bodyFont: 'INTER',
      },
      sections: [
        { id: 'hero', enabled: true, order: 1, variant: 'default' },
        { id: 'greeting', enabled: true, order: 2, variant: 'default' },
        { id: 'eventDetails', enabled: true, order: 3, variant: 'default' },
        { id: 'countdown', enabled: true, order: 4, variant: 'default' },
        { id: 'gallery', enabled: true, order: 5, variant: 'default' },
        { id: 'location', enabled: true, order: 6, variant: 'default' },
        { id: 'rsvp', enabled: true, order: 7, variant: 'default' },
        { id: 'guestQr', enabled: false, order: 8, variant: 'default' },
        { id: 'closing', enabled: true, order: 9, variant: 'default' },
      ],
    },
  },
  {
    id: 'classic-letter',
    slug: 'classic-letter',
    themeCode: 'CLASSIC_LETTER',
    name: 'Classic Letter',
    displayName: 'Classic Letter',
    category: 'Classic',
    tags: ['Classic', 'Letter', 'Stationery', 'Wax Seal', 'Elegant'],
    description: 'Undangan bernuansa surat klasik elegan bertekstur kertas ivory, aksen emas antik, dan segel lilin.',
    shortDescription: 'Undangan bernuansa surat klasik elegan bertekstur kertas ivory, aksen emas antik, dan segel lilin.',
    thumbnailPath: '/templates/classic-letter/thumbnail.webp',
    demoPath: '/templates/classic-letter/demo',
    sortOrder: 4,
    availability: 'AVAILABLE',
    badge: 'Artisanal',
    isPhotoOptional: true,
    config: {
      version: 1,
      theme: {
        primaryColor: '#785A3A',
        secondaryColor: '#B89758',
        backgroundColor: '#FAF7F2',
        textColor: '#2C2621',
      },
      typography: {
        headingFont: 'CORMORANT_GARAMOND',
        bodyFont: 'DM_SANS',
      },
      sections: [
        { id: 'hero', enabled: true, order: 1, variant: 'default' },
        { id: 'greeting', enabled: true, order: 2, variant: 'default' },
        { id: 'eventDetails', enabled: true, order: 3, variant: 'default' },
        { id: 'countdown', enabled: true, order: 4, variant: 'default' },
        { id: 'gallery', enabled: true, order: 5, variant: 'default' },
        { id: 'location', enabled: true, order: 6, variant: 'default' },
        { id: 'rsvp', enabled: true, order: 7, variant: 'default' },
        { id: 'guestQr', enabled: false, order: 8, variant: 'default' },
        { id: 'closing', enabled: true, order: 9, variant: 'default' },
      ],
    },
  },
  {
    id: 'velvet-letter',
    slug: 'velvet-letter',
    themeCode: 'VELVET_LETTER',
    name: 'Velvet Letter',
    displayName: 'Velvet Letter',
    category: 'Luxury Stationery',
    tags: ['Luxury', 'Stationery', 'Velvet', 'Letter', 'Wax Seal', 'Burgundy'],
    description:
      'Undangan bernuansa burgundy velvet mewah dengan stationery ivory, aksen champagne, amplop elegan, dan segel lilin.',
    shortDescription:
      'Undangan bernuansa burgundy velvet mewah dengan stationery ivory, aksen champagne, amplop elegan, dan segel lilin.',
    thumbnailPath: '/templates/velvet-letter/thumbnail.webp',
    demoPath: '/templates/velvet-letter/demo',
    sortOrder: 5,
    availability: 'AVAILABLE',
    badge: 'Artisanal',
    isPhotoOptional: true,
    config: {
      version: 1,
      theme: {
        primaryColor: '#5B1425',
        secondaryColor: '#D4AF37',
        backgroundColor: '#2A0812',
        textColor: '#2C2621',
      },
      typography: {
        headingFont: 'PLAYFAIR_DISPLAY',
        bodyFont: 'INTER',
      },
      sections: [
        { id: 'hero', enabled: true, order: 1, variant: 'default' },
        { id: 'greeting', enabled: true, order: 2, variant: 'default' },
        { id: 'eventDetails', enabled: true, order: 3, variant: 'default' },
        { id: 'countdown', enabled: true, order: 4, variant: 'default' },
        { id: 'gallery', enabled: false, order: 5, variant: 'default' },
        { id: 'location', enabled: true, order: 6, variant: 'default' },
        { id: 'rsvp', enabled: true, order: 7, variant: 'default' },
        { id: 'guestQr', enabled: false, order: 8, variant: 'default' },
        { id: 'closing', enabled: true, order: 9, variant: 'default' },
      ],
    },
  },
] as const;

export function getCatalogTemplates(): CatalogTemplate[] {
  return [...FIXED_CATALOG_TEMPLATES].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getCatalogTemplateById(id: string | null | undefined): CatalogTemplate | undefined {
  if (!id) return undefined;
  const normalized = id.trim().toLowerCase();
  return FIXED_CATALOG_TEMPLATES.find(
    (t) => t.id.toLowerCase() === normalized || t.slug.toLowerCase() === normalized || t.themeCode.toLowerCase() === normalized
  );
}

export function getCatalogTemplateBySlug(slug: string | null | undefined): CatalogTemplate | undefined {
  if (!slug) return undefined;
  const normalized = slug.trim().toLowerCase();
  return FIXED_CATALOG_TEMPLATES.find((t) => t.slug.toLowerCase() === normalized);
}

export function getCatalogTemplateByThemeCode(
  themeCode: string | null | undefined
): CatalogTemplate | undefined {
  if (!themeCode) return undefined;
  const normalized = themeCode.trim().toUpperCase();
  return FIXED_CATALOG_TEMPLATES.find(
    (t) => t.themeCode.trim().toUpperCase() === normalized
  );
}

export function filterCatalogTemplates(
  category: string,
  searchQuery: string = ''
): CatalogTemplate[] {
  return FIXED_CATALOG_TEMPLATES.filter((tpl) => {
    const matchesCategory =
      category === 'All' ||
      tpl.category === category ||
      tpl.tags.some((tag) => tag.toLowerCase() === category.toLowerCase());

    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      tpl.name.toLowerCase().includes(query) ||
      tpl.displayName.toLowerCase().includes(query) ||
      tpl.themeCode.toLowerCase().includes(query) ||
      tpl.description.toLowerCase().includes(query) ||
      tpl.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });
}

// ── DB JOIN LOGIC (SECTION 9) ────────────────────────────────────────────────

export interface DbTemplateRecord {
  id: string;
  name: string;
  themeCode?: string | null;
  status?: string;
  previewImageUrl?: string | null;
  config?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export type DbReadinessStatus = 'SYNCED' | 'MISSING' | 'DUPLICATE';

export interface JoinedCatalogTemplate {
  catalogItem: CatalogTemplate;
  readiness: DbReadinessStatus;
  matchCount: number;
  matchedDbTemplate: DbTemplateRecord | null;
  canUse: boolean;
  previewImageUrl: string;
  statusMessage: string;
}

/**
 * Joins static code-owned catalog templates with live database template records by themeCode.
 *
 * Requirements:
 * - Join MUST be by themeCode, NOT display name.
 * - 0 matching DB rows: readiness = MISSING, canUse = false, no fabricated ID.
 * - 1 matching DB row: readiness = SYNCED, canUse = true, receives exact DB id.
 * - >1 matching DB rows: readiness = DUPLICATE, canUse = false, FAIL CLOSED (never pick first duplicate).
 */
export function joinCatalogWithDbTemplates(
  catalogTemplates: readonly CatalogTemplate[],
  dbTemplates: readonly DbTemplateRecord[]
): JoinedCatalogTemplate[] {
  return catalogTemplates.map((catalogItem) => {
    const targetThemeCode = catalogItem.themeCode.trim().toUpperCase();

    const matches = dbTemplates.filter((db) => {
      if (!db.themeCode || typeof db.themeCode !== 'string') return false;
      return db.themeCode.trim().toUpperCase() === targetThemeCode;
    });

    if (matches.length === 1) {
      const dbRow = matches[0];
      const isAvailable = dbRow.status !== undefined ? dbRow.status === 'AVAILABLE' : catalogItem.availability === 'AVAILABLE';
      return {
        catalogItem,
        readiness: 'SYNCED',
        matchCount: 1,
        matchedDbTemplate: dbRow,
        canUse: isAvailable,
        previewImageUrl: dbRow.previewImageUrl || catalogItem.thumbnailPath,
        statusMessage: isAvailable
          ? 'Tersinkronisasi dengan Database'
          : `Template berstatus ${dbRow.status || 'HIDDEN'}. Tidak dapat digunakan untuk event baru.`,
      };
    }

    if (matches.length === 0) {
      return {
        catalogItem,
        readiness: 'MISSING',
        matchCount: 0,
        matchedDbTemplate: null,
        canUse: false,
        previewImageUrl: catalogItem.thumbnailPath,
        statusMessage: 'Identitas Database belum tersinkronisasi. Jalankan templates:sync.',
      };
    }

    // > 1 matching rows: FAIL CLOSED! Do NOT pick first duplicate!
    return {
      catalogItem,
      readiness: 'DUPLICATE',
      matchCount: matches.length,
      matchedDbTemplate: null,
      canUse: false,
      previewImageUrl: catalogItem.thumbnailPath,
      statusMessage: `Peringatan: Duplikasi identitas terdeteksi (${matches.length} baris di DB). Fitur dinonaktifkan.`,
    };
  });
}
