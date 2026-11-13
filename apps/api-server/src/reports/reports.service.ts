import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ExportQueryDto } from './dto/export-query.dto';
import {
  ReportRow,
  EventReportInfo,
  ActiveFiltersInfo,
  mapToReportRow,
  sanitizeSlugForFilename,
  getWibDateStamp,
} from './report-read-model';
import {
  generateGuestDataXlsx,
  generateGuestDataCsv,
} from './guest-data-exporter';
import {
  generateAttendanceReportXlsx,
  generateAttendanceReportCsv,
} from './attendance-report-exporter';
import {
  generatePostEventHtmlReport,
  PostEventData,
} from './post-event-exporter';
import { Prisma, InvitationStatus, AttendanceStatus } from 'database';

export const MAX_EXPORT_LIMIT = 5000;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  buildFilterWhere(
    eventId: string,
    query: ExportQueryDto,
  ): Prisma.GuestWhereInput {
    const andConditions: Prisma.GuestWhereInput[] = [{ eventId }];

    if (query.category && query.category.trim() !== '') {
      andConditions.push({ category: query.category.trim() });
    }

    if (query.rsvp === 'yes') {
      andConditions.push({
        invitation: {
          is: {
            status: InvitationStatus.RSVP_YES,
          },
        },
      });
    } else if (query.rsvp === 'no') {
      andConditions.push({
        invitation: {
          is: {
            status: InvitationStatus.RSVP_NO,
          },
        },
      });
    } else if (query.rsvp === 'pending') {
      andConditions.push({
        OR: [
          { invitation: null },
          {
            invitation: {
              is: {
                status: {
                  in: [
                    InvitationStatus.PENDING,
                    InvitationStatus.SENT,
                    InvitationStatus.OPENED,
                  ],
                },
              },
            },
          },
        ],
      });
    }

    if (query.attendance === 'checked-in') {
      andConditions.push({
        invitation: {
          is: {
            attendances: {
              some: {
                status: AttendanceStatus.VALID,
              },
            },
          },
        },
      });
    } else if (query.attendance === 'not-checked-in') {
      andConditions.push({
        OR: [
          { invitation: null },
          {
            invitation: {
              is: {
                attendances: {
                  none: {
                    status: AttendanceStatus.VALID,
                  },
                },
              },
            },
          },
        ],
      });
    }

    return { AND: andConditions };
  }

  async fetchFilteredRows(
    eventId: string,
    query: ExportQueryDto,
  ): Promise<ReportRow[]> {
    const where = this.buildFilterWhere(eventId, query);

    // 1. Check safety limit
    const totalCount = await this.prisma.guest.count({ where });
    if (totalCount > MAX_EXPORT_LIMIT) {
      throw new BadRequestException(
        'Jumlah data tamu melebihi batas ekspor 5.000 baris. Silakan gunakan filter kategori, RSVP, atau kehadiran yang lebih spesifik.',
      );
    }

    // 2. Fetch dataset with deterministic order
    const guests = await this.prisma.guest.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        category: true,
        phoneNumber: true,
        email: true,
        maxPax: true,
        invitation: {
          select: {
            status: true,
            rsvpPax: true,
            attendances: {
              where: { status: AttendanceStatus.VALID },
              select: {
                status: true,
                scannedPax: true,
                scannedAt: true,
                staff: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return guests.map((g, idx) => mapToReportRow(g, idx));
  }

  async exportGuestData(
    eventId: string,
    event: EventReportInfo,
    query: ExportQueryDto,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const rows = await this.fetchFilteredRows(eventId, query);
    const cleanSlug = sanitizeSlugForFilename(event.slug);
    const dateStamp = getWibDateStamp();

    if (query.format === 'csv') {
      const buffer = generateGuestDataCsv(rows);
      const filename = `data-tamu-${cleanSlug}-${dateStamp}.csv`;
      const contentType = 'text/csv; charset=utf-8';
      return { buffer, filename, contentType };
    }

    const buffer = await generateGuestDataXlsx(rows);
    const filename = `data-tamu-${cleanSlug}-${dateStamp}.xlsx`;
    const contentType =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return { buffer, filename, contentType };
  }

  async exportAttendanceReport(
    eventId: string,
    event: EventReportInfo,
    query: ExportQueryDto,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const rows = await this.fetchFilteredRows(eventId, query);
    const cleanSlug = sanitizeSlugForFilename(event.slug);
    const dateStamp = getWibDateStamp();

    if (query.format === 'csv') {
      const buffer = generateAttendanceReportCsv(rows);
      const filename = `laporan-kehadiran-${cleanSlug}-${dateStamp}.csv`;
      const contentType = 'text/csv; charset=utf-8';
      return { buffer, filename, contentType };
    }

    const activeFilters: ActiveFiltersInfo = {
      rsvp: query.rsvp || 'all',
      attendance: query.attendance || 'all',
      category: query.category,
    };

    const buffer = await generateAttendanceReportXlsx(
      event,
      rows,
      activeFilters,
    );
    const filename = `laporan-kehadiran-${cleanSlug}-${dateStamp}.xlsx`;
    const contentType =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return { buffer, filename, contentType };
  }

  async generatePostEventReport(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        slug: true,
        eventDate: true,
        locationDetails: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event '${eventId}' not found`);
    }

    const [guests, attendances, wishes] = await Promise.all([
      this.prisma.guest.findMany({
        where: { eventId },
        include: {
          invitation: {
            include: {
              attendances: {
                where: { status: AttendanceStatus.VALID },
                include: { staff: { select: { email: true } } },
              },
            },
          },
        },
      }),
      this.prisma.attendance.findMany({
        where: { eventId, status: AttendanceStatus.VALID },
        include: {
          invitation: {
            include: {
              guest: true,
            },
          },
          staff: {
            select: { email: true },
          },
        },
        orderBy: { scannedAt: 'asc' },
      }),
      this.prisma.wish.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalGuests = guests.length;
    let totalExpectedPax = 0;
    let totalAttendedGuests = 0;
    let totalAttendedPax = 0;
    let vipAttendedCount = 0;
    let walkInCount = 0;

    const vipAttendees: PostEventData['vipAttendees'] = [];
    const walkInAttendees: PostEventData['walkInAttendees'] = [];
    const hourlyMap = new Map<string, { count: number; pax: number }>();

    for (const g of guests) {
      totalExpectedPax += g.maxPax || 1;
      const validAtt = g.invitation?.attendances?.[0];
      if (validAtt) {
        totalAttendedGuests++;
        totalAttendedPax += validAtt.scannedPax;
        const isVip = g.category.toUpperCase() === 'VIP' || g.category.toUpperCase() === 'VVIP';
        if (isVip) {
          vipAttendedCount++;
          vipAttendees.push({
            name: g.name,
            category: g.category,
            tableNumber: g.tableNumber,
            scannedPax: validAtt.scannedPax,
            scannedAt: validAtt.scannedAt,
          });
        }
      }
    }

    for (const att of attendances) {
      const guestName = att.invitation?.guest?.name || '';
      const isWalkIn = guestName.toLowerCase().startsWith('walk-in') || att.invitation?.guest?.category === 'WALK_IN';
      if (isWalkIn) {
        walkInCount++;
        walkInAttendees.push({
          name: guestName,
          scannedPax: att.scannedPax,
          scannedAt: att.scannedAt,
          scannedByName: att.staff?.email || 'Staf Pintu',
        });
      }

      // Group hourly
      const date = new Date(att.scannedAt);
      const hour = String(date.getHours()).padStart(2, '0');
      const nextHour = String((date.getHours() + 1) % 24).padStart(2, '0');
      const slot = `${hour}:00 - ${nextHour}:00`;

      const existing = hourlyMap.get(slot) || { count: 0, pax: 0 };
      existing.count += 1;
      existing.pax += att.scannedPax;
      hourlyMap.set(slot, existing);
    }

    const hourlyDistribution = Array.from(hourlyMap.entries()).map(([hourSlot, val]) => ({
      hourSlot,
      count: val.count,
      pax: val.pax,
    }));

    const attendanceRatePercent = totalGuests > 0 ? Math.round((totalAttendedGuests / totalGuests) * 100) : 0;

    const data: PostEventData = {
      event,
      metrics: {
        totalGuests,
        totalExpectedPax,
        totalAttendedGuests,
        totalAttendedPax,
        attendanceRatePercent,
        vipAttendedCount,
        walkInCount,
      },
      hourlyDistribution,
      vipAttendees,
      walkInAttendees,
      wishes: wishes.map((w) => ({
        name: w.name,
        message: w.message,
        createdAt: w.createdAt,
      })),
    };

    const html = generatePostEventHtmlReport(data);
    const dateStamp = getWibDateStamp();
    const cleanSlug = sanitizeSlugForFilename(event.slug);
    const filename = `laporan-pasca-acara-${cleanSlug}-${dateStamp}.html`;

    return {
      data,
      html,
      filename,
    };
  }
}
