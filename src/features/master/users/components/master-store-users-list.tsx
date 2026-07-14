"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleStoreUserActiveAction } from "@/features/master/users/actions/toggle-store-user-active-action";
import { updateStoreUserRoleAction } from "@/features/master/users/actions/update-store-user-role-action";
import { formatStoreUserRole } from "@/features/master/users/master-store-users-formatters";
import { formatMasterDateTime } from "@/features/master/master-formatters";
import {
  STORE_USER_ROLES,
  type MasterStoreUserListItem,
  type StoreUserRole,
} from "@/features/master/users/master-store-users.types";

type MasterStoreUsersListProps = {
  storeId: string;
  users: MasterStoreUserListItem[];
};

export function MasterStoreUsersList({
  storeId,
  users,
}: MasterStoreUsersListProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onToggleActive(userId: string, nextActive: boolean) {
    setMessage(null);
    setErrorMessage(null);
    startTransition(async () => {
      const result = await toggleStoreUserActiveAction({
        storeId,
        userId,
        isActive: nextActive,
      });
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      setMessage(nextActive ? "Usuário ativado." : "Usuário desativado.");
      router.refresh();
    });
  }

  function onRoleChange(userId: string, role: StoreUserRole) {
    setMessage(null);
    setErrorMessage(null);
    startTransition(async () => {
      const result = await updateStoreUserRoleAction({
        storeId,
        userId,
        role,
      });
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      setMessage("Role atualizada.");
      router.refresh();
    });
  }

  if (users.length === 0) {
    return (
      <div
        data-testid="master-store-users-empty"
        className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/40 px-5 py-10 text-center"
      >
        <p className="text-base font-medium text-stone-100">
          Nenhum usuário nesta loja ainda.
        </p>
        <p className="mt-2 text-sm text-stone-400">
          Crie o primeiro acesso operacional pelo formulário ao lado.
        </p>
      </div>
    );
  }

  return (
    <section data-testid="master-store-users-list" className="flex flex-col gap-3">
      {message ? (
        <p
          role="status"
          data-testid="master-store-users-status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
        >
          {message}
        </p>
      ) : null}
      {errorMessage ? (
        <p
          role="alert"
          data-testid="master-store-users-error"
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100"
        >
          {errorMessage}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {users.map((user) => (
          <li
            key={user.id}
            data-testid={`master-store-user-${user.email}`}
            className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-base font-semibold text-orange-50">
                  {user.name}
                </p>
                <p className="text-sm text-stone-300">{user.email}</p>
                <p className="text-sm text-stone-400">
                  Loja: <span className="text-stone-200">{user.storeName}</span>
                </p>
                <p className="text-sm text-stone-400">
                  Criado em {formatMasterDateTime(user.createdAt)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    data-testid={`master-store-user-role-badge-${user.id}`}
                    className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs text-orange-100"
                  >
                    {formatStoreUserRole(user.role)}
                  </span>
                  <span
                    data-testid={`master-store-user-active-badge-${user.id}`}
                    className={
                      user.isActive
                        ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-100"
                        : "rounded-full border border-stone-600 bg-stone-800 px-2.5 py-1 text-xs text-stone-300"
                    }
                  >
                    {user.isActive ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="flex flex-col gap-1 text-xs text-stone-400">
                  Role
                  <select
                    data-testid={`master-store-user-role-select-${user.id}`}
                    value={user.role}
                    disabled={isPending}
                    onChange={(event) =>
                      onRoleChange(
                        user.id,
                        event.target.value as StoreUserRole,
                      )
                    }
                    className="h-10 min-w-44 rounded-xl border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 disabled:opacity-60"
                  >
                    {STORE_USER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {formatStoreUserRole(role)}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  data-testid={`master-store-user-toggle-active-${user.id}`}
                  disabled={isPending}
                  onClick={() => onToggleActive(user.id, !user.isActive)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-700 bg-stone-950 px-4 text-sm font-medium text-stone-100 hover:bg-stone-800 disabled:opacity-60"
                >
                  {user.isActive ? "Desativar" : "Ativar"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
