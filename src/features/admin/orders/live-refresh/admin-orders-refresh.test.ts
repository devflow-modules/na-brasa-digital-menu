import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  ADMIN_ORDERS_REFRESH_DEBOUNCE_MS,
  createAdminOrdersRefreshScheduler,
  getAdminOrdersRefreshSubscriberCountForTests,
  requestAdminOrdersRefresh,
  resetAdminOrdersRefreshSubscribersForTests,
  resolveQueueRefreshAfterVisibilityPoll,
  resolveRefreshReasonAfterPoll,
  shouldApplyAdminOrdersRefresh,
  shouldRequestRefreshOnTabVisible,
  subscribeAdminOrdersRefresh,
  type AdminOrdersRefreshReason,
} from "@/features/admin/orders/live-refresh/admin-orders-refresh";

afterEach(() => {
  resetAdminOrdersRefreshSubscribersForTests();
});

describe("resolveRefreshReasonAfterPoll", () => {
  it("ignores bootstrap", () => {
    assert.equal(
      resolveRefreshReasonAfterPoll({
        mode: "bootstrap",
        newOrderCount: 2,
        pendingCountChanged: true,
      }),
      null,
    );
  });

  it("maps new DIRECT orders to new-order", () => {
    assert.equal(
      resolveRefreshReasonAfterPoll({
        mode: "delta",
        newOrderCount: 1,
        pendingCountChanged: false,
      }),
      "new-order",
    );
  });

  it("maps pendingCount drift without new orders to status-updated", () => {
    assert.equal(
      resolveRefreshReasonAfterPoll({
        mode: "delta",
        newOrderCount: 0,
        pendingCountChanged: true,
      }),
      "status-updated",
    );
  });

  it("returns null when delta is idle", () => {
    assert.equal(
      resolveRefreshReasonAfterPoll({
        mode: "delta",
        newOrderCount: 0,
        pendingCountChanged: false,
      }),
      null,
    );
  });
});

describe("resolveQueueRefreshAfterVisibilityPoll", () => {
  it("prefers poll reason and clears visibility pending", () => {
    assert.deepEqual(
      resolveQueueRefreshAfterVisibilityPoll({
        pollReason: "new-order",
        visibilityResumePending: true,
      }),
      { reason: "new-order", visibilityResumePending: false },
    );
  });

  it("emits tab-visible only when poll is idle and visibility is pending", () => {
    assert.deepEqual(
      resolveQueueRefreshAfterVisibilityPoll({
        pollReason: null,
        visibilityResumePending: true,
      }),
      { reason: "tab-visible", visibilityResumePending: false },
    );
  });

  it("emits nothing when neither poll nor visibility needs refresh", () => {
    assert.deepEqual(
      resolveQueueRefreshAfterVisibilityPoll({
        pollReason: null,
        visibilityResumePending: false,
      }),
      { reason: null, visibilityResumePending: false },
    );
  });
});

describe("shouldRequestRefreshOnTabVisible", () => {
  it("updates once when becoming visible with active session", () => {
    assert.equal(
      shouldRequestRefreshOnTabVisible({
        becomingVisible: true,
        sessionActive: true,
        onLoginRoute: false,
      }),
      true,
    );
  });

  it("skips hidden, login, and inactive session", () => {
    assert.equal(
      shouldRequestRefreshOnTabVisible({
        becomingVisible: false,
        sessionActive: true,
        onLoginRoute: false,
      }),
      false,
    );
    assert.equal(
      shouldRequestRefreshOnTabVisible({
        becomingVisible: true,
        sessionActive: false,
        onLoginRoute: false,
      }),
      false,
    );
    assert.equal(
      shouldRequestRefreshOnTabVisible({
        becomingVisible: true,
        sessionActive: true,
        onLoginRoute: true,
      }),
      false,
    );
  });
});

describe("shouldApplyAdminOrdersRefresh", () => {
  it("applies every reason on the orders queue", () => {
    assert.equal(shouldApplyAdminOrdersRefresh("/admin", "new-order"), true);
    assert.equal(shouldApplyAdminOrdersRefresh("/admin/", "tab-visible"), true);
    assert.equal(
      shouldApplyAdminOrdersRefresh("/admin", "counter-order-created"),
      true,
    );
  });

  it("applies status/tab refresh on order detail only", () => {
    assert.equal(
      shouldApplyAdminOrdersRefresh("/admin/pedidos/abc", "status-updated"),
      true,
    );
    assert.equal(
      shouldApplyAdminOrdersRefresh("/admin/pedidos/abc", "tab-visible"),
      true,
    );
    assert.equal(
      shouldApplyAdminOrdersRefresh("/admin/pedidos/abc", "new-order"),
      false,
    );
    assert.equal(
      shouldApplyAdminOrdersRefresh(
        "/admin/pedidos/abc",
        "counter-order-created",
      ),
      false,
    );
  });

  it("skips Balcão, cardápio, config, login, master and false prefixes", () => {
    assert.equal(
      shouldApplyAdminOrdersRefresh("/admin/balcao", "counter-order-created"),
      false,
    );
    assert.equal(
      shouldApplyAdminOrdersRefresh("/admin/balcao", "new-order"),
      false,
    );
    assert.equal(
      shouldApplyAdminOrdersRefresh("/admin/cardapio", "tab-visible"),
      false,
    );
    assert.equal(
      shouldApplyAdminOrdersRefresh("/admin/configuracoes", "status-updated"),
      false,
    );
    assert.equal(
      shouldApplyAdminOrdersRefresh("/admin/login", "new-order"),
      false,
    );
    assert.equal(shouldApplyAdminOrdersRefresh("/master", "new-order"), false);
    assert.equal(
      shouldApplyAdminOrdersRefresh("/administrator", "new-order"),
      false,
    );
    assert.equal(
      shouldApplyAdminOrdersRefresh("/admin-balcao", "new-order"),
      false,
    );
  });
});

describe("admin orders refresh bus", () => {
  it("delivers reason to subscribers and cleans up without leaks", () => {
    const seen: AdminOrdersRefreshReason[] = [];
    const unsubscribe = subscribeAdminOrdersRefresh((reason) => {
      seen.push(reason);
    });
    assert.equal(getAdminOrdersRefreshSubscriberCountForTests(), 1);

    requestAdminOrdersRefresh("new-order");
    assert.deepEqual(seen, ["new-order"]);

    unsubscribe();
    assert.equal(getAdminOrdersRefreshSubscriberCountForTests(), 0);
    requestAdminOrdersRefresh("tab-visible");
    assert.deepEqual(seen, ["new-order"]);
  });

  it("remount subscribe/unsubscribe does not accumulate listeners", () => {
    const first = subscribeAdminOrdersRefresh(() => {});
    first();
    const second = subscribeAdminOrdersRefresh(() => {});
    assert.equal(getAdminOrdersRefreshSubscriberCountForTests(), 1);
    second();
    assert.equal(getAdminOrdersRefreshSubscriberCountForTests(), 0);
  });

  it("continues notifying other listeners when one throws", () => {
    const seen: AdminOrdersRefreshReason[] = [];
    const bad = subscribeAdminOrdersRefresh(() => {
      throw new Error("listener failed");
    });
    const good = subscribeAdminOrdersRefresh((reason) => {
      seen.push(reason);
    });

    requestAdminOrdersRefresh("status-updated");
    assert.deepEqual(seen, ["status-updated"]);

    bad();
    good();
  });

  it("emits without listeners without throwing", () => {
    assert.doesNotThrow(() => {
      requestAdminOrdersRefresh("new-order");
    });
  });
});

describe("createAdminOrdersRefreshScheduler", () => {
  it("coalesces bursty requests into one refresh with latest reason", () => {
    const calls: AdminOrdersRefreshReason[] = [];
    const timers = createFakeTimers();
    const scheduler = createAdminOrdersRefreshScheduler({
      refresh: (reason) => {
        calls.push(reason);
      },
      debounceMs: ADMIN_ORDERS_REFRESH_DEBOUNCE_MS,
      inFlightMs: 300,
      timers,
    });

    scheduler.request("new-order");
    scheduler.request("tab-visible");
    scheduler.request("status-updated");
    assert.equal(calls.length, 0);

    timers.advance(ADMIN_ORDERS_REFRESH_DEBOUNCE_MS);
    assert.deepEqual(calls, ["status-updated"]);

    scheduler.dispose();
  });

  it("queues a trailing refresh when signals arrive in-flight", () => {
    const calls: AdminOrdersRefreshReason[] = [];
    const timers = createFakeTimers();
    const scheduler = createAdminOrdersRefreshScheduler({
      refresh: (reason) => {
        calls.push(reason);
      },
      debounceMs: 100,
      inFlightMs: 200,
      timers,
    });

    scheduler.request("new-order");
    timers.advance(100);
    assert.deepEqual(calls, ["new-order"]);

    scheduler.request("status-updated");
    timers.advance(199);
    assert.deepEqual(calls, ["new-order"]);

    timers.advance(1);
    assert.deepEqual(calls, ["new-order"]);
    timers.advance(100);
    assert.deepEqual(calls, ["new-order", "status-updated"]);

    scheduler.dispose();
  });

  it("dispose prevents further refreshes and clears timers", () => {
    const calls: AdminOrdersRefreshReason[] = [];
    const timers = createFakeTimers();
    const scheduler = createAdminOrdersRefreshScheduler({
      refresh: (reason) => {
        calls.push(reason);
      },
      debounceMs: 100,
      timers,
    });

    scheduler.request("new-order");
    scheduler.dispose();
    timers.advance(100);
    assert.equal(calls.length, 0);
  });

  it("allows flush-time policy to skip after pathname change during debounce", () => {
    const calls: AdminOrdersRefreshReason[] = [];
    let pathname = "/admin";
    const timers = createFakeTimers();
    const scheduler = createAdminOrdersRefreshScheduler({
      refresh: (reason) => {
        if (!shouldApplyAdminOrdersRefresh(pathname, reason)) {
          return;
        }
        calls.push(reason);
      },
      debounceMs: 250,
      timers,
    });

    scheduler.request("new-order");
    pathname = "/admin/balcao";
    timers.advance(250);
    assert.equal(calls.length, 0);

    scheduler.dispose();
  });
});

function createFakeTimers() {
  type Entry = { at: number; fn: () => void; id: number };
  let now = 0;
  let nextId = 1;
  const entries: Entry[] = [];

  return {
    get now() {
      return now;
    },
    setTimeout(fn: () => void, ms: number) {
      const id = nextId++;
      entries.push({ at: now + ms, fn, id });
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimeout(id: ReturnType<typeof setTimeout>) {
      const numeric = id as unknown as number;
      const index = entries.findIndex((entry) => entry.id === numeric);
      if (index >= 0) {
        entries.splice(index, 1);
      }
    },
    advance(ms: number) {
      const target = now + ms;
      while (entries.length > 0) {
        entries.sort((a, b) => a.at - b.at);
        const next = entries[0];
        if (!next || next.at > target) {
          break;
        }
        now = next.at;
        entries.shift();
        next.fn();
      }
      now = target;
    },
  };
}
