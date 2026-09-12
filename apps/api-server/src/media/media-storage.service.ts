import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { MEDIA_STORAGE_PATH } from './media.constants';

@Injectable()
export class MediaStorageService {
  private readonly storageRoot: string;

  constructor() {
    this.storageRoot = MEDIA_STORAGE_PATH
      ? path.resolve(MEDIA_STORAGE_PATH)
      : path.resolve(process.cwd(), 'storage/media');

    // Ensure directory exists
    if (!fs.existsSync(this.storageRoot)) {
      fs.mkdirSync(this.storageRoot, { recursive: true });
    }
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

    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    await fs.promises.writeFile(target, buffer);
  }

  async deleteFile(key: string): Promise<void> {
    const target = this.resolvePath(key);

    try {
      await fs.promises.unlink(target);
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        // Missing file -> idempotent success
        return;
      }
      // Unexpected permission/I/O error -> throw to MediaService
      throw error;
    }
  }

  async getFileStat(key: string): Promise<fs.Stats> {
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
