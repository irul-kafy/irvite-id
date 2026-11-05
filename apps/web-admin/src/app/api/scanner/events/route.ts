import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getInternalApiBaseUrl } from '@/utils/url';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value || cookieStore.get('token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const internalUrl = getInternalApiBaseUrl();
    let res = await fetch(`${internalUrl}/scanner/events`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 404) {
      res = await fetch(`${internalUrl}/api/v1/scanner/events`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    if (res.status === 401) {
      const response = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      response.cookies.delete('auth_token');
      return response;
    }

    if (!res.ok) {
      return NextResponse.json(
        { message: 'Error fetching events' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
