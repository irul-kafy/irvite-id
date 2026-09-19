export type TemplateAvailability = 'AVAILABLE' | 'COMING_SOON';

export interface CatalogTemplateItem {
  readonly themeCode: string;
  readonly slug: string;
  readonly displayName: string;
  readonly category: string;
  readonly shortDescription: string;
  readonly thumbnailPath: string;
  readonly demoPath: string;
  readonly sortOrder: number;
  readonly availability: TemplateAvailability;
}
