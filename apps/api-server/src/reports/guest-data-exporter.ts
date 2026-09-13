import * as ExcelJS from 'exceljs';
import { sanitizeFormulaValue } from '../guests/utils/formula-sanitizer';
import { ReportRow, escapeCsvCell } from './report-read-model';

export const GUEST_DATA_COLUMNS = [
  { header: 'No.', key: 'no', width: 8 },
  { header: 'Nama Tamu', key: 'name', width: 30 },
  { header: 'Kategori', key: 'category', width: 16 },
  { header: 'No. WhatsApp', key: 'phoneNumber', width: 22 },
  { header: 'Email', key: 'email', width: 28 },
  { header: 'Max Pax', key: 'maxPax', width: 12 },
  { header: 'Status Undangan', key: 'invitationStatus', width: 18 },
  { header: 'Status RSVP', key: 'rsvpStatus', width: 18 },
  { header: 'RSVP Pax', key: 'rsvpPax', width: 12 },
  { header: 'Status Kehadiran', key: 'attendanceStatus', width: 18 },
  { header: 'Pax Check-in', key: 'scannedPax', width: 14 },
  { header: 'Waktu Check-in', key: 'scannedAt', width: 26 },
];

export async function generateGuestDataXlsx(
  rows: ReportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IRVITE.ID';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Data Tamu', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = GUEST_DATA_COLUMNS;

  // Header style
  const headerRow = worksheet.getRow(1);
  headerRow.font = {
    name: 'Arial',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.height = 26;

  for (const r of rows) {
    const row = worksheet.addRow({
      no: r.no,
      name: sanitizeFormulaValue(r.name),
      category: sanitizeFormulaValue(r.category),
      phoneNumber: sanitizeFormulaValue(r.phoneNumber),
      email: sanitizeFormulaValue(r.email),
      maxPax: r.maxPax,
      invitationStatus: sanitizeFormulaValue(r.invitationStatus),
      rsvpStatus: sanitizeFormulaValue(r.rsvpStatus),
      rsvpPax: r.rsvpPax !== null ? r.rsvpPax : '',
      attendanceStatus: sanitizeFormulaValue(r.attendanceStatus),
      scannedPax: r.scannedPax,
      scannedAt: sanitizeFormulaValue(r.scannedAt),
    });

    row.font = { name: 'Arial', size: 10 };
    row.height = 20;
    row.alignment = { vertical: 'middle' };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function generateGuestDataCsv(rows: ReportRow[]): Buffer {
  const headers = GUEST_DATA_COLUMNS.map((c) => c.header);
  const csvLines: string[] = [];

  // Header line
  csvLines.push(headers.map(escapeCsvCell).join(','));

  for (const r of rows) {
    const values = [
      r.no,
      sanitizeFormulaValue(r.name),
      sanitizeFormulaValue(r.category),
      sanitizeFormulaValue(r.phoneNumber),
      sanitizeFormulaValue(r.email),
      r.maxPax,
      sanitizeFormulaValue(r.invitationStatus),
      sanitizeFormulaValue(r.rsvpStatus),
      r.rsvpPax !== null ? r.rsvpPax : '',
      sanitizeFormulaValue(r.attendanceStatus),
      r.scannedPax,
      sanitizeFormulaValue(r.scannedAt),
    ];

    csvLines.push(values.map(escapeCsvCell).join(','));
  }

  const BOM = '\uFEFF';
  const csvString = BOM + csvLines.join('\r\n');
  return Buffer.from(csvString, 'utf-8');
}
