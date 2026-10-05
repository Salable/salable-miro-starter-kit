import { NextRequest, NextResponse } from "next/server";

// Cancels the active Salable subscription for a team, so the purchase flow can
// be run again while developing.
//
// The panel only knows the team (owner) ID, not the subscription ID, so this
// takes two upstream calls: look up the owner's active subscription, then
// cancel it. Both use the secret key (SALABLE_SECRET_KEY), a server-only env
// var that is never embedded in the browser bundle.
export async function POST(request: NextRequest) {
  const secretKey = process.env.SALABLE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "SALABLE_SECRET_KEY is not configured" },
      { status: 500 },
    );
  }

  const { owner } = (await request.json()) as { owner: string };
  if (!owner) {
    return NextResponse.json(
      { error: "owner is required" },
      { status: 400 },
    );
  }

  const authorization = `Bearer ${secretKey}`;

  const listResponse = await fetch(
    `https://salable.app/api/subscriptions?owner=${encodeURIComponent(owner)}&status=active`,
    { method: "GET", headers: { accept: "application/json", authorization } },
  );

  if (!listResponse.ok) {
    return new NextResponse(await listResponse.text(), {
      status: listResponse.status,
      headers: { "content-type": "application/json" },
    });
  }

  const { data } = (await listResponse.json()) as {
    data: Array<{ id: string }>;
  };

  const subscription = data.at(0);
  if (!subscription) {
    return NextResponse.json(
      { error: "No active subscription found for this team" },
      { status: 404 },
    );
  }

  const cancelResponse = await fetch(
    `https://salable.app/api/subscriptions/${subscription.id}/cancel`,
    { method: "POST", headers: { authorization } },
  );

  if (!cancelResponse.ok) {
    return new NextResponse(await cancelResponse.text(), {
      status: cancelResponse.status,
      headers: { "content-type": "application/json" },
    });
  }

  // Salable returns 204 No Content on success.
  return new NextResponse(null, { status: 204 });
}
