/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsService } from './invitations.service';
import { PrismaService } from '../database/prisma.service';
import { PublicInvitationAccessService } from './public-invitation-access.service';
import { Role } from 'database';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { EVENT_STATUS } from '../events/event-status';

describe('InvitationsService - Bulk Generation', () => {
  let service: InvitationsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: PrismaService,
          useValue: {
            event: {
              findFirst: jest.fn(),
            },
            guest: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
            },
            invitation: {
              findMany: jest.fn(),
              create: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: PublicInvitationAccessService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('0 guests -> returns 0 counts', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({
      id: 'e1',
      status: 'PUBLISHED',
    });
    (prisma.guest.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.bulkCreate('e1', 'u1', Role.ADMIN);
    expect(result).toEqual({
      totalGuests: 0,
      created: 0,
      alreadyExisting: 0,
      failed: 0,
    });
    expect(prisma.invitation.create).not.toHaveBeenCalled();
  });

  it('all guests already have invitations -> 0 created, all alreadyExisting', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({
      id: 'e1',
      status: 'PUBLISHED',
    });
    (prisma.guest.findMany as jest.Mock).mockResolvedValue([
      { id: 'g1', invitation: { id: 'i1' } },
      { id: 'g2', invitation: { id: 'i2' } },
    ]);

    const result = await service.bulkCreate('e1', 'u1', Role.ADMIN);
    expect(result).toEqual({
      totalGuests: 2,
      created: 0,
      alreadyExisting: 2,
      failed: 0,
    });
    expect(prisma.invitation.create).not.toHaveBeenCalled();
  });

  it('mixed existing/missing -> creates only for guests without invitation', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({
      id: 'e1',
      status: 'PUBLISHED',
    });
    (prisma.guest.findMany as jest.Mock).mockResolvedValue([
      { id: 'g1', invitation: { id: 'i1' } },
      { id: 'g2', invitation: null },
      { id: 'g3', invitation: null },
    ]);
    (prisma.invitation.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ id: 'inv-' + data.guestId, ...data }),
    );

    const result = await service.bulkCreate('e1', 'u1', Role.ADMIN);
    expect(result).toEqual({
      totalGuests: 3,
      created: 2,
      alreadyExisting: 1,
      failed: 0,
    });
    expect(prisma.invitation.create).toHaveBeenCalledTimes(2);
  });

  it('all missing -> creates invitations for all guests', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({
      id: 'e1',
      status: 'PUBLISHED',
    });
    (prisma.guest.findMany as jest.Mock).mockResolvedValue([
      { id: 'g1', invitation: null },
      { id: 'g2', invitation: null },
      { id: 'g3', invitation: null },
    ]);
    (prisma.invitation.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ id: 'inv-' + data.guestId, ...data }),
    );

    const result = await service.bulkCreate('e1', 'u1', Role.ADMIN);
    expect(result).toEqual({
      totalGuests: 3,
      created: 3,
      alreadyExisting: 0,
      failed: 0,
    });
    expect(prisma.invitation.create).toHaveBeenCalledTimes(3);
  });

  it('cross-tenant or wrong event -> 404 NotFoundException', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.bulkCreate('foreign-event', 'u1', Role.ADMIN),
    ).rejects.toThrow(NotFoundException);
  });

  it('archived event -> 409 ConflictException', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({
      id: 'e1',
      status: EVENT_STATUS.ARCHIVED,
    });

    await expect(service.bulkCreate('e1', 'u1', Role.ADMIN)).rejects.toThrow(
      ConflictException,
    );
  });

  it('SUPER_ADMIN access allowed for any event', async () => {
    (prisma.event.findFirst as jest.Mock).mockResolvedValue({
      id: 'e1',
      status: 'PUBLISHED',
    });
    (prisma.guest.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.bulkCreate('e1', 'admin_id', Role.SUPER_ADMIN);
    expect(result.totalGuests).toBe(0);
    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'e1' } }),
    );
  });
});
