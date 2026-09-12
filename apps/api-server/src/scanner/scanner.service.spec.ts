/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { ScannerService } from './scanner.service';
import { PrismaService } from '../database/prisma.service';
import { Role } from 'database';

describe('ScannerService', () => {
  let service: ScannerService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScannerService,
        {
          provide: PrismaService,
          useValue: {
            event: { findMany: jest.fn() },
            user: { findUnique: jest.fn() },
            staffEvent: { findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<ScannerService>(ScannerService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('SUPER_ADMIN should see all published events', async () => {
    jest
      .spyOn(prisma.event, 'findMany')
      .mockResolvedValueOnce([{ id: '1' }] as any);
    const result = await service.getScannerEvents('user1', Role.SUPER_ADMIN);
    expect(result.data).toHaveLength(1);
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PUBLISHED' } }),
    );
  });

  it('ADMIN should see only owned published events', async () => {
    jest
      .spyOn(prisma.event, 'findMany')
      .mockResolvedValueOnce([{ id: '2' }] as any);
    const result = await service.getScannerEvents('admin1', Role.ADMIN);
    expect(result.data).toHaveLength(1);
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'admin1', status: 'PUBLISHED' },
      }),
    );
  });

  it('STAFF assigned to event should see published events', async () => {
    jest
      .spyOn(prisma.user, 'findUnique')
      .mockResolvedValueOnce({ id: 'staff1' } as any);
    jest
      .spyOn(prisma.staffEvent, 'findMany')
      .mockResolvedValueOnce([{ eventId: 'e1' }] as any);
    jest
      .spyOn(prisma.event, 'findMany')
      .mockResolvedValueOnce([{ id: 'e1' }] as any);

    const result = await service.getScannerEvents('staff1', Role.STAFF);
    expect(result.data).toHaveLength(1);
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['e1'] }, status: 'PUBLISHED' },
      }),
    );
  });

  it('STAFF unassigned should see empty array', async () => {
    jest
      .spyOn(prisma.user, 'findUnique')
      .mockResolvedValueOnce({ id: 'staff1' } as any);
    jest.spyOn(prisma.staffEvent, 'findMany').mockResolvedValueOnce([]);

    const result = await service.getScannerEvents('staff1', Role.STAFF);
    expect(result.data).toHaveLength(0);
    expect(prisma.event.findMany).not.toHaveBeenCalled();
  });

  it('inactive STAFF should see empty array', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);
    const result = await service.getScannerEvents('staff1', Role.STAFF);
    expect(result.data).toHaveLength(0);
    expect(prisma.staffEvent.findMany).not.toHaveBeenCalled();
  });
});
