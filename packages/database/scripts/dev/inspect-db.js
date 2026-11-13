const { PrismaClient } = require('@prisma/client');

async function inspectDb() {
  const prisma = new PrismaClient();
  try {
    const eventsTable = await prisma.$queryRawUnsafe(`SHOW CREATE TABLE events`);
    console.log("--- SHOW CREATE TABLE events ---");
    console.log(eventsTable[0]['Create Table']);

    const templatesTable = await prisma.$queryRawUnsafe(`SHOW CREATE TABLE templates`);
    console.log("\n--- SHOW CREATE TABLE templates ---");
    console.log(templatesTable[0]['Create Table']);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

inspectDb();
