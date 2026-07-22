import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import type { OrderStatus } from "@prisma/client";
import { syncIfoodOperationalProjection } from "@/features/ifood/ifood-order-projection.service";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures/ifood-order-snapshot.sanitized.json",
);

type FakeOrder = {
  id: string;
  code: string;
  source: string;
  status: OrderStatus;
  totalCents: number;
  items: Array<{ productId: null; addons: Array<{ addonId: null }> }>;
  payments: unknown[];
};

function createFakePrisma(options: {
  lastEventFullCode: string | null;
  snapshot?: unknown;
  linkedOrder?: FakeOrder | null;
}) {
  const snapshot =
    options.snapshot ?? JSON.parse(readFileSync(fixturePath, "utf8"));
  let ifoodRow = {
    id: "ifood_1",
    storeId: "store_1",
    externalOrderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    lastEventFullCode: options.lastEventFullCode,
    snapshot,
    operationalOrderId: options.linkedOrder?.id ?? null,
    operationalOrder: options.linkedOrder
      ? { id: options.linkedOrder.id, status: options.linkedOrder.status }
      : null,
  };
  const orders = new Map<string, FakeOrder>();
  if (options.linkedOrder) {
    orders.set(options.linkedOrder.id, options.linkedOrder);
    orders.set(options.linkedOrder.code, options.linkedOrder);
  }
  let createCount = 0;

  const prisma: {
    ifoodOrder: {
      findUnique: () => Promise<unknown>;
      update: (args: { data: { operationalOrderId: string } }) => Promise<unknown>;
    };
    order: {
      findUnique: (args: {
        where: { code?: string; id?: string };
      }) => Promise<FakeOrder | null>;
      create: (args: {
        data: {
          code: string;
          status: OrderStatus;
          source: string;
          totalCents: number;
          items: {
            create: Array<{
              productId: null;
              addons: { create: Array<{ addonId: null }> };
            }>;
          };
        };
      }) => Promise<{ id: string; status: OrderStatus }>;
      update: (args: {
        where: { id: string };
        data: { status: OrderStatus };
      }) => Promise<FakeOrder>;
    };
    $transaction: <T>(fn: (tx: never) => Promise<T>) => Promise<T>;
    _createCount: () => number;
    _orders: Map<string, FakeOrder>;
    _ifood: () => typeof ifoodRow;
  } = {
    ifoodOrder: {
      async findUnique() {
        return {
          ...ifoodRow,
          operationalOrder: ifoodRow.operationalOrderId
            ? {
                id: ifoodRow.operationalOrderId,
                status: orders.get(ifoodRow.operationalOrderId!)!.status,
              }
            : null,
        };
      },
      async update(args: { data: { operationalOrderId: string } }) {
        ifoodRow = {
          ...ifoodRow,
          operationalOrderId: args.data.operationalOrderId,
          operationalOrder: {
            id: args.data.operationalOrderId,
            status: orders.get(args.data.operationalOrderId)!.status,
          },
        };
        return ifoodRow;
      },
    },
    order: {
      async findUnique(args: { where: { code?: string; id?: string } }) {
        if (args.where.code) {
          return (
            [...orders.values()].find((o) => o.code === args.where.code) ?? null
          );
        }
        if (args.where.id) {
          return orders.get(args.where.id) ?? null;
        }
        return null;
      },
      async create(args: {
        data: {
          code: string;
          status: OrderStatus;
          source: string;
          totalCents: number;
          items: { create: Array<{ productId: null; addons: { create: Array<{ addonId: null }> } }> };
        };
      }) {
        createCount += 1;
        const id = `order_${createCount}`;
        const order: FakeOrder = {
          id,
          code: args.data.code,
          source: args.data.source,
          status: args.data.status,
          totalCents: args.data.totalCents,
          items: args.data.items.create.map((item) => ({
            productId: item.productId,
            addons: item.addons.create.map((addon) => ({
              addonId: addon.addonId,
            })),
          })),
          payments: [],
        };
        orders.set(id, order);
        return { id, status: order.status };
      },
      async update(args: { where: { id: string }; data: { status: OrderStatus } }) {
        const order = orders.get(args.where.id);
        if (!order) throw new Error("missing");
        order.status = args.data.status;
        return order;
      },
    },
    async $transaction<T>(fn: (tx: never) => Promise<T>) {
      return fn(prisma as never);
    },
    _createCount: () => createCount,
    _orders: orders,
    _ifood: () => ifoodRow,
  };

  return prisma;
}

describe("syncIfoodOperationalProjection", () => {
  it("creates one IFOOD Order from PLACED with snapshot totals and null catalog ids", async () => {
    const prisma = createFakePrisma({ lastEventFullCode: "PLACED" });
    const first = await syncIfoodOperationalProjection({
      prisma: prisma as never,
      connectionId: "conn_1",
      externalOrderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.action, "created");
    assert.equal(prisma._createCount(), 1);

    const order = [...prisma._orders.values()][0]!;
    assert.equal(order.source, "IFOOD");
    assert.equal(order.status, "PENDING");
    assert.equal(order.totalCents, 5300);
    assert.equal(order.items[0]!.productId, null);
    assert.equal(order.items[0]!.addons[0]!.addonId, null);
    assert.equal(order.payments.length, 0);
    assert.equal(prisma._ifood().operationalOrderId, order.id);

    const replay = await syncIfoodOperationalProjection({
      prisma: prisma as never,
      connectionId: "conn_1",
      externalOrderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });
    assert.equal(replay.ok, true);
    if (!replay.ok) return;
    assert.equal(replay.action, "unchanged");
    assert.equal(prisma._createCount(), 1);
  });

  it("advances status without regression and applies CANCELLED", async () => {
    const linked: FakeOrder = {
      id: "order_1",
      code: "IF-AAAAAAAABBBBCCCCDDDDEEEEEEEEEEEE",
      source: "IFOOD",
      status: "CONFIRMED",
      totalCents: 5300,
      items: [],
      payments: [],
    };
    const prisma = createFakePrisma({
      lastEventFullCode: "PREPARATION_STARTED",
      linkedOrder: linked,
    });

    const advanced = await syncIfoodOperationalProjection({
      prisma: prisma as never,
      connectionId: "conn_1",
      externalOrderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });
    assert.equal(advanced.ok, true);
    if (!advanced.ok) return;
    assert.equal(advanced.action, "status_updated");
    assert.equal(linked.status, "PREPARING");

    prisma._ifood().lastEventFullCode = "PLACED";
    const regress = await syncIfoodOperationalProjection({
      prisma: prisma as never,
      connectionId: "conn_1",
      externalOrderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });
    assert.equal(regress.ok, true);
    if (!regress.ok) return;
    assert.equal(regress.action, "unchanged");
    assert.equal(linked.status, "PREPARING");

    prisma._ifood().lastEventFullCode = "CANCELLED";
    const cancelled = await syncIfoodOperationalProjection({
      prisma: prisma as never,
      connectionId: "conn_1",
      externalOrderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });
    assert.equal(cancelled.ok, true);
    if (!cancelled.ok) return;
    assert.equal(cancelled.action, "status_updated");
    assert.equal(linked.status, "CANCELLED");
  });
});
