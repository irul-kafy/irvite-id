import {
  mapToReportRow,
  calculateAttendanceSummary,
  formatWibDateTime,
  getWibDateStamp,
  sanitizeSlugForFilename,
  escapeCsvCell,
  ReportRow,
} from './report-read-model';
import { generateGuestDataCsv } from './guest-data-exporter';
import { generateAttendanceReportCsv } from './attendance-report-exporter';
import { sanitizeFormulaValue } from '../guests/utils/formula-sanitizer';

describe('Reports Read Model & Exporters Unit Tests', () => {
  describe('Canonical Semantics & Mapping', () => {
    it('maps guest without invitation to BELUM_DIBUAT and Belum Ada Undangan', () => {
      const row = mapToReportRow(
        {
          name: 'Budi Santoso',
          category: 'VIP',
          maxPax: 2,
          invitation: null,
        },
        0,
      );

      expect(row.no).toBe(1);
      expect(row.name).toBe('Budi Santoso');
      expect(row.category).toBe('VIP');
      expect(row.maxPax).toBe(2);
      expect(row.invitationStatus).toBe('BELUM_DIBUAT');
      expect(row.rsvpStatus).toBe('Belum Ada Undangan');
      expect(row.rsvpPax).toBeNull();
      expect(row.attendanceStatus).toBe('Belum Check-in');
      expect(row.scannedPax).toBe(0);
      expect(row.scannedAt).toBe('');
      expect(row.scannerEmail).toBe('-');
    });

    it('preserves exact stored numeric values for maxPax and scannedPax without truthy fallback to 1', () => {
      const row = mapToReportRow(
        {
          name: 'Zero Pax Case',
          category: 'REGULAR',
          maxPax: 0,
          invitation: {
            status: 'RSVP_YES',
            rsvpPax: 0,
            attendances: [
              {
                status: 'VALID',
                scannedPax: 0,
                scannedAt: new Date('2026-09-13T03:00:00Z'),
                staff: { email: 'staff@example.com' },
              },
            ],
          },
        },
        0,
      );

      expect(row.maxPax).toBe(0);
      expect(row.scannedPax).toBe(0);
      expect(row.rsvpPax).toBe(0);
    });

    it('maps RSVP_YES with planned pax and valid check-in', () => {
      const checkInDate = new Date('2026-09-13T03:30:00Z'); // 10:30 WIB
      const row = mapToReportRow(
        {
          name: 'Keluarga Andi Wijaya',
          category: 'KELUARGA',
          maxPax: 4,
          invitation: {
            status: 'RSVP_YES',
            rsvpPax: 3,
            attendances: [
              {
                status: 'VALID',
                scannedPax: 3,
                scannedAt: checkInDate,
                staff: { email: 'staff@example.com' },
              },
            ],
          },
        },
        1,
      );

      expect(row.no).toBe(2);
      expect(row.invitationStatus).toBe('RSVP_YES');
      expect(row.rsvpStatus).toBe('Hadir');
      expect(row.rsvpPax).toBe(3);
      expect(row.attendanceStatus).toBe('Sudah Check-in');
      expect(row.scannedPax).toBe(3);
      expect(row.scannedAt).toContain('WIB');
      expect(row.scannerEmail).toBe('staff@example.com');
    });

    it('maps RSVP_NO with null rsvpPax even if invitation.rsvpPax had an old number', () => {
      const row = mapToReportRow(
        {
          name: 'Siti Rahma',
          category: 'REGULAR',
          maxPax: 2,
          invitation: {
            status: 'RSVP_NO',
            rsvpPax: 2, // should be ignored for RSVP_NO
          },
        },
        2,
      );

      expect(row.rsvpStatus).toBe('Tidak Hadir');
      expect(row.rsvpPax).toBeNull();
      expect(row.attendanceStatus).toBe('Belum Check-in');
      expect(row.scannedPax).toBe(0);
    });

    it('maps PENDING invitation to Belum RSVP', () => {
      const row = mapToReportRow(
        {
          name: 'Dewi Lestari',
          category: 'REGULAR',
          maxPax: 1,
          invitation: {
            status: 'PENDING',
            rsvpPax: null,
          },
        },
        3,
      );

      expect(row.invitationStatus).toBe('PENDING');
      expect(row.rsvpStatus).toBe('Belum RSVP');
      expect(row.rsvpPax).toBeNull();
      expect(row.attendanceStatus).toBe('Belum Check-in');
    });

    it('does not count INVALID or DUPLICATE attendance as valid check-in', () => {
      const row = mapToReportRow(
        {
          name: 'Tamu Bermasalah',
          category: 'REGULAR',
          maxPax: 2,
          invitation: {
            status: 'PENDING',
            attendances: [
              {
                status: 'INVALID',
                scannedPax: 2,
                scannedAt: new Date(),
                staff: { email: 'staff@example.com' },
              },
            ],
          },
        },
        4,
      );

      expect(row.attendanceStatus).toBe('Belum Check-in');
      expect(row.scannedPax).toBe(0);
      expect(row.scannedAt).toBe('');
      expect(row.scannerEmail).toBe('-');
    });
  });

  describe('Aggregate Calculations', () => {
    it('correctly separates checked-in units from physical headcount (pax)', () => {
      const rows: ReportRow[] = [
        {
          no: 1,
          name: 'Fam A',
          category: 'VIP',
          phoneNumber: '-',
          email: '-',
          maxPax: 4,
          invitationStatus: 'RSVP_YES',
          rsvpStatus: 'Hadir',
          rsvpPax: 4,
          attendanceStatus: 'Sudah Check-in',
          scannedPax: 4,
          scannedAt: '2026-09-13 10:00:00 WIB',
          scannerEmail: 'staff@example.com',
        },
        {
          no: 2,
          name: 'Fam B',
          category: 'VIP',
          phoneNumber: '-',
          email: '-',
          maxPax: 2,
          invitationStatus: 'RSVP_YES',
          rsvpStatus: 'Hadir',
          rsvpPax: 2,
          attendanceStatus: 'Sudah Check-in',
          scannedPax: 2,
          scannedAt: '2026-09-13 10:15:00 WIB',
          scannerEmail: 'staff@example.com',
        },
        {
          no: 3,
          name: 'Fam C',
          category: 'KELUARGA',
          phoneNumber: '-',
          email: '-',
          maxPax: 3,
          invitationStatus: 'RSVP_NO',
          rsvpStatus: 'Tidak Hadir',
          rsvpPax: null,
          attendanceStatus: 'Sudah Check-in', // Walk-in
          scannedPax: 3,
          scannedAt: '2026-09-13 10:30:00 WIB',
          scannerEmail: 'staff@example.com',
        },
      ];

      const summary = calculateAttendanceSummary(rows);

      expect(summary.totalGuestUnits).toBe(3);
      expect(summary.checkedInUnits).toBe(3);
      expect(summary.notCheckedInUnits).toBe(0);
      expect(summary.unitAttendancePct).toBe(100);

      // Physical pax: 4 + 2 + 3 = 9
      expect(summary.actualScannedPax).toBe(9);
      expect(summary.totalMaxPax).toBe(9);
      expect(summary.plannedRsvpPax).toBe(6); // Fam A (4) + Fam B (2)
      expect(summary.differencePax).toBe(3); // 9 - 6 = +3
      expect(summary.paxRealizationPct).toBe(100);

      // Checked-in units (3) MUST NOT equal scanned pax (9)
      expect(summary.checkedInUnits).not.toBe(summary.actualScannedPax);
    });

    it('handles empty rows without emitting NaN or Infinity', () => {
      const summary = calculateAttendanceSummary([]);

      expect(summary.totalGuestUnits).toBe(0);
      expect(summary.checkedInUnits).toBe(0);
      expect(summary.unitAttendancePct).toBe(0);
      expect(summary.paxRealizationPct).toBe(0);
      expect(Number.isNaN(summary.unitAttendancePct)).toBe(false);
      expect(Number.isNaN(summary.paxRealizationPct)).toBe(false);
      expect(Number.isFinite(summary.unitAttendancePct)).toBe(true);
      expect(Number.isFinite(summary.paxRealizationPct)).toBe(true);
    });
  });

  describe('Timezone & Formatting Helpers', () => {
    it('formats date to Asia/Jakarta (WIB) deterministically', () => {
      // 2026-09-13T00:00:00Z is 07:00 WIB
      const utcDate = new Date('2026-09-13T00:00:00Z');
      const wibStr = formatWibDateTime(utcDate);

      expect(wibStr).toBe('2026-09-13 07:00:00 WIB');
    });

    it('formats date stamp deterministically for filenames', () => {
      const utcDate = new Date('2026-09-13T17:00:00Z'); // 2026-09-14 00:00 WIB
      const dateStamp = getWibDateStamp(utcDate);

      expect(dateStamp).toBe('20260914');
    });

    it('sanitizes event slug for safe Content-Disposition filename', () => {
      const dirtySlug = '  Budi & Ani Wedding 2026!! / Special Edition  ';
      const clean = sanitizeSlugForFilename(dirtySlug);

      expect(clean).toBe('budi-ani-wedding-2026-special-edition');
      expect(clean.length).toBeLessThanOrEqual(50);
      expect(clean).not.toMatch(/[^a-z0-9-]/);
    });
  });

  describe('Formula Injection & CSV Escaping', () => {
    it('prepends single quote to values starting with =, +, -, @', () => {
      expect(sanitizeFormulaValue('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeFormulaValue('+628123456789')).toBe("'+628123456789");
      expect(sanitizeFormulaValue('-500')).toBe("'-500");
      expect(sanitizeFormulaValue('@admin')).toBe("'@admin");
      expect(sanitizeFormulaValue('Normal Text')).toBe('Normal Text');
    });

    it('properly escapes commas, quotes, and newlines in CSV cells', () => {
      expect(escapeCsvCell('Hello, World')).toBe('"Hello, World"');
      expect(escapeCsvCell('He said "Hello"')).toBe('"He said ""Hello"""');
      expect(escapeCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"');
      expect(escapeCsvCell('Normal')).toBe('Normal');
    });

    it('generates CSV with UTF-8 BOM prefix', () => {
      const rows: ReportRow[] = [
        {
          no: 1,
          name: '=Cmd|Calc',
          category: 'VIP',
          phoneNumber: '08123456',
          email: 'test@example.com',
          maxPax: 1,
          invitationStatus: 'DIBUAT',
          rsvpStatus: 'Hadir',
          rsvpPax: 1,
          attendanceStatus: 'Sudah Check-in',
          scannedPax: 1,
          scannedAt: '2026-09-13 10:00:00 WIB',
          scannerEmail: 'staff@example.com',
        },
      ];

      const csvBuffer = generateGuestDataCsv(rows);
      const csvStr = csvBuffer.toString('utf-8');

      // Check BOM prefix
      expect(csvStr.charCodeAt(0)).toBe(0xfeff);

      // Check formula sanitization inside CSV
      expect(csvStr).toContain("'=Cmd|Calc");

      // Check attendance report CSV as well
      const attCsvBuffer = generateAttendanceReportCsv(rows);
      const attCsvStr = attCsvBuffer.toString('utf-8');
      expect(attCsvStr.charCodeAt(0)).toBe(0xfeff);
      expect(attCsvStr).toContain('Petugas Check-in');
    });
  });
});
