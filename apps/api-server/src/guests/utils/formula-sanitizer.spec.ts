import { sanitizeFormulaValue, isFormulaCell } from './formula-sanitizer';

describe('formula-sanitizer', () => {
  describe('sanitizeFormulaValue', () => {
    it('prepends single quote to strings starting with formula indicators', () => {
      expect(sanitizeFormulaValue('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeFormulaValue('+cmd|/c')).toBe("'+cmd|/c");
      expect(sanitizeFormulaValue('-cmd|/c')).toBe("'-cmd|/c");
      expect(sanitizeFormulaValue('@HYPERLINK')).toBe("'@HYPERLINK");
      expect(sanitizeFormulaValue('  =1+1')).toBe("'  =1+1");
    });

    it('leaves safe values unchanged', () => {
      expect(sanitizeFormulaValue('Budi Santoso')).toBe('Budi Santoso');
      expect(sanitizeFormulaValue('budi@example.com')).toBe('budi@example.com');
      expect(sanitizeFormulaValue(123)).toBe(123);
      expect(sanitizeFormulaValue(null)).toBe(null);
      expect(sanitizeFormulaValue(undefined)).toBe(undefined);
    });
  });

  describe('isFormulaCell', () => {
    it('detects formula from string starting with =', () => {
      expect(isFormulaCell('=A1+B1')).toBe(true);
      expect(isFormulaCell('  =SUM(1,2)')).toBe(true);
    });

    it('detects formula from cellFormula argument', () => {
      expect(isFormulaCell('10', 'A1+B1')).toBe(true);
    });

    it('detects formula from ExcelJS cell value object', () => {
      expect(isFormulaCell({ formula: 'A1+1', result: 2 })).toBe(true);
      expect(isFormulaCell({ sharedFormula: 'A1+1', result: 2 })).toBe(true);
    });

    it('returns false for plain text and numbers', () => {
      expect(isFormulaCell('Budi Santoso')).toBe(false);
      expect(isFormulaCell(10)).toBe(false);
      expect(isFormulaCell(null)).toBe(false);
    });
  });
});
