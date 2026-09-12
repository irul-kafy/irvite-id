import * as ExcelJS from 'exceljs';
import { sanitizeFormulaValue } from './formula-sanitizer';

export interface ImportReportRow {
  sourceRow: number;
  name: string;
  category?: string;
  phoneNumber?: string | null;
  email?: string | null;
  maxPax?: number;
  status: string; // 'IMPORTED' | 'SKIPPED_DUPLICATE' | 'INVALID' | 'FAILED'
  reason?: string;
  canonicalUrl?: string | null;
}

export async function generateGuestImportReport(
  rows: ImportReportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IRVITE.ID';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Laporan Import', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = [
    { header: 'No. Baris Asal', key: 'sourceRow', width: 16 },
    { header: 'Nama Tamu', key: 'name', width: 30 },
    { header: 'Kategori', key: 'category', width: 16 },
    { header: 'No. WhatsApp', key: 'phoneNumber', width: 22 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Jumlah Tamu', key: 'maxPax', width: 14 },
    { header: 'Status Akhir', key: 'status', width: 22 },
    { header: 'Keterangan', key: 'reason', width: 36 },
    { header: 'Link Undangan Personal', key: 'canonicalUrl', width: 45 },
  ];

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
      sourceRow: r.sourceRow,
      name: sanitizeFormulaValue(r.name || ''),
      category: sanitizeFormulaValue(r.category || 'REGULAR'),
      phoneNumber: sanitizeFormulaValue(r.phoneNumber || '-'),
      email: sanitizeFormulaValue(r.email || '-'),
      maxPax: r.maxPax || 1,
      status: sanitizeFormulaValue(r.status),
      reason: sanitizeFormulaValue(r.reason || '-'),
      canonicalUrl: sanitizeFormulaValue(r.canonicalUrl || '-'),
    });

    row.font = { name: 'Arial', size: 10 };
    row.height = 20;
    row.alignment = { vertical: 'middle' };

    // Badge styling for status cell
    const statusCell = row.getCell('status');
    if (r.status === 'IMPORTED') {
      statusCell.font = { color: { argb: 'FF15803D' }, bold: true }; // Green
    } else if (r.status === 'SKIPPED_DUPLICATE') {
      statusCell.font = { color: { argb: 'FFB45309' }, bold: true }; // Amber
    } else {
      statusCell.font = { color: { argb: 'FFB91C1C' }, bold: true }; // Red
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
