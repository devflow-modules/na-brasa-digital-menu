import type { UserRole } from "@prisma/client";
import type {
  AdminDeliveryType,
  AdminOrderStatus,
} from "@/features/admin/orders/admin-orders.types";
import {
  getOrderStatusActions,
  isTransitionAllowed,
  type OrderStatusAction,
} from "@/features/admin/orders/admin-order-status-transitions";

export type AdminPermission =
  | "orders.read"
  | "orders.status.confirm"
  | "orders.status.prepare"
  | "orders.status.ready"
  | "orders.status.dispatch"
  | "orders.status.complete"
  | "orders.status.cancel"
  | "menu.read"
  | "menu.product.create"
  | "menu.product.update"
  | "menu.product.toggleAvailability"
  | "menu.product.toggleActive"
  | "menu.category.create"
  | "menu.category.update";

const ORDER_PERMISSIONS = [
  "orders.read",
  "orders.status.confirm",
  "orders.status.prepare",
  "orders.status.ready",
  "orders.status.dispatch",
  "orders.status.complete",
  "orders.status.cancel",
] as const satisfies readonly AdminPermission[];

const MENU_PERMISSIONS = [
  "menu.read",
  "menu.product.create",
  "menu.product.update",
  "menu.product.toggleAvailability",
  "menu.product.toggleActive",
  "menu.category.create",
  "menu.category.update",
] as const satisfies readonly AdminPermission[];

const ORDER_AND_MENU_PERMISSIONS: readonly AdminPermission[] = [
  ...ORDER_PERMISSIONS,
  ...MENU_PERMISSIONS,
];

const ROLE_PERMISSIONS: Record<UserRole, readonly AdminPermission[]> = {
  MASTER: ORDER_AND_MENU_PERMISSIONS,
  STORE_OWNER: ORDER_AND_MENU_PERMISSIONS,
  MANAGER: ORDER_AND_MENU_PERMISSIONS,
  OPERATOR: [
    "orders.read",
    "orders.status.confirm",
    "orders.status.prepare",
    "orders.status.ready",
    "orders.status.dispatch",
    "orders.status.complete",
    "menu.read",
    "menu.product.toggleAvailability",
  ],
  KITCHEN: [
    "orders.read",
    "orders.status.prepare",
    "orders.status.ready",
    "menu.read",
  ],
};

const NEXT_STATUS_PERMISSION: Partial<
  Record<AdminOrderStatus, AdminPermission>
> = {
  CONFIRMED: "orders.status.confirm",
  PREPARING: "orders.status.prepare",
  READY: "orders.status.ready",
  OUT_FOR_DELIVERY: "orders.status.dispatch",
  COMPLETED: "orders.status.complete",
  CANCELLED: "orders.status.cancel",
};

export const ADMIN_PERMISSION_DENIED_MESSAGE =
  "Você não tem permissão para executar esta ação.";

export function getAdminPermissions(role: UserRole): readonly AdminPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasAdminPermission(
  role: UserRole,
  permission: AdminPermission,
): boolean {
  return getAdminPermissions(role).includes(permission);
}

export function canReadMenu(role: UserRole): boolean {
  return hasAdminPermission(role, "menu.read");
}

export function canCreateMenuProduct(role: UserRole): boolean {
  return hasAdminPermission(role, "menu.product.create");
}

export function canUpdateMenuProduct(role: UserRole): boolean {
  return hasAdminPermission(role, "menu.product.update");
}

export function canToggleProductAvailability(role: UserRole): boolean {
  return hasAdminPermission(role, "menu.product.toggleAvailability");
}

export function canToggleProductActive(role: UserRole): boolean {
  return hasAdminPermission(role, "menu.product.toggleActive");
}

export function canManageMenuCategories(role: UserRole): boolean {
  return (
    hasAdminPermission(role, "menu.category.create") &&
    hasAdminPermission(role, "menu.category.update")
  );
}

export function canManageMenu(role: UserRole): boolean {
  return (
    canCreateMenuProduct(role) ||
    canUpdateMenuProduct(role) ||
    canManageMenuCategories(role)
  );
}

export function getAdminMenuNavLabel(role: UserRole): string {
  return canManageMenu(role) ? "Gerenciar cardápio" : "Ver cardápio";
}

/**
 * Authorization layer on top of existing transition rules.
 * Does not replace isTransitionAllowed — both must pass.
 */
export function canTransitionOrderStatus(
  role: UserRole,
  currentStatus: AdminOrderStatus,
  nextStatus: AdminOrderStatus,
  deliveryType: AdminDeliveryType,
): boolean {
  if (!isTransitionAllowed(currentStatus, nextStatus, deliveryType)) {
    return false;
  }

  const permission = NEXT_STATUS_PERMISSION[nextStatus];
  if (!permission) {
    return false;
  }

  return hasAdminPermission(role, permission);
}

export function formatAdminRoleLabel(role: UserRole): string {
  switch (role) {
    case "MASTER":
      return "Master";
    case "STORE_OWNER":
      return "Dono da loja";
    case "MANAGER":
      return "Gerente";
    case "OPERATOR":
      return "Operador";
    case "KITCHEN":
      return "Cozinha";
    default:
      return role;
  }
}

/** Transition actions allowed by both workflow rules and role permissions. */
export function getPermittedOrderStatusActions(
  role: UserRole,
  currentStatus: AdminOrderStatus,
  deliveryType: AdminDeliveryType,
): OrderStatusAction[] {
  return getOrderStatusActions(currentStatus, deliveryType).filter((action) =>
    canTransitionOrderStatus(
      role,
      currentStatus,
      action.nextStatus,
      deliveryType,
    ),
  );
}
