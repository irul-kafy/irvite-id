import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidAdminOrigin } from '../../../../../../utils/origin';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  try {
    if (!isValidAdminOrigin(request)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ message: 'Unsupported Media Type' }, { status: 415 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';

    const res = await fetch(`${internalUrl}/events/${eventId}/attendance/undo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: body.code,
        invitationId: body.invitationId,
        guestId: body.guestId,
      }),
    });

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
        { message: data.message || 'Gagal mengurungkan check-in' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

