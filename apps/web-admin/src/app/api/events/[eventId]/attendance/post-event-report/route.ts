import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getInternalApiBaseUrl } from '@/utils/url';

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

    const searchParams = new URL(request.url).searchParams;
    const format = searchParams.get('format') || 'html';

    const internalUrl = getInternalApiBaseUrl();
    const res = await fetch(
      `${internalUrl}/events/${eventId}/attendance/post-event-report?format=${format}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      },
    );

    if (res.status === 401) {
      const response = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      response.cookies.delete('auth_token');
      return response;
    }

    if (res.status === 403) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: data.message || 'Error generating post-event report' },
        { status: res.status },
      );
    }

    if (format === 'json') {
      const data = await res.json();
      return NextResponse.json(data);
    }

    const html = await res.text();
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
