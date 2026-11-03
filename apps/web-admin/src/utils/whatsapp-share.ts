/**
 * Normalizes a phone number for WhatsApp wa.me links:
 * - Strips all non-digit characters (+, spaces, hyphens, parentheses)
 * - Converts leading '0' to Indonesian country code '62' (e.g. 0812... -> 62812...)
 * - Preserves existing country code if already starts with non-zero (e.g. 62812...)
 */
export function normalizeWhatsAppPhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return '62' + digits.slice(1);
  }
  return digits;
}

/**
 * Build a WhatsApp share URL using the wa.me pattern.
 * If phoneNumber is provided, targets that phone directly: wa.me/<phone>?text=...
 * If phoneNumber is omitted, falls back to wa.me/?text=... so user chooses recipient.
 */
export function buildWhatsAppShareUrl(
  guestName: string,
  eventTitle: string,
  canonicalUrl: string,
  phoneNumber?: string | null,
): string {
  const message = [
    `Kepada Yth. Bapak/Ibu ${guestName},`,
    '',
    `Kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara ${eventTitle}.`,
    '',
    'Silakan buka undangan melalui tautan berikut:',
    canonicalUrl,
    '',
    'Terima kasih.',
  ].join("\n");

  const cleanPhone = normalizeWhatsAppPhone(phoneNumber);
  const target = cleanPhone ? `${cleanPhone}` : '';
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}

/**
 * Determine whether a canonical URL points to a local/development server.
 * Returns true if hostname is localhost, 127.0.0.1, [::1], or ::1.
 */
export function isLocalhostUrl(canonicalUrl: string): boolean {
  try {
    const parsed = new URL(canonicalUrl);
    const host = parsed.hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      host === '::1'
    );
  } catch {
    return false;
  }
}
