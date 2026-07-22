import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IfoodApiClient } from "@/features/ifood/ifood-api.client";
import { IfoodApiError } from "@/features/ifood/ifood-api.client";
import {
  correlateIfoodCommandFromEvent,
  executeIfoodOrderCommand,
} from "@/features/ifood/ifood-order-command.service";

function fakePrisma(eventCodes: string[] = ["PLACED"]) {
  const commands = new Map<string, Record<string, unknown>>();
  const attempts = new Map<string, Record<string, unknown>>();
  let commandSeq = 0;
  let attemptSeq = 0;
  const commandKey = (orderId: string, type: string) => `${orderId}:${type}`;

  const prisma = {
    ifoodOrder: {
      async findUnique(args: Record<string, unknown>) {
        if ((args as { select?: unknown }).select) return { snapshot: order.snapshot };
        return order;
      },
    },
    ifoodEvent: {
      async findMany() {
        return eventCodes.map((fullCode) => ({ fullCode }));
      },
    },
    ifoodOrderCommand: {
      async findUnique(args: {
        where: {
          id?: string;
          ifoodOrderId_type?: { ifoodOrderId: string; type: string };
        };
      }) {
        if (args.where.id) {
          return [...commands.values()].find((row) => row.id === args.where.id) ?? null;
        }
        const key = args.where.ifoodOrderId_type;
        return key ? commands.get(commandKey(key.ifoodOrderId, key.type)) ?? null : null;
      },
      async findUniqueOrThrow(args: { where: Record<string, unknown> }) {
        const row = await this.findUnique(args as never);
        if (!row) throw new Error("missing command");
        return row;
      },
      async create(args: { data: Record<string, unknown> }) {
        const key = commandKey(String(args.data.ifoodOrderId), String(args.data.type));
        if (commands.has(key)) {
          const error = new Error("unique") as Error & { code: string };
          error.code = "P2002";
          throw error;
        }
        const row = {
          id: `cmd-${++commandSeq}`,
          acceptedAt: null,
          confirmedAt: null,
          confirmedByExternalEventId: null,
          lastError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.data,
        };
        commands.set(key, row);
        return row;
      },
      async updateMany(args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) {
        let count = 0;
        for (const row of commands.values()) {
          const where = args.where as {
            id?: string;
            status?: string | { in: string[] };
            type?: string;
          };
          if (where.id && row.id !== where.id) continue;
          if (where.type && row.type !== where.type) continue;
          if (typeof where.status === "string" && row.status !== where.status) continue;
          if (
            typeof where.status === "object" &&
            !where.status.in.includes(String(row.status))
          ) continue;
          Object.assign(row, args.data);
          count += 1;
        }
        return { count };
      },
    },
    ifoodOrderCommandAttempt: {
      async create(args: { data: Record<string, unknown> }) {
        const row = { id: `attempt-${++attemptSeq}`, ...args.data };
        attempts.set(String(row.id), row);
        return row;
      },
      async update(args: { where: { id: string }; data: Record<string, unknown> }) {
        const row = attempts.get(args.where.id);
        if (!row) throw new Error("missing attempt");
        Object.assign(row, args.data);
        return row;
      },
    },
    async $transaction(values: Array<Promise<unknown>>) {
      return Promise.all(values);
    },
    _commands: commands,
    _attempts: attempts,
  };

  const order = {
    id: "ifood-order-1",
    connectionId: "conn-1",
    storeId: "store-1",
    externalOrderId: "external-1",
    snapshot: {
      orderType: "DELIVERY",
      delivery: { deliveredBy: "IFOOD" },
    },
    connection: { id: "conn-1", isActive: true },
  };

  return prisma;
}

function api(execute: NonNullable<IfoodApiClient["executeOrderAction"]>): IfoodApiClient {
  return {
    async authenticate() {
      return { accessToken: "secret-not-logged", expiresIn: 21_600 };
    },
    async pollEvents() {
      return [];
    },
    async acknowledge() {},
    async getOrder() {
      return {};
    },
    executeOrderAction: execute,
  };
}

describe("executeIfoodOrderCommand", () => {
  it("records 202 as ACCEPTED and replay does not call the API twice", async () => {
    const prisma = fakePrisma();
    let calls = 0;
    const client = api(async () => {
      calls += 1;
      return { status: 202 };
    });

    const first = await executeIfoodOrderCommand({
      prisma: prisma as never,
      api: client,
      connectionId: "conn-1",
      externalOrderId: "external-1",
      command: "CONFIRM",
    });
    const replay = await executeIfoodOrderCommand({
      prisma: prisma as never,
      api: client,
      connectionId: "conn-1",
      externalOrderId: "external-1",
      command: "CONFIRM",
    });

    assert.equal(first.status, "ACCEPTED");
    assert.equal(first.httpStatus, 202);
    assert.equal(replay.replay, true);
    assert.equal(calls, 1);
    assert.equal(prisma._commands.size, 1);
    assert.equal(prisma._attempts.size, 1);
  });

  it("retries a FAILED logical command without creating a second command", async () => {
    const prisma = fakePrisma();
    let calls = 0;
    const client = api(async () => {
      calls += 1;
      if (calls === 1) throw new IfoodApiError("iFood action failed (503)", 503);
      return { status: 202 };
    });
    const input = {
      prisma: prisma as never,
      api: client,
      connectionId: "conn-1",
      externalOrderId: "external-1",
      command: "CONFIRM" as const,
    };

    await assert.rejects(() => executeIfoodOrderCommand(input), /503/);
    const retried = await executeIfoodOrderCommand(input);

    assert.equal(retried.status, "ACCEPTED");
    assert.equal(prisma._commands.size, 1);
    assert.equal(prisma._attempts.size, 2);
  });

  it("blocks actions after CANCELLED before creating audit rows", async () => {
    const prisma = fakePrisma(["PLACED", "CANCELLED"]);
    await assert.rejects(
      () =>
        executeIfoodOrderCommand({
          prisma: prisma as never,
          api: api(async () => ({ status: 202 })),
          connectionId: "conn-1",
          externalOrderId: "external-1",
          command: "CONFIRM",
        }),
      /cancelled/,
    );
    assert.equal(prisma._commands.size, 0);
  });

  it("correlates a later event and confirms the accepted command", async () => {
    const prisma = fakePrisma();
    await executeIfoodOrderCommand({
      prisma: prisma as never,
      api: api(async () => ({ status: 202 })),
      connectionId: "conn-1",
      externalOrderId: "external-1",
      command: "CONFIRM",
    });

    const count = await correlateIfoodCommandFromEvent({
      prisma: prisma as never,
      connectionId: "conn-1",
      externalOrderId: "external-1",
      externalEventId: "evt-confirmed",
      fullCode: "CONFIRMED",
      eventAt: new Date("2026-07-22T20:00:00Z"),
    });

    const command = [...prisma._commands.values()][0];
    assert.equal(count, 1);
    assert.equal(command?.status, "CONFIRMED");
    assert.equal(command?.confirmedByExternalEventId, "evt-confirmed");
  });
});
