import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertIfoodCommandAllowed,
  commandConfirmedByFullCode,
  IfoodOrderActionBlockedError,
  resolveIfoodTerminalCommand,
} from "@/features/ifood/ifood-order-actions";

describe("iFood order action state machine", () => {
  it("allows the canonical sequence only after matching events", () => {
    assert.doesNotThrow(() =>
      assertIfoodCommandAllowed({
        command: "CONFIRM",
        eventFullCodes: ["PLACED"],
        snapshot: {},
      }),
    );
    assert.doesNotThrow(() =>
      assertIfoodCommandAllowed({
        command: "START_PREPARATION",
        eventFullCodes: ["PLACED", "CONFIRMED"],
        snapshot: {},
      }),
    );
    assert.doesNotThrow(() =>
      assertIfoodCommandAllowed({
        command: "READY_TO_PICKUP",
        eventFullCodes: ["PLACED", "CONFIRMED", "PREPARATION_STARTED"],
        snapshot: { orderType: "TAKEOUT" },
      }),
    );
  });

  it("blocks incompatible transitions and every action after cancellation", () => {
    assert.throws(
      () =>
        assertIfoodCommandAllowed({
          command: "START_PREPARATION",
          eventFullCodes: ["PLACED"],
          snapshot: {},
        }),
      IfoodOrderActionBlockedError,
    );
    assert.throws(
      () =>
        assertIfoodCommandAllowed({
          command: "CONFIRM",
          eventFullCodes: ["PLACED", "CANCELLED"],
          snapshot: {},
        }),
      /cancelled/,
    );
  });

  it("derives terminal action from modality and logistics", () => {
    assert.equal(resolveIfoodTerminalCommand({ orderType: "TAKEOUT" }), "READY_TO_PICKUP");
    assert.equal(
      resolveIfoodTerminalCommand({
        orderType: "DINE_IN",
      }),
      "READY_TO_PICKUP",
    );
    assert.equal(
      resolveIfoodTerminalCommand({
        orderType: "DELIVERY",
      }),
      "DISPATCH",
    );
    assert.throws(
      () => resolveIfoodTerminalCommand({ orderType: "UNKNOWN" }),
      /Unsupported/,
    );
  });

  it("keeps scheduled timing out of the immediate test slice", () => {
    assert.throws(
      () =>
        assertIfoodCommandAllowed({
          command: "START_PREPARATION",
          eventFullCodes: ["PLACED", "CONFIRMED"],
          snapshot: { orderTiming: "SCHEDULED" },
        }),
      /Scheduled/,
    );
  });

  it("maps only matching inbox events to command confirmation", () => {
    assert.equal(commandConfirmedByFullCode("CONFIRMED"), "CONFIRM");
    assert.equal(
      commandConfirmedByFullCode("PREPARATION_STARTED"),
      "START_PREPARATION",
    );
    assert.equal(commandConfirmedByFullCode("READY_TO_PICKUP"), "READY_TO_PICKUP");
    assert.equal(commandConfirmedByFullCode("DISPATCHED"), "DISPATCH");
    assert.equal(commandConfirmedByFullCode("PLACED"), null);
  });
});
