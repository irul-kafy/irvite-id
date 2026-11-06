import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ClientPortalService } from './client-portal.service';
import { ClientPortalWaService } from './client-portal-wa.service';

describe('ClientPortalWaService', () => {
  let service: ClientPortalWaService;
  let clientPortalServiceMock: {
    getPortalData: jest.Mock;
  };
  let prismaMock: {
    guest: {
      findUnique: jest.Mock;
    };
    invitation: {
      update: jest.Mock;
    };
    event: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    clientPortalServiceMock = {
      getPortalData: jest.fn().mockResolvedValue({
        event: { id: 'evt-123', title: 'Pernikahan Budi & Ani', clientKey: 'key-123' },
        guests: [],
      }),
    };

    prismaMock = {
      guest: {
        findUnique: jest.fn(),
      },
      invitation: {
        update: jest.fn(),
      },
      event: {
        findUnique: jest.fn().mockResolvedValue({ title: 'Pernikahan Budi & Ani' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientPortalWaService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ClientPortalService, useValue: clientPortalServiceMock },
      ],
    }).compile();

    service = module.get<ClientPortalWaService>(ClientPortalWaService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('Spintax & Text Generation', () => {
    it('generates distinct greeting variations across indices', () => {
      const v0 = service.generateSpintaxText('Budi', 'Acara Kami', 'https://irvite.id/to/1', 0);
      const v1 = service.generateSpintaxText('Budi', 'Acara Kami', 'https://irvite.id/to/1', 1);
      const v2 = service.generateSpintaxText('Budi', 'Acara Kami', 'https://irvite.id/to/1', 2);
      const v3 = service.generateSpintaxText('Budi', 'Acara Kami', 'https://irvite.id/to/1', 3);

      expect(v0).toContain('Budi');
      expect(v0).toContain('https://irvite.id/to/1');
      expect(v1).toContain('Salam hangat');
      expect(v2).toContain('Keluarga');
      expect(v3).toContain('Yth.');
      expect(v0).not.toEqual(v1);
    });

    it('honors custom greeting when provided', () => {
      const custom = service.generateSpintaxText(
        'Budi',
        'Acara Kami',
        'https://irvite.id/to/1',
        0,
        'Ditunggu kehadirannya di barisan depan ya mas bro!',
      );
      expect(custom).toContain('Ditunggu kehadirannya di barisan depan ya mas bro!');
    });
  });

  describe('Phone Number Normalization', () => {
    it('normalizes local Indonesian format to international 62 format', () => {
      expect(service.normalizePhone('081234567890')).toBe('6281234567890');
      expect(service.normalizePhone('81234567890')).toBe('6281234567890');
      expect(service.normalizePhone('+62 812-3456-7890')).toBe('6281234567890');
      expect(service.normalizePhone('')).toBeNull();
      expect(service.normalizePhone(null)).toBeNull();
    });
  });

  describe('Session & Queue Management', () => {
    it('returns disconnected status when no active session exists', async () => {
      const status = await service.getSessionStatus('evt-nonexistent', 'key-123');
      expect(status.status).toBe('disconnected');
      expect(status.phoneNumber).toBeNull();
    });

    it('returns idle queue status when no queue is active', () => {
      const queue = service.getQueueStatus('evt-123');
      expect(queue.status).toBe('idle');
      expect(queue.total).toBe(0);
      expect(queue.sentCount).toBe(0);
    });

    it('controls queue pause and stop correctly', () => {
      const queue = service.controlQueue('evt-123', 'pause');
      expect(queue.status).toBe('idle');
    });

    it('rejects pairing code request with invalid phone number', async () => {
      await expect(
        service.requestPairingCode('evt-123', 'key-123', 'abc'),
      ).rejects.toThrow('Nomor WhatsApp tidak valid');
    });

    it('rejects direct guest send when WhatsApp is not connected', async () => {
      prismaMock.guest.findUnique.mockResolvedValue({
        id: 'gst-1',
        name: 'Budi',
        eventId: 'evt-123',
        phoneNumber: '081234567890',
        invitation: { id: 'inv-1', uniqueCode: 'budi123', status: 'PENDING' },
      });

      await expect(
        service.sendGuestDirectMessage('evt-123', 'gst-1', 'key-123'),
      ).rejects.toThrow('WhatsApp pengirim belum terhubung');
    });
  });
});

