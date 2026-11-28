import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidAdminOrigin } from '@/utils/origin';
import {
  getInternalApiBaseUrl,
  isPreviewApiUnconfiguredError,
  PREVIEW_API_UNCONFIGURED_MESSAGE,
} from '@/utils/url';
import { createDefaultMasterPricingConfig } from 'pricing';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const internalUrl = getInternalApiBaseUrl();
    const res = await fetch(`${internalUrl}/orders/pricing-config`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (res.status === 401) {
      const response = NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 },
      );
      response.cookies.delete('auth_token');
      return response;
    }

    if (res.status === 403) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (!res.ok) {
      return NextResponse.json(createDefaultMasterPricingConfig());
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (isPreviewApiUnconfiguredError(error)) {
      return NextResponse.json(
        {
          message: PREVIEW_API_UNCONFIGURED_MESSAGE,
          error: PREVIEW_API_UNCONFIGURED_MESSAGE,
        },
        { status: 503 },
      );
    }
    return NextResponse.json(createDefaultMasterPricingConfig());
  }
}

export async function PUT(request: Request) {
  try {
    if (!isValidAdminOrigin(request)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { message: 'Unsupported Media Type' },
        { status: 415 },
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const internalUrl = getInternalApiBaseUrl();

    const res = await fetch(`${internalUrl}/orders/pricing-config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      const response = NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 },
      );
      response.cookies.delete('auth_token');
      return response;
    }

    if (res.status === 403) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: data.message || 'Gagal menyimpan pengaturan paket & harga' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (isPreviewApiUnconfiguredError(error)) {
      return NextResponse.json(
        {
          message: PREVIEW_API_UNCONFIGURED_MESSAGE,
          error: PREVIEW_API_UNCONFIGURED_MESSAGE,
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
