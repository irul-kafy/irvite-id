import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(_request: Request, context: { params: Promise<{ eventId: string; mediaId: string }> }) {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { eventId, mediaId } = await context.params;
  if (![eventId, mediaId].every((id) => /^[0-9a-f-]{36}$/i.test(id))) return NextResponse.json({ message: 'Invalid media' }, { status: 400 });
  try {
    const response = await fetch(`${process.env.INTERNAL_API_URL || 'http://localhost:3000'}/events/${eventId}/media/${mediaId}/file`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!response.ok) return NextResponse.json({ message: 'Media unavailable' }, { status: response.status });
    const type = response.headers.get('content-type')?.split(';')[0] || '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(type)) return NextResponse.json({ message: 'Unsupported media' }, { status: 415 });
    return new Response(response.body, { headers: { 'Content-Type': type, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return NextResponse.json({ message: 'Media unavailable' }, { status: 502 }); }
}
