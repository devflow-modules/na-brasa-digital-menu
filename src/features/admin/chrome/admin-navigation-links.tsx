"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isAdminNavigationItemActive,
  type AdminNavigationItem,
} from "@/features/admin/chrome/admin-navigation";

type AdminNavigationLinksProps = {
  items: AdminNavigationItem[];
};

export function AdminNavigationLinks({ items }: AdminNavigationLinksProps) {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Navegação do painel da loja"
      data-testid="admin-primary-nav"
      className="mt-3"
    >
      {/* Thin scrollbar kept visible as mobile overflow affordance (no drawer/JS). */}
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {items.map((item) => {
          const active = isAdminNavigationItemActive(pathname, item);

          return (
            <li key={item.id} className="shrink-0">
              <Link
                href={item.href}
                data-testid={item.testId}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 ${
                  active
                    ? "border-orange-500/60 bg-orange-500 text-stone-950"
                    : "border-stone-700 bg-stone-900 text-stone-100 hover:bg-stone-800"
                }`}
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
