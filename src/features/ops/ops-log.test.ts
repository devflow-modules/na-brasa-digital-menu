import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import {
  buildOpsLogEntry,
  writeOpsLog,
  type OpsLogEntry,
} from "@/features/ops/ops-log";

describe("ops-log", () => {
  it("buildOpsLogEntry truncates long messages", () => {
    const entry = buildOpsLogEntry({
      scope: "test",
      level: "info",
      message: "x".repeat(250),
    });
    assert.ok(entry.message.length <= 200);
    assert.match(entry.message, /\.\.\.$/);
  });

  it("writeOpsLog emits allowlisted JSON fields only", () => {
    const logs: string[] = [];
    const original = console.log;
    console.log = (value: unknown) => {
      logs.push(String(value));
    };
    try {
      writeOpsLog({
        scope: "checkout.create-order",
        level: "error",
        message: "Unexpected failure",
        code: "unexpected",
      });
    } finally {
      console.log = original;
    }

    assert.equal(logs.length, 1);
    const parsed = JSON.parse(logs[0]!) as Record<string, unknown>;
    const keys = Object.keys(parsed).sort();
    assert.deepEqual(keys, [
      "at",
      "code",
      "eventId",
      "level",
      "message",
      "scope",
    ]);
    assert.equal(typeof parsed.eventId, "string");
    assert.equal(parsed.scope, "checkout.create-order");
    assert.equal(parsed.level, "error");
    assert.equal(parsed.message, "Unexpected failure");
    assert.equal(parsed.code, "unexpected");
    assert.equal(typeof parsed.at, "string");
  });

  it("includes optional orderId and storeId when provided", () => {
    const entry = buildOpsLogEntry({
      scope: "admin.order-status",
      level: "info",
      message: "Order status updated",
      orderId: "order_abc",
      storeId: "store_1",
      code: "CONFIRMED",
    });
    assert.equal(entry.orderId, "order_abc");
    assert.equal(entry.storeId, "store_1");
    assert.equal(entry.code, "CONFIRMED");
  });
});

describe("monitoring-webhook", () => {
  it("notifyMonitoringWebhook no-ops without env URL", async () => {
    const { notifyMonitoringWebhook } = await import(
      "@/features/ops/monitoring-webhook"
    );
    const entry: OpsLogEntry = buildOpsLogEntry({
      scope: "test",
      level: "error",
      message: "fail",
    });
    await notifyMonitoringWebhook(entry, {
      NODE_ENV: "test",
    });
  });

  it("notifyMonitoringWebhook does not throw when fetch fails", async () => {
    const { notifyMonitoringWebhook } = await import(
      "@/features/ops/monitoring-webhook"
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async () => {
      throw new Error("network down");
    }) as typeof fetch;

    try {
      const entry = buildOpsLogEntry({
        scope: "test",
        level: "error",
        message: "critical",
        code: "unexpected",
      });
      await notifyMonitoringWebhook(entry, {
        NODE_ENV: "test",
        MONITORING_WEBHOOK_URL: "https://hooks.slack.com/services/test",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("uses Discord payload shape for discord webhook URLs", async () => {
    const { notifyMonitoringWebhook } = await import(
      "@/features/ops/monitoring-webhook"
    );
    let capturedBody = "";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(async (_url, init) => {
      capturedBody = String(init?.body ?? "");
      return new Response(null, { status: 204 });
    }) as typeof fetch;

    try {
      const entry = buildOpsLogEntry({
        scope: "test",
        level: "error",
        message: "alert",
      });
      await notifyMonitoringWebhook(entry, {
        NODE_ENV: "test",
        MONITORING_WEBHOOK_URL:
          "https://discord.com/api/webhooks/123/abc",
      });
      const parsed = JSON.parse(capturedBody) as { content?: string };
      assert.equal(typeof parsed.content, "string");
      assert.match(parsed.content!, /alert/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
