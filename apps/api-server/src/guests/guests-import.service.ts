import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { InvitationsService } from '../invitations/invitations.service';
import { Role, Prisma, InvitationStatus } from 'database';
import { parseSpreadsheetBuffer } from './utils/spreadsheet-parser';
import {
  detectDuplicates,
  ExistingGuestInfo,
} from './utils/duplicate-detector';
import { fetchGoogleSheetCsv } from './utils/google-sheets-fetcher';
import { generateGuestImportTemplate } from './utils/template-generator';
import { generateGuestImportReport } from './utils/report-generator';
import { normalizePhoneNumber } from './utils/phone-normalizer';
import { ConfirmImportDto } from './dto/confirm-import.dto';
import { ImportReportDto } from './dto/import-report.dto';

export interface PreviewResult {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  summary: PreviewSummary;
  rows: PreviewRowItem[];
}

export interface PreviewSummary {
  total: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  unusedColumns: string[];
}

export interface PreviewRowItem {
  sourceRow: number;
  name: string;
  category: string;
  phoneNumber: string | null;
  email: string | null;
  maxPax: number;
  status: string;
  isDuplicate: boolean;
  reasons: string[];
  duplicateReasons: string[];
}

export interface ImportResultItem {
  sourceRow: number;
  name: string;
  category: string;
  phoneNumber: string | null;
  email: string | null;
  maxPax: number;
  status: 'IMPORTED' | 'SKIPPED_DUPLICATE' | 'INVALID' | 'FAILED';
  reason?: string;
  guestId?: string;
  uniqueCode?: string;
}

@Injectable()
export class GuestsImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitationsService: InvitationsService,
  ) {}

  async assertEventAccessible(
    eventId: string,
    currentUserId: string,
    role: Role,
  ): Promise<void> {
    if (role === Role.STAFF) {
      throw new ForbiddenException(
        'Staff tidak memiliki izin untuk mengimpor data tamu.',
      );
    }

    const where: Prisma.EventWhereInput =
      role === Role.SUPER_ADMIN
        ? { id: eventId }
        : { id: eventId, userId: currentUserId };

    const event = await this.prisma.event.findFirst({
      where,
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }
  }

  private async getExistingGuests(
    eventId: string,
  ): Promise<ExistingGuestInfo[]> {
    return this.prisma.guest.findMany({
      where: { eventId },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        email: true,
      },
    });
  }

  async previewFile(
    eventId: string,
    currentUserId: string,
    role: Role,
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<PreviewResult> {
    await this.assertEventAccessible(eventId, currentUserId, role);

    const lowerName = fileName.toLowerCase();
    let fileType: 'xlsx' | 'csv' = 'xlsx';
    if (lowerName.endsWith('.csv')) {
      fileType = 'csv';
    } else if (lowerName.endsWith('.xlsx')) {
      fileType = 'xlsx';
    } else {
      throw new BadRequestException(
        'Format berkas tidak didukung. Harap gunakan berkas .xlsx atau .csv.',
      );
    }

    const parsed = await parseSpreadsheetBuffer(fileBuffer, fileType);
    const existingGuests = await this.getExistingGuests(eventId);

    const dupMap = detectDuplicates(parsed.rows, existingGuests);

    const rows: PreviewRowItem[] = [];
    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    for (const r of parsed.rows) {
      const dupInfo = dupMap.get(r.sourceRow);
      const isDuplicate = dupInfo?.isDuplicate ?? false;
      const dupReasons = dupInfo?.duplicateReasons ?? [];

      let status = 'VALID';
      const reasons: string[] = [];

      if (!r.isValid) {
        status = r.errors[0];
        reasons.push(...r.errors);
        invalidCount++;
      } else if (isDuplicate) {
        status = 'POSSIBLE_DUPLICATE';
        reasons.push(...dupReasons);
        duplicateCount++;
      } else {
        validCount++;
      }

      rows.push({
        sourceRow: r.sourceRow,
        name: r.name,
        category: r.category,
        phoneNumber: r.phoneNumber,
        email: r.email,
        maxPax: r.maxPax,
        status,
        isDuplicate,
        reasons,
        duplicateReasons: dupReasons,
      });
    }

    return {
      totalRows: rows.length,
      validRows: validCount,
      duplicateRows: duplicateCount,
      invalidRows: invalidCount,
      summary: {
        total: rows.length,
        validCount,
        duplicateCount,
        invalidCount,
        unusedColumns: parsed.unusedColumns,
      },
      rows,
    };
  }

  async previewSheets(
    eventId: string,
    currentUserId: string,
    role: Role,
    sheetUrl: string,
  ): Promise<PreviewResult> {
    await this.assertEventAccessible(eventId, currentUserId, role);

    const csvBuffer = await fetchGoogleSheetCsv(sheetUrl);
    const parsed = await parseSpreadsheetBuffer(csvBuffer, 'csv');
    const existingGuests = await this.getExistingGuests(eventId);

    const dupMap = detectDuplicates(parsed.rows, existingGuests);

    const rows: PreviewRowItem[] = [];
    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    for (const r of parsed.rows) {
      const dupInfo = dupMap.get(r.sourceRow);
      const isDuplicate = dupInfo?.isDuplicate ?? false;
      const dupReasons = dupInfo?.duplicateReasons ?? [];

      let status = 'VALID';
      const reasons: string[] = [];

      if (!r.isValid) {
        status = r.errors[0];
        reasons.push(...r.errors);
        invalidCount++;
      } else if (isDuplicate) {
        status = 'POSSIBLE_DUPLICATE';
        reasons.push(...dupReasons);
        duplicateCount++;
      } else {
        validCount++;
      }

      rows.push({
        sourceRow: r.sourceRow,
        name: r.name,
        category: r.category,
        phoneNumber: r.phoneNumber,
        email: r.email,
        maxPax: r.maxPax,
        status,
        isDuplicate,
        reasons,
        duplicateReasons: dupReasons,
      });
    }

    return {
      totalRows: rows.length,
      validRows: validCount,
      duplicateRows: duplicateCount,
      invalidRows: invalidCount,
      summary: {
        total: rows.length,
        validCount,
        duplicateCount,
        invalidCount,
        unusedColumns: parsed.unusedColumns,
      },
      rows,
    };
  }

  async confirmImport(
    eventId: string,
    currentUserId: string,
    role: Role,
    dto: ConfirmImportDto,
  ): Promise<{
    totalProcessed: number;
    importedCount: number;
    skippedDuplicateCount: number;
    invalidCount: number;
    failedCount: number;
    results: ImportResultItem[];
  }> {
    await this.assertEventAccessible(eventId, currentUserId, role);

    if (!dto.rows || dto.rows.length === 0) {
      throw new BadRequestException(
        'Tidak ada data baris tamu yang dikirim untuk diimpor.',
      );
    }

    if (dto.rows.length > 1000) {
      throw new BadRequestException(
        'Jumlah data melebihi batas maksimal 1.000 baris per impor.',
      );
    }

    // Re-query database to ensure fresh duplicate check at moment of confirm
    const existingGuests = await this.getExistingGuests(eventId);
    const normalizedRowsForDup = dto.rows.map((r) => {
      const pNorm = r.phoneNumber ? normalizePhoneNumber(r.phoneNumber) : null;
      return {
        sourceRow: r.sourceRow,
        name: (r.name || '').trim().replace(/\s+/g, ' '),
        phoneNumber: pNorm && pNorm.valid ? pNorm.phoneNumber : r.phoneNumber,
        email: r.email ? r.email.trim().toLowerCase() : null,
      };
    });
    const dupMap = detectDuplicates(normalizedRowsForDup, existingGuests);

    const results: ImportResultItem[] = [];
    let importedCount = 0;
    let skippedDuplicateCount = 0;
    let invalidCount = 0;
    let failedCount = 0;

    for (const row of dto.rows) {
      // 1. Re-validate name
      const cleanName = (row.name || '').trim().replace(/\s+/g, ' ');
      if (!cleanName || cleanName.length === 0 || cleanName.length > 100) {
        invalidCount++;
        results.push({
          sourceRow: row.sourceRow,
          name: row.name,
          category: row.category || 'REGULAR',
          phoneNumber: row.phoneNumber || null,
          email: row.email || null,
          maxPax: row.maxPax || 1,
          status: 'INVALID',
          reason: 'Nama tamu tidak valid (harus 1-100 karakter).',
        });
        continue;
      }

      // 2. Re-validate category
      const rawCategory = (row.category || 'REGULAR').trim();
      if (rawCategory.length > 50) {
        invalidCount++;
        results.push({
          sourceRow: row.sourceRow,
          name: cleanName,
          category: rawCategory,
          phoneNumber: row.phoneNumber || null,
          email: row.email || null,
          maxPax: row.maxPax || 1,
          status: 'INVALID',
          reason:
            'Kategori melebihi batas maksimal 50 karakter (INVALID_CATEGORY).',
        });
        continue;
      }
      const cleanCategory = rawCategory.toUpperCase();

      // 3. Re-validate phone
      let cleanPhone: string | null = null;
      if (row.phoneNumber) {
        const phoneNorm = normalizePhoneNumber(row.phoneNumber);
        if (!phoneNorm.valid) {
          invalidCount++;
          results.push({
            sourceRow: row.sourceRow,
            name: cleanName,
            category: cleanCategory,
            phoneNumber: row.phoneNumber,
            email: row.email || null,
            maxPax: row.maxPax || 1,
            status: 'INVALID',
            reason: 'Format nomor telepon/WhatsApp tidak valid.',
          });
          continue;
        }
        cleanPhone = phoneNorm.phoneNumber;
      }

      // 4. Re-validate email
      let cleanEmail: string | null = null;
      if (row.email) {
        const emailLower = row.email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailLower.length > 150 || !emailRegex.test(emailLower)) {
          invalidCount++;
          results.push({
            sourceRow: row.sourceRow,
            name: cleanName,
            category: cleanCategory,
            phoneNumber: cleanPhone,
            email: row.email,
            maxPax: row.maxPax || 1,
            status: 'INVALID',
            reason: 'Format email tidak valid.',
          });
          continue;
        }
        cleanEmail = emailLower;
      }

      // 5. Re-validate maxPax
      const rawPax = row.maxPax !== undefined ? Number(row.maxPax) : 1;
      if (
        !Number.isInteger(rawPax) ||
        rawPax < 1 ||
        rawPax > 50 ||
        isNaN(rawPax)
      ) {
        invalidCount++;
        results.push({
          sourceRow: row.sourceRow,
          name: cleanName,
          category: cleanCategory,
          phoneNumber: cleanPhone,
          email: cleanEmail,
          maxPax: rawPax,
          status: 'INVALID',
          reason: 'Jumlah pax harus berupa bilangan bulat antara 1 sampai 50.',
        });
        continue;
      }
      const cleanMaxPax = rawPax;

      // 6. Check duplicate handling
      const dupInfo = dupMap.get(row.sourceRow);
      if (dupInfo?.isDuplicate && !row.importAnyway) {
        skippedDuplicateCount++;
        results.push({
          sourceRow: row.sourceRow,
          name: cleanName,
          category: cleanCategory,
          phoneNumber: cleanPhone,
          email: cleanEmail,
          maxPax: cleanMaxPax,
          status: 'SKIPPED_DUPLICATE',
          reason: dupInfo.duplicateReasons.join('; '),
        });
        continue;
      }

      // 7. Atomic transaction: Guest + Invitation
      try {
        const txResult = await this.prisma.$transaction(async (tx) => {
          const guest = await tx.guest.create({
            data: {
              eventId,
              name: cleanName,
              category: cleanCategory,
              phoneNumber: cleanPhone,
              email: cleanEmail,
              maxPax: cleanMaxPax,
            },
            select: { id: true },
          });

          const invitation =
            await this.invitationsService.createInvitationWithRetry(tx, {
              eventId,
              guestId: guest.id,
              status: InvitationStatus.PENDING,
            });

          return { guestId: guest.id, uniqueCode: invitation.uniqueCode };
        });

        importedCount++;
        results.push({
          sourceRow: row.sourceRow,
          name: cleanName,
          category: cleanCategory,
          phoneNumber: cleanPhone,
          email: cleanEmail,
          maxPax: cleanMaxPax,
          status: 'IMPORTED',
          guestId: txResult.guestId,
          uniqueCode: txResult.uniqueCode,
        });
      } catch (err: unknown) {
        failedCount++;
        const error = err as Error;
        results.push({
          sourceRow: row.sourceRow,
          name: cleanName,
          category: cleanCategory,
          phoneNumber: cleanPhone,
          email: cleanEmail,
          maxPax: cleanMaxPax,
          status: 'FAILED',
          reason: error.message || 'Gagal menyimpan ke database.',
        });
      }
    }

    return {
      totalProcessed: dto.rows.length,
      importedCount,
      skippedDuplicateCount,
      invalidCount,
      failedCount,
      results,
    };
  }

  async getTemplateBuffer(): Promise<Buffer> {
    return generateGuestImportTemplate();
  }

  async getReportBuffer(dto: ImportReportDto): Promise<Buffer> {
    return generateGuestImportReport(dto.rows);
  }
}
