import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SignJWT } from "jose";
import { verifyAdminToken } from "@/features/admin/auth/admin-jwt";

describe("verifyAdminToken sessionVersion", () => {
  const secretValue = "test-admin-jwt-secret-32chars!!";

  it("accepts tokens without sessionVersion claim as version 0", async () => {
    const legacyToken = await new SignJWT({
      userId: "u1",
      name: "Legacy",
      email: "legacy@example.com",
      role: "MASTER",
      storeId: null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .setSubject("u1")
      .sign(new TextEncoder().encode(secretValue));

    const previousSecret = process.env.ADMIN_JWT_SECRET;
    process.env.ADMIN_JWT_SECRET = secretValue;

    try {
      const claims = await verifyAdminToken(legacyToken);
      assert.ok(claims);
      assert.equal(claims.sessionVersion, 0);
    } finally {
      if (previousSecret === undefined) {
        delete process.env.ADMIN_JWT_SECRET;
      } else {
        process.env.ADMIN_JWT_SECRET = previousSecret;
      }
    }
  });
});
