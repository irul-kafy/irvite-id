import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const origin = request.headers.get('origin');
    const expectedOrigin = process.env.WEB_ADMIN_ORIGIN || 'http://localhost:3001';

    if (origin !== expectedOrigin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { templateId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';

    const res = await fetch(`${internalUrl}/templates/${templateId}/permanent`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      const response = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      response.cookies.delete('auth_token');
      return response;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const fallback =
        res.status === 403
          ? 'Forbidden'
          : res.status === 404
            ? 'Not Found'
            : 'Error permanently deleting template';
      return NextResponse.json(
        { message: data.message || fallback },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
