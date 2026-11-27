import { NextResponse } from 'next/server';
import { PREVIEW_API_UNCONFIGURED_MESSAGE } from '@/utils/url';

const PREVIEW_API_UNCONFIGURED_BODY = {
  message: PREVIEW_API_UNCONFIGURED_MESSAGE,
  error: PREVIEW_API_UNCONFIGURED_MESSAGE,
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
