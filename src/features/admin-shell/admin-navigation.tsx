"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isAdminNavigationItemActive,
  type AdminNavigationItem,
} from "@/features/admin/chrome/admin-navigation";

type AdminNavigationProps = {
  items: AdminNavigationItem[];
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
};

const activeClass = "border-orange-500/60 bg-orange-500 text-stone-950";
const idleClass =
  "border-transparent text-stone-200 hover:bg-stone-800/80 hover:text-orange-50";

export function AdminNavigation({
  items,
  variant,
  onNavigate,
}: AdminNavigationProps) {
  const pathname = usePathname() ?? "";
  const isMobile = variant === "mobile";

  return (
    <nav
      aria-label="Navegação do painel da loja"
      data-testid={isMobile ? "admin-mobile-nav" : "admin-primary-nav"}
    >
      <ul
        className={
          isMobile
            ? "flex flex-col gap-1 py-2"
            : "flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin]"
        }
      >
        {items.map((item) => {
          const active = isAdminNavigationItemActive(pathname, item);
          return (
            <li key={item.id} className={isMobile ? undefined : "shrink-0"}>
              <Link
                href={item.href}
                data-testid={item.testId}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={[
                  "items-center rounded-[10px] border text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70",
                  isMobile
                    ? "flex min-h-11 px-3.5"
                    : "inline-flex h-9 justify-center px-3.5",
                  active ? activeClass : idleClass,
                ].join(" ")}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
