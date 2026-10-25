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
  | 'Traditional Javanese'
  | 'Celestial Fantasy'
  | 'Enchanted Woodland'
  | 'Minang Traditional'
  | string;

export interface CatalogTemplate {
  id: string; // Stable slug identifier (e.g. 'sekar-kedaton')
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
  'Traditional Javanese',
  'Celestial Fantasy',
  'Enchanted Woodland',
  'Minang Traditional',
];

export const FIXED_CATALOG_TEMPLATES: readonly CatalogTemplate[] = [
  {
    id: 'sekar-kedaton',
    slug: 'sekar-kedaton',
    themeCode: 'SEKAR_KEDATON',
    name: 'Sekar Kedaton',
    displayName: 'Sekar Kedaton',
    category: 'Traditional Javanese',
    tags: ['Traditional', 'Javanese', 'Keraton', 'Gunungan', 'Gold'],
    description:
      'Pernikahan adat Jawa klasik nan agung bernuansa hijau giok, tembaga, gunungan, dan kehangatan pendopo.',
    shortDescription:
      'Pernikahan adat Jawa klasik nan agung bernuansa hijau giok, tembaga, gunungan, dan kehangatan pendopo.',
    thumbnailPath: '/templates/sekar-kedaton/thumbnail.webp',
    demoPath: '/templates/sekar-kedaton/demo',
    sortOrder: 1,
    availability: 'AVAILABLE',
    badge: 'Artisanal',
    isPhotoOptional: false,
    config: {
      version: 1,
      theme: {
        primaryColor: '#1d3e33',
        secondaryColor: '#c59a58',
        backgroundColor: '#f8f4ee',
        textColor: '#211c18',
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
    id: 'aetheria',
    slug: 'aetheria',
    themeCode: 'AETHERIA',
    name: 'Aetheria',
    displayName: 'Aetheria',
    category: 'Celestial Fantasy',
    tags: ['Celestial', 'Fantasy', 'Portal', 'Crystal', 'Stars'],
    description:
      'Kisah cinta magis melampaui semesta dengan gerbang portal animasi, pulau kristal melayang, dan pendar bintang.',
    shortDescription:
      'Kisah cinta magis melampaui semesta dengan gerbang portal animasi, pulau kristal melayang, dan pendar bintang.',
    thumbnailPath: '/templates/aetheria/thumbnail.webp',
    demoPath: '/templates/aetheria/demo',
    sortOrder: 2,
    availability: 'AVAILABLE',
    badge: 'Fantasy',
    isPhotoOptional: false,
    config: {
      version: 1,
      theme: {
        primaryColor: '#2b1b4a',
        secondaryColor: '#b48def',
        backgroundColor: '#0e0818',
        textColor: '#f3eefc',
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
    id: 'opaline-nocturne',
    slug: 'opaline-nocturne',
    themeCode: 'OPALINE_NOCTURNE',
    name: 'Opaline Nocturne',
    displayName: 'Opaline Nocturne',
    category: 'Enchanted Woodland',
    tags: ['Enchanted', 'Woodland', 'Nocturne', 'Stars', 'Emerald'],
    description:
      'Pernikahan malam berlatar hutan magis bertabur bintang, pendar kunang-kunang, dan nuansa emerald nocturne.',
    shortDescription:
      'Pernikahan malam berlatar hutan magis bertabur bintang, pendar kunang-kunang, dan nuansa emerald nocturne.',
    thumbnailPath: '/templates/opaline-nocturne/thumbnail.webp',
    demoPath: '/templates/opaline-nocturne/demo',
    sortOrder: 3,
    availability: 'AVAILABLE',
    badge: 'Enchanted',
    isPhotoOptional: false,
    config: {
      version: 1,
      theme: {
        primaryColor: '#0f2922',
        secondaryColor: '#a7d5c6',
        backgroundColor: '#07130f',
        textColor: '#e8f2ee',
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
    id: 'ranah-cinta',
    slug: 'ranah-cinta',
    themeCode: 'RANAH_CINTA',
    name: 'Ranah Cinta',
    displayName: 'Ranah Cinta',
    category: 'Minang Traditional',
    tags: ['Minang', 'Rumah Gadang', 'Traditional', 'Songket', 'Red Gold'],
    description:
      'Inspirasi Minangkabau dengan gerbang beranimasi, ornamen ukiran Rumah Gadang, dan susunan editorial berpasangan.',
    shortDescription:
      'Inspirasi Minangkabau dengan gerbang beranimasi, ornamen ukiran Rumah Gadang, dan susunan editorial berpasangan.',
    thumbnailPath: '/templates/ranah-cinta/thumbnail.webp',
    demoPath: '/templates/ranah-cinta/demo',
    sortOrder: 4,
    availability: 'AVAILABLE',
    badge: 'Artisanal',
    isPhotoOptional: false,
    config: {
      version: 1,
      theme: {
        primaryColor: '#8a1d24',
        secondaryColor: '#cfa856',
        backgroundColor: '#fbf7ee',
        textColor: '#211816',
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
] as const;

export function getCatalogTemplates(): CatalogTemplate[] {
  return [...FIXED_CATALOG_TEMPLATES].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getCatalogTemplateById(id: string | null | undefined): CatalogTemplate | undefined {
  if (!id) return undefined;
  const normalized = id.trim().toLowerCase();
  return FIXED_CATALOG_TEMPLATES.find(
    (t) =>
      t.id.toLowerCase() === normalized ||
      t.slug.toLowerCase() === normalized ||
      t.themeCode.toLowerCase() === normalized
  );
}

export function getCatalogTemplateBySlug(slug: string | null | undefined): CatalogTemplate | undefined {
  if (!slug) return undefined;
  const normalized = slug.trim().toLowerCase();
  return FIXED_CATALOG_TEMPLATES.find((t) => t.slug.toLowerCase() === normalized);
}

export function getCatalogTemplateByThemeCode(themeCode: string | null | undefined): CatalogTemplate | undefined {
  if (!themeCode) return undefined;
  const normalized = themeCode.trim().toUpperCase();
  return FIXED_CATALOG_TEMPLATES.find((t) => t.themeCode.toUpperCase() === normalized);
}

export function filterCatalogTemplates(category: string, searchQuery: string): CatalogTemplate[] {
  const normCategory = category.trim().toLowerCase();
  const normQuery = searchQuery.trim().toLowerCase();

  return FIXED_CATALOG_TEMPLATES.filter((tpl) => {
    const matchesCategory = normCategory === 'all' || tpl.category.toLowerCase() === normCategory;
    if (!matchesCategory) return false;

    if (!normQuery) return true;

    return (
      tpl.name.toLowerCase().includes(normQuery) ||
      tpl.displayName.toLowerCase().includes(normQuery) ||
      tpl.description.toLowerCase().includes(normQuery) ||
      tpl.shortDescription.toLowerCase().includes(normQuery) ||
      tpl.tags.some((tag) => tag.toLowerCase().includes(normQuery))
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
  eventUsageCount?: number;
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

export const BUILT_IN_THEME_CODES: ReadonlySet<string> = new Set(
  FIXED_CATALOG_TEMPLATES.map((t) => t.themeCode.trim().toUpperCase())
);

export function isBuiltInCatalogTemplate(
  themeCode: string | null | undefined
): boolean {
  if (!themeCode || typeof themeCode !== 'string') return false;
  return BUILT_IN_THEME_CODES.has(themeCode.trim().toUpperCase());
}
