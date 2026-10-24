import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

test('guest list exposes delete action on desktop and mobile through the guarded handler', () => {
  const source = readFileSync(path.join(__dirname, '../[eventId]/guests/page.tsx'), 'utf8');
  const calls = source.match(/onClick=\{\(\) => void handleDeleteGuest\(guest\.id, guest\.name\)\}/g) ?? [];
  assert.equal(calls.length, 2);
  assert.match(source, /id=\{`guest-delete-\$\{guest\.id\}`\}/);
  assert.match(source, /id=\{`guest-delete-mobile-\$\{guest\.id\}`\}/);
  assert.match(source, /disabled=\{deletingGuestId !== null\}/);
  assert.match(source, /confirm\(`Apakah Anda yakin ingin menghapus tamu/);
  assert.match(source, /res\.status === 409/);
});
