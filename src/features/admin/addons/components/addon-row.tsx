"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleAddonActiveAction } from "@/features/admin/addons/actions/toggle-addon-active-action";
import { formatAdminPriceCents } from "@/features/admin/menu/admin-menu-formatters";
import type {
  AdminAddon,
  AdminAddonLinkProductOption,
} from "@/features/admin/addons/admin-addons.types";
import { AddonForm } from "@/features/admin/addons/components/addon-form";
import { AddonProductLinks } from "@/features/admin/addons/components/addon-product-links";

type AddonRowProps = {
  addon: AdminAddon;
  products: AdminAddonLinkProductOption[];
  canUpdate: boolean;
  canToggle: boolean;
  canLink: boolean;
  canUnlink: boolean;
  isEditing: boolean;
  isLinksOpen: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onToggleLinks: () => void;
};

export function AddonRow({
  addon,
  products,
  canUpdate,
  canToggle,
  canLink,
  canUnlink,
  isEditing,
  isLinksOpen,
  onEdit,
  onCancelEdit,
  onToggleLinks,
}: AddonRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const linkCount = addon.linkedProducts.length;
  const canManageLinks = canLink || canUnlink;

  function toggleActive() {
    startTransition(async () => {
      const result = await toggleAddonActiveAction({
        addonId: addon.id,
        active: !addon.active,
      });
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <li
      data-testid={`admin-addon-${addon.id}`}
      data-editing={isEditing ? "true" : "false"}
      data-links-open={isLinksOpen ? "true" : "false"}
      className="rounded-xl border border-stone-800 bg-stone-950/60 p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-stone-100">{addon.name}</p>
          <p className="mt-1 text-sm text-stone-400">
            <span className="font-semibold text-orange-200">
              {formatAdminPriceCents(addon.priceCents)}
            </span>
            {" · "}
            <span data-testid={`admin-addon-status-${addon.id}`}>
              {addon.active ? "Ativo" : "Inativo"}
            </span>
            {" · "}
            <span data-testid={`admin-addon-link-count-${addon.id}`}>
              {linkCount}{" "}
              {linkCount === 1 ? "produto vinculado" : "produtos vinculados"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid={`admin-addon-toggle-links-${addon.id}`}
            aria-expanded={isLinksOpen}
            onClick={onToggleLinks}
            className="h-9 rounded-lg border border-stone-700 px-3 text-xs font-medium text-stone-200"
          >
            {canManageLinks ? "Vínculos" : "Ver vínculos"}
          </button>
          {canUpdate ? (
            <button
              type="button"
              data-testid={`admin-addon-edit-${addon.id}`}
              disabled={isEditing}
              onClick={onEdit}
              className="h-9 rounded-lg border border-orange-500/50 px-3 text-xs font-medium text-orange-100 disabled:opacity-60"
            >
              Editar
            </button>
          ) : null}
          {canToggle ? (
            <button
              type="button"
              data-testid={`admin-addon-toggle-active-${addon.id}`}
              disabled={isPending}
              onClick={toggleActive}
              className="h-9 rounded-lg border border-amber-500/40 px-3 text-xs font-medium text-amber-100 disabled:opacity-60"
            >
              {addon.active ? "Desativar" : "Ativar"}
            </button>
          ) : null}
        </div>
      </div>

      {isLinksOpen ? (
        <div className="mt-4 border-t border-stone-800 pt-4">
          <AddonProductLinks
            addon={addon}
            products={products}
            canLink={canLink}
            canUnlink={canUnlink}
          />
        </div>
      ) : null}

      {isEditing && canUpdate ? (
        <div className="mt-4 border-t border-stone-800 pt-4">
          <AddonForm
            mode="edit"
            addon={addon}
            canSubmit={canUpdate}
            onCancel={onCancelEdit}
          />
        </div>
      ) : null}
    </li>
  );
}
