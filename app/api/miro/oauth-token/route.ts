import { NextResponse } from "next/server";

// Server-side proxy for GET https://api.miro.com/v1/oauth-token
// The Miro access token is kept in a server-only env var (no NEXT_PUBLIC_ prefix)
// so it is never embedded in the browser bundle.
export async function GET() {
  const accessToken = process.env.MIRO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      { error: "MIRO_ACCESS_TOKEN is not configured" },
      { status: 500 },
    );
  }

  const upstream = await fetch("https://api.miro.com/v1/oauth-token", {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
  });

  const body = await upstream.text();

  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}
