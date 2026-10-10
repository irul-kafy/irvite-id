import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const MAX_REQUEST_BYTES = 32 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const expectedOrigin = process.env.WEB_ADMIN_ORIGIN || 'http://localhost:3001';
    if (request.headers.get('origin') !== expectedOrigin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const contentLength = Number(request.headers.get('content-length') || '0');
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ message: 'Package exceeds the 32MB request limit' }, { status: 413 });
    }
    if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
      return NextResponse.json({ message: 'Unsupported Media Type' }, { status: 415 });
    }
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ message: 'Package body is required' }, { status: 400 });
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let receivedBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return NextResponse.json({ message: 'Package exceeds the 32MB request limit' }, { status: 413 });
      }
      chunks.push(new Uint8Array(value));
    }
    let formData: FormData;
    try {
      formData = await new Response(new Blob(chunks), { headers: { 'content-type': request.headers.get('content-type')! } }).formData();
    } catch {
      return NextResponse.json({ message: 'Invalid multipart package' }, { status: 400 });
    }
    const manifest = formData.get('manifest');
    const assets = formData.get('assets');
    if (typeof manifest !== 'string' || typeof assets !== 'string') {
      return NextResponse.json({ message: 'Manifest and asset metadata are required' }, { status: 400 });
    }
    if (new TextEncoder().encode(manifest).byteLength > 64 * 1024 || assets.length > 8 * 1024) {
      return NextResponse.json({ message: 'Package metadata exceeds its size limit' }, { status: 413 });
    }

    const upstream = new FormData();
    upstream.append('manifest', manifest);
    upstream.append('assets', assets);
    let fileCount = 0;
    let totalBytes = 0;
    for (const [name, value] of formData.entries()) {
      if (value instanceof File) {
        fileCount += 1;
        totalBytes += value.size;
        if (fileCount > 12 || totalBytes > 30 * 1024 * 1024) {
          return NextResponse.json({ message: 'Package asset limits exceeded' }, { status: 413 });
        }
        upstream.append(name, value, value.name);
      }
    }

    const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';
    const response = await fetch(`${internalUrl}/templates/package`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: upstream,
      signal: AbortSignal.timeout(60000),
    });
    const data = await response.json().catch(() => ({ message: 'Invalid API response' }));
    if (response.status === 401) {
      const unauthorized = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      unauthorized.cookies.delete('auth_token');
      return unauthorized;
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    return NextResponse.json(
      { message: timedOut ? 'Package upload timed out' : 'Template package could not be imported' },
      { status: timedOut ? 504 : 500 },
    );
  }
}
