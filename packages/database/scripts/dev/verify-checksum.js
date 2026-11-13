const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const migrations = await prisma.$queryRaw`SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name = '20260827230000_attendance_integrity_staff_event'`;
  
  const filePath = path.join(__dirname, 'prisma/migrations/20260827230000_attendance_integrity_staff_event/migration.sql');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Prisma checksum is sha256 of the content
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  
  console.log("File Hash:", hash);
  console.log("DB Rows:", migrations);
}

main().finally(() => prisma.$disconnect());
