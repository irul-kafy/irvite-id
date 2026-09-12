/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { GuestsImportService } from './guests-import.service';
import { PrismaService } from '../database/prisma.service';
import { InvitationsService } from '../invitations/invitations.service';
import { Role, Prisma } from 'database';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

describe('GuestsImportService', () => {
  let service: GuestsImportService;
  let prisma: any;
  let invitationsService: any;

  const mockPrisma = {
    event: {
      findFirst: jest.fn(),
    },
    guest: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    invitation: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockInvitationsService = {
    generateSecureCode: jest.fn().mockReturnValue('testUniqueCode22Chars!'),
    createInvitationWithRetry: jest
      .fn()
      .mockImplementation(async (_prisma, data) => ({
        id: 'inv-new-1',
        uniqueCode: 'testUniqueCode22Chars!',
        guestId: data.guestId,
        eventId: data.eventId,
      })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestsImportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InvitationsService, useValue: mockInvitationsService },
      ],
    }).compile();

    service = module.get<GuestsImportService>(GuestsImportService);
    prisma = module.get<PrismaService>(PrismaService);
    invitationsService = module.get<InvitationsService>(InvitationsService);
  });

  describe('assertEventAccessible', () => {
    it('throws ForbiddenException for STAFF', async () => {
      await expect(
        service.assertEventAccessible('ev-1', 'user-1', Role.STAFF),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows SUPER_ADMIN if event exists', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'ev-1' });
      await expect(
        service.assertEventAccessible('ev-1', 'admin-1', Role.SUPER_ADMIN),
      ).resolves.toBeUndefined();
      expect(mockPrisma.event.findFirst).toHaveBeenCalledWith({
        where: { id: 'ev-1' },
        select: { id: true },
      });
    });

    it('allows ADMIN if event is owned', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'ev-1' });
      await expect(
        service.assertEventAccessible('ev-1', 'owner-1', Role.ADMIN),
      ).resolves.toBeUndefined();
      expect(mockPrisma.event.findFirst).toHaveBeenCalledWith({
        where: { id: 'ev-1', userId: 'owner-1' },
        select: { id: true },
      });
    });

    it('throws NotFoundException if event does not exist or not owned', async () => {
      mockPrisma.event.findFirst.mockResolvedValue(null);
      await expect(
        service.assertEventAccessible('ev-1', 'wrong-user', Role.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('previewFile', () => {
    async function createCsvBuffer(csvText: string): Promise<Buffer> {
      return Buffer.from(csvText, 'utf8');
    }

    it('previews CSV and flags duplicate matching database', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'ev-1' });
      mockPrisma.guest.findMany.mockResolvedValue([
        {
          id: 'g-old',
          name: 'Budi Santoso',
          phoneNumber: '6281234567890',
          email: 'budi@test.com',
        },
      ]);

      const csv =
        'Nama Tamu,Kategori,No. WhatsApp\nBudi Santoso,VIP,081234567890\nSiti,REGULAR,08199999999';
      const buffer = await createCsvBuffer(csv);

      const res = await service.previewFile(
        'ev-1',
        'u-1',
        Role.ADMIN,
        buffer,
        'guests.csv',
      );

      expect(res.summary.total).toBe(2);
      expect(res.summary.validCount).toBe(1);
      expect(res.summary.duplicateCount).toBe(1);

      expect(res.rows[0].status).toBe('POSSIBLE_DUPLICATE');
      expect(res.rows[0].isDuplicate).toBe(true);

      expect(res.rows[1].status).toBe('VALID');
      expect(res.rows[1].isDuplicate).toBe(false);
    });
  });

  describe('confirmImport', () => {
    it('performs partial import with atomic transactions and skips duplicate when importAnyway is false', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'ev-1' });
      mockPrisma.guest.findMany.mockResolvedValue([
        {
          id: 'g-dup',
          name: 'Budi Santoso',
          phoneNumber: '6281234567890',
          email: null,
        },
      ]);

      // Transaction mock implementation
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          guest: {
            create: jest.fn().mockResolvedValue({ id: 'g-new-1' }),
          },
          invitation: {
            create: jest.fn().mockResolvedValue({ id: 'inv-new-1' }),
          },
        };
        return cb(tx);
      });

      const dto = {
        rows: [
          {
            sourceRow: 2,
            name: 'Budi Santoso', // duplicate
            category: 'VIP',
            phoneNumber: '081234567890',
            importAnyway: false,
          },
          {
            sourceRow: 3,
            name: 'Andi Wijaya', // valid
            category: 'REGULAR',
            phoneNumber: '081987654321',
            maxPax: 2,
          },
          {
            sourceRow: 4,
            name: '', // invalid
            category: 'REGULAR',
          },
        ],
      };

      const result = await service.confirmImport(
        'ev-1',
        'u-1',
        Role.ADMIN,
        dto,
      );

      expect(result.totalProcessed).toBe(3);
      expect(result.importedCount).toBe(1); // Andi Wijaya
      expect(result.skippedDuplicateCount).toBe(1); // Budi Santoso
      expect(result.invalidCount).toBe(1); // Empty name

      expect(result.results[0].status).toBe('SKIPPED_DUPLICATE');
      expect(result.results[1].status).toBe('IMPORTED');
      expect(result.results[1].uniqueCode).toBe('testUniqueCode22Chars!');
      expect(result.results[2].status).toBe('INVALID');
    });

    it('imports duplicate row when importAnyway is true', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'ev-1' });
      mockPrisma.guest.findMany.mockResolvedValue([
        {
          id: 'g-dup',
          name: 'Budi Santoso',
          phoneNumber: '6281234567890',
          email: null,
        },
      ]);

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          guest: { create: jest.fn().mockResolvedValue({ id: 'g-new-2' }) },
          invitation: {
            create: jest.fn().mockResolvedValue({ id: 'inv-new-2' }),
          },
        };
        return cb(tx);
      });

      const dto = {
        rows: [
          {
            sourceRow: 2,
            name: 'Budi Santoso',
            category: 'VIP',
            phoneNumber: '081234567890',
            importAnyway: true, // User chose to import anyway
          },
        ],
      };

      const result = await service.confirmImport(
        'ev-1',
        'u-1',
        Role.ADMIN,
        dto,
      );
      expect(result.importedCount).toBe(1);
      expect(result.results[0].status).toBe('IMPORTED');
    });

    it('records FAILED status when transaction fails without breaking other rows', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'ev-1' });
      mockPrisma.guest.findMany.mockResolvedValue([]);

      // First row fails, second succeeds
      let callCount = 0;
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Database error on guest creation');
        }
        const tx = {
          guest: { create: jest.fn().mockResolvedValue({ id: 'g-new-ok' }) },
          invitation: {
            create: jest.fn().mockResolvedValue({ id: 'inv-new-ok' }),
          },
        };
        return cb(tx);
      });

      const dto = {
        rows: [
          { sourceRow: 2, name: 'Fail Guest' },
          { sourceRow: 3, name: 'Success Guest' },
        ],
      };

      const result = await service.confirmImport(
        'ev-1',
        'u-1',
        Role.ADMIN,
        dto,
      );
      expect(result.failedCount).toBe(1);
      expect(result.importedCount).toBe(1);
      expect(result.results[0].status).toBe('FAILED');
      expect(result.results[0].reason).toContain('Database error');
      expect(result.results[1].status).toBe('IMPORTED');
    });

    it('validates category length boundary at confirm: 50 chars valid, 51 chars invalid', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'ev-1' });
      mockPrisma.guest.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          guest: { create: jest.fn().mockResolvedValue({ id: 'g-cat' }) },
        };
        return cb(tx);
      });

      const cat50 = 'A'.repeat(50);
      const cat51 = 'B'.repeat(51);

      const dto = {
        rows: [
          { sourceRow: 2, name: 'Valid Cat', category: cat50 },
          { sourceRow: 3, name: 'Invalid Cat', category: cat51 },
        ],
      };

      const result = await service.confirmImport(
        'ev-1',
        'u-1',
        Role.ADMIN,
        dto,
      );
      expect(result.importedCount).toBe(1);
      expect(result.invalidCount).toBe(1);
      expect(result.results[0].status).toBe('IMPORTED');
      expect(result.results[0].category).toBe(cat50);
      expect(result.results[1].status).toBe('INVALID');
      expect(result.results[1].reason).toContain('INVALID_CATEGORY');
    });

    it('covers all source rows and accurately counts 143 imported, 5 invalid, 2 skipped duplicates', async () => {
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'ev-1' });
      mockPrisma.guest.findMany.mockResolvedValue([
        {
          id: 'ex-1',
          name: 'Existing Dup 1',
          phoneNumber: '628999999001',
          email: null,
        },
        {
          id: 'ex-2',
          name: 'Existing Dup 2',
          phoneNumber: '628999999002',
          email: null,
        },
      ]);

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          guest: { create: jest.fn().mockResolvedValue({ id: 'g-batch' }) },
        };
        return cb(tx);
      });

      const rows: any[] = [];
      for (let i = 1; i <= 143; i++) {
        rows.push({
          sourceRow: i,
          name: 'Guest Valid ' + i,
          category: 'REGULAR',
          phoneNumber: '08110000' + String(i).padStart(4, '0'),
          maxPax: 1,
        });
      }
      rows.push({ sourceRow: 144, name: '', category: 'VIP' });
      rows.push({ sourceRow: 145, name: 'Bad Phone', phoneNumber: '123' });
      rows.push({ sourceRow: 146, name: 'Bad Email', email: 'not-an-email' });
      rows.push({ sourceRow: 147, name: 'Bad Pax', maxPax: 99 });
      rows.push({ sourceRow: 148, name: 'Bad Cat', category: 'C'.repeat(51) });
      rows.push({
        sourceRow: 149,
        name: 'Existing Dup 1',
        phoneNumber: '08999999001',
        importAnyway: false,
      });
      rows.push({
        sourceRow: 150,
        name: 'Existing Dup 2',
        phoneNumber: '08999999002',
        importAnyway: false,
      });

      const result = await service.confirmImport('ev-1', 'u-1', Role.ADMIN, {
        rows,
      });
      expect(result.totalProcessed).toBe(150);
      expect(result.importedCount).toBe(143);
      expect(result.invalidCount).toBe(5);
      expect(result.skippedDuplicateCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.results.length).toBe(150);
    });
  });

  describe('getTemplateBuffer', () => {
    it('generates a valid XLSX buffer with Data Tamu worksheet', async () => {
      const buffer = await service.getTemplateBuffer();
      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(0);

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as any);
      expect(wb.worksheets[0].name).toBe('Data Tamu');
      expect(wb.worksheets[0].getRow(1).getCell(1).value).toBe('Nama Tamu');
    });
  });

  describe('getReportBuffer', () => {
    it('generates a valid report XLSX buffer and sanitizes formula values', async () => {
      const dto = {
        rows: [
          {
            sourceRow: 2,
            name: '=SUM(1,2)', // Hostile formula in name
            status: 'IMPORTED',
            canonicalUrl: 'http://localhost:3002/i/code123',
          },
        ],
      };

      const buffer = await service.getReportBuffer(dto);
      expect(buffer).toBeDefined();

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as any);
      const ws = wb.worksheets[0];
      expect(ws.name).toBe('Laporan Import');
      // Verify single quote was prepended
      const cellVal = ws.getRow(2).getCell(2).value;
      expect(cellVal).toBe("'=SUM(1,2)");
    });
  });
});
