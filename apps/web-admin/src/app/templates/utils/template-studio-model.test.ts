import test from 'node:test';
import assert from 'node:assert';
import {
  createPresetConfig,
  getPresetIds,
  isValidHexColor,
  updateThemeColor,
  isAllowedFont,
  updateTypography,
  normalizeSectionOrder,
  toggleSection,
  moveSection,
  reorderSections,
  createEditorSnapshot,
  isEditorDirty,
  buildTemplatePayload,
  buildPreviewMessage,
  validateEditorState,
  PRESET_META,
} from './template-studio-model';

test('Template Studio Pure Model', async (t) => {
  await t.test('1. Presets initialization and validity', () => {
    const presetIds = getPresetIds();
    assert.strictEqual(presetIds.length, 3);
    assert.deepStrictEqual(presetIds, ['classic-elegance', 'modern-minimal', 'romantic-garden']);

    for (const id of presetIds) {
      const config = createPresetConfig(id);
      assert.strictEqual(config.version, 1);
      assert.ok(isValidHexColor(config.theme.primaryColor));
      assert.ok(isValidHexColor(config.theme.secondaryColor));
      assert.ok(isValidHexColor(config.theme.backgroundColor));
      assert.ok(isValidHexColor(config.theme.textColor));
      assert.ok(isAllowedFont(config.typography.headingFont));
      assert.ok(isAllowedFont(config.typography.bodyFont));

      // Invariant: eventDetails must be present and enabled
      const eventDetails = config.sections.find((s) => s.id === 'eventDetails');
      assert.ok(eventDetails, `eventDetails must exist in ${id}`);
      assert.strictEqual(eventDetails.enabled, true, `eventDetails must be enabled in ${id}`);

      // Invariant: 9 unique orders 1..9
      assert.strictEqual(config.sections.length, 9);
      const orders = config.sections.map((s) => s.order).sort((a, b) => a - b);
      assert.deepStrictEqual(orders, [1, 2, 3, 4, 5, 6, 7, 8, 9]);

      // Meta exists
      assert.ok(PRESET_META[id].label);
    }
  });

  await t.test('2. Hex color validation and color update', () => {
    assert.strictEqual(isValidHexColor('#111827'), true);
    assert.strictEqual(isValidHexColor('#ffffff'), true);
    assert.strictEqual(isValidHexColor('#ABCDEF'), true);
    assert.strictEqual(isValidHexColor('#123456'), true);

    assert.strictEqual(isValidHexColor('111827'), false);
    assert.strictEqual(isValidHexColor('#11182'), false);
    assert.strictEqual(isValidHexColor('#1118278'), false);
    assert.strictEqual(isValidHexColor('#GGG123'), false);
    assert.strictEqual(isValidHexColor('red'), false);
    assert.strictEqual(isValidHexColor(''), false);

    const base = createPresetConfig('classic-elegance');
    const updated = updateThemeColor(base, 'primaryColor', '#ff0000');
    assert.strictEqual(updated.theme.primaryColor, '#ff0000');
    assert.strictEqual(updated.theme.secondaryColor, base.theme.secondaryColor);
    assert.strictEqual(updated.theme.backgroundColor, base.theme.backgroundColor);
    assert.strictEqual(updated.theme.textColor, base.theme.textColor);
  });

  await t.test('3. Typography allowlist and update', () => {
    assert.strictEqual(isAllowedFont('INTER'), true);
    assert.strictEqual(isAllowedFont('PLAYFAIR_DISPLAY'), true);
    assert.strictEqual(isAllowedFont('LORA'), true);
    assert.strictEqual(isAllowedFont('MONTSERRAT'), true);
    assert.strictEqual(isAllowedFont('ROBOTO'), false);
    assert.strictEqual(isAllowedFont(''), false);

    const base = createPresetConfig('modern-minimal');
    const updated = updateTypography(base, 'headingFont', 'PLAYFAIR_DISPLAY');
    assert.strictEqual(updated.typography.headingFont, 'PLAYFAIR_DISPLAY');
    assert.strictEqual(updated.typography.bodyFont, 'INTER');
  });

  await t.test('4. Section toggling with locked eventDetails invariant', () => {
    const base = createPresetConfig('classic-elegance');

    // Toggle regular section
    const toggledHero = toggleSection(base, 'hero', false);
    const hero = toggledHero.sections.find((s) => s.id === 'hero');
    assert.strictEqual(hero?.enabled, false);

    // Attempt to disable eventDetails -> must remain enabled
    const toggledDetails = toggleSection(base, 'eventDetails', false);
    const details = toggledDetails.sections.find((s) => s.id === 'eventDetails');
    assert.strictEqual(details?.enabled, true);
  });

  await t.test('5. Section move up, down, reorder, and normalization', () => {
    const base = createPresetConfig('classic-elegance');
    const firstSectionId = base.sections.sort((a, b) => a.order - b.order)[0].id;
    const secondSectionId = base.sections.sort((a, b) => a.order - b.order)[1].id;
    const lastSectionId = base.sections.sort((a, b) => a.order - b.order)[8].id;

    // Moving first item up -> no-op
    const noopUp = moveSection(base, firstSectionId, 'up');
    assert.strictEqual(noopUp.sections.find((s) => s.id === firstSectionId)?.order, 1);

    // Moving last item down -> no-op
    const noopDown = moveSection(base, lastSectionId, 'down');
    assert.strictEqual(noopDown.sections.find((s) => s.id === lastSectionId)?.order, 9);

    // Move first item down
    const movedDown = moveSection(base, firstSectionId, 'down');
    assert.strictEqual(movedDown.sections.find((s) => s.id === firstSectionId)?.order, 2);
    assert.strictEqual(movedDown.sections.find((s) => s.id === secondSectionId)?.order, 1);

    // Reorder drag index 0 to 4
    const reordered = reorderSections(base, 0, 4);
    const normalized = normalizeSectionOrder(reordered.sections);
    const orders = normalized.map((s) => s.order);
    assert.deepStrictEqual(orders, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  await t.test('6. Editor snapshot and dirty state tracking', () => {
    const config = createPresetConfig('classic-elegance');
    const initial = createEditorSnapshot('My Template', config);
    const current = createEditorSnapshot('My Template', config);

    assert.strictEqual(isEditorDirty(initial, current), false);

    // Name change -> dirty
    const nameChanged = createEditorSnapshot('Renamed Template', config);
    assert.strictEqual(isEditorDirty(initial, nameChanged), true);

    // Color change -> dirty
    const colorConfig = updateThemeColor(config, 'primaryColor', '#123456');
    const colorChanged = createEditorSnapshot('My Template', colorConfig);
    assert.strictEqual(isEditorDirty(initial, colorChanged), true);

    // Font change -> dirty
    const fontConfig = updateTypography(config, 'headingFont', 'MONTSERRAT');
    const fontChanged = createEditorSnapshot('My Template', fontConfig);
    assert.strictEqual(isEditorDirty(initial, fontChanged), true);

    // Section toggle -> dirty
    const toggleConfig = toggleSection(config, 'countdown', false);
    const toggleChanged = createEditorSnapshot('My Template', toggleConfig);
    assert.strictEqual(isEditorDirty(initial, toggleChanged), true);

    // Section move -> dirty
    const moveConfig = moveSection(config, 'hero', 'down');
    const moveChanged = createEditorSnapshot('My Template', moveConfig);
    assert.strictEqual(isEditorDirty(initial, moveChanged), true);
  });

  await t.test('7. buildTemplatePayload for create and edit modes', () => {
    const config = createPresetConfig('classic-elegance');
    const snapshot = createEditorSnapshot('Gold Wedding', config);

    // Create mode: includes themeCode = 'GENERIC'
    const createPayload = buildTemplatePayload(snapshot, 'create');
    assert.strictEqual(createPayload.name, 'Gold Wedding');
    assert.strictEqual((createPayload as { themeCode: string }).themeCode, 'GENERIC');
    assert.strictEqual(createPayload.config.version, 1);

    // Edit mode: does NOT mutate themeCode
    const editPayload = buildTemplatePayload(snapshot, 'edit');
    assert.strictEqual(editPayload.name, 'Gold Wedding');
    assert.strictEqual((editPayload as { themeCode?: string }).themeCode, undefined);
    assert.strictEqual(editPayload.config.version, 1);
  });

  await t.test('8. validateEditorState', () => {
    const config = createPresetConfig('classic-elegance');

    // Valid state
    const validSnapshot = createEditorSnapshot('Valid Template', config);
    const validRes = validateEditorState(validSnapshot);
    assert.strictEqual(validRes.valid, true);
    assert.strictEqual(validRes.errors.length, 0);

    // Empty name
    const emptyName = createEditorSnapshot('   ', config);
    const emptyNameRes = validateEditorState(emptyName);
    assert.strictEqual(emptyNameRes.valid, false);
    assert.ok(emptyNameRes.errors.some((e) => e.field === 'name'));

    // Invalid hex color
    const badColorConfig = {
      ...config,
      theme: { ...config.theme, primaryColor: 'invalid-color' },
    };
    const badColorSnapshot = createEditorSnapshot('Test', badColorConfig);
    const badColorRes = validateEditorState(badColorSnapshot);
    assert.strictEqual(badColorRes.valid, false);
    assert.ok(badColorRes.errors.some((e) => e.field === 'theme.primaryColor'));

    // Invalid font
    const badFontConfig = {
      ...config,
      typography: { ...config.typography, headingFont: 'COMIC_SANS' },
    };
    const badFontSnapshot = createEditorSnapshot('Test', badFontConfig);
    const badFontRes = validateEditorState(badFontSnapshot);
    assert.strictEqual(badFontRes.valid, false);
    assert.ok(badFontRes.errors.some((e) => e.field === 'typography.headingFont'));

    // Disabled eventDetails
    const badDetailsConfig = {
      ...config,
      sections: config.sections.map((s) => (s.id === 'eventDetails' ? { ...s, enabled: false } : s)),
    };
    const badDetailsSnapshot = createEditorSnapshot('Test', badDetailsConfig);
    const badDetailsRes = validateEditorState(badDetailsSnapshot);
    assert.strictEqual(badDetailsRes.valid, false);
    assert.ok(badDetailsRes.errors.some((e) => e.field === 'sections'));
  });

  await t.test('9. buildPreviewMessage constructs complete V1 message shape', () => {
    const config = createPresetConfig('romantic-garden');
    const snapshot = createEditorSnapshot('Garden Dream', config);
    const msg = buildPreviewMessage(snapshot);

    assert.strictEqual(msg.type, 'TEMPLATE_PREVIEW_UPDATE');
    assert.strictEqual(msg.version, 1);
    assert.strictEqual(msg.payload.name, 'Garden Dream');
    assert.strictEqual(msg.payload.config.version, 1);
    assert.strictEqual(msg.payload.config.theme.primaryColor, '#881337');
    assert.strictEqual(msg.payload.config.typography.headingFont, 'PLAYFAIR_DISPLAY');
    assert.strictEqual(msg.payload.config.sections.length, 9);

    // Section ordering is normalized 1..9
    const orders = msg.payload.config.sections.map((s) => s.order);
    assert.deepStrictEqual(orders, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
