import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIXED_CATALOG_TEMPLATES,
  CATALOG_CATEGORIES,
  getCatalogTemplateById,
  filterCatalogTemplates,
} from './catalog-registry';
import { ALLOWED_FONTS, SECTION_IDS, isValidHexColor } from './template-studio-model';

test('Fixed Catalog Registry', async (t) => {
  await t.test('1. Catalog categories are defined and include essential tags', () => {
    assert.ok(CATALOG_CATEGORIES.includes('All'));
    assert.ok(CATALOG_CATEGORIES.includes('Elegant'));
    assert.ok(CATALOG_CATEGORIES.includes('Minimalist'));
    assert.ok(CATALOG_CATEGORIES.includes('Floral'));
    assert.ok(CATALOG_CATEGORIES.includes('Non-Foto'));
    assert.ok(CATALOG_CATEGORIES.includes('Painting'));
    assert.ok(CATALOG_CATEGORIES.includes('Classic'));
  });

  await t.test('2. All catalog templates adhere strictly to Config V1 invariants', () => {
    assert.ok(FIXED_CATALOG_TEMPLATES.length >= 3, 'Must contain at least 3 curated templates');

    for (const tpl of FIXED_CATALOG_TEMPLATES) {
      assert.ok(tpl.id, 'Template must have an id');
      assert.ok(tpl.name, 'Template must have a name');
      assert.ok(tpl.themeCode, 'Template must have a themeCode');
      assert.ok(tpl.description, 'Template must have a description');
      assert.ok(Array.isArray(tpl.tags) && tpl.tags.length > 0, 'Template must have tags');

      // Version
      assert.equal(tpl.config.version, 1, `Template ${tpl.id} must be Config V1`);

      // Colors
      const { theme } = tpl.config;
      assert.ok(isValidHexColor(theme.primaryColor), `Invalid primaryColor for ${tpl.id}`);
      assert.ok(isValidHexColor(theme.secondaryColor), `Invalid secondaryColor for ${tpl.id}`);
      assert.ok(isValidHexColor(theme.backgroundColor), `Invalid backgroundColor for ${tpl.id}`);
      assert.ok(isValidHexColor(theme.textColor), `Invalid textColor for ${tpl.id}`);

      // Typography
      const { typography } = tpl.config;
      assert.ok(
        ALLOWED_FONTS.includes(typography.headingFont as (typeof ALLOWED_FONTS)[number]),
        `Invalid headingFont for ${tpl.id}: ${typography.headingFont}`
      );
      assert.ok(
        ALLOWED_FONTS.includes(typography.bodyFont as (typeof ALLOWED_FONTS)[number]),
        `Invalid bodyFont for ${tpl.id}: ${typography.bodyFont}`
      );

      // Sections
      const { sections } = tpl.config;
      assert.equal(sections.length, 9, `Template ${tpl.id} must define all 9 sections`);
      const eventDetailsSec = sections.find((s) => s.id === 'eventDetails');
      assert.ok(eventDetailsSec, 'Must have eventDetails section');
      assert.equal(eventDetailsSec.enabled, true, 'eventDetails must be enabled');

      // Order must be 1..9 with unique ids
      const ids = sections.map((s) => s.id);
      for (const expectedId of SECTION_IDS) {
        assert.ok(ids.includes(expectedId), `Missing section id ${expectedId} in ${tpl.id}`);
      }
    }
  });

  await t.test('3. Key target templates are present', () => {
    const ivoryGarden = getCatalogTemplateById('ivory-garden');
    assert.ok(ivoryGarden, 'Ivory Garden must exist');
    assert.equal(ivoryGarden.themeCode, 'IVORY_GARDEN');
    assert.equal(ivoryGarden.category, 'Painting');
    assert.equal(ivoryGarden.previewImageUrl, '/templates/ivory-garden/garden.png');
    assert.deepEqual(ivoryGarden.tags, ['Floral', 'Elegant', 'Classic', 'Non-Foto']);
    assert.deepEqual(ivoryGarden.config.theme, {
      primaryColor: '#4A5741',
      secondaryColor: '#A38A59',
      backgroundColor: '#F8F4EB',
      textColor: '#343B30',
    });
    assert.equal(ivoryGarden.config.typography.headingFont, 'PLAYFAIR_DISPLAY');
    assert.equal(ivoryGarden.config.typography.bodyFont, 'LORA');
    assert.equal(
      ivoryGarden.config.sections.find((section) => section.id === 'guestQr')?.enabled,
      false,
    );

    const verdant = getCatalogTemplateById('verdant-estate');
    assert.ok(verdant, 'Verdant Estate must exist');
    assert.equal(verdant.themeCode, 'VERDANT');
    assert.equal(verdant.category, 'Elegant');

    const midnight = getCatalogTemplateById('midnight-editorial');
    assert.ok(midnight, 'Midnight Editorial must exist');
    assert.equal(midnight.themeCode, 'MIDNIGHT');
    assert.equal(midnight.category, 'Minimalist');

    const botanical = getCatalogTemplateById('botanical-illustration');
    assert.ok(botanical, 'Botanical Illustration must exist');
    assert.equal(botanical.themeCode, 'BOTANICAL');
    assert.equal(botanical.category, 'Painting');
    assert.equal(botanical.isPhotoOptional, true);
  });

  await t.test('4. filterCatalogTemplates filtering by category and search query', () => {
    // All
    const all = filterCatalogTemplates('All');
    assert.equal(all.length, FIXED_CATALOG_TEMPLATES.length);

    // Minimalist
    const minimalist = filterCatalogTemplates('Minimalist');
    assert.ok(minimalist.some((t) => t.id === 'midnight-editorial'));

    // Floral
    const floral = filterCatalogTemplates('Floral');
    assert.ok(floral.some((t) => t.id === 'verdant-estate' || t.id === 'romantic-garden'));

    // Non-Foto
    const nonFoto = filterCatalogTemplates('Non-Foto');
    assert.ok(nonFoto.some((t) => t.id === 'botanical-illustration'));

    // Search query
    const searchResult = filterCatalogTemplates('All', 'emerald');
    assert.equal(searchResult.length, 1);
    assert.equal(searchResult[0].id, 'verdant-estate');
  });
});
