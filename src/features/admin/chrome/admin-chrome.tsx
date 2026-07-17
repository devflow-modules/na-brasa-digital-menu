import type { ReactNode } from "react";
import { LogoutButton } from "@/features/admin/auth/components/logout-button";
import { AdminNavigationLinks } from "@/features/admin/chrome/admin-navigation-links";
import type { AdminNavigationItem } from "@/features/admin/chrome/admin-navigation";

type AdminChromeProps = {
  storeName: string;
  userName: string;
  userEmail: string;
  roleLabel: string;
  items: AdminNavigationItem[];
  children: ReactNode;
};

/**
 * Shared authenticated admin shell (tenant).
 * Login stays outside the (store) route group — never renders here.
 * PENDING badge remains in AdminNewOrderNotificationsProvider above this chrome.
 */
export function AdminChrome({
  storeName,
  userName,
  userEmail,
  roleLabel,
  items,
  children,
}: AdminChromeProps) {
  const identitySecondary = userName.trim() || userEmail;

  return (
    <div
      data-testid="admin-chrome-root"
      className="min-h-screen bg-stone-950 text-stone-100"
    >
      <header
        data-testid="admin-chrome"
        className="border-b border-stone-800 bg-stone-950/95"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-orange-300/80">
                Área restrita · Store-scoped
              </p>
              <p
                data-testid="admin-chrome-store-name"
                className="mt-1 truncate text-lg font-semibold text-orange-50 sm:text-xl"
              >
                {storeName}
              </p>
              <p
                data-testid="admin-chrome-user-meta"
                className="mt-1 text-xs text-stone-500"
              >
                {roleLabel} · {identitySecondary}
              </p>
            </div>
            <LogoutButton className="border-stone-700 bg-stone-900 text-stone-100 hover:bg-stone-800" />
          </div>

          <AdminNavigationLinks items={items} />
        </div>
      </header>

      {children}
    </div>
  );
}
