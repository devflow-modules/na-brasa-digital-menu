"use server";

import { hasAdminPermission } from "@/features/admin/auth/admin-permissions";
import { getAdminStoreContextOrNull } from "@/features/admin/auth/admin-store-context";
import {
  pollNewAdminOrders,
  type PollNewAdminOrdersResult,
} from "@/features/admin/orders/poll-new-admin-orders.service";

export type PollNewAdminOrdersActionResult =
  | PollNewAdminOrdersResult
  | { ok: false; code: "UNAUTHORIZED" }
  | { ok: false; code: "FORBIDDEN" }
  | { ok: false; code: "UNEXPECTED_ERROR" };

export type PollNewAdminOrdersActionDeps = {
  getAdminStoreContextOrNull: typeof getAdminStoreContextOrNull;
  pollNewAdminOrders: typeof pollNewAdminOrders;
};

const defaultDeps: PollNewAdminOrdersActionDeps = {
  getAdminStoreContextOrNull,
  pollNewAdminOrders,
};

/**
 * Soft-auth poll for new DIRECT orders after a cursor.
 * Never redirects; never accepts storeId/source/limit from the client.
 */
export async function pollNewAdminOrdersAction(
  input: unknown = {},
  deps: PollNewAdminOrdersActionDeps = defaultDeps,
): Promise<PollNewAdminOrdersActionResult> {
  try {
    const context = await deps.getAdminStoreContextOrNull();

    if (!context) {
      return { ok: false, code: "UNAUTHORIZED" };
    }

    if (!hasAdminPermission(context.role, "orders.read")) {
      return { ok: false, code: "FORBIDDEN" };
    }

    return await deps.pollNewAdminOrders(context.storeId, input);
  } catch {
    console.error("[pollNewAdminOrdersAction] unexpected error");
    return { ok: false, code: "UNEXPECTED_ERROR" };
  }
}
