const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { SCHEMA_STATEMENTS, ORPHAN_CLEANUP_STEPS } = require(path.resolve(__dirname, '../../../scripts/schema-sync.cjs'));

test('schema-sync exports required idempotent DDL statements', () => {
  assert.ok(Array.isArray(SCHEMA_STATEMENTS));
  assert.ok(SCHEMA_STATEMENTS.length >= 12);

  const statementNames = SCHEMA_STATEMENTS.map((s) => s.name);
  assert.ok(statementNames.some((n) => n.includes('guests.table_number')));
  assert.ok(statementNames.some((n) => n.includes('wishes table')));
  assert.ok(statementNames.some((n) => n.includes('offline_sync_ops table')));
  assert.ok(statementNames.some((n) => n.includes('events.active_until')));
  assert.ok(statementNames.some((n) => n.includes('orders table')));
  assert.ok(statementNames.some((n) => n.includes('activity_logs table')));
  assert.ok(statementNames.some((n) => n.includes('invitations.first_opened_at')));
  assert.ok(statementNames.some((n) => n.includes('guests.is_walk_in')));
  assert.ok(statementNames.some((n) => n.includes('orders.options')));
  assert.ok(statementNames.some((n) => n.includes('orders.pricing_version')));

  for (const step of SCHEMA_STATEMENTS) {
    assert.ok(typeof step.name === 'string');
    assert.ok(typeof step.sql === 'string');
    // Ensure all DDL statements are additive (ALTER TABLE ADD COLUMN or CREATE TABLE IF NOT EXISTS)
    assert.ok(
      step.sql.startsWith('ALTER TABLE') || step.sql.startsWith('CREATE TABLE IF NOT EXISTS'),
      `Statement ${step.name} should be additive`,
    );
  }
});

test('schema-sync exports orphan cleanup steps', () => {
  assert.ok(Array.isArray(ORPHAN_CLEANUP_STEPS));
  assert.equal(ORPHAN_CLEANUP_STEPS.length, 3);
  for (const step of ORPHAN_CLEANUP_STEPS) {
    assert.ok(step.sql.startsWith('DELETE FROM'));
  }
});
