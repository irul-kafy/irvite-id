import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const rawFormat = url.searchParams.get('format');
    const rawRsvp = url.searchParams.get('rsvp');
    const rawAttendance = url.searchParams.get('attendance');
    const rawCategory = url.searchParams.get('category');

    let format = 'xlsx';
    if (rawFormat !== null) {
      if (rawFormat !== 'xlsx' && rawFormat !== 'csv') {
        return NextResponse.json(
          { message: 'Format tidak valid. Pilihan yang diperbolehkan: xlsx, csv.' },
          { status: 400 },
        );
      }
      format = rawFormat;
    }

    let rsvp: string | undefined;
    if (rawRsvp !== null) {
      if (!['all', 'yes', 'no', 'pending'].includes(rawRsvp)) {
        return NextResponse.json(
          { message: 'Filter RSVP tidak valid. Pilihan yang diperbolehkan: all, yes, no, pending.' },
          { status: 400 },
        );
      }
      rsvp = rawRsvp;
    }

    let attendance: string | undefined;
    if (rawAttendance !== null) {
      if (!['all', 'checked-in', 'not-checked-in'].includes(rawAttendance)) {
        return NextResponse.json(
          { message: 'Filter kehadiran tidak valid. Pilihan yang diperbolehkan: all, checked-in, not-checked-in.' },
          { status: 400 },
        );
      }
      attendance = rawAttendance;
    }

    let category: string | undefined;
    if (rawCategory !== null) {
      const trimmed = rawCategory.trim();
      if (trimmed.length > 50) {
        return NextResponse.json(
          { message: 'Filter kategori maksimal 50 karakter.' },
          { status: 400 },
        );
      }
      if (trimmed.length > 0) {
        category = trimmed;
      }
    }

    const queryParams = new URLSearchParams();
    queryParams.set('format', format);
    if (rsvp) queryParams.set('rsvp', rsvp);
    if (attendance) queryParams.set('attendance', attendance);
    if (category) queryParams.set('category', category);

    const internalUrl =
      process.env.INTERNAL_API_URL || 'http://localhost:3000';
    const targetUrl = `${internalUrl}/events/${eventId}/attendance/report?${queryParams.toString()}`;

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (res.status === 401) {
      const response = NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 },
      );
      response.cookies.delete('auth_token');
      return response;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: data.message || 'Gagal mengekspor laporan kehadiran.' },
        { status: res.status },
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const contentType =
      res.headers.get('content-type') ||
      (queryParams.get('format') === 'csv'
        ? 'text/csv; charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const contentDisposition =
      res.headers.get('content-disposition') ||
      `attachment; filename="laporan-kehadiran.${queryParams.get('format')}"`;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
