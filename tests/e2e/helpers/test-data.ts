export const CART_STORAGE_KEY = "na-brasa-cart-v1";

export const E2E_CUSTOMER_PREFIX = "E2E";

export function uniqueCustomerName(label: string): string {
  return `${E2E_CUSTOMER_PREFIX} ${label} ${Date.now()}`;
}

export const e2ePhone = "13988887777";

export const e2eAddress = "Rua E2E Teste, 100 - Centro";

export function requireTestEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required env ${name} for E2E tests. Copy .env.example to .env and configure local values.`,
    );
  }
  return value;
}

export function getAdminCredentials() {
  return {
    email: requireTestEnv("ADMIN_EMAIL"),
    password: requireTestEnv("ADMIN_PASSWORD"),
  };
}

export function getStoreSlug(): string {
  return process.env.NEXT_PUBLIC_STORE_SLUG?.trim() || "na-brasa";
}
