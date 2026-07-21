"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LogoutButton } from "@/features/admin/auth/components/logout-button";

type AdminUserMenuProps = {
  userName: string;
  userEmail: string;
  roleLabel: string;
};

export function AdminUserMenu({
  userName,
  userEmail,
  roleLabel,
}: AdminUserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const displayName = userName.trim() || userEmail;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative" data-testid="admin-user-menu">
      <button
        type="button"
        data-testid="admin-user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 max-w-[12rem] items-center gap-1.5 truncate rounded-[10px] border border-stone-700 bg-stone-900 px-3 text-sm font-medium text-stone-100 hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70"
      >
        <span className="truncate">{displayName}</span>
        <span aria-hidden className="text-stone-500">
          ▾
        </span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          data-testid="admin-user-menu-panel"
          className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-stone-700 bg-stone-900 p-2 shadow-lg"
        >
          <div className="border-b border-stone-800 px-2 py-2">
            <p
              data-testid="admin-chrome-user-meta"
              className="truncate text-sm font-medium text-stone-100"
            >
              {displayName}
            </p>
            <p className="mt-0.5 text-xs text-stone-500">{roleLabel}</p>
          </div>
          <div className="pt-2" role="none">
            <LogoutButton className="h-9 w-full justify-center border-stone-700 bg-stone-950 text-stone-100 hover:bg-stone-800" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
