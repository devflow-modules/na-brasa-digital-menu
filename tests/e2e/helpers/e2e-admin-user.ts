import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { getPrisma } from "./db";

const BCRYPT_ROUNDS = 10;

export type E2eAdminCredentials = {
  name: string;
  email: string;
  password: string;
};

/**
 * Credentials for E2E admin login.
 * Prefer MASTER_ADMIN_* (same as production bootstrap).
 * Falls back to ADMIN_* only as a local/CI fixture source to create the DB user
 * (runtime auth never reads ADMIN_EMAIL/PASSWORD).
 */
export function getE2eAdminCredentials(): E2eAdminCredentials {
  const masterEmail = process.env.MASTER_ADMIN_EMAIL?.trim();
  const masterPassword = process.env.MASTER_ADMIN_PASSWORD;
  const masterName = process.env.MASTER_ADMIN_NAME?.trim();

  if (masterEmail && masterPassword) {
    return {
      name: masterName || "E2E Master",
      email: masterEmail.toLowerCase(),
      password: masterPassword,
    };
  }

  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    return {
      name: "E2E Admin",
      email: email.toLowerCase(),
      password,
    };
  }

  throw new Error(
    "E2E admin credentials missing. Set MASTER_ADMIN_EMAIL + MASTER_ADMIN_PASSWORD (preferred) or ADMIN_EMAIL + ADMIN_PASSWORD as test fixture only.",
  );
}

/**
 * Ensures an active MASTER user exists for E2E login (idempotent upsert).
 * Never logs the password.
 */
export async function ensureE2eAdminUser(
  credentials: E2eAdminCredentials = getE2eAdminCredentials(),
): Promise<{ userId: string; email: string; role: UserRole }> {
  const prisma = getPrisma();
  const passwordHash = await bcrypt.hash(credentials.password, BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email: credentials.email },
    create: {
      name: credentials.name,
      email: credentials.email,
      passwordHash,
      role: UserRole.MASTER,
      storeId: null,
      isActive: true,
    },
    update: {
      name: credentials.name,
      passwordHash,
      role: UserRole.MASTER,
      storeId: null,
      isActive: true,
    },
    select: { id: true, email: true, role: true },
  });

  return { userId: user.id, email: user.email, role: user.role };
}

/**
 * Creates (or resets) an inactive user for negative login tests.
 */
export async function ensureInactiveE2eUser(options?: {
  email?: string;
  password?: string;
}): Promise<{ email: string; password: string }> {
  const prisma = getPrisma();
  const email = (options?.email ?? "e2e-inactive@example.com").toLowerCase();
  const password = options?.password ?? "inactive-user-password";
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.user.upsert({
    where: { email },
    create: {
      name: "E2E Inactive",
      email,
      passwordHash,
      role: UserRole.OPERATOR,
      storeId: null,
      isActive: false,
    },
    update: {
      passwordHash,
      isActive: false,
      role: UserRole.OPERATOR,
      storeId: null,
    },
  });

  return { email, password };
}

export type E2eStoreUserCredentials = {
  name: string;
  email: string;
  password: string;
  role: typeof UserRole.STORE_OWNER | typeof UserRole.OPERATOR;
};

/**
 * Ensures an active store-scoped user for negative /master access tests.
 * Never logs the password.
 */
export async function ensureE2eStoreUser(options?: {
  email?: string;
  password?: string;
  role?: typeof UserRole.STORE_OWNER | typeof UserRole.OPERATOR;
  storeSlug?: string;
  /** When true, force storeId null (invalid store user fixture). */
  withoutStoreId?: boolean;
}): Promise<
  E2eStoreUserCredentials & { userId: string; storeId: string | null }
> {
  const prisma = getPrisma();
  const storeSlug =
    options?.storeSlug ??
    process.env.NEXT_PUBLIC_STORE_SLUG?.trim() ??
    "na-brasa";

  let storeId: string | null = null;
  if (!options?.withoutStoreId) {
    const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
    if (!store) {
      throw new Error(
        `Store "${storeSlug}" not found. Run pnpm prisma db seed before E2E.`,
      );
    }
    storeId = store.id;
  }

  const credentials: E2eStoreUserCredentials = {
    name: "E2E Store Operator",
    email: (
      options?.email ??
      (options?.withoutStoreId
        ? "e2e-store-orphan@example.com"
        : `e2e-store-${storeSlug}@example.com`)
    ).toLowerCase(),
    password: options?.password ?? "store-operator-password",
    role: options?.role ?? UserRole.OPERATOR,
  };

  const passwordHash = await bcrypt.hash(credentials.password, BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email: credentials.email },
    create: {
      name: credentials.name,
      email: credentials.email,
      passwordHash,
      role: credentials.role,
      storeId,
      isActive: true,
    },
    update: {
      name: credentials.name,
      passwordHash,
      role: credentials.role,
      storeId,
      isActive: true,
    },
    select: { id: true },
  });

  return {
    ...credentials,
    userId: user.id,
    storeId,
  };
}
