#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/schema-sync.cjs
 *
 * Manual idempotent schema synchronization utility for operators.
 * Safely applies additive schema changes (tables, columns, indexes)
 * and reports the outcome of each statement.
 *
 * Default mode: DRY-RUN (no database mutations).
 * Pass --apply to execute changes.
 * Pass --clean-orphans to run orphaned data cleanup (guarded).
 * Pass --force to allow cleaning > 50 orphaned rows.
 * Pass --with-guest-unique to check duplicates and create UNIQUE(event_id, phone_number) on guests.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

function loadEnvironment() {
  if (process.env.DATABASE_URL) return;

  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../apps/api-server/.env'),
  ];

  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      if (typeof process.loadEnvFile === 'function') {
        try {
          process.loadEnvFile(envPath);
        } catch {
          // ignore parsing error and fallback
        }
      }
      if (process.env.DATABASE_URL) return;

      try {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const key = trimmed.slice(0, idx).trim();
            let val = trimmed.slice(idx + 1).trim();
            if (
              (val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))
            ) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch {
        // ignore
      }

      if (process.env.DATABASE_URL) return;
    }
  }
}

const SCHEMA_STATEMENTS = [
  {
    id: 'guests_table_number',
    name: 'guests.table_number column',
    table: 'guests',
    column: 'table_number',
    sql: 'ALTER TABLE `guests` ADD COLUMN `table_number` VARCHAR(191) NULL',
  },
  {
    id: 'wishes_table',
    name: 'wishes table',
    table: 'wishes',
    sql: `CREATE TABLE IF NOT EXISTS \`wishes\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`event_id\` VARCHAR(191) NOT NULL,
      \`name\` VARCHAR(120) NOT NULL,
      \`message\` VARCHAR(500) NOT NULL,
      \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX \`wishes_event_id_idx\`(\`event_id\`),
      INDEX \`wishes_event_id_created_at_idx\`(\`event_id\`, \`created_at\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  },
  {
    id: 'offline_sync_ops_table',
    name: 'offline_sync_ops table',
    table: 'offline_sync_ops',
    sql: `CREATE TABLE IF NOT EXISTS \`offline_sync_ops\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`event_id\` VARCHAR(191) NOT NULL,
      \`op_type\` VARCHAR(191) NOT NULL,
      \`status\` VARCHAR(191) NOT NULL,
      \`device_id\` VARCHAR(191) NULL,
      \`scanned_by_id\` VARCHAR(191) NULL,
      \`client_timestamp\` DATETIME(3) NOT NULL,
      \`details\` TEXT NULL,
      \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX \`offline_sync_ops_event_id_idx\`(\`event_id\`),
      INDEX \`offline_sync_ops_event_id_created_at_idx\`(\`event_id\`, \`created_at\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  },
  {
    id: 'events_active_until',
    name: 'events.active_until column',
    table: 'events',
    column: 'active_until',
    sql: 'ALTER TABLE `events` ADD COLUMN `active_until` DATETIME(3) NULL',
  },
  {
    id: 'orders_table',
    name: 'orders table',
    table: 'orders',
    sql: `CREATE TABLE IF NOT EXISTS \`orders\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`event_id\` VARCHAR(191) NULL,
      \`reference_code\` VARCHAR(191) NOT NULL,
      \`client_name\` VARCHAR(191) NOT NULL,
      \`client_whatsapp\` VARCHAR(191) NOT NULL,
      \`package_code\` VARCHAR(191) NOT NULL DEFAULT 'GOLD',
      \`price_amount\` INTEGER NOT NULL DEFAULT 199000,
      \`status\` ENUM('DRAFT', 'AWAITING_PAYMENT', 'PAID', 'IN_PROGRESS', 'LIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
      \`paid_at\` DATETIME(3) NULL,
      \`payment_proof_media_id\` VARCHAR(191) NULL,
      \`notes\` TEXT NULL,
      \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`orders_event_id_key\`(\`event_id\`),
      UNIQUE INDEX \`orders_reference_code_key\`(\`reference_code\`),
      INDEX \`orders_status_idx\`(\`status\`),
      INDEX \`orders_reference_code_idx\`(\`reference_code\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  },
  {
    id: 'orders_event_id_nullable',
    name: 'orders.event_id nullability (VARCHAR(191) NULL)',
    table: 'orders',
    column: 'event_id',
    checkNullable: true,
    sql: 'ALTER TABLE `orders` MODIFY `event_id` VARCHAR(191) NULL',
  },
  {
    id: 'activity_logs_table',
    name: 'activity_logs table',
    table: 'activity_logs',
    sql: `CREATE TABLE IF NOT EXISTS \`activity_logs\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`actor_user_id\` VARCHAR(191) NULL,
      \`actor_role\` ENUM('SUPER_ADMIN', 'ADMIN', 'STAFF') NULL,
      \`action\` VARCHAR(100) NOT NULL,
      \`entity_type\` VARCHAR(60) NOT NULL,
      \`entity_id\` VARCHAR(191) NOT NULL,
      \`event_id\` VARCHAR(191) NULL,
      \`metadata\` JSON NULL,
      \`ip\` VARCHAR(64) NULL,
      \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX \`activity_logs_event_id_created_at_idx\`(\`event_id\`, \`created_at\`),
      INDEX \`activity_logs_actor_user_id_created_at_idx\`(\`actor_user_id\`, \`created_at\`),
      INDEX \`activity_logs_action_idx\`(\`action\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  },
  {
    id: 'invitations_first_opened_at',
    name: 'invitations.first_opened_at column',
    table: 'invitations',
    column: 'first_opened_at',
    sql: 'ALTER TABLE `invitations` ADD COLUMN `first_opened_at` DATETIME(3) NULL',
  },
  {
    id: 'invitations_last_opened_at',
    name: 'invitations.last_opened_at column',
    table: 'invitations',
    column: 'last_opened_at',
    sql: 'ALTER TABLE `invitations` ADD COLUMN `last_opened_at` DATETIME(3) NULL',
  },
  {
    id: 'invitations_open_count',
    name: 'invitations.open_count column',
    table: 'invitations',
    column: 'open_count',
    sql: 'ALTER TABLE `invitations` ADD COLUMN `open_count` INTEGER NOT NULL DEFAULT 0',
  },
  {
    id: 'guests_is_walk_in',
    name: 'guests.is_walk_in column',
    table: 'guests',
    column: 'is_walk_in',
    sql: 'ALTER TABLE `guests` ADD COLUMN `is_walk_in` BOOLEAN NOT NULL DEFAULT false',
  },
  {
    id: 'orders_options',
    name: 'orders.options column',
    table: 'orders',
    column: 'options',
    sql: 'ALTER TABLE `orders` ADD COLUMN `options` JSON NULL',
  },
  {
    id: 'orders_pricing_version',
    name: 'orders.pricing_version column',
    table: 'orders',
    column: 'pricing_version',
    sql: 'ALTER TABLE `orders` ADD COLUMN `pricing_version` INT NOT NULL DEFAULT 1',
  },
  {
    id: 'guests_migration_audit_table',
    name: 'guests_migration_audit table',
    table: 'guests_migration_audit',
    sql: `CREATE TABLE IF NOT EXISTS \`guests_migration_audit\` (
      \`guest_id\` VARCHAR(191) NOT NULL,
      \`event_id\` VARCHAR(191) NOT NULL,
      \`old_category\` VARCHAR(191) NULL,
      \`old_phone_number\` VARCHAR(191) NULL,
      \`change_reason\` VARCHAR(191) NOT NULL,
      \`captured_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`guest_id\`),
      INDEX \`guests_migration_audit_event_id_idx\`(\`event_id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  },
  {
    id: 'master_pricing_configs_table',
    name: 'master_pricing_configs table',
    table: 'master_pricing_configs',
    sql: `CREATE TABLE IF NOT EXISTS \`master_pricing_configs\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`version\` INT NOT NULL DEFAULT 1,
      \`config\` JSON NOT NULL,
      \`created_by\` VARCHAR(191) NULL,
      \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX \`master_pricing_configs_created_at_idx\`(\`created_at\`),
      INDEX \`master_pricing_configs_version_created_at_idx\`(\`version\`, \`created_at\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  },
];

const ORPHAN_CLEANUP_STEPS = [
  {
    name: 'Orphaned wishes cleanup',
    table: 'wishes',
    countSql: 'SELECT COUNT(*) AS cnt FROM `wishes` WHERE `event_id` NOT IN (SELECT `id` FROM `events`)',
    sql: 'DELETE FROM `wishes` WHERE `event_id` NOT IN (SELECT `id` FROM `events`)',
  },
  {
    name: 'Orphaned offline_sync_ops cleanup',
    table: 'offline_sync_ops',
    countSql: 'SELECT COUNT(*) AS cnt FROM `offline_sync_ops` WHERE `event_id` NOT IN (SELECT `id` FROM `events`)',
    sql: 'DELETE FROM `offline_sync_ops` WHERE `event_id` NOT IN (SELECT `id` FROM `events`)',
  },
];

function isAlreadyAppliedError(err) {
  const msg = err && err.message ? err.message : String(err);
  return (
    msg.includes('Duplicate column') ||
    msg.includes('1060') ||
    msg.includes('already exists') ||
    msg.includes('1050') ||
    msg.includes('Duplicate key name') ||
    msg.includes('1061')
  );
}

async function inspectSchemaState(prisma) {
  const existingTables = new Set();
  const existingColumns = new Set();
  const columnNullability = new Map();

  try {
    const tableRows = await prisma.$queryRawUnsafe(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()'
    );
    if (Array.isArray(tableRows)) {
      for (const r of tableRows) {
        const t = r.TABLE_NAME || r.table_name;
        if (t) existingTables.add(String(t).toLowerCase());
      }
    }

    const columnRows = await prisma.$queryRawUnsafe(
      'SELECT TABLE_NAME, COLUMN_NAME, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()'
    );
    if (Array.isArray(columnRows)) {
      for (const r of columnRows) {
        const t = r.TABLE_NAME || r.table_name;
        const c = r.COLUMN_NAME || r.column_name;
        const isNull = (r.IS_NULLABLE || r.is_nullable) === 'YES';
        if (t && c) {
          const key = `${String(t).toLowerCase()}.${String(c).toLowerCase()}`;
          existingColumns.add(key);
          columnNullability.set(key, isNull);
        }
      }
    }
  } catch {
    // If information_schema is not accessible, inspection set remains empty
  }

  return { existingTables, existingColumns, columnNullability };
}

async function syncOrdersForeignKey({ prisma, apply, logger = console }) {
  let existingFk = null;
  try {
    const fks = await prisma.$queryRawUnsafe(
      "SELECT CONSTRAINT_NAME, DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND CONSTRAINT_NAME = 'orders_event_id_fkey'"
    );
    if (Array.isArray(fks) && fks.length > 0) {
      existingFk = fks[0];
    }
  } catch {
    // If information_schema cannot be queried
  }

  const deleteRule = existingFk ? (existingFk.DELETE_RULE || existingFk.delete_rule) : null;
  if (existingFk && deleteRule === 'SET NULL') {
    logger.log('  [ALREADY EXIST] FK orders.event_id -> events.id ON DELETE SET NULL');
    return { status: 'SKIPPED', message: 'FK already ON DELETE SET NULL' };
  }

  if (!apply) {
    logger.log('  [DRY-RUN: WOULD APPLY] FK orders.event_id -> events.id ON DELETE SET NULL');
    return { status: 'WOULD_APPLY' };
  }

  if (existingFk && deleteRule !== 'SET NULL') {
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE `orders` DROP FOREIGN KEY `orders_event_id_fkey`');
      logger.log(`  [DROPPED] Existing FK orders_event_id_fkey with rule ${deleteRule}`);
    } catch (err) {
      logger.warn(`  [DROP WARN] Failed to drop existing FK: ${err.message}`);
    }
  }

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `orders` ADD CONSTRAINT `orders_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'
    );
    logger.log('  [APPLIED] FK orders.event_id -> events.id ON DELETE SET NULL added');
    return { status: 'APPLIED' };
  } catch (err) {
    if (isAlreadyAppliedError(err)) {
      logger.log('  [ALREADY EXIST] FK orders.event_id -> events.id already present');
      return { status: 'SKIPPED' };
    }
    logger.error(`  [FAILED] FK orders_event_id_fkey: ${err.message}`);
    throw err;
  }
}

async function syncGuestUniqueIndex({ prisma, apply, logger = console }) {
  let duplicates = [];
  try {
    duplicates = await prisma.$queryRawUnsafe(
      "SELECT `event_id`, `phone_number`, COUNT(*) as cnt FROM `guests` WHERE `phone_number` IS NOT NULL AND `phone_number` != '' GROUP BY `event_id`, `phone_number` HAVING cnt > 1"
    );
  } catch (err) {
    logger.warn(`  [GUEST UNIQUE] Duplicate check query failed: ${err.message}`);
  }

  if (Array.isArray(duplicates) && duplicates.length > 0) {
    logger.warn(`  [GUEST UNIQUE DUPLICATES] Found ${duplicates.length} duplicate (event_id, phone_number) set(s):`);
    for (const d of duplicates.slice(0, 10)) {
      const eid = d.event_id || d.eventId;
      const ph = d.phone_number || d.phoneNumber;
      const c = d.cnt || d.count;
      logger.warn(`    - Event ${eid}, Phone: ${ph} (${c} duplicates)`);
    }
    if (duplicates.length > 10) {
      logger.warn(`    ... and ${duplicates.length - 10} more duplicate sets`);
    }
    logger.warn('  [GUEST UNIQUE REJECTED] Cannot create UNIQUE index while duplicate phone numbers exist. NO DATA WAS DELETED. Operators must resolve duplicates manually.');
    return { status: 'REJECTED_DUPLICATES', duplicatesCount: duplicates.length, duplicates };
  }

  logger.log('  [GUEST UNIQUE] 0 duplicate phone numbers found across events.');

  let indexExists = false;
  try {
    const idx = await prisma.$queryRawUnsafe(
      "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guests' AND INDEX_NAME = 'guests_event_id_phone_number_key'"
    );
    indexExists = Array.isArray(idx) && idx.length > 0;
  } catch {
    // fallback
  }

  if (indexExists) {
    logger.log('  [ALREADY EXIST] Unique index guests_event_id_phone_number_key');
    return { status: 'SKIPPED', message: 'Index already exists' };
  }

  if (!apply) {
    logger.log('  [DRY-RUN: WOULD APPLY] CREATE UNIQUE INDEX `guests_event_id_phone_number_key` ON `guests`(`event_id`, `phone_number`)');
    return { status: 'WOULD_APPLY' };
  }

  try {
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX `guests_event_id_phone_number_key` ON `guests`(`event_id`, `phone_number`)'
    );
    logger.log('  [APPLIED] CREATE UNIQUE INDEX `guests_event_id_phone_number_key` ON `guests`(`event_id`, `phone_number`)');
    return { status: 'APPLIED' };
  } catch (err) {
    if (isAlreadyAppliedError(err)) {
      logger.log('  [ALREADY EXIST] Unique index guests_event_id_phone_number_key already present');
      return { status: 'SKIPPED' };
    }
    logger.error(`  [FAILED] guests_event_id_phone_number_key: ${err.message}`);
    throw err;
  }
}

async function importLegacyMasterPricingConfig({ prisma, apply, logger = console }) {
  let tableExists = true;
  let countRows = 0;

  try {
    const res = await prisma.$queryRawUnsafe('SELECT COUNT(*) AS cnt FROM `master_pricing_configs`');
    const cnt = Array.isArray(res) && res[0] ? (res[0].cnt ?? res[0].count ?? 0) : 0;
    countRows = Number(cnt);
  } catch {
    tableExists = false;
  }

  if (tableExists && countRows > 0) {
    logger.log(`  [IMPORT SKIPPED] master_pricing_configs already contains ${countRows} record(s).`);
    return { status: 'SKIPPED', reason: 'ALREADY_POPULATED', count: countRows };
  }

  let legacyLog = null;
  try {
    const logs = await prisma.$queryRawUnsafe(
      "SELECT `id`, `actor_user_id`, `metadata`, `created_at` FROM `activity_logs` WHERE `action` = 'PRICING_MASTER_CONFIG' ORDER BY `created_at` DESC LIMIT 1"
    );
    if (Array.isArray(logs) && logs.length > 0) {
      legacyLog = logs[0];
    }
  } catch {
    // activity_logs table query failed or empty
  }

  if (!legacyLog || !legacyLog.metadata) {
    logger.log('  [IMPORT SKIPPED] No legacy ActivityLog record with action PRICING_MASTER_CONFIG found.');
    return { status: 'SKIPPED', reason: 'NO_LEGACY_LOG' };
  }

  let configObj = legacyLog.metadata;
  if (typeof configObj === 'string') {
    try {
      configObj = JSON.parse(configObj);
    } catch {
      // keep as string
    }
  }
  if (configObj && typeof configObj === 'object' && configObj.config && typeof configObj.config === 'object') {
    configObj = configObj.config;
  }

  const configJson = typeof configObj === 'string' ? configObj : JSON.stringify(configObj);
  const author = legacyLog.actor_user_id || legacyLog.actorUserId || null;
  const createdAt = legacyLog.created_at || legacyLog.createdAt || new Date();

  if (!apply) {
    logger.log(`  [DRY-RUN: WOULD IMPORT] Found latest PRICING_MASTER_CONFIG in activity_logs (log ID: ${legacyLog.id}). Would insert into master_pricing_configs (version: 1).`);
    return { status: 'WOULD_IMPORT', sourceLogId: legacyLog.id };
  }

  const newId = crypto.randomUUID ? crypto.randomUUID() : `cfg_${Date.now()}`;

  if (!prisma.masterPricingConfig || typeof prisma.masterPricingConfig.create !== 'function') {
    const err = new Error(
      'Gagal mengimpor konfigurasi harga: Model database MasterPricingConfig belum ter-generate di Prisma Client. Jalankan "npx prisma generate" sebelum sinkronisasi.',
    );
    logger.error(`  [IMPORT ERROR] ${err.message}`);
    throw err;
  }

  await prisma.masterPricingConfig.create({
    data: {
      id: newId,
      version: 1,
      config: typeof configObj === 'object' ? configObj : JSON.parse(configJson),
      createdBy: author,
      createdAt: createdAt instanceof Date ? createdAt : new Date(createdAt),
    },
  });

  logger.log(`  [IMPORTED] Imported latest PRICING_MASTER_CONFIG (${legacyLog.id}) into master_pricing_configs (id: ${newId}, version: 1).`);
  return { status: 'IMPORTED', id: newId, sourceLogId: legacyLog.id };
}

async function cleanOrphansWithSafety({ prisma, apply, force, logger = console }) {
  let eventCount = 0;
  try {
    const res = await prisma.$queryRawUnsafe('SELECT COUNT(*) AS cnt FROM `events`');
    const cnt = Array.isArray(res) && res[0] ? (res[0].cnt ?? res[0].count ?? 0) : 0;
    eventCount = Number(cnt);
  } catch (err) {
    logger.error(`  [CLEAN ERROR] Failed to query events count: ${err.message}`);
    throw err;
  }

  if (eventCount === 0) {
    const msg = 'REJECTED: Refusing to clean orphans because COUNT(events) is 0. Safety guard against empty/unpopulated events table.';
    logger.error(`  [SAFETY REJECT] ${msg}`);
    throw new Error(msg);
  }

  // 1. Orphaned orders: NEVER deleted. Only reported (count + IDs) and set event_id = NULL on apply.
  let orphanedOrders = [];
  try {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT `id`, `reference_code`, `event_id` FROM `orders` WHERE `event_id` IS NOT NULL AND `event_id` NOT IN (SELECT `id` FROM `events`)'
    );
    if (Array.isArray(rows)) {
      orphanedOrders = rows;
    }
  } catch (err) {
    logger.warn(`  [ORPHAN ORDERS WARN] Could not query orphaned orders: ${err.message}`);
  }

  const orphanedOrdersCount = orphanedOrders.length;
  const orphanedOrderIds = orphanedOrders.map((o) => o.id || o.ID);

  if (orphanedOrdersCount > 0) {
    logger.warn(`  [ORPHANED ORDERS PRESERVED] Found ${orphanedOrdersCount} order(s) pointing to non-existent events. ORDERS ARE NEVER DELETED.`);
    for (const o of orphanedOrders.slice(0, 10)) {
      const ref = o.reference_code || o.referenceCode || '-';
      const evId = o.event_id || o.eventId;
      logger.warn(`    - Order ID: ${o.id} (ref: ${ref}, invalid event_id: ${evId})`);
    }
    if (orphanedOrdersCount > 10) {
      logger.warn(`    ... and ${orphanedOrdersCount - 10} more orphaned order(s)`);
    }

    if (apply) {
      try {
        const updated = await prisma.$executeRawUnsafe(
          'UPDATE `orders` SET `event_id` = NULL WHERE `event_id` IS NOT NULL AND `event_id` NOT IN (SELECT `id` FROM `events`)'
        );
        logger.log(`  [PRESERVED] Set event_id = NULL for ${updated} orphaned order(s). No order data deleted.`);
      } catch (err) {
        logger.error(`  [PRESERVE ERROR] Failed to set event_id = NULL for orphaned orders: ${err.message}`);
        throw err;
      }
    } else {
      logger.log(`  [DRY-RUN] Would set event_id = NULL for ${orphanedOrdersCount} orphaned order(s) (NEVER deleted).`);
    }
  } else {
    logger.log('  [ORPHANED ORDERS] 0 orphaned orders found.');
  }

  // 2. Count candidates for wishes & offline_sync_ops
  const tableCounts = {};
  let totalCandidates = 0;

  for (const step of ORPHAN_CLEANUP_STEPS) {
    try {
      const res = await prisma.$queryRawUnsafe(step.countSql);
      const cnt = Array.isArray(res) && res[0] ? (res[0].cnt ?? res[0].count ?? 0) : 0;
      const count = Number(cnt);
      tableCounts[step.table] = count;
      totalCandidates += count;
    } catch (err) {
      tableCounts[step.table] = 0;
      logger.warn(`  [COUNT WARN] Could not count candidates for ${step.table}: ${err.message}`);
    }
  }

  logger.log('  [ORPHAN CANDIDATES COUNT (wishes, offline_sync_ops)]:\n' +
    Object.entries(tableCounts).map(([t, c]) => `    - ${t}: ${c} orphaned row(s)`).join('\n'));
  logger.log(`    Total deletion candidates: ${totalCandidates}`);

  if (totalCandidates === 0) {
    logger.log('  [CLEAN] No orphaned records found in wishes/offline_sync_ops. Nothing to delete.');
    return {
      status: 'CLEAN',
      totalCandidates: 0,
      tableCounts,
      orphanedOrdersCount,
      orphanedOrderIds,
    };
  }

  if (totalCandidates > 50 && !force) {
    const msg = `REJECTED: Orphan candidate count (${totalCandidates}) exceeds safety limit of 50. Pass --force to execute deletion.`;
    logger.error(`  [SAFETY REJECT] ${msg}`);
    throw new Error(msg);
  }

  if (!apply) {
    logger.log(`  [DRY-RUN] Safety checks passed. Would delete ${totalCandidates} orphaned record(s) across tables. Run with --apply to execute.`);
    return {
      status: 'WOULD_DELETE',
      totalCandidates,
      tableCounts,
      orphanedOrdersCount,
      orphanedOrderIds,
    };
  }

  const deletedPerTable = {};
  for (const step of ORPHAN_CLEANUP_STEPS) {
    try {
      const rows = await prisma.$executeRawUnsafe(step.sql);
      deletedPerTable[step.table] = Number(rows);
      logger.log(`  [CLEANED] ${step.name} (${step.table}: ${rows} rows deleted)`);
    } catch (err) {
      logger.error(`  [CLEAN ERROR] ${step.name}: ${err.message}`);
      throw err;
    }
  }

  return {
    status: 'DELETED',
    totalDeleted: totalCandidates,
    deletedPerTable,
    tableCounts,
    orphanedOrdersCount,
    orphanedOrderIds,
  };
}

async function runSchemaSync({
  prisma,
  apply = false,
  cleanOrphans = false,
  force = false,
  withGuestUnique = false,
  logger = console,
}) {
  const mode = apply ? 'APPLY' : 'DRY-RUN';
  logger.log('====================================================');
  logger.log(` [Irvite] Schema Synchronization (${mode} MODE)`);
  if (!apply) {
    logger.log(' Default mode is DRY-RUN. No mutations will be executed.');
    logger.log(' To apply changes to the database, run with --apply');
  } else {
    logger.log(' Executing schema mutations (--apply specified).');
  }
  logger.log('====================================================\n');

  const results = [];
  const { existingTables, existingColumns, columnNullability } = await inspectSchemaState(prisma);

  for (const step of SCHEMA_STATEMENTS) {
    if (!apply) {
      let alreadyExists = false;
      if (step.checkNullable && step.column && step.table) {
        const isNull = columnNullability.get(`${step.table.toLowerCase()}.${step.column.toLowerCase()}`);
        if (isNull === true) {
          alreadyExists = true;
        }
      } else if (step.column && step.table) {
        alreadyExists = existingColumns.has(`${step.table.toLowerCase()}.${step.column.toLowerCase()}`);
      } else if (step.table && !step.column) {
        alreadyExists = existingTables.has(step.table.toLowerCase());
      }

      if (alreadyExists) {
        results.push({ name: step.name, status: 'SKIPPED', message: 'Already present in database' });
        logger.log(`  [DRY-RUN: ALREADY EXIST] ${step.name}`);
      } else {
        results.push({ name: step.name, status: 'WOULD_APPLY', message: 'Would execute DDL' });
        logger.log(`  [DRY-RUN: WOULD APPLY]   ${step.name}`);
      }
    } else {
      try {
        await prisma.$executeRawUnsafe(step.sql);
        results.push({ name: step.name, status: 'APPLIED', message: 'Executed successfully' });
        logger.log(`  [APPLIED]       ${step.name}`);
      } catch (err) {
        if (isAlreadyAppliedError(err)) {
          results.push({ name: step.name, status: 'SKIPPED', message: 'Already present/created' });
          logger.log(`  [ALREADY EXIST] ${step.name}`);
        } else {
          results.push({ name: step.name, status: 'FAILED', message: err.message });
          logger.error(`  [FAILED]        ${step.name}: ${err.message}`);
        }
      }
    }
  }

  logger.log('\n--- Syncing orders foreign key (ON DELETE SET NULL) ---');
  let fkResult = null;
  try {
    fkResult = await syncOrdersForeignKey({ prisma, apply, logger });
  } catch (err) {
    results.push({ name: 'orders_event_id_fkey', status: 'FAILED', message: err.message });
  }

  if (withGuestUnique) {
    logger.log('\n--- Syncing guests(event_id, phone_number) unique index (--with-guest-unique) ---');
    try {
      await syncGuestUniqueIndex({ prisma, apply, logger });
    } catch (err) {
      results.push({ name: 'guests_event_id_phone_number_key', status: 'FAILED', message: err.message });
    }
  }

  logger.log('\n--- Checking Master Pricing Config Migration ---');
  let pricingImportResult = null;
  try {
    pricingImportResult = await importLegacyMasterPricingConfig({ prisma, apply, logger });
  } catch (err) {
    logger.warn(`  [IMPORT ERROR] ${err.message}`);
  }

  let orphanResult = null;
  if (cleanOrphans) {
    logger.log('\n--- Orphaned Records Safety & Cleanup ---');
    try {
      orphanResult = await cleanOrphansWithSafety({ prisma, apply, force, logger });
    } catch (err) {
      results.push({ name: 'clean_orphans', status: 'FAILED', message: err.message });
    }
  }

  logger.log('\n====================================================');
  logger.log(` Synchronization Summary (${mode}):`);
  const appliedCount = results.filter((r) => r.status === 'APPLIED').length;
  const wouldApplyCount = results.filter((r) => r.status === 'WOULD_APPLY').length;
  const skippedCount = results.filter((r) => r.status === 'SKIPPED').length;
  const failedCount = results.filter((r) => r.status === 'FAILED').length;

  logger.log(`  Total Statements : ${SCHEMA_STATEMENTS.length}`);
  if (!apply) {
    logger.log(`  Would Apply      : ${wouldApplyCount}`);
    logger.log(`  Already Existing : ${skippedCount}`);
    logger.log('  * No mutations were written to database (DRY-RUN).');
  } else {
    logger.log(`  Applied          : ${appliedCount}`);
    logger.log(`  Already Existing : ${skippedCount}`);
    logger.log(`  Failed           : ${failedCount}`);
  }
  logger.log('====================================================');

  return {
    mode,
    results,
    fkResult,
    pricingImportResult,
    orphanResult,
    success: failedCount === 0,
  };
}

async function main(argv = process.argv.slice(2)) {
  loadEnvironment();

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Please provide it in .env or environment variables.');
    process.exit(1);
  }

  const apply = argv.includes('--apply');
  const cleanOrphans = argv.includes('--clean-orphans');
  const force = argv.includes('--force');
  const withGuestUnique = argv.includes('--with-guest-unique');

  const url = process.env.DATABASE_URL;
  const isLocalOrDirect =
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    process.env.ALLOW_PROD_SCHEMA_SYNC === 'true';

  if (!isLocalOrDirect && apply) {
    console.warn('⚠ Note: Non-localhost database detected. Operator confirmation required via ALLOW_PROD_SCHEMA_SYNC=true.');
    if (process.env.ALLOW_PROD_SCHEMA_SYNC !== 'true') {
      console.error('❌ Refusing to run --apply on non-localhost database without ALLOW_PROD_SCHEMA_SYNC=true.');
      process.exit(1);
    }
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log(' Connected to database successfully.\n');

    const outcome = await runSchemaSync({
      prisma,
      apply,
      cleanOrphans,
      force,
      withGuestUnique,
      logger: console,
    });

    if (!outcome.success) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('❌ Unexpected database error during schema sync:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  SCHEMA_STATEMENTS,
  ORPHAN_CLEANUP_STEPS,
  inspectSchemaState,
  syncOrdersForeignKey,
  syncGuestUniqueIndex,
  importLegacyMasterPricingConfig,
  cleanOrphansWithSafety,
  runSchemaSync,
  isAlreadyAppliedError,
  main,
};
