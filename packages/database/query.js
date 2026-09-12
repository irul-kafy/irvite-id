const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.$queryRaw`SELECT migration_name, checksum, started_at, finished_at, rolled_back_at, applied_steps_count FROM _prisma_migrations`;
  const replacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;
  console.log(JSON.stringify(res, replacer, 2));

  const duplicateGroups = await prisma.$queryRaw`SELECT invitation_id, COUNT(*) as c FROM attendances GROUP BY invitation_id HAVING c > 1`;
  console.log("Duplicate Groups:", JSON.stringify(duplicateGroups, replacer, 2));

  const counts = {
    User: await prisma.user.count(),
    SUPER_ADMIN: await prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
    ADMIN: await prisma.user.count({ where: { role: 'ADMIN' } }),
    STAFF: await prisma.user.count({ where: { role: 'STAFF' } }),
    StaffEvent: await prisma.staffEvent.count(),
    Event: await prisma.event.count(),
    Guest: await prisma.guest.count(),
    Invitation: await prisma.invitation.count(),
    Attendance: await prisma.attendance.count(),
    Template: await prisma.template.count(),
    Media: await prisma.media.count()
  };
  console.log("Counts:", JSON.stringify(counts, null, 2));
}

main().finally(() => prisma.$disconnect());
