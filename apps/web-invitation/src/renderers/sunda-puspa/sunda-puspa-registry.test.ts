/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
// Register CSS and next/font/google stubs before any component import so Node.js test runner doesn't throw
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

describe('Phase #10C: Sunda Puspa Production Activation & Registry Resolution Contract', () => {
  before(async () => {
    const regMod = await import('../registry');
    const genericMod = await import('../themes/generic');
    foundationRenderers = regMod.foundationRenderers;
    getRenderer = regMod.getRenderer;
    GenericTheme = genericMod.default;
  });

  it('SUNDA_PUSPA is strictly production-activated in Phase #10C', () => {
    assert.strictEqual(TEMPLATE_PRODUCTION_ACTIVATION.SUNDA_PUSPA, true);
    assert.strictEqual(isTemplateProductionActivated('SUNDA_PUSPA'), true);
    assert.strictEqual(isTemplateProductionActivated('sunda_puspa'), true);
    assert.strictEqual(isTemplateProductionActivated(' Sunda_Puspa '), true);
  });

  it('resolveProductionThemeKey resolves SUNDA_PUSPA to SUNDA_PUSPA in Phase #10C', () => {
    assert.strictEqual(resolveProductionThemeKey('SUNDA_PUSPA'), 'SUNDA_PUSPA');
    assert.strictEqual(resolveProductionThemeKey('sunda_puspa'), 'SUNDA_PUSPA');
    assert.strictEqual(resolveProductionThemeKey(' Sunda_Puspa '), 'SUNDA_PUSPA');
  });

  it('production getRenderer resolves SUNDA_PUSPA to SundaPuspaRenderer (not GenericTheme)', () => {
    const renderer = getRenderer('SUNDA_PUSPA');
    assert.notStrictEqual(renderer, GenericTheme);
    assert.strictEqual(renderer, foundationRenderers.SUNDA_PUSPA);
  });

  it('resolveFoundationThemeKey maps SUNDA_PUSPA to SUNDA_PUSPA for internal foundation/testing', () => {
    assert.strictEqual(resolveFoundationThemeKey('SUNDA_PUSPA'), 'SUNDA_PUSPA');
    assert.strictEqual(resolveFoundationThemeKey('sunda_puspa'), 'SUNDA_PUSPA');
  });

  it('foundationRenderers registers SundaPuspaRenderer for SUNDA_PUSPA', () => {
    const sundaRenderer = foundationRenderers.SUNDA_PUSPA;
    assert.ok(sundaRenderer);
    assert.notStrictEqual(sundaRenderer, GenericTheme);
  });

  it('SERENE_GARDEN regression: remains active and resolves to SERENE_GARDEN', () => {
    assert.strictEqual(isTemplateProductionActivated('SERENE_GARDEN'), true);
    assert.strictEqual(resolveProductionThemeKey('SERENE_GARDEN'), 'SERENE_GARDEN');
    assert.strictEqual(resolveFoundationThemeKey('SERENE_GARDEN'), 'SERENE_GARDEN');
    const sereneRenderer = getRenderer('SERENE_GARDEN');
    assert.notStrictEqual(sereneRenderer, GenericTheme);
    assert.strictEqual(sereneRenderer, foundationRenderers.SERENE_GARDEN);
  });

  it('IVORY_GARDEN regression: remains active and resolves to IVORY_GARDEN', () => {
    assert.strictEqual(isTemplateProductionActivated('IVORY_GARDEN'), true);
    assert.strictEqual(resolveProductionThemeKey('IVORY_GARDEN'), 'IVORY_GARDEN');
    assert.strictEqual(resolveFoundationThemeKey('IVORY_GARDEN'), 'IVORY_GARDEN');
    const ivoryRenderer = getRenderer('IVORY_GARDEN');
    assert.notStrictEqual(ivoryRenderer, GenericTheme);
    assert.strictEqual(ivoryRenderer, foundationRenderers.IVORY_GARDEN);
  });

  it('falls back safely to GENERIC for unknown, empty, or null theme codes in production', () => {
    assert.strictEqual(resolveProductionThemeKey(null), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey(undefined), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey(''), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey('UNKNOWN_THEME_CODE'), 'GENERIC');
  });
});
