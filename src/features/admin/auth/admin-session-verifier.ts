import type { UserRole } from "@prisma/client";
import type { AdminSessionPayload } from "@/features/admin/auth/types";

export type AdminSessionUserSnapshot = {
  id: string;
  isActive: boolean;
  sessionVersion: number;
  role: UserRole;
  storeId: string | null;
};

export type AdminJwtSessionClaims = AdminSessionPayload & {
  sessionVersion: number;
};

export function normalizeTokenSessionVersion(claim: unknown): number {
  if (claim === undefined || claim === null) {
    return 0;
  }
  if (typeof claim === "number" && Number.isInteger(claim) && claim >= 0) {
    return claim;
  }
  return -1;
}

export function isAdminSessionValidForUser(
  claims: AdminJwtSessionClaims,
  user: AdminSessionUserSnapshot | null,
): boolean {
  if (!user || user.id !== claims.userId) {
    return false;
  }

  if (!user.isActive) {
    return false;
  }

  if (claims.sessionVersion !== user.sessionVersion) {
    return false;
  }

  if (claims.role !== user.role) {
    return false;
  }

  if (claims.storeId !== user.storeId) {
    return false;
  }

  return true;
}
