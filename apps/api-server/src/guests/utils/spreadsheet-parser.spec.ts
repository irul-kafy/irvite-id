import { parseSpreadsheetBuffer } from './spreadsheet-parser';
import * as ExcelJS from 'exceljs';
import { BadRequestException } from '@nestjs/common';

describe('spreadsheet-parser', () => {
  async function createXlsxBuffer(
    headers: string[],
    rows: (string | number | { formula: string; result?: any })[][],
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Data Tamu');
    ws.addRow(headers);
    for (const row of rows) {
      ws.addRow(row);
    }
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  describe('XLSX parsing', () => {
    it('parses valid XLSX file with canonical columns correctly', async () => {
      const buffer = await createXlsxBuffer(
        ['Nama Tamu', 'Kategori', 'No. WhatsApp', 'Email', 'Jumlah Tamu'],
        [
          ['Budi Santoso', 'VIP', '081234567890', 'budi@example.com', 2],
          ['Andi', '', '', '', ''],
        ],
      );

      const result = await parseSpreadsheetBuffer(buffer, 'xlsx');
      expect(result.totalRows).toBe(2);
      expect(result.validRowsCount).toBe(2);
      expect(result.invalidRowsCount).toBe(0);

      expect(result.rows[0]).toEqual({
        sourceRow: 2,
        name: 'Budi Santoso',
        category: 'VIP',
        phoneNumber: '6281234567890',
        email: 'budi@example.com',
        maxPax: 2,
        isValid: true,
        errors: [],
        hasFormula: false,
      });

      expect(result.rows[1]).toEqual({
        sourceRow: 3,
        name: 'Andi',
        category: 'REGULAR',
        phoneNumber: null,
        email: null,
        maxPax: 1,
        isValid: true,
        errors: [],
        hasFormula: false,
      });
    });

    it('rejects file when Nama Tamu header is missing', async () => {
      const buffer = await createXlsxBuffer(
        ['Kategori', 'No. WhatsApp'],
        [['VIP', '0812']],
      );
      await expect(parseSpreadsheetBuffer(buffer, 'xlsx')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects file when duplicate canonical header exists', async () => {
      const buffer = await createXlsxBuffer(
        ['Nama Tamu', 'Kategori', 'Nama Tamu'],
        [['Budi', 'VIP', 'Budi 2']],
      );
      await expect(parseSpreadsheetBuffer(buffer, 'xlsx')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('flags formula cells with FORMULA_NOT_ALLOWED', async () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Data Tamu');
      ws.addRow(['Nama Tamu', 'Jumlah Tamu']);
      const row = ws.addRow(['Budi', 2]);
      row.getCell(1).value = { formula: 'CONCAT("A","B")', result: 'AB' };
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());

      const result = await parseSpreadsheetBuffer(buffer, 'xlsx');
      expect(result.rows[0].isValid).toBe(false);
      expect(result.rows[0].errors).toContain('FORMULA_NOT_ALLOWED');
    });

    it('flags invalid name, invalid email, and invalid maxPax', async () => {
      const buffer = await createXlsxBuffer(
        ['Nama Tamu', 'Email', 'Jumlah Tamu', 'No. WhatsApp'],
        [
          ['', 'not-an-email', 'abc', 'invalid-phone'],
          ['A'.repeat(101), 'valid@example.com', -1, '081234567890'],
          ['Valid Name', 'valid@example.com', 51, '081234567890'],
        ],
      );

      const result = await parseSpreadsheetBuffer(buffer, 'xlsx');
      expect(result.rows[0].errors).toContain('INVALID_NAME');
      expect(result.rows[0].errors).toContain('INVALID_EMAIL');
      expect(result.rows[0].errors).toContain('INVALID_MAX_PAX');
      expect(result.rows[0].errors).toContain('INVALID_PHONE');

      expect(result.rows[1].errors).toContain('INVALID_NAME');
      expect(result.rows[1].errors).toContain('INVALID_MAX_PAX');

      expect(result.rows[2].errors).toContain('INVALID_MAX_PAX');
    });

    it('reports unused non-canonical columns', async () => {
      const buffer = await createXlsxBuffer(
        ['Nama Tamu', 'Catatan Meja', 'Kota Asal'],
        [['Budi', 'Meja 5', 'Bandung']],
      );

      const result = await parseSpreadsheetBuffer(buffer, 'xlsx');
      expect(result.unusedColumns).toContain('Catatan Meja');
      expect(result.unusedColumns).toContain('Kota Asal');
    });
  });

  describe('CSV parsing', () => {
    it('parses comma-delimited CSV correctly', async () => {
      const csv =
        'Nama Tamu,Kategori,No. WhatsApp,Email,Jumlah Tamu\nSiti Rahma,VIP,081234567890,siti@example.com,3';
      const buffer = Buffer.from(csv, 'utf8');

      const result = await parseSpreadsheetBuffer(buffer, 'csv');
      expect(result.totalRows).toBe(1);
      expect(result.validRowsCount).toBe(1);
      expect(result.rows[0].name).toBe('Siti Rahma');
      expect(result.rows[0].phoneNumber).toBe('6281234567890');
      expect(result.rows[0].maxPax).toBe(3);
    });

    it('parses semicolon-delimited CSV correctly', async () => {
      const csv =
        'Nama Tamu;Kategori;No. WhatsApp;Email;Jumlah Tamu\nJoko Widodo;KELUARGA;+62811223344;joko@example.com;4';
      const buffer = Buffer.from(csv, 'utf8');

      const result = await parseSpreadsheetBuffer(buffer, 'csv');
      expect(result.totalRows).toBe(1);
      expect(result.validRowsCount).toBe(1);
      expect(result.rows[0].name).toBe('Joko Widodo');
      expect(result.rows[0].category).toBe('KELUARGA');
      expect(result.rows[0].phoneNumber).toBe('62811223344');
      expect(result.rows[0].maxPax).toBe(4);
    });

    it('handles UTF-8 BOM in CSV', async () => {
      const csv = '\uFEFFNama Tamu,Kategori\nBudi Santoso,REGULAR';
      const buffer = Buffer.from(csv, 'utf8');

      const result = await parseSpreadsheetBuffer(buffer, 'csv');
      expect(result.totalRows).toBe(1);
      expect(result.rows[0].name).toBe('Budi Santoso');
    });
    it('is not fooled by commas or semicolons inside quoted CSV cells (quote-aware delimiter detection)', async () => {
      const csv = 'Nama Tamu;Kategori\n"Smith, John";VIP';
      const buffer = Buffer.from(csv, 'utf8');

      const result = await parseSpreadsheetBuffer(buffer, 'csv');
      expect(result.totalRows).toBe(1);
      expect(result.validRowsCount).toBe(1);
      expect(result.rows[0].name).toBe('Smith, John');
      expect(result.rows[0].category).toBe('VIP');
    });

    it('handles RFC-style quoted commas in comma-delimited CSV', async () => {
      const csv =
        'Nama Tamu,Kategori,No. WhatsApp\n"Doe, Jane",REGULAR,081234567899';
      const buffer = Buffer.from(csv, 'utf8');

      const result = await parseSpreadsheetBuffer(buffer, 'csv');
      expect(result.totalRows).toBe(1);
      expect(result.validRowsCount).toBe(1);
      expect(result.rows[0].name).toBe('Doe, Jane');
      expect(result.rows[0].category).toBe('REGULAR');
      expect(result.rows[0].phoneNumber).toBe('6281234567899');
    });

    it('enforces category length boundary: 50 chars valid, 51 chars invalid (INVALID_CATEGORY)', async () => {
      const cat50 = 'A'.repeat(50);
      const cat51 = 'B'.repeat(51);
      const csv =
        'Nama Tamu,Kategori\nGuest 50,' + cat50 + '\nGuest 51,' + cat51;
      const buffer = Buffer.from(csv, 'utf8');

      const result = await parseSpreadsheetBuffer(buffer, 'csv');
      expect(result.totalRows).toBe(2);
      expect(result.rows[0].isValid).toBe(true);
      expect(result.rows[0].category).toBe(cat50);
      expect(result.rows[0].errors).toEqual([]);

      expect(result.rows[1].isValid).toBe(false);
      expect(result.rows[1].errors).toContain('INVALID_CATEGORY');
    });
  });
});
