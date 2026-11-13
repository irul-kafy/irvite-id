const { PrismaClient } = require('@prisma/client');
async function getVersion() {
  const p = new PrismaClient();
  const res = await p.$queryRawUnsafe('SELECT VERSION()');
  console.log(res);
  await p.$disconnect();
}
getVersion();
