const test = require('node:test');
const assert = require('node:assert/strict');
const { localOrigin, runChecks } = require('./smoke-local.cjs');

test('smoke refuses non-local or credential-bearing destinations', () => {
  for (const value of ['https://example.com', 'http://user:secret@localhost', 'file:///tmp', 'http://localhost/path', 'http://localhost/?token=x']) {
    assert.throws(() => localOrigin(value));
  }
  assert.equal(localOrigin('http://127.0.0.1:3999'), 'http://127.0.0.1:3999');
});

test('smoke requires real DB health and expected authorization statuses', async () => {
  const results = await runChecks({}, async (url, options) => {
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers, undefined);
    if (url.endsWith('/health/db')) return Response.json({ status: 'error' });
    if (url.endsWith('/summary') || url.endsWith('/system-check')) return new Response(null, { status: 401 });
    return new Response('ok');
  });
  assert.equal(results.length, 7);
  assert.deepEqual(results.filter((result) => !result.ok).map((result) => result.label), ['Database']);
});

test('smoke reports transport failures without leaking upstream details', async () => {
  const results = await runChecks({}, async () => { throw new Error('private connection detail'); });
  assert.ok(results.every((result) => !result.ok));
  assert.ok(!JSON.stringify(results).includes('private connection detail'));
});

test('smoke passes when every service satisfies its contract', async () => {
  const results = await runChecks({}, async (url) => {
    if (url.endsWith('/health/db')) return Response.json({ status: 'ok' });
    return new Response(null, { status: url.endsWith('/summary') || url.endsWith('/system-check') ? 401 : 200 });
  });
  assert.ok(results.every((result) => result.ok));
});
