import type { UserRole } from "@prisma/client";
import {
  canCreateOrder,
  canManageMenu,
  canManageStoreSettings,
  canReadReports,
  canToggleProductAvailability,
  getAdminMenuNavLabel,
  hasAdminPermission,
} from "@/features/admin/auth/admin-permissions";

/**
 * UI visibility for shared admin chrome.
 * Does not replace route guards or server-side authorization.
 */
export type AdminNavigationMatch = "exact" | "prefix" | "orders";

export type AdminNavigationItemId =
  | "orders"
  | "counter"
  | "reports"
  | "menu"
  | "settings";

export type AdminNavigationItem = {
  id: AdminNavigationItemId;
  label: string;
  href: string;
  match: AdminNavigationMatch;
  testId: string;
};

/**
 * Single source of truth for desktop and mobile admin navigation.
 * Platform /master stays outside this config. MASTER does not receive
 * implicit tenant chrome until an explicit Store selection exists.
 */
export const ADMIN_NAVIGATION_ITEMS: readonly AdminNavigationItem[] = [
  {
    id: "orders",
    label: "Pedidos",
    href: "/admin",
    match: "orders",
    testId: "admin-orders-nav-link",
  },
  {
    id: "counter",
    label: "Balcão",
    href: "/admin/balcao",
    match: "prefix",
    testId: "admin-counter-nav-link",
  },
  {
    id: "reports",
    label: "Relatórios",
    href: "/admin/relatorios/fechamento",
    match: "prefix",
    testId: "admin-reports-nav-link",
  },
  {
    id: "menu",
    label: "Cardápio",
    href: "/admin/cardapio",
    match: "prefix",
    testId: "admin-menu-nav-link",
  },
  {
    id: "settings",
    label: "Configurações",
    href: "/admin/configuracoes",
    match: "prefix",
    testId: "admin-settings-nav-link",
  },
] as const;

/**
 * Strip trailing slashes for active-route comparison.
 * Does not touch query strings (pathname-only input).
 */
export function normalizeAdminPathname(pathname: string): string {
  if (pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "") || "/";
}

/**
 * Chrome visibility rules (operational utility).
 * - Pedidos: orders.read
 * - Balcão: orders.create
 * - Relatórios: reports.read
 * - Cardápio: manage menu OR toggle availability (hides read-only KITCHEN)
 * - Configurações: manage settings (update or toggle open; hides read-only KITCHEN)
 *
 * Page guards may still allow URL access when a link is hidden (UI ≠ auth).
 */
export function isAdminNavigationItemVisible(
  role: UserRole,
  itemId: AdminNavigationItemId,
): boolean {
  switch (itemId) {
    case "orders":
      return hasAdminPermission(role, "orders.read");
    case "counter":
      return canCreateOrder(role);
    case "reports":
      return canReadReports(role);
    case "menu":
      return canManageMenu(role) || canToggleProductAvailability(role);
    case "settings":
      return canManageStoreSettings(role);
    default:
      return false;
  }
}

export function getVisibleAdminNavigationItems(
  role: UserRole,
): AdminNavigationItem[] {
  return ADMIN_NAVIGATION_ITEMS.filter((item) =>
    isAdminNavigationItemVisible(role, item.id),
  ).map((item) => {
    if (item.id === "menu") {
      return {
        ...item,
        label: getAdminMenuNavLabel(role),
      };
    }
    return { ...item };
  });
}

export type AdminSafeDestination = {
  href: string;
  label: string;
};

/**
 * First permitted chrome destination for access-denied recovery.
 * Reuses the shared navigation config — does not invent a second matrix.
 * Falls back to `/admin` when the role has no visible items.
 */
export function getAdminSafeDestination(role: UserRole): AdminSafeDestination {
  const first = getVisibleAdminNavigationItems(role)[0];

  if (!first) {
    return {
      href: "/admin",
      label: "Voltar para Pedidos",
    };
  }

  const areaLabel =
    first.id === "orders"
      ? "Pedidos"
      : first.id === "menu"
        ? "Cardápio"
        : first.id === "reports"
          ? "Relatórios"
          : first.label;

  return {
    href: first.href,
    label: `Voltar para ${areaLabel}`,
  };
}

/**
 * Active route rules (after trailing-slash normalization):
 * - Pedidos: exact `/admin` OR `/admin/pedidos/*` (not other `/admin/*`)
 * - Others: href exact or controlled prefix with segment boundary (`href/`)
 *
 * Prefix match treats any path under `href/` as active (e.g. `/admin/cardapio/adicionais-extra`).
 */
export function isAdminNavigationItemActive(
  pathname: string,
  item: Pick<AdminNavigationItem, "href" | "match">,
): boolean {
  const normalized = normalizeAdminPathname(pathname);

  if (item.match === "exact") {
    return normalized === item.href;
  }

  if (item.match === "orders") {
    return (
      normalized === "/admin" || normalized.startsWith("/admin/pedidos/")
    );
  }

  return (
    normalized === item.href || normalized.startsWith(`${item.href}/`)
  );
}
