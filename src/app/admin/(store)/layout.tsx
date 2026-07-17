import type { ReactNode } from "react";
import { formatAdminRoleLabel } from "@/features/admin/auth/admin-permissions";
import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { AdminChrome } from "@/features/admin/chrome/admin-chrome";
import { getVisibleAdminNavigationItems } from "@/features/admin/chrome/admin-navigation";
import { AdminOrdersRefreshCoordinator } from "@/features/admin/orders/live-refresh/admin-orders-refresh-coordinator";

type AdminStoreLayoutProps = {
  children: ReactNode;
};

/**
 * Authenticated tenant shell. Login stays at /admin/login (outside this group).
 * Authorization remains on each page/action — chrome only controls link visibility.
 */
export default async function AdminStoreLayout({
  children,
}: AdminStoreLayoutProps) {
  const context = await requireAdminStoreContext();
  const items = getVisibleAdminNavigationItems(context.role);

  return (
    <AdminChrome
      storeName={context.storeName}
      userName={context.session.name}
      userEmail={context.session.email}
      roleLabel={formatAdminRoleLabel(context.role)}
      items={items}
    >
      <AdminOrdersRefreshCoordinator>{children}</AdminOrdersRefreshCoordinator>
    </AdminChrome>
  );
}
