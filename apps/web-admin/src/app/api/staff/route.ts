import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminOrigin } from '@/utils/origin';
import { getInternalApiBaseUrl } from '@/utils/url';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const forwardParams = new URLSearchParams();

    ["page", "limit", "search", "status", "role"].forEach((key) => {
      const val = searchParams.get(key);
      if (val !== null && val.trim() !== "") {
        forwardParams.set(key, val.trim());
      }
    });

    const queryString = forwardParams.toString()
      ? `?${forwardParams.toString()}`
      : "";
    const internalUrl = getInternalApiBaseUrl();

    const res = await fetch(`${internalUrl}/staff${queryString}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (res.status === 401) {
      const response = NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
      response.cookies.delete("auth_token");
      return response;
    }

    if (res.status === 403) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: data.message || "Error fetching staff list" },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isValidAdminOrigin(request)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { message: "Unsupported Media Type" },
        { status: 415 },
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const internalUrl = getInternalApiBaseUrl();

    const payload: { email: string; password: string; role?: string } = {
      email: body.email,
      password: body.password,
    };
    if (body.role === 'ADMIN') {
      payload.role = 'ADMIN';
    }

    const res = await fetch(`${internalUrl}/staff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      const response = NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
      response.cookies.delete("auth_token");
      return response;
    }

    if (res.status === 403) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: data.message || "Error creating staff" },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
