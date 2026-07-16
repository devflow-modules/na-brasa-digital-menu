import {
  ADMIN_NEW_ORDERS_TAKE,
  countPendingOrdersForStore,
  findLatestDirectOrderCursor,
  listDirectOrdersAfterCursor,
  type AdminNewOrderRow,
} from "@/features/admin/orders/admin-orders.repository";
import type {
  AdminNewOrderCursor,
  AdminNewOrderNotificationItem,
} from "@/features/admin/orders/admin-orders.types";
import {
  advanceAdminNewOrderCursor,
  dedupeOrdersById,
  parseAdminNewOrderCursorPoint,
  serializeAdminNewOrderCursor,
  type AdminNewOrderCursorPoint,
} from "@/features/admin/orders/new-order-cursor";
import { pollNewAdminOrdersSchema } from "@/features/admin/orders/poll-new-admin-orders.schema";

export type PollNewAdminOrdersSuccess = {
  ok: true;
  mode: "bootstrap" | "delta";
  cursor: AdminNewOrderCursor | null;
  orders: AdminNewOrderNotificationItem[];
  pendingCount: number;
  hasMore: boolean;
};

export type PollNewAdminOrdersFailure = {
  ok: false;
  code: "INVALID_CURSOR";
};

export type PollNewAdminOrdersResult =
  | PollNewAdminOrdersSuccess
  | PollNewAdminOrdersFailure;

export type PollNewAdminOrdersDeps = {
  findLatestDirectOrderCursor: typeof findLatestDirectOrderCursor;
  listDirectOrdersAfterCursor: typeof listDirectOrdersAfterCursor;
  countPendingOrdersForStore: typeof countPendingOrdersForStore;
};

const defaultDeps: PollNewAdminOrdersDeps = {
  findLatestDirectOrderCursor,
  listDirectOrdersAfterCursor,
  countPendingOrdersForStore,
};

function toNotificationItem(
  order: AdminNewOrderRow,
): AdminNewOrderNotificationItem {
  return {
    id: order.id,
    code: order.code,
    source: "DIRECT",
    status: order.status,
    customerName: order.customerName,
    totalCents: order.totalCents,
    createdAt: order.createdAt.toISOString(),
  };
}

/**
 * Bootstrap (no cursor) or delta (full cursor) for admin new DIRECT orders.
 * storeId must come from authenticated context — never from client input.
 */
export async function pollNewAdminOrders(
  storeId: string,
  rawInput: unknown,
  deps: PollNewAdminOrdersDeps = defaultDeps,
): Promise<PollNewAdminOrdersResult> {
  const parsed = pollNewAdminOrdersSchema.safeParse(rawInput ?? {});

  if (!parsed.success) {
    return { ok: false, code: "INVALID_CURSOR" };
  }

  const { afterCreatedAt, afterId } = parsed.data;
  const pendingCount = await deps.countPendingOrdersForStore(storeId);

  if (afterCreatedAt === undefined || afterId === undefined) {
    const tip = await deps.findLatestDirectOrderCursor(storeId);
    return {
      ok: true,
      mode: "bootstrap",
      cursor: tip ? serializeAdminNewOrderCursor(tip) : null,
      orders: [],
      pendingCount,
      hasMore: false,
    };
  }

  const cursorPoint = parseAdminNewOrderCursorPoint({
    createdAt: afterCreatedAt,
    id: afterId,
  });

  if (!cursorPoint) {
    return { ok: false, code: "INVALID_CURSOR" };
  }

  const fetched = await deps.listDirectOrdersAfterCursor(
    storeId,
    cursorPoint,
    ADMIN_NEW_ORDERS_TAKE + 1,
  );

  const hasMore = fetched.length > ADMIN_NEW_ORDERS_TAKE;
  const page = dedupeOrdersById(fetched).slice(0, ADMIN_NEW_ORDERS_TAKE);
  const nextCursorPoint: AdminNewOrderCursorPoint | null =
    advanceAdminNewOrderCursor(cursorPoint, page);

  return {
    ok: true,
    mode: "delta",
    cursor: nextCursorPoint
      ? serializeAdminNewOrderCursor(nextCursorPoint)
      : serializeAdminNewOrderCursor(cursorPoint),
    orders: page.map(toNotificationItem),
    pendingCount,
    hasMore,
  };
}
