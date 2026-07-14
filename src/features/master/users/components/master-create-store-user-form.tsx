"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { createStoreUserAction } from "@/features/master/users/actions/create-store-user-action";
import { STORE_USER_ROLES } from "@/features/master/users/master-store-users.types";
import { formatStoreUserRole } from "@/features/master/users/master-store-users-formatters";

type MasterCreateStoreUserFormProps = {
  storeId: string;
};

export function MasterCreateStoreUserForm({
  storeId,
}: MasterCreateStoreUserFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createStoreUserAction({
        storeId,
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        role: String(formData.get("role") ?? ""),
        password: String(formData.get("password") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? ""),
      });

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      setSuccessMessage(
        "Usuário criado. A senha não será exibida novamente — compartilhe fora do sistema.",
      );
      form.reset();
      router.refresh();
    });
  }

  return (
    <form
      data-testid="master-create-store-user-form"
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
    >
      <div>
        <h2 className="text-lg font-semibold text-orange-50">
          Criar usuário da loja
        </h2>
        <p className="mt-1 text-sm text-stone-400">
          Roles de loja acessam /admin, não /master.
        </p>
      </div>

      <input type="hidden" name="storeId" value={storeId} />

      <label className="flex flex-col gap-1.5 text-sm text-stone-300">
        Nome
        <input
          name="name"
          data-testid="master-create-user-name"
          required
          className="h-11 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 outline-none ring-orange-500/40 focus:ring-2"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-stone-300">
        E-mail
        <input
          type="email"
          name="email"
          data-testid="master-create-user-email"
          required
          autoComplete="off"
          className="h-11 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 outline-none ring-orange-500/40 focus:ring-2"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-stone-300">
        Role
        <select
          name="role"
          data-testid="master-create-user-role"
          defaultValue="OPERATOR"
          className="h-11 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 outline-none ring-orange-500/40 focus:ring-2"
        >
          {STORE_USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {formatStoreUserRole(role)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-stone-300">
        Senha
        <input
          type="password"
          name="password"
          data-testid="master-create-user-password"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-11 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 outline-none ring-orange-500/40 focus:ring-2"
        />
        <span className="text-xs text-stone-500">
          Mínimo 8 caracteres; recomendado 12+.
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-stone-300">
        Confirmar senha
        <input
          type="password"
          name="confirmPassword"
          data-testid="master-create-user-confirm-password"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-11 rounded-xl border border-stone-700 bg-stone-950 px-3 text-stone-100 outline-none ring-orange-500/40 focus:ring-2"
        />
      </label>

      <button
        type="submit"
        data-testid="master-create-user-submit"
        disabled={isPending}
        className="flex h-11 items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-stone-950 disabled:opacity-60"
      >
        {isPending ? "Criando..." : "Criar usuário"}
      </button>

      {errorMessage ? (
        <p
          role="alert"
          data-testid="master-create-user-error"
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-3 text-sm text-red-100"
        >
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p
          role="status"
          data-testid="master-create-user-success"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-100"
        >
          {successMessage}
        </p>
      ) : null}

      <p className="text-xs text-stone-500">
        Reset de senha virá em próxima etapa. Não envie senha por e-mail neste
        fluxo.
      </p>
    </form>
  );
}
