import type {
  AdminNewOrderCursor,
  AdminNewOrderNotificationItem,
  AdminOrderStatus,
} from "@/features/admin/orders/admin-orders.types";

export const NEW_ORDER_POLL_BASE_MS = 8_000;
export const NEW_ORDER_POLL_MAX_BACKOFF_MS = 32_000;
export const NEW_ORDER_MAX_BANNERS = 3;
export const NEW_ORDER_MAX_HAS_MORE_PAGES = 10;

/**
 * Synthetic cursor used only after a successful empty-store bootstrap
 * (cursor null). Enables delta detection of the first DIRECT without
 * replaying history on a store that already had a tip at bootstrap.
 */
export const EMPTY_STORE_DELTA_CURSOR = {
  afterCreatedAt: "1970-01-01T00:00:00.000Z",
  afterId: "0",
} as const;

export type NotificationPollingState =
  | "idle"
  | "bootstrapping"
  | "active"
  | "paused"
  | "unauthorized"
  | "forbidden"
  | "error";

export type ClientNewOrderNotification = {
  id: string;
  code: string;
  source: "DIRECT";
  status: AdminOrderStatus;
  customerName: string;
  totalCents: number;
  createdAt: string;
};

export type NewOrderNotificationControllerState = {
  status: NotificationPollingState;
  cursor: AdminNewOrderCursor | null;
  pendingCount: number;
  alertedIds: string[];
  banners: ClientNewOrderNotification[];
  backoffMs: number;
  invalidCursorRetries: number;
  hasMorePagesThisCycle: number;
  hasCompletedBootstrap: boolean;
  /** Sound ids that should play once for this transition. */
  soundQueue: string[];
  /** When true, scheduler should poll again immediately (hasMore drain). */
  pollImmediately: boolean;
  /** When true, scheduler should stop permanently until remount. */
  stopPolling: boolean;
};

export type PollSuccessPayload = {
  mode: "bootstrap" | "delta";
  cursor: AdminNewOrderCursor | null;
  orders: AdminNewOrderNotificationItem[];
  pendingCount: number;
  hasMore: boolean;
};

export type PollFailureCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_CURSOR"
  | "UNEXPECTED_ERROR";

export function createInitialNotificationState(): NewOrderNotificationControllerState {
  return {
    status: "idle",
    cursor: null,
    pendingCount: 0,
    alertedIds: [],
    banners: [],
    backoffMs: NEW_ORDER_POLL_BASE_MS,
    invalidCursorRetries: 0,
    hasMorePagesThisCycle: 0,
    hasCompletedBootstrap: false,
    soundQueue: [],
    pollImmediately: false,
    stopPolling: false,
  };
}

function nextBackoff(current: number): number {
  return Math.min(current * 2, NEW_ORDER_POLL_MAX_BACKOFF_MS);
}

function asDirectOnly(
  orders: AdminNewOrderNotificationItem[],
): ClientNewOrderNotification[] {
  return orders
    .filter((order) => order.source === "DIRECT")
    .map((order) => ({
      id: order.id,
      code: order.code,
      source: "DIRECT" as const,
      status: order.status,
      customerName: order.customerName,
      totalCents: order.totalCents,
      createdAt: order.createdAt,
    }));
}

function pushBanners(
  current: ClientNewOrderNotification[],
  incoming: ClientNewOrderNotification[],
): ClientNewOrderNotification[] {
  const merged = [...incoming, ...current];
  const seen = new Set<string>();
  const unique: ClientNewOrderNotification[] = [];
  for (const item of merged) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    unique.push(item);
  }
  return unique.slice(0, NEW_ORDER_MAX_BANNERS);
}

/**
 * Apply a successful poll response. Bootstrap never alerts.
 */
export function applyPollSuccess(
  state: NewOrderNotificationControllerState,
  payload: PollSuccessPayload,
): NewOrderNotificationControllerState {
  if (payload.mode === "bootstrap") {
    return {
      ...state,
      status: "active",
      cursor: payload.cursor,
      pendingCount: payload.pendingCount,
      backoffMs: NEW_ORDER_POLL_BASE_MS,
      invalidCursorRetries: 0,
      hasMorePagesThisCycle: 0,
      hasCompletedBootstrap: true,
      soundQueue: [],
      pollImmediately: false,
      stopPolling: false,
    };
  }

  const candidates = asDirectOnly(payload.orders);
  const alerted = new Set(state.alertedIds);
  const fresh: ClientNewOrderNotification[] = [];
  const soundQueue: string[] = [];

  for (const order of candidates) {
    if (alerted.has(order.id)) {
      continue;
    }
    alerted.add(order.id);
    fresh.push(order);
    soundQueue.push(order.id);
  }

  const cursorAdvanced =
    payload.cursor != null &&
    (state.cursor == null ||
      state.cursor.id !== payload.cursor.id ||
      state.cursor.createdAt !== payload.cursor.createdAt);

  // Stop draining on empty/stuck pages to avoid infinite immediate polls.
  const hasMore =
    payload.hasMore &&
    payload.orders.length > 0 &&
    cursorAdvanced &&
    state.hasMorePagesThisCycle + 1 < NEW_ORDER_MAX_HAS_MORE_PAGES;

  return {
    ...state,
    status: "active",
    cursor: payload.cursor ?? state.cursor,
    pendingCount: payload.pendingCount,
    alertedIds: [...alerted],
    banners: pushBanners(state.banners, fresh),
    backoffMs: NEW_ORDER_POLL_BASE_MS,
    invalidCursorRetries: 0,
    hasMorePagesThisCycle: hasMore ? state.hasMorePagesThisCycle + 1 : 0,
    hasCompletedBootstrap: true,
    soundQueue,
    pollImmediately: hasMore,
    stopPolling: false,
  };
}

export function applyPollFailure(
  state: NewOrderNotificationControllerState,
  code: PollFailureCode,
): NewOrderNotificationControllerState {
  if (code === "UNAUTHORIZED") {
    return {
      ...state,
      status: "unauthorized",
      soundQueue: [],
      pollImmediately: false,
      stopPolling: true,
    };
  }

  if (code === "FORBIDDEN") {
    return {
      ...state,
      status: "forbidden",
      soundQueue: [],
      pollImmediately: false,
      stopPolling: true,
    };
  }

  if (code === "INVALID_CURSOR") {
    const retries = state.invalidCursorRetries + 1;
    if (retries >= 2) {
      return {
        ...state,
        status: "error",
        cursor: null,
        hasCompletedBootstrap: false,
        invalidCursorRetries: retries,
        soundQueue: [],
        pollImmediately: false,
        stopPolling: true,
      };
    }

    return {
      ...state,
      status: "bootstrapping",
      cursor: null,
      hasCompletedBootstrap: false,
      invalidCursorRetries: retries,
      hasMorePagesThisCycle: 0,
      soundQueue: [],
      pollImmediately: true,
      stopPolling: false,
    };
  }

  return {
    ...state,
    status: "error",
    backoffMs: nextBackoff(state.backoffMs),
    soundQueue: [],
    pollImmediately: false,
    stopPolling: false,
  };
}

export function dismissNotificationBanner(
  state: NewOrderNotificationControllerState,
  orderId: string,
): NewOrderNotificationControllerState {
  return {
    ...state,
    banners: state.banners.filter((banner) => banner.id !== orderId),
    soundQueue: [],
    pollImmediately: false,
  };
}

export function markVisibilityPaused(
  state: NewOrderNotificationControllerState,
): NewOrderNotificationControllerState {
  if (
    state.status === "unauthorized" ||
    state.status === "forbidden" ||
    state.stopPolling
  ) {
    return { ...state, soundQueue: [], pollImmediately: false };
  }

  return {
    ...state,
    status: "paused",
    soundQueue: [],
    pollImmediately: false,
  };
}

export function markVisibilityResumed(
  state: NewOrderNotificationControllerState,
): NewOrderNotificationControllerState {
  if (
    state.status === "unauthorized" ||
    state.status === "forbidden" ||
    state.stopPolling
  ) {
    return { ...state, soundQueue: [], pollImmediately: false };
  }

  return {
    ...state,
    status: state.hasCompletedBootstrap ? "active" : "bootstrapping",
    soundQueue: [],
    pollImmediately: true,
  };
}

export function beginBootstrapping(
  state: NewOrderNotificationControllerState,
): NewOrderNotificationControllerState {
  return {
    ...state,
    status: "bootstrapping",
    soundQueue: [],
    pollImmediately: false,
    stopPolling: false,
  };
}

/**
 * Builds the action input. After empty-store bootstrap (cursor null),
 * uses a synthetic early cursor so the first DIRECT is detected via delta
 * instead of being swallowed by another bootstrap tip.
 */
export function buildPollInput(
  state: NewOrderNotificationControllerState,
): Record<string, never> | { afterCreatedAt: string; afterId: string } {
  if (!state.hasCompletedBootstrap || state.status === "bootstrapping") {
    return {};
  }

  if (state.cursor == null) {
    return {
      afterCreatedAt: EMPTY_STORE_DELTA_CURSOR.afterCreatedAt,
      afterId: EMPTY_STORE_DELTA_CURSOR.afterId,
    };
  }

  return {
    afterCreatedAt: state.cursor.createdAt,
    afterId: state.cursor.id,
  };
}
