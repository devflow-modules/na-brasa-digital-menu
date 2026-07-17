/**
 * Single source of truth for admin order-queue live refresh signals.
 * Reuses notification polling / mutation success — no second poll, no WebSocket.
 *
 * Bus is in-memory and per browser tab (no BroadcastChannel / cross-tab sync).
 */

export type AdminOrdersRefreshReason =
  | "new-order"
  | "tab-visible"
  | "status-updated"
  | "counter-order-created";

/** Coalesce bursty signals into one router.refresh (100–500 ms band). */
export const ADMIN_ORDERS_REFRESH_DEBOUNCE_MS = 250;

/**
 * Modelled in-flight window after calling router.refresh().
 * Next.js does not expose a completion Promise for refresh — this is a coalesce
 * lock, not a guarantee that RSC data has arrived.
 */
export const ADMIN_ORDERS_REFRESH_IN_FLIGHT_MS = 300;

type RefreshListener = (reason: AdminOrdersRefreshReason) => void;

const listeners = new Set<RefreshListener>();

export function subscribeAdminOrdersRefresh(
  listener: RefreshListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestAdminOrdersRefresh(
  reason: AdminOrdersRefreshReason,
): void {
  for (const listener of [...listeners]) {
    try {
      listener(reason);
    } catch {
      // One bad listener must not break the bus or other subscribers.
    }
  }
}

/** Test helper — clears subscribers between unit cases. */
export function resetAdminOrdersRefreshSubscribersForTests(): void {
  listeners.clear();
}

/** Test helper — subscriber count for remount/leak checks. */
export function getAdminOrdersRefreshSubscriberCountForTests(): number {
  return listeners.size;
}

export type ResolveRefreshAfterPollInput = {
  mode: "bootstrap" | "delta";
  newOrderCount: number;
  pendingCountChanged: boolean;
};

/**
 * Map a successful notification poll to at most one queue refresh reason.
 * Banner/sound stay DIRECT-only; queue may also refresh on pendingCount drift.
 */
export function resolveRefreshReasonAfterPoll(
  input: ResolveRefreshAfterPollInput,
): AdminOrdersRefreshReason | null {
  if (input.mode === "bootstrap") {
    return null;
  }
  if (input.newOrderCount > 0) {
    return "new-order";
  }
  if (input.pendingCountChanged) {
    return "status-updated";
  }
  return null;
}

/**
 * After a visibility resume, prefer the poll-derived reason when present so
 * tab-visible does not stack a second refresh on top of resumed polling.
 */
export function resolveQueueRefreshAfterVisibilityPoll(input: {
  pollReason: AdminOrdersRefreshReason | null;
  visibilityResumePending: boolean;
}): {
  reason: AdminOrdersRefreshReason | null;
  visibilityResumePending: boolean;
} {
  if (input.pollReason != null) {
    return { reason: input.pollReason, visibilityResumePending: false };
  }
  if (input.visibilityResumePending) {
    return { reason: "tab-visible", visibilityResumePending: false };
  }
  return { reason: null, visibilityResumePending: false };
}

export type TabVisibleRefreshGate = {
  becomingVisible: boolean;
  sessionActive: boolean;
  onLoginRoute: boolean;
};

export function shouldRequestRefreshOnTabVisible(
  gate: TabVisibleRefreshGate,
): boolean {
  return gate.becomingVisible && gate.sessionActive && !gate.onLoginRoute;
}

export type AdminOrdersRefreshScheduler = {
  request: (reason: AdminOrdersRefreshReason) => void;
  dispose: () => void;
};

type SchedulerTimers = {
  setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (id: ReturnType<typeof setTimeout>) => void;
};

/**
 * Whether a refresh signal should call router.refresh() on the current path.
 * Avoids wiping client state on Balcão/Cardápio; queue + order detail stay live.
 * Exact `/admin` only — not a generic `/admin*` prefix.
 */
export function shouldApplyAdminOrdersRefresh(
  pathname: string,
  reason: AdminOrdersRefreshReason,
): boolean {
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  if (path === "/admin") {
    return true;
  }

  if (path.startsWith("/admin/pedidos/")) {
    return reason === "status-updated" || reason === "tab-visible";
  }

  return false;
}

/**
 * Debounce + coalesce + trailing refresh if signals arrive during an in-flight window.
 * `refresh` receives the latest coalesced reason; callers must re-check route policy
 * at execution time (pathname may have changed during the debounce).
 */
export function createAdminOrdersRefreshScheduler(options: {
  refresh: (reason: AdminOrdersRefreshReason) => void;
  debounceMs?: number;
  /** How long to treat refresh as in-flight (router.refresh has no completion API). */
  inFlightMs?: number;
  timers?: SchedulerTimers;
}): AdminOrdersRefreshScheduler {
  const debounceMs = options.debounceMs ?? ADMIN_ORDERS_REFRESH_DEBOUNCE_MS;
  const inFlightMs = options.inFlightMs ?? ADMIN_ORDERS_REFRESH_IN_FLIGHT_MS;
  // Wrap globals — calling `timers.setTimeout` with unbound window.setTimeout
  // throws "Illegal invocation" in the browser.
  const timers = options.timers ?? {
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id) => globalThis.clearTimeout(id),
  };

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let inFlightTimer: ReturnType<typeof setTimeout> | null = null;
  let pending = false;
  let inFlight = false;
  let disposed = false;
  let latestReason: AdminOrdersRefreshReason | null = null;

  const clearDebounce = () => {
    if (debounceTimer != null) {
      timers.clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };

  const clearInFlight = () => {
    if (inFlightTimer != null) {
      timers.clearTimeout(inFlightTimer);
      inFlightTimer = null;
    }
  };

  const runRefresh = () => {
    if (disposed) {
      return;
    }
    const reason = latestReason;
    pending = false;
    if (reason == null) {
      return;
    }
    inFlight = true;
    options.refresh(reason);
    clearInFlight();
    inFlightTimer = timers.setTimeout(() => {
      inFlightTimer = null;
      inFlight = false;
      if (pending && !disposed) {
        schedule();
      }
    }, inFlightMs);
  };

  const schedule = () => {
    if (disposed) {
      return;
    }
    if (inFlight) {
      pending = true;
      return;
    }
    clearDebounce();
    debounceTimer = timers.setTimeout(() => {
      debounceTimer = null;
      runRefresh();
    }, debounceMs);
  };

  return {
    request(reason) {
      if (disposed) {
        return;
      }
      latestReason = reason;
      pending = true;
      schedule();
    },
    dispose() {
      disposed = true;
      pending = false;
      inFlight = false;
      latestReason = null;
      clearDebounce();
      clearInFlight();
    },
  };
}
