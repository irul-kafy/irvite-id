import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getInternalApiBaseUrl } from '@/utils/url';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401, headers });
    const base = getInternalApiBaseUrl();
    const response = await fetch(`${base}/api/v1/events/summary`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) {
      const result = NextResponse.json({ message: 'Ringkasan belum dapat dimuat.' }, { status: response.status, headers });
      if (response.status === 401) result.cookies.delete('auth_token');
      return result;
    }
    return NextResponse.json(await response.json(), { headers });
  } catch {
    return NextResponse.json({ message: 'Layanan ringkasan tidak tersedia.' }, { status: 502, headers });
  }
}
