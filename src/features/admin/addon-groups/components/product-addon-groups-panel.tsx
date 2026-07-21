"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadProductAddonGroupsAction } from "@/features/admin/addon-groups/actions/load-product-addon-groups-action";
import { toggleAddonGroupActiveAction } from "@/features/admin/addon-groups/actions/toggle-addon-group-active-action";
import { upsertAddonGroupAction } from "@/features/admin/addon-groups/actions/upsert-addon-group-action";
import type {
  AdminAddonGroup,
  AdminAddonOptionCandidate,
} from "@/features/admin/addon-groups/admin-addon-groups.types";
import { formatAddonGroupSelectionHint } from "@/features/orders/addon-group-selection";
import { formatAdminPriceCents } from "@/features/admin/menu/admin-menu-formatters";

type ProductAddonGroupsPanelProps = {
  productId: string;
  canManage: boolean;
};

export function ProductAddonGroupsPanel({
  productId,
  canManage,
}: ProductAddonGroupsPanelProps) {
  const router = useRouter();
  const [groups, setGroups] = useState<AdminAddonGroup[]>([]);
  const [candidates, setCandidates] = useState<AdminAddonOptionCandidate[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [minSelection, setMinSelection] = useState(0);
  const [maxSelection, setMaxSelection] = useState(1);
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [optionAddonIds, setOptionAddonIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function reload() {
    startTransition(async () => {
      const result = await loadProductAddonGroupsAction(productId);
      if (!result.ok) {
        setLoadError(result.message);
        return;
      }
      setLoadError(null);
      setGroups(result.groups);
      setCandidates(result.candidates);
    });
  }

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      const result = await loadProductAddonGroupsAction(productId);
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setLoadError(result.message);
        return;
      }
      setLoadError(null);
      setGroups(result.groups);
      setCandidates(result.candidates);
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  function resetForm() {
    setEditingGroupId(null);
    setName("");
    setDescription("");
    setMinSelection(0);
    setMaxSelection(1);
    setSortOrder(0);
    setIsActive(true);
    setOptionAddonIds([]);
    setFormError(null);
    setShowForm(false);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(group: AdminAddonGroup) {
    setEditingGroupId(group.id);
    setName(group.name);
    setDescription(group.description ?? "");
    setMinSelection(group.minSelection);
    setMaxSelection(group.maxSelection);
    setSortOrder(group.sortOrder);
    setIsActive(group.active);
    setOptionAddonIds(group.options.map((option) => option.addonId));
    setFormError(null);
    setShowForm(true);
  }

  function toggleOption(addonId: string) {
    setOptionAddonIds((current) =>
      current.includes(addonId)
        ? current.filter((id) => id !== addonId)
        : [...current, addonId],
    );
  }

  function saveGroup() {
    setFormError(null);
    startTransition(async () => {
      const result = await upsertAddonGroupAction({
        productId,
        groupId: editingGroupId ?? undefined,
        name,
        description,
        minSelection,
        maxSelection,
        sortOrder,
        isActive,
        optionAddonIds,
      });
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      resetForm();
      reload();
      router.refresh();
    });
  }

  function toggleActive(group: AdminAddonGroup) {
    startTransition(async () => {
      await toggleAddonGroupActiveAction({
        groupId: group.id,
        active: !group.active,
      });
      reload();
      router.refresh();
    });
  }

  return (
    <div
      data-testid={`admin-product-addon-groups-${productId}`}
      className="mt-4 space-y-3 rounded-xl border border-stone-800 bg-stone-950/40 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-orange-50">
          Grupos de adicionais
        </h4>
        {canManage ? (
          <button
            type="button"
            data-testid={`admin-product-addon-groups-create-${productId}`}
            onClick={openCreate}
            className="text-sm font-medium text-orange-300 underline-offset-2 hover:underline"
          >
            + Novo grupo
          </button>
        ) : null}
      </div>

      {loadError ? (
        <p role="alert" className="text-sm text-red-300">
          {loadError}
        </p>
      ) : null}

      {groups.length === 0 ? (
        <p className="text-sm text-stone-500">
          Nenhum grupo neste produto. Adicionais independentes continuam na tela
          de Adicionais.
        </p>
      ) : (
        <ul className="space-y-2">
          {groups.map((group) => (
            <li
              key={group.id}
              data-testid={`admin-addon-group-${group.id}`}
              className="rounded-lg border border-stone-800 px-3 py-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-stone-100">{group.name}</p>
                  <p className="text-xs text-stone-500">
                    {formatAddonGroupSelectionHint(group)} ·{" "}
                    {group.active ? "Ativo" : "Inativo"}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    {group.options
                      .map((option) => option.name)
                      .join(" · ")}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      data-testid={`admin-addon-group-edit-${group.id}`}
                      onClick={() => openEdit(group)}
                      className="text-xs text-orange-200 underline-offset-2 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      data-testid={`admin-addon-group-toggle-${group.id}`}
                      disabled={isPending}
                      onClick={() => toggleActive(group)}
                      className="text-xs text-stone-300 underline-offset-2 hover:underline disabled:opacity-60"
                    >
                      {group.active ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && canManage ? (
        <div
          data-testid={`admin-addon-group-form-${productId}`}
          className="space-y-3 border-t border-stone-800 pt-3"
        >
          <p className="text-sm font-medium text-stone-200">
            {editingGroupId ? "Editar grupo" : "Novo grupo"}
          </p>
          <label className="block text-xs text-stone-400">
            Nome
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
            />
          </label>
          <label className="block text-xs text-stone-400">
            Descrição
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block text-xs text-stone-400">
              Mínimo
              <input
                type="number"
                min={0}
                value={minSelection}
                onChange={(event) => setMinSelection(Number(event.target.value))}
                className="mt-1 h-10 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
              />
            </label>
            <label className="block text-xs text-stone-400">
              Máximo
              <input
                type="number"
                min={1}
                value={maxSelection}
                onChange={(event) => setMaxSelection(Number(event.target.value))}
                className="mt-1 h-10 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
              />
            </label>
            <label className="block text-xs text-stone-400">
              Ordem
              <input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(event) => setSortOrder(Number(event.target.value))}
                className="mt-1 h-10 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="size-4"
            />
            Grupo ativo
          </label>
          <fieldset className="space-y-2">
            <legend className="text-xs text-stone-400">Opções do grupo</legend>
            {candidates
              .filter((candidate) => candidate.active)
              .map((candidate) => (
                <label
                  key={candidate.id}
                  className="flex items-center justify-between gap-2 text-sm text-stone-200"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={optionAddonIds.includes(candidate.id)}
                      onChange={() => toggleOption(candidate.id)}
                      className="size-4"
                    />
                    {candidate.name}
                  </span>
                  <span className="text-xs text-orange-200">
                    {formatAdminPriceCents(candidate.priceCents)}
                  </span>
                </label>
              ))}
          </fieldset>
          {formError ? (
            <p role="alert" className="text-sm text-red-300">
              {formError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid={`admin-addon-group-save-${productId}`}
              disabled={isPending}
              onClick={saveGroup}
              className="h-10 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-stone-950 disabled:opacity-60"
            >
              Salvar grupo
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="h-10 rounded-xl border border-stone-600 px-4 text-sm text-stone-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
