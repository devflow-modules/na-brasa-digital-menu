import type { UserRole } from "@prisma/client";

export const STORE_USER_ROLES = [
  "STORE_OWNER",
  "MANAGER",
  "OPERATOR",
  "KITCHEN",
] as const satisfies readonly UserRole[];

export type StoreUserRole = (typeof STORE_USER_ROLES)[number];

export function isStoreUserRole(value: unknown): value is StoreUserRole {
  return (
    typeof value === "string" &&
    (STORE_USER_ROLES as readonly string[]).includes(value)
  );
}

export type MasterStoreUserListItem = {
  id: string;
  name: string;
  email: string;
  role: StoreUserRole;
  isActive: boolean;
  storeId: string;
  storeName: string;
  createdAt: Date;
};

export type MasterStoreUsersPageData = {
  store: {
    id: string;
    name: string;
    slug: string;
  };
  users: MasterStoreUserListItem[];
};

export type MasterStoreUserActionResult =
  | { ok: true }
  | { ok: false; message: string };
