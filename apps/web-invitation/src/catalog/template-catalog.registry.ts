import type { CatalogTemplateItem } from './template-catalog.types';

export const APPROVED_CATALOG_TEMPLATES: readonly CatalogTemplateItem[] = [
  {
    themeCode: 'SEKAR_KEDATON',
    slug: 'sekar-kedaton',
    displayName: 'Sekar Kedaton',
    category: 'Traditional Javanese',
    shortDescription:
      'Pernikahan adat Jawa klasik nan agung bernuansa hijau giok, tembaga, gunungan, dan kehangatan pendopo.',
    thumbnailPath: '/templates/sekar-kedaton/thumbnail.webp',
    demoPath: '/templates/sekar-kedaton/demo',
    sortOrder: 1,
    availability: 'AVAILABLE',
  },
  {
    themeCode: 'AETHERIA',
    slug: 'aetheria',
    displayName: 'Aetheria',
    category: 'Celestial Fantasy',
    shortDescription:
      'Kisah cinta magis melampaui semesta dengan gerbang portal animasi, pulau kristal melayang, dan pendar bintang.',
    thumbnailPath: '/templates/aetheria/thumbnail.webp',
    demoPath: '/templates/aetheria/demo',
    sortOrder: 2,
    availability: 'AVAILABLE',
  },
  {
    themeCode: 'OPALINE_NOCTURNE',
    slug: 'opaline-nocturne',
    displayName: 'Opaline Nocturne',
    category: 'Enchanted Woodland',
    shortDescription:
      'Pernikahan malam berlatar hutan magis bertabur bintang, pendar kunang-kunang, dan nuansa emerald nocturne.',
    thumbnailPath: '/templates/opaline-nocturne/thumbnail.webp',
    demoPath: '/templates/opaline-nocturne/demo',
    sortOrder: 3,
    availability: 'AVAILABLE',
  },
  {
    themeCode: 'RANAH_CINTA',
    slug: 'ranah-cinta',
    displayName: 'Ranah Cinta',
    category: 'Minang Traditional',
    shortDescription:
      'Inspirasi Minangkabau dengan gerbang beranimasi, ornamen ukiran Rumah Gadang, dan susunan editorial berpasangan.',
    thumbnailPath: '/templates/ranah-cinta/thumbnail.webp',
    demoPath: '/templates/ranah-cinta/demo',
    sortOrder: 4,
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

/**
 * Merges code-owned catalog templates with DB-owned availability records.
 * Fails closed: if availability list is null/undefined or not an array, returns [].
 * Only templates with status === 'AVAILABLE' in DB are returned.
 */
export function filterAvailableTemplates(
  catalogTemplates: readonly CatalogTemplateItem[],
  availability: readonly { themeCode: string; status: string }[] | null | undefined,
): CatalogTemplateItem[] {
  if (!availability || !Array.isArray(availability)) {
    return [];
  }
  return catalogTemplates.filter((tpl) => {
    const matched = availability.find(
      (a) => a.themeCode?.trim().toUpperCase() === tpl.themeCode.trim().toUpperCase(),
    );
    return matched?.status === 'AVAILABLE';
  });
}
