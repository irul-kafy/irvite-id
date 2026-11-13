import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidAdminOrigin } from '@/utils/origin';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isValidAdminOrigin(request)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';

    const res = await fetch(`${internalUrl}/orders/${id}/status`, {
      method: 'PATCH',
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

    if (res.status === 403) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ message: data.message || 'Error updating order status' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

