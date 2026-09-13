/**
 * Preview protocol tests — Phase 7B-3
 *
 * Covers:
 * - valid preview message accepted
 * - wrong origin rejected
 * - wrong message type ignored
 * - unsupported protocol version ignored
 * - malformed payload rejected
 * - invalid Config V1 rejected
 * - exact targetOrigin check
 * - preview update serialization
 * - section order parity
 * - section visibility parity
 * - font mapping parity
 * - theme color parity
 *
 * Uses node:test — same infrastructure as web-admin model tests.
 */

import test from 'node:test';
import assert from 'node:assert';
import { parsePreviewMessage, isTrustedOrigin, PREVIEW_MESSAGE_TYPE, PREVIEW_PROTOCOL_VERSION } from './preview-protocol';

// ── Helpers ──────────────────────────────────────────────────────────────────

function validConfig() {
  return {
    version: 1,
    theme: {
      primaryColor: '#1c1917',
      secondaryColor: '#78716c',
      backgroundColor: '#fafaf9',
      textColor: '#292524',
    },
    typography: {
      headingFont: 'PLAYFAIR_DISPLAY',
      bodyFont: 'LORA',
    },
    sections: [
      { id: 'hero', enabled: true, order: 1, variant: 'default' },
      { id: 'eventDetails', enabled: true, order: 2, variant: 'default' },
    ],
  };
}

function validMessage(overrides?: Record<string, unknown>) {
  return {
    type: PREVIEW_MESSAGE_TYPE,
    version: PREVIEW_PROTOCOL_VERSION,
    payload: {
      name: 'Classic Elegance',
      config: validConfig(),
    },
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('Preview Protocol', async (t) => {

  await t.test('1. Valid message is accepted and returns PreviewMessage', () => {
    const result = parsePreviewMessage(validMessage());
    assert.ok(result !== null, 'Valid message should be parsed');
    assert.strictEqual(result!.type, 'TEMPLATE_PREVIEW_UPDATE');
    assert.strictEqual(result!.version, 1);
    assert.strictEqual(result!.payload.name, 'Classic Elegance');
    assert.strictEqual(result!.payload.themeCode, 'GENERIC');
    assert.strictEqual(result!.payload.config.version, 1);
  });

  await t.test('1b. Renderer selector is preserved and non-string values are rejected', () => {
    const ivory = {
      ...validMessage(),
      payload: { ...validMessage().payload, themeCode: 'IVORY_GARDEN' },
    };
    assert.strictEqual(parsePreviewMessage(ivory)?.payload.themeCode, 'IVORY_GARDEN');

    const invalid = {
      ...validMessage(),
      payload: { ...validMessage().payload, themeCode: ['IVORY_GARDEN'] },
    };
    assert.strictEqual(parsePreviewMessage(invalid), null);
  });

  await t.test('2. null input returns null', () => {
    assert.strictEqual(parsePreviewMessage(null), null);
  });

  await t.test('3. Non-object input returns null', () => {
    assert.strictEqual(parsePreviewMessage('string'), null);
    assert.strictEqual(parsePreviewMessage(42), null);
    assert.strictEqual(parsePreviewMessage(undefined), null);
    assert.strictEqual(parsePreviewMessage([]), null);
  });

  await t.test('4. Wrong message type is rejected', () => {
    assert.strictEqual(parsePreviewMessage(validMessage({ type: 'SOME_OTHER_TYPE' })), null);
    assert.strictEqual(parsePreviewMessage(validMessage({ type: '' })), null);
    assert.strictEqual(parsePreviewMessage(validMessage({ type: null })), null);
    assert.strictEqual(parsePreviewMessage(validMessage({ type: undefined })), null);
  });

  await t.test('5. Unsupported protocol version is rejected', () => {
    assert.strictEqual(parsePreviewMessage(validMessage({ version: 0 })), null);
    assert.strictEqual(parsePreviewMessage(validMessage({ version: 2 })), null);
    assert.strictEqual(parsePreviewMessage(validMessage({ version: '1' })), null);
    assert.strictEqual(parsePreviewMessage(validMessage({ version: null })), null);
  });

  await t.test('6. Missing payload is rejected', () => {
    assert.strictEqual(parsePreviewMessage(validMessage({ payload: null })), null);
    assert.strictEqual(parsePreviewMessage(validMessage({ payload: undefined })), null);
    assert.strictEqual(parsePreviewMessage(validMessage({ payload: 'bad' })), null);
  });

  await t.test('7. Payload with missing name is rejected', () => {
    const msg = { ...validMessage(), payload: { config: validConfig() } };
    assert.strictEqual(parsePreviewMessage(msg), null);
  });

  await t.test('8. Payload with non-string name is rejected', () => {
    const msg = {
      ...validMessage(),
      payload: { name: 123, config: validConfig() },
    };
    assert.strictEqual(parsePreviewMessage(msg), null);
  });

  await t.test('9. Invalid Config V1 — missing config — rejected', () => {
    const msg = { ...validMessage(), payload: { name: 'X', config: null } };
    assert.strictEqual(parsePreviewMessage(msg), null);
  });

  await t.test('10. Invalid Config V1 — wrong version — rejected', () => {
    const bad = { ...validConfig(), version: 2 };
    const msg = { ...validMessage(), payload: { name: 'X', config: bad } };
    assert.strictEqual(parsePreviewMessage(msg), null);
  });

  await t.test('11. Invalid Config V1 — missing theme — rejected', () => {
    const bad = { ...validConfig(), theme: undefined };
    const msg = { ...validMessage(), payload: { name: 'X', config: bad } };
    assert.strictEqual(parsePreviewMessage(msg), null);
  });

  await t.test('12. Invalid Config V1 — theme with non-string color field — rejected', () => {
    const bad = { ...validConfig(), theme: { primaryColor: 123, secondaryColor: '#aaa', backgroundColor: '#bbb', textColor: '#ccc' } };
    const msg = { ...validMessage(), payload: { name: 'X', config: bad } };
    assert.strictEqual(parsePreviewMessage(msg), null);
  });

  await t.test('13. Invalid Config V1 — missing typography — rejected', () => {
    const bad = { ...validConfig(), typography: null };
    const msg = { ...validMessage(), payload: { name: 'X', config: bad } };
    assert.strictEqual(parsePreviewMessage(msg), null);
  });

  await t.test('14. Invalid Config V1 — typography with non-string font — rejected', () => {
    const bad = { ...validConfig(), typography: { headingFont: null, bodyFont: 'INTER' } };
    const msg = { ...validMessage(), payload: { name: 'X', config: bad } };
    assert.strictEqual(parsePreviewMessage(msg), null);
  });

  await t.test('15. Invalid Config V1 — sections not an array — rejected', () => {
    const bad = { ...validConfig(), sections: 'not-array' };
    const msg = { ...validMessage(), payload: { name: 'X', config: bad } };
    assert.strictEqual(parsePreviewMessage(msg), null);
  });

  // ── Origin validation ────────────────────────────────────────────────────────

  await t.test('16. isTrustedOrigin — exact match passes', () => {
    assert.strictEqual(isTrustedOrigin('http://localhost:3001', 'http://localhost:3001'), true);
  });

  await t.test('17. isTrustedOrigin — different origin rejected', () => {
    assert.strictEqual(isTrustedOrigin('http://localhost:3002', 'http://localhost:3001'), false);
    assert.strictEqual(isTrustedOrigin('https://evil.com', 'http://localhost:3001'), false);
    assert.strictEqual(isTrustedOrigin('', 'http://localhost:3001'), false);
  });

  await t.test('18. isTrustedOrigin — wildcard-style or prefix match rejected', () => {
    assert.strictEqual(isTrustedOrigin('http://localhost:30010', 'http://localhost:3001'), false);
    assert.strictEqual(isTrustedOrigin('http://localhost:3001.evil.com', 'http://localhost:3001'), false);
  });

  await t.test('19. isTrustedOrigin — empty trusted origin always rejects', () => {
    assert.strictEqual(isTrustedOrigin('http://localhost:3001', ''), false);
    assert.strictEqual(isTrustedOrigin('http://anything.com', ''), false);
  });

  await t.test('20. isTrustedOrigin — case-sensitive (http vs https)', () => {
    assert.strictEqual(isTrustedOrigin('https://localhost:3001', 'http://localhost:3001'), false);
  });

  // ── Preview update serialization parity ──────────────────────────────────────

  await t.test('21. Preview update preserves config fields through serialization', () => {
    const original = validConfig();
    const msg = validMessage();
    const parsed = parsePreviewMessage(JSON.parse(JSON.stringify(msg)));
    assert.ok(parsed !== null);
    assert.deepStrictEqual(parsed!.payload.config.theme, original.theme);
    assert.deepStrictEqual(parsed!.payload.config.typography, original.typography);
    assert.deepStrictEqual(parsed!.payload.config.sections, original.sections);
  });

  // ── Section order parity ─────────────────────────────────────────────────────

  await t.test('22. Section order is preserved through parsing', () => {
    const cfg = {
      ...validConfig(),
      sections: [
        { id: 'rsvp', enabled: true, order: 1, variant: 'default' },
        { id: 'hero', enabled: true, order: 2, variant: 'default' },
        { id: 'eventDetails', enabled: true, order: 3, variant: 'default' },
      ],
    };
    const msg = { ...validMessage(), payload: { name: 'Test', config: cfg } };
    const parsed = parsePreviewMessage(msg);
    assert.ok(parsed !== null);
    const sections = parsed!.payload.config.sections;
    assert.strictEqual(sections[0].id, 'rsvp');
    assert.strictEqual(sections[0].order, 1);
    assert.strictEqual(sections[1].id, 'hero');
    assert.strictEqual(sections[1].order, 2);
  });

  // ── Section visibility parity ────────────────────────────────────────────────

  await t.test('23. Section enabled/disabled state is preserved through parsing', () => {
    const cfg = {
      ...validConfig(),
      sections: [
        { id: 'hero', enabled: false, order: 1, variant: 'default' },
        { id: 'eventDetails', enabled: true, order: 2, variant: 'default' },
        { id: 'gallery', enabled: false, order: 3, variant: 'default' },
      ],
    };
    const msg = { ...validMessage(), payload: { name: 'Test', config: cfg } };
    const parsed = parsePreviewMessage(msg);
    assert.ok(parsed !== null);
    const hero = parsed!.payload.config.sections.find((s) => s.id === 'hero');
    const eventDetails = parsed!.payload.config.sections.find((s) => s.id === 'eventDetails');
    assert.strictEqual(hero?.enabled, false);
    assert.strictEqual(eventDetails?.enabled, true);
  });

  // ── Font mapping parity ──────────────────────────────────────────────────────

  await t.test('24. Font keys are preserved through parsing', () => {
    const cfg = {
      ...validConfig(),
      typography: { headingFont: 'MONTSERRAT', bodyFont: 'INTER' },
    };
    const msg = { ...validMessage(), payload: { name: 'Test', config: cfg } };
    const parsed = parsePreviewMessage(msg);
    assert.ok(parsed !== null);
    assert.strictEqual(parsed!.payload.config.typography.headingFont, 'MONTSERRAT');
    assert.strictEqual(parsed!.payload.config.typography.bodyFont, 'INTER');
  });

  // ── Theme color parity ───────────────────────────────────────────────────────

  await t.test('25. Theme colors are preserved through parsing', () => {
    const cfg = {
      ...validConfig(),
      theme: {
        primaryColor: '#881337',
        secondaryColor: '#9f1239',
        backgroundColor: '#fff1f2',
        textColor: '#4c0519',
      },
    };
    const msg = { ...validMessage(), payload: { name: 'Test', config: cfg } };
    const parsed = parsePreviewMessage(msg);
    assert.ok(parsed !== null);
    assert.strictEqual(parsed!.payload.config.theme.primaryColor, '#881337');
    assert.strictEqual(parsed!.payload.config.theme.secondaryColor, '#9f1239');
    assert.strictEqual(parsed!.payload.config.theme.backgroundColor, '#fff1f2');
    assert.strictEqual(parsed!.payload.config.theme.textColor, '#4c0519');
  });

  // ── Exact targetOrigin test (logic parity) ───────────────────────────────────

  await t.test('26. Only exact trusted origin strings pass, not supersets or subsets', () => {
    const trusted = 'http://localhost:3001';

    // Exact — passes
    assert.strictEqual(isTrustedOrigin(trusted, trusted), true);

    // Superset — rejected (attacker adds suffix)
    assert.strictEqual(isTrustedOrigin('http://localhost:3001.attacker.com', trusted), false);

    // Substring — rejected (attacker uses port truncation)
    assert.strictEqual(isTrustedOrigin('http://localhost:300', trusted), false);

    // Protocol mismatch — rejected
    assert.strictEqual(isTrustedOrigin('https://localhost:3001', trusted), false);

    // Wrong port — rejected
    assert.strictEqual(isTrustedOrigin('http://localhost:3002', trusted), false);

    // localhost vs 127.0.0.1 — rejected (not same string)
    assert.strictEqual(isTrustedOrigin('http://127.0.0.1:3001', trusted), false);
  });
});
