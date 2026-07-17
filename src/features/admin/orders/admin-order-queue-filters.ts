import { z } from "zod";
import { adminOrderStatusValues } from "@/features/admin/orders/admin-order-status.schema";
import type {
  AdminOrderSource,
  AdminOrderStatus,
} from "@/features/admin/orders/admin-orders.types";

export const ADMIN_ORDER_QUEUE_Q_MAX = 64;

export const adminOrderSourceValues = [
  "DIRECT",
  "COUNTER",
  "IFOOD",
  "OTHER",
] as const satisfies readonly AdminOrderSource[];

export type AdminOrderQueueFilters = {
  status?: AdminOrderStatus;
  source?: AdminOrderSource;
  q?: string;
};

export type AdminOrderQueueSearchParamsInput = {
  [key: string]: string | string[] | undefined;
};

const statusSchema = z.enum(adminOrderStatusValues);
const sourceSchema = z.enum(adminOrderSourceValues);

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Parse queue filters from URL searchParams.
 * Invalid values are ignored individually (fail-soft) — never throws.
 * Do not log `q` (may contain customer names / PII).
 */
export function parseAdminOrderQueueSearchParams(
  input: AdminOrderQueueSearchParamsInput,
): AdminOrderQueueFilters {
  const filters: AdminOrderQueueFilters = {};

  const rawStatus = firstParam(input.status);
  if (rawStatus != null && rawStatus.trim() !== "") {
    const parsed = statusSchema.safeParse(rawStatus.trim());
    if (parsed.success) {
      filters.status = parsed.data;
    }
  }

  const rawSource = firstParam(input.source);
  if (rawSource != null && rawSource.trim() !== "") {
    const parsed = sourceSchema.safeParse(rawSource.trim());
    if (parsed.success) {
      filters.source = parsed.data;
    }
  }

  const rawQ = firstParam(input.q);
  if (rawQ != null) {
    const trimmed = rawQ.trim();
    if (trimmed.length > 0 && trimmed.length <= ADMIN_ORDER_QUEUE_Q_MAX) {
      filters.q = trimmed;
    }
  }

  return filters;
}

export function hasAdminOrderQueueFilters(
  filters: AdminOrderQueueFilters,
): boolean {
  return (
    filters.status != null || filters.source != null || filters.q != null
  );
}

/**
 * Tenant-scoped Prisma where for the admin queue.
 * Always includes storeId; optional status/source AND; q OR code|name.
 */
export function buildAdminOrderQueueWhere(
  storeId: string,
  filters: AdminOrderQueueFilters,
): {
  storeId: string;
  status?: AdminOrderStatus;
  source?: AdminOrderSource;
  OR?: Array<
    | { code: { contains: string; mode: "insensitive" } }
    | { customerName: { contains: string; mode: "insensitive" } }
  >;
} {
  return {
    storeId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.q
      ? {
          OR: [
            { code: { contains: filters.q, mode: "insensitive" as const } },
            {
              customerName: {
                contains: filters.q,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };
}
