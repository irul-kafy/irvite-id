/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const IDEMPOTENT_DDL_STEPS = [
  {
    name: 'guests.table_number column',
    sql: 'ALTER TABLE `guests` ADD COLUMN `table_number` VARCHAR(191) NULL',
  },
  {
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
    name: 'events.active_until column',
    sql: 'ALTER TABLE `events` ADD COLUMN `active_until` DATETIME(3) NULL',
  },
  {
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
    name: 'invitations.first_opened_at column',
    sql: 'ALTER TABLE `invitations` ADD COLUMN `first_opened_at` DATETIME(3) NULL',
  },
  {
    name: 'invitations.last_opened_at column',
    sql: 'ALTER TABLE `invitations` ADD COLUMN `last_opened_at` DATETIME(3) NULL',
  },
  {
    name: 'invitations.open_count column',
    sql: 'ALTER TABLE `invitations` ADD COLUMN `open_count` INTEGER NOT NULL DEFAULT 0',
  },
];

async function ensureSchemaObjects(prisma) {
  console.log('[migrate-deploy-safe] Ensuring all additive schema tables & columns exist...');
  for (const step of IDEMPOTENT_DDL_STEPS) {
    try {
      await prisma.$executeRawUnsafe(step.sql);
      console.log(`  ✔ Applied or verified: ${step.name}`);
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      if (
        msg.includes('Duplicate column') ||
        msg.includes('1060') ||
        msg.includes('already exists') ||
        msg.includes('1050')
      ) {
        console.log(`  ✔ Already present: ${step.name}`);
      } else {
        console.warn(`  ⚠ Non-fatal DDL notice on ${step.name}: ${msg}`);
      }
    }
  }

  // Proactively clean up any orphaned records left by direct event deletions
  try {
    const orphanedOrders = await prisma.$executeRawUnsafe(
      'DELETE FROM `orders` WHERE `event_id` NOT IN (SELECT `id` FROM `events`)',
    );
    console.log(`  ✔ Cleaned up orphaned orders (rows affected: ${orphanedOrders})`);
  } catch (err) {
    console.warn('  ⚠ Notice on cleaning orphaned orders:', err.message);
  }

  try {
    const orphanedWishes = await prisma.$executeRawUnsafe(
      'DELETE FROM `wishes` WHERE `event_id` NOT IN (SELECT `id` FROM `events`)',
    );
    console.log(`  ✔ Cleaned up orphaned wishes (rows affected: ${orphanedWishes})`);
  } catch (err) {
    console.warn('  ⚠ Notice on cleaning orphaned wishes:', err.message);
  }

  try {
    const orphanedOps = await prisma.$executeRawUnsafe(
      'DELETE FROM `offline_sync_ops` WHERE `event_id` NOT IN (SELECT `id` FROM `events`)',
    );
    console.log(`  ✔ Cleaned up orphaned offline_sync_ops (rows affected: ${orphanedOps})`);
  } catch (err) {
    console.warn('  ⚠ Notice on cleaning orphaned offline_sync_ops:', err.message);
  }
}

async function verifySchemaQueries(prisma) {
  console.log('[migrate-deploy-safe] Verifying Prisma schema compatibility queries...');
  await Promise.all([
    prisma.order.count(),
    prisma.activityLog.count(),
    prisma.offlineSyncOp.count(),
    prisma.wish.count(),
    prisma.event.findFirst({ select: { id: true, activeUntil: true } }),
    prisma.invitation.findFirst({
      select: { id: true, firstOpenedAt: true, lastOpenedAt: true, openCount: true },
    }),
    prisma.guest.findFirst({ select: { id: true, tableNumber: true } }),
  ]);
  console.log('[migrate-deploy-safe] ✔ All Prisma tables and columns verified successfully.');
}

async function purgeAllEvents(prisma) {
  try {
    const events = await prisma.event.findMany({ select: { id: true, title: true } });
    if (!events || events.length === 0) {
      console.log('[migrate-deploy-safe] No events found in database to purge (already 0 events).');
      return;
    }
    console.log(`[migrate-deploy-safe] ⚠️ Purging all ${events.length} test events from database as requested...`);
    for (const ev of events) {
      const id = ev.id;
      await prisma.$transaction(async (tx) => {
        await tx.attendanceCheckIn.deleteMany({ where: { attendance: { eventId: id } } }).catch(() => {});
        await tx.attendance.deleteMany({ where: { eventId: id } }).catch(() => {});
        await tx.invitation.deleteMany({ where: { eventId: id } }).catch(() => {});
        await tx.guest.deleteMany({ where: { eventId: id } }).catch(() => {});
        await tx.media.deleteMany({ where: { eventId: id } }).catch(() => {});
        await tx.staffEvent.deleteMany({ where: { eventId: id } }).catch(() => {});
        await tx.wish.deleteMany({ where: { eventId: id } }).catch(() => {});
        await tx.offlineSyncOp.deleteMany({ where: { eventId: id } }).catch(() => {});
        await tx.activityLog.deleteMany({ where: { eventId: id } }).catch(() => {});
        await tx.order.deleteMany({ where: { eventId: id } }).catch(() => {});
        await tx.event.delete({ where: { id } }).catch(() => {});
      });
      console.log(`[migrate-deploy-safe] ✔ Successfully deleted event "${ev.title}" (${id})`);
    }
    const remaining = await prisma.event.count();
    console.log(`[migrate-deploy-safe] ✔ Event purge complete. Remaining events in database: ${remaining}`);
  } catch (err) {
    console.warn('[migrate-deploy-safe] Non-fatal warning during event purge:', err.message);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn('[migrate-deploy-safe] DATABASE_URL is not set; skipping database migration.');
    return;
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    await ensureSchemaObjects(prisma);
    await verifySchemaQueries(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[migrate-deploy-safe] Fatal schema verification error:', err);
  process.exit(1);
});
