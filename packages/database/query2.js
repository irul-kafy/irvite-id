const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const replacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;
  const res1 = await prisma.$queryRaw`SHOW CREATE TABLE attendances`;
  console.log("attendances:", JSON.stringify(res1, replacer, 2));

  const res2 = await prisma.$queryRaw`SHOW CREATE TABLE staff_events`;
  console.log("staff_events:", JSON.stringify(res2, replacer, 2));
}

main().finally(() => prisma.$disconnect());
