import * as React from "react";
import { createRoot } from "react-dom/client";

import "./assets/style.css";
import { BoardInfo } from "@mirohq/websdk-types";

// In development, requests are proxied through Vite (/salable-api → https://salable.app/api)
// to avoid CORS issues. In production, point this at your own backend proxy.
const SALABLE_API_BASE = import.meta.env.DEV ? "" : "https://salable.app";

const salableApiPath = (path: string) =>
  import.meta.env.DEV
    ? `/salable-api${path}`
    : `${SALABLE_API_BASE}/api${path}`;

// Miro board action: creates a sticky note and zooms to it
async function addSticky() {
  const stickyNote = await miro.board.createStickyNote({
    content: "Hello, World!",
  });
  await miro.board.viewport.zoomTo(stickyNote);
}

const App: React.FC = () => {
  const [checkoutLink, setCheckoutLink] = React.useState<string | null>(null);
  const [canAddSticky, setCanAddSticky] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const publishableKey = import.meta.env.VITE_SALABLE_API_KEY as string;
  const secretKey = import.meta.env.VITE_SALABLE_SECRET_KEY as string;
  const planUuid = import.meta.env.VITE_SALABLE_PLAN_UUID as string;

  // Check if the given grantee (Miro team) has an active license.
  // Returns false (unlicensed) if the grantee doesn't exist yet in Salable (404).
  const checkUserLicense = async (granteeId: string): Promise<boolean> => {
    const response = await fetch(
      `${salableApiPath("/entitlements/check")}?granteeId=${encodeURIComponent(granteeId)}`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${publishableKey}`,
        },
      },
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

  // Fetch a Salable checkout link for the given team
  // NOTE: POST /api/checkout requires the secret key. Because this is a client-side-only
  // app the secret key is exposed in the browser bundle. Move this call to a backend
  // proxy (e.g. a serverless function) before shipping to production.
  const fetchCheckoutLink = async (boardInfo: BoardInfo, granteeId: string) => {
    if (checkoutLink) return;

    const boardUrl = `https://miro.com/app/board/${boardInfo.id}/`;

    const response = await fetch(salableApiPath("/checkout"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        currency: "GBP",
        planId: planUuid,
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

  // On mount: resolve the Miro team identity, then check license status
  async function setup() {
    try {
      const response = await fetch("https://api.miro.com/v1/oauth-token", {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${import.meta.env.VITE_MIRO_ACCESS_TOKEN as string}`,
        },
      });

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

  React.useEffect(() => {
    void setup();
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
};

const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(<App />);
