import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

// Load .env from monorepo root
const repoRoot = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.resolve(repoRoot, '.env') });
dotenv.config();

const EXPECTED_DB_NAME = 'digital_invitation_platform';
const ALLOWED_HOSTS = ['localhost', '127.0.0.1'];

function parseCliArgs() {
  const args = process.argv.slice(2);
  return {
    confirmDevPurge: args.includes('--confirm-dev-purge'),
    databaseArg: args.find((a) => a.startsWith('--database='))?.split('=')[1],
    execute: args.includes('--execute'),
  };
}

function resolveMediaPhysicalPath(key: string, storageRoot: string): { resolvedPath: string; exists: boolean } {
  // Candidate 1: direct under storageRoot
  const p1 = path.resolve(storageRoot, key);
  if (fs.existsSync(p1)) {
    return { resolvedPath: p1, exists: true };
  }

  // Candidate 2: if key begins with media/ or media\
  if (key.startsWith('media/') || key.startsWith('media\\')) {
    const stripped = key.replace(/^media[\\/]/, '');
    const p2 = path.resolve(storageRoot, stripped);
    if (fs.existsSync(p2)) {
      return { resolvedPath: p2, exists: true };
    }
  }

  // Candidate 3: storage parent directory
  const p3 = path.resolve(path.dirname(storageRoot), key);
  if (fs.existsSync(p3)) {
    return { resolvedPath: p3, exists: true };
  }

  // Fallback to p1
  return { resolvedPath: p1, exists: false };
}

async function main() {
  console.log('='.repeat(70));
  console.log('DEV/UAT EVENT PURGE TOOL');
  console.log('='.repeat(70));

  const flags = parseCliArgs();

  // GUARD 1: Refuse unless NODE_ENV !== 'production'
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    console.error('\n[ABORT] Guard 1 Violation: NODE_ENV is set to "production". Purge refused.');
    process.exit(1);
  }

  // GUARD 2: DATABASE_URL hostname MUST be exactly 'localhost' or '127.0.0.1'
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('\n[ABORT] Guard 2 Violation: DATABASE_URL is not set.');
    process.exit(1);
  }

  let dbHost = '';
  let dbNameFromUrl = '';
  try {
    const parsedUrl = new URL(databaseUrl);
    dbHost = parsedUrl.hostname.toLowerCase();
    dbNameFromUrl = parsedUrl.pathname.replace(/^\//, '');
  } catch (err: unknown) {
    console.error(`\n[ABORT] Guard 2 Violation: Unable to parse DATABASE_URL: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  if (!ALLOWED_HOSTS.includes(dbHost)) {
    console.error(
      `\n[ABORT] Guard 2 Violation: DATABASE_URL hostname is "${dbHost}". ` +
      `It MUST be exactly 'localhost' or '127.0.0.1'. Substring match is strictly forbidden. Purge refused.`
    );
    process.exit(1);
  }

  // Initialize Prisma Client
  const prisma = new PrismaClient();

  try {
    // GUARD 3: Connected database name MUST be exactly 'digital_invitation_platform'
    const dbNameResult = await prisma.$queryRawUnsafe<Array<{ db: string }>>('SELECT DATABASE() as db');
    const connectedDb = dbNameResult[0]?.db || dbNameFromUrl;

    if (connectedDb !== EXPECTED_DB_NAME) {
      console.error(
        `\n[ABORT] Guard 3 Violation: Connected database is "${connectedDb}". ` +
        `Expected exactly "${EXPECTED_DB_NAME}". Purge refused.`
      );
      process.exit(1);
    }

    // GUARD 4: Require explicit flag --confirm-dev-purge
    if (!flags.confirmDevPurge) {
      console.error('\n[ABORT] Guard 4 Violation: Missing mandatory confirmation flag: --confirm-dev-purge');
      process.exit(1);
    }

    // GUARD 5: Require explicit confirmation value --database=digital_invitation_platform
    if (flags.databaseArg !== EXPECTED_DB_NAME) {
      console.error(
        `\n[ABORT] Guard 5 Violation: Missing or invalid database confirmation flag: ` +
        `expected --database=${EXPECTED_DB_NAME}, got ${flags.databaseArg ? `--database=${flags.databaseArg}` : 'none'}`
      );
      process.exit(1);
    }

    // Guardrails passed!
    console.log(`[PASS] Guard 1 (Environment): NODE_ENV="${nodeEnv}"`);
    console.log(`[PASS] Guard 2 (Host): Host="${dbHost}" (Strictly localhost/127.0.0.1)`);
    console.log(`[PASS] Guard 3 (Database): Connected DB="${connectedDb}" (Strictly ${EXPECTED_DB_NAME})`);
    console.log(`[PASS] Guard 4 (Flag): --confirm-dev-purge present`);
    console.log(`[PASS] Guard 5 (Flag): --database=${flags.databaseArg} verified`);

    // Resolve media storage directory
    const storageRoot = process.env.MEDIA_STORAGE_PATH
      ? path.resolve(process.env.MEDIA_STORAGE_PATH)
      : path.resolve(repoRoot, 'storage/media');

    // Collect data for audit / execution
    const [
      eventCount,
      guestCount,
      invitationCount,
      attendanceCount,
      checkInCount,
      mediaCount,
      staffEventCount,
      userCount,
      templateCount,
      events,
      medias,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.guest.count(),
      prisma.invitation.count(),
      prisma.attendance.count(),
      prisma.attendanceCheckIn.count(),
      prisma.media.count(),
      prisma.staffEvent.count(),
      prisma.user.count(),
      prisma.template.count(),
      prisma.event.findMany({
        select: { id: true, title: true, status: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.media.findMany({
        select: { id: true, eventId: true, url: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const scheduledMediaFiles = medias.map((m) => {
      const { resolvedPath, exists } = resolveMediaPhysicalPath(m.url, storageRoot);
      return {
        id: m.id,
        key: m.url,
        resolvedPath,
        existsOnDisk: exists,
      };
    });

    const isExecuteMode = flags.execute === true;

    // Report
    console.log('\n' + '-'.repeat(70));
    console.log(`OPERATION MODE: ${isExecuteMode ? '*** DESTRUCTIVE EXECUTION ***' : 'DRY RUN ONLY (No mutations)'}`);
    console.log('-'.repeat(70));
    console.log(`Target Host:            ${dbHost}`);
    console.log(`Target Database:        ${connectedDb}`);
    console.log(`Storage Media Path:     ${storageRoot}`);
    console.log('');
    console.log('EVENT-SCOPED DATA SCHEDULED FOR PURGE:');
    console.log(`  Events:               ${eventCount}`);
    console.log(`  Guests:               ${guestCount}`);
    console.log(`  Invitations:          ${invitationCount}`);
    console.log(`  Attendances:          ${attendanceCount}`);
    console.log(`  AttendanceCheckIns:   ${checkInCount}`);
    console.log(`  Media Records:        ${mediaCount}`);
    console.log(`  StaffEvent Links:     ${staffEventCount}`);
    console.log('');
    console.log('PRESERVED SYSTEM DATA (WILL REMAIN UNTOUCHED):');
    console.log(`  Users:                ${userCount}`);
    console.log(`  Templates:            ${templateCount}`);
    console.log('  Migrations History:   PRESERVED (No schema resets, drops, or truncate)');
    console.log('  Config/Auth Data:     PRESERVED');
    console.log('');
    console.log('SCHEDULED EVENT LIST:');
    if (events.length === 0) {
      console.log('  (No events found in database)');
    } else {
      events.forEach((ev, i) => {
        console.log(`  ${i + 1}. [${ev.status}] ID: ${ev.id} - "${ev.title}"`);
      });
    }
    console.log('');
    console.log('SCHEDULED MEDIA FILES FOR PHYSICAL REMOVAL:');
    if (scheduledMediaFiles.length === 0) {
      console.log('  (No media files registered)');
    } else {
      scheduledMediaFiles.forEach((mf, i) => {
        console.log(
          `  ${i + 1}. Key: "${mf.key}" | Exists: ${mf.existsOnDisk} | Path: ${mf.resolvedPath}`
        );
      });
    }
    console.log('-'.repeat(70));

    if (!isExecuteMode) {
      console.log('\n[NOTICE] DRY RUN COMPLETE. No data was deleted or altered.');
      console.log('To perform the destructive purge, re-run with ALL three flags:');
      console.log(`  npx tsx packages/database/scripts/purge-dev-events.ts --confirm-dev-purge --database=${EXPECTED_DB_NAME} --execute\n`);
      return;
    }

    // DESTRUCTIVE EXECUTION:
    console.log('\n[STARTING DESTRUCTIVE PURGE TRANSACTION...]');

    const result = await prisma.$transaction(async (tx) => {
      // 1. attendance_check_ins
      const dCheckIns = await tx.attendanceCheckIn.deleteMany({});
      // 2. attendances
      const dAttendances = await tx.attendance.deleteMany({});
      // 3. invitations
      const dInvitations = await tx.invitation.deleteMany({});
      // 4. guests
      const dGuests = await tx.guest.deleteMany({});
      // 5. medias
      const dMedias = await tx.media.deleteMany({});
      // 6. staff_events
      const dStaffEvents = await tx.staffEvent.deleteMany({});
      // 7. events
      const dEvents = await tx.event.deleteMany({});

      return {
        checkIns: dCheckIns.count,
        attendances: dAttendances.count,
        invitations: dInvitations.count,
        guests: dGuests.count,
        medias: dMedias.count,
        staffEvents: dStaffEvents.count,
        events: dEvents.count,
      };
    });

    console.log('[SUCCESS] Database transaction committed successfully:');
    console.log(`  - Deleted ${result.checkIns} attendance_check_ins`);
    console.log(`  - Deleted ${result.attendances} attendances`);
    console.log(`  - Deleted ${result.invitations} invitations`);
    console.log(`  - Deleted ${result.guests} guests`);
    console.log(`  - Deleted ${result.medias} medias`);
    console.log(`  - Deleted ${result.staffEvents} staff_events`);
    console.log(`  - Deleted ${result.events} events`);

    // Step B: Post-transaction media file unlinking
    console.log('\n[PHYSICAL MEDIA CLEANUP...]');
    let unlinkedCount = 0;
    let failedCount = 0;

    for (const mf of scheduledMediaFiles) {
      if (mf.existsOnDisk) {
        try {
          await fs.promises.unlink(mf.resolvedPath);
          console.log(`  [UNLINKED] ${mf.resolvedPath}`);
          unlinkedCount++;
        } catch (err: unknown) {
          console.warn(`  [WARN] Failed to unlink physical file "${mf.resolvedPath}": ${err instanceof Error ? err.message : String(err)}`);
          failedCount++;
        }
      } else {
        console.log(`  [SKIPPED] File does not exist on disk: ${mf.resolvedPath}`);
      }
    }

    console.log(`\nMedia Cleanup Summary: ${unlinkedCount} unlinked, ${failedCount} warnings.`);

    // Step C: Verify remaining records
    const remainingUsers = await prisma.user.count();
    const remainingTemplates = await prisma.template.count();
    const remainingEvents = await prisma.event.count();

    console.log('\nPOST-PURGE VERIFICATION:');
    console.log(`  Events Remaining:   ${remainingEvents} (Expected: 0)`);
    console.log(`  Users Preserved:    ${remainingUsers} (Intact)`);
    console.log(`  Templates Preserved:${remainingTemplates} (Intact)`);
    console.log('\n[COMPLETE] DEV/UAT purge completed successfully.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('\n[FATAL ERROR during purge script]:', err);
  process.exit(1);
});
