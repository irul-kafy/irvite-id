import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role } from 'database';

@Injectable()
export class ScannerService {
  constructor(private readonly prisma: PrismaService) {}

  async getScannerEvents(userId: string, role: Role) {
    const select = {
      id: true,
      title: true,
      eventDate: true,
      locationDetails: true,
    };
    const orderBy = [{ eventDate: 'asc' as const }, { id: 'asc' as const }];

    if (role === Role.SUPER_ADMIN) {
      const data = await this.prisma.event.findMany({
        where: { status: 'PUBLISHED' },
        select,
        orderBy,
      });
      return { data };
    }

    if (role === Role.ADMIN) {
      const data = await this.prisma.event.findMany({
        where: { userId, status: 'PUBLISHED' },
        select,
        orderBy,
      });
      return { data };
    }

    if (role === Role.STAFF) {
      const activeUser = await this.prisma.user.findUnique({
        where: { id: userId, isActive: true, role: Role.STAFF },
        select: { id: true },
      });

      if (!activeUser) {
        return { data: [] };
      }

      const assignedEvents = await this.prisma.staffEvent.findMany({
        where: { userId },
        select: { eventId: true },
      });

      if (assignedEvents.length === 0) {
        return { data: [] };
      }

      const eventIds = assignedEvents.map((e) => e.eventId);

      const data = await this.prisma.event.findMany({
        where: {
          id: { in: eventIds },
          status: 'PUBLISHED',
        },
        select,
        orderBy,
      });

      return { data };
    }

    return { data: [] };
  }
}
