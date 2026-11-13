import type { MetadataRoute } from 'next';
import { getPublicInvitationBaseUrl } from '../utils/url';
import { APPROVED_CATALOG_TEMPLATES } from '../catalog/template-catalog.registry';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getPublicInvitationBaseUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/templates`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  const demoRoutes: MetadataRoute.Sitemap = APPROVED_CATALOG_TEMPLATES.map((t) => ({
    url: `${baseUrl}/templates/${t.slug}/demo`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...demoRoutes];
}
