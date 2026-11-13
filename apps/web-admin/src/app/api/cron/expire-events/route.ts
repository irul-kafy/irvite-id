import { NextResponse } from 'next/server';

async function handleExpireCron(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const cronSecretHeader = request.headers.get('x-cron-secret') || '';
    const configuredSecret = process.env.CRON_SECRET || 'irvite-cron-default-secret';

    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
    const providedSecret = cronSecretHeader.trim() || bearer;

    if (!providedSecret || providedSecret !== configuredSecret) {
      return NextResponse.json({ message: 'Unauthorized: Invalid cron secret' }, { status: 401 });
    }

    const internalUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';
    const res = await fetch(`${internalUrl}/orders/cron/expire-events`, {
      method: 'POST',
      headers: {
        'x-cron-secret': configuredSecret,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: data.message || 'Error executing expire-events cron' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal Server Error', error: String(error) },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleExpireCron(request);
}

export async function POST(request: Request) {
  return handleExpireCron(request);
}

