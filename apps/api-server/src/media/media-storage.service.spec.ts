import { Test, TestingModule } from '@nestjs/testing';
import { MediaStorageService } from './media-storage.service';
import * as path from 'path';
import * as fs from 'fs';
import { InternalServerErrorException } from '@nestjs/common';

describe('MediaStorageService', () => {
  let service: MediaStorageService;
  const originalEnv = process.env.MEDIA_STORAGE_PATH;

  beforeEach(async () => {
    process.env.MEDIA_STORAGE_PATH = path.join(__dirname, 'test-storage');

    const module: TestingModule = await Test.createTestingModule({
      providers: [MediaStorageService],
    }).compile();

    service = module.get<MediaStorageService>(MediaStorageService);
  });

  afterEach(() => {
    process.env.MEDIA_STORAGE_PATH = originalEnv;
    const testDir = path.join(__dirname, 'test-storage');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('valid key resolves inside root', () => {
    const key = 'media/test-uuid.png';
    const target = service.resolvePath(key);
    expect(target.startsWith(service['storageRoot'])).toBe(true);
  });

  it('rejects ../../ escape', () => {
    expect(() => service.resolvePath('../../outside.png')).toThrow(
      InternalServerErrorException,
    );
  });

  it('rejects absolute escaping key', () => {
    expect(() => service.resolvePath('/etc/passwd')).toThrow(
      InternalServerErrorException,
    );
  });

  it('missing file deletion succeeds', async () => {
    await expect(
      service.deleteFile('media/does-not-exist.png'),
    ).resolves.not.toThrow();
  });

  it('writes and deletes a valid file', async () => {
    const key = 'media/real-file.png';
    await service.writeFile(key, Buffer.from('test'));
    expect(fs.existsSync(service.resolvePath(key))).toBe(true);
    await service.deleteFile(key);
    expect(fs.existsSync(service.resolvePath(key))).toBe(false);
  });
});
