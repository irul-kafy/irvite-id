/**
 * Phone number normalization utility for IRVITE.ID
 */
export interface PhoneNormalizationResult {
  valid: boolean;
  phoneNumber: string | null;
  error?: string;
}

export function normalizePhoneNumber(
  rawPhone: unknown,
): PhoneNormalizationResult {
  if (rawPhone === undefined || rawPhone === null) {
    return { valid: true, phoneNumber: null };
  }

  let str = '';
  if (typeof rawPhone === 'string' || typeof rawPhone === 'number') {
    str = String(rawPhone).trim();
  } else {
    return { valid: false, phoneNumber: null, error: 'INVALID_PHONE' };
  }
  if (!str) {
    return { valid: true, phoneNumber: null };
  }

  // Remove formatting: spaces, dashes, parentheses, dots, leading +
  let cleaned = str.replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Check if string contains only digits
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, phoneNumber: null, error: 'INVALID_PHONE' };
  }

  // Indonesian normalization
  // 081234567890 -> 6281234567890
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    // 81234567890 -> 6281234567890
    cleaned = '62' + cleaned;
  }

  // If it's an Indonesian number (starts with 628)
  if (cleaned.startsWith('628')) {
    // Mobile numbers in Indonesia: 628 + 8 to 12 digits (total 11 to 15 digits)
    if (cleaned.length >= 11 && cleaned.length <= 15) {
      return { valid: true, phoneNumber: cleaned };
    } else {
      return { valid: false, phoneNumber: null, error: 'INVALID_PHONE' };
    }
  }

  // International numbers: validate generic E.164 shape (7 to 15 digits)
  // Must not start with 0
  if (/^[1-9]\d{6,14}$/.test(cleaned)) {
    return { valid: true, phoneNumber: cleaned };
  }

  return { valid: false, phoneNumber: null, error: 'INVALID_PHONE' };
}
