import { NextRequest, NextResponse } from "next/server";
import { Salable } from "@salable/sdk";

type CheckoutBody = Parameters<Salable["api"]["checkout"]["post"]>[0];

// Generates a Quick Checkout link, via the Salable Node SDK. The secret key
// (SALABLE_SECRET_KEY) is a server-only env var, it is never embedded in the
// browser bundle.
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

  const body = (await request.json()) as Omit<CheckoutBody, "planId">;

  const salable = new Salable(secretKey);

  try {
    const checkout = await salable.api.checkout.post({ ...body, planId });

    const url = checkout?.data?.url;
    if (!url) {
      return NextResponse.json(
        { error: "Salable did not return a checkout URL" },
        { status: 502 },
      );
    }

    return NextResponse.json({ data: { url } });
  } catch (error) {
    const status =
      (error as { responseStatusCode?: number }).responseStatusCode ?? 500;

    return NextResponse.json(
      { error: "Checkout link generation failed" },
      { status },
    );
  }
}
