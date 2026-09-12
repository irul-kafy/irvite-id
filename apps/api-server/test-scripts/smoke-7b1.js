const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Running 7B-1 Smoke Test...');
  const template = await prisma.template.create({
    data: {
      name: 'Smoke Test Template',
      themeCode: 'SMOKE',
      config: {
        version: 1,
        theme: {
          primaryColor: '#000000',
          secondaryColor: '#333333',
          backgroundColor: '#ffffff',
          textColor: '#000000'
        },
        typography: {
          headingFont: 'INTER',
          bodyFont: 'INTER'
        },
        sections: [
          { id: 'hero', enabled: true, order: 1, variant: 'default' },
          { id: 'eventDetails', enabled: true, order: 2, variant: 'default' }
        ]
      }
    }
  });

  console.log('Template created with ID:', template.id);
  const found = await prisma.template.findUnique({ where: { id: template.id } });
  console.log('Template found:', found.name);

  // Clean up
  await prisma.template.delete({ where: { id: template.id } });
  console.log('Smoke test passed and cleaned up!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
