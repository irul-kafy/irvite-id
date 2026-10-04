// Creates and removes only its own disposable database; never migrates client data.
const { PrismaClient } = require('@prisma/client');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');

async function main() {
  const source = new URL(process.env.DATABASE_URL || '');
  if (source.protocol !== 'mysql:' || !['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)) {
    throw new Error('Local verification requires a local MySQL connection.');
  }
  const name = 'irvite_verify_' + Date.now() + '_test';
  const target = new URL(source);
  target.pathname = '/' + name;
  const admin = new PrismaClient();
  const storage = mkdtempSync(path.join(tmpdir(), 'irvite-e2e-'));
  const repo = path.resolve(__dirname, '../../..');
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: target.toString(),
    E2E_DATABASE_URL: target.toString(),
    MEDIA_STORAGE_PATH: storage,
  };
  let created = false;
  try {
    await admin.$executeRawUnsafe('CREATE DATABASE `' + name + '`');
    created = true;
    const migrate = spawnSync(process.execPath, [
      require.resolve('prisma/build/index.js'),
      'migrate', 'deploy', '--schema', path.join(repo, 'packages/database/prisma/schema.prisma'),
    ], { cwd: repo, env, stdio: 'inherit' });
    if (migrate.error || migrate.status !== 0) throw new Error('Test database migration failed.');
    const result = spawnSync(process.execPath, [
      require.resolve('jest/bin/jest'), '--config', 'test/jest-e2e.json', '--runInBand',
    ], { cwd: path.resolve(__dirname, '..'), env, stdio: 'inherit' });
    if (result.error || result.status !== 0) throw new Error('E2E checks failed. Review test output.');
  } finally {
    // name is generated above, never sourced from a URL, file, or user input.
    if (created) await admin.$executeRawUnsafe('DROP DATABASE `' + name + '`');
    await admin.$disconnect();
    // Only remove the newly-created OS temporary folder, with resolved containment.
    const resolved = path.resolve(storage);
    const relative = path.relative(path.resolve(tmpdir()), resolved);
    if (relative.startsWith('irvite-e2e-') && !relative.includes(path.sep)) {
      rmSync(resolved, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Local verification failed.');
  process.exitCode = 1;
});
