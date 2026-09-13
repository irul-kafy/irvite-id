import { Injectable, BadRequestException } from '@nestjs/common';
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
}
