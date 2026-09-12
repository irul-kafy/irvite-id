import test from 'node:test';
import assert from 'node:assert';
import { parseQRData } from './qr-parser';

test('strict QR parser tests', async (t) => {
  const TRUSTED_ORIGIN = 'https://invitations.example.com';

  await t.test('accepts valid 22-char raw code', () => {
    const code = 'abcDEF123_-abcDEF123_-';
    assert.strictEqual(parseQRData(code, TRUSTED_ORIGIN), code);
  });

  await t.test('accepts valid 22-char raw code with whitespace', () => {
    const code = '  abcDEF123_-abcDEF123_-  \n';
    assert.strictEqual(parseQRData(code, TRUSTED_ORIGIN), 'abcDEF123_-abcDEF123_-');
  });

  await t.test('rejects too short raw code', () => {
    const code = 'abcDEF123_-abcDEF123_'; // 21 chars
    assert.strictEqual(parseQRData(code, TRUSTED_ORIGIN), null);
  });

  await t.test('rejects too long raw code', () => {
    const code = 'abcDEF123_-abcDEF123_-A'; // 23 chars
    assert.strictEqual(parseQRData(code, TRUSTED_ORIGIN), null);
  });

  await t.test('rejects invalid characters in raw code', () => {
    const code = 'abcDEF123_!abcDEF123_-';
    assert.strictEqual(parseQRData(code, TRUSTED_ORIGIN), null);
  });

  await t.test('accepts valid canonical URL', () => {
    const url = 'https://invitations.example.com/i/abcDEF123_-abcDEF123_-';
    assert.strictEqual(parseQRData(url, TRUSTED_ORIGIN), 'abcDEF123_-abcDEF123_-');
  });

  await t.test('rejects foreign origin ending in valid code', () => {
    const url = 'https://malicious.example.com/i/abcDEF123_-abcDEF123_-';
    assert.strictEqual(parseQRData(url, TRUSTED_ORIGIN), null);
  });

  await t.test('rejects wrong pathname', () => {
    const url = 'https://invitations.example.com/invitation/abcDEF123_-abcDEF123_-';
    assert.strictEqual(parseQRData(url, TRUSTED_ORIGIN), null);
  });

  await t.test('rejects extra path segment', () => {
    const url = 'https://invitations.example.com/i/abcDEF123_-abcDEF123_-/extra';
    assert.strictEqual(parseQRData(url, TRUSTED_ORIGIN), null);
  });

  await t.test('rejects query parameter', () => {
    const url = 'https://invitations.example.com/i/abcDEF123_-abcDEF123_-?foo=bar';
    assert.strictEqual(parseQRData(url, TRUSTED_ORIGIN), null);
  });

  await t.test('rejects hash', () => {
    const url = 'https://invitations.example.com/i/abcDEF123_-abcDEF123_-#section';
    assert.strictEqual(parseQRData(url, TRUSTED_ORIGIN), null);
  });

  await t.test('rejects credentials', () => {
    const url = 'https://user:pass@invitations.example.com/i/abcDEF123_-abcDEF123_-';
    assert.strictEqual(parseQRData(url, TRUSTED_ORIGIN), null);
  });

  await t.test('rejects malformed URL', () => {
    const url = 'not-a-url'; // Trims to 9 chars, less than 22, so falls to URL parser which throws
    assert.strictEqual(parseQRData(url, TRUSTED_ORIGIN), null);
  });
});
