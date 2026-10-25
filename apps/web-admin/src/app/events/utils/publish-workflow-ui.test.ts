import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

test('event detail page exposes quick publish/unpublish actions and DRAFT guidance', () => {
  const source = readFileSync(path.join(__dirname, '../[eventId]/page.tsx'), 'utf8');
  assert.match(source, /id="btn-publish-event"/);
  assert.match(source, /id="btn-unpublish-event"/);
  assert.match(source, /id="overview-draft-banner"/);
  assert.match(source, /id="btn-publish-from-overview-banner"/);
  assert.match(source, /status: 'PUBLISHED'/);
  assert.match(source, /status: 'DRAFT'/);
});

test('guest management page warns when event is DRAFT and provides one-click publish', () => {
  const source = readFileSync(path.join(__dirname, '../[eventId]/guests/page.tsx'), 'utf8');
  assert.match(source, /id="guests-draft-warning"/);
  assert.match(source, /id="btn-publish-event-from-guests"/);
  assert.match(source, /status: 'PUBLISHED'/);
});

test('invitation distribution page warns when event is DRAFT and provides one-click publish', () => {
  const source = readFileSync(path.join(__dirname, '../[eventId]/invitations/page.tsx'), 'utf8');
  assert.match(source, /id="invitations-draft-warning"/);
  assert.match(source, /id="btn-publish-event-from-invitations"/);
  assert.match(source, /status: 'PUBLISHED'/);
});
