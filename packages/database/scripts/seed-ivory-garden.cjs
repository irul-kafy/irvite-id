/*
 * Idempotently adds the fixed Ivory Garden template when it is missing.
 *
 * Run from the repository root after supplying a development DATABASE_URL:
 *   DATABASE_URL="mysql://..." node packages/database/scripts/seed-ivory-garden.cjs
 *
 * The script intentionally never updates an existing IVORY_GARDEN record, so
 * edits made by an administrator remain untouched.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ivoryGardenConfig = {
  version: 1,
  theme: {
    primaryColor: '#4A5741',
    secondaryColor: '#A38A59',
    backgroundColor: '#F8F4EB',
    textColor: '#343B30',
  },
  typography: {
    headingFont: 'PLAYFAIR_DISPLAY',
    bodyFont: 'LORA',
  },
  sections: [
    { id: 'hero', enabled: true, order: 1, variant: 'default' },
    { id: 'greeting', enabled: true, order: 2, variant: 'default' },
    { id: 'eventDetails', enabled: true, order: 3, variant: 'default' },
    { id: 'countdown', enabled: true, order: 4, variant: 'default' },
    { id: 'gallery', enabled: true, order: 5, variant: 'default' },
    { id: 'location', enabled: true, order: 6, variant: 'default' },
    { id: 'rsvp', enabled: true, order: 7, variant: 'default' },
    { id: 'guestQr', enabled: false, order: 8, variant: 'default' },
    { id: 'closing', enabled: true, order: 9, variant: 'default' },
  ],
};

async function seedIvoryGarden() {
  const existing = await prisma.template.findFirst({
    where: { themeCode: 'IVORY_GARDEN' },
    select: { id: true },
  });

  if (existing) {
    process.stdout.write('IVORY_GARDEN already exists; no changes made.\n');
    return;
  }

  await prisma.template.create({
    data: {
      name: 'Ivory Garden',
      themeCode: 'IVORY_GARDEN',
      previewImageUrl: '/templates/ivory-garden/garden.png',
      config: ivoryGardenConfig,
    },
  });

  process.stdout.write('Created fixed template IVORY_GARDEN.\n');
}

seedIvoryGarden()
  .catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown seed failure';
    process.stderr.write(`Unable to seed IVORY_GARDEN: ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
