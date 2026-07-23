import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { UserRole } from "@prisma/client";
import {
  isAdminSessionValidForUser,
  normalizeTokenSessionVersion,
  type AdminJwtSessionClaims,
  type AdminSessionUserSnapshot,
} from "@/features/admin/auth/admin-session-verifier";

const BASE_CLAIMS: AdminJwtSessionClaims = {
  userId: "user-1",
  name: "Test User",
  email: "test@example.com",
  role: "OPERATOR",
  storeId: "store-1",
  sessionVersion: 0,
  iat: 1,
  exp: 2,
};

const BASE_USER: AdminSessionUserSnapshot = {
  id: "user-1",
  isActive: true,
  sessionVersion: 0,
  role: "OPERATOR",
  storeId: "store-1",
};

describe("normalizeTokenSessionVersion", () => {
  it("treats missing claim as version 0", () => {
    assert.equal(normalizeTokenSessionVersion(undefined), 0);
    assert.equal(normalizeTokenSessionVersion(null), 0);
  });

  it("accepts non-negative integers", () => {
    assert.equal(normalizeTokenSessionVersion(0), 0);
    assert.equal(normalizeTokenSessionVersion(3), 3);
  });

  it("rejects invalid claim shapes", () => {
    assert.equal(normalizeTokenSessionVersion("0"), -1);
    assert.equal(normalizeTokenSessionVersion(-1), -1);
    assert.equal(normalizeTokenSessionVersion(1.5), -1);
  });
});

describe("isAdminSessionValidForUser", () => {
  it("accepts active user with matching version, role, and store", () => {
    assert.equal(isAdminSessionValidForUser(BASE_CLAIMS, BASE_USER), true);
  });

  it("rejects inactive user", () => {
    assert.equal(
      isAdminSessionValidForUser(BASE_CLAIMS, { ...BASE_USER, isActive: false }),
      false,
    );
  });

  it("rejects session version mismatch", () => {
    assert.equal(
      isAdminSessionValidForUser(
        { ...BASE_CLAIMS, sessionVersion: 1 },
        BASE_USER,
      ),
      false,
    );
  });

  it("rejects role mismatch", () => {
    assert.equal(
      isAdminSessionValidForUser(BASE_CLAIMS, {
        ...BASE_USER,
        role: "MANAGER" as UserRole,
      }),
      false,
    );
  });

  it("rejects store mismatch", () => {
    assert.equal(
      isAdminSessionValidForUser(BASE_CLAIMS, {
        ...BASE_USER,
        storeId: "store-other",
      }),
      false,
    );
  });

  it("rejects missing user", () => {
    assert.equal(isAdminSessionValidForUser(BASE_CLAIMS, null), false);
  });

  it("legacy token at version 0 works while persisted version is 0", () => {
    const legacyClaims = { ...BASE_CLAIMS, sessionVersion: 0 };
    assert.equal(isAdminSessionValidForUser(legacyClaims, BASE_USER), true);
  });

  it("legacy token at version 0 fails after persisted version bumped", () => {
    assert.equal(
      isAdminSessionValidForUser(BASE_CLAIMS, {
        ...BASE_USER,
        sessionVersion: 1,
      }),
      false,
    );
  });

  it("matches MASTER with null storeId", () => {
    const masterClaims: AdminJwtSessionClaims = {
      ...BASE_CLAIMS,
      role: "MASTER",
      storeId: null,
    };
    const masterUser: AdminSessionUserSnapshot = {
      ...BASE_USER,
      role: "MASTER",
      storeId: null,
    };
    assert.equal(isAdminSessionValidForUser(masterClaims, masterUser), true);
  });
});
