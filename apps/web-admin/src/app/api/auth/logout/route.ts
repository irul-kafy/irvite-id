import { NextResponse } from 'next/server';
import { isValidAdminOrigin } from '@/utils/origin';

export async function POST(request: Request) {
  try {
    if (!isValidAdminOrigin(request)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('auth_token');
    return response;
  } catch {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
