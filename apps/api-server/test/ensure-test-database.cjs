// Load before test modules so ConfigModule cannot select the client database.
const testPath = expect.getState().testPath || '';
const databaseFree = /(?:auth|protected)\.e2e-spec\.ts$/.test(testPath);
if (!databaseFree) {
  let database;
  try {
    database = new URL(process.env.E2E_DATABASE_URL || '');
  } catch {
    throw new Error('E2E requires E2E_DATABASE_URL pointing to a disposable local MySQL database ending in _test.');
  }
  if (
    database.protocol !== 'mysql:' ||
    !['localhost', '127.0.0.1', '[::1]', 'mysql'].includes(database.hostname) ||
    !/^\/[a-zA-Z0-9_]+_test$/.test(database.pathname)
  ) {
    throw new Error('E2E refused: use a disposable local MySQL database ending in _test.');
  }
  process.env.DATABASE_URL = process.env.E2E_DATABASE_URL;
}
