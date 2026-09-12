import { Readable } from 'stream';
import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { normalizePhoneNumber } from './phone-normalizer';
import { isFormulaCell } from './formula-sanitizer';

export interface ParsedRowData {
  sourceRow: number;
  name: string;
  category: string;
  phoneNumber: string | null;
  email: string | null;
  maxPax: number;
  isValid: boolean;
  errors: string[];
  hasFormula: boolean;
}

export interface ParseSpreadsheetResult {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  unusedColumns: string[];
  rows: ParsedRowData[];
}

const CANONICAL_COLUMNS = {
  NAME: 'nama tamu',
  CATEGORY: 'kategori',
  PHONE: 'no. whatsapp',
  EMAIL: 'email',
  MAX_PAX: 'jumlah tamu',
} as const;

// Helper to normalize header string for matching
function normalizeHeaderName(header: unknown): string {
  if (header === undefined || header === null) return '';
  const text =
    typeof header === 'string' || typeof header === 'number'
      ? String(header)
      : '';
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Helper to normalize cell text
function normalizeText(val: unknown): string {
  if (val === undefined || val === null) return '';
  const text =
    typeof val === 'string' || typeof val === 'number' ? String(val) : '';
  return text.trim().replace(/\s+/g, ' ');
}

function detectCsvDelimiter(csvText: string): ';' | ',' {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return ',';
  const headerLine = lines[0];

  let inQuotes = false;
  let commaCount = 0;
  let semicolonCount = 0;

  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (char === ',') commaCount++;
      else if (char === ';') semicolonCount++;
    }
  }

  if (semicolonCount > 0 && semicolonCount >= commaCount) {
    return ';';
  }
  return ',';
}

export async function parseSpreadsheetBuffer(
  buffer: Buffer,
  fileType: 'xlsx' | 'csv',
): Promise<ParseSpreadsheetResult> {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestException('Berkas kosong atau tidak dapat dibaca.');
  }

  if (buffer.length > 5 * 1024 * 1024) {
    throw new BadRequestException(
      'Ukuran berkas melebihi batas maksimal 5 MB.',
    );
  }

  const workbook = new ExcelJS.Workbook();

  if (fileType === 'xlsx') {
    try {
      await workbook.xlsx.load(
        buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
      );
    } catch {
      throw new BadRequestException(
        'Format berkas Excel (.xlsx) rusak atau tidak valid.',
      );
    }
  } else {
    // CSV parsing with delimiter detection (comma vs semicolon) and BOM handling
    let csvText = buffer.toString('utf8');
    if (csvText.charCodeAt(0) === 0xfeff) {
      csvText = csvText.substring(1); // strip UTF-8 BOM
    }

    const delimiter = detectCsvDelimiter(csvText);

    try {
      await workbook.csv.read(Readable.from([csvText]), {
        parserOptions: {
          delimiter,
        },
      });
    } catch {
      throw new BadRequestException('Format berkas CSV tidak valid.');
    }
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    throw new BadRequestException(
      'Lembar kerja kosong atau tidak memiliki data.',
    );
  }

  // Row 1 is header
  const headerRow = worksheet.getRow(1);
  const columnCount = headerRow.cellCount;

  if (columnCount === 0) {
    throw new BadRequestException('Baris header tidak ditemukan.');
  }

  if (columnCount > 20) {
    throw new BadRequestException(
      'Jumlah kolom melebihi batas maksimal 20 kolom.',
    );
  }

  // Map header indexes
  const headerMap: { [key: string]: number } = {};
  const seenHeaders = new Set<string>();
  const unusedColumns: string[] = [];

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const rawVal = normalizeText(cell.value);
    const normalized = normalizeHeaderName(rawVal);
    if (!normalized) return;

    if (seenHeaders.has(normalized)) {
      throw new BadRequestException(
        `Header kolom duplikat ditemukan: "${rawVal}".`,
      );
    }
    seenHeaders.add(normalized);

    if (normalized === CANONICAL_COLUMNS.NAME) {
      headerMap['NAME'] = colNumber;
    } else if (normalized === CANONICAL_COLUMNS.CATEGORY) {
      headerMap['CATEGORY'] = colNumber;
    } else if (
      normalized === CANONICAL_COLUMNS.PHONE ||
      normalized === 'no whatsapp' ||
      normalized === 'nomor whatsapp' ||
      normalized === 'no. hp' ||
      normalized === 'whatsapp'
    ) {
      headerMap['PHONE'] = colNumber;
    } else if (normalized === CANONICAL_COLUMNS.EMAIL) {
      headerMap['EMAIL'] = colNumber;
    } else if (
      normalized === CANONICAL_COLUMNS.MAX_PAX ||
      normalized === 'pax' ||
      normalized === 'max pax' ||
      normalized === 'kuota tamu'
    ) {
      headerMap['MAX_PAX'] = colNumber;
    } else {
      unusedColumns.push(rawVal);
    }
  });

  // Verify REQUIRED column
  if (!headerMap['NAME']) {
    throw new BadRequestException(
      'Kolom wajib "Nama Tamu" tidak ditemukan pada baris pertama berkas.',
    );
  }

  const rows: ParsedRowData[] = [];
  let dataRowCount = 0;

  for (let r = 2; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    // Check if row is completely empty
    let hasAnyValue = false;
    row.eachCell({ includeEmpty: false }, () => {
      hasAnyValue = true;
    });
    if (!hasAnyValue) continue;

    dataRowCount++;
    if (dataRowCount > 1000) {
      throw new BadRequestException(
        'Jumlah data melebihi batas maksimal 1.000 baris tamu per impor.',
      );
    }

    const errors: string[] = [];
    let hasFormula = false;

    // Helper to extract cell value and formula flag
    const getCellData = (colIdx?: number) => {
      if (!colIdx) return { value: '', formula: false };
      const cell = row.getCell(colIdx);
      const isFormula = isFormulaCell(cell.value, cell.formula);
      let text = '';
      if (typeof cell.value === 'object' && cell.value !== null) {
        const obj = cell.value as unknown as Record<string, unknown>;
        text = normalizeText(obj.result ?? obj.text ?? '');
      } else {
        text = normalizeText(cell.value);
      }
      return { value: text, formula: isFormula };
    };

    const nameCell = getCellData(headerMap['NAME']);
    const categoryCell = getCellData(headerMap['CATEGORY']);
    const phoneCell = getCellData(headerMap['PHONE']);
    const emailCell = getCellData(headerMap['EMAIL']);
    const paxCell = getCellData(headerMap['MAX_PAX']);

    if (
      nameCell.formula ||
      categoryCell.formula ||
      phoneCell.formula ||
      emailCell.formula ||
      paxCell.formula
    ) {
      hasFormula = true;
      errors.push('FORMULA_NOT_ALLOWED');
    }

    // 1. Validate Name (1?100 chars, required, collapsed whitespace)
    const rawName = nameCell.value;
    if (!rawName || rawName.length === 0) {
      errors.push('INVALID_NAME');
    } else if (rawName.length > 100) {
      errors.push('INVALID_NAME');
    }

    // 2. Validate Category (optional, default REGULAR, max 50 chars)
    const rawCategory = categoryCell.value ? categoryCell.value.trim() : '';
    let category = 'REGULAR';
    if (rawCategory.length > 0) {
      if (rawCategory.length > 50) {
        errors.push('INVALID_CATEGORY');
      } else {
        category = rawCategory.toUpperCase();
      }
    }

    // 3. Validate Phone (optional, normalized)
    let phoneNumber: string | null = null;
    if (phoneCell.value) {
      const phoneNorm = normalizePhoneNumber(phoneCell.value);
      if (!phoneNorm.valid) {
        errors.push('INVALID_PHONE');
      } else {
        phoneNumber = phoneNorm.phoneNumber;
      }
    }

    // 4. Validate Email (optional, lowercase, max 150 chars)
    let email: string | null = null;
    if (emailCell.value) {
      const rawEmail = emailCell.value.toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (rawEmail.length > 150 || !emailRegex.test(rawEmail)) {
        errors.push('INVALID_EMAIL');
      } else {
        email = rawEmail;
      }
    }

    // 5. Validate Max Pax (optional, default 1, integer 1..50)
    let maxPax = 1;
    if (paxCell.value) {
      const parsedNum = Number(paxCell.value);
      if (
        !Number.isInteger(parsedNum) ||
        parsedNum < 1 ||
        parsedNum > 50 ||
        isNaN(parsedNum)
      ) {
        errors.push('INVALID_MAX_PAX');
      } else {
        maxPax = parsedNum;
      }
    }

    rows.push({
      sourceRow: r,
      name: rawName,
      category,
      phoneNumber,
      email,
      maxPax,
      isValid: errors.length === 0,
      errors,
      hasFormula,
    });
  }

  if (rows.length === 0) {
    throw new BadRequestException(
      'Berkas tidak memuat baris data tamu yang dapat diproses.',
    );
  }

  const validRowsCount = rows.filter((r) => r.isValid).length;
  const invalidRowsCount = rows.length - validRowsCount;

  return {
    totalRows: rows.length,
    validRowsCount,
    invalidRowsCount,
    unusedColumns,
    rows,
  };
}
