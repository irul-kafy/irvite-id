const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  SCHEMA_STATEMENTS,
  ORPHAN_CLEANUP_STEPS,
  importLegacyMasterPricingConfig,
  cleanOrphansWithSafety,
  runSchemaSync,
} = require(path.resolve(__dirname, '../../../scripts/schema-sync.cjs'));

const silentLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
};

test('schema-sync exports required idempotent DDL statements including master_pricing_configs', () => {
  assert.ok(Array.isArray(SCHEMA_STATEMENTS));
  assert.ok(SCHEMA_STATEMENTS.length >= 13);

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
  assert.ok(statementNames.some((n) => n.includes('master_pricing_configs table')));

  const masterConfigStep = SCHEMA_STATEMENTS.find((s) => s.id === 'master_pricing_configs_table');
  assert.ok(masterConfigStep);
  assert.ok(masterConfigStep.sql.includes('CREATE TABLE IF NOT EXISTS `master_pricing_configs`'));
  assert.ok(masterConfigStep.sql.includes('`version` INT NOT NULL DEFAULT 1'));
  assert.ok(masterConfigStep.sql.includes('`config` JSON NOT NULL'));

  for (const step of SCHEMA_STATEMENTS) {
    assert.ok(typeof step.name === 'string');
    assert.ok(typeof step.sql === 'string');
    assert.ok(
      step.sql.startsWith('ALTER TABLE') || step.sql.startsWith('CREATE TABLE IF NOT EXISTS'),
      `Statement ${step.name} should be additive`,
    );
  }
});

test('schema-sync exports orphan cleanup steps with count queries', () => {
  assert.ok(Array.isArray(ORPHAN_CLEANUP_STEPS));
  assert.equal(ORPHAN_CLEANUP_STEPS.length, 3);
  for (const step of ORPHAN_CLEANUP_STEPS) {
    assert.ok(step.sql.startsWith('DELETE FROM'));
    assert.ok(step.countSql.startsWith('SELECT COUNT(*)'));
    assert.ok(typeof step.table === 'string');
  }
});

test('runSchemaSync defaults to dry-run mode and executes no DDL statements', async () => {
  let executedSql = [];
  const mockPrisma = {
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('TABLES')) return [{ TABLE_NAME: 'events' }];
      if (sql.includes('COLUMNS')) return [];
      if (sql.includes('master_pricing_configs')) return [{ cnt: 1 }];
      return [];
    },
    $executeRawUnsafe: async (sql) => {
      executedSql.push(sql);
      return 1;
    },
  };

  const outcome = await runSchemaSync({
    prisma: mockPrisma,
    apply: false,
    cleanOrphans: false,
    logger: silentLogger,
  });

  assert.equal(outcome.mode, 'DRY-RUN');
  assert.equal(executedSql.length, 0, 'Dry-run must not execute DDL mutations');
  assert.ok(outcome.results.some((r) => r.status === 'WOULD_APPLY'));
});

test('runSchemaSync with apply=true executes statements', async () => {
  let executedSql = [];
  const mockPrisma = {
    $queryRawUnsafe: async () => [{ cnt: 1 }],
    $executeRawUnsafe: async (sql) => {
      executedSql.push(sql);
      return 1;
    },
  };

  const outcome = await runSchemaSync({
    prisma: mockPrisma,
    apply: true,
    cleanOrphans: false,
    logger: silentLogger,
  });

  assert.equal(outcome.mode, 'APPLY');
  assert.equal(executedSql.length, SCHEMA_STATEMENTS.length);
  assert.ok(outcome.success);
});

test('cleanOrphansWithSafety rejects when COUNT(events) is 0', async () => {
  const mockPrisma = {
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('COUNT(*) AS cnt FROM `events`')) {
        return [{ cnt: 0 }];
      }
      return [{ cnt: 10 }];
    },
    $executeRawUnsafe: async () => {
      assert.fail('Should not execute delete when events is 0');
    },
  };

  await assert.rejects(
    async () => {
      await cleanOrphansWithSafety({ prisma: mockPrisma, apply: true, force: false, logger: silentLogger });
    },
    /COUNT\(events\) is 0/,
  );
});

test('cleanOrphansWithSafety rejects when candidates > 50 without --force and allows with --force', async () => {
  let deletedCount = 0;
  const mockPrisma = {
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('COUNT(*) AS cnt FROM `events`')) return [{ cnt: 15 }];
      if (sql.includes('orders')) return [{ cnt: 30 }];
      if (sql.includes('wishes')) return [{ cnt: 25 }];
      if (sql.includes('offline_sync_ops')) return [{ cnt: 5 }];
      return [{ cnt: 0 }];
    },
    $executeRawUnsafe: async () => {
      deletedCount++;
      return 10;
    },
  };

  // 1. Without force (total: 30+25+5 = 60 > 50) -> must reject
  await assert.rejects(
    async () => {
      await cleanOrphansWithSafety({ prisma: mockPrisma, apply: true, force: false, logger: silentLogger });
    },
    /exceeds safety limit of 50/,
  );
  assert.equal(deletedCount, 0);

  // 2. With force=true -> must proceed and delete
  const res = await cleanOrphansWithSafety({
    prisma: mockPrisma,
    apply: true,
    force: true,
    logger: silentLogger,
  });
  assert.equal(res.status, 'DELETED');
  assert.equal(res.totalDeleted, 60);
  assert.equal(deletedCount, 3);
});

test('importLegacyMasterPricingConfig: Case A: imports once when table is empty and ActivityLog has config', async () => {
  let createdRecords = [];
  const mockConfig = { rates: { petugasUnit: 85000 } };
  const mockPrisma = {
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('COUNT(*) AS cnt FROM `master_pricing_configs`')) {
        return [{ cnt: 0 }];
      }
      if (sql.includes('PRICING_MASTER_CONFIG')) {
        return [
          {
            id: 'log-123',
            actor_user_id: 'user-admin',
            metadata: JSON.stringify(mockConfig),
            created_at: new Date('2026-11-20T10:00:00Z'),
          },
        ];
      }
      return [];
    },
    masterPricingConfig: {
      create: async ({ data }) => {
        createdRecords.push(data);
        return data;
      },
    },
  };

  // In dry-run
  const dryResult = await importLegacyMasterPricingConfig({
    prisma: mockPrisma,
    apply: false,
    logger: silentLogger,
  });
  assert.equal(dryResult.status, 'WOULD_IMPORT');
  assert.equal(createdRecords.length, 0);

  // In apply
  const applyResult = await importLegacyMasterPricingConfig({
    prisma: mockPrisma,
    apply: true,
    logger: silentLogger,
  });
  assert.equal(applyResult.status, 'IMPORTED');
  assert.equal(createdRecords.length, 1);
  assert.equal(createdRecords[0].version, 1);
  assert.deepEqual(createdRecords[0].config, mockConfig);
  assert.equal(createdRecords[0].createdBy, 'user-admin');
});

test('importLegacyMasterPricingConfig: Case B: skips import when table already contains records', async () => {
  let createdCount = 0;
  const mockPrisma = {
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('COUNT(*) AS cnt FROM `master_pricing_configs`')) {
        return [{ cnt: 3 }];
      }
      return [];
    },
    masterPricingConfig: {
      create: async () => {
        createdCount++;
      },
    },
  };

  const res = await importLegacyMasterPricingConfig({
    prisma: mockPrisma,
    apply: true,
    logger: silentLogger,
  });

  assert.equal(res.status, 'SKIPPED');
  assert.equal(res.reason, 'ALREADY_POPULATED');
  assert.equal(createdCount, 0);
});
