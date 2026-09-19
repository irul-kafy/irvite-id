import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getCatalogTemplates } from '../../catalog';

test('Public Catalog UI & Landing Integration Contract', async (t) => {
  const templates = getCatalogTemplates().filter((t) => t.availability === 'AVAILABLE');

  await t.test('public catalog contains exactly the 3 AVAILABLE approved templates', () => {
    assert.equal(templates.length, 3);
    const names = templates.map((t) => t.displayName);
    assert.deepEqual(names, ['Ivory Garden', 'Serene Garden', 'Sunda Puspa']);

    const themeCodes = templates.map((t) => t.themeCode);
    assert.deepEqual(themeCodes, ['IVORY_GARDEN', 'SERENE_GARDEN', 'SUNDA_PUSPA']);
  });

  await t.test('Ivory, Serene, and Sunda are all visible with required metadata', () => {
    const ivory = templates.find((t) => t.themeCode === 'IVORY_GARDEN');
    const serene = templates.find((t) => t.themeCode === 'SERENE_GARDEN');
    const sunda = templates.find((t) => t.themeCode === 'SUNDA_PUSPA');

    assert.ok(ivory, 'Ivory Garden must be present');
    assert.ok(serene, 'Serene Garden must be present');
    assert.ok(sunda, 'Sunda Puspa must be present');

    assert.equal(ivory?.thumbnailPath, '/templates/ivory-garden/thumbnail.webp');
    assert.equal(ivory?.demoPath, '/templates/ivory-garden/demo');

    assert.equal(serene?.thumbnailPath, '/templates/serene-garden/thumbnail.webp');
    assert.equal(serene?.demoPath, '/templates/serene-garden/demo');

    assert.equal(sunda?.thumbnailPath, '/templates/sunda-puspa/thumbnail.webp');
    assert.equal(sunda?.demoPath, '/templates/sunda-puspa/demo');
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
});
