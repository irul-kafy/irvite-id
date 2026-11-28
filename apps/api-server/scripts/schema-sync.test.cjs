const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  SCHEMA_STATEMENTS,
  ORPHAN_CLEANUP_STEPS,
  syncOrdersForeignKey,
  syncGuestUniqueIndex,
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
  assert.ok(statementNames.some((n) => n.includes('orders.event_id nullability')));
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
  assert.equal(ORPHAN_CLEANUP_STEPS.length, 2);
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
  assert.ok(executedSql.length >= SCHEMA_STATEMENTS.length);
  assert.ok(outcome.success);
});

test('ORPHAN_CLEANUP_STEPS excludes orders (orders are never deleted)', () => {
  assert.equal(ORPHAN_CLEANUP_STEPS.length, 2);
  const tables = ORPHAN_CLEANUP_STEPS.map((s) => s.table);
  assert.ok(!tables.includes('orders'), 'orders must not be in ORPHAN_CLEANUP_STEPS');
  assert.deepEqual(tables.sort(), ['offline_sync_ops', 'wishes'].sort());
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

test('cleanOrphansWithSafety preserves orphaned orders by setting event_id NULL instead of deleting', async () => {
  let executedQueries = [];
  const mockPrisma = {
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('COUNT(*) AS cnt FROM `events`')) return [{ cnt: 10 }];
      if (sql.includes('FROM `orders` WHERE `event_id` IS NOT NULL')) {
        return [
          { id: 'order-orphan-1', reference_code: 'REF001', event_id: 'missing-event-1' },
          { id: 'order-orphan-2', reference_code: 'REF002', event_id: 'missing-event-2' },
        ];
      }
      return [{ cnt: 0 }];
    },
    $executeRawUnsafe: async (sql) => {
      executedQueries.push(sql);
      return 2;
    },
  };

  // Case 1: dry run does not execute UPDATE or DELETE
  const dryRes = await cleanOrphansWithSafety({
    prisma: mockPrisma,
    apply: false,
    force: false,
    logger: silentLogger,
  });
  assert.equal(dryRes.orphanedOrdersCount, 2);
  assert.deepEqual(dryRes.orphanedOrderIds, ['order-orphan-1', 'order-orphan-2']);
  assert.equal(executedQueries.length, 0);

  // Case 2: apply=true executes UPDATE orders SET event_id = NULL, never DELETE FROM orders
  const applyRes = await cleanOrphansWithSafety({
    prisma: mockPrisma,
    apply: true,
    force: false,
    logger: silentLogger,
  });
  assert.equal(applyRes.orphanedOrdersCount, 2);
  assert.equal(executedQueries.length, 1);
  assert.ok(executedQueries[0].includes('UPDATE `orders` SET `event_id` = NULL'));
  assert.ok(!executedQueries.some((q) => q.includes('DELETE FROM `orders`')));
});

test('cleanOrphansWithSafety rejects when candidates > 50 without --force and allows with --force', async () => {
  let deletedCount = 0;
  const mockPrisma = {
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('COUNT(*) AS cnt FROM `events`')) return [{ cnt: 15 }];
      if (sql.includes('FROM `orders`')) return [];
      if (sql.includes('wishes')) return [{ cnt: 35 }];
      if (sql.includes('offline_sync_ops')) return [{ cnt: 20 }];
      return [{ cnt: 0 }];
    },
    $executeRawUnsafe: async () => {
      deletedCount++;
      return 10;
    },
  };

  // 1. Without force (total: 35+20 = 55 > 50) -> must reject
  await assert.rejects(
    async () => {
      await cleanOrphansWithSafety({ prisma: mockPrisma, apply: true, force: false, logger: silentLogger });
    },
    /exceeds safety limit of 50/,
  );
  assert.equal(deletedCount, 0);

  // 2. With force=true -> must proceed and delete wishes + offline_sync_ops
  const res = await cleanOrphansWithSafety({
    prisma: mockPrisma,
    apply: true,
    force: true,
    logger: silentLogger,
  });
  assert.equal(res.status, 'DELETED');
  assert.equal(res.totalDeleted, 55);
  assert.equal(deletedCount, 2);
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

test('importLegacyMasterPricingConfig: Case C: throws clear error if Prisma Client model is missing', async () => {
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
    // No masterPricingConfig model on prisma
  };

  await assert.rejects(
    async () => {
      await importLegacyMasterPricingConfig({
        prisma: mockPrisma,
        apply: true,
        logger: silentLogger,
      });
    },
    /Model database MasterPricingConfig belum ter-generate di Prisma Client/,
  );
});

test('runSchemaSync records FAILED (success=false, exit code 1) when importLegacyMasterPricingConfig fails on --apply', async () => {
  const mockPrisma = {
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('information_schema.TABLES')) return [];
      if (sql.includes('information_schema.COLUMNS')) return [];
      if (sql.includes('REFERENTIAL_CONSTRAINTS')) {
        return [{ CONSTRAINT_NAME: 'orders_event_id_fkey', DELETE_RULE: 'SET NULL' }];
      }
      if (sql.includes('COUNT(*) AS cnt FROM `master_pricing_configs`')) {
        return [{ cnt: 0 }];
      }
      if (sql.includes('PRICING_MASTER_CONFIG')) {
        return [
          {
            id: 'log-err-1',
            actor_user_id: 'admin-1',
            metadata: JSON.stringify({ serviceRates: { petugasUnit: 85000 } }),
            created_at: new Date('2026-11-20T10:00:00Z'),
          },
        ];
      }
      return [];
    },
    $executeRawUnsafe: async () => 1,
    // Missing masterPricingConfig.create causes importLegacyMasterPricingConfig to fail on apply=true
  };

  const outcome = await runSchemaSync({
    prisma: mockPrisma,
    apply: true,
    cleanOrphans: false,
    logger: silentLogger,
  });

  assert.equal(outcome.success, false, 'runSchemaSync must report success=false when legacy pricing import fails');
  assert.equal(outcome.pricingImportResult.status, 'FAILED');
  const failedStep = outcome.results.find((r) => r.name === 'import_legacy_master_pricing_config');
  assert.ok(failedStep, 'results must include import_legacy_master_pricing_config entry');
  assert.equal(failedStep.status, 'FAILED');
});

test('syncOrdersForeignKey: skips when already SET NULL, applies drop & add when different', async () => {
  // Case A: already SET NULL
  const mockPrismaSetNull = {
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('REFERENTIAL_CONSTRAINTS')) {
        return [{ CONSTRAINT_NAME: 'orders_event_id_fkey', DELETE_RULE: 'SET NULL' }];
      }
      return [];
    },
  };
  const resAlready = await syncOrdersForeignKey({ prisma: mockPrismaSetNull, apply: true, logger: silentLogger });
  assert.equal(resAlready.status, 'SKIPPED');

  // Case B: dry-run when not SET NULL
  const mockPrismaDiff = {
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('REFERENTIAL_CONSTRAINTS')) {
        return [{ CONSTRAINT_NAME: 'orders_event_id_fkey', DELETE_RULE: 'RESTRICT' }];
      }
      return [];
    },
  };
  const resDry = await syncOrdersForeignKey({ prisma: mockPrismaDiff, apply: false, logger: silentLogger });
  assert.equal(resDry.status, 'WOULD_APPLY');

  // Case C: apply when RESTRICT and 0 orphan orders
  let executedSql = [];
  const mockPrismaApply = {
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('REFERENTIAL_CONSTRAINTS')) {
        return [{ CONSTRAINT_NAME: 'orders_event_id_fkey', DELETE_RULE: 'RESTRICT' }];
      }
      return [];
    },
    $executeRawUnsafe: async (sql) => {
      executedSql.push(sql);
      return 1;
    },
  };
  const resApply = await syncOrdersForeignKey({ prisma: mockPrismaApply, apply: true, logger: silentLogger });
  assert.equal(resApply.status, 'APPLIED');
  assert.ok(executedSql.some((s) => s.includes('DROP FOREIGN KEY `orders_event_id_fkey`')));
  assert.ok(executedSql.some((s) => s.includes('ON DELETE SET NULL')));
});

test('syncOrdersForeignKey: blocks without dropping FK when orphaned orders exist', async () => {
  let executedSql = [];
  const mockPrismaOrphan = {
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('REFERENTIAL_CONSTRAINTS')) {
        return [{ CONSTRAINT_NAME: 'orders_event_id_fkey', DELETE_RULE: 'RESTRICT' }];
      }
      if (sql.includes('FROM `orders` WHERE `event_id` IS NOT NULL')) {
        return [
          { id: 'ord-orphan-1', reference_code: 'IRV-ORP1', event_id: 'deleted-ev-1' },
        ];
      }
      return [];
    },
    $executeRawUnsafe: async (sql) => {
      executedSql.push(sql);
      return 1;
    },
  };

  const resBlocked = await syncOrdersForeignKey({
    prisma: mockPrismaOrphan,
    apply: true,
    logger: silentLogger,
  });

  assert.equal(resBlocked.status, 'BLOCKED');
  assert.equal(resBlocked.orphanOrdersCount, 1);
  assert.deepEqual(resBlocked.orphanOrderIds, ['ord-orphan-1']);
  assert.ok(resBlocked.message.includes('--clean-orphans'));
  assert.equal(executedSql.length, 0, 'Must NOT execute DROP FOREIGN KEY when orphaned orders exist');
});

test('syncOrdersForeignKey: restores previous FK with previous DELETE_RULE and marks FAILED if ADD CONSTRAINT fails after DROP', async () => {
  let executedSql = [];
  const mockPrismaAddFails = {
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('REFERENTIAL_CONSTRAINTS')) {
        return [{ CONSTRAINT_NAME: 'orders_event_id_fkey', DELETE_RULE: 'CASCADE', UPDATE_RULE: 'CASCADE' }];
      }
      return [];
    },
    $executeRawUnsafe: async (sql) => {
      executedSql.push(sql);
      if (sql.includes('ADD CONSTRAINT') && sql.includes('ON DELETE SET NULL')) {
        throw new Error('Error 1452: Cannot add or update a child row');
      }
      return 1;
    },
  };

  const resFailed = await syncOrdersForeignKey({
    prisma: mockPrismaAddFails,
    apply: true,
    logger: silentLogger,
  });

  assert.equal(resFailed.status, 'FAILED');
  assert.equal(resFailed.restored, true);
  assert.equal(resFailed.previousDeleteRule, 'CASCADE');
  assert.equal(executedSql.length, 3);
  assert.ok(executedSql[0].includes('DROP FOREIGN KEY `orders_event_id_fkey`'));
  assert.ok(executedSql[1].includes('ON DELETE SET NULL'));
  assert.ok(executedSql[2].includes('ON DELETE CASCADE ON UPDATE CASCADE'));
});

test('syncGuestUniqueIndex: reports duplicates without deleting, applies index when 0 duplicates', async () => {
  // Case A: duplicates found -> must reject and delete nothing
  let deleteExecuted = false;
  const mockPrismaDup = {
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('HAVING cnt > 1')) {
        return [{ event_id: 'ev-1', phone_number: '08123456789', cnt: 2 }];
      }
      return [];
    },
    $executeRawUnsafe: async (sql) => {
      if (sql.includes('DELETE')) deleteExecuted = true;
      return 1;
    },
  };
  const resDup = await syncGuestUniqueIndex({ prisma: mockPrismaDup, apply: true, logger: silentLogger });
  assert.equal(resDup.status, 'REJECTED_DUPLICATES');
  assert.equal(resDup.duplicatesCount, 1);
  assert.equal(deleteExecuted, false, 'Must not delete any data');

  // Case B: no duplicates, dry-run
  const mockPrismaClean = {
    $queryRawUnsafe: async (sql) => {
      if (sql.includes('HAVING cnt > 1')) return [];
      if (sql.includes('STATISTICS')) return [];
      return [];
    },
    $executeRawUnsafe: async (sql) => {
      executedSql.push(sql);
      return 1;
    },
  };
  const resCleanDry = await syncGuestUniqueIndex({ prisma: mockPrismaClean, apply: false, logger: silentLogger });
  assert.equal(resCleanDry.status, 'WOULD_APPLY');

  // Case C: no duplicates, apply
  let executedSql = [];
  const resCleanApply = await syncGuestUniqueIndex({ prisma: mockPrismaClean, apply: true, logger: silentLogger });
  assert.equal(resCleanApply.status, 'APPLIED');
  assert.ok(executedSql.some((s) => s.includes('CREATE UNIQUE INDEX `guests_event_id_phone_number_key`')));
});
