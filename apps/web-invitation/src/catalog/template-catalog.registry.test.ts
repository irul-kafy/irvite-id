import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  APPROVED_CATALOG_TEMPLATES,
  getCatalogTemplates,
  getCatalogTemplateBySlug,
  getCatalogTemplateByThemeCode,
  isAvailableTemplate,
  filterAvailableTemplates,
} from './template-catalog.registry';

test('Template Catalog Registry', async (t) => {
  await t.test('contains exactly the 4 approved codex templates', () => {
    assert.equal(APPROVED_CATALOG_TEMPLATES.length, 4);
    const themeCodes = APPROVED_CATALOG_TEMPLATES.map((tpl) => tpl.themeCode);
    assert.deepEqual(themeCodes, [
      'SEKAR_KEDATON',
      'AETHERIA',
      'OPALINE_NOCTURNE',
      'RANAH_CINTA',
    ]);
  });

  await t.test('has unique slugs and unique themeCodes', () => {
    const slugs = APPROVED_CATALOG_TEMPLATES.map((tpl) => tpl.slug);
    const themeCodes = APPROVED_CATALOG_TEMPLATES.map((tpl) => tpl.themeCode);

    assert.equal(new Set(slugs).size, slugs.length, 'Slugs must be unique');
    assert.equal(new Set(themeCodes).size, themeCodes.length, 'ThemeCodes must be unique');
  });

  await t.test('has deterministic sortOrder', () => {
    const templates = getCatalogTemplates();
    assert.equal(templates.length, 4);
    for (let i = 0; i < 4; i++) {
      assert.equal(templates[i].sortOrder, i + 1);
    }
    assert.equal(templates[0].themeCode, 'SEKAR_KEDATON');
    assert.equal(templates[1].themeCode, 'AETHERIA');
    assert.equal(templates[2].themeCode, 'OPALINE_NOCTURNE');
    assert.equal(templates[3].themeCode, 'RANAH_CINTA');
  });

  await t.test('all AVAILABLE entries have valid thumbnailPath and demoPath', () => {
    const publicDir = fs.existsSync(path.resolve(process.cwd(), 'public'))
      ? path.resolve(process.cwd(), 'public')
      : path.resolve(process.cwd(), 'apps/web-invitation/public');

    for (const tpl of APPROVED_CATALOG_TEMPLATES) {
      assert.equal(tpl.availability, 'AVAILABLE');
      assert.ok(tpl.thumbnailPath.startsWith('/templates/'), 'Thumbnail path must start with /templates/');
      assert.ok(tpl.demoPath.startsWith('/templates/'), 'Demo path must start with /templates/');
      assert.ok(tpl.demoPath.endsWith('/demo'), 'Demo path must end with /demo');
      assert.ok(tpl.displayName.length > 0, 'displayName must not be empty');
      assert.ok(tpl.category.length > 0, 'category must not be empty');
      assert.ok(tpl.shortDescription.length > 0, 'shortDescription must not be empty');

      // Assert physical file exists on disk
      const filePath = path.join(publicDir, tpl.thumbnailPath.replace(/^\//, ''));
      assert.ok(
        fs.existsSync(filePath),
        `Physical thumbnail file must exist at ${filePath}`
      );
    }
  });

  await t.test('maps slugs to expected themeCodes correctly', () => {
    assert.equal(getCatalogTemplateBySlug('sekar-kedaton')?.themeCode, 'SEKAR_KEDATON');
    assert.equal(getCatalogTemplateBySlug('aetheria')?.themeCode, 'AETHERIA');
    assert.equal(getCatalogTemplateBySlug('opaline-nocturne')?.themeCode, 'OPALINE_NOCTURNE');
    assert.equal(getCatalogTemplateBySlug('ranah-cinta')?.themeCode, 'RANAH_CINTA');
  });

  await t.test('supports case-insensitive slug and themeCode lookup', () => {
    assert.equal(getCatalogTemplateBySlug('SEKAR-KEDATON')?.themeCode, 'SEKAR_KEDATON');
    assert.equal(getCatalogTemplateBySlug('AETHERIA')?.themeCode, 'AETHERIA');
    assert.equal(getCatalogTemplateBySlug('OPALINE-NOCTURNE')?.themeCode, 'OPALINE_NOCTURNE');
    assert.equal(getCatalogTemplateBySlug('RANAH-CINTA')?.themeCode, 'RANAH_CINTA');
    assert.equal(getCatalogTemplateByThemeCode('sekar_kedaton')?.slug, 'sekar-kedaton');
    assert.equal(getCatalogTemplateByThemeCode('AETHERIA')?.slug, 'aetheria');
  });

  await t.test('returns undefined and false for unknown slugs (fail closed)', () => {
    assert.equal(getCatalogTemplateBySlug('serene-garden'), undefined);
    assert.equal(getCatalogTemplateBySlug('velvet-letter'), undefined);
    assert.equal(getCatalogTemplateBySlug('unknown-theme'), undefined);
    assert.equal(getCatalogTemplateBySlug(''), undefined);
    assert.equal(getCatalogTemplateByThemeCode('GENERIC'), undefined);
    assert.equal(isAvailableTemplate('unknown-theme'), false);
    assert.equal(isAvailableTemplate(null), false);
  });

  await t.test('filterAvailableTemplates filters by DB lifecycle status', () => {
    const templates = getCatalogTemplates();

    // 1. All 4 AVAILABLE in DB
    const allAvailable = templates.map((t) => ({ themeCode: t.themeCode, status: 'AVAILABLE' }));
    const res1 = filterAvailableTemplates(templates, allAvailable);
    assert.equal(res1.length, 4);

    // 2. AETHERIA is HIDDEN
    const withHidden = allAvailable.map((t) =>
      t.themeCode === 'AETHERIA' ? { ...t, status: 'HIDDEN' } : t
    );
    const res2 = filterAvailableTemplates(templates, withHidden);
    assert.equal(res2.length, 3);
    assert.ok(!res2.some((t) => t.themeCode === 'AETHERIA'), 'HIDDEN template must not be in public catalog');

    // 3. Missing / null / empty availability fails closed (returns [])
    assert.deepEqual(filterAvailableTemplates(templates, null), []);
    assert.deepEqual(filterAvailableTemplates(templates, undefined), []);
    assert.deepEqual(filterAvailableTemplates(templates, []), []);
  });
});
