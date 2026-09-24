import { NextRequest, NextResponse } from "next/server";

// Server-side proxy for GET https://salable.app/api/entitlements/check
// The publishable key is kept in a server-only env var (no NEXT_PUBLIC_ prefix)
// so it is never embedded in the browser bundle.
export async function GET(request: NextRequest) {
  const granteeId = request.nextUrl.searchParams.get("granteeId");

  if (!granteeId) {
    return NextResponse.json(
      { error: "granteeId query parameter is required" },
      { status: 400 },
    );
  }

  const publishableKey = process.env.SALABLE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return NextResponse.json(
      { error: "SALABLE_PUBLISHABLE_KEY is not configured" },
      { status: 500 },
    );
  }

  const upstream = await fetch(
    `https://salable.app/api/entitlements/check?granteeId=${encodeURIComponent(granteeId)}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${publishableKey}`,
      },
    },
  );

  const body = await upstream.text();

  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}
