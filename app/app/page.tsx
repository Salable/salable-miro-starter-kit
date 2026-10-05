"use client";

// Miro panel — opened via miro.board.ui.openPanel({ url: '/app' })
// All miro.* calls are client-only; this component is marked 'use client'.

import * as React from "react";
import type { BoardInfo } from "@mirohq/websdk-types";

// Salable revokes Entitlements a moment after a cancellation is accepted, so
// the panel re-checks on a short backoff instead of once. Roughly 10s total.
const ENTITLEMENT_POLL_DELAYS_MS = [500, 1000, 2000, 3000, 4000];

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

async function addSticky() {
  const stickyNote = await miro.board.createStickyNote({
    content: "Hello, World!",
  });
  await miro.board.viewport.zoomTo(stickyNote);
}

// Fetch the Entitlement names held by the given grantee (Miro team).
// Calls the Next.js API route which attaches the publishable key server-side.
// `no-store` keeps the browser from replaying a stale check after a
// cancellation.
async function fetchEntitlementNames(granteeId: string): Promise<string[]> {
  const response = await fetch(
    `/api/salable/entitlements/check?granteeId=${encodeURIComponent(granteeId)}`,
    { cache: "no-store" },
  );

  if (response.status === 404) {
    // Grantee not yet registered in Salable — treat as no subscription
    return [];
  }

  if (!response.ok) {
    throw new Error(`Entitlement check failed: ${response.status}`);
  }

  const json = (await response.json()) as {
    data: {
      entitlements: Array<{
        type: string;
        value: string;
        expiryDate: string | null;
      }>;
    };
  };

  return json.data.entitlements.map((e) => e.value);
}

export default function MiroPanel() {
  const [checkoutLink, setCheckoutLink] = React.useState<string | null>(null);
  const [isProMember, setIsProMember] = React.useState(false);
  const [canAddSticky, setCanAddSticky] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [teamId, setTeamId] = React.useState<string | null>(null);
  const [boardInfo, setBoardInfo] = React.useState<BoardInfo | null>(null);

  // `create` enables the board action; `pro` marks an active Pro subscription.
  const applyEntitlements = (entitlementNames: string[]) => {
    setCanAddSticky(entitlementNames.includes("create"));
    setIsProMember(entitlementNames.includes("pro"));
  };

  // Fetch a Salable checkout link for the given team.
  const fetchCheckoutLink = async (boardInfo: BoardInfo, granteeId: string) => {
    const boardUrl = `https://miro.com/app/board/${boardInfo.id}/`;

    const response = await fetch("/api/salable/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currency: "USD",
        owner: granteeId,
        grantee: granteeId,
        interval: "month",
        intervalCount: 1,
        successUrl: boardUrl,
        cancelUrl: boardUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`Checkout link generation failed: ${response.status}`);
    }

    const json = (await response.json()) as { data: { url: string } };
    setCheckoutLink(json.data.url);
  };

  // Poll until Salable reports the Entitlements revoked. Only a cleared result
  // is applied — a `pro` that is still propagating must not flip the panel
  // back to the subscribed view.
  const confirmEntitlementsRevoked = async (granteeId: string) => {
    for (const delay of ENTITLEMENT_POLL_DELAYS_MS) {
      await wait(delay);

      const entitlementNames = await fetchEntitlementNames(granteeId);
      if (!entitlementNames.includes("pro")) {
        applyEntitlements(entitlementNames);
        return true;
      }
    }

    return false;
  };

  // Cancel the team's active subscription, then refresh the panel so the
  // purchase flow can be run again. Included so the demo covers the full
  // lifecycle; a production app would gate this behind its own confirmation.
  const cancelSubscription = async () => {
    if (!teamId || !boardInfo) return;

    setIsCancelling(true);
    setMessage(null);
    try {
      const response = await fetch("/api/salable/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner: teamId }),
      });

      if (!response.ok) {
        throw new Error(`Cancellation failed: ${response.status}`);
      }

      // Salable returns 204 as soon as Stripe accepts the cancellation; the
      // Entitlements are revoked a moment later. That 204 is the strongest
      // signal available right now, so switch to the unsubscribed view
      // immediately rather than waiting on a check that is racing propagation.
      applyEntitlements([]);
      await fetchCheckoutLink(boardInfo, teamId);

      // Then reconcile with Salable in the background.
      const revoked = await confirmEntitlementsRevoked(teamId);
      if (!revoked) {
        setMessage(
          "Cancellation was accepted, but Salable still reports an active Pro subscription. Reopen the panel in a moment to re-check.",
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Cancellation failed",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  // On mount: resolve the Miro team identity, then check subscription status.
  React.useEffect(() => {
    async function setup() {
      try {
        const response = await fetch("/api/miro/oauth-token");

        if (!response.ok) {
          throw new Error(`Miro token resolution failed: ${response.status}`);
        }

        const jsonData = (await response.json()) as { team: { id: string } };
        const teamId = jsonData.team.id;
        setTeamId(teamId);

        const boardInfo = await miro.board.getInfo();
        setBoardInfo(boardInfo);

        const entitlementNames = await fetchEntitlementNames(teamId);
        applyEntitlements(entitlementNames);

        if (!entitlementNames.includes("pro")) {
          await fetchCheckoutLink(boardInfo, teamId);
        }
      } finally {
        setIsLoading(false);
      }
    }

    void setup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="loading-container">
        <p className="p-small">Checking your subscriptions&hellip;</p>
      </div>
    );
  }

  return (
    <div>
      {message ? (
        <p className="p-small" role="alert">
          {message}
        </p>
      ) : null}

      {checkoutLink && !isProMember ? (
        <>
          <p>
            In order to use this app, you need an active Pro plan subscription.
          </p>
          <a
            href={checkoutLink}
            target="_blank"
            rel="noreferrer"
            className="button button-primary"
          >
            Purchase
          </a>
          <hr />
        </>
      ) : null}

      {isProMember ? (
        <>
          <p>You are an active Pro plan subscription holder.</p>
          <button
            onClick={() => void cancelSubscription()}
            className="button button-secondary"
            disabled={isCancelling}
          >
            {isCancelling ? "Cancelling…" : "Cancel subscription"}
          </button>
          <hr />
        </>
      ) : null}

      <div>
        <button
          onClick={() => void addSticky()}
          className="button button-primary"
          disabled={!canAddSticky}
        >
          {!canAddSticky ? <span className="icon icon-deactivated" /> : null}
          Add sticky!
        </button>
      </div>
    </div>
  );
}
