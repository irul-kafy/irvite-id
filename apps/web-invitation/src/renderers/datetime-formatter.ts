/**
 * Datetime Formatter for Event-Local Timezone-Neutral Ceremony Datetimes
 * Asia/Jakarta -> WIB, Asia/Makassar -> WITA, Asia/Jayapura -> WIT
 */

export interface FormattedEventDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timeZoneLabel: string;
  formattedDate: string;
  formattedDateShort: string;
  formattedTime: string;
  fullFormatted: string;
}

const TIME_ZONE_LABELS: Record<string, string> = {
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
};

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_NAMES_ID = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

export function resolveTimeZoneLabel(timeZone?: string | null): string {
  if (!timeZone) return 'WIB';
  return TIME_ZONE_LABELS[timeZone] || 'WIB';
}

export function parseEventLocalDateTime(
  dateTimeStr: string | null | undefined,
  timeZone?: string | null,
): FormattedEventDateTime | null {
  if (!dateTimeStr || typeof dateTimeStr !== 'string') return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(dateTimeStr.trim());
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const hour = parseInt(match[4], 10);
  const minute = parseInt(match[5], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const timeZoneLabel = resolveTimeZoneLabel(timeZone);

  // Deterministic weekday using UTC to avoid any browser timezone drift
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = DAY_NAMES_ID[utcDate.getUTCDay()];
  const monthName = MONTH_NAMES_ID[month - 1];

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedTime = `${pad(hour)}:${pad(minute)} ${timeZoneLabel}`;
  const formattedDate = `${dayOfWeek}, ${day} ${monthName} ${year}`;
  const formattedDateShort = `${pad(day)} . ${pad(month)} . ${year}`;
  const fullFormatted = `${formattedDate}, ${formattedTime}`;

  return {
    year,
    month,
    day,
    hour,
    minute,
    timeZoneLabel,
    formattedDate,
    formattedDateShort,
    formattedTime,
    fullFormatted,
  };
}

export function formatCeremonyDate(dateTimeStr: string | null | undefined, timeZone?: string | null): string {
  const parsed = parseEventLocalDateTime(dateTimeStr, timeZone);
  return parsed ? parsed.formattedDate : '';
}

export function formatCeremonyDateShort(dateTimeStr: string | null | undefined, timeZone?: string | null): string {
  const parsed = parseEventLocalDateTime(dateTimeStr, timeZone);
  return parsed ? parsed.formattedDateShort : '';
}

export function formatCeremonyTime(dateTimeStr: string | null | undefined, timeZone?: string | null): string {
  const parsed = parseEventLocalDateTime(dateTimeStr, timeZone);
  return parsed ? parsed.formattedTime : '';
}

export function formatCeremonyTimeRange(
  startStr: string | null | undefined,
  endStr?: string | null | undefined,
  timeZone?: string | null,
): string {
  const start = parseEventLocalDateTime(startStr, timeZone);
  if (!start) return '';

  if (!endStr) {
    return start.formattedTime;
  }

  const end = parseEventLocalDateTime(endStr, timeZone);
  if (!end) {
    return start.formattedTime;
  }

  const startEpoch = parseTargetEpoch(startStr, timeZone);
  const endEpoch = parseTargetEpoch(endStr, timeZone);
  if (startEpoch !== null && endEpoch !== null && endEpoch < startEpoch) {
    return start.formattedTime;
  }

  const pad = (n: number) => n.toString().padStart(2, '0');

  // Same day
  if (start.year === end.year && start.month === end.month && start.day === end.day) {
    return `${pad(start.hour)}:${pad(start.minute)} – ${pad(end.hour)}:${pad(end.minute)} ${start.timeZoneLabel}`;
  }

  // Cross date: unambiguous full format
  return `${start.formattedDate}, ${pad(start.hour)}:${pad(start.minute)} ${start.timeZoneLabel} – ${end.formattedDate}, ${pad(end.hour)}:${pad(end.minute)} ${end.timeZoneLabel}`;
}

export function parseTargetEpoch(dateTimeStr: string | null | undefined, timeZone?: string | null): number | null {
  if (!dateTimeStr || typeof dateTimeStr !== 'string') return null;
  const trimmed = dateTimeStr.trim();
  if (/[Z+-]\d{2}(?::?\d{2})?$/i.test(trimmed)) {
    const epoch = Date.parse(trimmed);
    return Number.isFinite(epoch) ? epoch : null;
  }
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)/.exec(trimmed);
  if (!match) return null;
  const offset = timeZone === 'Asia/Makassar' ? '+08:00' : timeZone === 'Asia/Jayapura' ? '+09:00' : '+07:00';
  const isoWithOffset = `${match[1].length === 16 ? match[1] + ':00' : match[1]}${offset}`;
  const epoch = Date.parse(isoWithOffset);
  return Number.isFinite(epoch) ? epoch : null;
}
