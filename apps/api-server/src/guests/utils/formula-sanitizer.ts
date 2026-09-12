/**
 * Sanitizes cell values to prevent CSV/Excel Formula Injection (DDE injection)
 * Any string value starting with =, +, -, or @ is prepended with a single quote (')
 */
export function sanitizeFormulaValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (
    trimmed.startsWith('=') ||
    trimmed.startsWith('+') ||
    trimmed.startsWith('-') ||
    trimmed.startsWith('@')
  ) {
    return "'" + value;
  }
  return value;
}

export function isFormulaCell(
  cellValue: unknown,
  cellFormula?: string,
): boolean {
  if (
    cellFormula &&
    typeof cellFormula === 'string' &&
    cellFormula.trim().length > 0
  ) {
    return true;
  }
  if (typeof cellValue === 'string') {
    const trimmed = cellValue.trim();
    if (trimmed.startsWith('=')) {
      return true;
    }
  }
  if (typeof cellValue === 'object' && cellValue !== null) {
    // ExcelJS cell objects may contain formula
    const obj = cellValue as Record<string, unknown>;
    if (obj.formula || obj.sharedFormula) {
      return true;
    }
  }
  return false;
}
