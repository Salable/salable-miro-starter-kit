# Salable Miro Starter Kit

A Next.js template for building monetized [Miro](https://miro.com) apps using [Salable](https://salable.app) for pricing, subscriptions, and feature gating.

In this template is a Miro panel app with a single paid feature: a button that adds a sticky note to the board. It covers the full lifecycle a monetized app needs — identifying the customer, checking what they are entitled to, selling them a Plan, and handling cancellation.

When a user opens the panel, the app resolves the current Miro team identity and checks whether that team holds a valid Salable subscription. Teams with a valid subscription can use the gated feature; teams without one are shown a checkout link to purchase a plan.

## Stack

- **Next.js 16**: App Router, server-side API routes
- **Miro Web SDK v2**: panel lifecycle and board interaction
- **Mirotone**: Miro's native CSS design system
- **TypeScript**

## Prerequisites

Before running the app you need:

- A [Salable account](https://salable.app/auth/sign-in) with a Product and Plan set up (see [Salable setup](#salable-setup) below). Your API keys are created for you, so you only need to copy them.
- A Miro Developer Team and a registered app (see [Miro setup](#miro-setup) below)
- Node.js 22 or later

## Getting started

**1. Clone the repository**

```bash
git clone https://github.com/Salable/salable-miro-starter-kit.git
cd salable-miro-starter-kit
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

```bash
cp .env.example .env
```

Open `.env` and fill in the four required values. All variables are server-only secrets—none carry a `NEXT_PUBLIC_` prefix, so they are never embedded in the browser bundle.

| Variable             | Description                                                        |
| -------------------- | ------------------------------------------------------------------ |
| `SALABLE_SECRET_KEY` | Your Salable **secret** key (used for every Salable API call)      |
| `SALABLE_PLAN_ID`    | ID of the Salable Plan to gate features behind                     |
| `MIRO_ACCESS_TOKEN`  | A Miro OAuth access token (used to resolve the team ID at runtime) |
| `MIRO_CLIENT_ID`     | Your Miro app's **Client ID** (from the app settings page)         |

**4. Start the dev server**

```bash
npm run dev
```

The app runs on `http://localhost:3000`.

**5. Open the panel in Miro**

Open a Miro board in your Developer Team. Select the Plus icon in the bottom-left corner, find and select your app in the list.

If you can't see your app in the list, ensure that the app has been installed correctly on your team.

> **Warning** Browsers require the **Apps on device** permission to reach a server running on your machine. If Miro can't load your local app, open the site permissions for `miro.com` in your browser and allow **Apps on device**.

## Salable setup

### Get your API key

Open the [API Keys page](https://salable.app/dashboard/api-keys) of the Salable dashboard. You'll find a **publishable key** and a **secret key**; this template only needs the secret key, because every Salable call is made from a Next.js API route rather than the browser.

Copy the **secret key** and add it to `.env` as `SALABLE_SECRET_KEY`.

> **Note** The Salable secret key is used server-side only. It is kept in a server-only environment variable and never sent to the browser.

### Import the example Product

If you just want to see a working Miro app with Salable, skip the manual setup below. This repository includes [`salable-product.yaml`](https://github.com/Salable/salable-miro-starter-kit/blob/main/salable-product.yaml), a ready-made Product with both required Entitlements and a flat-rate monthly Plan already configured.

With `SALABLE_SECRET_KEY` set in `.env`, run:

```bash
npm run setup:product
```

The script uploads the YAML to your Salable account and prints the environment variables to paste into `.env`:

```
✔ Imported "Miro Starter Kit" with the "Pro" Plan.

Add these to your .env:

SALABLE_SECRET_KEY=sk_test_…
SALABLE_PLAN_ID=plan_…
```

That's the Salable side done — continue at [Miro setup](#miro-setup).

> **Note** You can also import the file by hand: open the [Products page](https://salable.app/dashboard/products), click **Upload Yaml** in the top right, and select `salable-product.yaml`.

### Manually configure the Product

To build the Product yourself instead of importing it, follow the steps below.

#### Create a Product

Open the [Products page](https://salable.app/dashboard/products) on the Salable dashboard. Enter a name for your Product (_eg_ "My Miro App") and click **Create Product**.

#### Create a Plan

Inside your Product, enter a Plan name (_eg_ "Pro") and click **Create Plan**.

#### Add Entitlements

**[Entitlements](https://salable.app/docs/understanding-entitlements)** are the features you want to gate until a user subscribes. The starter kit checks for two entitlement values by name, so they must be defined on your Plan with exactly these names:

| Entitlement name | Purpose                                                                      |
| ---------------- | ---------------------------------------------------------------------------- |
| `pro`            | Indicates an active Pro subscription; hides the checkout prompt when present |
| `create`         | Enables the "Add sticky!" button                                             |

In the Entitlements field on your Plan, type each name and click **(+)** to add it. Entitlements aren't attached to the Plan until you save it.

#### Add a Line Item

**[Line Items](https://salable.app/docs/products-and-pricing#line-items)** define how customers are charged. For a simple paywall, a Flat Rate Line Item is the right choice.

Click **Add Line Item** and enter a **Line Item Name**, a customer-facing label (_eg_ "Monthly Subscription"). The default Interval Type and Price Type are already what a simple paywall needs.

Then add a Price: set the Currency to **USD**, enter a Unit Amount, leave Interval as **Month** and Interval Count as **1**. Click **Save Plan**.

> **Note** The starter kit requests a USD checkout, so the Price on your Plan must be in USD too. To use a different currency, change `currency` in `app/app/page.tsx` to match.

#### Copy the Plan ID

Go back to the Plans tab and copy the **Plan ID**, this goes into the `SALABLE_PLAN_ID` environment variable.

## Miro setup

### Create a Developer Team

Follow the [Miro guide to create a Developer Team](https://developers.miro.com/docs/create-a-developer-team). Developer Teams let you install apps in development without going through the Miro Marketplace review process.

### Register the app

Inside your Developer Team, create a new app and set the **App URL** to `http://localhost:3000`. Copy the **Client ID** from the app settings and add it to `.env` as `MIRO_CLIENT_ID`.

### Get a Miro access token

The app resolves the Miro team identity at runtime by calling `GET https://api.miro.com/v1/oauth-token` with a Miro OAuth access token. You can generate one straight from your app's settings page, no OAuth flow required.

Scroll to the **Permissions** section, tick `boards:read` and `boards:write`, then click **Install app and get OAuth token** and choose your Developer Team. Miro shows the token once, copy it and set it as `MIRO_ACCESS_TOKEN` in `.env`.

> **Note** The Miro access token is used server-side only. It is kept in a server-only environment variable and never sent to the browser.

## How it works

### Grantee identity

Entitlement checks are scoped **per Miro team**, not per individual user. On mount, the panel fetches `/api/miro/oauth-token`, which calls the Miro REST API server-side and returns the team ID. That team ID is then used as the `granteeId` on all Salable API calls.

### Entitlement check

The panel calls `/api/salable/entitlements/check?granteeId=<teamId>`, which uses the [Salable Node SDK](https://www.npmjs.com/package/@salable/sdk) to call Salable's [entitlement check](https://salable.app/docs/check-entitlements) endpoint ([API reference](https://salable.app/docs/openapi/scalar#tag/entitlements/GET/api/entitlements/check)). If the team holds the `pro` entitlement, the checkout prompt is hidden; if it holds `create`, the "Add sticky!" button is enabled.

### Checkout

If the team has no valid subscriptions, the panel calls `/api/salable/checkout` to generate a Stripe-hosted checkout URL. That route calls Salable's [Quick Checkout](https://salable.app/docs/quick-checkout) endpoint ([API reference](https://salable.app/docs/openapi/scalar#tag/checkout/POST/api/checkout)) through the SDK, so the secret key never leaves the server. The checkout link opens in a new tab because Miro apps run inside an iframe and cannot redirect the current frame.

After a successful payment, Salable creates the Subscription and grants the Entitlements automatically. The next time the panel loads, the entitlement check will return the new entitlements and the feature will be unlocked.

In Test Mode, checkout links run against Stripe's test environment, so no real money moves. Complete a test purchase with Stripe's test card `4242 4242 4242 4242`, any future expiry date, and any three-digit CVC.

> **Note** Once a team holds the `pro` Entitlement the panel stops showing the checkout prompt, so the Subscription has to end before you can run the purchase flow again. The panel's **Cancel subscription** button does this for you, calling `/api/salable/cancel`. You can also cancel from the [Subscriptions page](https://salable.app/dashboard/subscriptions) on the dashboard, or by calling [`POST /api/subscriptions/{id}/cancel`](https://salable.app/docs/openapi/scalar#tag/subscriptions/POST/api/subscriptions/{id}/cancel) directly. Cancelling immediately revokes the Entitlements, so the panel shows the checkout prompt again.

### API route overview

All three Salable routes use the [Salable Node SDK](https://www.npmjs.com/package/@salable/sdk) with the secret key, which stays on the server.

| Route                             | Method | Purpose                                                   |
| --------------------------------- | ------ | --------------------------------------------------------- |
| `/api/salable/entitlements/check` | `GET`  | Checks which Entitlements the team holds                  |
| `/api/salable/checkout`           | `POST` | Generates a Quick Checkout link for the gated Plan        |
| `/api/salable/cancel`             | `POST` | Cancels the team's active Subscription                    |
| `/api/miro/oauth-token`           | `GET`  | Proxies OAuth token lookup to Miro to resolve the team ID |

## Moving to production

When you're ready to accept real payments:

1. In **Test Mode**, open your Product's configuration page and click **Copy to Live Mode** to replicate your Product, Plans, and Line Items.
2. Switch to **Live Mode** in the Salable dashboard.
3. On the [Payment Integrations page](https://salable.app/dashboard/payment-integrations), check that your Stripe Connect account has **Active** status. Full onboarding is required before Live Mode checkout links will work; start or finish it from that page.
4. Set your Live Mode API key and Plan ID as environment variables on your hosting provider.
5. Deploy the Next.js app to a hosting provider such as [Vercel](https://vercel.com) and update the app URL in your Miro app settings to your production domain.
6. Submit the Miro app for review so it can be installed outside your Developer Team. See Miro's guide to [publishing an app on the Marketplace](https://developers.miro.com/docs/publish-your-app-on-the-marketplace).

> **Note** Test Mode and Live Mode API keys are separate and cannot be mixed.

## Other commands

| Command                 | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| `npm run dev`           | Start the development server on port 3000            |
| `npm run build`         | Create a production build                            |
| `npm start`             | Start the production server (run `build` first)      |
| `npm run setup:product` | Import `salable-product.yaml` and print the env vars |

## Further reading

- [Understanding Entitlements](https://salable.app/docs/understanding-entitlements)
- [Per-Seat Billing](https://salable.app/docs/per-seat-quick-start)
- [Usage-Based Billing](https://salable.app/docs/usage-quick-start)
- [Cancel a Subscription](https://salable.app/docs/cancel-subscription)
- [Miro Developer documentation](https://developers.miro.com/docs)
