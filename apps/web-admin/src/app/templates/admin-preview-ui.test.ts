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
  await t.test('all production template preview assets exist in web-admin public directory', () => {
    const publicDir = path.resolve(__dirname, '../../../public');

    for (const cat of FIXED_CATALOG_TEMPLATES) {
      const assetRelative = cat.thumbnailPath.replace(/^\//, '');
      const fullPath = path.join(publicDir, assetRelative);

      assert.ok(
        fs.existsSync(fullPath),
        `Static preview image for ${cat.displayName} must exist at ${fullPath}`
      );

      const stats = fs.statSync(fullPath);
      assert.ok(
        stats.size > 1000,
        `Preview asset for ${cat.displayName} must be non-empty (got ${stats.size} bytes)`
      );
    }
  });

  await t.test('CSS defines toolbar, category tabs, and high contrast dark mode tokens', () => {
    const cssPath = path.resolve(__dirname, './template-studio.css');
    const globalsPath = path.resolve(__dirname, '../globals.css');

    const studioCss = fs.readFileSync(cssPath, 'utf8');
    const globalsCss = fs.readFileSync(globalsPath, 'utf8');

    // Toolbar and category classes must be styled
    assert.ok(studioCss.includes('.catalog-toolbar'), 'Must style .catalog-toolbar');
    assert.ok(studioCss.includes('.catalog-categories'), 'Must style .catalog-categories');
    assert.ok(studioCss.includes('.catalog-category-tab'), 'Must style .catalog-category-tab');

    // Dark mode high-contrast overrides must be localized to template-studio.css
    assert.ok(studioCss.includes('--admin-text: #F4EFE7;'), 'template-studio.css dark mode must define high-contrast --admin-text');
    assert.ok(studioCss.includes('--admin-text-secondary: #D2C9BC;'), 'template-studio.css dark mode must define readable --admin-text-secondary');
    assert.ok(studioCss.includes('--admin-text-muted: #A8A29E;'), 'template-studio.css dark mode must define readable --admin-text-muted');
    assert.ok(globalsCss.includes('--text-secondary: #A8A29E;'), 'globals.css must preserve original --text-secondary baseline');

    assert.ok(studioCss.includes('html.dark .catalog-search__input'), 'template-studio.css must style search input for dark mode');
    assert.ok(studioCss.includes('html.dark .catalog-tab--active'), 'template-studio.css must style active tab with high contrast accent');
    assert.ok(studioCss.includes('html.dark .catalog-section__count'), 'template-studio.css must style section count with high contrast');
    assert.ok(studioCss.includes('html.dark .template-card__btn--select'), 'template-studio.css must style select button with high contrast text in dark mode');
  });
});
