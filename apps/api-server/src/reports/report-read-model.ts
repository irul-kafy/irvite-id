export interface ReportRow {
  no: number;
  name: string;
  category: string;
  phoneNumber: string;
  email: string;
  maxPax: number;
  invitationStatus: string;
  rsvpStatus: string;
  rsvpPax: number | null;
  attendanceStatus: string;
  scannedPax: number;
  scannedAt: string;
  scannerEmail: string;
}

export interface EventReportInfo {
  title: string;
  slug: string;
  eventDate: Date;
  locationDetails?: string | null;
}

export interface ActiveFiltersInfo {
  rsvp: string;
  attendance: string;
  category?: string;
}

export interface CategoryMetric {
  category: string;
  units: number;
  quotaPax: number;
  rsvpYesUnits: number;
  rsvpYesPax: number;
  checkedInUnits: number;
  checkedInPax: number;
  unitRealizationPct: number;
  paxRealizationPct: number;
}

export interface AttendanceSummaryMetrics {
  totalGuestUnits: number;
  rsvpYesUnits: number;
  rsvpNoUnits: number;
  pendingRsvpUnits: number;
  checkedInUnits: number;
  notCheckedInUnits: number;
  unitAttendancePct: number;

  totalMaxPax: number;
  plannedRsvpPax: number;
  actualScannedPax: number;
  differencePax: number;
  paxRealizationPct: number;

  categories: CategoryMetric[];
}

export function formatWibDateTime(date: Date): string {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const getPart = (type: string) =>
    parts.find((p) => p.type === type)?.value || '';
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const second = getPart('second');

  return `${year}-${month}-${day} ${hour}:${minute}:${second} WIB`;
}

export function getWibDateStamp(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const getPart = (type: string) =>
    parts.find((p) => p.type === type)?.value || '';
  return `${getPart('year')}${getPart('month')}${getPart('day')}`;
}

export function sanitizeSlugForFilename(slug: string): string {
  if (!slug || typeof slug !== 'string') {
    return 'event';
  }
  const cleaned = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  return cleaned || 'event';
}

export function escapeCsvCell(
  val: string | number | boolean | null | undefined,
): string {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val);
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface RawGuestWithRelations {
  name: string;
  category: string;
  phoneNumber?: string | null;
  email?: string | null;
  maxPax: number;
  invitation?: {
    status: string;
    rsvpPax?: number | null;
    attendances?: Array<{
      status: string;
      scannedPax: number;
      scannedAt: Date;
      staff?: {
        email?: string | null;
      } | null;
    }> | null;
  } | null;
}

export function mapToReportRow(
  guest: RawGuestWithRelations,
  index: number,
): ReportRow {
  const no = index + 1;
  const name = guest.name || '';
  const category = guest.category || 'REGULAR';
  const phoneNumber = guest.phoneNumber || '-';
  const email = guest.email || '-';
  const maxPax = guest.maxPax;

  // Canonical Invitation & RSVP Semantics
  let invitationStatus = 'BELUM_DIBUAT';
  let rsvpStatus = 'Belum Ada Undangan';
  let rsvpPax: number | null = null;

  if (guest.invitation) {
    invitationStatus = guest.invitation.status;
    if (guest.invitation.status === 'RSVP_YES') {
      rsvpStatus = 'Hadir';
      rsvpPax =
        typeof guest.invitation.rsvpPax === 'number'
          ? guest.invitation.rsvpPax
          : null;
    } else if (guest.invitation.status === 'RSVP_NO') {
      rsvpStatus = 'Tidak Hadir';
      rsvpPax = null;
    } else {
      rsvpStatus = 'Belum RSVP';
      rsvpPax = null;
    }
  }

  // Canonical Attendance Semantics
  let attendanceStatus = 'Belum Check-in';
  let scannedPax = 0;
  let scannedAt = '';
  let scannerEmail = '-';

  const validAttendance = guest.invitation?.attendances?.find(
    (a) => a.status === 'VALID',
  );
  if (validAttendance) {
    attendanceStatus = 'Sudah Check-in';
    scannedPax = validAttendance.scannedPax;
    scannedAt = formatWibDateTime(new Date(validAttendance.scannedAt));
    scannerEmail = validAttendance.staff?.email || '-';
  }

  return {
    no,
    name,
    category,
    phoneNumber,
    email,
    maxPax,
    invitationStatus,
    rsvpStatus,
    rsvpPax,
    attendanceStatus,
    scannedPax,
    scannedAt,
    scannerEmail,
  };
}

export function calculateAttendanceSummary(
  rows: ReportRow[],
): AttendanceSummaryMetrics {
  let totalGuestUnits = 0;
  let rsvpYesUnits = 0;
  let rsvpNoUnits = 0;
  let pendingRsvpUnits = 0;
  let checkedInUnits = 0;

  let totalMaxPax = 0;
  let plannedRsvpPax = 0;
  let actualScannedPax = 0;

  const categoryMap = new Map<
    string,
    {
      category: string;
      units: number;
      quotaPax: number;
      rsvpYesUnits: number;
      rsvpYesPax: number;
      checkedInUnits: number;
      checkedInPax: number;
    }
  >();

  for (const r of rows) {
    totalGuestUnits++;
    totalMaxPax += r.maxPax;

    if (r.rsvpStatus === 'Hadir') {
      rsvpYesUnits++;
      if (r.rsvpPax !== null) {
        plannedRsvpPax += r.rsvpPax;
      }
    } else if (r.rsvpStatus === 'Tidak Hadir') {
      rsvpNoUnits++;
    } else {
      pendingRsvpUnits++;
    }

    if (r.attendanceStatus === 'Sudah Check-in') {
      checkedInUnits++;
      actualScannedPax += r.scannedPax;
    }

    const cat = r.category || 'REGULAR';
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, {
        category: cat,
        units: 0,
        quotaPax: 0,
        rsvpYesUnits: 0,
        rsvpYesPax: 0,
        checkedInUnits: 0,
        checkedInPax: 0,
      });
    }
    const catItem = categoryMap.get(cat)!;
    catItem.units++;
    catItem.quotaPax += r.maxPax;
    if (r.rsvpStatus === 'Hadir') {
      catItem.rsvpYesUnits++;
      if (r.rsvpPax !== null) {
        catItem.rsvpYesPax += r.rsvpPax;
      }
    }
    if (r.attendanceStatus === 'Sudah Check-in') {
      catItem.checkedInUnits++;
      catItem.checkedInPax += r.scannedPax;
    }
  }

  const notCheckedInUnits = totalGuestUnits - checkedInUnits;
  const differencePax = actualScannedPax - plannedRsvpPax;

  const unitAttendancePct =
    totalGuestUnits === 0 ? 0 : (checkedInUnits / totalGuestUnits) * 100;
  const paxRealizationPct =
    totalMaxPax === 0 ? 0 : (actualScannedPax / totalMaxPax) * 100;

  const categories: CategoryMetric[] = Array.from(categoryMap.values()).map(
    (c) => ({
      category: c.category,
      units: c.units,
      quotaPax: c.quotaPax,
      rsvpYesUnits: c.rsvpYesUnits,
      rsvpYesPax: c.rsvpYesPax,
      checkedInUnits: c.checkedInUnits,
      checkedInPax: c.checkedInPax,
      unitRealizationPct:
        c.units === 0 ? 0 : (c.checkedInUnits / c.units) * 100,
      paxRealizationPct:
        c.quotaPax === 0 ? 0 : (c.checkedInPax / c.quotaPax) * 100,
    }),
  );

  return {
    totalGuestUnits,
    rsvpYesUnits,
    rsvpNoUnits,
    pendingRsvpUnits,
    checkedInUnits,
    notCheckedInUnits,
    unitAttendancePct,
    totalMaxPax,
    plannedRsvpPax,
    actualScannedPax,
    differencePax,
    paxRealizationPct,
    categories,
  };
}
