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
  isTemplateProductionActivated,
  resolveProductionThemeKey,
  resolveFoundationThemeKey,
} from '../registry-resolver';

let foundationRenderers: Record<string, any>;
let getRenderer: (themeCode: string | null | undefined) => any;
let GenericTheme: any;

describe('Phase #9: Serene Garden Production Activation & Registry Resolution Contract', () => {
  before(async () => {
    const regMod = await import('../registry');
    const genericMod = await import('../themes/generic');
    foundationRenderers = regMod.foundationRenderers;
    getRenderer = regMod.getRenderer;
    GenericTheme = genericMod.default;
  });

  it('SERENE_GARDEN is production-activated in Phase #9', () => {
    assert.strictEqual(isTemplateProductionActivated('SERENE_GARDEN'), true);
    assert.strictEqual(isTemplateProductionActivated('serene_garden'), true);
    assert.strictEqual(isTemplateProductionActivated(' Serene_Garden '), true);
  });

  it('resolveProductionThemeKey resolves SERENE_GARDEN to SERENE_GARDEN renderer key', () => {
    assert.strictEqual(resolveProductionThemeKey('SERENE_GARDEN'), 'SERENE_GARDEN');
    assert.strictEqual(resolveProductionThemeKey('serene_garden'), 'SERENE_GARDEN');
    assert.strictEqual(resolveProductionThemeKey(' Serene_Garden '), 'SERENE_GARDEN');
  });

  it('production getRenderer resolves SERENE_GARDEN to SereneGardenRenderer (not GenericTheme)', () => {
    const renderer = getRenderer('SERENE_GARDEN');
    assert.ok(renderer);
    assert.notStrictEqual(renderer, GenericTheme);
    assert.strictEqual(renderer, foundationRenderers.SERENE_GARDEN);
  });

  it('IVORY_GARDEN regression: remains active and resolves to IVORY_GARDEN', () => {
    assert.strictEqual(isTemplateProductionActivated('IVORY_GARDEN'), true);
    assert.strictEqual(resolveProductionThemeKey('IVORY_GARDEN'), 'IVORY_GARDEN');
    assert.strictEqual(resolveFoundationThemeKey('IVORY_GARDEN'), 'IVORY_GARDEN');
    const ivoryRenderer = getRenderer('IVORY_GARDEN');
    assert.notStrictEqual(ivoryRenderer, GenericTheme);
  });

  it('unactivated future templates remain unactivated and resolve safely to GENERIC', () => {
    assert.strictEqual(isTemplateProductionActivated('CLASSIC_LETTER'), false);
    assert.strictEqual(isTemplateProductionActivated('VELVET_LETTER'), false);

    assert.strictEqual(resolveProductionThemeKey('CLASSIC_LETTER'), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey('VELVET_LETTER'), 'GENERIC');
  });

  it('falls back safely to GENERIC for unknown, empty, or null theme codes in production', () => {
    assert.strictEqual(resolveProductionThemeKey(null), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey(undefined), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey(''), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey('UNKNOWN_THEME_CODE'), 'GENERIC');
  });

  it('resolveFoundationThemeKey resolves SERENE_GARDEN and IVORY_GARDEN for internal foundation usage', () => {
    assert.strictEqual(resolveFoundationThemeKey('SERENE_GARDEN'), 'SERENE_GARDEN');
    assert.strictEqual(resolveFoundationThemeKey('IVORY_GARDEN'), 'IVORY_GARDEN');
    assert.strictEqual(resolveFoundationThemeKey('UNKNOWN'), 'GENERIC');
  });
});
