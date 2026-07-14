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
