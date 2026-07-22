import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IfoodConnection } from "@prisma/client";
import type { IfoodApiClient, IfoodPollingEvent } from "@/features/ifood/ifood-api.client";
import { runIfoodPollCycle } from "@/features/ifood/ifood-poller.service";

type FakeEventRow = {
  connectionId: string;
  externalEventId: string;
  processingStatus: string;
  acknowledgedAt: Date | null;
};

function createFakePrisma(options?: {
  lockAcquired?: boolean;
  existingEventIds?: string[];
}) {
  const lockAcquired = options?.lockAcquired ?? true;
  const events = new Map<string, FakeEventRow>();
  for (const id of options?.existingEventIds ?? []) {
    events.set(id, {
      connectionId: "conn_1",
      externalEventId: id,
      processingStatus: "PROCESSED",
      acknowledgedAt: null,
    });
  }

  const orders = new Map<
    string,
    {
      lastEventAt: Date | null;
      lastEventFullCode: string | null;
      lastExternalEventId: string | null;
    }
  >();
  let updateManyCalls = 0;

  const prisma = {
    ifoodConnection: {
      async updateMany(args: {
        where: { id: string; OR?: unknown[] };
        data: Record<string, unknown>;
      }) {
        updateManyCalls += 1;
        // First call = acquire, later = release
        if (args.data.pollLockedAt != null) {
          return { count: lockAcquired ? 1 : 0 };
        }
        return { count: 1 };
      },
    },
    ifoodEvent: {
      async create(args: { data: FakeEventRow & Record<string, unknown> }) {
        const id = args.data.externalEventId;
        if (events.has(id)) {
          const error = new Error("Unique constraint") as Error & { code: string };
          error.code = "P2002";
          throw error;
        }
        events.set(id, {
          connectionId: args.data.connectionId,
          externalEventId: id,
          processingStatus: "PENDING",
          acknowledgedAt: null,
        });
        return args.data;
      },
      async update(args: {
        where: { connectionId_externalEventId: { externalEventId: string } };
        data: Partial<FakeEventRow>;
      }) {
        const id = args.where.connectionId_externalEventId.externalEventId;
        const row = events.get(id);
        if (!row) throw new Error("missing event");
        Object.assign(row, args.data);
        return row;
      },
      async updateMany(args: {
        where: { externalEventId: { in: string[] } };
        data: Partial<FakeEventRow>;
      }) {
        for (const id of args.where.externalEventId.in) {
          const row = events.get(id);
          if (row) Object.assign(row, args.data);
        }
        return { count: args.where.externalEventId.in.length };
      },
    },
    ifoodOrder: {
      async findUnique(args: {
        where: { connectionId_externalOrderId: { externalOrderId: string } };
      }) {
        return orders.get(args.where.connectionId_externalOrderId.externalOrderId) ?? null;
      },
      async upsert(args: {
        where: { connectionId_externalOrderId: { externalOrderId: string } };
        create: {
          lastEventAt: Date;
          lastEventFullCode: string;
          lastExternalEventId: string;
        };
        update: {
          lastEventAt?: Date;
          lastEventFullCode?: string;
          lastExternalEventId?: string;
        };
      }) {
        const id = args.where.connectionId_externalOrderId.externalOrderId;
        const prev = orders.get(id);
        if (!prev) {
          orders.set(id, {
            lastEventAt: args.create.lastEventAt,
            lastEventFullCode: args.create.lastEventFullCode,
            lastExternalEventId: args.create.lastExternalEventId,
          });
        } else {
          orders.set(id, {
            lastEventAt: args.update.lastEventAt ?? prev.lastEventAt,
            lastEventFullCode:
              args.update.lastEventFullCode ?? prev.lastEventFullCode,
            lastExternalEventId:
              args.update.lastExternalEventId ?? prev.lastExternalEventId,
          });
        }
        return orders.get(id);
      },
    },
    _events: events,
    _orders: orders,
    _updateManyCalls: () => updateManyCalls,
  };

  return prisma;
}

function connection(): IfoodConnection {
  return {
    id: "conn_1",
    storeId: "store_1",
    merchantId: "merchant_1",
    isActive: true,
    pollLockedAt: null,
    pollLockedBy: null,
    lastPolledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("runIfoodPollCycle", () => {
  it("persists before ACK and ACKs duplicates already stored", async () => {
    const prisma = createFakePrisma({ existingEventIds: ["evt-dup"] });
    const acknowledged: string[][] = [];
    const api: IfoodApiClient = {
      async authenticate() {
        return { accessToken: "t", expiresIn: 100 };
      },
      async pollEvents() {
        return [
          {
            id: "evt-dup",
            fullCode: "PLACED",
            orderId: "ord-1",
            merchantId: "merchant_1",
            createdAt: "2026-07-22T12:00:00.000Z",
          },
          {
            id: "evt-new",
            fullCode: "PLACED",
            orderId: "ord-1",
            merchantId: "merchant_1",
            createdAt: "2026-07-22T12:01:00.000Z",
          },
        ] satisfies IfoodPollingEvent[];
      },
      async acknowledge(_token, ids) {
        acknowledged.push(ids);
      },
      async getOrder() {
        return { id: "ord-1", displayId: "100" };
      },
    };

    const result = await runIfoodPollCycle({
      prisma: prisma as never,
      api,
      connection: connection(),
      lockedBy: "test",
    });

    assert.equal(result.locked, true);
    assert.equal(result.duplicates, 1);
    assert.equal(result.persistedNew, 1);
    assert.equal(result.acknowledged, 2);
    assert.deepEqual(acknowledged[0]?.sort(), ["evt-dup", "evt-new"]);
    assert.equal(prisma._events.get("evt-new")?.acknowledgedAt != null, true);
  });

  it("does not ACK events that failed to persist", async () => {
    const prisma = createFakePrisma();
    const originalCreate = prisma.ifoodEvent.create.bind(prisma.ifoodEvent);
    prisma.ifoodEvent.create = async (args) => {
      if (args.data.externalEventId === "evt-fail") {
        throw new Error("db down");
      }
      return originalCreate(args);
    };

    const acknowledged: string[] = [];
    const api: IfoodApiClient = {
      async authenticate() {
        return { accessToken: "t", expiresIn: 100 };
      },
      async pollEvents() {
        return [
          {
            id: "evt-fail",
            fullCode: "PLACED",
            orderId: "ord-1",
            merchantId: "merchant_1",
          },
          {
            id: "evt-ok",
            fullCode: "PLACED",
            orderId: "ord-1",
            merchantId: "merchant_1",
          },
        ];
      },
      async acknowledge(_token, ids) {
        acknowledged.push(...ids);
      },
      async getOrder() {
        return { id: "ord-1", displayId: "100" };
      },
    };

    const result = await runIfoodPollCycle({
      prisma: prisma as never,
      api,
      connection: connection(),
      lockedBy: "test",
    });

    assert.equal(result.persistedNew, 1);
    assert.deepEqual(acknowledged, ["evt-ok"]);
  });

  it("rejects merchant mismatch without persist or ACK", async () => {
    const prisma = createFakePrisma();
    const acknowledged: string[] = [];
    const api: IfoodApiClient = {
      async authenticate() {
        return { accessToken: "t", expiresIn: 100 };
      },
      async pollEvents() {
        return [
          {
            id: "evt-x",
            fullCode: "PLACED",
            orderId: "ord-1",
            merchantId: "other-merchant",
          },
        ];
      },
      async acknowledge(_token, ids) {
        acknowledged.push(...ids);
      },
      async getOrder() {
        return {};
      },
    };

    const result = await runIfoodPollCycle({
      prisma: prisma as never,
      api,
      connection: connection(),
      lockedBy: "test",
    });

    assert.equal(result.rejectedMerchantMismatch, 1);
    assert.equal(result.persistedNew, 0);
    assert.deepEqual(acknowledged, []);
    assert.equal(prisma._events.size, 0);
  });

  it("keeps unknown codes PENDING and advances lifecycle by event time", async () => {
    const prisma = createFakePrisma();
    const api: IfoodApiClient = {
      async authenticate() {
        return { accessToken: "t", expiresIn: 100 };
      },
      async pollEvents() {
        return [
          {
            id: "evt-cancel",
            fullCode: "CANCELLED",
            orderId: "ord-1",
            merchantId: "merchant_1",
            createdAt: "2026-07-22T12:05:00.000Z",
          },
          {
            id: "evt-placed-late",
            fullCode: "PLACED",
            orderId: "ord-1",
            merchantId: "merchant_1",
            // Older than CANCELLED — must not overwrite lastEventFullCode
            createdAt: "2026-07-22T12:00:00.000Z",
          },
          {
            id: "evt-unknown",
            fullCode: "SOMETHING_NEW",
            orderId: "ord-1",
            merchantId: "merchant_1",
            createdAt: "2026-07-22T12:06:00.000Z",
          },
        ];
      },
      async acknowledge() {},
      async getOrder() {
        return { id: "ord-1", displayId: "7401" };
      },
    };

    const result = await runIfoodPollCycle({
      prisma: prisma as never,
      api,
      connection: connection(),
      lockedBy: "test",
    });

    assert.equal(result.leftPendingUnknown, 1);
    assert.equal(result.processed, 2);
    assert.equal(prisma._events.get("evt-unknown")?.processingStatus, "PENDING");
    assert.equal(prisma._orders.get("ord-1")?.lastEventFullCode, "CANCELLED");
  });

  it("skips work when lock is held", async () => {
    const prisma = createFakePrisma({ lockAcquired: false });
    let polled = false;
    const api: IfoodApiClient = {
      async authenticate() {
        throw new Error("should not auth");
      },
      async pollEvents() {
        polled = true;
        return [];
      },
      async acknowledge() {},
      async getOrder() {
        return {};
      },
    };

    const result = await runIfoodPollCycle({
      prisma: prisma as never,
      api,
      connection: connection(),
      lockedBy: "test",
    });

    assert.equal(result.locked, false);
    assert.equal(polled, false);
  });

  it("skips inactive connections without polling", async () => {
    const prisma = createFakePrisma();
    let polled = false;
    const api: IfoodApiClient = {
      async authenticate() {
        throw new Error("should not auth");
      },
      async pollEvents() {
        polled = true;
        return [];
      },
      async acknowledge() {},
      async getOrder() {
        return {};
      },
    };

    const result = await runIfoodPollCycle({
      prisma: prisma as never,
      api,
      connection: { ...connection(), isActive: false },
      lockedBy: "test",
    });

    assert.equal(result.skippedInactive, true);
    assert.equal(result.locked, false);
    assert.equal(polled, false);
    assert.equal(prisma._updateManyCalls(), 0);
  });

  it("keeps durable event and ACKs when getOrder fails", async () => {
    const prisma = createFakePrisma();
    const acknowledged: string[] = [];
    const api: IfoodApiClient = {
      async authenticate() {
        return { accessToken: "t", expiresIn: 100 };
      },
      async pollEvents() {
        return [
          {
            id: "evt-detail-fail",
            fullCode: "PLACED",
            orderId: "ord-1",
            merchantId: "merchant_1",
            createdAt: "2026-07-22T12:00:00.000Z",
          },
        ];
      },
      async acknowledge(_token, ids) {
        acknowledged.push(...ids);
      },
      async getOrder() {
        throw new Error("getOrder 500");
      },
    };

    const result = await runIfoodPollCycle({
      prisma: prisma as never,
      api,
      connection: connection(),
      lockedBy: "test",
    });

    assert.equal(result.persistedNew, 1);
    assert.equal(result.failedProcessing, 1);
    assert.equal(result.acknowledged, 1);
    assert.deepEqual(acknowledged, ["evt-detail-fail"]);
    assert.equal(
      prisma._events.get("evt-detail-fail")?.processingStatus,
      "FAILED",
    );
  });

  it("releases lock when authenticate throws", async () => {
    const prisma = createFakePrisma();
    const api: IfoodApiClient = {
      async authenticate() {
        throw new Error("auth down");
      },
      async pollEvents() {
        return [];
      },
      async acknowledge() {},
      async getOrder() {
        return {};
      },
    };

    await assert.rejects(
      () =>
        runIfoodPollCycle({
          prisma: prisma as never,
          api,
          connection: connection(),
          lockedBy: "test",
        }),
      /auth down/,
    );
    // acquire + release
    assert.equal(prisma._updateManyCalls(), 2);
  });
});
