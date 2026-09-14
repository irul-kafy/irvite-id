import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type Context = { params: Promise<{ templateId: string }> };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: Context) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { templateId } = await context.params;
  if (!UUID_REGEX.test(templateId)) {
    return NextResponse.json({ message: 'Invalid template' }, { status: 400 });
  }

  try {
    const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';
    const response = await fetch(internalUrl + '/templates/' + templateId + '/definition', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
      },
      cache: 'no-store',
    });

    if (response.status === 401) {
      const res = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      res.cookies.delete('auth_token');
      return res;
    }

    if (response.status === 403 || response.status === 404) {
      const errData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: errData.message || (response.status === 403 ? 'Forbidden' : 'Not Found') },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => ({}));
    const result = NextResponse.json(data, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    });

    return result;
  } catch {
    return NextResponse.json({ message: 'Gagal mengakses definisi template.' }, { status: 502 });
  }
}
