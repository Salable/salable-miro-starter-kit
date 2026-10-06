import { NextRequest, NextResponse } from "next/server";
import { Salable } from "@salable/sdk";

// Server-side entitlement check, via the Salable Node SDK.
export async function GET(request: NextRequest) {
  const granteeId = request.nextUrl.searchParams.get("granteeId");

  if (!granteeId) {
    return NextResponse.json(
      { error: "granteeId query parameter is required" },
      { status: 400 },
    );
  }

  const secretKey = process.env.SALABLE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "SALABLE_SECRET_KEY is not configured" },
      { status: 500 },
    );
  }

  const salable = new Salable(secretKey);

  // Entitlements change the moment a Subscription is purchased or cancelled,
  // so this response must never be replayed from a cache.
  const headers = { "cache-control": "no-store" };

  try {
    const result = await salable.api.entitlements.check.get({
      queryParameters: { granteeId },
    });

    return NextResponse.json(
      { data: { entitlements: result?.data?.entitlements ?? [] } },
      { headers },
    );
  } catch (error) {
    const status = (error as { responseStatusCode?: number })
      .responseStatusCode;

    // A 404 means the grantee isn't registered in Salable yet, which is just
    // another way of saying they hold no Entitlements.
    if (status === 404) {
      return NextResponse.json({ data: { entitlements: [] } }, { headers });
    }

    return NextResponse.json(
      { error: "Entitlement check failed" },
      { status: status ?? 500 },
    );
  }
}
