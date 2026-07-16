import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  advanceAdminNewOrderCursor,
  buildDirectOrdersAfterCursorWhere,
  compareAdminNewOrderCursors,
  dedupeOrdersById,
  isAdminNewOrderCursorAfter,
  parseAdminNewOrderCursorPoint,
  serializeAdminNewOrderCursor,
} from "@/features/admin/orders/new-order-cursor";

const t = (iso: string) => new Date(iso);

describe("new-order-cursor", () => {
  it("compares by createdAt then id", () => {
    const earlier = { createdAt: t("2026-07-16T12:00:00.000Z"), id: "b" };
    const later = { createdAt: t("2026-07-16T12:00:01.000Z"), id: "a" };
    assert.ok(compareAdminNewOrderCursors(earlier, later) < 0);
    assert.ok(isAdminNewOrderCursorAfter(later, earlier));

    const sameTimeLower = {
      createdAt: t("2026-07-16T12:00:00.000Z"),
      id: "aaa",
    };
    const sameTimeHigher = {
      createdAt: t("2026-07-16T12:00:00.000Z"),
      id: "zzz",
    };
    assert.ok(compareAdminNewOrderCursors(sameTimeLower, sameTimeHigher) < 0);
    assert.ok(isAdminNewOrderCursorAfter(sameTimeHigher, sameTimeLower));
    assert.equal(
      compareAdminNewOrderCursors(sameTimeLower, sameTimeLower),
      0,
    );
  });

  it("parses and serializes ISO cursors", () => {
    const point = {
      createdAt: t("2026-07-16T12:00:00.000Z"),
      id: "order_1",
    };
    const serialized = serializeAdminNewOrderCursor(point);
    assert.equal(serialized.createdAt, "2026-07-16T12:00:00.000Z");
    assert.equal(serialized.id, "order_1");

    const parsed = parseAdminNewOrderCursorPoint(serialized);
    assert.ok(parsed);
    assert.equal(parsed!.createdAt.toISOString(), serialized.createdAt);
    assert.equal(parsed!.id, "order_1");
  });

  it("rejects invalid cursor points", () => {
    assert.equal(
      parseAdminNewOrderCursorPoint({
        createdAt: "not-a-date",
        id: "order_1",
      }),
      null,
    );
    assert.equal(
      parseAdminNewOrderCursorPoint({
        createdAt: "2026-07-16T12:00:00.000Z",
        id: "   ",
      }),
      null,
    );
  });

  it("advances to last ordered order and never regresses", () => {
    const previous = {
      createdAt: t("2026-07-16T12:00:00.000Z"),
      id: "a",
    };
    assert.deepEqual(advanceAdminNewOrderCursor(previous, []), previous);

    const advanced = advanceAdminNewOrderCursor(previous, [
      { createdAt: t("2026-07-16T12:00:01.000Z"), id: "b" },
      { createdAt: t("2026-07-16T12:00:02.000Z"), id: "c" },
    ]);
    assert.deepEqual(advanced, {
      createdAt: t("2026-07-16T12:00:02.000Z"),
      id: "c",
    });

    const olderBatch = advanceAdminNewOrderCursor(advanced, [
      { createdAt: t("2026-07-16T11:00:00.000Z"), id: "z" },
    ]);
    assert.deepEqual(olderBatch, advanced);
  });

  it("dedupes by id keeping first occurrence", () => {
    const orders = [
      { id: "1", n: 1 },
      { id: "2", n: 2 },
      { id: "1", n: 3 },
    ];
    assert.deepEqual(dedupeOrdersById(orders), [
      { id: "1", n: 1 },
      { id: "2", n: 2 },
    ]);
  });

  it("builds Prisma OR after-cursor fragment", () => {
    const cursor = {
      createdAt: t("2026-07-16T12:00:00.000Z"),
      id: "order_1",
    };
    assert.deepEqual(buildDirectOrdersAfterCursorWhere(cursor), {
      OR: [
        { createdAt: { gt: cursor.createdAt } },
        {
          AND: [{ createdAt: cursor.createdAt }, { id: { gt: cursor.id } }],
        },
      ],
    });
  });
});
