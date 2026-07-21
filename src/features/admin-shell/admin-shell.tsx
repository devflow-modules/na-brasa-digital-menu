import type { ReactNode } from "react";
import type { AdminNavigationItem } from "@/features/admin/chrome/admin-navigation";
import { AdminHeader } from "@/features/admin-shell/admin-header";

type AdminShellProps = {
  storeName: string;
  userName: string;
  userEmail: string;
  roleLabel: string;
  items: AdminNavigationItem[];
  children: ReactNode;
};

/**
 * Compact authenticated admin shell (tenant).
 * Login stays outside the (store) route group — never renders here.
 * Sound/pending chrome is composed from AdminNotificationChromeContext.
 */
export function AdminShell({
  storeName,
  userName,
  userEmail,
  roleLabel,
  items,
  children,
}: AdminShellProps) {
  return (
    <div
      data-testid="admin-chrome-root"
      className="min-h-screen bg-stone-950 text-stone-100"
    >
      <AdminHeader
        storeName={storeName}
        userName={userName}
        userEmail={userEmail}
        roleLabel={roleLabel}
        items={items}
      />
      {children}
    </div>
  );
}
