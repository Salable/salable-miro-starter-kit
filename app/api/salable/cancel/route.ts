import { NextRequest, NextResponse } from "next/server";
import { Salable } from "@salable/sdk";

// Cancels the active Salable subscription for a team, so the purchase flow can
// be run again while developing.
//
// The panel only knows the team (owner) ID, not the subscription ID, so this
// takes two SDK calls: look up the owner's active subscription, then cancel it.
// Both use the secret key (SALABLE_SECRET_KEY), a server-only env var that is
// never embedded in the browser bundle.
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
    return NextResponse.json({ error: "owner is required" }, { status: 400 });
  }

  const salable = new Salable(secretKey);

  try {
    const subscriptions = await salable.api.subscriptions.get({
      queryParameters: { owner, status: "active" },
    });

    const subscriptionId = subscriptions?.data?.at(0)?.id;
    if (!subscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found for this team" },
        { status: 404 },
      );
    }

    await salable.api.subscriptions.byId(subscriptionId).cancel.post();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const status =
      (error as { responseStatusCode?: number }).responseStatusCode ?? 500;

    return NextResponse.json({ error: "Cancellation failed" }, { status });
  }
}
