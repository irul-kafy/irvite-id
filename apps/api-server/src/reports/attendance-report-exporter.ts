import * as ExcelJS from 'exceljs';
import { sanitizeFormulaValue } from '../guests/utils/formula-sanitizer';
import {
  ReportRow,
  EventReportInfo,
  ActiveFiltersInfo,
  calculateAttendanceSummary,
  formatWibDateTime,
  escapeCsvCell,
} from './report-read-model';

export const ATTENDANCE_DETAIL_COLUMNS = [
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
  { header: 'Petugas Check-in', key: 'scannerEmail', width: 28 },
];

export async function generateAttendanceReportXlsx(
  eventInfo: EventReportInfo,
  rows: ReportRow[],
  activeFilters: ActiveFiltersInfo,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IRVITE.ID';
  workbook.created = new Date();

  const summary = calculateAttendanceSummary(rows);

  // ==========================================
  // SHEET 1: RINGKASAN KEHADIRAN
  // ==========================================
  const summarySheet = workbook.addWorksheet('Ringkasan Kehadiran');

  summarySheet.columns = [
    { width: 34 },
    { width: 22 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 26 },
    { width: 26 },
  ];

  const titleRow = summarySheet.addRow(['RINGKASAN KEHADIRAN EVENT']);
  titleRow.font = {
    name: 'Arial',
    size: 14,
    bold: true,
    color: { argb: 'FF1E293B' },
  };
  summarySheet.addRow([]);

  // Header event info
  const infoRows = [
    ['Judul Acara', sanitizeFormulaValue(eventInfo.title)],
    ['Tanggal Pelaksanaan', formatWibDateTime(new Date(eventInfo.eventDate))],
    ['Lokasi Acara', sanitizeFormulaValue(eventInfo.locationDetails || '-')],
    [
      'Filter Laporan',
      `RSVP: ${activeFilters.rsvp}, Kehadiran: ${activeFilters.attendance}, Kategori: ${activeFilters.category || 'Semua'}`,
    ],
    ['Waktu Laporan Dibuat', formatWibDateTime(new Date())],
  ];

  for (const [k, v] of infoRows) {
    const r = summarySheet.addRow([k, v]);
    r.getCell(1).font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: 'FF475569' },
    };
    r.getCell(2).font = { name: 'Arial', size: 10 };
  }

  summarySheet.addRow([]);

  // Helper for section headers
  const addSectionHeader = (title: string) => {
    const r = summarySheet.addRow([title]);
    r.font = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    r.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    r.height = 24;
    return r;
  };

  // Section 1: Metrik Unit Undangan
  addSectionHeader('METRIK UNIT UNDANGAN (KELUARGA / GRUP)');
  const unitRows = [
    ['Total Unit Tamu Terdaftar', summary.totalGuestUnits],
    ['Unit Konfirmasi Hadir (RSVP YES)', summary.rsvpYesUnits],
    ['Unit Konfirmasi Tidak Hadir (RSVP NO)', summary.rsvpNoUnits],
    ['Unit Belum Konfirmasi RSVP', summary.pendingRsvpUnits],
    ['Unit Sudah Check-in', summary.checkedInUnits],
    ['Unit Belum Check-in', summary.notCheckedInUnits],
    ['Persentase Kehadiran Unit', `${summary.unitAttendancePct.toFixed(1)}%`],
  ];

  for (const [label, val] of unitRows) {
    const r = summarySheet.addRow([label, val]);
    r.font = { name: 'Arial', size: 10 };
    r.getCell(1).font = { bold: true };
    r.getCell(2).alignment = { horizontal: 'left' };
  }

  summarySheet.addRow([]);

  // Section 2: Metrik Fisik Headcount
  addSectionHeader('METRIK KAPASITAS FISIK (HEADCOUNT / PAX)');
  const paxRows = [
    ['Total Kuota Kapasitas Diundang', summary.totalMaxPax],
    ['Estimasi Kedatangan RSVP (Pax)', summary.plannedRsvpPax],
    ['Realisasi Fisik Kehadiran (Pax)', summary.actualScannedPax],
    ['Selisih Realisasi vs Estimasi RSVP', summary.differencePax],
    [
      'Persentase Realisasi Fisik (Pax)',
      `${summary.paxRealizationPct.toFixed(1)}%`,
    ],
  ];

  for (const [label, val] of paxRows) {
    const r = summarySheet.addRow([label, val]);
    r.font = { name: 'Arial', size: 10 };
    r.getCell(1).font = { bold: true };
    r.getCell(2).alignment = { horizontal: 'left' };
  }

  summarySheet.addRow([]);

  // Section 3: Breakdown per Kategori
  const catHeaderRow = summarySheet.addRow([
    'Kategori',
    'Unit Tamu',
    'Kuota Pax',
    'RSVP Hadir (Unit)',
    'RSVP Hadir (Pax)',
    'Check-in (Unit)',
    'Check-in (Pax)',
    'Persentase Realisasi Unit',
    'Persentase Realisasi Pax',
  ]);
  catHeaderRow.font = {
    name: 'Arial',
    size: 10,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };
  catHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF334155' },
  };
  catHeaderRow.height = 24;

  for (const c of summary.categories) {
    const r = summarySheet.addRow([
      sanitizeFormulaValue(c.category),
      c.units,
      c.quotaPax,
      c.rsvpYesUnits,
      c.rsvpYesPax,
      c.checkedInUnits,
      c.checkedInPax,
      `${c.unitRealizationPct.toFixed(1)}%`,
      `${c.paxRealizationPct.toFixed(1)}%`,
    ]);
    r.font = { name: 'Arial', size: 10 };
  }

  // ==========================================
  // SHEET 2: DETAIL KEHADIRAN
  // ==========================================
  const detailSheet = workbook.addWorksheet('Detail Kehadiran', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  detailSheet.columns = ATTENDANCE_DETAIL_COLUMNS;

  // Header style
  const detailHeaderRow = detailSheet.getRow(1);
  detailHeaderRow.font = {
    name: 'Arial',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };
  detailHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };
  detailHeaderRow.alignment = { vertical: 'middle', horizontal: 'left' };
  detailHeaderRow.height = 26;

  for (const r of rows) {
    const row = detailSheet.addRow({
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
      scannerEmail: sanitizeFormulaValue(r.scannerEmail),
    });

    row.font = { name: 'Arial', size: 10 };
    row.height = 20;
    row.alignment = { vertical: 'middle' };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function generateAttendanceReportCsv(rows: ReportRow[]): Buffer {
  const headers = ATTENDANCE_DETAIL_COLUMNS.map((c) => c.header);
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
      sanitizeFormulaValue(r.scannerEmail),
    ];

    csvLines.push(values.map(escapeCsvCell).join(','));
  }

  const BOM = '\uFEFF';
  const csvString = BOM + csvLines.join('\r\n');
  return Buffer.from(csvString, 'utf-8');
}
