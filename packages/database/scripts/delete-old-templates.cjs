const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Migrating events using old templates...');

  const sereneGarden = await prisma.template.findFirst({ where: { themeCode: 'SERENE_GARDEN' } });
  const sekarKedaton = await prisma.template.findFirst({ where: { themeCode: 'SEKAR_KEDATON' } });

  if (!sereneGarden || !sekarKedaton) {
    throw new Error('Target codex templates not found in DB!');
  }

  // Update events
  const ivoryEvents = await prisma.template.findFirst({
    where: { themeCode: 'IVORY_GARDEN' },
    include: { events: true }
  });
  if (ivoryEvents && ivoryEvents.events.length > 0) {
    for (const ev of ivoryEvents.events) {
      await prisma.event.update({
        where: { id: ev.id },
        data: { templateId: sereneGarden.id }
      });
      console.log(`Updated event ${ev.slug} from IVORY_GARDEN to SERENE_GARDEN`);
    }
  }

  const sundaEvents = await prisma.template.findFirst({
    where: { themeCode: 'SUNDA_PUSPA' },
    include: { events: true }
  });
  if (sundaEvents && sundaEvents.events.length > 0) {
    for (const ev of sundaEvents.events) {
      await prisma.event.update({
        where: { id: ev.id },
        data: { templateId: sekarKedaton.id }
      });
      console.log(`Updated event ${ev.slug} from SUNDA_PUSPA to SEKAR_KEDATON`);
    }
  }

  const classicEvents = await prisma.template.findFirst({
    where: { themeCode: 'CLASSIC_LETTER' },
    include: { events: true }
  });
  if (classicEvents && classicEvents.events.length > 0) {
    for (const ev of classicEvents.events) {
      await prisma.event.update({
        where: { id: ev.id },
        data: { templateId: sereneGarden.id }
      });
      console.log(`Updated event ${ev.slug} from CLASSIC_LETTER to SERENE_GARDEN`);
    }
  }

  // Delete old templates
  const deleteResult = await prisma.template.deleteMany({
    where: {
      themeCode: {
        in: ['IVORY_GARDEN', 'SUNDA_PUSPA', 'CLASSIC_LETTER']
      }
    }
  });
  console.log(`Deleted ${deleteResult.count} old templates from DB.`);

  const remaining = await prisma.template.findMany({
    select: { themeCode: true, name: true, status: true }
  });
  console.log('Remaining templates in DB (should be 9 codex templates):', remaining);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
