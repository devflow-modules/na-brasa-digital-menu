"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { UserRole } from "@prisma/client";
import {
  canCreateMenuAddon,
  canLinkMenuAddonToProduct,
  canReadMenuAddons,
  canToggleMenuAddonActive,
  canUnlinkMenuAddonFromProduct,
  canUpdateMenuAddon,
  formatAdminRoleLabel,
} from "@/features/admin/auth/admin-permissions";
import {
  countAddonCatalog,
  filterAddonCatalog,
  type AddonLinkFilter,
  type AddonStatusFilter,
} from "@/features/admin/addons/addon-catalog-filters";
import type { AdminAddonsCatalog } from "@/features/admin/addons/admin-addons.types";
import { AddonForm } from "@/features/admin/addons/components/addon-form";
import { AddonRow } from "@/features/admin/addons/components/addon-row";

type AddonManagementWorkspaceProps = {
  role: UserRole;
  catalog: AdminAddonsCatalog;
};

export function AddonManagementWorkspace({
  role,
  catalog,
}: AddonManagementWorkspaceProps) {
  const canCreate = canCreateMenuAddon(role);
  const canUpdate = canUpdateMenuAddon(role);
  const canToggle = canToggleMenuAddonActive(role);
  const canLink = canLinkMenuAddonToProduct(role);
  const canUnlink = canUnlinkMenuAddonFromProduct(role);
  const canRead = canReadMenuAddons(role);

  const counters = useMemo(
    () => countAddonCatalog(catalog.addons),
    [catalog.addons],
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AddonStatusFilter>("all");
  const [linkFilter, setLinkFilter] = useState<AddonLinkFilter>("all");
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [linksAddonId, setLinksAddonId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const filteredAddons = useMemo(
    () =>
      filterAddonCatalog(catalog.addons, {
        search,
        status: statusFilter,
        links: linkFilter,
      }),
    [catalog.addons, search, statusFilter, linkFilter],
  );

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    linkFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setLinkFilter("all");
  }

  function openCreate() {
    setShowCreate((value) => !value);
    setEditingAddonId(null);
    setLinksAddonId(null);
  }

  function openEdit(addonId: string) {
    setEditingAddonId(addonId);
    setLinksAddonId(null);
    setShowCreate(false);
  }

  function toggleLinks(addonId: string) {
    setLinksAddonId((current) => (current === addonId ? null : addonId));
    setEditingAddonId(null);
    setShowCreate(false);
  }

  if (!canRead) {
    return null;
  }

  return (
    <div
      data-testid="admin-addons-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 sm:px-6"
    >
      <header className="sticky top-0 z-20 -mx-4 space-y-3 border-b border-stone-800/80 bg-stone-950/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-orange-50 sm:text-3xl">
              Adicionais
            </h1>
            <p
              data-testid="admin-addons-role-note"
              className="mt-1 text-sm text-stone-400"
            >
              Adicionais do cardápio da loja.
            </p>
            <p
              data-testid="admin-addons-counters"
              className="mt-2 text-sm text-stone-300"
            >
              {counters.totalAddons}{" "}
              {counters.totalAddons === 1 ? "adicional" : "adicionais"} ·{" "}
              {counters.activeAddons}{" "}
              {counters.activeAddons === 1 ? "ativo" : "ativos"} ·{" "}
              {counters.totalLinks}{" "}
              {counters.totalLinks === 1 ? "vínculo" : "vínculos"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/cardapio"
              data-testid="admin-addons-back-to-menu"
              className="text-sm font-medium text-orange-300 underline-offset-2 hover:underline"
            >
              Voltar ao cardápio
            </Link>
            {canCreate ? (
              <button
                type="button"
                data-testid="admin-addons-show-create"
                onClick={openCreate}
                className="h-10 rounded-xl bg-orange-500 px-3 text-sm font-semibold text-stone-950"
              >
                + Novo adicional
              </button>
            ) : null}
          </div>
        </div>

        <div
          data-testid="admin-addons-filters"
          className="grid gap-2 sm:grid-cols-3"
        >
          <label className="block text-xs text-stone-400 sm:col-span-1">
            Buscar adicional
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome do adicional"
              data-testid="admin-addons-search"
              className="mt-1 h-10 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
            />
          </label>
          <label className="block text-xs text-stone-400">
            Status
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as AddonStatusFilter)
              }
              data-testid="admin-addons-filter-status"
              className="mt-1 h-10 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </label>
          <label className="block text-xs text-stone-400">
            Vínculo
            <select
              value={linkFilter}
              onChange={(event) =>
                setLinkFilter(event.target.value as AddonLinkFilter)
              }
              data-testid="admin-addons-filter-links"
              className="mt-1 h-10 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
            >
              <option value="all">Todos os vínculos</option>
              <option value="with-links">Com produtos vinculados</option>
              <option value="without-links">Sem produtos vinculados</option>
            </select>
          </label>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            data-testid="admin-addons-clear-filters"
            onClick={clearFilters}
            className="text-sm font-medium text-orange-300 underline-offset-2 hover:underline"
          >
            Limpar filtros
          </button>
        ) : null}
      </header>

      {showCreate && canCreate ? (
        <AddonForm
          mode="create"
          canSubmit={canCreate}
          onCancel={() => setShowCreate(false)}
        />
      ) : null}

      {catalog.addons.length === 0 ? (
        <p
          data-testid="admin-addons-empty"
          className="rounded-2xl border border-dashed border-stone-700 px-5 py-8 text-center text-sm text-stone-400"
        >
          Nenhum adicional cadastrado para esta loja.
        </p>
      ) : filteredAddons.length === 0 ? (
        <div
          data-testid="admin-addons-no-results"
          className="rounded-2xl border border-dashed border-stone-700 px-5 py-8 text-center"
        >
          <p className="text-sm text-stone-300">Nenhum adicional encontrado.</p>
          <button
            type="button"
            data-testid="admin-addons-clear-filters-empty"
            onClick={clearFilters}
            className="mt-3 text-sm font-medium text-orange-300 underline-offset-2 hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <ul
          data-testid="admin-addons-list"
          className="flex flex-col gap-3"
        >
          {filteredAddons.map((addon) => (
            <AddonRow
              key={addon.id}
              addon={addon}
              products={catalog.products}
              canUpdate={canUpdate}
              canToggle={canToggle}
              canLink={canLink}
              canUnlink={canUnlink}
              isEditing={editingAddonId === addon.id}
              isLinksOpen={linksAddonId === addon.id}
              onEdit={() => openEdit(addon.id)}
              onCancelEdit={() => setEditingAddonId(null)}
              onToggleLinks={() => toggleLinks(addon.id)}
            />
          ))}
        </ul>
      )}

      <p className="text-xs text-stone-500">
        Perfil: {formatAdminRoleLabel(role)}
      </p>
    </div>
  );
}
