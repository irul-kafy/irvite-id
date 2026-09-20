import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getCatalogTemplates } from '../../catalog';

test('Public Catalog UI & Landing Integration Contract', async (t) => {
  const templates = getCatalogTemplates().filter((t) => t.availability === 'AVAILABLE');

  await t.test('public catalog contains exactly the 5 AVAILABLE approved templates', () => {
    assert.equal(templates.length, 5);
    const names = templates.map((t) => t.displayName);
    assert.deepEqual(names, [
      'Ivory Garden',
      'Serene Garden',
      'Sunda Puspa',
      'Classic Letter',
      'Velvet Letter',
    ]);

    const themeCodes = templates.map((t) => t.themeCode);
    assert.deepEqual(themeCodes, [
      'IVORY_GARDEN',
      'SERENE_GARDEN',
      'SUNDA_PUSPA',
      'CLASSIC_LETTER',
      'VELVET_LETTER',
    ]);
  });

  await t.test('Ivory, Serene, Sunda, Classic, and Velvet are all visible with required metadata', () => {
    const ivory = templates.find((t) => t.themeCode === 'IVORY_GARDEN');
    const serene = templates.find((t) => t.themeCode === 'SERENE_GARDEN');
    const sunda = templates.find((t) => t.themeCode === 'SUNDA_PUSPA');
    const classic = templates.find((t) => t.themeCode === 'CLASSIC_LETTER');
    const velvet = templates.find((t) => t.themeCode === 'VELVET_LETTER');

    assert.ok(ivory, 'Ivory Garden must be present');
    assert.ok(serene, 'Serene Garden must be present');
    assert.ok(sunda, 'Sunda Puspa must be present');
    assert.ok(classic, 'Classic Letter must be present');
    assert.ok(velvet, 'Velvet Letter must be present');

    assert.equal(ivory?.thumbnailPath, '/templates/ivory-garden/thumbnail.webp');
    assert.equal(ivory?.demoPath, '/templates/ivory-garden/demo');

    assert.equal(serene?.thumbnailPath, '/templates/serene-garden/thumbnail.webp');
    assert.equal(serene?.demoPath, '/templates/serene-garden/demo');

    assert.equal(sunda?.thumbnailPath, '/templates/sunda-puspa/thumbnail.webp');
    assert.equal(sunda?.demoPath, '/templates/sunda-puspa/demo');

    assert.equal(classic?.thumbnailPath, '/templates/classic-letter/thumbnail.webp');
    assert.equal(classic?.demoPath, '/templates/classic-letter/demo');

    assert.equal(velvet?.thumbnailPath, '/templates/velvet-letter/thumbnail.webp');
    assert.equal(velvet?.demoPath, '/templates/velvet-letter/demo');
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
      assert.equal(found, false, `Legacy placeholder "${legacy}" must not be visible in active catalog`);
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
});
