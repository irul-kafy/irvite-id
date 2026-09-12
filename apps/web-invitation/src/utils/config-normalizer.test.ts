/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert';
import { normalizeConfig } from './config-normalizer';

test('normalizeConfig', async (t) => {
  await t.test('should return default v1 config for null', () => {
    const config = normalizeConfig(null);
    assert.strictEqual(config.version, 1);
    assert.strictEqual(config.theme.backgroundColor, '#f9fafb');
    assert.strictEqual(config.sections.length, 9);
    assert.strictEqual(config.sections[0].id, 'hero');
  });

  await t.test('should patch legacy color to backgroundColor', () => {
    const config = normalizeConfig({ color: '#ff0000' });
    assert.strictEqual(config.version, 1);
    assert.strictEqual(config.theme.backgroundColor, '#ff0000');
  });

  await t.test('should handle malformed persisted config defensively', () => {
    const config = normalizeConfig({
      version: 1,
      theme: { primaryColor: 'invalid-color' }, // Should fallback
      typography: { headingFont: 'UNKNOWN' }, // Should fallback
      sections: [
        { id: 'hero', enabled: true, order: 10 },
        { id: 'hero', enabled: false, order: 20 }, // duplicate
        { id: 'unknown-section', enabled: true, order: 5 }, // invalid
      ],
    });

    assert.strictEqual(config.theme.primaryColor, '#111827'); // Default fallback
    assert.strictEqual(config.typography.headingFont, 'INTER'); // Default fallback
    assert.strictEqual(config.sections.length, 9); // All 9 sections present

    const heroes = config.sections.filter((s: any) => s.id === 'hero');
    assert.strictEqual(heroes.length, 1); // Duplicate stripped

    const eventDetails = config.sections.find((s: any) => s.id === 'eventDetails');
    assert.ok(eventDetails);
    assert.strictEqual(eventDetails?.enabled, true); // Enforced
  });
});
