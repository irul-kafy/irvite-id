import fs from 'node:fs';
import path from 'node:path';
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
      id: 'db-uuid-sekar',
      name: 'Sekar Kedaton',
      themeCode: 'SEKAR_KEDATON',
      previewImageUrl: '/templates/sekar-kedaton/thumbnail.webp',
    },
    {
      id: 'db-uuid-aetheria',
      name: 'Aetheria',
      themeCode: 'AETHERIA',
      previewImageUrl: '/templates/aetheria/thumbnail.webp',
    },
    {
      id: 'db-uuid-opaline',
      name: 'Opaline Nocturne',
      themeCode: 'OPALINE_NOCTURNE',
      previewImageUrl: '/templates/opaline-nocturne/thumbnail.webp',
    },
    {
      id: 'db-uuid-ranah',
      name: 'Ranah Cinta',
      themeCode: 'RANAH_CINTA',
      previewImageUrl: '/templates/ranah-cinta/thumbnail.webp',
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
    assert.equal(joined.length, 4);

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
    assert.equal(joined.length, 4);

    for (const item of joined) {
      const demoUrl = getCanonicalTemplateDemoUrl(item.catalogItem.demoPath);
      assert.equal(
        demoUrl,
        null,
        `demoUrl for ${item.catalogItem.slug} must be null when invitation origin is missing`
      );

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

  await t.test('template-studio.css declares all critical section layout rules', () => {
    const cssPath = path.resolve(__dirname, 'template-studio.css');
    assert.ok(fs.existsSync(cssPath), 'template-studio.css file must exist');

    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.ok(cssContent.includes('.template-card__actions'), 'Must declare action button container');
    assert.ok(cssContent.includes('.template-card__preview-btn'), 'Must declare preview button style');
    assert.ok(cssContent.includes('.template-card__use-btn'), 'Must declare use template button style');
    assert.ok(cssContent.includes('.template-card__preview-btn:disabled'), 'Must declare disabled state for preview');
    assert.ok(cssContent.includes('.template-card__use-btn:disabled'), 'Must declare disabled state for use');
  });
});
