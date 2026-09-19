/**
 * Public Contact & WhatsApp Order Configuration
 * Single source of truth for public business contact and template ordering.
 *
 * Sourced dynamically from environment variable:
 * - NEXT_PUBLIC_WHATSAPP_NUMBER
 * - or NEXT_PUBLIC_CONTACT_PHONE
 *
 * Requirements:
 * - Sanitizes raw input to digits only.
 * - Validates length (10 to 15 digits).
 * - Strictly rejects prohibited placeholder '6281234567890' or empty values.
 * - Fails closed: returns null if not configured or invalid.
 * - Never fabricates or silently falls back to a fake phone number.
 */

export const FORBIDDEN_PLACEHOLDER_NUMBER = '6281234567890';

export function getPublicWhatsAppNumber(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    process.env.NEXT_PUBLIC_CONTACT_PHONE;

  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const digits = raw.replace(/\D/g, '');

  // Must not be the prohibited placeholder number
  if (digits === FORBIDDEN_PLACEHOLDER_NUMBER) {
    return null;
  }

  // Indonesian / international mobile number standard length: 10 - 15 digits
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return digits;
}

/**
 * Builds a safe WhatsApp order URL for a specific template.
 * - Encodes template display name in the message.
 * - Excludes database UUID.
 * - Excludes Event creation.
 * - Does not require authentication.
 * - Returns null if contact number is unavailable.
 */
export function getTemplateOrderUrl(displayName: string): string | null {
  if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
    return null;
  }

  const phone = getPublicWhatsAppNumber();
  if (!phone) {
    return null;
  }

  const cleanName = displayName.trim();
  const text = encodeURIComponent(
    `Halo IRVITE.ID, saya ingin memesan undangan digital dengan tema ${cleanName}. Boleh info lebih lanjut?`
  );

  return `https://wa.me/${phone}?text=${text}`;
}

/**
 * Builds a safe general WhatsApp contact URL.
 * Returns null if contact number is unavailable.
 */
export function getGeneralContactUrl(customMessage?: string): string | null {
  const phone = getPublicWhatsAppNumber();
  if (!phone) {
    return null;
  }

  const msg = customMessage?.trim() || 'Halo IRVITE.ID, saya tertarik dengan layanan undangan digitalnya.';
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}
