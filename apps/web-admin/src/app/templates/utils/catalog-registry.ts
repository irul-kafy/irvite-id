/**
 * Fixed Template Catalog Registry
 * Defines ready-to-use, uniquely styled fixed invitation templates.
 * Customers and standard admins select fixed designs without modifying colors, typography, or section layout.
 */

import { TemplateConfigV1 } from './template-studio-model';

export type CatalogCategory =
  | 'All'
  | 'Elegant'
  | 'Minimalist'
  | 'Floral'
  | 'Non-Foto'
  | 'Painting'
  | 'Classic';

export interface CatalogTemplate {
  id: string;
  name: string;
  themeCode: string;
  category: CatalogCategory;
  tags: string[];
  description: string;
  badge?: string;
  isPhotoOptional?: boolean;
  config: TemplateConfigV1;
}

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  'All',
  'Elegant',
  'Minimalist',
  'Floral',
  'Non-Foto',
  'Painting',
  'Classic',
];

export const FIXED_CATALOG_TEMPLATES: CatalogTemplate[] = [
  {
    id: 'verdant-estate',
    name: 'Verdant Estate',
    themeCode: 'VERDANT',
    category: 'Elegant',
    tags: ['Classic', 'Elegant', 'Floral'],
    description:
      'Timeless luxury with deep emerald greens, warm gold accents, and elegant serif typography.',
    badge: 'Trending',
    isPhotoOptional: false,
    config: {
      version: 1,
      theme: {
        primaryColor: '#1E3A2F',
        secondaryColor: '#B4975A',
        backgroundColor: '#F7F8F5',
        textColor: '#1A2820',
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
    id: 'midnight-editorial',
    name: 'Midnight Editorial',
    themeCode: 'MIDNIGHT',
    category: 'Minimalist',
    tags: ['Minimalist', 'Modern', 'Dark'],
    description:
      'High-fashion dark aesthetic with sleek typography, high-contrast layouts, and modern minimalism.',
    badge: 'Popular',
    isPhotoOptional: false,
    config: {
      version: 1,
      theme: {
        primaryColor: '#F3F4F6',
        secondaryColor: '#9CA3AF',
        backgroundColor: '#0F172A',
        textColor: '#F9FAFB',
      },
      typography: {
        headingFont: 'MONTSERRAT',
        bodyFont: 'INTER',
      },
      sections: [
        { id: 'hero', enabled: true, order: 1, variant: 'default' },
        { id: 'eventDetails', enabled: true, order: 2, variant: 'default' },
        { id: 'greeting', enabled: true, order: 3, variant: 'default' },
        { id: 'location', enabled: true, order: 4, variant: 'default' },
        { id: 'rsvp', enabled: true, order: 5, variant: 'default' },
        { id: 'gallery', enabled: true, order: 6, variant: 'default' },
        { id: 'countdown', enabled: true, order: 7, variant: 'default' },
        { id: 'guestQr', enabled: false, order: 8, variant: 'default' },
        { id: 'closing', enabled: true, order: 9, variant: 'default' },
      ],
    },
  },
  {
    id: 'botanical-illustration',
    name: 'Botanical Illustration',
    themeCode: 'BOTANICAL',
    category: 'Painting',
    tags: ['Painting', 'Non-Foto', 'Floral', 'Rustic'],
    description:
      'Artistic painted botanicals with warm earth tones, organic textures, and hand-crafted charm without requiring personal photos.',
    badge: 'Artisanal',
    isPhotoOptional: true,
    config: {
      version: 1,
      theme: {
        primaryColor: '#8B4513',
        secondaryColor: '#C48B58',
        backgroundColor: '#FAF6F0',
        textColor: '#3D2817',
      },
      typography: {
        headingFont: 'PLAYFAIR_DISPLAY',
        bodyFont: 'INTER',
      },
      sections: [
        { id: 'hero', enabled: true, order: 1, variant: 'default' },
        { id: 'greeting', enabled: true, order: 2, variant: 'default' },
        { id: 'eventDetails', enabled: true, order: 3, variant: 'default' },
        { id: 'location', enabled: true, order: 4, variant: 'default' },
        { id: 'rsvp', enabled: true, order: 5, variant: 'default' },
        { id: 'countdown', enabled: true, order: 6, variant: 'default' },
        { id: 'closing', enabled: true, order: 7, variant: 'default' },
        { id: 'gallery', enabled: false, order: 8, variant: 'default' },
        { id: 'guestQr', enabled: false, order: 9, variant: 'default' },
      ],
    },
  },
  {
    id: 'classic-elegance',
    name: 'Classic Elegance',
    themeCode: 'CLASSIC',
    category: 'Classic',
    tags: ['Classic', 'Elegant'],
    description:
      'A refined, timeless aesthetic with warm stone accents, balanced serif typography, and graceful whitespace.',
    isPhotoOptional: false,
    config: {
      version: 1,
      theme: {
        primaryColor: '#1C1917',
        secondaryColor: '#78716C',
        backgroundColor: '#FAFAF9',
        textColor: '#292524',
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
    id: 'modern-minimal',
    name: 'Modern Minimal',
    themeCode: 'MINIMAL',
    category: 'Minimalist',
    tags: ['Minimalist', 'Modern'],
    description:
      'Crisp, clean lines with high-contrast typography, neutral grays, and contemporary structure.',
    isPhotoOptional: false,
    config: {
      version: 1,
      theme: {
        primaryColor: '#111827',
        secondaryColor: '#6B7280',
        backgroundColor: '#FFFFFF',
        textColor: '#111827',
      },
      typography: {
        headingFont: 'MONTSERRAT',
        bodyFont: 'INTER',
      },
      sections: [
        { id: 'hero', enabled: true, order: 1, variant: 'default' },
        { id: 'eventDetails', enabled: true, order: 2, variant: 'default' },
        { id: 'greeting', enabled: true, order: 3, variant: 'default' },
        { id: 'location', enabled: true, order: 4, variant: 'default' },
        { id: 'rsvp', enabled: true, order: 5, variant: 'default' },
        { id: 'gallery', enabled: true, order: 6, variant: 'default' },
        { id: 'countdown', enabled: true, order: 7, variant: 'default' },
        { id: 'guestQr', enabled: false, order: 8, variant: 'default' },
        { id: 'closing', enabled: true, order: 9, variant: 'default' },
      ],
    },
  },
  {
    id: 'romantic-garden',
    name: 'Romantic Garden',
    themeCode: 'ROMANTIC',
    category: 'Floral',
    tags: ['Floral', 'Romantic', 'Elegant'],
    description:
      'Soft blush tones, crimson accents, and poetic typography designed for romantic celebrations.',
    isPhotoOptional: false,
    config: {
      version: 1,
      theme: {
        primaryColor: '#881337',
        secondaryColor: '#9F1239',
        backgroundColor: '#FFF1F2',
        textColor: '#4C0519',
      },
      typography: {
        headingFont: 'PLAYFAIR_DISPLAY',
        bodyFont: 'INTER',
      },
      sections: [
        { id: 'hero', enabled: true, order: 1, variant: 'default' },
        { id: 'greeting', enabled: true, order: 2, variant: 'default' },
        { id: 'eventDetails', enabled: true, order: 3, variant: 'default' },
        { id: 'gallery', enabled: true, order: 4, variant: 'default' },
        { id: 'countdown', enabled: true, order: 5, variant: 'default' },
        { id: 'location', enabled: true, order: 6, variant: 'default' },
        { id: 'rsvp', enabled: true, order: 7, variant: 'default' },
        { id: 'guestQr', enabled: false, order: 8, variant: 'default' },
        { id: 'closing', enabled: true, order: 9, variant: 'default' },
      ],
    },
  },
];

export function getCatalogTemplateById(id: string): CatalogTemplate | undefined {
  return FIXED_CATALOG_TEMPLATES.find((t) => t.id === id);
}

export function filterCatalogTemplates(
  category: CatalogCategory,
  searchQuery: string = ''
): CatalogTemplate[] {
  return FIXED_CATALOG_TEMPLATES.filter((tpl) => {
    // 1. Category filter
    const matchesCategory =
      category === 'All' ||
      tpl.category === category ||
      tpl.tags.some((tag) => tag.toLowerCase() === category.toLowerCase());

    if (!matchesCategory) return false;

    // 2. Search query filter
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      tpl.name.toLowerCase().includes(query) ||
      tpl.description.toLowerCase().includes(query) ||
      tpl.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });
}
