/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { PrismaService } from '../database/prisma.service';
import { Role } from 'database';

describe('StaffService', () => {
  let service: StaffService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        {
          provide: PrismaService,
          useValue: {
            user: { findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch active staff candidates and omit passwordHash', async () => {
    jest
      .spyOn(prisma.user, 'findMany')
      .mockResolvedValueOnce([{ id: '1', email: 's@s.com' }] as any);
    const result = await service.getCandidates();

    expect(result.data).toHaveLength(1);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { role: Role.STAFF, isActive: true },
      select: { id: true, email: true },
      orderBy: [{ email: 'asc' }, { id: 'asc' }],
    });
  });
});
