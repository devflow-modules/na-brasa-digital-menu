import { randomUUID } from "node:crypto";
import type {
  IfoodOrderCommand,
  IfoodOrderCommandType,
  PrismaClient,
} from "@prisma/client";
import {
  IfoodApiError,
  type IfoodApiClient,
} from "@/features/ifood/ifood-api.client";
import {
  assertIfoodCommandAllowed,
  commandConfirmedByFullCode,
  confirmingFullCodesForCommand,
  ifoodApiActionForCommand,
  ifoodEventCreatedAtFromPayload,
  resolveIfoodTerminalCommand,
} from "@/features/ifood/ifood-order-actions";

export type ExecuteIfoodOrderCommandResult = {
  commandId: string;
  command: IfoodOrderCommandType;
  status: IfoodOrderCommand["status"];
  replay: boolean;
  httpStatus: number | null;
};

function isUniqueViolation(error: unknown): boolean {
  return (
    error != null &&
    typeof error === "object" &&
    "code" in error &&
    String((error as { code?: unknown }).code) === "P2002"
  );
}

function sanitizedError(error: unknown): string {
  if (error instanceof IfoodApiError) {
    return error.message.slice(0, 300);
  }
  return "iFood order action failed";
}

async function reserveLogicalCommand(input: {
  prisma: PrismaClient;
  order: {
    id: string;
    connectionId: string;
    storeId: string;
    externalOrderId: string;
  };
  command: IfoodOrderCommandType;
  now: Date;
}): Promise<{ command: IfoodOrderCommand; replay: boolean }> {
  const key = {
    ifoodOrderId_type: {
      ifoodOrderId: input.order.id,
      type: input.command,
    },
  } as const;
  const existing = await input.prisma.ifoodOrderCommand.findUnique({ where: key });

  if (existing && existing.status !== "FAILED") {
    return { command: existing, replay: true };
  }

  if (existing) {
    const claimed = await input.prisma.ifoodOrderCommand.updateMany({
      where: { id: existing.id, status: "FAILED" },
      data: { status: "PENDING", lastError: null },
    });
    if (claimed.count === 1) {
      return {
        command: { ...existing, status: "PENDING", lastError: null },
        replay: false,
      };
    }
    const raced = await input.prisma.ifoodOrderCommand.findUniqueOrThrow({
      where: { id: existing.id },
    });
    return { command: raced, replay: true };
  }

  try {
    const created = await input.prisma.ifoodOrderCommand.create({
      data: {
        connectionId: input.order.connectionId,
        storeId: input.order.storeId,
        ifoodOrderId: input.order.id,
        type: input.command,
        status: "PENDING",
        // Explicit createdAt so event.createdAt >= command.createdAt is meaningful (#124).
        createdAt: input.now,
        correlationKey: `ifood-command:${input.order.externalOrderId}:${input.command}:${randomUUID()}`,
      },
    });
    return { command: created, replay: false };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const raced = await input.prisma.ifoodOrderCommand.findUniqueOrThrow({ where: key });
    return { command: raced, replay: true };
  }
}

/**
 * After ACCEPTED (or while still PENDING), confirm from an inbox event already
 * persisted for the same order/command. Never calls the Merchant API.
 */
export async function catchUpIfoodCommandFromInbox(input: {
  prisma: PrismaClient;
  command: IfoodOrderCommand;
  externalOrderId: string;
}): Promise<IfoodOrderCommand> {
  if (
    input.command.status !== "PENDING" &&
    input.command.status !== "ACCEPTED"
  ) {
    return input.command;
  }

  const codes = confirmingFullCodesForCommand(input.command.type);
  const events = await input.prisma.ifoodEvent.findMany({
    where: {
      connectionId: input.command.connectionId,
      externalOrderId: input.externalOrderId,
      fullCode: { in: codes },
    },
    select: {
      externalEventId: true,
      fullCode: true,
      payload: true,
      receivedAt: true,
    },
    orderBy: { receivedAt: "asc" },
  });

  for (const event of events) {
    const eventAt =
      ifoodEventCreatedAtFromPayload(event.payload) ?? event.receivedAt;
    // Reject confirming events from a prior cycle (before this logical command).
    if (eventAt.getTime() < input.command.createdAt.getTime()) {
      continue;
    }

    await correlateIfoodCommandFromEvent({
      prisma: input.prisma,
      connectionId: input.command.connectionId,
      externalOrderId: input.externalOrderId,
      externalEventId: event.externalEventId,
      fullCode: event.fullCode,
      eventAt,
      commandId: input.command.id,
    });
    break;
  }

  return input.prisma.ifoodOrderCommand.findUniqueOrThrow({
    where: { id: input.command.id },
  });
}

export async function executeIfoodOrderCommand(input: {
  prisma: PrismaClient;
  api: IfoodApiClient;
  connectionId: string;
  externalOrderId: string;
  command: IfoodOrderCommandType;
  now?: Date;
}): Promise<ExecuteIfoodOrderCommandResult> {
  const now = input.now ?? new Date();
  const order = await input.prisma.ifoodOrder.findUnique({
    where: {
      connectionId_externalOrderId: {
        connectionId: input.connectionId,
        externalOrderId: input.externalOrderId,
      },
    },
    include: { connection: true },
  });
  if (!order || !order.connection.isActive) {
    throw new Error("Active iFood test order connection not found");
  }

  const existingCommand = await input.prisma.ifoodOrderCommand.findUnique({
    where: {
      ifoodOrderId_type: { ifoodOrderId: order.id, type: input.command },
    },
  });
  if (existingCommand && existingCommand.status !== "FAILED") {
    // Heal ACCEPTED stuck behind a race without a new API attempt (#124).
    const healed =
      existingCommand.status === "ACCEPTED" || existingCommand.status === "PENDING"
        ? await catchUpIfoodCommandFromInbox({
            prisma: input.prisma,
            command: existingCommand,
            externalOrderId: order.externalOrderId,
          })
        : existingCommand;
    return {
      commandId: healed.id,
      command: healed.type,
      status: healed.status,
      replay: true,
      httpStatus: null,
    };
  }

  const events = await input.prisma.ifoodEvent.findMany({
    where: {
      connectionId: order.connectionId,
      externalOrderId: order.externalOrderId,
      processingStatus: "PROCESSED",
    },
    select: { fullCode: true },
  });

  assertIfoodCommandAllowed({
    command: input.command,
    eventFullCodes: events.map((event) => event.fullCode),
    snapshot: order.snapshot,
  });

  const reserved = await reserveLogicalCommand({
    prisma: input.prisma,
    order,
    command: input.command,
    now,
  });
  if (reserved.replay) {
    const healed =
      reserved.command.status === "ACCEPTED" ||
      reserved.command.status === "PENDING"
        ? await catchUpIfoodCommandFromInbox({
            prisma: input.prisma,
            command: reserved.command,
            externalOrderId: order.externalOrderId,
          })
        : reserved.command;
    return {
      commandId: healed.id,
      command: input.command,
      status: healed.status,
      replay: true,
      httpStatus: null,
    };
  }

  const attempt = await input.prisma.ifoodOrderCommandAttempt.create({
    data: { commandId: reserved.command.id, status: "STARTED", startedAt: now },
  });

  try {
    if (!input.api.executeOrderAction) {
      throw new Error("iFood API client does not support order actions");
    }
    const auth = await input.api.authenticate();
    const response = await input.api.executeOrderAction(
      auth.accessToken,
      order.externalOrderId,
      ifoodApiActionForCommand(input.command),
    );

    await input.prisma.$transaction([
      input.prisma.ifoodOrderCommandAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "ACCEPTED",
          httpStatus: response.status,
          finishedAt: now,
        },
      }),
      // Do not overwrite CONFIRMED if the matching event won the race.
      input.prisma.ifoodOrderCommand.updateMany({
        where: { id: reserved.command.id, status: "PENDING" },
        data: { status: "ACCEPTED", acceptedAt: now, lastError: null },
      }),
    ]);

    const accepted = await input.prisma.ifoodOrderCommand.findUniqueOrThrow({
      where: { id: reserved.command.id },
    });
    // Catch-up: confirming event may already be in the inbox (event → ACCEPTED race).
    const saved = await catchUpIfoodCommandFromInbox({
      prisma: input.prisma,
      command: accepted,
      externalOrderId: order.externalOrderId,
    });

    return {
      commandId: saved.id,
      command: saved.type,
      status: saved.status,
      replay: false,
      httpStatus: response.status,
    };
  } catch (error) {
    const errorText = sanitizedError(error);
    const httpStatus = error instanceof IfoodApiError ? error.status : null;
    await input.prisma.$transaction([
      input.prisma.ifoodOrderCommandAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "FAILED",
          httpStatus,
          sanitizedError: errorText,
          finishedAt: now,
        },
      }),
      input.prisma.ifoodOrderCommand.updateMany({
        where: { id: reserved.command.id, status: "PENDING" },
        data: { status: "FAILED", lastError: errorText },
      }),
    ]);
    throw error;
  }
}

export async function resolveIfoodTerminalCommandForOrder(input: {
  prisma: PrismaClient;
  connectionId: string;
  externalOrderId: string;
}): Promise<Extract<IfoodOrderCommandType, "READY_TO_PICKUP" | "DISPATCH">> {
  const order = await input.prisma.ifoodOrder.findUnique({
    where: {
      connectionId_externalOrderId: {
        connectionId: input.connectionId,
        externalOrderId: input.externalOrderId,
      },
    },
    select: { snapshot: true },
  });
  if (!order) throw new Error("iFood order snapshot not found");
  return resolveIfoodTerminalCommand(order.snapshot);
}

export async function correlateIfoodCommandFromEvent(input: {
  prisma: PrismaClient;
  connectionId: string;
  externalOrderId: string;
  externalEventId: string;
  fullCode: string | null;
  eventAt: Date;
  /** Optional: restrict to one logical command row (catch-up). */
  commandId?: string;
}): Promise<number> {
  const type = commandConfirmedByFullCode(input.fullCode);
  if (!type) return 0;

  const result = await input.prisma.ifoodOrderCommand.updateMany({
    where: {
      ...(input.commandId ? { id: input.commandId } : {}),
      connectionId: input.connectionId,
      type,
      status: { in: ["PENDING", "ACCEPTED"] },
      // event.createdAt >= command.createdAt
      createdAt: { lte: input.eventAt },
      order: { externalOrderId: input.externalOrderId },
    },
    data: {
      status: "CONFIRMED",
      confirmedAt: input.eventAt,
      confirmedByExternalEventId: input.externalEventId,
      lastError: null,
    },
  });
  return result.count;
}
