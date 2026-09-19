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
} from './template-catalog.registry';

test('Template Catalog Registry', async (t) => {
  await t.test('contains exactly the 5 approved production templates', () => {
    assert.equal(APPROVED_CATALOG_TEMPLATES.length, 5);
    const themeCodes = APPROVED_CATALOG_TEMPLATES.map((tpl) => tpl.themeCode);
    assert.deepEqual(themeCodes, [
      'IVORY_GARDEN',
      'SERENE_GARDEN',
      'SUNDA_PUSPA',
      'CLASSIC_LETTER',
      'VELVET_LETTER',
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
    assert.equal(templates.length, 5);
    assert.equal(templates[0].sortOrder, 1);
    assert.equal(templates[1].sortOrder, 2);
    assert.equal(templates[2].sortOrder, 3);
    assert.equal(templates[3].sortOrder, 4);
    assert.equal(templates[4].sortOrder, 5);
    assert.equal(templates[0].themeCode, 'IVORY_GARDEN');
    assert.equal(templates[1].themeCode, 'SERENE_GARDEN');
    assert.equal(templates[2].themeCode, 'SUNDA_PUSPA');
    assert.equal(templates[3].themeCode, 'CLASSIC_LETTER');
    assert.equal(templates[4].themeCode, 'VELVET_LETTER');
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
    assert.equal(getCatalogTemplateBySlug('ivory-garden')?.themeCode, 'IVORY_GARDEN');
    assert.equal(getCatalogTemplateBySlug('serene-garden')?.themeCode, 'SERENE_GARDEN');
    assert.equal(getCatalogTemplateBySlug('sunda-puspa')?.themeCode, 'SUNDA_PUSPA');
    assert.equal(getCatalogTemplateBySlug('classic-letter')?.themeCode, 'CLASSIC_LETTER');
    assert.equal(getCatalogTemplateBySlug('velvet-letter')?.themeCode, 'VELVET_LETTER');
  });

  await t.test('supports case-insensitive slug and themeCode lookup', () => {
    assert.equal(getCatalogTemplateBySlug('IVORY-GARDEN')?.themeCode, 'IVORY_GARDEN');
    assert.equal(getCatalogTemplateBySlug('  sunda-puspa  ')?.themeCode, 'SUNDA_PUSPA');
    assert.equal(getCatalogTemplateBySlug('VELVET-LETTER')?.themeCode, 'VELVET_LETTER');
    assert.equal(getCatalogTemplateByThemeCode('ivory_garden')?.slug, 'ivory-garden');
    assert.equal(getCatalogTemplateByThemeCode('SERENE_GARDEN')?.slug, 'serene-garden');
    assert.equal(getCatalogTemplateByThemeCode('SUNDA_PUSPA')?.slug, 'sunda-puspa');
    assert.equal(getCatalogTemplateByThemeCode('CLASSIC_LETTER')?.slug, 'classic-letter');
    assert.equal(getCatalogTemplateByThemeCode('VELVET_LETTER')?.slug, 'velvet-letter');
  });

  await t.test('Classic Letter thumbnail exists and is distinct from other template thumbnails', () => {
    const publicDir = fs.existsSync(path.resolve(process.cwd(), 'public'))
      ? path.resolve(process.cwd(), 'public')
      : path.resolve(process.cwd(), 'apps/web-invitation/public');

    const classicPath = path.join(publicDir, 'templates/classic-letter/thumbnail.webp');
    const ivoryPath = path.join(publicDir, 'templates/ivory-garden/thumbnail.webp');
    const serenePath = path.join(publicDir, 'templates/serene-garden/thumbnail.webp');
    const sundaPath = path.join(publicDir, 'templates/sunda-puspa/thumbnail.webp');

    assert.ok(fs.existsSync(classicPath), 'Classic thumbnail must exist on disk');
    const classicBuf = fs.readFileSync(classicPath);
    const ivoryBuf = fs.readFileSync(ivoryPath);
    const sereneBuf = fs.readFileSync(serenePath);
    const sundaBuf = fs.readFileSync(sundaPath);

    assert.ok(classicBuf.length > 1000, 'Classic thumbnail size must be non-trivial');
    assert.notEqual(classicBuf.compare(ivoryBuf), 0, 'Classic thumbnail must not be byte-identical to Ivory');
    assert.notEqual(classicBuf.compare(sereneBuf), 0, 'Classic thumbnail must not be byte-identical to Serene');
    assert.notEqual(classicBuf.compare(sundaBuf), 0, 'Classic thumbnail must not be byte-identical to Sunda');
  });

  await t.test('Velvet Letter thumbnail exists and is distinct from other template thumbnails', () => {
    const publicDir = fs.existsSync(path.resolve(process.cwd(), 'public'))
      ? path.resolve(process.cwd(), 'public')
      : path.resolve(process.cwd(), 'apps/web-invitation/public');

    const velvetPath = path.join(publicDir, 'templates/velvet-letter/thumbnail.webp');
    const ivoryPath = path.join(publicDir, 'templates/ivory-garden/thumbnail.webp');
    const serenePath = path.join(publicDir, 'templates/serene-garden/thumbnail.webp');
    const sundaPath = path.join(publicDir, 'templates/sunda-puspa/thumbnail.webp');
    const classicPath = path.join(publicDir, 'templates/classic-letter/thumbnail.webp');

    assert.ok(fs.existsSync(velvetPath), 'Velvet thumbnail must exist on disk');
    const velvetBuf = fs.readFileSync(velvetPath);
    const ivoryBuf = fs.readFileSync(ivoryPath);
    const sereneBuf = fs.readFileSync(serenePath);
    const sundaBuf = fs.readFileSync(sundaPath);
    const classicBuf = fs.readFileSync(classicPath);

    assert.ok(velvetBuf.length > 1000, 'Velvet thumbnail size must be non-trivial');
    assert.notEqual(velvetBuf.compare(ivoryBuf), 0, 'Velvet thumbnail must not be byte-identical to Ivory');
    assert.notEqual(velvetBuf.compare(sereneBuf), 0, 'Velvet thumbnail must not be byte-identical to Serene');
    assert.notEqual(velvetBuf.compare(sundaBuf), 0, 'Velvet thumbnail must not be byte-identical to Sunda');
    assert.notEqual(velvetBuf.compare(classicBuf), 0, 'Velvet thumbnail must not be byte-identical to Classic');
  });

  await t.test('returns undefined and false for unknown slugs (fail closed)', () => {
    assert.equal(getCatalogTemplateBySlug('unknown-theme'), undefined);
    assert.equal(getCatalogTemplateBySlug(''), undefined);
    assert.equal(getCatalogTemplateByThemeCode('GENERIC'), undefined);
    assert.equal(isAvailableTemplate('unknown-theme'), false);
    assert.equal(isAvailableTemplate(null), false);
  });
});
