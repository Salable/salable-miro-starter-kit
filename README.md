# Salable Miro Starter

A starter template for building monetized [Miro](https://miro.com) apps using [Salable](https://salable.app) for subscription management.

When a user opens the panel, the app checks whether their Miro team holds an active Salable subscription. Teams with a subscription can create sticky notes on the board; teams without a subscription are shown a checkout link to purchase a plan.

## Stack

- **Miro Web SDK v2** — panel lifecycle and board interaction
- **React + Vite** — UI and build tooling
- **Mirotone** — Miro's native CSS design system

## Getting started

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment variables**

```bash
cp .env.example .env
```

Fill in the four required values in `.env`:

| Variable | Description |
|---|---|
| `VITE_SALABLE_API_KEY` | Your Salable **publishable** key (used for entitlement checks) |
| `VITE_SALABLE_SECRET_KEY` | Your Salable **secret** key (used for checkout link generation — see security note below) |
| `VITE_SALABLE_PLAN_UUID` | UUID of the Salable plan to gate features behind |
| `VITE_SALABLE_PRODUCT_UUID` | UUID of the Salable product |
| `VITE_MIRO_ACCESS_TOKEN` | Miro OAuth token (used to resolve the team ID) |

**3. Register the app in Miro**

Create a [Miro Developer Team](https://developers.miro.com/docs/create-a-developer-team) and register a new app pointing to `http://localhost:3000`.

**4. Start the dev server**

```bash
npm start
```

Open `http://localhost:3000` in your browser, then open your Miro board and click the app icon in the toolbar to launch the panel.

## Salable configuration

### Product and plan setup

In the [Salable dashboard](https://salable.app), create a product with a plan. The UUIDs for both go into your `.env` file as `VITE_SALABLE_PRODUCT_UUID` and `VITE_SALABLE_PLAN_UUID`.

### Required feature names

The app checks for two features on the grantee (Miro team). These must be defined on your Salable product with **exactly** these names (matching is case-insensitive):

| Feature name | Purpose |
|---|---|
| `create` | Enables the "Add sticky!" button |
| `pro` | Determines whether the user holds an active Pro license; hides the checkout link when `true` |

If either feature is missing from your Salable product configuration, the corresponding check will return `false` and the feature will remain locked.

### API keys

Salable issues two key types per environment:

- **Publishable key** (`VITE_SALABLE_API_KEY`): safe for client-side use. Only grants access to `GET /api/entitlements/check`.
- **Secret key** (`VITE_SALABLE_SECRET_KEY`): required for `POST /api/checkout` and all other write operations.

> **Security warning**: Because this is a client-side-only app, `VITE_SALABLE_SECRET_KEY` is bundled into the browser build and is visible to anyone who inspects the source. Before shipping to production, move the checkout call to a backend proxy (a serverless function, API route, etc.) so the secret key stays server-side.

### Grantee identity

Licenses are scoped **per Miro team**, not per individual user. The app resolves the team ID at runtime by calling `GET https://api.miro.com/v1/oauth-token` with `VITE_MIRO_ACCESS_TOKEN`, and uses the returned `team.id` as the `granteeId` on all Salable API calls.

## Other commands

| Command | Description |
|---|---|
| `npm run build` | Production build (output in `dist/`) |
| `npm run serve` | Preview the production build locally |
