/**
 * Build a WhatsApp share URL using the generic wa.me/?text= pattern.
 * Does NOT target a specific phone number -- the operator chooses the recipient.
 */
export function buildWhatsAppShareUrl(
  guestName: string,
  eventTitle: string,
  canonicalUrl: string,
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

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
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
