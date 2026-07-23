import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkHealth,
  type HealthCheckDeps,
} from "@/features/ops/health.service";

describe("checkHealth", () => {
  it("returns ok when SELECT 1 succeeds", async () => {
    const fixed = new Date("2026-01-15T12:00:00.000Z");
    const result = await checkHealth({
      prisma: {
        $queryRaw: (async () => [{ "?column?": 1 }]) as HealthCheckDeps["prisma"]["$queryRaw"],
      },
      now: () => fixed,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.status, "ok");
    assert.equal(result.db, "ok");
    assert.equal(result.timestamp, fixed.toISOString());
  });

  it("returns degraded when database query fails", async () => {
    const fixed = new Date("2026-01-15T12:00:00.000Z");
    const result = await checkHealth({
      prisma: {
        $queryRaw: (async () => {
          throw new Error("connection refused");
        }) as HealthCheckDeps["prisma"]["$queryRaw"],
      },
      now: () => fixed,
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, "degraded");
    assert.equal(result.db, "unavailable");
    assert.equal(result.timestamp, fixed.toISOString());
  });
});
