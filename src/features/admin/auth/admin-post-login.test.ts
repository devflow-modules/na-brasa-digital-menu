import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { UserRole } from "@prisma/client";
import { getAdminPostLoginPath } from "@/features/admin/auth/admin-post-login";

const STORE_ROLES: UserRole[] = [
  "STORE_OWNER",
  "MANAGER",
  "OPERATOR",
  "KITCHEN",
];

const REAL_ROLES: UserRole[] = ["MASTER", ...STORE_ROLES];

describe("getAdminPostLoginPath", () => {
  it("sends MASTER to /master", () => {
    assert.equal(getAdminPostLoginPath("MASTER"), "/master");
  });

  it("sends every Store role to /admin", () => {
    for (const role of STORE_ROLES) {
      assert.equal(getAdminPostLoginPath(role), "/admin", role);
    }
  });

  it("covers every real role with an internal non-empty path", () => {
    for (const role of REAL_ROLES) {
      const path = getAdminPostLoginPath(role);
      assert.equal(path.length > 0, true, role);
      assert.equal(path.startsWith("/"), true, path);
      assert.equal(path.includes("://"), false, path);
      assert.equal(path.startsWith("//"), false, path);
      assert.notEqual(path, "/admin/login", role);
    }
  });

  it("fails safely for an invalid runtime role", () => {
    assert.throws(
      () => getAdminPostLoginPath("INVALID_ROLE" as UserRole),
      (error: unknown) =>
        error instanceof Error && error.message === "Unsupported admin role",
    );
  });
});
