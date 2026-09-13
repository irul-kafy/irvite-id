export interface ExportFilterOptions {
  format?: 'xlsx' | 'csv';
  rsvp?: 'all' | 'yes' | 'no' | 'pending';
  attendance?: 'all' | 'checked-in' | 'not-checked-in';
  category?: string;
}

export function buildExportUrl(
  eventId: string,
  target: 'guests' | 'attendance',
  filters: ExportFilterOptions,
): string {
  const baseUrl =
    target === 'guests'
      ? `/api/events/${eventId}/guests/export`
      : `/api/events/${eventId}/attendance/report`;

  const searchParams = new URLSearchParams();
  searchParams.set('format', filters.format || 'xlsx');

  if (filters.rsvp) {
    searchParams.set('rsvp', filters.rsvp);
  }

  if (filters.attendance) {
    searchParams.set('attendance', filters.attendance);
  }

  if (filters.category) {
    const trimmed = filters.category.trim();
    if (trimmed.length > 50) {
      throw new Error('Kategori maksimal 50 karakter.');
    }
    if (trimmed.length > 0) {
      searchParams.set('category', trimmed);
    }
  }

  return `${baseUrl}?${searchParams.toString()}`;
}
