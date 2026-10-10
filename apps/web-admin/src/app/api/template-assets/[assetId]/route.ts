import { cookies } from 'next/headers';

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) return Response.json({ message: 'Unauthorized' }, { status: 401 });
  const { assetId } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId)) {
    return Response.json({ message: 'Invalid asset' }, { status: 400 });
  }
  const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';
  const upstream = await fetch(`${internalUrl}/templates/assets/${assetId}/file`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!upstream.ok || !upstream.body) {
    return Response.json({ message: 'Asset not found' }, { status: upstream.status });
  }
  const headers = new Headers({
    'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  });
  const contentLength = upstream.headers.get('content-length');
  if (contentLength) headers.set('Content-Length', contentLength);
  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
