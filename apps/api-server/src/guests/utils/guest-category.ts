import { BadRequestException } from '@nestjs/common';

export const ALLOWED_GUEST_CATEGORIES = [
  'REGULAR',
  'VIP',
  'VVIP',
  'FAMILY',
  'FAMILY_GROOM',
  'FAMILY_BRIDE',
  'FRIEND',
  'COLLEAGUE',
  'CREW_VENDOR',
  'ON_THE_SPOT',
] as const;

export type GuestCategory = (typeof ALLOWED_GUEST_CATEGORIES)[number];

const CATEGORY_ALIAS_MAP: Record<string, GuestCategory> = {
  REGULAR: 'REGULAR',
  REGULER: 'REGULAR',
  UMUM: 'REGULAR',
  VIP: 'VIP',
  VVIP: 'VVIP',
  FAMILY: 'FAMILY',
  KELUARGA: 'FAMILY',
  'KELUARGA MEMPELAI': 'FAMILY',
  FAMILY_GROOM: 'FAMILY_GROOM',
  'FAMILY GROOM': 'FAMILY_GROOM',
  KELUARGA_PRIA: 'FAMILY_GROOM',
  'KELUARGA PRIA': 'FAMILY_GROOM',
  'KELUARGA CPP': 'FAMILY_GROOM',
  'KELUARGA MEMPELAI PRIA': 'FAMILY_GROOM',
  FAMILY_BRIDE: 'FAMILY_BRIDE',
  'FAMILY BRIDE': 'FAMILY_BRIDE',
  KELUARGA_WANITA: 'FAMILY_BRIDE',
  'KELUARGA WANITA': 'FAMILY_BRIDE',
  'KELUARGA CPW': 'FAMILY_BRIDE',
  'KELUARGA MEMPELAI WANITA': 'FAMILY_BRIDE',
  FRIEND: 'FRIEND',
  TEMAN: 'FRIEND',
  COLLEAGUE: 'COLLEAGUE',
  KANTOR: 'COLLEAGUE',
  'TEMAN KANTOR': 'COLLEAGUE',
  REKAN_KERJA: 'COLLEAGUE',
  'REKAN KERJA': 'COLLEAGUE',
  CREW_VENDOR: 'CREW_VENDOR',
  'CREW VENDOR': 'CREW_VENDOR',
  'CREW / VENDOR': 'CREW_VENDOR',
  VENDOR: 'CREW_VENDOR',
  CREW: 'CREW_VENDOR',
  KRU: 'CREW_VENDOR',
  BAND: 'CREW_VENDOR',
  WO: 'CREW_VENDOR',
  'WEDDING ORGANIZER': 'CREW_VENDOR',
  PANITIA: 'CREW_VENDOR',
  PETUGAS: 'CREW_VENDOR',
  CATERING: 'CREW_VENDOR',
  MUA: 'CREW_VENDOR',
  FOTOGRAFER: 'CREW_VENDOR',
  ON_THE_SPOT: 'ON_THE_SPOT',
  'ON THE SPOT': 'ON_THE_SPOT',
};

export function normalizeGuestCategory(input?: string | null): {
  valid: boolean;
  category: GuestCategory;
} {
  if (input === undefined || input === null) {
    return { valid: true, category: 'REGULAR' };
  }
  const trimmed = String(input).trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) {
    return { valid: true, category: 'REGULAR' };
  }
  const upper = trimmed.toUpperCase();
  const mapped = CATEGORY_ALIAS_MAP[upper];
  if (mapped) {
    return { valid: true, category: mapped };
  }
  return { valid: false, category: 'REGULAR' };
}

export function parseOrThrowGuestCategory(
  input?: string | null,
): GuestCategory {
  const result = normalizeGuestCategory(input);
  if (!result.valid) {
    throw new BadRequestException(
      `Kategori tamu tidak valid. Pilihan yang diizinkan: ${ALLOWED_GUEST_CATEGORIES.join(', ')}.`,
    );
  }
  return result.category;
}
