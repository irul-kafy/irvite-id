import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIXED_CATALOG_TEMPLATES,
  joinCatalogWithDbTemplates,
  DbTemplateRecord,
} from './utils/catalog-registry';
import { getCanonicalTemplateDemoUrl } from '../../utils/url';

test('Admin Catalog Preview UI & Fail-Closed Contract', async (t) => {
  const originalOrigin = process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
  const originalUrl = process.env.PUBLIC_INVITATION_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  const mockDbTemplates: DbTemplateRecord[] = [
    {
      id: 'db-uuid-ivory',
      name: 'Ivory Garden',
      themeCode: 'IVORY_GARDEN',
      previewImageUrl: '/templates/ivory-garden/thumbnail.webp',
    },
    {
      id: 'db-uuid-serene',
      name: 'Serene Garden',
      themeCode: 'SERENE_GARDEN',
      previewImageUrl: '/templates/serene-garden/thumbnail.webp',
    },
    {
      id: 'db-uuid-sunda',
      name: 'Sunda Puspa',
      themeCode: 'SUNDA_PUSPA',
      previewImageUrl: '/templates/sunda-puspa/thumbnail.webp',
    },
    {
      id: 'db-uuid-classic',
      name: 'Classic Letter',
      themeCode: 'CLASSIC_LETTER',
      previewImageUrl: '/templates/classic-letter/thumbnail.webp',
    },
    {
      id: 'db-uuid-velvet',
      name: 'Velvet Letter',
      themeCode: 'VELVET_LETTER',
      previewImageUrl: '/templates/velvet-letter/thumbnail.webp',
    },
  ];

  t.afterEach(() => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = originalOrigin;
    process.env.PUBLIC_INVITATION_URL = originalUrl;
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = originalNodeEnv;
  });

  await t.test('origin configured: Preview is enabled with full canonical URL for all catalog templates', () => {
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'https://invitation.example.test';

    const joined = joinCatalogWithDbTemplates(FIXED_CATALOG_TEMPLATES, mockDbTemplates);
    assert.equal(joined.length, 5);

    for (const item of joined) {
      const demoUrl = getCanonicalTemplateDemoUrl(item.catalogItem.demoPath);
      assert.ok(demoUrl, `demoUrl for ${item.catalogItem.slug} must not be null when origin is set`);
      assert.ok(
        demoUrl?.startsWith('https://invitation.example.test/templates/'),
        'demoUrl must resolve against trusted public invitation origin'
      );
      assert.ok(
        demoUrl?.endsWith('/demo'),
        'demoUrl must end with /demo'
      );

      // Verify Use Template is enabled for valid DB record
      assert.equal(item.canUse, true);
      assert.equal(item.readiness, 'SYNCED');
    }
  });

  await t.test('origin missing: Preview fails closed (null), no admin-relative href, Use Template unaffected', () => {
    delete process.env.NEXT_PUBLIC_INVITATION_ORIGIN;
    delete process.env.PUBLIC_INVITATION_URL;

    const joined = joinCatalogWithDbTemplates(FIXED_CATALOG_TEMPLATES, mockDbTemplates);
    assert.equal(joined.length, 5);

    for (const item of joined) {
      const demoUrl = getCanonicalTemplateDemoUrl(item.catalogItem.demoPath);
      // Must fail closed with null, NOT fallback to relative path like /templates/<slug>/demo
      assert.equal(
        demoUrl,
        null,
        `demoUrl for ${item.catalogItem.slug} must be null when invitation origin is missing`
      );

      // Crucial: Use Template MUST REMAIN ENABLED when DB identity is valid regardless of Preview-origin configuration
      assert.equal(
        item.canUse,
        true,
        'Use Template button must remain enabled when DB record is synced, even if preview origin is missing'
      );
      assert.equal(item.readiness, 'SYNCED');
      assert.ok(item.matchedDbTemplate?.id);
    }
  });

  await t.test('unsafe origin in production: fails closed with null, no admin-relative fallback', () => {
    // @ts-expect-error Mock process.env
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_INVITATION_ORIGIN = 'http://insecure-domain.com';

    for (const cat of FIXED_CATALOG_TEMPLATES) {
      const demoUrl = getCanonicalTemplateDemoUrl(cat.demoPath);
      assert.equal(
        demoUrl,
        null,
        'Insecure HTTP origin in production must return null and not fallback to relative path'
      );
    }
  });
});
