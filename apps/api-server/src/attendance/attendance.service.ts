import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role } from 'database';
import { Prisma, Event, StaffEvent } from '@prisma/client';

type EventWithStaff = Event & { staffEvents: StaffEvent[] };

@Injectable()
export class AttendanceService {
  constructor(private readonly db: PrismaService) {}

  private async authorizeEvent(
    eventId: string,
    userId: string,
  ): Promise<EventWithStaff> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException('Event not found'); // Opaque error for inactive/non-existent
    }

    const event = await this.db.event.findUnique({
      where: { id: eventId },
      include: {
        staffEvents: {
          where: { userId },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    let authorized = false;
    if (user.role === Role.SUPER_ADMIN) {
      authorized = true;
    } else if (user.role === Role.ADMIN && event.userId === userId) {
      authorized = true;
    } else if (user.role === Role.STAFF && event.staffEvents.length > 0) {
      authorized = true;
    }

    if (!authorized) {
      throw new NotFoundException('Event not found'); // Opaque error
    }

    if (event.status !== 'PUBLISHED') {
      throw new ConflictException('Event is not PUBLISHED');
    }

    return event;
  }

  async resolve(eventId: string, userId: string, _role: Role, code: string) {
    await this.authorizeEvent(eventId, userId);

    const invitation = await this.db.invitation.findUnique({
      where: { uniqueCode: code },
      include: {
        guest: true,
        attendances: true,
      },
    });

    if (
      !invitation ||
      !invitation.guest ||
      invitation.guest.eventId !== eventId
    ) {
      throw new NotFoundException('Invitation not found for this event');
    }

    const attendance = invitation.attendances?.[0] || null;

    let rsvpResponse = 'PENDING';
    if (invitation.status === 'RSVP_YES') rsvpResponse = 'YES';
    else if (invitation.status === 'RSVP_NO') rsvpResponse = 'NO';

    return {
      result: attendance ? 'ALREADY_CHECKED_IN' : 'READY',
      guest: {
        name: invitation.guest.name,
        maxPax: invitation.guest.maxPax,
      },
      rsvp: {
        response: rsvpResponse,
        pax: rsvpResponse === 'YES' ? invitation.rsvpPax : null,
      },
      attendance: attendance
        ? {
            scannedPax: attendance.scannedPax,
            scannedAt: attendance.scannedAt,
          }
        : null,
    };
  }

  async checkIn(
    eventId: string,
    userId: string,
    _role: Role,
    code: string,
    pax: number,
  ) {
    await this.authorizeEvent(eventId, userId);

    const invitation = await this.db.invitation.findUnique({
      where: { uniqueCode: code },
      include: { guest: true },
    });

    if (
      !invitation ||
      !invitation.guest ||
      invitation.guest.eventId !== eventId
    ) {
      throw new NotFoundException('Invitation not found for this event');
    }

    if (pax > invitation.guest.maxPax) {
      throw new BadRequestException('Pax exceeds maximum allowed');
    }

    try {
      const newAttendance = await this.db.attendance.create({
        data: {
          invitationId: invitation.id,
          eventId: eventId,
          scannedById: userId,
          scannedPax: pax,
          scannedAt: new Date(),
          status: 'VALID',
        },
      });

      return {
        result: 'CHECKED_IN',
        attendance: {
          scannedPax: newAttendance.scannedPax,
          scannedAt: newAttendance.scannedAt,
        },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034')
      ) {
        // Target specifically the invitation uniqueness constraint if available
        const target = error.meta?.target;
        if (
          error.code === 'P2034' || // Deadlocks are assumed to be this conflict in this atomic operation
          (Array.isArray(target) && target.includes('invitationId')) ||
          target === 'attendances_invitation_id_key' ||
          (typeof target === 'string' && target.includes('invitation_id'))
        ) {
          const existing = await this.db.attendance.findUnique({
            where: { invitationId: invitation.id },
          });

          if (!existing) {
            throw new ConflictException(
              'Concurrent check-in conflict but row disappeared',
            );
          }

          return {
            result: 'ALREADY_CHECKED_IN',
            attendance: {
              scannedPax: existing.scannedPax,
              scannedAt: existing.scannedAt,
            },
          };
        }
      }
      throw error;
    }
  }
}
