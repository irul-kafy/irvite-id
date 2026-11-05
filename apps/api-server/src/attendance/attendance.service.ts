import { isPublicInvitationExpired } from '../invitations/public-invitation-expiry';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
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
  private readonly logger = new Logger(AttendanceService.name);

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

  /**
   * Builds a safe, display-only event banner summary for the scanner bottom sheet.
   * Uses the event's template cover (previewImageUrl) and couple names from content.
   * Never throws: banner data is optional and must not block attendance resolution.
   */
  private async buildEventBanner(event: Event | null | undefined) {
    if (!event) return null;
    const content =
      event.content &&
      typeof event.content === 'object' &&
      !Array.isArray(event.content)
        ? (event.content as Record<string, unknown>)
        : {};
    const pick = (key: string): string | null => {
      const v = content[key];
      return typeof v === 'string' && v.trim() ? v.trim().slice(0, 80) : null;
    };

    let coverImageUrl: string | null = null;
    let templateName: string | null = null;
    if (event.templateId) {
      try {
        const template = await this.db.template?.findUnique?.({
          where: { id: event.templateId },
          select: { name: true, previewImageUrl: true },
        });
        coverImageUrl = template?.previewImageUrl || null;
        templateName = template?.name || null;
      } catch {
        coverImageUrl = null;
        templateName = null;
      }
    }

    return {
      title: event.title,
      eventDate: event.eventDate,
      locationDetails: event.locationDetails ?? null,
      partnerOneName: pick('partnerOneName'),
      partnerTwoName: pick('partnerTwoName'),
      templateName,
      coverImageUrl,
    };
  }

  async resolve(eventId: string, userId: string, _role: Role, code: string) {
    const authorizedEvent = await this.authorizeEvent(eventId, userId);

    let invitation: {
      id: string;
      status: string;
      rsvpPax: number | null;
      uniqueCode: string;
      guest: {
        id: string;
        eventId: string;
        name: string;
        maxPax: number;
        category: string;
        customGreeting: string | null;
        tableNumber?: string | null;
      } | null;
      attendances?: Array<{
        scannedPax: number;
        scannedAt: Date;
        checkIns?: Array<{
          id: string;
          scannedPax: number;
          scannedAt: Date;
          scannedById: string;
        }>;
      }>;
    } | null = null;
    try {
      invitation = await this.db.invitation.findUnique({
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
    } catch (err: unknown) {
      const isMissingCol =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        (err.code === 'P2022' || String(err.message).includes('table_number'));

      if (isMissingCol) {
        invitation = await this.db.invitation.findUnique({
          where: { uniqueCode: code },
          select: {
            id: true,
            status: true,
            rsvpPax: true,
            uniqueCode: true,
            guest: {
              select: {
                id: true,
                eventId: true,
                name: true,
                maxPax: true,
                category: true,
                customGreeting: true,
              },
            },
            attendances: {
              include: {
                checkIns: {
                  orderBy: { scannedAt: 'desc' },
                },
              },
            },
          },
        });
      } else {
        throw err;
      }
    }

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

    const eventBanner = await this.buildEventBanner(authorizedEvent);

    return {
      result,
      status,
      scannedPax: alreadyScanned,
      remainingPax,
      event: eventBanner,
      guest: {
        name: invitation.guest.name,
        maxPax,
        category: invitation.guest.category ?? null,
        customGreeting: invitation.guest.customGreeting ?? null,
        tableNumber: invitation.guest.tableNumber ?? null,
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

    let invitation: {
      id: string;
      status: string;
      rsvpPax: number | null;
      uniqueCode: string;
      guest: {
        id: string;
        eventId: string;
        name: string;
        maxPax: number;
        category?: string;
        tableNumber?: string | null;
      } | null;
    } | null = null;
    try {
      invitation = await this.db.invitation.findUnique({
        where: { uniqueCode: code },
        include: { guest: true },
      });
    } catch (err: unknown) {
      const isMissingCol =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        (err.code === 'P2022' || String(err.message).includes('table_number'));

      if (isMissingCol) {
        invitation = await this.db.invitation.findUnique({
          where: { uniqueCode: code },
          select: {
            id: true,
            status: true,
            rsvpPax: true,
            uniqueCode: true,
            guest: {
              select: {
                id: true,
                eventId: true,
                name: true,
                maxPax: true,
              },
            },
          },
        });
      } else {
        throw err;
      }
    }

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

    const result = await this.executeAtomicCheckIn(
      invitation.id,
      eventId,
      userId,
      pax,
      maxPax,
    );

    if (result.result === 'CHECKED_IN') {
      await this.dispatchGoogleSheetSync(
        eventId,
        {
          id: invitation.guest.id,
          name: invitation.guest.name,
          category: invitation.guest.category || 'REGULAR',
          maxPax: invitation.guest.maxPax,
        },
        pax,
        result.scannedPax,
        maxPax,
        result.remainingPax,
        result.status,
        userId,
      );
    }

    return {
      ...result,
      guest: {
        name: invitation.guest.name,
        maxPax: invitation.guest.maxPax,
        category: invitation.guest.category ?? null,
        tableNumber: invitation.guest.tableNumber ?? null,
      },
    };
  }

  async undoCheckIn(
    eventId: string,
    userId: string,
    _role: Role,
    code?: string,
    invitationId?: string,
    guestId?: string,
  ) {
    await this.authorizeEvent(eventId, userId);

    let invitation: {
      id: string;
      guest: {
        id: string;
        name: string;
        category: string;
        maxPax: number;
        eventId: string;
      };
    } | null = null;

    if (code && typeof code === 'string' && code.trim()) {
      invitation = await this.db.invitation.findUnique({
        where: { uniqueCode: code.trim() },
        include: { guest: true },
      });
    } else if (invitationId && typeof invitationId === 'string') {
      invitation = await this.db.invitation.findUnique({
        where: { id: invitationId },
        include: { guest: true },
      });
    } else if (guestId && typeof guestId === 'string') {
      invitation = await this.db.invitation.findFirst({
        where: { guestId, eventId },
        include: { guest: true },
      });
    } else {
      throw new BadRequestException(
        'Kode undangan, invitationId, atau guestId diperlukan untuk mengurungkan check-in.',
      );
    }

    if (
      !invitation ||
      !invitation.guest ||
      invitation.guest.eventId !== eventId
    ) {
      throw new NotFoundException(
        'Data undangan tidak ditemukan untuk acara ini',
      );
    }

    const attendance = await this.db.attendance.findUnique({
      where: { invitationId: invitation.id },
      include: {
        checkIns: {
          orderBy: { scannedAt: 'desc' },
        },
      },
    });

    if (!attendance || attendance.scannedPax <= 0) {
      throw new BadRequestException(
        'Tamu ini belum memiliki riwayat kehadiran untuk diurungkan',
      );
    }

    const maxPax = invitation.guest.maxPax;

    const rollbackResult = await this.db.$transaction(async (tx) => {
      const checkIns = await tx.attendanceCheckIn.findMany({
        where: { attendanceId: attendance.id },
        orderBy: { scannedAt: 'desc' },
      });

      let rolledBackPax = 0;
      if (checkIns.length > 0) {
        const latest = checkIns[0];
        rolledBackPax = latest.scannedPax;
        await tx.attendanceCheckIn.delete({
          where: { id: latest.id },
        });

        const remainingCheckIns = checkIns.slice(1);
        const newScannedPax = remainingCheckIns.reduce(
          (sum, c) => sum + c.scannedPax,
          0,
        );

        if (newScannedPax <= 0) {
          await tx.attendance.delete({
            where: { id: attendance.id },
          });
          return {
            result: 'UNDONE' as const,
            rolledBackPax,
            scannedPax: 0,
            remainingPax: maxPax,
            status: 'NOT_CHECKED_IN' as AttendanceCheckInStatus,
          };
        } else {
          const prevLatest = remainingCheckIns[0];
          await tx.attendance.update({
            where: { id: attendance.id },
            data: {
              scannedPax: newScannedPax,
              scannedAt: prevLatest.scannedAt,
              scannedById: prevLatest.scannedById,
            },
          });
          return {
            result: 'UNDONE' as const,
            rolledBackPax,
            scannedPax: newScannedPax,
            remainingPax: Math.max(0, maxPax - newScannedPax),
            status: 'PARTIAL' as AttendanceCheckInStatus,
          };
        }
      } else {
        rolledBackPax = attendance.scannedPax;
        await tx.attendance.delete({
          where: { id: attendance.id },
        });
        return {
          result: 'UNDONE' as const,
          rolledBackPax,
          scannedPax: 0,
          remainingPax: maxPax,
          status: 'NOT_CHECKED_IN' as AttendanceCheckInStatus,
        };
      }
    });

    // Notify Google Sheets webhook if connected
    await this.dispatchGoogleSheetSync(
      eventId,
      invitation.guest,
      -rollbackResult.rolledBackPax,
      rollbackResult.scannedPax,
      maxPax,
      rollbackResult.remainingPax,
      rollbackResult.status,
      userId,
    );

    return {
      ...rollbackResult,
      guestName: invitation.guest.name,
      message:
        'Check-in untuk ' +
        invitation.guest.name +
        ' (' +
        rollbackResult.rolledBackPax +
        ' pax) berhasil diurungkan.',
    };
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

  private async authorizeEventOperator(
    eventId: string,
    userId: string,
    _role: Role,
  ) {
    void _role;
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.isActive) {
      throw new NotFoundException('Event not found');
    }

    if (user.role === Role.SUPER_ADMIN) {
      const event = await this.db.event.findUnique({
        where: { id: eventId },
        select: { id: true, title: true, content: true },
      });
      if (!event) throw new NotFoundException('Event not found');
      return event;
    }

    const event = await this.db.event.findUnique({
      where: { id: eventId },
      include: {
        staffEvents: {
          where: { userId },
        },
      },
    });
    if (!event) throw new NotFoundException('Event not found');

    const isOwner = event.userId === userId;
    const isAssignedStaff = event.staffEvents && event.staffEvents.length > 0;

    if (!isOwner && !isAssignedStaff) {
      throw new ForbiddenException('Anda tidak memiliki akses ke acara ini');
    }

    return event;
  }

  async getLiveAttendance(eventId: string, userId: string, _role: Role) {
    void _role;
    const event = await this.authorizeEvent(eventId, userId);

    const [guests, recentAudits] = await Promise.all([
      this.db.guest.findMany({
        where: { eventId },
        select: {
          id: true,
          name: true,
          category: true,
          maxPax: true,
          customGreeting: true,
          invitation: {
            select: {
              uniqueCode: true,
              status: true,
              rsvpPax: true,
              attendances: {
                select: {
                  scannedPax: true,
                  scannedAt: true,
                  status: true,
                  staff: { select: { email: true } },
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.db.attendanceCheckIn.findMany({
        where: { attendance: { eventId } },
        select: {
          id: true,
          scannedPax: true,
          scannedAt: true,
          staff: { select: { email: true } },
          attendance: {
            select: {
              invitation: {
                select: {
                  guest: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                      maxPax: true,
                      customGreeting: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { scannedAt: 'desc' },
        take: 30,
      }),
    ]);

    let totalInvitedPax = 0;
    let checkedInGuestsCount = 0;
    let checkedInPax = 0;

    const categoryMap = new Map<
      string,
      {
        totalGuests: number;
        checkedInGuests: number;
        totalPax: number;
        checkedInPax: number;
      }
    >();

    const guestList = guests.map((g) => {
      const cat = g.category || 'REGULAR';
      totalInvitedPax += g.maxPax;

      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, {
          totalGuests: 0,
          checkedInGuests: 0,
          totalPax: 0,
          checkedInPax: 0,
        });
      }
      const catStats = categoryMap.get(cat)!;
      catStats.totalGuests += 1;
      catStats.totalPax += g.maxPax;

      const att = g.invitation?.attendances?.[0];
      const isCheckedIn = Boolean(
        att && att.scannedPax > 0 && att.status === 'VALID',
      );

      if (isCheckedIn && att) {
        checkedInGuestsCount += 1;
        checkedInPax += att.scannedPax;
        catStats.checkedInGuests += 1;
        catStats.checkedInPax += att.scannedPax;
      }

      return {
        id: g.id,
        name: g.name,
        category: cat,
        customGreeting: g.customGreeting,
        maxPax: g.maxPax,
        isCheckedIn,
        scannedPax: att?.scannedPax || 0,
        remainingPax: Math.max(0, g.maxPax - (att?.scannedPax || 0)),
        scannedAt: att?.scannedAt ? att.scannedAt.toISOString() : null,
        scannedBy: att?.staff?.email || null,
        rsvpStatus: g.invitation?.status || 'PENDING',
        rsvpPax: g.invitation?.rsvpPax || null,
      };
    });

    const remainingPax = Math.max(0, totalInvitedPax - checkedInPax);
    const checkInRate =
      totalInvitedPax > 0
        ? Number(((checkedInPax / totalInvitedPax) * 100).toFixed(1))
        : 0;

    const recentCheckIns = recentAudits.map((a) => {
      const guest = a.attendance.invitation.guest;
      return {
        id: a.id,
        guestId: guest.id,
        guestName: guest.name,
        category: guest.category || 'REGULAR',
        customGreeting: guest.customGreeting,
        scannedPax: a.scannedPax,
        maxPax: guest.maxPax,
        scannedAt: a.scannedAt.toISOString(),
        scannedBy: a.staff.email,
      };
    });

    const categories = Array.from(categoryMap.entries()).map(
      ([name, stats]) => ({
        category: name,
        ...stats,
        rate:
          stats.totalPax > 0
            ? Number(((stats.checkedInPax / stats.totalPax) * 100).toFixed(1))
            : 0,
      }),
    );

    const contentObj =
      event.content && typeof event.content === 'object'
        ? (event.content as {
            integrations?: {
              googleSheetWebhookUrl?: string | null;
              googleSheetUpdatedAt?: string | null;
            };
          })
        : {};
    const googleSheetWebhookUrl =
      contentObj.integrations?.googleSheetWebhookUrl || null;
    const googleSheetUpdatedAt =
      contentObj.integrations?.googleSheetUpdatedAt || null;

    return {
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        eventDate: event.eventDate,
        status: event.status,
      },
      summary: {
        totalGuests: guests.length,
        totalInvitedPax,
        checkedInGuests: checkedInGuestsCount,
        checkedInPax,
        remainingPax,
        checkInRate,
        recentCheckInsCount: recentCheckIns.length,
        lastRefreshedAt: new Date().toISOString(),
      },
      categories,
      recentCheckIns,
      guests: guestList,
      googleSheet: {
        connected: Boolean(googleSheetWebhookUrl),
        webhookUrl: googleSheetWebhookUrl,
        lastUpdatedAt: googleSheetUpdatedAt,
      },
    };
  }

  async getGoogleSheetConfig(eventId: string, userId: string, role: Role) {
    const event = await this.authorizeEventOperator(eventId, userId, role);

    const content =
      event.content && typeof event.content === 'object'
        ? (event.content as {
            integrations?: {
              googleSheetWebhookUrl?: string | null;
              googleSheetUpdatedAt?: string | null;
            };
          })
        : {};
    const integrations = content.integrations || {};

    return {
      connected: Boolean(integrations.googleSheetWebhookUrl),
      webhookUrl: integrations.googleSheetWebhookUrl || '',
      lastUpdatedAt: integrations.googleSheetUpdatedAt || null,
      sampleScriptTemplate: this.generateAppsScriptTemplate(event.title),
    };
  }

  async updateGoogleSheetConfig(
    eventId: string,
    userId: string,
    role: Role,
    webhookUrl?: string,
  ) {
    const event = await this.authorizeEventOperator(eventId, userId, role);

    const currentContent: Prisma.InputJsonObject =
      event.content &&
      typeof event.content === 'object' &&
      !Array.isArray(event.content)
        ? { ...(event.content as Prisma.InputJsonObject) }
        : {};
    const integrations: Prisma.InputJsonObject =
      currentContent.integrations &&
      typeof currentContent.integrations === 'object' &&
      !Array.isArray(currentContent.integrations)
        ? { ...(currentContent.integrations as Prisma.InputJsonObject) }
        : {};

    const cleanUrl = webhookUrl ? webhookUrl.trim() : null;
    const updatedContent: Prisma.InputJsonObject = {
      ...currentContent,
      integrations: {
        ...integrations,
        googleSheetWebhookUrl: cleanUrl || null,
        googleSheetUpdatedAt: new Date().toISOString(),
      },
    };

    await this.db.event.update({
      where: { id: eventId },
      data: { content: updatedContent },
    });

    return {
      success: true,
      connected: Boolean(cleanUrl),
      webhookUrl: cleanUrl || '',
      message: cleanUrl
        ? 'Webhook Google Sheets berhasil disambungkan!'
        : 'Integrasi Google Sheets berhasil dinonaktifkan.',
    };
  }

  async testGoogleSheetWebhook(eventId: string, userId: string, role: Role) {
    const event = await this.authorizeEventOperator(eventId, userId, role);

    const content =
      event.content && typeof event.content === 'object'
        ? (event.content as {
            integrations?: { googleSheetWebhookUrl?: string | null };
          })
        : {};
    const webhookUrl = content.integrations?.googleSheetWebhookUrl;

    if (
      !webhookUrl ||
      typeof webhookUrl !== 'string' ||
      !webhookUrl.startsWith('http')
    ) {
      throw new BadRequestException(
        'Tautan Webhook Google Sheets belum diatur atau tidak valid. Silakan simpan tautan terlebih dahulu.',
      );
    }

    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    try {
      const testPayload = {
        event: 'TEST_PING',
        eventId: event.id,
        eventTitle: event.title,
        guestId: 'test-guest-id',
        guestName: 'Bpk. Hendra Gunawan & Istri (TEST)',
        category: 'VIP',
        scannedPax: 2,
        totalScannedPax: 2,
        maxPax: 2,
        remainingPax: 0,
        status: 'COMPLETE',
        scannedAt: new Date().toISOString(),
        scannedBy: user?.email || 'admin@irvite.id',
        isTest: true,
      };

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok && res.status >= 400) {
        throw new Error(
          `Google endpoint mengembalikan kode HTTP ${res.status}`,
        );
      }

      return {
        success: true,
        message:
          'Koneksi ke Google Sheets berhasil diuji! Data uji coba telah terkirim.',
      };
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : 'Timeout / Network Error';
      throw new BadRequestException(
        `Gagal menghubungi endpoint Google Sheets: ${errMsg}. Pastikan URL Webhook benar dan dapat diakses publik.`,
      );
    }
  }

  async resyncGoogleSheet(eventId: string, userId: string, role: Role) {
    const event = await this.authorizeEventOperator(eventId, userId, role);

    const content =
      event.content && typeof event.content === 'object'
        ? (event.content as {
            integrations?: { googleSheetWebhookUrl?: string | null };
          })
        : {};
    const webhookUrl = content.integrations?.googleSheetWebhookUrl;

    if (
      !webhookUrl ||
      typeof webhookUrl !== 'string' ||
      !webhookUrl.startsWith('http')
    ) {
      throw new BadRequestException(
        'Tautan Webhook Google Sheets belum diatur atau tidak valid. Silakan simpan tautan terlebih dahulu.',
      );
    }

    const attendances = await this.db.attendance.findMany({
      where: { eventId },
      include: {
        invitation: { include: { guest: true } },
        checkIns: { orderBy: { scannedAt: 'asc' } },
        staff: { select: { email: true } },
      },
    });

    if (attendances.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        message:
          'Belum ada data kehadiran untuk disinkronkan ke Google Sheets.',
      };
    }

    let syncedCount = 0;
    for (const att of attendances) {
      const guest = att.invitation?.guest;
      if (!guest) continue;

      const payload = {
        event: 'GUEST_CHECK_IN',
        eventId: event.id,
        eventTitle: event.title,
        guestId: guest.id,
        guestName: guest.name,
        category: guest.category || 'REGULAR',
        scannedPax: att.scannedPax,
        totalScannedPax: att.scannedPax,
        maxPax: guest.maxPax,
        remainingPax: Math.max(0, guest.maxPax - att.scannedPax),
        status: att.scannedPax >= guest.maxPax ? 'COMPLETE' : 'PARTIAL',
        scannedAt: att.scannedAt.toISOString(),
        scannedBy: att.staff?.email || 'Staff Scanner',
        isTest: false,
      };

      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(6000),
        });
        syncedCount++;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Failed to resync check-in for guest ${guest.name} to Google Sheet: ${errMsg}`,
        );
      }
    }

    return {
      success: true,
      syncedCount,
      message: `Berhasil menyinkronkan ${syncedCount} data kehadiran tamu ke Google Sheets!`,
    };
  }

  private async dispatchGoogleSheetSync(
    eventId: string,
    guest: { id: string; name: string; category: string; maxPax: number },
    deltaPax: number,
    newTotalPax: number,
    maxPax: number,
    remainingPax: number,
    status: AttendanceCheckInStatus,
    userId: string,
  ) {
    try {
      const event = await this.db.event.findUnique({
        where: { id: eventId },
        select: { id: true, title: true, content: true },
      });
      if (!event) return;

      const content =
        event.content && typeof event.content === 'object'
          ? (event.content as {
              integrations?: { googleSheetWebhookUrl?: string | null };
            })
          : {};
      const webhookUrl = content.integrations?.googleSheetWebhookUrl;
      if (
        !webhookUrl ||
        typeof webhookUrl !== 'string' ||
        !webhookUrl.startsWith('http')
      ) {
        return;
      }

      const staff = await this.db.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      const payload = {
        event: 'GUEST_CHECK_IN',
        eventId: event.id,
        eventTitle: event.title,
        guestId: guest.id,
        guestName: guest.name,
        category: guest.category || 'REGULAR',
        scannedPax: deltaPax,
        totalScannedPax: newTotalPax,
        maxPax,
        remainingPax,
        status,
        scannedAt: new Date().toISOString(),
        scannedBy: staff?.email || 'Staff Scanner',
        isTest: false,
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to sync check-in to Google Sheet for event ${eventId}: ${errMsg}`,
      );
    }
  }

  private generateAppsScriptTemplate(eventTitle: string): string {
    return `// ==============================================================
// IRVITE.ID - SCRIPT PENERIMA DATA CHECK-IN REALTIME GOOGLE SHEETS
// Event: ${eventTitle}
// ==============================================================
// CARA PEMASANGAN (HANYA 1 MENIT):
// 1. Buka Google Sheets Anda yang ingin dipakai memantau tamu.
// 2. Klik menu "Extensions" (Ekstensi) > "Apps Script".
// 3. Hapus kode yang ada, lalu COPY-PASTE SELURUH KODE DI BAWAH INI.
// 4. Klik tombol "Deploy" (Terapkan) di pojok kanan atas > "New deployment" (Penerapan baru).
// 5. Pilih jenis "Web app" (Aplikasi Web).
// 6. Pada kolom "Who has access" (Siapa yang memiliki akses), pilih "Anyone" (Siapa saja).
// 7. Klik "Deploy" dan SALIN URL Web App yang dihasilkan.
// 8. Tempelkan URL tersebut ke kolom Webhook URL di IRVITE.ID Admin.
// ==============================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Header otomatis jika spreadsheet masih kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Waktu Check-in",
        "Nama Tamu",
        "Kategori",
        "Pax Masuk",
        "Total Hadir",
        "Kuota Pax",
        "Status",
        "Petugas Scan",
        "Keterangan"
      ]);
      sheet.getRange(1, 1, 1, 9)
        .setFontWeight("bold")
        .setBackground("#EFEBE9")
        .setFontColor("#3E2723");
      sheet.setFrozenRows(1);
    }
    
    var timeFormatted = Utilities.formatDate(
      new Date(data.scannedAt), 
      "GMT+7", 
      "yyyy-MM-dd HH:mm:ss"
    );
    
    var note = data.isTest ? "TEST PING" : "LIVE SCANNER";
    
    sheet.appendRow([
      timeFormatted,
      data.guestName,
      data.category || "REGULAR",
      data.scannedPax,
      data.totalScannedPax,
      data.maxPax,
      data.status,
      data.scannedBy,
      note
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
  }
}
