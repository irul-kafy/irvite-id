import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const token = (await cookies()).get('auth_token')?.value;
  const json = (body: unknown, status = 200) => NextResponse.json(body, {
    status, headers: { 'Cache-Control': 'no-store' },
  });
  if (!token) return json({ message: 'Unauthorized' }, 401);
  const base = process.env.INTERNAL_API_URL || 'http://localhost:3000';
  try {
    const me = await fetch(base + '/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store', signal: AbortSignal.timeout(5000),
    });
    if (me.status === 401) {
      const response = json({ message: 'Unauthorized' }, 401);
      response.cookies.delete('auth_token');
      return response;
    }
    if (!me.ok) return json({ message: 'Authentication service unavailable' }, 503);
    const user = await me.json();
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return json({ message: 'Forbidden' }, 403);

    const [health, database] = await Promise.allSettled([
      fetch(base + '/health', { cache: 'no-store', signal: AbortSignal.timeout(5000) }),
      fetch(base + '/health/db', { cache: 'no-store', signal: AbortSignal.timeout(5000) })
        .then(async (response) => response.ok && (await response.json()).status === 'ok'),
    ]);
    const apiOk = health.status === 'fulfilled' && health.value.ok;
    const dbOk = database.status === 'fulfilled' && database.value === true;
    return json({ checks: [
      { label: 'Sesi admin', ok: true, detail: 'Token dan role diverifikasi oleh API IRVITE.' },
      { label: 'API', ok: apiOk, detail: apiOk ? 'Backend merespons pemeriksaan kesehatan.' : 'Backend belum merespons pemeriksaan kesehatan.' },
      { label: 'Database', ok: dbOk, detail: dbOk ? 'Koneksi database berhasil.' : 'Koneksi database belum berhasil. Periksa layanan dan konfigurasi database.' },
    ] });
  } catch {
    return json({ message: 'Service unavailable' }, 503);
  }
}
