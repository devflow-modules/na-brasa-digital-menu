import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareIfoodPollingEvents,
  shouldAdvanceIfoodLifecycle,
} from "@/features/ifood/ifood-lifecycle";

describe("ifood-lifecycle", () => {
  it("advances by createdAt and breaks ties by externalEventId", () => {
    const existing = {
      lastEventAt: new Date("2026-07-22T12:00:00.000Z"),
      lastExternalEventId: "evt-a",
    };

    assert.equal(
      shouldAdvanceIfoodLifecycle(
        existing,
        new Date("2026-07-22T12:01:00.000Z"),
        "evt-z",
      ),
      true,
    );
    assert.equal(
      shouldAdvanceIfoodLifecycle(
        existing,
        new Date("2026-07-22T11:59:00.000Z"),
        "evt-z",
      ),
      false,
    );
    assert.equal(
      shouldAdvanceIfoodLifecycle(
        existing,
        new Date("2026-07-22T12:00:00.000Z"),
        "evt-b",
      ),
      true,
    );
    assert.equal(
      shouldAdvanceIfoodLifecycle(
        existing,
        new Date("2026-07-22T12:00:00.000Z"),
        "evt-a",
      ),
      false,
    );
  });

  it("sorts polling events by createdAt then id", () => {
    const sorted = [
      { id: "b", createdAt: "2026-07-22T12:00:00.000Z" },
      { id: "a", createdAt: "2026-07-22T12:00:00.000Z" },
      { id: "c", createdAt: "2026-07-22T11:00:00.000Z" },
    ].sort(compareIfoodPollingEvents);

    assert.deepEqual(
      sorted.map((e) => e.id),
      ["c", "a", "b"],
    );
  });
});
