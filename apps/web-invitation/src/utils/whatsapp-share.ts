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
 * If phoneNumber is provided, targets that phone directly: https://wa.me/<phone>?text=...
 * If phoneNumber is omitted, falls back to https://wa.me/?text=... so user chooses recipient in WhatsApp.
 */
export function buildWhatsAppShareUrl(
  guestName: string,
  eventTitle: string,
  canonicalUrl: string,
  phoneNumber?: string | null,
  customGreeting?: string | null,
): string {
  let message: string;

  if (customGreeting && customGreeting.trim()) {
    message = [
      `Kepada Yth. Bapak/Ibu/Saudara/i ${guestName},`,
      '',
      customGreeting.trim(),
      '',
      'Silakan buka tautan undangan berikut:',
      canonicalUrl,
      '',
      'Terima kasih.',
    ].join('\n');
  } else {
    message = [
      `Kepada Yth. Bapak/Ibu/Saudara/i ${guestName},`,
      '',
      `Tanpa mengurangi rasa hormat, kami bermaksud mengundang Bapak/Ibu/Saudara/i untuk hadir di acara bahagia kami: ${eventTitle}.`,
      '',
      'Informasi lengkap dan konfirmasi kehadiran (RSVP) dapat diakses melalui tautan undangan berikut:',
      canonicalUrl,
      '',
      'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.',
      '',
      'Terima kasih.',
    ].join('\n');
  }

  const cleanPhone = normalizeWhatsAppPhone(phoneNumber);
  const target = cleanPhone ? `${cleanPhone}` : '';
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}

/**
 * Exports portal guests to CSV formatted string compatible with Excel / Google Sheets
 */
export interface CsvGuestRow {
  name: string;
  category: string;
  phoneNumber?: string | null;
  tableNumber?: string | null;
  maxPax: number;
  isWaSent: boolean;
  rsvpStatus: string;
  rsvpPax?: number | null;
  invitationUrl: string;
}

export function generateGuestsCsv(guests: CsvGuestRow[]): string {
  const headers = [
    'Nama Tamu',
    'Kategori',
    'Nomor WhatsApp',
    'Nomor Meja',
    'Pax',
    'Status Kirim WA',
    'Status RSVP',
    'Pax Hadir',
    'Link Undangan',
  ];

  const escapeCsv = (str: string | number | null | undefined): string => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = guests.map((g) => [
    escapeCsv(g.name),
    escapeCsv(g.category),
    escapeCsv(g.phoneNumber || '-'),
    escapeCsv(g.tableNumber || '-'),
    escapeCsv(g.maxPax),
    escapeCsv(g.isWaSent ? 'Sudah Terkirim' : 'Belum Terkirim'),
    escapeCsv(g.rsvpStatus),
    escapeCsv(g.rsvpPax !== null && g.rsvpPax !== undefined ? g.rsvpPax : '-'),
    escapeCsv(g.invitationUrl),
  ]);

  // Include UTF-8 BOM so Excel opens accents and special characters without corruption
  return '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

