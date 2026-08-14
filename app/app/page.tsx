"use client";

// Miro panel — opened via miro.board.ui.openPanel({ url: '/app' })
// All miro.* calls are client-only; this component is marked 'use client'.

import * as React from "react";
import type { BoardInfo } from "@mirohq/websdk-types";

// Miro board action: creates a sticky note and zooms to it
async function addSticky() {
  const stickyNote = await miro.board.createStickyNote({
    content: "Hello, World!",
  });
  await miro.board.viewport.zoomTo(stickyNote);
}

export default function MiroPanel() {
  const [checkoutLink, setCheckoutLink] = React.useState<string | null>(null);
  const [canAddSticky, setCanAddSticky] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // Check if the given grantee (Miro team) has an active license.
  // Calls the Next.js API route which attaches the publishable key server-side.
  const checkUserLicense = async (granteeId: string): Promise<boolean> => {
    const response = await fetch(
      `/api/salable/entitlements/check?granteeId=${encodeURIComponent(granteeId)}`,
    );

    if (response.status === 404) {
      // Grantee not yet registered in Salable — treat as no license
      return false;
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

    const entitlementNames = json.data.entitlements.map((e) => e.value);
    setCanAddSticky(entitlementNames.includes("create"));
    return entitlementNames.includes("pro");
  };

  // Fetch a Salable checkout link for the given team.
  // The secret key never leaves the server — it is used inside the API route.
  const fetchCheckoutLink = async (
    boardInfo: BoardInfo,
    granteeId: string,
  ) => {
    if (checkoutLink) return;

    const boardUrl = `https://miro.com/app/board/${boardInfo.id}/`;

    const response = await fetch("/api/salable/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currency: "GBP",
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

  // On mount: resolve the Miro team identity, then check license status.
  React.useEffect(() => {
    async function setup() {
      try {
        const response = await fetch("/api/miro/oauth-token");

        if (!response.ok) {
          throw new Error(`Miro token resolution failed: ${response.status}`);
        }

        const jsonData = (await response.json()) as { team: { id: string } };
        const teamId = jsonData.team.id;

        const boardInfo = await miro.board.getInfo();
        const isProMember = await checkUserLicense(teamId);

        if (!isProMember) {
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
        <p className="p-small">Checking your license&hellip;</p>
      </div>
    );
  }

  return (
    <div>
      {checkoutLink && !canAddSticky ? (
        <>
          <p>In order to use this app, you need an active Pro license.</p>
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

      {canAddSticky ? <p>You are an active Pro license holder.</p> : null}

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
