"use client";

import { useState } from "react";
import { NewOrderPendingBadge } from "@/features/admin/orders/new-order-notifications/new-order-pending-badge";
import { useAdminNotificationChrome } from "@/features/admin/orders/new-order-notifications/admin-notification-chrome-context";
import type { AdminNavigationItem } from "@/features/admin/chrome/admin-navigation";
import { AdminNavigation } from "@/features/admin-shell/admin-navigation";
import { AdminSoundControl } from "@/features/admin-shell/admin-sound-control";
import { AdminUserMenu } from "@/features/admin-shell/admin-user-menu";

type AdminHeaderProps = {
  storeName: string;
  userName: string;
  userEmail: string;
  roleLabel: string;
  items: AdminNavigationItem[];
};

export function AdminHeader({
  storeName,
  userName,
  userEmail,
  roleLabel,
  items,
}: AdminHeaderProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { sessionActive, pendingCount } = useAdminNotificationChrome();

  return (
    <header
      data-testid="admin-chrome"
      className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/95 backdrop-blur"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-2 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              data-testid="admin-mobile-nav-toggle"
              aria-expanded={mobileNavOpen}
              aria-controls="admin-mobile-nav-panel"
              aria-label={mobileNavOpen ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMobileNavOpen((open) => !open)}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-stone-700 bg-stone-900 text-stone-100 md:hidden"
            >
              <span aria-hidden className="text-lg leading-none">
                {mobileNavOpen ? "×" : "☰"}
              </span>
            </button>

            <p
              data-testid="admin-chrome-store-name"
              className="truncate text-base font-semibold text-orange-50 sm:text-lg"
            >
              {storeName} Admin
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {sessionActive && pendingCount > 0 ? (
              <NewOrderPendingBadge
                pendingCount={pendingCount}
                visible={sessionActive}
                compact
              />
            ) : null}
            <AdminSoundControl />
            <AdminUserMenu
              userName={userName}
              userEmail={userEmail}
              roleLabel={roleLabel}
            />
          </div>
        </div>

        <div className="hidden border-t border-stone-800/80 py-2 md:block">
          <AdminNavigation items={items} variant="desktop" />
        </div>

        {mobileNavOpen ? (
          <div
            id="admin-mobile-nav-panel"
            className="border-t border-stone-800 md:hidden"
          >
            <AdminNavigation
              items={items}
              variant="mobile"
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}
