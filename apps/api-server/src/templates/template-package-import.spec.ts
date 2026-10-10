/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { TemplatesService } from './templates.service';

const manifest = JSON.stringify({
  schemaVersion: 1,
  name: 'Imported Garden',
  themeCode: 'IMPORTED_GARDEN',
  renderer: 'GENERIC',
  assets: { thumbnail: 'thumbnail.png' },
  config: {
    version: 1,
    theme: {
      primaryColor: '#173F5F',
      secondaryColor: '#C9A86A',
      backgroundColor: '#F5F0E8',
      textColor: '#20242A',
    },
    typography: { headingFont: 'PLAYFAIR_DISPLAY', bodyFont: 'INTER' },
    sections: [
      { id: 'eventDetails', enabled: true, order: 1, variant: 'default' },
    ],
  },
});

describe('TemplatesService package import', () => {
  it('stores validated assets and creates a hidden generic-renderer template', async () => {
    const tx = {
      template: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) => ({ id: 'tpl-1', ...data })),
      },
      templateAsset: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      template: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    };
    const storage = {
      generateKey: jest.fn().mockReturnValue('media/asset.png'),
      writeFile: jest.fn().mockResolvedValue(undefined),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    const service = new TemplatesService(prisma as never, storage as never);
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    const result = await service.importPackage(
      manifest,
      JSON.stringify([{ fieldName: 'asset_0', slot: 'thumbnail', order: 0 }]),
      [
        { fieldname: 'asset_0', size: png.length, buffer: png },
      ] as Express.Multer.File[],
    );

    expect(storage.writeFile).toHaveBeenCalledWith('media/asset.png', png);
    expect(tx.template.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Imported Garden',
        themeCode: 'IMPORTED_GARDEN',
        renderer: 'GENERIC',
        status: 'HIDDEN',
      }),
    });
    expect(result).toMatchObject({
      id: 'tpl-1',
      status: 'HIDDEN',
      assetCount: 1,
    });
  });

  it('removes written files when the database transaction fails', async () => {
    const prisma = {
      template: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn().mockRejectedValue(new Error('DB failure')),
    };
    const storage = {
      generateKey: jest.fn().mockReturnValue('media/asset.png'),
      writeFile: jest.fn().mockResolvedValue(undefined),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    const service = new TemplatesService(prisma as never, storage as never);
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    await expect(
      service.importPackage(
        manifest,
        JSON.stringify([{ fieldName: 'asset_0', slot: 'thumbnail', order: 0 }]),
        [
          { fieldname: 'asset_0', size: png.length, buffer: png },
        ] as Express.Multer.File[],
      ),
    ).rejects.toThrow('DB failure');
    expect(storage.deleteFile).toHaveBeenCalledWith('media/asset.png');
  });
});
