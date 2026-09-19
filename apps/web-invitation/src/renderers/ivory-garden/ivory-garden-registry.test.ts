import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  resolveProductionThemeKey,
  resolveFoundationThemeKey,
  isTemplateProductionActivated,
} from '../registry-resolver';

describe('Phase #8: Production Activation Guard & Registry Resolution Contract', () => {
  it('IVORY_GARDEN is production-activated in Phase #8', () => {
    assert.strictEqual(isTemplateProductionActivated('IVORY_GARDEN'), true);
    assert.strictEqual(isTemplateProductionActivated('ivory_garden'), true);
  });

  it('Production route resolver resolves IVORY_GARDEN to IVORY_GARDEN renderer', () => {
    assert.strictEqual(resolveProductionThemeKey('IVORY_GARDEN'), 'IVORY_GARDEN');
    assert.strictEqual(resolveProductionThemeKey('ivory_garden'), 'IVORY_GARDEN');
    assert.strictEqual(resolveProductionThemeKey(' Ivory_Garden '), 'IVORY_GARDEN');
  });

  it('unactivated template families remain unactivated and resolve safely to GENERIC', () => {

    assert.strictEqual(isTemplateProductionActivated('FUTURE_TEMPLATE'), false);
    assert.strictEqual(resolveProductionThemeKey('FUTURE_TEMPLATE'), 'GENERIC');
  });

  it('Foundation resolver can resolve IVORY_GARDEN for internal testing/scaffolding', () => {
    assert.strictEqual(resolveFoundationThemeKey('IVORY_GARDEN'), 'IVORY_GARDEN');
    assert.strictEqual(resolveFoundationThemeKey('ivory_garden'), 'IVORY_GARDEN');
  });

  it('preserves existing legacy theme resolution to GENERIC renderer key', () => {
    assert.strictEqual(resolveProductionThemeKey('GENERIC'), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey('VERDANT'), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey('MIDNIGHT'), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey('BOTANICAL'), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey('CLASSIC'), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey('MINIMAL'), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey('ROMANTIC'), 'GENERIC');
  });

  it('falls back safely to GENERIC for unknown, empty, or null theme codes in production', () => {
    assert.strictEqual(resolveProductionThemeKey(null), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey(undefined), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey(''), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey('UNKNOWN_THEME_CODE'), 'GENERIC');
  });

  it('strictly rejects dynamic DB import paths and dangerous strings', () => {
    assert.strictEqual(resolveProductionThemeKey('../malicious/path'), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey('/etc/passwd'), 'GENERIC');
    assert.strictEqual(resolveProductionThemeKey('<script>alert(1)</script>'), 'GENERIC');
  });
});
