import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { put, del, head } from '@vercel/blob';

@Injectable()
export class MediaStorageService {
  private readonly logger = new Logger(MediaStorageService.name);
  private readonly storageRoot: string;
  private readonly isBlobConfigured: boolean;
  private readonly blobToken?: string;

  constructor() {
    this.blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    this.isBlobConfigured = Boolean(this.blobToken);

    // Read at construction, after ConfigModule has loaded .env.
    const storagePath = process.env.MEDIA_STORAGE_PATH;
    const defaultDir = process.env.VERCEL
      ? path.resolve('/tmp', 'storage/media')
      : path.resolve(process.cwd(), 'storage/media');
    this.storageRoot = storagePath ? path.resolve(storagePath) : defaultDir;

    // Ensure directory exists (ignore read-only FS errors in serverless environments)
    try {
      if (!fs.existsSync(this.storageRoot)) {
        fs.mkdirSync(this.storageRoot, { recursive: true });
      }
    } catch {
      // Handled gracefully at write/read time with DB fallback
    }

    if (this.isBlobConfigured) {
      this.logger.log('Vercel Blob storage driver initialized for persistent media.');
    } else {
      this.logger.log(`Local disk storage driver initialized at: ${this.storageRoot}`);
    }
  }

  isBlob(): boolean {
    return this.isBlobConfigured;
  }

  generateKey(ext: string): string {
    const uuid = crypto.randomUUID();
    return `media/${uuid}.${ext}`;
  }

  resolvePath(key: string): string {
    // Normalize and resolve the absolute target path
    const target = path.resolve(this.storageRoot, key);
    const relative = path.relative(this.storageRoot, target);

    // Path containment check (security critical)
    if (
      relative.startsWith('..') ||
      path.isAbsolute(relative) ||
      relative === ''
    ) {
      throw new InternalServerErrorException(
        'Invalid storage key or path containment failure',
      );
    }

    return target;
  }

  async writeFile(key: string, buffer: Buffer): Promise<void> {
    const target = this.resolvePath(key);
    const dir = path.dirname(target);

    try {
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      await fs.promises.writeFile(target, buffer);
    } catch (err) {
      // In serverless if disk write fails, throw only if blob is not configured
      if (!this.isBlobConfigured) throw err;
    }

    if (this.isBlobConfigured) {
      try {
        await put(key, buffer, {
          access: 'public',
          addRandomSuffix: false,
          token: this.blobToken,
        });
        this.logger.debug(`File persisted to Vercel Blob: ${key}`);
      } catch (blobErr) {
        this.logger.error(`Vercel Blob put failed for ${key}:`, blobErr);
        if (!fs.existsSync(target)) {
          throw new InternalServerErrorException('Failed to write media to permanent storage');
        }
      }
    }
  }

  async deleteFile(key: string): Promise<void> {
    const target = this.resolvePath(key);

    try {
      if (fs.existsSync(target)) {
        await fs.promises.unlink(target);
      }
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        this.logger.warn(`Failed to unlink local file ${target}: ${err.message}`);
      }
    }

    if (this.isBlobConfigured) {
      try {
        await del(key, { token: this.blobToken });
      } catch (blobErr) {
        this.logger.warn(`Vercel Blob delete failed for ${key}:`, blobErr);
      }
    }
  }

  async ensureFileLocal(key: string): Promise<string> {
    const target = this.resolvePath(key);
    if (fs.existsSync(target)) {
      return target;
    }

    if (this.isBlobConfigured) {
      try {
        const blobMeta = await head(key, { token: this.blobToken });
        if (blobMeta?.downloadUrl) {
          const resp = await fetch(blobMeta.downloadUrl);
          if (resp.ok) {
            const arrayBuf = await resp.arrayBuffer();
            const buf = Buffer.from(arrayBuf);
            const dir = path.dirname(target);
            if (!fs.existsSync(dir)) {
              await fs.promises.mkdir(dir, { recursive: true });
            }
            await fs.promises.writeFile(target, buf);
            this.logger.debug(`Rehydrated missing local file from Vercel Blob: ${key}`);
            return target;
          }
        }
      } catch (blobErr) {
        this.logger.debug(`Could not rehydrate from Vercel Blob for key ${key}: ${blobErr}`);
      }
    }

    return target;
  }

  async getFileStat(key: string): Promise<fs.Stats> {
    await this.ensureFileLocal(key);
    const target = this.resolvePath(key);
    return fs.promises.stat(target);
  }

  createReadStream(
    key: string,
    options?: { start?: number; end?: number },
  ): fs.ReadStream {
    const target = this.resolvePath(key);
    return fs.createReadStream(target, options);
  }
}
