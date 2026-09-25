import { NextRequest, NextResponse } from "next/server";

// Server-side proxy for POST https://salable.app/api/checkout
// The secret key (SALABLE_SECRET_KEY) is a server-only env var — it has no
// NEXT_PUBLIC_ prefix so it is never embedded in the browser bundle.
export async function POST(request: NextRequest) {
  const secretKey = process.env.SALABLE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "SALABLE_SECRET_KEY is not configured" },
      { status: 500 },
    );
  }

  const planId = process.env.SALABLE_PLAN_ID;
  if (!planId) {
    return NextResponse.json(
      { error: "SALABLE_PLAN_ID is not configured" },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    currency: string;
    owner: string;
    grantee: string;
    interval: string;
    intervalCount: number;
    successUrl: string;
    cancelUrl: string;
  };

  const upstream = await fetch("https://salable.app/api/checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify({ ...body, planId }),
  });

  const responseBody = await upstream.text();

  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}
