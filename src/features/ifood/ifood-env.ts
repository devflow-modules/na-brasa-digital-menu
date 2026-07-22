/**
 * Test-app credentials only — never persist secrets to the database.
 */

export type IfoodEnvConfig = {
  clientId: string;
  clientSecret: string;
  merchantId: string;
  storeSlug: string;
};

export function readIfoodEnv(
  env: NodeJS.ProcessEnv = process.env,
): IfoodEnvConfig {
  const clientId = env.IFOOD_CLIENT_ID?.trim();
  const clientSecret = env.IFOOD_CLIENT_SECRET?.trim();
  const merchantId = env.IFOOD_TEST_MERCHANT_ID?.trim();
  const storeSlug =
    env.IFOOD_TEST_STORE_SLUG?.trim() ||
    env.NEXT_PUBLIC_STORE_SLUG?.trim() ||
    "na-brasa";

  if (!clientId || !clientSecret || !merchantId) {
    throw new Error(
      "Missing iFood test env: IFOOD_CLIENT_ID, IFOOD_CLIENT_SECRET, IFOOD_TEST_MERCHANT_ID",
    );
  }

  return { clientId, clientSecret, merchantId, storeSlug };
}
