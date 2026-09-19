import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIXED_CATALOG_TEMPLATES,
  getCatalogTemplates,
  getCatalogTemplateById,
  getCatalogTemplateBySlug,
  getCatalogTemplateByThemeCode,
  filterCatalogTemplates,
  joinCatalogWithDbTemplates,
  DbTemplateRecord,
} from './catalog-registry';

test('Admin Fixed Catalog Registry Contract', async (t) => {
  await t.test('contains exactly the 4 approved production templates', () => {
    assert.equal(FIXED_CATALOG_TEMPLATES.length, 4);
    const themeCodes = FIXED_CATALOG_TEMPLATES.map((tpl) => tpl.themeCode);
    assert.deepEqual(themeCodes, ['IVORY_GARDEN', 'SERENE_GARDEN', 'SUNDA_PUSPA', 'CLASSIC_LETTER']);
  });

  await t.test('has unique slugs and unique themeCodes', () => {
    const slugs = FIXED_CATALOG_TEMPLATES.map((tpl) => tpl.slug);
    const themeCodes = FIXED_CATALOG_TEMPLATES.map((tpl) => tpl.themeCode);

    assert.equal(new Set(slugs).size, slugs.length, 'Slugs must be unique');
    assert.equal(new Set(themeCodes).size, themeCodes.length, 'ThemeCodes must be unique');
  });

  await t.test('has deterministic sortOrder', () => {
    const templates = getCatalogTemplates();
    assert.equal(templates.length, 4);
    assert.equal(templates[0].sortOrder, 1);
    assert.equal(templates[1].sortOrder, 2);
    assert.equal(templates[2].sortOrder, 3);
    assert.equal(templates[0].themeCode, 'IVORY_GARDEN');
    assert.equal(templates[1].themeCode, 'SERENE_GARDEN');
    assert.equal(templates[2].themeCode, 'SUNDA_PUSPA');
    assert.equal(templates[3].sortOrder, 4);
    assert.equal(templates[3].themeCode, 'CLASSIC_LETTER');
  });

  await t.test('all APPROVED entries have valid thumbnailPath and demoPath', () => {
    for (const tpl of FIXED_CATALOG_TEMPLATES) {
      assert.equal(tpl.availability, 'AVAILABLE');
      assert.ok(tpl.thumbnailPath.startsWith('/templates/'), 'Thumbnail path must start with /templates/');
      assert.ok(tpl.thumbnailPath.endsWith('.webp'), 'Thumbnail path must end with .webp');
      assert.ok(tpl.demoPath.startsWith('/templates/'), 'Demo path must start with /templates/');
      assert.ok(tpl.demoPath.endsWith('/demo'), 'Demo path must end with /demo');
      assert.ok(tpl.displayName.length > 0, 'displayName must not be empty');
      assert.ok(tpl.category.length > 0, 'category must not be empty');
      assert.ok(tpl.shortDescription.length > 0, 'shortDescription must not be empty');
    }
  });

  await t.test('maps slugs and themeCodes correctly with case-insensitivity', () => {
    assert.equal(getCatalogTemplateBySlug('ivory-garden')?.themeCode, 'IVORY_GARDEN');
    assert.equal(getCatalogTemplateBySlug('SERENE-GARDEN')?.themeCode, 'SERENE_GARDEN');
    assert.equal(getCatalogTemplateBySlug('  sunda-puspa  ')?.themeCode, 'SUNDA_PUSPA');
    assert.equal(getCatalogTemplateBySlug('classic-letter')?.themeCode, 'CLASSIC_LETTER');

    assert.equal(getCatalogTemplateByThemeCode('IVORY_GARDEN')?.slug, 'ivory-garden');
    assert.equal(getCatalogTemplateByThemeCode('serene_garden')?.slug, 'serene-garden');
    assert.equal(getCatalogTemplateByThemeCode('  SUNDA_PUSPA  ')?.slug, 'sunda-puspa');
    assert.equal(getCatalogTemplateByThemeCode('CLASSIC_LETTER')?.slug, 'classic-letter');

    assert.equal(getCatalogTemplateById('ivory-garden')?.themeCode, 'IVORY_GARDEN');
    assert.equal(getCatalogTemplateById('SERENE_GARDEN')?.slug, 'serene-garden');
    assert.equal(getCatalogTemplateById('classic-letter')?.themeCode, 'CLASSIC_LETTER');
    assert.equal(getCatalogTemplateById('unknown'), undefined);
  });

  await t.test('filters catalog templates by category and search query', () => {
    const all = filterCatalogTemplates('All');
    assert.equal(all.length, 4);

    const floral = filterCatalogTemplates('Floral & Botanical');
    assert.equal(floral.length, 1);
    assert.equal(floral[0].themeCode, 'IVORY_GARDEN');

    const searchSunda = filterCatalogTemplates('All', 'sunda');
    assert.equal(searchSunda.length, 1);
    assert.equal(searchSunda[0].themeCode, 'SUNDA_PUSPA');

    const classic = filterCatalogTemplates('Classic');
    assert.equal(classic.length, 2);
    assert.equal(classic[0].themeCode, 'IVORY_GARDEN');
    assert.equal(classic[1].themeCode, 'CLASSIC_LETTER');

    const searchClassic = filterCatalogTemplates('All', 'classic letter');
    assert.equal(searchClassic.length, 1);
    assert.equal(searchClassic[0].themeCode, 'CLASSIC_LETTER');
  });
});

test('Admin DB Join Behavior Contract', async (t) => {
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
    // CLASSIC_LETTER is omitted to test MISSING state
  ];

  await t.test('0 matching rows: readiness = MISSING, canUse = false, no fabricated id', () => {
    const joined = joinCatalogWithDbTemplates(FIXED_CATALOG_TEMPLATES, mockDbTemplates);
    const classicJoined = joined.find((j) => j.catalogItem.themeCode === 'CLASSIC_LETTER');

    assert.ok(classicJoined, 'Classic Letter joined item must exist');
    assert.equal(classicJoined.readiness, 'MISSING');
    assert.equal(classicJoined.matchCount, 0);
    assert.equal(classicJoined.matchedDbTemplate, null);
    assert.equal(classicJoined.canUse, false, 'Use Template must be disabled when 0 rows match');
    assert.ok(classicJoined.statusMessage.includes('belum tersinkronisasi'));
  });

  await t.test('1 matching row: readiness = SYNCED, canUse = true, receives exact DB id', () => {
    const joined = joinCatalogWithDbTemplates(FIXED_CATALOG_TEMPLATES, mockDbTemplates);
    const ivoryJoined = joined.find((j) => j.catalogItem.themeCode === 'IVORY_GARDEN');

    assert.ok(ivoryJoined, 'Ivory Garden joined item must exist');
    assert.equal(ivoryJoined.readiness, 'SYNCED');
    assert.equal(ivoryJoined.matchCount, 1);
    assert.ok(ivoryJoined.matchedDbTemplate);
    assert.equal(ivoryJoined.matchedDbTemplate?.id, 'db-uuid-ivory');
    assert.equal(ivoryJoined.canUse, true, 'Use Template must be enabled for single valid match');
    assert.equal(ivoryJoined.previewImageUrl, '/templates/ivory-garden/thumbnail.webp');
  });

  await t.test('>1 matching rows: readiness = DUPLICATE, canUse = false, FAIL CLOSED', () => {
    const duplicateDbTemplates: DbTemplateRecord[] = [
      {
        id: 'dup-1',
        name: 'Ivory Garden 1',
        themeCode: 'IVORY_GARDEN',
      },
      {
        id: 'dup-2',
        name: 'Ivory Garden 2',
        themeCode: 'IVORY_GARDEN',
      },
    ];

    const joined = joinCatalogWithDbTemplates(FIXED_CATALOG_TEMPLATES, duplicateDbTemplates);
    const ivoryJoined = joined.find((j) => j.catalogItem.themeCode === 'IVORY_GARDEN');

    assert.ok(ivoryJoined, 'Ivory Garden joined item must exist');
    assert.equal(ivoryJoined.readiness, 'DUPLICATE');
    assert.equal(ivoryJoined.matchCount, 2);
    assert.equal(ivoryJoined.matchedDbTemplate, null, 'Must NOT silently select first duplicate');
    assert.equal(ivoryJoined.canUse, false, 'Use Template must be disabled on duplicate');
    assert.ok(ivoryJoined.statusMessage.includes('Duplikasi'));
  });
});
