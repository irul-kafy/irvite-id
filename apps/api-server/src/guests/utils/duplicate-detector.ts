import { normalizePhoneNumber } from './phone-normalizer';

export interface ExistingGuestInfo {
  id: string;
  name: string;
  phoneNumber?: string | null;
  email?: string | null;
}

export interface DetectDuplicateItem {
  sourceRow: number;
  name: string;
  phoneNumber?: string | null;
  email?: string | null;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateReasons: string[];
  matchedExistingGuestId?: string;
  matchedSourceRow?: number;
}

function normalizeKey(str?: string | null): string {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizePhoneKey(phone?: string | null): string {
  if (!phone) return '';
  const norm = normalizePhoneNumber(phone);
  if (norm.valid && norm.phoneNumber) {
    return norm.phoneNumber;
  }
  return phone.trim().replace(/[\s\-().]/g, '');
}

export function detectDuplicates(
  items: DetectDuplicateItem[],
  existingGuests: ExistingGuestInfo[],
): Map<number, DuplicateCheckResult> {
  const results = new Map<number, DuplicateCheckResult>();

  // Pre-index existing guests for quick lookup
  const existingByName = new Map<string, ExistingGuestInfo>();
  const existingByPhone = new Map<string, ExistingGuestInfo>();
  const existingByEmail = new Map<string, ExistingGuestInfo>();

  for (const g of existingGuests) {
    const nameKey = normalizeKey(g.name);
    if (nameKey && !existingByName.has(nameKey)) existingByName.set(nameKey, g);

    if (g.phoneNumber) {
      const phoneKey = normalizePhoneKey(g.phoneNumber);
      if (phoneKey && !existingByPhone.has(phoneKey))
        existingByPhone.set(phoneKey, g);
    }

    if (g.email) {
      const emailKey = normalizeKey(g.email);
      if (emailKey && !existingByEmail.has(emailKey))
        existingByEmail.set(emailKey, g);
    }
  }

  // Track items within current import file
  const seenByName = new Map<string, number>();
  const seenByPhone = new Map<string, number>();
  const seenByEmail = new Map<string, number>();

  for (const item of items) {
    const reasons: string[] = [];
    let matchedExistingId: string | undefined;
    let matchedRow: number | undefined;

    const nameKey = normalizeKey(item.name);
    const phoneKey = item.phoneNumber
      ? normalizePhoneKey(item.phoneNumber)
      : '';
    const emailKey = item.email ? normalizeKey(item.email) : '';

    // 1. Check against existing guests in the database
    if (nameKey && existingByName.has(nameKey)) {
      const match = existingByName.get(nameKey)!;
      reasons.push(`Nama sama dengan tamu terdaftar: "${match.name}"`);
      matchedExistingId = match.id;
    }

    if (phoneKey && existingByPhone.has(phoneKey)) {
      const match = existingByPhone.get(phoneKey)!;
      reasons.push(
        `No. WhatsApp sama dengan tamu terdaftar: "${match.name}" (${match.phoneNumber})`,
      );
      matchedExistingId = matchedExistingId || match.id;
    }

    if (emailKey && existingByEmail.has(emailKey)) {
      const match = existingByEmail.get(emailKey)!;
      reasons.push(
        `Email sama dengan tamu terdaftar: "${match.name}" (${match.email})`,
      );
      matchedExistingId = matchedExistingId || match.id;
    }

    // 2. Check against previous rows in the same upload
    if (nameKey && seenByName.has(nameKey)) {
      const priorRow = seenByName.get(nameKey)!;
      reasons.push(`Nama duplikat dengan Baris ${priorRow}`);
      matchedRow = priorRow;
    }

    if (phoneKey && seenByPhone.has(phoneKey)) {
      const priorRow = seenByPhone.get(phoneKey)!;
      reasons.push(`No. WhatsApp duplikat dengan Baris ${priorRow}`);
      matchedRow = matchedRow || priorRow;
    }

    if (emailKey && seenByEmail.has(emailKey)) {
      const priorRow = seenByEmail.get(emailKey)!;
      reasons.push(`Email duplikat dengan Baris ${priorRow}`);
      matchedRow = matchedRow || priorRow;
    }

    // Record this item's occurrence
    if (nameKey && !seenByName.has(nameKey))
      seenByName.set(nameKey, item.sourceRow);
    if (phoneKey && !seenByPhone.has(phoneKey))
      seenByPhone.set(phoneKey, item.sourceRow);
    if (emailKey && !seenByEmail.has(emailKey))
      seenByEmail.set(emailKey, item.sourceRow);

    results.set(item.sourceRow, {
      isDuplicate: reasons.length > 0,
      duplicateReasons: reasons,
      matchedExistingGuestId: matchedExistingId,
      matchedSourceRow: matchedRow,
    });
  }

  return results;
}
