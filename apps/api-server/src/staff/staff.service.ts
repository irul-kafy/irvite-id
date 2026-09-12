import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role } from 'database';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async getCandidates() {
    const data = await this.prisma.user.findMany({
      where: {
        role: Role.STAFF,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
      },
      orderBy: [{ email: 'asc' }, { id: 'asc' }],
    });

    return { data };
  }
}
