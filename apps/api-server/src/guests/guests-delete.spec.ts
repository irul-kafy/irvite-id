/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { GuestsService } from './guests.service';
import { PrismaService } from '../database/prisma.service';
import { ReportsService } from '../reports/reports.service';
import { Role } from 'database';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('GuestsService - Safe Guest Delete', () => {
  let service: GuestsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestsService,
        {
          provide: PrismaService,
          useValue: {
            event: { findFirst: jest.fn() },
            guest: { findFirst: jest.fn(), delete: jest.fn() },
            invitation: { delete: jest.fn() },
            $transaction: jest.fn().mockImplementation((cb) =>
              cb({
                invitation: { delete: jest.fn() },
                guest: { delete: jest.fn() },
              }),
            ),
          },
        },
        {
          provide: ReportsService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<GuestsService>(GuestsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('owner deletes eligible guest without invitation -> success', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: 'e1' });
    (prisma.guest.findFirst as jest.Mock).mockResolvedValue({
      id: 'g1',
      eventId: 'e1',
      name: 'John Doe',
      invitation: null,
    });

    const res = await service.delete('e1', 'g1', 'u1', Role.ADMIN);
    expect(res).toEqual({
      success: true,
      message: 'Guest deleted successfully',
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('owner deletes eligible guest with invitation but no attendances -> success in transaction', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: 'e1' });
    (prisma.guest.findFirst as jest.Mock).mockResolvedValue({
      id: 'g1',
      eventId: 'e1',
      name: 'Jane Doe',
      invitation: {
        id: 'i1',
        attendances: [],
      },
    });

    const res = await service.delete('e1', 'g1', 'u1', Role.ADMIN);
    expect(res).toEqual({
      success: true,
      message: 'Guest deleted successfully',
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('SUPER_ADMIN deletes eligible guest -> success', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: 'e1' });
    (prisma.guest.findFirst as jest.Mock).mockResolvedValue({
      id: 'g1',
      eventId: 'e1',
      name: 'VIP Guest',
      invitation: null,
    });

    const res = await service.delete('e1', 'g1', 'super_u', Role.SUPER_ADMIN);
    expect(res.success).toBe(true);
  });

  it('guest with completed attendance -> 409 ConflictException and preserved', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: 'e1' });
    (prisma.guest.findFirst as jest.Mock).mockResolvedValue({
      id: 'g1',
      eventId: 'e1',
      name: 'Checked In Guest',
      invitation: {
        id: 'i1',
        attendances: [{ id: 'att1', scannedPax: 2, scannedAt: new Date() }],
      },
    });

    await expect(service.delete('e1', 'g1', 'u1', Role.ADMIN)).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('cross-tenant request -> 404 NotFoundException', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.delete('e1', 'g1', 'other_user', Role.ADMIN),
    ).rejects.toThrow(NotFoundException);
  });

  it('guest not found in event -> 404 NotFoundException', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({ id: 'e1' });
    (prisma.guest.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.delete('e1', 'g_unknown', 'u1', Role.ADMIN),
    ).rejects.toThrow(NotFoundException);
  });
});
