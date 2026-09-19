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

describe('Phase #13C: Velvet Letter Registry & Production Activation Contract', () => {
  before(async () => {
    const regMod = await import('../registry');
    const genericMod = await import('../themes/generic');
    foundationRenderers = regMod.foundationRenderers;
    getRenderer = regMod.getRenderer;
    GenericTheme = genericMod.default;
  });

  it('VELVET_LETTER is registered as foundation renderer', () => {
    const velvetRenderer = foundationRenderers.VELVET_LETTER;
    assert.ok(velvetRenderer);
    assert.notStrictEqual(velvetRenderer, GenericTheme);
  });

  it('VELVET_LETTER is production-activated in Phase #13C', () => {
    assert.strictEqual(TEMPLATE_PRODUCTION_ACTIVATION.VELVET_LETTER, true);
    assert.strictEqual(isTemplateProductionActivated('VELVET_LETTER'), true);
    assert.strictEqual(isTemplateProductionActivated('velvet_letter'), true);
  });

  it('Existing 4 templates remain production-activated (TRUE)', () => {
    assert.strictEqual(TEMPLATE_PRODUCTION_ACTIVATION.IVORY_GARDEN, true);
    assert.strictEqual(TEMPLATE_PRODUCTION_ACTIVATION.SERENE_GARDEN, true);
    assert.strictEqual(TEMPLATE_PRODUCTION_ACTIVATION.SUNDA_PUSPA, true);
    assert.strictEqual(TEMPLATE_PRODUCTION_ACTIVATION.CLASSIC_LETTER, true);
    assert.strictEqual(isTemplateProductionActivated('IVORY_GARDEN'), true);
    assert.strictEqual(isTemplateProductionActivated('SERENE_GARDEN'), true);
    assert.strictEqual(isTemplateProductionActivated('SUNDA_PUSPA'), true);
    assert.strictEqual(isTemplateProductionActivated('CLASSIC_LETTER'), true);
  });

  it('resolveProductionThemeKey returns VELVET_LETTER for activated VELVET_LETTER', () => {
    assert.strictEqual(resolveProductionThemeKey('VELVET_LETTER'), 'VELVET_LETTER');
    assert.strictEqual(resolveProductionThemeKey(' velvet_letter '), 'VELVET_LETTER');
  });

  it('production getRenderer resolves VELVET_LETTER to dedicated VelvetLetterRenderer in Phase #13C', () => {
    const renderer = getRenderer('VELVET_LETTER');
    assert.strictEqual(renderer, foundationRenderers.VELVET_LETTER);
  });

  it('resolveFoundationThemeKey maps VELVET_LETTER for foundation/testing', () => {
    assert.strictEqual(resolveFoundationThemeKey('VELVET_LETTER'), 'VELVET_LETTER');
    assert.strictEqual(resolveFoundationThemeKey('velvet_letter'), 'VELVET_LETTER');
  });

  it('unknown theme codes fall back safely to GENERIC', () => {
    assert.strictEqual(resolveProductionThemeKey('UNKNOWN_THEME'), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey(''), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey(null), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey(undefined), 'GENERIC');
    assert.strictEqual(getRenderer('UNKNOWN_THEME'), GenericTheme);
  });
});
