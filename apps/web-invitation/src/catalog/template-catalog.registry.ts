import type { CatalogTemplateItem } from './template-catalog.types';

export const APPROVED_CATALOG_TEMPLATES: readonly CatalogTemplateItem[] = [
  {
    themeCode: 'IVORY_GARDEN',
    slug: 'ivory-garden',
    displayName: 'Ivory Garden',
    category: 'Floral & Botanical',
    shortDescription:
      'Desain elegan bernuansa floral ivory dengan sentuhan botanical klasik yang abadi.',
    thumbnailPath: '/templates/ivory-garden/thumbnail.webp',
    demoPath: '/templates/ivory-garden/demo',
    sortOrder: 1,
    availability: 'AVAILABLE',
  },
  {
    themeCode: 'SERENE_GARDEN',
    slug: 'serene-garden',
    displayName: 'Serene Garden',
    category: 'Modern Botanical',
    shortDescription:
      'Harmoni botanical modern yang menenangkan dengan tipografi anggun dan tata letak presisi.',
    thumbnailPath: '/templates/serene-garden/thumbnail.webp',
    demoPath: '/templates/serene-garden/demo',
    sortOrder: 2,
    availability: 'AVAILABLE',
  },
  {
    themeCode: 'SUNDA_PUSPA',
    slug: 'sunda-puspa',
    displayName: 'Sunda Puspa',
    category: 'Traditional Sundanese',
    shortDescription:
      'Pernikahan adat Sunda klasik nan agung dengan ornamen puspa dan kidung kabagjaan.',
    thumbnailPath: '/templates/sunda-puspa/thumbnail.webp',
    demoPath: '/templates/sunda-puspa/demo',
    sortOrder: 3,
    availability: 'AVAILABLE',
  },
  {
    themeCode: 'CLASSIC_LETTER',
    slug: 'classic-letter',
    displayName: 'Classic Letter',
    category: 'Classic',
    shortDescription:
      'Undangan bernuansa surat klasik elegan bertekstur kertas ivory, aksen emas antik, dan segel lilin.',
    thumbnailPath: '/templates/classic-letter/thumbnail.webp',
    demoPath: '/templates/classic-letter/demo',
    sortOrder: 4,
    availability: 'AVAILABLE',
  },
  {
    themeCode: 'VELVET_LETTER',
    slug: 'velvet-letter',
    displayName: 'Velvet Letter',
    category: 'Luxury Stationery',
    shortDescription:
      'Undangan bernuansa burgundy velvet mewah dengan stationery ivory, aksen champagne, amplop elegan, dan segel lilin.',
    thumbnailPath: '/templates/velvet-letter/thumbnail.webp',
    demoPath: '/templates/velvet-letter/demo',
    sortOrder: 5,
    availability: 'AVAILABLE',
  },
] as const;

/**
 * Returns all approved catalog templates sorted by sortOrder ascending.
 */
export function getCatalogTemplates(): CatalogTemplateItem[] {
  return [...APPROVED_CATALOG_TEMPLATES].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Look up a catalog template by its public slug (case-insensitive).
 */
export function getCatalogTemplateBySlug(
  slug: string | null | undefined
): CatalogTemplateItem | undefined {
  if (!slug || typeof slug !== 'string') return undefined;
  const normalized = slug.trim().toLowerCase();
  return APPROVED_CATALOG_TEMPLATES.find(
    (item) => item.slug.toLowerCase() === normalized
  );
}

/**
 * Look up a catalog template by its internal themeCode (case-insensitive).
 */
export function getCatalogTemplateByThemeCode(
  themeCode: string | null | undefined
): CatalogTemplateItem | undefined {
  if (!themeCode || typeof themeCode !== 'string') return undefined;
  const normalized = themeCode.trim().toUpperCase();
  return APPROVED_CATALOG_TEMPLATES.find(
    (item) => item.themeCode.toUpperCase() === normalized
  );
}

/**
 * Returns true if a template exists and has availability 'AVAILABLE'.
 */
export function isAvailableTemplate(slug: string | null | undefined): boolean {
  const item = getCatalogTemplateBySlug(slug);
  return item !== undefined && item.availability === 'AVAILABLE';
}
