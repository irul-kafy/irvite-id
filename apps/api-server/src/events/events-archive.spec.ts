/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../database/prisma.service';
import { Role } from 'database';
import { NotFoundException } from '@nestjs/common';
import { EVENT_STATUS } from './event-status';

describe('EventsService - Safe Event Archive', () => {
  let service: EventsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: PrismaService,
          useValue: {
            event: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            media: { findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('DRAFT -> ARCHIVED updates status and preserves event row', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({
      id: 'e1',
      status: EVENT_STATUS.DRAFT,
    });
    (prisma.event.update as jest.Mock).mockResolvedValue({
      id: 'e1',
      status: EVENT_STATUS.ARCHIVED,
    });

    const res = await service.archive('e1', 'u1', Role.ADMIN);
    expect(res).toEqual({
      success: true,
      message: 'Event archived successfully',
    });
    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { status: EVENT_STATUS.ARCHIVED },
    });
  });

  it('PUBLISHED -> ARCHIVED updates status without deleting row', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({
      id: 'e1',
      status: EVENT_STATUS.PUBLISHED,
    });
    (prisma.event.update as jest.Mock).mockResolvedValue({
      id: 'e1',
      status: EVENT_STATUS.ARCHIVED,
    });

    const res = await service.archive('e1', 'u1', Role.ADMIN);
    expect(res).toEqual({
      success: true,
      message: 'Event archived successfully',
    });
    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { status: EVENT_STATUS.ARCHIVED },
    });
  });

  it('Already ARCHIVED -> idempotent response', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({
      id: 'e1',
      status: EVENT_STATUS.ARCHIVED,
    });

    const res = await service.archive('e1', 'u1', Role.ADMIN);
    expect(res).toEqual({
      success: true,
      message: 'Event is already archived',
    });
    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it('cross-tenant attempt -> 404 NotFoundException', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.archive('e1', 'foreign_u', Role.ADMIN),
    ).rejects.toThrow(NotFoundException);
  });

  it('SUPER_ADMIN can archive any event', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({
      id: 'e1',
      status: EVENT_STATUS.PUBLISHED,
    });
    (prisma.event.update as jest.Mock).mockResolvedValue({
      id: 'e1',
      status: EVENT_STATUS.ARCHIVED,
    });

    const res = await service.archive('e1', 'admin_u', Role.SUPER_ADMIN);
    expect(res.success).toBe(true);
    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'e1' } }),
    );
  });

  it('resolvePublic denies access for ARCHIVED event (throws 404)', async () => {
    (prisma.event.findUnique as jest.Mock).mockResolvedValue({
      id: 'e1',
      slug: 'archived-event',
      status: EVENT_STATUS.ARCHIVED,
      eventDate: new Date(Date.now() + 86400000),
    });

    await expect(service.resolvePublic('archived-event')).rejects.toThrow(
      NotFoundException,
    );
  });
});
