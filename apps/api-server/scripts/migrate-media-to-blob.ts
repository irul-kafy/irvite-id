import * as fs from 'fs';
import * as path from 'path';
import { put, head } from '@vercel/blob';

async function main() {
  const isExecute = process.argv.includes('--execute');
  const isDryRun = !isExecute;

  console.log(
    `--- Vercel Blob Media Migration Tool ${isDryRun ? '(DRY RUN - pass --execute to apply)' : '(LIVE EXECUTION)'} ---`,
  );

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token && !isDryRun) {
    console.error('Error: BLOB_READ_WRITE_TOKEN environment variable is required to execute migration.');
    process.exitCode = 1;
    return;
  }

  const storagePath =
    process.env.MEDIA_STORAGE_PATH ||
    path.resolve(process.cwd(), 'storage/media');

  if (!fs.existsSync(storagePath)) {
    console.log(`Local media directory not found at: ${storagePath}. No files to migrate.`);
    return;
  }

  function walkDir(dir: string, baseDir: string): string[] {
    let files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(walkDir(fullPath, baseDir));
      } else if (entry.isFile()) {
        const relative = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        files.push(relative);
      }
    }
    return files;
  }

  const relativeFiles = walkDir(storagePath, storagePath);
  console.log(`Found ${relativeFiles.length} local media files in ${storagePath}.\n`);

  let uploadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const rel of relativeFiles) {
    const key = rel.startsWith('media/') ? rel : `media/${rel}`;
    const fullPath = path.join(storagePath, rel);

    try {
      if (isDryRun) {
        console.log(`[DRY RUN] Would upload: ${key} (${(fs.statSync(fullPath).size / 1024).toFixed(1)} KB)`);
        uploadedCount++;
      } else {
        // Check if already in Blob to be idempotent
        let exists = false;
        try {
          const meta = await head(key, { token });
          if (meta?.url) exists = true;
        } catch {
          // not found in blob
        }

        if (exists) {
          console.log(`[SKIP - ALREADY EXISTS] ${key}`);
          skippedCount++;
        } else {
          const buffer = fs.readFileSync(fullPath);
          const res = await put(key, buffer, {
            access: 'public',
            addRandomSuffix: false,
            token,
          });
          console.log(`[UPLOADED] ${key} -> ${res.url}`);
          uploadedCount++;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ERROR] Failed to process ${key}: ${msg}`);
      errorCount++;
    }
  }

  console.log(`\nMigration Summary:`);
  console.log(`  Processed: ${relativeFiles.length}`);
  console.log(`  Uploaded: ${uploadedCount}`);
  console.log(`  Skipped: ${skippedCount}`);
  console.log(`  Errors: ${errorCount}`);
}

if (require.main === module) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Fatal failure: ${msg}`);
    process.exitCode = 1;
  });
}

