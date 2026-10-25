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
  BUILT_IN_THEME_CODES,
  isBuiltInCatalogTemplate,
} from './catalog-registry';

test('Admin Fixed Catalog Registry Contract', async (t) => {
  await t.test('contains exactly the 4 approved codex templates', () => {
    assert.equal(FIXED_CATALOG_TEMPLATES.length, 4);
    const themeCodes = FIXED_CATALOG_TEMPLATES.map((tpl) => tpl.themeCode);
    assert.deepEqual(themeCodes, [
      'SEKAR_KEDATON',
      'AETHERIA',
      'OPALINE_NOCTURNE',
      'RANAH_CINTA',
    ]);
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
    for (let i = 0; i < 4; i++) {
      assert.equal(templates[i].sortOrder, i + 1);
    }
    assert.equal(templates[0].themeCode, 'SEKAR_KEDATON');
    assert.equal(templates[1].themeCode, 'AETHERIA');
    assert.equal(templates[2].themeCode, 'OPALINE_NOCTURNE');
    assert.equal(templates[3].themeCode, 'RANAH_CINTA');
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
    assert.equal(getCatalogTemplateBySlug('  sekar-kedaton  ')?.themeCode, 'SEKAR_KEDATON');
    assert.equal(getCatalogTemplateBySlug('aetheria')?.themeCode, 'AETHERIA');
    assert.equal(getCatalogTemplateBySlug('opaline-nocturne')?.themeCode, 'OPALINE_NOCTURNE');
    assert.equal(getCatalogTemplateBySlug('ranah-cinta')?.themeCode, 'RANAH_CINTA');

    assert.equal(getCatalogTemplateByThemeCode('sekar_kedaton')?.slug, 'sekar-kedaton');
    assert.equal(getCatalogTemplateByThemeCode('AETHERIA')?.slug, 'aetheria');
    assert.equal(getCatalogTemplateByThemeCode('OPALINE_NOCTURNE')?.slug, 'opaline-nocturne');

    assert.equal(getCatalogTemplateById('SEKAR_KEDATON')?.slug, 'sekar-kedaton');
    assert.equal(getCatalogTemplateById('ranah-cinta')?.themeCode, 'RANAH_CINTA');
    assert.equal(getCatalogTemplateById('unknown'), undefined);
  });

  await t.test('filters catalog templates by category and search query', () => {
    const all = filterCatalogTemplates('All', '');
    assert.equal(all.length, 4);

    const javanese = filterCatalogTemplates('Traditional Javanese', '');
    assert.equal(javanese.length, 1);
    assert.equal(javanese[0].themeCode, 'SEKAR_KEDATON');

    const searchSekar = filterCatalogTemplates('All', 'sekar');
    assert.equal(searchSekar.length, 1);
    assert.equal(searchSekar[0].themeCode, 'SEKAR_KEDATON');

    const searchAetheria = filterCatalogTemplates('All', 'aetheria');
    assert.equal(searchAetheria.length, 1);
    assert.equal(searchAetheria[0].themeCode, 'AETHERIA');
  });

  await t.test('isBuiltInCatalogTemplate correctly identifies built-in templates', () => {
    assert.equal(BUILT_IN_THEME_CODES.size, 4);
    assert.equal(isBuiltInCatalogTemplate('SEKAR_KEDATON'), true);
    assert.equal(isBuiltInCatalogTemplate('sekar_kedaton'), true);
    assert.equal(isBuiltInCatalogTemplate('AETHERIA'), true);
    assert.equal(isBuiltInCatalogTemplate('OPALINE_NOCTURNE'), true);
    assert.equal(isBuiltInCatalogTemplate('RANAH_CINTA'), true);

    assert.equal(isBuiltInCatalogTemplate('SERENE_GARDEN'), false);
    assert.equal(isBuiltInCatalogTemplate('VELVET_LETTER'), false);
    assert.equal(isBuiltInCatalogTemplate('CHINESE_TRADITIONAL_LUXURY'), false);
    assert.equal(isBuiltInCatalogTemplate('JARDIN_DE_VELOURS'), false);
    assert.equal(isBuiltInCatalogTemplate('SYMPHONY_OF_US'), false);
    assert.equal(isBuiltInCatalogTemplate('IVORY_GARDEN'), false);
    assert.equal(isBuiltInCatalogTemplate('CUSTOM_THEME'), false);
    assert.equal(isBuiltInCatalogTemplate(''), false);
    assert.equal(isBuiltInCatalogTemplate(null), false);
    assert.equal(isBuiltInCatalogTemplate(undefined), false);
  });
});

test('Admin DB Join Behavior Contract', async (t) => {
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
    // OPALINE_NOCTURNE is omitted to test MISSING state
  ];

  await t.test('0 matching rows: readiness = MISSING, canUse = false, no fabricated id', () => {
    const joined = joinCatalogWithDbTemplates(FIXED_CATALOG_TEMPLATES, mockDbTemplates);
    const opalineJoined = joined.find((j) => j.catalogItem.themeCode === 'OPALINE_NOCTURNE');

    assert.ok(opalineJoined, 'Opaline Nocturne joined item must exist');
    assert.equal(opalineJoined.readiness, 'MISSING');
    assert.equal(opalineJoined.matchCount, 0);
    assert.equal(opalineJoined.matchedDbTemplate, null);
    assert.equal(opalineJoined.canUse, false, 'Use Template must be disabled when 0 rows match');
    assert.ok(opalineJoined.statusMessage.includes('belum tersinkronisasi'));
  });

  await t.test('1 matching row: readiness = SYNCED, canUse = true, receives exact DB id', () => {
    const withOpaline = [
      ...mockDbTemplates,
      {
        id: 'db-uuid-opaline',
        name: 'Opaline Nocturne',
        themeCode: 'OPALINE_NOCTURNE',
        previewImageUrl: '/templates/opaline-nocturne/thumbnail.webp',
      },
    ];
    const joined = joinCatalogWithDbTemplates(FIXED_CATALOG_TEMPLATES, withOpaline);
    const opalineJoined = joined.find((j) => j.catalogItem.themeCode === 'OPALINE_NOCTURNE');

    assert.ok(opalineJoined, 'Opaline Nocturne joined item must exist');
    assert.equal(opalineJoined.readiness, 'SYNCED');
    assert.equal(opalineJoined.matchCount, 1);
    assert.ok(opalineJoined.matchedDbTemplate);
    assert.equal(opalineJoined.matchedDbTemplate?.id, 'db-uuid-opaline');
    assert.equal(opalineJoined.canUse, true, 'Use Template must be enabled for single valid match');
    assert.equal(opalineJoined.previewImageUrl, '/templates/opaline-nocturne/thumbnail.webp');
  });

  await t.test('>1 matching rows: readiness = DUPLICATE, canUse = false, FAIL CLOSED', () => {
    const duplicateDbTemplates: DbTemplateRecord[] = [
      {
        id: 'db-uuid-1',
        name: 'Sekar Kedaton 1',
        themeCode: 'SEKAR_KEDATON',
        previewImageUrl: '/templates/sekar-kedaton/thumbnail.webp',
      },
      {
        id: 'db-uuid-2',
        name: 'Sekar Kedaton 2',
        themeCode: 'SEKAR_KEDATON',
        previewImageUrl: '/templates/sekar-kedaton/thumbnail.webp',
      },
    ];
    const joined = joinCatalogWithDbTemplates(FIXED_CATALOG_TEMPLATES, duplicateDbTemplates);
    const sekarJoined = joined.find((j) => j.catalogItem.themeCode === 'SEKAR_KEDATON');

    assert.ok(sekarJoined);
    assert.equal(sekarJoined.readiness, 'DUPLICATE');
    assert.equal(sekarJoined.matchCount, 2);
    assert.equal(sekarJoined.matchedDbTemplate, null);
    assert.equal(sekarJoined.canUse, false, 'Use Template must be disabled on duplicate themeCodes');
    assert.ok(sekarJoined.statusMessage.includes('Duplikasi identitas terdeteksi'));
  });
});
