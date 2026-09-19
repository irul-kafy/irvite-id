import { PrismaClient } from 'database';
import { syncTemplateIdentities } from '../src/templates/sync-templates';

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(
    `--- Template Identity Sync Tool ${isDryRun ? '(DRY RUN MODE)' : ''} ---`,
  );

  const prisma = new PrismaClient();

  try {
    const results = await syncTemplateIdentities(prisma, { dryRun: isDryRun });

    console.log('\nSync Results:');
    for (const r of results) {
      console.log(
        `  [${r.action}] ${r.themeCode} -> "${r.name}" (ID: ${r.templateId || 'N/A'})`,
      );
    }
    console.log('\nTemplate synchronization finished successfully.');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`\nSync failed: ${msg}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Unexpected failure: ${msg}`);
    process.exitCode = 1;
  });
}
