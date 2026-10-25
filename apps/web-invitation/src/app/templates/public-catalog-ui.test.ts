/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getCatalogTemplates, filterAvailableTemplates } from '../../catalog';

test('Public Catalog UI & Landing Integration Contract', async (t) => {
  const templates = getCatalogTemplates().filter((t) => t.availability === 'AVAILABLE');

  await t.test('public catalog contains exactly the 4 AVAILABLE approved templates', () => {
    assert.equal(templates.length, 4);
    const names = templates.map((t) => t.displayName);
    assert.deepEqual(names, [
      'Sekar Kedaton',
      'Aetheria',
      'Opaline Nocturne',
      'Ranah Cinta',
    ]);

    const themeCodes = templates.map((t) => t.themeCode);
    assert.deepEqual(themeCodes, [
      'SEKAR_KEDATON',
      'AETHERIA',
      'OPALINE_NOCTURNE',
      'RANAH_CINTA',
    ]);
  });

  await t.test('Sekar Kedaton and Aetheria are visible with required metadata', () => {
    const sekar = templates.find((t) => t.themeCode === 'SEKAR_KEDATON');
    const aetheria = templates.find((t) => t.themeCode === 'AETHERIA');

    assert.ok(sekar, 'Sekar Kedaton must be present');
    assert.ok(aetheria, 'Aetheria must be present');

    assert.equal(sekar?.thumbnailPath, '/templates/sekar-kedaton/thumbnail.webp');
    assert.equal(sekar?.demoPath, '/templates/sekar-kedaton/demo');

    assert.equal(aetheria?.thumbnailPath, '/templates/aetheria/thumbnail.webp');
    assert.equal(aetheria?.demoPath, '/templates/aetheria/demo');
  });

  await t.test('legacy placeholder marketing cards are strictly absent from active catalog', () => {
    const legacyNames = [
      'Verdant Estate',
      'Midnight Editorial',
      'Botanical Romance',
      'Classic Elegance',
      'Modern Minimal',
      'Romantic Garden',
    ];

    for (const legacy of legacyNames) {
      const found = templates.some(
        (t) => t.displayName.toLowerCase() === legacy.toLowerCase()
      );
      assert.equal(found, false, 'Legacy placeholder ' + legacy + ' must not be visible in active catalog');
    }
  });

  await t.test('landing page consumes typed catalog registry and has no hardcoded TEMPLATES array', () => {
    const pagePath = fs.existsSync(path.resolve(process.cwd(), 'src/app/page.tsx'))
      ? path.resolve(process.cwd(), 'src/app/page.tsx')
      : path.resolve(process.cwd(), 'apps/web-invitation/src/app/page.tsx');

    const landingContent = fs.readFileSync(pagePath, 'utf8');

    // Must import and use getCatalogTemplates
    assert.ok(
      landingContent.includes('getCatalogTemplates'),
      'Landing page must import and use getCatalogTemplates'
    );

    // Must NOT contain the legacy hardcoded array
    assert.ok(
      !landingContent.includes('const TEMPLATES = ['),
      'Landing page must not contain hardcoded TEMPLATES array'
    );

    // Must have a link to /templates
    assert.ok(
      landingContent.includes('href="/templates"'),
      'Landing page must include a link to /templates'
    );
  });

  await t.test('public /templates page file exists and imports catalog registry', () => {
    const templatesPagePath = fs.existsSync(path.resolve(process.cwd(), 'src/app/templates/page.tsx'))
      ? path.resolve(process.cwd(), 'src/app/templates/page.tsx')
      : path.resolve(process.cwd(), 'apps/web-invitation/src/app/templates/page.tsx');

    assert.ok(fs.existsSync(templatesPagePath), 'public /templates/page.tsx must exist');

    const content = fs.readFileSync(templatesPagePath, 'utf8');
    assert.ok(content.includes('getCatalogTemplates'), 'public /templates/page.tsx must use getCatalogTemplates');
    assert.ok(content.includes('demoPath'), 'public /templates/page.tsx must render demoPath');
  });

  await t.test('landing page and public /templates page wire DB lifecycle fetch and fail closed', () => {
    const landingPath = fs.existsSync(path.resolve(process.cwd(), 'src/app/page.tsx'))
      ? path.resolve(process.cwd(), 'src/app/page.tsx')
      : path.resolve(process.cwd(), 'apps/web-invitation/src/app/page.tsx');

    const landingContent = fs.readFileSync(landingPath, 'utf8');
    assert.ok(landingContent.includes('fetchPublicTemplateAvailability'), 'Landing page must import and call fetchPublicTemplateAvailability');
    assert.ok(landingContent.includes('filterAvailableTemplates'), 'Landing page must use filterAvailableTemplates');

    const templatesPagePath = fs.existsSync(path.resolve(process.cwd(), 'src/app/templates/page.tsx'))
      ? path.resolve(process.cwd(), 'src/app/templates/page.tsx')
      : path.resolve(process.cwd(), 'apps/web-invitation/src/app/templates/page.tsx');

    const templatesContent = fs.readFileSync(templatesPagePath, 'utf8');
    assert.ok(templatesContent.includes('fetchPublicTemplateAvailability'), 'Templates page must import and call fetchPublicTemplateAvailability');
    assert.ok(templatesContent.includes('filterAvailableTemplates'), 'Templates page must use filterAvailableTemplates');
  });

  await t.test('demo route file exists, checks DB lifecycle, and guards metadata', () => {
    const demoPath = fs.existsSync(path.resolve(process.cwd(), 'src/app/templates/[slug]/demo/page.tsx'))
      ? path.resolve(process.cwd(), 'src/app/templates/[slug]/demo/page.tsx')
      : path.resolve(process.cwd(), 'apps/web-invitation/src/app/templates/[slug]/demo/page.tsx');

    assert.ok(fs.existsSync(demoPath), 'Demo page file must exist');
    const demoContent = fs.readFileSync(demoPath, 'utf8');

    assert.ok(demoContent.includes('fetchPublicTemplateAvailability'), 'Demo page must fetch DB lifecycle availability');
    assert.ok(demoContent.includes("matched.status !== 'AVAILABLE'"), 'Demo page must fail closed if status !== AVAILABLE');
    assert.ok(demoContent.includes('Template Not Found | IRVITE.ID'), 'generateMetadata must return generic not found for unavailable templates');
  });

  // ── Phase 14H Specific Tests: SSR, Freshness & Failure Modes ──

  await t.test('Phase 14H: /templates is an Async Server Component with force-dynamic and no client loading state', () => {
    const templatesPagePath = fs.existsSync(path.resolve(process.cwd(), 'src/app/templates/page.tsx'))
      ? path.resolve(process.cwd(), 'src/app/templates/page.tsx')
      : path.resolve(process.cwd(), 'apps/web-invitation/src/app/templates/page.tsx');

    const content = fs.readFileSync(templatesPagePath, 'utf8');

    assert.ok(!content.includes("'use client'"), '/templates must not be a client component');
    assert.ok(content.includes("export const dynamic = 'force-dynamic'"), '/templates must enforce dynamic request-time evaluation');
    assert.ok(content.includes('async function PublicTemplatesPage'), '/templates must be an Async Server Component');
    assert.ok(!content.includes('Memuat katalog template...'), '/templates must not contain the client loading placeholder');
    assert.ok(content.includes('catalog-empty-state'), '/templates must preserve the empty state element');
  });

  await t.test('Phase 14H: Landing page is an Async Server Component with force-dynamic and no client loading state', () => {
    const landingPath = fs.existsSync(path.resolve(process.cwd(), 'src/app/page.tsx'))
      ? path.resolve(process.cwd(), 'src/app/page.tsx')
      : path.resolve(process.cwd(), 'apps/web-invitation/src/app/page.tsx');

    const content = fs.readFileSync(landingPath, 'utf8');

    assert.ok(!content.includes("'use client'"), 'Landing page must not be marked with use client at root');
    assert.ok(content.includes("export const dynamic = 'force-dynamic'"), 'Landing page must enforce dynamic request-time evaluation');
    assert.ok(content.includes('async function LandingPage'), 'Landing page must be an Async Server Component');
    assert.ok(!content.includes('Memuat katalog template...'), 'Landing page must not contain the client loading placeholder');
  });

  await t.test('Phase 14H: Failure mode verification for filterAvailableTemplates', () => {
    const all = getCatalogTemplates();
    assert.equal(all.length, 4, 'Base approved catalog must have 4 templates');

    // A. all 4 AVAILABLE => 4 templates
    const allAvailable = [
      { themeCode: 'SEKAR_KEDATON', status: 'AVAILABLE' },
      { themeCode: 'AETHERIA', status: 'AVAILABLE' },
      { themeCode: 'OPALINE_NOCTURNE', status: 'AVAILABLE' },
      { themeCode: 'RANAH_CINTA', status: 'AVAILABLE' },
    ];
    const resA = filterAvailableTemplates(all, allAvailable);
    assert.equal(resA.length, 4, 'All 4 AVAILABLE must return 4 cards');

    // B. SEKAR_KEDATON HIDDEN => 3 templates (Sekar Kedaton excluded)
    const sekarHidden = allAvailable.map((a) =>
      a.themeCode === 'SEKAR_KEDATON' ? { ...a, status: 'HIDDEN' } : a
    );
    const resB = filterAvailableTemplates(all, sekarHidden);
    assert.equal(resB.length, 3, 'SEKAR_KEDATON HIDDEN must return 3 cards');
    assert.ok(!resB.some((t) => t.themeCode === 'SEKAR_KEDATON'), 'SEKAR_KEDATON must not be returned when HIDDEN');

    // C. SEKAR_KEDATON ARCHIVED => 3 templates (Sekar Kedaton excluded)
    const sekarArchived = allAvailable.map((a) =>
      a.themeCode === 'SEKAR_KEDATON' ? { ...a, status: 'ARCHIVED' } : a
    );
    const resC = filterAvailableTemplates(all, sekarArchived);
    assert.equal(resC.length, 3, 'SEKAR_KEDATON ARCHIVED must return 3 cards');
    assert.ok(!resC.some((t) => t.themeCode === 'SEKAR_KEDATON'), 'SEKAR_KEDATON must not be returned when ARCHIVED');

    // Partial availability -> only matching AVAILABLE templates
    const partialAvailable = [
      { themeCode: 'SEKAR_KEDATON', status: 'AVAILABLE' },
      { themeCode: 'AETHERIA', status: 'AVAILABLE' },
    ];
    const resPartial = filterAvailableTemplates(all, partialAvailable);
    assert.equal(resPartial.length, 2, 'Partial availability must return exactly 2 templates');
    assert.deepEqual(resPartial.map((t) => t.themeCode), ['SEKAR_KEDATON', 'AETHERIA']);

    // D. availability = null => 0 templates (fail-closed)
    const resD = filterAvailableTemplates(all, null);
    assert.deepEqual(resD, [], 'null availability must return empty array (fail closed)');

    // E. availability = [] => 0 templates
    const resE = filterAvailableTemplates(all, []);
    assert.deepEqual(resE, [], 'empty availability must return empty array');

    // F. malformed response / undefined => fail closed
    const resF = filterAvailableTemplates(all, undefined as any);
    assert.deepEqual(resF, [], 'undefined availability must return empty array');

    // G. unknown themeCode returned => ignored
    const withUnknown = [
      ...allAvailable,
      { themeCode: 'COMPLETELY_UNKNOWN_THEME', status: 'AVAILABLE' },
    ];
    const resG = filterAvailableTemplates(all, withUnknown);
    assert.equal(resG.length, 4, 'Unknown themeCode from API must be safely ignored');
    assert.ok(!resG.some((t) => t.themeCode === 'COMPLETELY_UNKNOWN_THEME'), 'Unknown themeCode must not be added to catalog');

    // H. DB AVAILABLE themeCode absent from approved catalog registry => not automatically rendered
    const fakeCatalog = [
      {
        themeCode: 'SEKAR_KEDATON',
        slug: 'sekar-kedaton',
        displayName: 'Sekar Kedaton',
        category: 'Traditional Javanese',
        shortDescription: 'Desc',
        thumbnailPath: '/thumb.webp',
        demoPath: '/demo',
        sortOrder: 1,
        availability: 'AVAILABLE' as const,
      },
    ];
    const resH = filterAvailableTemplates(fakeCatalog, allAvailable);
    assert.equal(resH.length, 1, 'Only templates in approved registry can be returned');
    assert.equal(resH[0].themeCode, 'SEKAR_KEDATON');
  });

  await t.test('Phase 14H: Component showcase and navbar client boundary existence', () => {
    const showcasePath = fs.existsSync(path.resolve(process.cwd(), 'src/components/public-template-showcase.tsx'))
      ? path.resolve(process.cwd(), 'src/components/public-template-showcase.tsx')
      : path.resolve(process.cwd(), 'apps/web-invitation/src/components/public-template-showcase.tsx');

    assert.ok(fs.existsSync(showcasePath), 'public-template-showcase.tsx component must exist');

    const navbarPath = fs.existsSync(path.resolve(process.cwd(), 'src/components/landing-navbar.tsx'))
      ? path.resolve(process.cwd(), 'src/components/landing-navbar.tsx')
      : path.resolve(process.cwd(), 'apps/web-invitation/src/components/landing-navbar.tsx');

    assert.ok(fs.existsSync(navbarPath), 'landing-navbar.tsx component must exist');
    const navbarContent = fs.readFileSync(navbarPath, 'utf8');
    assert.ok(navbarContent.includes("'use client'"), 'landing-navbar.tsx must be a client component');

    const scrollRevealPath = fs.existsSync(path.resolve(process.cwd(), 'src/components/scroll-reveal.tsx'))
      ? path.resolve(process.cwd(), 'src/components/scroll-reveal.tsx')
      : path.resolve(process.cwd(), 'apps/web-invitation/src/components/scroll-reveal.tsx');

    assert.ok(fs.existsSync(scrollRevealPath), 'scroll-reveal.tsx component must exist');
    const scrollRevealContent = fs.readFileSync(scrollRevealPath, 'utf8');
    assert.ok(scrollRevealContent.includes("'use client'"), 'scroll-reveal.tsx must be a client component');
  });
});
