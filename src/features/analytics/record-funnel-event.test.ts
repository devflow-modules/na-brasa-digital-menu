import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { recordFunnelEvent } from "@/features/analytics/record-funnel-event";

type CreateCall = {
  storeId: string;
  name: string;
  dedupeKey: string;
  occurredAt: Date;
  clientOccurredAt: Date | null;
};

function createMockDb(options?: {
  onCreate?: (data: CreateCall) => void | Promise<void>;
}) {
  const creates: CreateCall[] = [];
  return {
    creates,
    db: {
      funnelEvent: {
        create: async ({ data }: { data: CreateCall }) => {
          creates.push(data);
          await options?.onCreate?.(data);
          return { id: "evt_1", ...data };
        },
      },
    },
  };
}

describe("recordFunnelEvent", () => {
  it("sets occurredAt on the server and ignores client clock for occurredAt", async () => {
    const fixedNow = new Date("2026-07-22T15:00:00.000Z");
    const clientTime = new Date("2026-07-21T10:00:00.000Z");
    const { db, creates } = createMockDb();

    const result = await recordFunnelEvent(
      {
        storeId: "store_a",
        name: "checkout_started",
        dedupeKey: "checkout_started:sess-1",
        sessionId: "sess-1",
        clientOccurredAt: clientTime.toISOString(),
      },
      { db, now: () => fixedNow },
    );

    assert.deepEqual(result, { ok: true, recorded: true });
    assert.equal(creates.length, 1);
    assert.equal(creates[0]!.occurredAt.toISOString(), fixedNow.toISOString());
    assert.equal(
      creates[0]!.clientOccurredAt?.toISOString(),
      clientTime.toISOString(),
    );
  });

  it("treats unique (storeId, dedupeKey) conflicts as duplicates", async () => {
    const { db } = createMockDb({
      onCreate: () => {
        throw new Prisma.PrismaClientKnownRequestError("Unique constraint", {
          code: "P2002",
          clientVersion: "test",
        });
      },
    });

    const result = await recordFunnelEvent(
      {
        storeId: "store_a",
        name: "order_created",
        dedupeKey: "order_created:order_1",
        orderId: "order_1",
        source: "DIRECT",
      },
      { db },
    );

    assert.deepEqual(result, {
      ok: true,
      recorded: false,
      reason: "duplicate",
    });
  });

  it("does not throw on invalid input or unexpected persistence errors", async () => {
    const invalid = await recordFunnelEvent({
      storeId: "store_a",
      name: "not_an_event",
      dedupeKey: "x",
    });
    assert.deepEqual(invalid, {
      ok: true,
      recorded: false,
      reason: "invalid",
    });

    const { db } = createMockDb({
      onCreate: () => {
        throw new Error("db down");
      },
    });
    const errored = await recordFunnelEvent(
      {
        storeId: "store_a",
        name: "menu_viewed",
        dedupeKey: "menu_viewed:sess:2026-07-22",
      },
      { db },
    );
    assert.deepEqual(errored, { ok: true, recorded: false, reason: "error" });
  });

  it("scopes dedupe identity by storeId in the persisted row", async () => {
    const { db, creates } = createMockDb();
    const dedupeKey = "order_created:shared-order-code-shape";

    await recordFunnelEvent(
      {
        storeId: "store_a",
        name: "order_created",
        dedupeKey,
        orderId: "order_a",
        source: "DIRECT",
      },
      { db },
    );
    await recordFunnelEvent(
      {
        storeId: "store_b",
        name: "order_created",
        dedupeKey,
        orderId: "order_b",
        source: "COUNTER",
      },
      { db },
    );

    assert.equal(creates.length, 2);
    assert.equal(creates[0]!.storeId, "store_a");
    assert.equal(creates[1]!.storeId, "store_b");
    assert.equal(creates[0]!.dedupeKey, dedupeKey);
    assert.equal(creates[1]!.dedupeKey, dedupeKey);
  });
});
