import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role } from 'database';
import { Prisma } from '@prisma/client';

@Injectable()
export class StaffEventsService {
  constructor(private readonly db: PrismaService) {}

  private async authorizeEventManagement(
    eventId: string,
    currentUser: { id: string; role: string },
  ): Promise<void> {
    if (currentUser.role === Role.STAFF) {
      throw new ForbiddenException('STAFF cannot manage assignments');
    }

    const event = await this.db.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (currentUser.role === Role.ADMIN && event.userId !== currentUser.id) {
      throw new NotFoundException('Event not found'); // Hide existence to prevent IDOR
    }

    if (
      currentUser.role !== Role.SUPER_ADMIN &&
      currentUser.role !== Role.ADMIN
    ) {
      throw new ForbiddenException('Unauthorized role');
    }
  }

  async getStaffForEvent(
    eventId: string,
    currentUser: { id: string; role: string },
  ) {
    await this.authorizeEventManagement(eventId, currentUser);

    const assignments = await this.db.staffEvent.findMany({
      where: { eventId },
      orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    return {
      data: assignments.map((a) => ({
        userId: a.userId,
        email: a.user.email,
        role: a.user.role,
        isActive: a.user.isActive,
        createdAt: a.createdAt,
      })),
    };
  }

  async assignStaff(
    eventId: string,
    targetUserId: string,
    currentUser: { id: string; role: string },
  ) {
    await this.authorizeEventManagement(eventId, currentUser);

    const targetUser = await this.db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    if (targetUser.role !== Role.STAFF || !targetUser.isActive) {
      throw new BadRequestException(
        'Target user is not an active STAFF member',
      );
    }

    try {
      const staffEvent = await this.db.staffEvent.create({
        data: {
          eventId,
          userId: targetUserId,
        },
      });

      return {
        userId: staffEvent.userId,
        eventId: staffEvent.eventId,
        createdAt: staffEvent.createdAt,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.db.staffEvent.findUnique({
          where: {
            eventId_userId: {
              eventId,
              userId: targetUserId,
            },
          },
        });

        if (existing) {
          throw new ConflictException(
            'STAFF is already assigned to this Event',
          );
        }
      }
      throw error;
    }
  }

  async unassignStaff(
    eventId: string,
    targetUserId: string,
    currentUser: { id: string; role: string },
  ) {
    await this.authorizeEventManagement(eventId, currentUser);

    try {
      await this.db.staffEvent.delete({
        where: {
          eventId_userId: {
            eventId,
            userId: targetUserId,
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Assignment not found');
      }
      throw error;
    }
  }
}
