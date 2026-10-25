const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const templates = await prisma.template.findMany({
    select: { id: true, themeCode: true, name: true, status: true, previewImageUrl: true }
  });
  console.log('TEMPLATES IN DB:');
  console.table(templates);

  const events = await prisma.event.findMany({
    select: { id: true, slug: true, title: true, templateId: true, template: { select: { themeCode: true } } }
  });
  console.log('\nEVENTS IN DB:');
  console.table(events.map(e => ({ id: e.id, slug: e.slug, title: e.title, templateId: e.templateId, themeCode: e.template?.themeCode })));

  const invs = await prisma.invitation.findMany({
    take: 10,
    include: { event: { select: { slug: true, title: true } }, guest: true }
  });
  console.log('\nALL INVITATIONS:');
  console.table(invs.map(i => ({ id: i.id, uniqueCode: i.uniqueCode, event: i.event?.slug, guest: i.guest?.name })));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
