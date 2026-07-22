import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IfoodApiClient } from "@/features/ifood/ifood-api.client";
import { IfoodApiError } from "@/features/ifood/ifood-api.client";
import {
  catchUpIfoodCommandFromInbox,
  correlateIfoodCommandFromEvent,
  executeIfoodOrderCommand,
} from "@/features/ifood/ifood-order-command.service";

type FakeEvent = {
  externalEventId: string;
  fullCode: string;
  payload: { createdAt?: string };
  receivedAt: Date;
  externalOrderId: string;
  connectionId: string;
  processingStatus?: string;
};

function fakePrisma(options?: {
  eventCodes?: string[];
  inboxEvents?: FakeEvent[];
}) {
  const eventCodes = options?.eventCodes ?? ["PLACED"];
  const inboxEvents: FakeEvent[] = options?.inboxEvents ?? [];
  const commands = new Map<string, Record<string, unknown>>();
  const attempts = new Map<string, Record<string, unknown>>();
  let commandSeq = 0;
  let attemptSeq = 0;
  const commandKey = (orderId: string, type: string) => `${orderId}:${type}`;

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

  const prisma = {
    ifoodOrder: {
      async findUnique(args: Record<string, unknown>) {
        if ((args as { select?: unknown }).select) return { snapshot: order.snapshot };
        return order;
      },
    },
    ifoodEvent: {
      async findMany(args?: {
        where?: {
          processingStatus?: string;
          fullCode?: { in: string[] };
          externalOrderId?: string;
          connectionId?: string;
        };
        select?: Record<string, boolean>;
      }) {
        if (args?.where?.fullCode?.in) {
          return inboxEvents.filter((event) => {
            if (
              args.where?.externalOrderId &&
              event.externalOrderId !== args.where.externalOrderId
            ) {
              return false;
            }
            if (
              args.where?.connectionId &&
              event.connectionId !== args.where.connectionId
            ) {
              return false;
            }
            return args.where!.fullCode!.in.includes(event.fullCode);
          });
        }
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
          createdAt: args.data.createdAt ?? new Date(),
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
            connectionId?: string;
            createdAt?: Date | { lte: Date };
            order?: { externalOrderId: string };
          };
          if (where.id && row.id !== where.id) continue;
          if (where.type && row.type !== where.type) continue;
          if (where.connectionId && row.connectionId !== where.connectionId) continue;
          if (typeof where.status === "string" && row.status !== where.status) continue;
          if (
            typeof where.status === "object" &&
            !where.status.in.includes(String(row.status))
          ) {
            continue;
          }
          if (
            where.createdAt &&
            typeof where.createdAt === "object" &&
            "lte" in where.createdAt
          ) {
            const createdAt = row.createdAt as Date;
            if (createdAt.getTime() > where.createdAt.lte.getTime()) continue;
          }
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
    _inboxEvents: inboxEvents,
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
    const prisma = fakePrisma({ eventCodes: ["PLACED", "CANCELLED"] });
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
    const commandAt = new Date("2026-07-22T19:00:00.000Z");
    const prisma = fakePrisma();
    await executeIfoodOrderCommand({
      prisma: prisma as never,
      api: api(async () => ({ status: 202 })),
      connectionId: "conn-1",
      externalOrderId: "external-1",
      command: "CONFIRM",
      now: commandAt,
    });

    const count = await correlateIfoodCommandFromEvent({
      prisma: prisma as never,
      connectionId: "conn-1",
      externalOrderId: "external-1",
      externalEventId: "evt-confirmed",
      fullCode: "CONFIRMED",
      eventAt: new Date("2026-07-22T19:00:05.000Z"),
      receivedAt: new Date("2026-07-22T19:00:06.000Z"),
    });

    const command = [...prisma._commands.values()][0];
    assert.equal(count, 1);
    assert.equal(command?.status, "CONFIRMED");
    assert.equal(command?.confirmedByExternalEventId, "evt-confirmed");
  });
});

describe("catch-up correlation (#124)", () => {
  it("confirms when confirming event is already in the inbox before ACCEPTED returns", async () => {
    const commandAt = new Date("2026-07-22T19:07:47.000Z");
    const prisma = fakePrisma({
      eventCodes: ["PLACED"],
      inboxEvents: [
        {
          externalEventId: "evt-confirmed",
          fullCode: "CONFIRMED",
          // External clock skew: iFood createdAt before local command.createdAt
          payload: { createdAt: "2026-07-22T19:07:46.500Z" },
          receivedAt: new Date("2026-07-22T19:07:50.000Z"),
          externalOrderId: "external-1",
          connectionId: "conn-1",
        },
      ],
    });

    const result = await executeIfoodOrderCommand({
      prisma: prisma as never,
      api: api(async () => ({ status: 202 })),
      connectionId: "conn-1",
      externalOrderId: "external-1",
      command: "CONFIRM",
      now: commandAt,
    });

    assert.equal(result.status, "CONFIRMED");
    assert.equal(result.httpStatus, 202);
    assert.equal(result.replay, false);
    assert.equal(prisma._attempts.size, 1);
    const command = [...prisma._commands.values()][0];
    assert.equal(
      (command?.confirmedAt as Date).toISOString(),
      "2026-07-22T19:07:46.500Z",
    );
  });

  it("leaves ACCEPTED when no confirming event exists yet (poller path)", async () => {
    const result = await executeIfoodOrderCommand({
      prisma: fakePrisma({ inboxEvents: [] }) as never,
      api: api(async () => ({ status: 202 })),
      connectionId: "conn-1",
      externalOrderId: "external-1",
      command: "CONFIRM",
      now: new Date("2026-07-22T19:00:00.000Z"),
    });
    assert.equal(result.status, "ACCEPTED");
  });

  it("repeated catch-up does not alter CONFIRMED or add attempts", async () => {
    const commandAt = new Date("2026-07-22T19:00:00.000Z");
    const prisma = fakePrisma({
      inboxEvents: [
        {
          externalEventId: "evt-confirmed",
          fullCode: "CONFIRMED",
          payload: { createdAt: "2026-07-22T19:00:01.000Z" },
          receivedAt: new Date("2026-07-22T19:00:02.000Z"),
          externalOrderId: "external-1",
          connectionId: "conn-1",
        },
      ],
    });
    const client = api(async () => ({ status: 202 }));

    const first = await executeIfoodOrderCommand({
      prisma: prisma as never,
      api: client,
      connectionId: "conn-1",
      externalOrderId: "external-1",
      command: "CONFIRM",
      now: commandAt,
    });
    assert.equal(first.status, "CONFIRMED");

    const command = [...prisma._commands.values()][0] as {
      id: string;
      status: string;
      confirmedByExternalEventId: string;
      createdAt: Date;
      connectionId: string;
      type: string;
    };
    const again = await catchUpIfoodCommandFromInbox({
      prisma: prisma as never,
      command: command as never,
      externalOrderId: "external-1",
    });
    assert.equal(again.status, "CONFIRMED");
    assert.equal(again.confirmedByExternalEventId, "evt-confirmed");
    assert.equal(prisma._attempts.size, 1);
  });

  it("replay after ACCEPTED heals via catch-up without a new API call", async () => {
    let calls = 0;
    const commandAt = new Date("2026-07-22T19:00:00.000Z");
    const prisma = fakePrisma({ inboxEvents: [] });
    const client = api(async () => {
      calls += 1;
      return { status: 202 };
    });

    const accepted = await executeIfoodOrderCommand({
      prisma: prisma as never,
      api: client,
      connectionId: "conn-1",
      externalOrderId: "external-1",
      command: "CONFIRM",
      now: commandAt,
    });
    assert.equal(accepted.status, "ACCEPTED");

    prisma._inboxEvents.push({
      externalEventId: "evt-late",
      fullCode: "CONFIRMED",
      payload: { createdAt: "2026-07-22T19:00:10.000Z" },
      receivedAt: new Date("2026-07-22T19:00:11.000Z"),
      externalOrderId: "external-1",
      connectionId: "conn-1",
    });

    const replay = await executeIfoodOrderCommand({
      prisma: prisma as never,
      api: client,
      connectionId: "conn-1",
      externalOrderId: "external-1",
      command: "CONFIRM",
    });

    assert.equal(replay.replay, true);
    assert.equal(replay.status, "CONFIRMED");
    assert.equal(calls, 1);
    assert.equal(prisma._attempts.size, 1);
  });

  it("does not correlate an event from another order", async () => {
    const commandAt = new Date("2026-07-22T19:00:00.000Z");
    const prisma = fakePrisma({
      inboxEvents: [
        {
          externalEventId: "evt-other",
          fullCode: "CONFIRMED",
          payload: { createdAt: "2026-07-22T19:00:01.000Z" },
          receivedAt: new Date("2026-07-22T19:00:02.000Z"),
          externalOrderId: "other-order",
          connectionId: "conn-1",
        },
      ],
    });

    const result = await executeIfoodOrderCommand({
      prisma: prisma as never,
      api: api(async () => ({ status: 202 })),
      connectionId: "conn-1",
      externalOrderId: "external-1",
      command: "CONFIRM",
      now: commandAt,
    });
    assert.equal(result.status, "ACCEPTED");
  });

  it("rejects a confirming event received before the command was reserved", async () => {
    const commandAt = new Date("2026-07-22T19:00:00.000Z");
    const prisma = fakePrisma({
      inboxEvents: [
        {
          externalEventId: "evt-stale",
          fullCode: "CONFIRMED",
          // Fresh external timestamp must not bypass a stale local receivedAt.
          payload: { createdAt: "2026-07-22T19:00:30.000Z" },
          receivedAt: new Date("2026-07-22T18:59:01.000Z"),
          externalOrderId: "external-1",
          connectionId: "conn-1",
        },
      ],
    });

    const result = await executeIfoodOrderCommand({
      prisma: prisma as never,
      api: api(async () => ({ status: 202 })),
      connectionId: "conn-1",
      externalOrderId: "external-1",
      command: "CONFIRM",
      now: commandAt,
    });
    assert.equal(result.status, "ACCEPTED");

    const count = await correlateIfoodCommandFromEvent({
      prisma: prisma as never,
      connectionId: "conn-1",
      externalOrderId: "external-1",
      externalEventId: "evt-stale",
      fullCode: "CONFIRMED",
      eventAt: new Date("2026-07-22T19:00:30.000Z"),
      receivedAt: new Date("2026-07-22T18:59:01.000Z"),
    });
    assert.equal(count, 0);
  });
});
