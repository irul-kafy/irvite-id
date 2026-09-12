import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const origin = request.headers.get('origin');
    const expectedOrigin = process.env.WEB_ADMIN_ORIGIN || 'http://localhost:3001';

    if (origin !== expectedOrigin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { eventId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';

    const res = await fetch(`${internalUrl}/events/${eventId}/guests/import/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      const response = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      response.cookies.delete('auth_token');
      return response;
    }

    if (!res.ok) {
      return NextResponse.json({ message: 'Gagal membuat berkas laporan impor.' }, { status: res.status });
    }

    const arrayBuffer = await res.arrayBuffer();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `laporan_import_tamu_${dateStr}.xlsx`;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
