import type { AdminNewOrderCursor } from "@/features/admin/orders/admin-orders.types";

export type { AdminNewOrderCursor };

export type AdminNewOrderCursorPoint = {
  createdAt: Date;
  id: string;
};

/**
 * Lexicographic order: createdAt ASC, then id ASC.
 * Do not treat cuid as a clock — id is only a tie-break.
 */
export function compareAdminNewOrderCursors(
  a: AdminNewOrderCursorPoint,
  b: AdminNewOrderCursorPoint,
): number {
  const byTime = a.createdAt.getTime() - b.createdAt.getTime();
  if (byTime !== 0) {
    return byTime;
  }
  if (a.id < b.id) {
    return -1;
  }
  if (a.id > b.id) {
    return 1;
  }
  return 0;
}

export function isAdminNewOrderCursorAfter(
  candidate: AdminNewOrderCursorPoint,
  cursor: AdminNewOrderCursorPoint,
): boolean {
  return compareAdminNewOrderCursors(candidate, cursor) > 0;
}

export function cursorPointFromOrder(order: {
  createdAt: Date;
  id: string;
}): AdminNewOrderCursorPoint {
  return { createdAt: order.createdAt, id: order.id };
}

export function serializeAdminNewOrderCursor(
  point: AdminNewOrderCursorPoint,
): AdminNewOrderCursor {
  return {
    createdAt: point.createdAt.toISOString(),
    id: point.id,
  };
}

export function parseAdminNewOrderCursorPoint(
  cursor: AdminNewOrderCursor,
): AdminNewOrderCursorPoint | null {
  const createdAt = new Date(cursor.createdAt);
  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }
  if (!cursor.id.trim()) {
    return null;
  }
  return { createdAt, id: cursor.id };
}

/**
 * Advances to the last item in an already-ordered ASC list.
 * Empty list keeps the previous cursor (never regresses).
 */
export function advanceAdminNewOrderCursor(
  previous: AdminNewOrderCursorPoint | null,
  orderedOrders: ReadonlyArray<{ createdAt: Date; id: string }>,
): AdminNewOrderCursorPoint | null {
  if (orderedOrders.length === 0) {
    return previous;
  }

  const last = cursorPointFromOrder(orderedOrders[orderedOrders.length - 1]!);
  if (!previous) {
    return last;
  }

  return compareAdminNewOrderCursors(last, previous) >= 0 ? last : previous;
}

export function dedupeOrdersById<T extends { id: string }>(
  orders: ReadonlyArray<T>,
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const order of orders) {
    if (seen.has(order.id)) {
      continue;
    }
    seen.add(order.id);
    result.push(order);
  }
  return result;
}

/**
 * Prisma-compatible where fragment for DIRECT orders after a cursor.
 * Callers must AND with storeId (and keep source = DIRECT).
 */
export function buildDirectOrdersAfterCursorWhere(cursor: AdminNewOrderCursorPoint): {
  OR: Array<
    | { createdAt: { gt: Date } }
    | { AND: Array<{ createdAt: Date } | { id: { gt: string } }> }
  >;
} {
  return {
    OR: [
      { createdAt: { gt: cursor.createdAt } },
      {
        AND: [{ createdAt: cursor.createdAt }, { id: { gt: cursor.id } }],
      },
    ],
  };
}
