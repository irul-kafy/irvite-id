import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type Context = { params: Promise<{ eventId: string }> };
async function proxy(request: Request, context: Context, upload: boolean) {
  if (upload && request.headers.get('origin') !== (process.env.WEB_ADMIN_ORIGIN || 'http://localhost:3001')) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { eventId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return NextResponse.json({ message: 'Invalid event' }, { status: 400 });
  try {
    const query = new URL(request.url).search;
    const body = upload ? await request.formData() : undefined;
    if (body) {
      const file = body.get('file');
      if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return NextResponse.json({ message: 'Gunakan PNG, JPEG, atau WebP maksimal 5 MB.' }, { status: 400 });
      body.set('type', 'PHOTO');
    }
    const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://localhost:3000'}/events/${eventId}/media${upload ? '' : query}`, { method: upload ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}` }, body, cache: 'no-store' });
    const result = NextResponse.json(await response.json(), { status: response.status, headers: { 'Cache-Control': 'no-store' } });
    if (response.status === 401) result.cookies.delete('auth_token');
    return result;
  } catch { return NextResponse.json({ message: 'Gagal mengakses media acara.' }, { status: 502 }); }
}
export function GET(request: Request, context: Context) { return proxy(request, context, false); }
export function POST(request: Request, context: Context) { return proxy(request, context, true); }
