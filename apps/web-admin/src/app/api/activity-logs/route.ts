import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request?: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';
    const query = new URLSearchParams();
    if (request) {
      const params = new URL(request.url).searchParams;
      for (const key of ['page', 'limit', 'action', 'eventId', 'search']) {
        const value = params.get(key);
        if (value !== null && value.trim() !== '') query.set(key, value.trim());
      }
    }

    const res = await fetch(`${internalUrl}/activity-logs${query.size ? `?${query}` : ''}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
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
      return NextResponse.json({ message: data.message || 'Error fetching activity logs' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

