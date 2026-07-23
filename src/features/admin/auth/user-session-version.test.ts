import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withSessionVersionBump } from "@/features/admin/auth/user-session-version";

describe("withSessionVersionBump", () => {
  it("adds sessionVersion increment for deactivate", () => {
    assert.deepEqual(withSessionVersionBump({ isActive: false }), {
      isActive: false,
      sessionVersion: { increment: 1 },
    });
  });

  it("adds sessionVersion increment for reactivate", () => {
    assert.deepEqual(withSessionVersionBump({ isActive: true }), {
      isActive: true,
      sessionVersion: { increment: 1 },
    });
  });

  it("adds sessionVersion increment for role change updates", () => {
    assert.deepEqual(
      withSessionVersionBump({ role: "MANAGER", storeId: "store-1" }),
      {
        role: "MANAGER",
        storeId: "store-1",
        sessionVersion: { increment: 1 },
      },
    );
  });

  it("adds sessionVersion increment for password reset updates", () => {
    assert.deepEqual(withSessionVersionBump({ passwordHash: "hash" }), {
      passwordHash: "hash",
      sessionVersion: { increment: 1 },
    });
  });
});
