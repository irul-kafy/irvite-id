import { Test, TestingModule } from '@nestjs/testing';
import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';

describe('ClientPortalController', () => {
  let controller: ClientPortalController;
  let service: {
    getPortalData: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getPortalData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientPortalController],
      providers: [{ provide: ClientPortalService, useValue: service }],
    }).compile();

    controller = module.get<ClientPortalController>(ClientPortalController);
  });

  describe('getPortalData', () => {
    it('rethrows HttpException instances unchanged', async () => {
      service.getPortalData.mockRejectedValue(
        new UnauthorizedException('Kunci akses portal klien tidak valid.'),
      );

      await expect(
        controller.getPortalData('evt-1', 'bad-key'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('logs unexpected errors on server and returns generic InternalServerErrorException without leaking message or stack', async () => {
      const internalErr = new Error(
        'SELECT * FROM guests failed: secret DB host 10.0.0.42',
      );
      internalErr.stack = 'Error: secret DB host 10.0.0.42\n    at Prisma...';
      service.getPortalData.mockRejectedValue(internalErr);

      const loggerSpy = jest
        .spyOn(
          (controller as unknown as { logger: { error: jest.Mock } }).logger,
          'error',
        )
        .mockImplementation(() => {});

      let caught: unknown;
      try {
        await controller.getPortalData('evt-1', 'valid-key');
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(InternalServerErrorException);
      const httpErr = caught as InternalServerErrorException;
      const response = httpErr.getResponse();
      const serialized = JSON.stringify(response);

      expect(serialized).not.toContain('10.0.0.42');
      expect(serialized).not.toContain('SELECT * FROM guests');
      expect(serialized).not.toContain('stack');
      expect(serialized).not.toContain('details');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('10.0.0.42'),
        expect.stringContaining('10.0.0.42'),
      );
    });
  });
});
