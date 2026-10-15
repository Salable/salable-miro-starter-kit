// Imports salable-product.yaml into your Salable account and prints the
// environment variables the app needs, so Product setup never leaves the
// terminal.
//
//   SALABLE_SECRET_KEY=sk_... npm run setup:product
//
// The key is read from the environment, or from .env if it is already set there.

import { readFile } from "node:fs/promises";
import { Salable } from "@salable/sdk";

const PRODUCT_NAME = "Miro Starter Kit";
const PLAN_NAME = "Pro";
const YAML_PATH = new URL("../salable-product.yaml", import.meta.url);

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

// Read SALABLE_SECRET_KEY from the environment, falling back to .env so the
// script works straight after `cp .env.example .env`.
async function readSecretKey() {
  if (process.env.SALABLE_SECRET_KEY) return process.env.SALABLE_SECRET_KEY;

  try {
    const env = await readFile(new URL("../.env", import.meta.url), "utf8");
    const match = env.match(/^SALABLE_SECRET_KEY=(.+)$/m);
    if (match) return match[1].trim();
  } catch {
    // No .env yet — fall through to the error below.
  }

  return null;
}

const secretKey = await readSecretKey();
if (!secretKey) {
  fail(
    "SALABLE_SECRET_KEY is not set. Copy your secret key from https://salable.app/dashboard/api-keys\n" +
      "  and set it in .env, or pass it inline:\n\n" +
      "    SALABLE_SECRET_KEY=sk_... npm run setup:product",
  );
}

// The import endpoint takes a multipart upload, which the SDK models with
// Kiota's MultipartBody type. A plain FormData POST keeps this script free of
// that extra import; the Plan lookup below goes through the SDK.
console.log(`Importing "${PRODUCT_NAME}" from salable-product.yaml…`);

const form = new FormData();
form.append(
  "file",
  new Blob([await readFile(YAML_PATH)], { type: "application/yaml" }),
  "salable-product.yaml",
);

const importResponse = await fetch("https://salable.app/api/products/import", {
  method: "POST",
  headers: { authorization: `Bearer ${secretKey}` },
  body: form,
});

if (!importResponse.ok) {
  fail(
    `Product import failed (${importResponse.status}): ${await importResponse.text()}`,
  );
}

const salable = new Salable(secretKey);

const products = await salable.api.products.get({
  queryParameters: { search: PRODUCT_NAME, expand: ["plans"] },
});

const product = products?.data?.find((p) => p.name === PRODUCT_NAME);
if (!product) {
  fail(`Imported, but couldn't find a Product named "${PRODUCT_NAME}".`);
}

const plan = product.plans?.data?.find((p) => p.name === PLAN_NAME);
if (!plan?.id) {
  fail(`Imported, but "${PRODUCT_NAME}" has no Plan named "${PLAN_NAME}".`);
}

console.log(`\n✔ Imported "${PRODUCT_NAME}" with the "${PLAN_NAME}" Plan.\n`);
console.log("Add these to your .env:\n");
console.log(`SALABLE_SECRET_KEY=${secretKey}`);
console.log(`SALABLE_PLAN_ID=${plan.id}\n`);
