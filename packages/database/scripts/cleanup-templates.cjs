const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const APPROVED_CODES = ['SEKAR_KEDATON', 'AETHERIA', 'OPALINE_NOCTURNE', 'RANAH_CINTA'];

async function run() {
  console.log('--- Cleaning up templates in database ---');

  // 1. Get fallback template (Sekar Kedaton)
  const fallback = await prisma.template.findFirst({
    where: { themeCode: 'SEKAR_KEDATON' }
  });

  if (!fallback) {
    throw new Error('Sekar Kedaton template not found in DB!');
  }

  // 2. Find templates not in approved list
  const templatesToRemove = await prisma.template.findMany({
    where: {
      themeCode: { notIn: APPROVED_CODES }
    },
    include: {
      events: true,
      assets: true
    }
  });

  console.log(`Found ${templatesToRemove.length} templates to remove from DB:`, templatesToRemove.map(t => t.themeCode));

  for (const t of templatesToRemove) {
    // Reassign events to fallback
    if (t.events.length > 0) {
      console.log(`Reassigning ${t.events.length} events from ${t.themeCode} to ${fallback.themeCode}...`);
      await prisma.event.updateMany({
        where: { templateId: t.id },
        data: { templateId: fallback.id }
      });
    }

    // Delete any template assets
    if (t.assets.length > 0) {
      console.log(`Deleting ${t.assets.length} assets for ${t.themeCode}...`);
      await prisma.templateAsset.deleteMany({
        where: { templateId: t.id }
      });
    }

    // Delete template
    await prisma.template.delete({
      where: { id: t.id }
    });
    console.log(`Deleted template: ${t.themeCode} (${t.name})`);
  }

  // Verify remaining templates
  const remaining = await prisma.template.findMany({
    select: { id: true, themeCode: true, name: true, status: true }
  });

  console.log('\nRemaining templates in DB:');
  console.table(remaining);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
