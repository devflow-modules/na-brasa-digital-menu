import type { UserRole } from "@prisma/client";

export type AdminPostLoginPath = "/admin" | "/master";

function assertNever(value: never): never {
  void value;
  throw new Error("Unsupported admin role");
}

/**
 * Role-based landing after successful admin authentication.
 * MASTER never lands on tenant /admin without an explicit Store selection flow.
 * Exhaustive over every real UserRole — no tenant fallback for unknown values.
 */
export function getAdminPostLoginPath(role: UserRole): AdminPostLoginPath {
  switch (role) {
    case "MASTER":
      return "/master";

    case "STORE_OWNER":
    case "MANAGER":
    case "OPERATOR":
    case "KITCHEN":
      return "/admin";

    default:
      return assertNever(role);
  }
}
