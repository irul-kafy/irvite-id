import { isPublicInvitationExpired } from '../invitations/public-invitation-expiry';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role } from 'database';
import { Prisma, Event, StaffEvent } from '@prisma/client';
import { ReportsService } from '../reports/reports.service';
import { ExportQueryDto } from '../reports/dto/export-query.dto';

type EventWithStaff = Event & { staffEvents: StaffEvent[] };

export type AttendanceCheckInStatus = 'NOT_CHECKED_IN' | 'PARTIAL' | 'COMPLETE';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly db: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

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

    if (event.eventDate && isPublicInvitationExpired(event.eventDate)) {
      throw new ConflictException('Event has expired');
    }

    return event;
  }

  async exportAttendanceReport(
    eventId: string,
    currentUserId: string,
    role: Role,
    query: ExportQueryDto,
  ) {
    if (role === Role.STAFF) {
      throw new ForbiddenException(
        'Staff is not authorized to export attendance reports',
      );
    }

    const whereScope: Prisma.EventWhereInput =
      role === Role.SUPER_ADMIN
        ? { id: eventId }
        : { id: eventId, userId: currentUserId };

    const event = await this.db.event.findFirst({
      where: whereScope,
      select: {
        id: true,
        title: true,
        slug: true,
        eventDate: true,
        locationDetails: true,
        status: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.reportsService.exportAttendanceReport(eventId, event, query);
  }

  async resolve(eventId: string, userId: string, _role: Role, code: string) {
    await this.authorizeEvent(eventId, userId);

    const invitation = await this.db.invitation.findUnique({
      where: { uniqueCode: code },
      include: {
        guest: true,
        attendances: {
          include: {
            checkIns: {
              orderBy: { scannedAt: 'desc' },
            },
          },
        },
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
    const maxPax = invitation.guest.maxPax;
    const alreadyScanned = attendance ? attendance.scannedPax : 0;
    const remainingPax = Math.max(0, maxPax - alreadyScanned);

    let status: AttendanceCheckInStatus;
    if (alreadyScanned === 0) {
      status = 'NOT_CHECKED_IN';
    } else if (alreadyScanned < maxPax) {
      status = 'PARTIAL';
    } else {
      status = 'COMPLETE';
    }

    const result = status === 'COMPLETE' ? 'ALREADY_CHECKED_IN' : 'READY';

    let rsvpResponse = 'PENDING';
    if (invitation.status === 'RSVP_YES') rsvpResponse = 'YES';
    else if (invitation.status === 'RSVP_NO') rsvpResponse = 'NO';

    return {
      result,
      status,
      scannedPax: alreadyScanned,
      remainingPax,
      guest: {
        name: invitation.guest.name,
        maxPax,
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
      checkIns: attendance?.checkIns
        ? attendance.checkIns.map((ci) => ({
            id: ci.id,
            scannedPax: ci.scannedPax,
            scannedAt: ci.scannedAt,
            scannedById: ci.scannedById,
          }))
        : [],
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

    if (pax < 1) {
      throw new BadRequestException('Pax must be at least 1');
    }

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

    const maxPax = invitation.guest.maxPax;
    if (pax > maxPax) {
      throw new BadRequestException('Pax exceeds maximum allowed');
    }

    return this.executeAtomicCheckIn(
      invitation.id,
      eventId,
      userId,
      pax,
      maxPax,
    );
  }

  private async executeAtomicCheckIn(
    invitationId: string,
    eventId: string,
    userId: string,
    pax: number,
    maxPax: number,
  ) {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.attemptAtomicCheckIn(
          invitationId,
          eventId,
          userId,
          pax,
          maxPax,
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2002' || error.code === 'P2034') &&
          attempt < maxRetries - 1
        ) {
          // Concurrent first-scan or transient write conflict: retry in a fresh transaction
          continue;
        }
        throw error;
      }
    }
    throw new ConflictException('Concurrent check-in conflict, please retry');
  }

  private async attemptAtomicCheckIn(
    invitationId: string,
    eventId: string,
    userId: string,
    pax: number,
    maxPax: number,
  ) {
    return this.db.$transaction(async (tx) => {
      const existingAttendance = await tx.attendance.findUnique({
        where: { invitationId },
      });

      const now = new Date();

      if (!existingAttendance) {
        // First scan for this invitation
        const created = await tx.attendance.create({
          data: {
            invitationId,
            eventId,
            scannedById: userId,
            scannedPax: pax,
            scannedAt: now,
            status: 'VALID',
          },
        });

        await tx.attendanceCheckIn.create({
          data: {
            attendanceId: created.id,
            scannedById: userId,
            scannedPax: pax,
            scannedAt: now,
          },
        });

        const remainingPax = maxPax - pax;
        const status: AttendanceCheckInStatus =
          remainingPax === 0 ? 'COMPLETE' : 'PARTIAL';

        return {
          result: 'CHECKED_IN' as const,
          status,
          scannedPax: pax,
          remainingPax,
          deltaPax: pax,
          attendance: {
            scannedPax: pax,
            scannedAt: now,
          },
        };
      }

      return this.applyIncrementalCheckIn(
        tx,
        existingAttendance,
        userId,
        pax,
        maxPax,
        now,
      );
    });
  }

  private async applyIncrementalCheckIn(
    tx: Prisma.TransactionClient,
    attendance: { id: string; scannedPax: number; scannedAt: Date },
    userId: string,
    pax: number,
    maxPax: number,
    now: Date,
  ) {
    if (attendance.scannedPax >= maxPax) {
      return {
        result: 'ALREADY_CHECKED_IN' as const,
        status: 'COMPLETE' as const,
        scannedPax: attendance.scannedPax,
        remainingPax: 0,
        attendance: {
          scannedPax: attendance.scannedPax,
          scannedAt: attendance.scannedAt,
        },
      };
    }

    const remainingPax = maxPax - attendance.scannedPax;
    if (pax > remainingPax) {
      throw new BadRequestException('Jumlah pax melebihi sisa kuota');
    }

    // Atomic conditional update ensuring scannedPax <= maxPax - pax
    const updateResult = await tx.attendance.updateMany({
      where: {
        id: attendance.id,
        scannedPax: {
          lte: maxPax - pax,
        },
      },
      data: {
        scannedPax: {
          increment: pax,
        },
        scannedAt: now,
        scannedById: userId,
      },
    });

    if (updateResult.count === 0) {
      // Concurrency race: capacity was taken by another concurrent scan
      const current = await tx.attendance.findUnique({
        where: { id: attendance.id },
      });
      if (current && current.scannedPax >= maxPax) {
        return {
          result: 'ALREADY_CHECKED_IN' as const,
          status: 'COMPLETE' as const,
          scannedPax: current.scannedPax,
          remainingPax: 0,
          attendance: {
            scannedPax: current.scannedPax,
            scannedAt: current.scannedAt,
          },
        };
      }
      throw new ConflictException(
        'Kapasitas tamu telah terisi oleh proses scan lain',
      );
    }

    // Read the newly persisted post-update Attendance record inside the transaction
    const updated = await tx.attendance.findUnique({
      where: { id: attendance.id },
    });

    if (!updated) {
      throw new NotFoundException('Attendance record not found');
    }

    // Insert immutable audit log
    await tx.attendanceCheckIn.create({
      data: {
        attendanceId: attendance.id,
        scannedById: userId,
        scannedPax: pax,
        scannedAt: now,
      },
    });

    const newTotal = updated.scannedPax;
    const finalRemaining = Math.max(0, maxPax - newTotal);
    const status: AttendanceCheckInStatus =
      finalRemaining === 0 ? 'COMPLETE' : 'PARTIAL';

    return {
      result: 'CHECKED_IN' as const,
      status,
      scannedPax: newTotal,
      remainingPax: finalRemaining,
      deltaPax: pax,
      attendance: {
        scannedPax: newTotal,
        scannedAt: updated.scannedAt,
      },
    };
  }
}
