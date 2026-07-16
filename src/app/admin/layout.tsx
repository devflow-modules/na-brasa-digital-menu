import type { ReactNode } from "react";
import { AdminNewOrderNotificationsProvider } from "@/features/admin/orders/new-order-notifications/admin-new-order-notifications-provider";

type AdminLayoutProps = {
  children: ReactNode;
};

/**
 * Shared admin shell for notification chrome.
 * Login stays under this layout; the provider no-ops on UNAUTHORIZED
 * (no polling loop, no redirect).
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminNewOrderNotificationsProvider>
      {children}
    </AdminNewOrderNotificationsProvider>
  );
}
