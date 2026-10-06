// Read-only runtime checks. No login, credentials, fixture writes, or DB migrations.
function localOrigin(value, fallback) {
  const url = new URL(value || fallback);
  if (!['http:', 'https:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Smoke origins must be local HTTP(S) origins without credentials or paths.');
  }
  return url.origin;
}

async function runChecks(env = process.env, request = fetch) {
  const api = localOrigin(env.IRVITE_SMOKE_API_ORIGIN, 'http://localhost:3000');
  const admin = localOrigin(env.IRVITE_SMOKE_ADMIN_ORIGIN, 'http://localhost:3001');
  const invitation = localOrigin(env.IRVITE_SMOKE_INVITATION_ORIGIN, 'http://localhost:3002');
  const targets = [
    ['API', `${api}/health`, 200],
    ['Database', `${api}/health/db`, 200, true],
    ['API summary requires login', `${api}/api/v1/events/summary`, 401],
    ['Admin login', `${admin}/login`, 200],
    ['Admin summary requires login', `${admin}/api/events/summary`, 401],
    ['System checks require login', `${admin}/api/system-check`, 401],
    ['Invitation website', `${invitation}/`, 200],
  ];
  return Promise.all(targets.map(async ([label, url, expected, database]) => {
    try {
      const response = await request(url, {
        method: 'GET', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000),
      });
      const ok = response.status === expected && (!database || (await response.json()).status === 'ok');
      return { label, ok, detail: ok ? `HTTP ${response.status}` : `HTTP ${response.status}; expected ${expected}${database ? ' and database status ok' : ''}` };
    } catch {
      return { label, ok: false, detail: 'Unavailable, timed out, redirected, or invalid response. Check the local service.' };
    }
  }));
}

module.exports = { localOrigin, runChecks };
if (require.main === module) {
  runChecks().then((results) => {
    for (const result of results) process.stdout.write(`${result.ok ? 'PASS' : 'FAIL'} ${result.label}: ${result.detail}\n`);
    process.stdout.write('Read-only smoke checks do not verify login flows, transactions, visual layout, or a physical camera.\n');
    if (results.some((result) => !result.ok)) process.exitCode = 1;
  }).catch(() => {
    process.stderr.write('Invalid local smoke configuration. Use localhost HTTP(S) origins only.\n');
    process.exitCode = 1;
  });
}
