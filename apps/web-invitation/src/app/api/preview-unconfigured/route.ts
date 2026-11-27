import { NextResponse } from 'next/server';

const PREVIEW_API_UNCONFIGURED_BODY = {
  message: 'API preview tidak dikonfigurasi',
  error: 'API preview tidak dikonfigurasi',
};

function respondPreviewApiUnconfigured() {
  return NextResponse.json(PREVIEW_API_UNCONFIGURED_BODY, { status: 503 });
}

export async function GET() {
  return respondPreviewApiUnconfigured();
}

export async function POST() {
  return respondPreviewApiUnconfigured();
}

export async function PUT() {
  return respondPreviewApiUnconfigured();
}

export async function PATCH() {
  return respondPreviewApiUnconfigured();
}

export async function DELETE() {
  return respondPreviewApiUnconfigured();
}

export async function OPTIONS() {
  return respondPreviewApiUnconfigured();
}
