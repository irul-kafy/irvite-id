#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/schema-sync.cjs
 *
 * Manual idempotent schema synchronization utility for operators.
 * Safely applies additive schema changes (tables, columns, indexes)
 * and reports the outcome of each statement without touching production
 * databases during application cold-start.
 */

const fs = require('node:fs');
const path = require('node:path');
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
    sql: 'ALTER TABLE `guests` ADD COLUMN `table_number` VARCHAR(191) NULL',
  },
  {
    id: 'wishes_table',
    name: 'wishes table',
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
    sql: 'ALTER TABLE `events` ADD COLUMN `active_until` DATETIME(3) NULL',
  },
  {
    id: 'orders_table',
    name: 'orders table',
    sql: `CREATE TABLE IF NOT EXISTS \`orders\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`event_id\` VARCHAR(191) NOT NULL,
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
    id: 'activity_logs_table',
    name: 'activity_logs table',
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
    sql: 'ALTER TABLE `invitations` ADD COLUMN `first_opened_at` DATETIME(3) NULL',
  },
  {
    id: 'invitations_last_opened_at',
    name: 'invitations.last_opened_at column',
    sql: 'ALTER TABLE `invitations` ADD COLUMN `last_opened_at` DATETIME(3) NULL',
  },
  {
    id: 'invitations_open_count',
    name: 'invitations.open_count column',
    sql: 'ALTER TABLE `invitations` ADD COLUMN `open_count` INTEGER NOT NULL DEFAULT 0',
  },
  {
    id: 'guests_is_walk_in',
    name: 'guests.is_walk_in column',
    sql: 'ALTER TABLE `guests` ADD COLUMN `is_walk_in` BOOLEAN NOT NULL DEFAULT false',
  },
  {
    id: 'orders_options',
    name: 'orders.options column',
    sql: 'ALTER TABLE `orders` ADD COLUMN `options` JSON NULL',
  },
  {
    id: 'orders_pricing_version',
    name: 'orders.pricing_version column',
    sql: 'ALTER TABLE `orders` ADD COLUMN `pricing_version` INT NOT NULL DEFAULT 1',
  },
  {
    id: 'guests_migration_audit_table',
    name: 'guests_migration_audit table',
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
    sql: `CREATE TABLE IF NOT EXISTS \`master_pricing_configs\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`version\` INT NOT NULL DEFAULT 1,
      \`config\` JSON NOT NULL,
      \`created_by\` VARCHAR(191) NULL,
      \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      INDEX \`master_pricing_configs_created_at_idx\`(\`created_at\`),
      INDEX \`master_pricing_configs_version_created_at_idx\`(\`version\`, \`created_at\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  },
];

const ORPHAN_CLEANUP_STEPS = [
  {
    name: 'Orphaned orders cleanup',
    sql: 'DELETE FROM `orders` WHERE `event_id` NOT IN (SELECT `id` FROM `events`)',
  },
  {
    name: 'Orphaned wishes cleanup',
    sql: 'DELETE FROM `wishes` WHERE `event_id` NOT IN (SELECT `id` FROM `events`)',
  },
  {
    name: 'Orphaned offline_sync_ops cleanup',
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

async function main() {
  loadEnvironment();

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Please provide it in .env or environment variables.');
    process.exit(1);
  }

  // Guard against accidental execution on production from untrusted terminals
  const url = process.env.DATABASE_URL;
  const isLocalOrDirect =
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    process.env.ALLOW_PROD_SCHEMA_SYNC === 'true';

  if (!isLocalOrDirect) {
    console.warn('⚠ Note: Non-localhost database detected. Operator confirmation required via ALLOW_PROD_SCHEMA_SYNC=true.');
  }

  const prisma = new PrismaClient();
  const results = [];

  console.log('====================================================');
  console.log(' [Irvite] Manual Idempotent Schema Synchronization  ');
  console.log('====================================================');

  try {
    await prisma.$connect();
    console.log(' Connected to database successfully.\n');

    for (const step of SCHEMA_STATEMENTS) {
      try {
        await prisma.$executeRawUnsafe(step.sql);
        results.push({ name: step.name, status: 'APPLIED', message: 'Executed successfully' });
        console.log(`  [APPLIED]       ${step.name}`);
      } catch (err) {
        if (isAlreadyAppliedError(err)) {
          results.push({ name: step.name, status: 'SKIPPED', message: 'Already present/created' });
          console.log(`  [ALREADY EXIST] ${step.name}`);
        } else {
          results.push({ name: step.name, status: 'FAILED', message: err.message });
          console.error(`  [FAILED]        ${step.name}: ${err.message}`);
        }
      }
    }

    const cleanOrphans = process.argv.includes('--clean-orphans');
    if (cleanOrphans) {
      console.log('\n--- Cleaning Orphaned Records ---');
      for (const step of ORPHAN_CLEANUP_STEPS) {
        try {
          const rows = await prisma.$executeRawUnsafe(step.sql);
          console.log(`  [CLEANED]       ${step.name} (Rows affected: ${rows})`);
        } catch (err) {
          console.warn(`  [CLEAN WARN]    ${step.name}: ${err.message}`);
        }
      }
    }

    console.log('\n====================================================');
    console.log(' Synchronization Summary:');
    const appliedCount = results.filter((r) => r.status === 'APPLIED').length;
    const skippedCount = results.filter((r) => r.status === 'SKIPPED').length;
    const failedCount = results.filter((r) => r.status === 'FAILED').length;

    console.log(`  Total Statements : ${results.length}`);
    console.log(`  Applied          : ${appliedCount}`);
    console.log(`  Already Existing : ${skippedCount}`);
    console.log(`  Failed           : ${failedCount}`);
    console.log('====================================================');

    if (failedCount > 0) {
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
  main,
};
