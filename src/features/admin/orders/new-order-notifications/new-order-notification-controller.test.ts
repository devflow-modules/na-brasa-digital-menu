import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_STORE_DELTA_CURSOR,
  NEW_ORDER_POLL_BASE_MS,
  NEW_ORDER_POLL_MAX_BACKOFF_MS,
  applyPollFailure,
  applyPollSuccess,
  beginBootstrapping,
  buildPollInput,
  createInitialNotificationState,
  dismissNotificationBanner,
  markVisibilityPaused,
  markVisibilityResumed,
} from "@/features/admin/orders/new-order-notifications/new-order-notification-controller";
import type { AdminNewOrderNotificationItem } from "@/features/admin/orders/admin-orders.types";

function order(
  overrides: Partial<AdminNewOrderNotificationItem> &
    Pick<AdminNewOrderNotificationItem, "id">,
): AdminNewOrderNotificationItem {
  return {
    code: `NB-${overrides.id}`,
    source: "DIRECT",
    status: "PENDING",
    customerName: "Cliente",
    totalCents: 4200,
    createdAt: "2026-07-16T12:00:00.000Z",
    ...overrides,
  };
}

describe("new-order-notification-controller", () => {
  it("bootstrap updates pendingCount without alerts or sound", () => {
    const state = beginBootstrapping(createInitialNotificationState());
    const next = applyPollSuccess(state, {
      mode: "bootstrap",
      cursor: { createdAt: "2026-07-16T12:00:00.000Z", id: "tip" },
      orders: [order({ id: "should-not-alert" })],
      pendingCount: 4,
      hasMore: false,
    });

    assert.equal(next.pendingCount, 4);
    assert.deepEqual(next.banners, []);
    assert.deepEqual(next.soundQueue, []);
    assert.equal(next.hasCompletedBootstrap, true);
    assert.equal(next.pollImmediately, false);
  });

  it("bootstrap with null cursor is valid and later uses synthetic delta cursor", () => {
    const bootstrapped = applyPollSuccess(createInitialNotificationState(), {
      mode: "bootstrap",
      cursor: null,
      orders: [],
      pendingCount: 0,
      hasMore: false,
    });
    assert.equal(bootstrapped.cursor, null);
    assert.deepEqual(buildPollInput(bootstrapped), {
      afterCreatedAt: EMPTY_STORE_DELTA_CURSOR.afterCreatedAt,
      afterId: EMPTY_STORE_DELTA_CURSOR.afterId,
    });
  });

  it("delta alerts new DIRECT once and advances cursor", () => {
    let state = applyPollSuccess(createInitialNotificationState(), {
      mode: "bootstrap",
      cursor: { createdAt: "2026-07-16T11:00:00.000Z", id: "a" },
      orders: [],
      pendingCount: 1,
      hasMore: false,
    });

    state = applyPollSuccess(state, {
      mode: "delta",
      cursor: { createdAt: "2026-07-16T12:00:00.000Z", id: "b" },
      orders: [order({ id: "b", customerName: "Ana" })],
      pendingCount: 2,
      hasMore: false,
    });

    assert.equal(state.banners.length, 1);
    assert.equal(state.banners[0]?.id, "b");
    assert.deepEqual(state.soundQueue, ["b"]);
    assert.equal(state.cursor?.id, "b");
    assert.equal(state.pendingCount, 2);

    const again = applyPollSuccess(state, {
      mode: "delta",
      cursor: { createdAt: "2026-07-16T12:00:00.000Z", id: "b" },
      orders: [order({ id: "b" })],
      pendingCount: 2,
      hasMore: false,
    });
    assert.equal(again.banners.length, 1);
    assert.deepEqual(again.soundQueue, []);
  });

  it("two orders create two alerts; COUNTER-like source is ignored as defense", () => {
    const state = applyPollSuccess(
      applyPollSuccess(createInitialNotificationState(), {
        mode: "bootstrap",
        cursor: { createdAt: "2026-07-16T11:00:00.000Z", id: "a" },
        orders: [],
        pendingCount: 0,
        hasMore: false,
      }),
      {
        mode: "delta",
        cursor: { createdAt: "2026-07-16T12:00:02.000Z", id: "c" },
        orders: [
          order({ id: "b" }),
          order({ id: "c" }),
          {
            ...order({ id: "counter" }),
            source: "COUNTER",
          } as unknown as AdminNewOrderNotificationItem,
        ],
        pendingCount: 3,
        hasMore: false,
      },
    );

    assert.deepEqual(
      state.banners.map((b) => b.id).sort(),
      ["b", "c"],
    );
    assert.ok(!state.alertedIds.includes("counter"));
  });

  it("hasMore requests immediate poll and resets after final page", () => {
    const boot = applyPollSuccess(createInitialNotificationState(), {
      mode: "bootstrap",
      cursor: { createdAt: "2026-07-16T11:00:00.000Z", id: "a" },
      orders: [],
      pendingCount: 0,
      hasMore: false,
    });

    const page1 = applyPollSuccess(boot, {
      mode: "delta",
      cursor: { createdAt: "2026-07-16T12:00:00.000Z", id: "p20" },
      orders: [order({ id: "p20" })],
      pendingCount: 21,
      hasMore: true,
    });
    assert.equal(page1.pollImmediately, true);

    const page2 = applyPollSuccess(page1, {
      mode: "delta",
      cursor: { createdAt: "2026-07-16T12:00:01.000Z", id: "p21" },
      orders: [order({ id: "p21" })],
      pendingCount: 21,
      hasMore: false,
    });
    assert.equal(page2.pollImmediately, false);
    assert.equal(page2.hasMorePagesThisCycle, 0);
  });

  it("unexpected error preserves cursor and backs off 8→16→32", () => {
    let state = applyPollSuccess(createInitialNotificationState(), {
      mode: "bootstrap",
      cursor: { createdAt: "2026-07-16T11:00:00.000Z", id: "a" },
      orders: [],
      pendingCount: 1,
      hasMore: false,
    });

    state = applyPollFailure(state, "UNEXPECTED_ERROR");
    assert.equal(state.cursor?.id, "a");
    assert.equal(state.backoffMs, NEW_ORDER_POLL_BASE_MS * 2);
    assert.equal(state.stopPolling, false);

    state = applyPollFailure(state, "UNEXPECTED_ERROR");
    assert.equal(state.backoffMs, NEW_ORDER_POLL_MAX_BACKOFF_MS);

    state = applyPollFailure(state, "UNEXPECTED_ERROR");
    assert.equal(state.backoffMs, NEW_ORDER_POLL_MAX_BACKOFF_MS);

    state = applyPollSuccess(state, {
      mode: "delta",
      cursor: { createdAt: "2026-07-16T11:00:00.000Z", id: "a" },
      orders: [],
      pendingCount: 1,
      hasMore: false,
    });
    assert.equal(state.backoffMs, NEW_ORDER_POLL_BASE_MS);
  });

  it("unauthorized and forbidden stop polling without backoff dance", () => {
    const base = applyPollSuccess(createInitialNotificationState(), {
      mode: "bootstrap",
      cursor: { createdAt: "2026-07-16T11:00:00.000Z", id: "a" },
      orders: [],
      pendingCount: 0,
      hasMore: false,
    });

    const unauthorized = applyPollFailure(base, "UNAUTHORIZED");
    assert.equal(unauthorized.stopPolling, true);
    assert.equal(unauthorized.status, "unauthorized");

    const forbidden = applyPollFailure(base, "FORBIDDEN");
    assert.equal(forbidden.stopPolling, true);
    assert.equal(forbidden.status, "forbidden");
  });

  it("invalid cursor rebootstraps once then stops", () => {
    let state = applyPollSuccess(createInitialNotificationState(), {
      mode: "bootstrap",
      cursor: { createdAt: "2026-07-16T11:00:00.000Z", id: "a" },
      orders: [],
      pendingCount: 0,
      hasMore: false,
    });

    state = applyPollFailure(state, "INVALID_CURSOR");
    assert.equal(state.status, "bootstrapping");
    assert.equal(state.pollImmediately, true);
    assert.equal(state.stopPolling, false);
    assert.deepEqual(buildPollInput(state), {});

    state = applyPollFailure(state, "INVALID_CURSOR");
    assert.equal(state.stopPolling, true);
    assert.equal(state.status, "error");
  });

  it("visibility pause/resume and dismiss do not change pendingCount", () => {
    let state = applyPollSuccess(createInitialNotificationState(), {
      mode: "bootstrap",
      cursor: { createdAt: "2026-07-16T11:00:00.000Z", id: "a" },
      orders: [],
      pendingCount: 5,
      hasMore: false,
    });
    state = applyPollSuccess(state, {
      mode: "delta",
      cursor: { createdAt: "2026-07-16T12:00:00.000Z", id: "b" },
      orders: [order({ id: "b" })],
      pendingCount: 6,
      hasMore: false,
    });

    const paused = markVisibilityPaused(state);
    assert.equal(paused.status, "paused");
    assert.equal(paused.pendingCount, 6);

    const resumed = markVisibilityResumed(paused);
    assert.equal(resumed.pollImmediately, true);
    assert.equal(resumed.pendingCount, 6);

    const dismissed = dismissNotificationBanner(resumed, "b");
    assert.equal(dismissed.banners.length, 0);
    assert.equal(dismissed.pendingCount, 6);
    assert.ok(dismissed.alertedIds.includes("b"));
  });

  it("buildPollInput uses tip cursor after bootstrap with tip", () => {
    const state = applyPollSuccess(createInitialNotificationState(), {
      mode: "bootstrap",
      cursor: { createdAt: "2026-07-16T11:00:00.000Z", id: "tip" },
      orders: [],
      pendingCount: 0,
      hasMore: false,
    });
    assert.deepEqual(buildPollInput(state), {
      afterCreatedAt: "2026-07-16T11:00:00.000Z",
      afterId: "tip",
    });
  });

  it("empty bootstrap then first DIRECT alerts once and replaces synthetic cursor", () => {
    let state = applyPollSuccess(createInitialNotificationState(), {
      mode: "bootstrap",
      cursor: null,
      orders: [],
      pendingCount: 0,
      hasMore: false,
    });
    assert.deepEqual(buildPollInput(state), {
      afterCreatedAt: EMPTY_STORE_DELTA_CURSOR.afterCreatedAt,
      afterId: EMPTY_STORE_DELTA_CURSOR.afterId,
    });

    const emptyDelta = applyPollSuccess(state, {
      mode: "delta",
      cursor: null,
      orders: [],
      pendingCount: 0,
      hasMore: false,
    });
    assert.equal(emptyDelta.status, "active");
    assert.equal(emptyDelta.stopPolling, false);

    state = applyPollSuccess(state, {
      mode: "delta",
      cursor: { createdAt: "2026-07-16T15:00:00.000Z", id: "first" },
      orders: [order({ id: "first", createdAt: "2026-07-16T15:00:00.000Z" })],
      pendingCount: 1,
      hasMore: false,
    });
    assert.equal(state.banners[0]?.id, "first");
    assert.equal(state.cursor?.id, "first");
    assert.deepEqual(buildPollInput(state), {
      afterCreatedAt: "2026-07-16T15:00:00.000Z",
      afterId: "first",
    });

    const again = applyPollSuccess(state, {
      mode: "delta",
      cursor: { createdAt: "2026-07-16T15:00:00.000Z", id: "first" },
      orders: [order({ id: "first" })],
      pendingCount: 1,
      hasMore: false,
    });
    assert.deepEqual(again.soundQueue, []);
    assert.equal(again.banners.length, 1);
  });

  it("keeps at most 3 banners; 4th is visually dropped but stays deduped", () => {
    let state = applyPollSuccess(createInitialNotificationState(), {
      mode: "bootstrap",
      cursor: { createdAt: "2026-07-16T11:00:00.000Z", id: "a" },
      orders: [],
      pendingCount: 0,
      hasMore: false,
    });

    state = applyPollSuccess(state, {
      mode: "delta",
      cursor: { createdAt: "2026-07-16T12:00:03.000Z", id: "d" },
      orders: [
        order({ id: "b" }),
        order({ id: "c" }),
        order({ id: "d" }),
      ],
      pendingCount: 3,
      hasMore: false,
    });
    assert.equal(state.banners.length, 3);

    state = applyPollSuccess(state, {
      mode: "delta",
      cursor: { createdAt: "2026-07-16T12:00:04.000Z", id: "e" },
      orders: [order({ id: "e" })],
      pendingCount: 4,
      hasMore: false,
    });
    assert.equal(state.banners.length, 3);
    assert.equal(state.banners[0]?.id, "e");
    // Newest-first stack drops the oldest visual slot ("d"), not the newest.
    assert.ok(!state.banners.some((banner) => banner.id === "d"));
    assert.ok(state.alertedIds.includes("d"));
    assert.ok(state.alertedIds.includes("e"));

    const replayDropped = applyPollSuccess(state, {
      mode: "delta",
      cursor: state.cursor,
      orders: [order({ id: "d" })],
      pendingCount: 4,
      hasMore: false,
    });
    assert.ok(!replayDropped.banners.some((banner) => banner.id === "d"));
    assert.deepEqual(replayDropped.soundQueue, []);
  });

  it("stops hasMore drain when page is empty or cursor does not advance", () => {
    const boot = applyPollSuccess(createInitialNotificationState(), {
      mode: "bootstrap",
      cursor: { createdAt: "2026-07-16T11:00:00.000Z", id: "a" },
      orders: [],
      pendingCount: 0,
      hasMore: false,
    });

    const emptyPage = applyPollSuccess(boot, {
      mode: "delta",
      cursor: { createdAt: "2026-07-16T11:00:00.000Z", id: "a" },
      orders: [],
      pendingCount: 0,
      hasMore: true,
    });
    assert.equal(emptyPage.pollImmediately, false);

    const stuckCursor = applyPollSuccess(boot, {
      mode: "delta",
      cursor: { createdAt: "2026-07-16T11:00:00.000Z", id: "a" },
      orders: [order({ id: "dup" })],
      pendingCount: 1,
      hasMore: true,
    });
    // cursor equal to previous tip → do not drain forever
    assert.equal(stuckCursor.pollImmediately, false);
  });
});
