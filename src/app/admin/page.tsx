import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/features/admin/auth/admin-session";
import { LogoutButton } from "@/features/admin/auth/components/logout-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — Na Brasa",
  description: "Painel administrativo do Na Brasa.",
};

export default async function AdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-6 py-16 text-stone-900">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Área restrita
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Painel Na Brasa
            </h1>
          </div>
          <LogoutButton />
        </div>

        <p className="text-sm leading-relaxed text-stone-600">
          Pedidos e gestão do cardápio entram nas próximas etapas.
        </p>

        <p className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500">
          Sessão: {session.email}
        </p>
      </div>
    </main>
  );
}
