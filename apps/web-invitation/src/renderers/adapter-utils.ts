/**
 * Shared sanitization and fallback extraction utilities for all invitation template adapters.
 */

const DRAFT_TAG_REGEX =
  /\s*\((?:Draf Klien|PENGAJUAN KLIEN)\s*#[A-Za-z0-9-]+\)/gi;

/**
 * Strips internal admin draft reference tags (e.g. "(Draf Klien #IRV-XXXXX)")
 * from an event title so they never leak onto public invitation covers.
 */
export function cleanInvitationEventTitle(
  rawTitle?: string | null,
  fallback = '',
): string {
  if (!rawTitle || typeof rawTitle !== 'string') return fallback;
  const cleaned = rawTitle.replace(DRAFT_TAG_REGEX, '').trim();
  return cleaned || fallback;
}

/**
 * Intelligently extracts couple names [partnerOne, partnerTwo] from an event title
 * such as "Pernikahan Amila & Raiswa (Draf Klien #IRV-12345)", "The Wedding of Lyra & Elian",
 * or "Amila & Raiswa" when structured content fields are missing.
 */
export function extractCoupleNamesFromTitle(
  rawTitle?: string | null,
): [string, string] | null {
  const cleaned = cleanInvitationEventTitle(rawTitle, '')
    .replace(/\s*[—-]\s*Digital Invitation$/i, '')
    .trim();
  if (!cleaned) return null;

  const match = cleaned.match(
    /^(?:(?:pernikahan|pawiwahan(?:\s+agung)?|the\s+royal\s+wedding\s+of|the\s+wedding\s+of|wedding\s+of|undangan\s+pernikahan)\s+)?([A-Za-zÀ-ÖØ-öø-ÿ'.,\s-]+?)\s+(?:&|dan|and)\s+([A-Za-zÀ-ÖØ-öø-ÿ'.,\s-]+?)(?:\s*[—(-].*)?$/i,
  );

  if (!match) return null;
  const p1 = match[1]?.trim() || '';
  const p2 = match[2]?.trim() || '';
  if (!p1 || !p2) return null;

  return [p1, p2];
}

