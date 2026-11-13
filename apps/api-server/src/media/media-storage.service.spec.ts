import { Test, TestingModule } from '@nestjs/testing';
import { MediaStorageService } from './media-storage.service';
import * as path from 'path';
import * as fs from 'fs';
import { InternalServerErrorException } from '@nestjs/common';
import * as vercelBlob from '@vercel/blob';

jest.mock('@vercel/blob', () => ({
  put: jest.fn().mockResolvedValue({ url: 'https://blob.vercel-storage.com/test.png' }),
  del: jest.fn().mockResolvedValue(undefined),
  head: jest.fn().mockResolvedValue({ downloadUrl: 'https://blob.vercel-storage.com/test.png', size: 4 }),
}));

describe('MediaStorageService', () => {
  let service: MediaStorageService;
  const originalEnv = process.env.MEDIA_STORAGE_PATH;
  const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

  beforeEach(async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.MEDIA_STORAGE_PATH = path.join(__dirname, 'test-storage');

    const module: TestingModule = await Test.createTestingModule({
      providers: [MediaStorageService],
    }).compile();

    service = module.get<MediaStorageService>(MediaStorageService);
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.MEDIA_STORAGE_PATH;
    else process.env.MEDIA_STORAGE_PATH = originalEnv;

    if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;

    const testDir = path.join(__dirname, 'test-storage');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.isBlob()).toBe(false);
  });

  it('uses the storage location configured after module import', () => {
    expect(service.resolvePath('media/configured.png')).toBe(
      path.join(__dirname, 'test-storage', 'media', 'configured.png'),
    );
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

  it('writes and deletes a valid file on local disk', async () => {
    const key = 'media/real-file.png';
    await service.writeFile(key, Buffer.from('test'));
    expect(fs.existsSync(service.resolvePath(key))).toBe(true);
    await service.deleteFile(key);
    expect(fs.existsSync(service.resolvePath(key))).toBe(false);
  });

  describe('Vercel Blob Integration', () => {
    let blobService: MediaStorageService;

    beforeEach(async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-blob-token-123';
      const module: TestingModule = await Test.createTestingModule({
        providers: [MediaStorageService],
      }).compile();
      blobService = module.get<MediaStorageService>(MediaStorageService);
    });

    it('enables blob mode when BLOB_READ_WRITE_TOKEN is set', () => {
      expect(blobService.isBlob()).toBe(true);
    });

    it('calls vercel blob put on writeFile', async () => {
      const key = 'media/blob-file.png';
      await blobService.writeFile(key, Buffer.from('test-content'));

      expect(vercelBlob.put).toHaveBeenCalledWith(
        key,
        expect.any(Buffer),
        expect.objectContaining({
          access: 'public',
          addRandomSuffix: false,
          token: 'test-blob-token-123',
        }),
      );
    });

    it('calls vercel blob del on deleteFile', async () => {
      const key = 'media/blob-delete.png';
      await blobService.deleteFile(key);

      expect(vercelBlob.del).toHaveBeenCalledWith(
        key,
        expect.objectContaining({
          token: 'test-blob-token-123',
        }),
      );
    });
  });
});
