import { cookies } from 'next/headers';

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const failure = (message: string, status: number) => Response.json(
    { message }, { status, headers: { 'Cache-Control': 'no-store' } },
  );
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) return failure('Unauthorized', 401);
  const { assetId } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId)) {
    return failure('Invalid asset', 400);
  }
  const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';
  try {
    const upstream = await fetch(`${internalUrl}/templates/assets/${assetId}/file`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) {
      await upstream.body?.cancel();
      return failure(upstream.status === 404 ? 'Asset not found' : 'Asset service unavailable', upstream.status);
    }
    if (!upstream.body) return failure('Invalid asset response', 502);
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
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    return failure(timedOut ? 'Asset request timed out' : 'Asset service unavailable', timedOut ? 504 : 503);
  }
}
