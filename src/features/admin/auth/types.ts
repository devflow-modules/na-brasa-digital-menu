import type { UserRole } from "@prisma/client";

/**
 * Session payload after database-backed admin login.
 * MASTER may access /admin temporarily until /master exists (ADR 0002).
 */
export type AdminSessionPayload = {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  storeId: string | null;
  iat: number;
  exp: number;
};

export type AdminLoginResult =
  | { ok: true }
  | { ok: false; message: string };

export type AuthenticatedAdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId: string | null;
};
