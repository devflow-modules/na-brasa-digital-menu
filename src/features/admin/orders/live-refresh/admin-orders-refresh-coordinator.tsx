"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  createAdminOrdersRefreshScheduler,
  shouldApplyAdminOrdersRefresh,
  subscribeAdminOrdersRefresh,
  type AdminOrdersRefreshReason,
} from "@/features/admin/orders/live-refresh/admin-orders-refresh";

type AdminOrdersRefreshCoordinatorProps = {
  children: ReactNode;
};

/**
 * Listens for queue refresh signals and calls router.refresh() once (debounced).
 * Mounted only under the authenticated store shell so login never refreshes.
 *
 * The "Atualizando pedidos…" indicator means a refresh was requested — not that
 * RSC data has finished arriving (router.refresh has no completion callback).
 */
export function AdminOrdersRefreshCoordinator({
  children,
}: AdminOrdersRefreshCoordinatorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let active = true;

    const clearHideTimer = () => {
      if (hideTimer != null) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const scheduler = createAdminOrdersRefreshScheduler({
      refresh: (reason: AdminOrdersRefreshReason) => {
        // Re-check at flush time — pathname may have changed during debounce.
        if (!shouldApplyAdminOrdersRefresh(pathnameRef.current, reason)) {
          return;
        }
        if (!active) {
          return;
        }
        setIsRefreshing(true);
        router.refresh();
        clearHideTimer();
        hideTimer = setTimeout(() => {
          hideTimer = null;
          if (active) {
            setIsRefreshing(false);
          }
        }, 400);
      },
    });

    const unsubscribe = subscribeAdminOrdersRefresh(
      (reason: AdminOrdersRefreshReason) => {
        // Early filter avoids useless timers on Balcão/etc.; flush re-checks.
        if (!shouldApplyAdminOrdersRefresh(pathnameRef.current, reason)) {
          return;
        }
        scheduler.request(reason);
      },
    );

    return () => {
      active = false;
      unsubscribe();
      scheduler.dispose();
      clearHideTimer();
      setIsRefreshing(false);
    };
  }, [router]);

  return (
    <>
      <div
        aria-live="polite"
        data-testid="admin-orders-refresh-status"
        data-refreshing={isRefreshing ? "true" : "false"}
        className={
          isRefreshing
            ? "pointer-events-none px-3 py-1 text-center text-xs text-stone-400 sm:px-4"
            : "sr-only"
        }
      >
        {isRefreshing ? "Atualizando pedidos…" : ""}
      </div>
      {children}
    </>
  );
}
