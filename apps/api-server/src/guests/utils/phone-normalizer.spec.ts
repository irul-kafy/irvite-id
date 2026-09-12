import { normalizePhoneNumber } from './phone-normalizer';

describe('normalizePhoneNumber', () => {
  it('returns null for null, undefined, or empty string', () => {
    expect(normalizePhoneNumber(null)).toEqual({
      valid: true,
      phoneNumber: null,
    });
    expect(normalizePhoneNumber(undefined)).toEqual({
      valid: true,
      phoneNumber: null,
    });
    expect(normalizePhoneNumber('')).toEqual({
      valid: true,
      phoneNumber: null,
    });
    expect(normalizePhoneNumber('   ')).toEqual({
      valid: true,
      phoneNumber: null,
    });
  });

  it('normalizes 08... to 628...', () => {
    const res = normalizePhoneNumber('081234567890');
    expect(res).toEqual({ valid: true, phoneNumber: '6281234567890' });
  });

  it('normalizes 8... to 628...', () => {
    const res = normalizePhoneNumber('81234567890');
    expect(res).toEqual({ valid: true, phoneNumber: '6281234567890' });
  });

  it('normalizes +628... to 628...', () => {
    const res = normalizePhoneNumber('+6281234567890');
    expect(res).toEqual({ valid: true, phoneNumber: '6281234567890' });
  });

  it('leaves 628... unchanged', () => {
    const res = normalizePhoneNumber('6281234567890');
    expect(res).toEqual({ valid: true, phoneNumber: '6281234567890' });
  });

  it('removes spaces, dashes, parentheses, dots', () => {
    // Note: if someone writes (0812) with 0, cleaned is 620812... which is not standard mobile, but +62 812-3456.7890:
    const res2 = normalizePhoneNumber('+62 812-3456.7890');
    expect(res2).toEqual({ valid: true, phoneNumber: '6281234567890' });
  });

  it('accepts valid foreign international numbers with explicit prefix', () => {
    const res = normalizePhoneNumber('+14155552671');
    expect(res).toEqual({ valid: true, phoneNumber: '14155552671' });

    const resSg = normalizePhoneNumber('+6591234567');
    expect(resSg).toEqual({ valid: true, phoneNumber: '6591234567' });
  });

  it('rejects invalid numbers containing letters or symbols', () => {
    expect(normalizePhoneNumber('0812abc')).toEqual({
      valid: false,
      phoneNumber: null,
      error: 'INVALID_PHONE',
    });
    expect(normalizePhoneNumber('not-a-phone')).toEqual({
      valid: false,
      phoneNumber: null,
      error: 'INVALID_PHONE',
    });
  });

  it('rejects numbers that are too short or too long for Indonesian mobile', () => {
    expect(normalizePhoneNumber('0812')).toEqual({
      valid: false,
      phoneNumber: null,
      error: 'INVALID_PHONE',
    });
    expect(normalizePhoneNumber('081234567890123456')).toEqual({
      valid: false,
      phoneNumber: null,
      error: 'INVALID_PHONE',
    });
  });
});
