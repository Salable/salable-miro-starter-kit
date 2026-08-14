import type { Metadata } from "next";
import Script from "next/script";
import "../src/assets/style.css";

export const metadata: Metadata = {
  title: "Salable Miro Starter",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/*
          The Miro Web SDK must be loaded before any miro.* calls are made.
          strategy="beforeInteractive" ensures it is available as soon as the
          page hydrates on the client.
        */}
        <Script
          src="https://miro.com/app/static/sdk/v2/miro.js"
          strategy="beforeInteractive"
        />
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
