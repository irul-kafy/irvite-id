const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const events = await prisma.event.findMany();
  console.log('Events in DB:', events);
  if (events.length > 0) {
    await prisma.event.deleteMany();
    console.log('Deleted orphaned events');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
