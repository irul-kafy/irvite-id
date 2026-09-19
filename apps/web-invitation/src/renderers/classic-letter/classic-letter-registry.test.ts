/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
if (typeof require !== 'undefined' && require.extensions) {
  require.extensions['.css'] = (module) => {
    module.exports = {};
  };
}

try {
  const fontStub = () => ({ className: 'mock-font' });
  const googleFonts = require('next/font/google');
  googleFonts.Inter = fontStub;
  googleFonts.Playfair_Display = fontStub;
  googleFonts.Lora = fontStub;
  googleFonts.Montserrat = fontStub;
} catch {
  // Gracefully ignored
}

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import {
  TEMPLATE_PRODUCTION_ACTIVATION,
  isTemplateProductionActivated,
  resolveProductionThemeKey,
  resolveFoundationThemeKey,
} from '../registry-resolver';

let foundationRenderers: Record<string, any>;
let getRenderer: (themeCode: string | null | undefined) => any;
let GenericTheme: any;

describe('Phase #12C: Classic Letter Registry & Production Activation Contract', () => {
  before(async () => {
    const regMod = await import('../registry');
    const genericMod = await import('../themes/generic');
    foundationRenderers = regMod.foundationRenderers;
    getRenderer = regMod.getRenderer;
    GenericTheme = genericMod.default;
  });

  it('CLASSIC_LETTER is production-activated in Phase #12C', () => {
    assert.strictEqual(TEMPLATE_PRODUCTION_ACTIVATION.CLASSIC_LETTER, true);
    assert.strictEqual(isTemplateProductionActivated('CLASSIC_LETTER'), true);
    assert.strictEqual(isTemplateProductionActivated('classic_letter'), true);
  });

  it('Existing production activation states remain true and undisturbed', () => {
    assert.strictEqual(TEMPLATE_PRODUCTION_ACTIVATION.IVORY_GARDEN, true);
    assert.strictEqual(TEMPLATE_PRODUCTION_ACTIVATION.SERENE_GARDEN, true);
    assert.strictEqual(TEMPLATE_PRODUCTION_ACTIVATION.SUNDA_PUSPA, true);
    assert.strictEqual(isTemplateProductionActivated('IVORY_GARDEN'), true);
    assert.strictEqual(isTemplateProductionActivated('SERENE_GARDEN'), true);
    assert.strictEqual(isTemplateProductionActivated('SUNDA_PUSPA'), true);
  });

  it('resolveProductionThemeKey returns CLASSIC_LETTER for activated CLASSIC_LETTER', () => {
    assert.strictEqual(resolveProductionThemeKey('CLASSIC_LETTER'), 'CLASSIC_LETTER');
    assert.strictEqual(resolveProductionThemeKey(' classic_letter '), 'CLASSIC_LETTER');
  });

  it('production getRenderer resolves CLASSIC_LETTER to dedicated ClassicLetterRenderer in Phase #12C', () => {
    const renderer = getRenderer('CLASSIC_LETTER');
    assert.strictEqual(renderer, foundationRenderers.CLASSIC_LETTER);
    assert.notStrictEqual(renderer, GenericTheme);
  });

  it('unknown theme still resolves safely to GenericTheme', () => {
    const renderer = getRenderer('UNKNOWN_THEME');
    assert.strictEqual(renderer, GenericTheme);
  });

  it('resolveFoundationThemeKey maps CLASSIC_LETTER for foundation/testing', () => {
    assert.strictEqual(resolveFoundationThemeKey('CLASSIC_LETTER'), 'CLASSIC_LETTER');
    assert.strictEqual(resolveFoundationThemeKey('classic_letter'), 'CLASSIC_LETTER');
  });

  it('foundationRenderers registers ClassicLetterRenderer for CLASSIC_LETTER', () => {
    const classicRenderer = foundationRenderers.CLASSIC_LETTER;
    assert.ok(classicRenderer);
    assert.notStrictEqual(classicRenderer, GenericTheme);
  });
});
