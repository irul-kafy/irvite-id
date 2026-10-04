import test from 'node:test';
import assert from 'node:assert/strict';
import { remainingSessionSeconds } from './session-expiry';

test('cookie expiry follows the backend JWT expiration, not a hardcoded duration', () => {
  const token = (payload: unknown) => `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
  assert.equal(remainingSessionSeconds(token({ exp: 1900 }), 1000000), 900);
  assert.equal(remainingSessionSeconds(token({ exp: 900 }), 1000000), 0);
  assert.equal(remainingSessionSeconds(token({ exp: '1900' }), 1000000), 0);
  assert.equal(remainingSessionSeconds(token({}), 1000000), 0);
  assert.equal(remainingSessionSeconds('not-a-token'), 0);
});
