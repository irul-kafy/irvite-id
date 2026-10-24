import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

test('export menu has a named close control and stays within mobile viewport', () => {
  const source = readFileSync(path.join(__dirname, '../[eventId]/guests/page.tsx'), 'utf8');
  assert.match(source, /aria-label="Tutup opsi ekspor"/);
  assert.match(source, /<span aria-hidden="true">×<\/span>/);
  assert.match(source, /width: 'min\(320px, calc\(100vw - 2rem\)\)'/);
  assert.doesNotMatch(source, /\uFFFD/);
});
