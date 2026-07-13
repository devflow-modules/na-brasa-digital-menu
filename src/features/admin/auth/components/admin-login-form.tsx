"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { loginAdminAction } from "@/features/admin/auth/actions/login-action";

export function AdminLoginForm() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      try {
        const result = await loginAdminAction({ email, password });
        if (result && !result.ok) {
          setErrorMessage(result.message);
        }
      } catch (error) {
        const digest =
          typeof error === "object" &&
          error !== null &&
          "digest" in error &&
          typeof (error as { digest?: unknown }).digest === "string"
            ? (error as { digest: string }).digest
            : "";

        if (digest.startsWith("NEXT_REDIRECT")) {
          return;
        }

        setErrorMessage("Não foi possível entrar. Tente novamente.");
      }
    });
  }

  return (
    <form
      data-testid="admin-login-form"
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-4"
      noValidate
    >
      <label className="flex flex-col gap-1.5 text-sm text-stone-700">
        E-mail
        <input
          type="email"
          name="email"
          data-testid="admin-login-email"
          autoComplete="username"
          required
          className="h-11 rounded-xl border border-stone-300 bg-white px-3 text-stone-900 outline-none ring-orange-500/40 focus:ring-2"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-stone-700">
        Senha
        <input
          type="password"
          name="password"
          data-testid="admin-login-password"
          autoComplete="current-password"
          required
          className="h-11 rounded-xl border border-stone-300 bg-white px-3 text-stone-900 outline-none ring-orange-500/40 focus:ring-2"
        />
      </label>

      <button
        type="submit"
        data-testid="admin-login-submit"
        disabled={isPending}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-stone-950 disabled:opacity-60"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      ) : null}

      <Link
        href="/na-brasa"
        className="text-center text-sm font-medium text-stone-600 underline-offset-2 hover:text-orange-700 hover:underline"
      >
        Voltar ao cardápio
      </Link>
    </form>
  );
}
