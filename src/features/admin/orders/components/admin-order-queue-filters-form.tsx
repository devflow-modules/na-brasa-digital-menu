"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import {
  ADMIN_ORDER_QUEUE_Q_MAX,
  adminOrderSourceValues,
  hasAdminOrderQueueFilters,
  type AdminOrderQueueFilters,
} from "@/features/admin/orders/admin-order-queue-filters";
import { adminOrderStatusValues } from "@/features/admin/orders/admin-order-status.schema";
import {
  formatOrderSource,
  formatOrderStatus,
} from "@/features/admin/orders/admin-orders-formatters";

type AdminOrderQueueFiltersFormProps = {
  filters: AdminOrderQueueFilters;
};

/**
 * GET filters with canonical URLs (omit empty params). Client only for submit
 * navigation — searchParams from the server remain the source of truth.
 */
export function AdminOrderQueueFiltersForm({
  filters,
}: AdminOrderQueueFiltersFormProps) {
  const router = useRouter();
  const filtersActive = hasAdminOrderQueueFilters(filters);
  const formKey = [
    filters.status ?? "",
    filters.source ?? "",
    filters.q ?? "",
  ].join("|");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const key of ["status", "source", "q"] as const) {
      const value = String(formData.get(key) ?? "").trim();
      if (value.length > 0) {
        params.set(key, value);
      }
    }

    const query = params.toString();
    router.push(query.length > 0 ? `/admin?${query}` : "/admin");
  }

  return (
    <form
      key={formKey}
      method="GET"
      action="/admin"
      onSubmit={onSubmit}
      data-testid="admin-orders-filters"
      className="rounded-2xl border border-stone-800 bg-stone-900/50 p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-sm text-stone-300">
          <span className="font-medium text-stone-200">Status</span>
          <select
            name="status"
            data-testid="admin-orders-filter-status"
            defaultValue={filters.status ?? ""}
            className="h-11 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            <option value="">Todos</option>
            {adminOrderStatusValues.map((status) => (
              <option key={status} value={status}>
                {formatOrderStatus(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-stone-300">
          <span className="font-medium text-stone-200">Origem</span>
          <select
            name="source"
            data-testid="admin-orders-filter-source"
            defaultValue={filters.source ?? ""}
            className="h-11 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            <option value="">Todas</option>
            {adminOrderSourceValues.map((source) => (
              <option key={source} value={source}>
                {formatOrderSource(source)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-stone-300 sm:col-span-2 lg:col-span-1">
          <span className="font-medium text-stone-200">
            Buscar por código ou cliente
          </span>
          <input
            type="search"
            name="q"
            data-testid="admin-orders-filter-q"
            defaultValue={filters.q ?? ""}
            maxLength={ADMIN_ORDER_QUEUE_Q_MAX}
            autoComplete="off"
            placeholder="Ex.: código ou nome"
            className="h-11 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          />
        </label>

        <div className="flex flex-col justify-end gap-2 sm:col-span-2 lg:col-span-1">
          <button
            type="submit"
            data-testid="admin-orders-filter-apply"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            Aplicar
          </button>
          {filtersActive ? (
            <Link
              href="/admin"
              data-testid="admin-orders-filter-clear"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-700 bg-stone-950 px-4 text-sm font-semibold text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              Limpar filtros
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}
