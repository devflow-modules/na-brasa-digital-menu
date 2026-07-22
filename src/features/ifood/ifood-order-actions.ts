import type { IfoodOrderCommandType } from "@prisma/client";

const CANCELLED_CODES = new Set(["CANCELLED", "ORDER_CANCELLED"]);
const PREPARATION_STARTED_CODES = new Set([
  "START_PREPARATION",
  "PREPARATION_STARTED",
]);

export class IfoodOrderActionBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IfoodOrderActionBlockedError";
  }
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function resolveIfoodTerminalCommand(
  snapshot: unknown,
): Extract<IfoodOrderCommandType, "READY_TO_PICKUP" | "DISPATCH"> {
  const root = objectValue(snapshot);
  const orderType = typeof root?.orderType === "string" ? root.orderType : null;

  if (orderType === "TAKEOUT" || orderType === "DINE_IN") {
    return "READY_TO_PICKUP";
  }

  if (orderType === "DELIVERY") {
    return "DISPATCH";
  }

  throw new IfoodOrderActionBlockedError(
    "Unsupported or missing iFood orderType for terminal action",
  );
}

export function assertIfoodCommandAllowed(input: {
  command: IfoodOrderCommandType;
  eventFullCodes: Array<string | null>;
  snapshot: unknown;
}): void {
  const codes = new Set(input.eventFullCodes.filter((code): code is string => !!code));
  const snapshot = objectValue(input.snapshot);
  const orderTiming =
    typeof snapshot?.orderTiming === "string" ? snapshot.orderTiming : null;

  if ([...codes].some((code) => CANCELLED_CODES.has(code))) {
    throw new IfoodOrderActionBlockedError(
      "iFood order is cancelled; no further actions are allowed",
    );
  }

  if (input.command === "CONFIRM") {
    if (!codes.has("PLACED") || codes.has("CONFIRMED")) {
      throw new IfoodOrderActionBlockedError(
        "confirm requires PLACED and no CONFIRMED event",
      );
    }
    return;
  }

  if (input.command === "START_PREPARATION") {
    if (orderTiming === "SCHEDULED") {
      throw new IfoodOrderActionBlockedError(
        "Scheduled preparation timing is outside this test slice",
      );
    }
    if (!codes.has("CONFIRMED") || [...codes].some((code) => PREPARATION_STARTED_CODES.has(code))) {
      throw new IfoodOrderActionBlockedError(
        "startPreparation requires CONFIRMED and no preparation-started event",
      );
    }
    return;
  }

  if (![...codes].some((code) => PREPARATION_STARTED_CODES.has(code))) {
    throw new IfoodOrderActionBlockedError(
      "terminal action requires a preparation-started event",
    );
  }

  if (orderTiming === "SCHEDULED") {
    throw new IfoodOrderActionBlockedError(
      "Scheduled terminal timing is outside this test slice",
    );
  }

  if (codes.has("READY_TO_PICKUP") || codes.has("DISPATCHED")) {
    throw new IfoodOrderActionBlockedError(
      "terminal action was already confirmed by an event",
    );
  }

  const expected = resolveIfoodTerminalCommand(input.snapshot);
  if (input.command !== expected) {
    throw new IfoodOrderActionBlockedError(
      `terminal action must be ${expected} for this order`,
    );
  }
}

export function ifoodApiActionForCommand(
  command: IfoodOrderCommandType,
): "confirm" | "startPreparation" | "readyToPickup" | "dispatch" {
  switch (command) {
    case "CONFIRM":
      return "confirm";
    case "START_PREPARATION":
      return "startPreparation";
    case "READY_TO_PICKUP":
      return "readyToPickup";
    case "DISPATCH":
      return "dispatch";
  }
}

export function commandConfirmedByFullCode(
  fullCode: string | null,
): IfoodOrderCommandType | null {
  if (fullCode === "CONFIRMED") return "CONFIRM";
  if (fullCode === "START_PREPARATION" || fullCode === "PREPARATION_STARTED") {
    return "START_PREPARATION";
  }
  if (fullCode === "READY_TO_PICKUP") return "READY_TO_PICKUP";
  if (fullCode === "DISPATCHED") return "DISPATCH";
  return null;
}

/** Inbox fullCodes that confirm a logical command (#124). */
export function confirmingFullCodesForCommand(
  command: IfoodOrderCommandType,
): string[] {
  switch (command) {
    case "CONFIRM":
      return ["CONFIRMED"];
    case "START_PREPARATION":
      return ["START_PREPARATION", "PREPARATION_STARTED"];
    case "READY_TO_PICKUP":
      return ["READY_TO_PICKUP"];
    case "DISPATCH":
      return ["DISPATCHED"];
  }
}

/** iFood event createdAt from raw payload; null when absent/invalid. */
export function ifoodEventCreatedAtFromPayload(payload: unknown): Date | null {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const createdAt = (payload as { createdAt?: unknown }).createdAt;
  if (typeof createdAt !== "string") {
    return null;
  }
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
}
