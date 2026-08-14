"use client";

// Landing page — served at the root URL.
// When loaded inside Miro (as the app's iframe entry point), it registers the
// icon:click listener that opens the panel. When opened in a plain browser it
// just shows the dev-setup instructions, same as the original index.html.

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    // miro is a global injected by the SDK script in layout.tsx.
    // It is only present when the page is running inside a Miro iframe.
    if (typeof miro === "undefined") return;

    miro.board.ui.on("icon:click", async () => {
      await miro.board.ui.openPanel({ url: "/app" });
    });
  }, []);

  return (
    <div className="grid container">
      <div className="cs1 ce12">
        <h1>Your app is running locally</h1>
        <p>Create a Developer team to get your app running in Miro.</p>
      </div>
      <div className="cs1 ce12">
        <a
          className="button button-primary"
          href="https://developers.miro.com/docs/create-a-developer-team"
          target="_blank"
          rel="noreferrer"
        >
          Create a Developer team
        </a>
      </div>
      <div className="cs1 ce12">
        <p>
          To see your app, open it in an app panel on Miro.com, or preview it
          at <a href="/app" className="link link-primary">this URL</a>.
        </p>
      </div>
    </div>
  );
}
