import * as fs from 'fs';
import { head } from '@vercel/blob';
import { Prisma, PrismaClient } from 'database';
import { MediaStorageService } from '../src/media/media-storage.service';

export interface MediaFallbackMigrationLogger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
}

export interface MediaFallbackMigrationSummary {
  scannedEvents: number;
  migratedEvents: number;
  migratedFiles: number;
  failedFiles: number;
  eventResults: Array<{
    eventId: string;
    migratedKeys: string[];
    failedKeys: string[];
    removedFallbackObject: boolean;
  }>;
}

export interface RunMediaFallbackMigrationOptions {
  prisma: {
    event: {
      findMany: (args: {
        select: { id: true };
        orderBy?: { createdAt: 'asc' | 'desc' };
      }) => Promise<Array<{ id: string }>>;
      findUnique: (args: {
        where: { id: string };
        select: { id: true; content: true };
      }) => Promise<{ id: string; content: Prisma.JsonValue } | null>;
      update: (args: {
        where: { id: string };
        data: { content: Prisma.InputJsonObject };
      }) => Promise<unknown>;
    };
  };
  mediaStorageService: Pick<
    MediaStorageService,
    'writeFile' | 'ensureFileLocal' | 'isBlob'
  >;
  env?: NodeJS.ProcessEnv;
  logger?: MediaFallbackMigrationLogger;
}

const defaultLogger: MediaFallbackMigrationLogger = {
  info: (msg: string) => process.stdout.write(`${msg}\n`),
  warn: (msg: string) => process.stderr.write(`[WARN] ${msg}\n`),
  error: (msg: string) => process.stderr.write(`[ERROR] ${msg}\n`),
};

async function verifyPersistedFile(
  key: string,
  expectedByteLength: number,
  mediaStorageService: Pick<MediaStorageService, 'ensureFileLocal' | 'isBlob'>,
  blobToken?: string,
): Promise<boolean> {
  if (mediaStorageService.isBlob()) {
    const meta = await head(key, { token: blobToken });
    if (!meta || (!meta.url && !meta.downloadUrl)) {
      return false;
    }
    if (typeof meta.size === 'number' && meta.size <= 0) {
      return false;
    }
  }

  const localTarget = await mediaStorageService.ensureFileLocal(key);
  if (!localTarget || !fs.existsSync(localTarget)) {
    // When running in Blob mode, if head() succeeded with matching size > 0, allow even if /tmp rehydration was skipped
    if (mediaStorageService.isBlob()) {
      return true;
    }
    return false;
  }

  const stat = await fs.promises.stat(localTarget);
  return stat.size === expectedByteLength && stat.size > 0;
}

/**
 * One-shot migration utility for legacy Event.content._mediaFallback base64 entries.
 * - Aborts immediately in production (or VERCEL) if BLOB_READ_WRITE_TOKEN is missing.
 * - Fetches event IDs first and loads/processes one event at a time to avoid loading all Event.content blobs in memory.
 * - Verifies each file is written via head() / ensureFileLocal() BEFORE removing that key from _mediaFallback.
 */
export async function runMediaFallbackMigration(
  options: RunMediaFallbackMigrationOptions,
): Promise<MediaFallbackMigrationSummary> {
  const env = options.env ?? process.env;
  const logger = options.logger ?? defaultLogger;
  const blobToken = env.BLOB_READ_WRITE_TOKEN?.trim() || undefined;
  const isProdOrVercel =
    env.NODE_ENV === 'production' ||
    (Boolean(env.VERCEL && String(env.VERCEL).trim() !== '') &&
      String(env.VERCEL).trim() !== '0' &&
      String(env.VERCEL).trim().toLowerCase() !== 'false');

  if (isProdOrVercel && !blobToken) {
    throw new Error(
      'Aborted: BLOB_READ_WRITE_TOKEN is required to run migrate-media-fallback in production.',
    );
  }

  const eventIds = await options.prisma.event.findMany({
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  let scannedEvents = 0;
  let migratedEvents = 0;
  let migratedFiles = 0;
  let failedFiles = 0;
  const eventResults: MediaFallbackMigrationSummary['eventResults'] = [];

  for (const row of eventIds) {
    scannedEvents += 1;
    const ev = await options.prisma.event.findUnique({
      where: { id: row.id },
      select: { id: true, content: true },
    });

    if (
      !ev ||
      !ev.content ||
      typeof ev.content !== 'object' ||
      Array.isArray(ev.content) ||
      !('_mediaFallback' in ev.content)
    ) {
      continue;
    }

    const contentObj = { ...(ev.content as Record<string, unknown>) };
    const rawFallback = contentObj._mediaFallback;
    if (
      !rawFallback ||
      typeof rawFallback !== 'object' ||
      Array.isArray(rawFallback)
    ) {
      delete contentObj._mediaFallback;
      await options.prisma.event.update({
        where: { id: ev.id },
        data: { content: contentObj as Prisma.InputJsonObject },
      });
      migratedEvents += 1;
      eventResults.push({
        eventId: ev.id,
        migratedKeys: [],
        failedKeys: [],
        removedFallbackObject: true,
      });
      continue;
    }

    const remainingFallback: Record<string, unknown> = {
      ...(rawFallback as Record<string, unknown>),
    };
    const migratedKeys: string[] = [];
    const failedKeys: string[] = [];

    for (const [rawKey, base64Val] of Object.entries(remainingFallback)) {
      const cleanKey = typeof rawKey === 'string' ? rawKey.trim() : '';
      if (
        !cleanKey ||
        typeof base64Val !== 'string' ||
        base64Val.trim().length === 0
      ) {
        delete remainingFallback[rawKey];
        continue;
      }

      const buffer = Buffer.from(base64Val.trim(), 'base64');
      if (buffer.length === 0) {
        delete remainingFallback[rawKey];
        continue;
      }

      try {
        await options.mediaStorageService.writeFile(cleanKey, buffer);
        const verified = await verifyPersistedFile(
          cleanKey,
          buffer.length,
          options.mediaStorageService,
          blobToken,
        );
        if (!verified) {
          throw new Error(
            `Verification failed after writeFile for key "${cleanKey}"`,
          );
        }

        delete remainingFallback[rawKey];
        migratedKeys.push(cleanKey);
        migratedFiles += 1;
        logger.info(
          `[OK] Event ${ev.id}: persisted and verified "${cleanKey}" (${buffer.length} bytes)`,
        );
      } catch (err: unknown) {
        failedKeys.push(cleanKey);
        failedFiles += 1;
        logger.error(
          `[FAIL] Event ${ev.id}: keeping _mediaFallback key "${cleanKey}" because write/verification failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const remainingCount = Object.keys(remainingFallback).length;
    const removedFallbackObject = remainingCount === 0;

    if (migratedKeys.length > 0 || removedFallbackObject) {
      if (removedFallbackObject) {
        delete contentObj._mediaFallback;
      } else {
        contentObj._mediaFallback = remainingFallback;
      }

      await options.prisma.event.update({
        where: { id: ev.id },
        data: { content: contentObj as Prisma.InputJsonObject },
      });
      migratedEvents += 1;
    }

    eventResults.push({
      eventId: ev.id,
      migratedKeys,
      failedKeys,
      removedFallbackObject,
    });
  }

  logger.info(
    `Media fallback migration finished: scannedEvents=${scannedEvents}, migratedEvents=${migratedEvents}, migratedFiles=${migratedFiles}, failedFiles=${failedFiles}`,
  );

  return {
    scannedEvents,
    migratedEvents,
    migratedFiles,
    failedFiles,
    eventResults,
  };
}

async function main() {
  const prisma = new PrismaClient();
  const mediaStorageService = new MediaStorageService();

  try {
    const summary = await runMediaFallbackMigration({
      prisma,
      mediaStorageService,
      env: process.env,
    });
    if (summary.failedFiles > 0) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Fatal failure in migrate-media-fallback: ${msg}\n`);
    process.exitCode = 1;
  });
}
