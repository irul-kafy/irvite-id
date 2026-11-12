/**
 * Calendar utilities for digital wedding invitations.
 * Generates Google Calendar web intent links and RFC 5545 iCalendar (.ics) files.
 */

export interface CalendarEventDetails {
  title: string;
  startDateTime: string;
  endDateTime?: string;
  venue?: string;
  address?: string;
  description?: string;
  url?: string;
  timeZone?: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura' | string;
}

const TZ_OFFSETS: Record<string, string> = {
  'Asia/Jakarta': '+07:00',
  'Asia/Makassar': '+08:00',
  'Asia/Jayapura': '+09:00',
};

/**
 * Normalizes a date/time string with timezone offset if missing,
 * then returns a valid JavaScript Date object.
 */
export function parseCeremonyDate(dateStr: string, timeZone = 'Asia/Jakarta'): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date();
  }

  const trimmed = dateStr.trim();
  const defaultOffset = TZ_OFFSETS[timeZone] || '+07:00';

  // Check if string already has timezone indicator (Z or +HH:MM or -HH:MM or +HHMM)
  const hasTimezone = /Z|[+-]\d{2}(?::?\d{2})?$/i.test(trimmed);

  // If date-only format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const withTime = `${trimmed}T08:00:00${defaultOffset}`;
    const parsed = new Date(withTime);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  // If YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm without seconds or tz
  if (!hasTimezone) {
    const isoLike = trimmed.replace(' ', 'T');
    const withSecs = isoLike.length === 16 ? `${isoLike}:00` : isoLike;
    const withTz = `${withSecs}${defaultOffset}`;
    const parsed = new Date(withTz);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Returns pair of start and end Date objects.
 * If end date is missing or not after start, defaults to 2 hours after start.
 */
export function parseCalendarDates(
  startStr: string,
  endStr?: string,
  timeZone = 'Asia/Jakarta',
): { start: Date; end: Date } {
  const start = parseCeremonyDate(startStr, timeZone);
  let end: Date;

  if (endStr && endStr.trim()) {
    const parsedEnd = parseCeremonyDate(endStr, timeZone);
    if (parsedEnd.getTime() > start.getTime()) {
      end = parsedEnd;
    } else {
      end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2 hours
    }
  } else {
    end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2 hours
  }

  return { start, end };
}

/**
 * Formats a Date object to UTC compact ISO string for calendars: YYYYMMDDTHHmmssZ
 */
export function formatUtcDateCompact(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Builds a direct Google Calendar Web Intent URL
 * https://calendar.google.com/calendar/render?action=TEMPLATE&...
 */
export function buildGoogleCalendarUrl(event: CalendarEventDetails): string {
  const { start, end } = parseCalendarDates(
    event.startDateTime,
    event.endDateTime,
    event.timeZone,
  );
  const startCompact = formatUtcDateCompact(start);
  const endCompact = formatUtcDateCompact(end);

  const locationParts = [event.venue?.trim(), event.address?.trim()].filter(
    (part): part is string => Boolean(part && part.length > 0),
  );
  const location = locationParts.join(', ');

  const detailsParts: string[] = [];
  if (event.description?.trim()) {
    detailsParts.push(event.description.trim());
  }
  if (event.url?.trim()) {
    detailsParts.push(`Link Undangan: ${event.url.trim()}`);
  }
  const details = detailsParts.join('\n\n');

  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', (event.title || 'Undangan Pernikahan').trim());
  params.set('dates', `${startCompact}/${endCompact}`);

  if (details) {
    params.set('details', details);
  }
  if (location) {
    params.set('location', location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Escapes text for RFC 5545 iCalendar specification
 */
function escapeIcsText(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Generates valid RFC 5545 iCalendar (.ics) content for Apple Calendar, Outlook, and mobile devices
 */
export function buildIcsContent(event: CalendarEventDetails): string {
  const { start, end } = parseCalendarDates(
    event.startDateTime,
    event.endDateTime,
    event.timeZone,
  );
  const startCompact = formatUtcDateCompact(start);
  const endCompact = formatUtcDateCompact(end);
  const nowCompact = formatUtcDateCompact(new Date());

  const locationParts = [event.venue?.trim(), event.address?.trim()].filter(
    (part): part is string => Boolean(part && part.length > 0),
  );
  const location = locationParts.length > 0 ? escapeIcsText(locationParts.join(', ')) : '';

  const detailsParts: string[] = [];
  if (event.description?.trim()) {
    detailsParts.push(event.description.trim());
  }
  if (event.url?.trim()) {
    detailsParts.push(`Link Undangan: ${event.url.trim()}`);
  }
  const details = detailsParts.length > 0 ? escapeIcsText(detailsParts.join('\n\n')) : '';

  const title = escapeIcsText((event.title || 'Undangan Pernikahan').trim());
  const uid = `irvite-${startCompact}-${Math.random().toString(36).substring(2, 9)}@irvite.id`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Irvite.id//Digital Invitation Calendar//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowCompact}`,
    `DTSTART:${startCompact}`,
    `DTEND:${endCompact}`,
    `SUMMARY:${title}`,
    details ? `DESCRIPTION:${details}` : undefined,
    location ? `LOCATION:${location}` : undefined,
    event.url ? `URL:${event.url.trim()}` : undefined,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

/**
 * Triggers a download of the .ics file in browser environments
 */
export function downloadIcsFile(filename: string, icsContent: string): void {
  if (typeof window === 'undefined') return;

  const safeFilename = filename.toLowerCase().endsWith('.ics')
    ? filename
    : `${filename}.ics`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = safeFilename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  }, 100);
}
