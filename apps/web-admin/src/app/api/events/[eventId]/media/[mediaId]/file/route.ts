import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type Context = { params: Promise<{ eventId: string; mediaId: string }> };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: Context) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { eventId, mediaId } = await context.params;
  if (!UUID_REGEX.test(eventId) || !UUID_REGEX.test(mediaId)) {
    return NextResponse.json({ message: 'Invalid media' }, { status: 400 });
  }

  try {
    const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';
    const response = await fetch(internalUrl + '/events/' + eventId + '/media/' + mediaId + '/file', {
      headers: {
        Authorization: 'Bearer ' + token,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const result = NextResponse.json(
        { message: 'Media unavailable' },
        { status: response.status },
      );
      if (response.status === 401) {
        result.cookies.delete('auth_token');
      }
      return result;
    }

    const type = response.headers.get('content-type')?.split(';')[0] || '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(type)) {
      return NextResponse.json({ message: 'Unsupported media' }, { status: 415 });
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': type,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ message: 'Media unavailable' }, { status: 502 });
  }
}