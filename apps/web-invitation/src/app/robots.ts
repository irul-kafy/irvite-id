import type { MetadataRoute } from 'next';
import { getPublicInvitationBaseUrl } from '../utils/url';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicInvitationBaseUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/templates',
          '/templates/*/demo',
        ],
        disallow: [
          '/i/',
          '/e/',
          '/kelola/',
          '/api/',
          '/_next/',
          '/preview/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/templates',
          '/templates/*/demo',
        ],
        disallow: [
          '/i/',
          '/e/',
          '/kelola/',
          '/api/',
          '/_next/',
          '/preview/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

