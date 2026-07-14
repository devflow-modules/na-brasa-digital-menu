import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/features/admin/auth/components/admin-login-form";
import { getAdminSession } from "@/features/admin/auth/admin-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Login Admin — Na Braza",
  description: "Acesse o painel administrativo do Na Braza.",
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();

  if (session) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-6 py-16 text-stone-900">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Na Braza Admin
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Acesse o painel de pedidos
          </p>
        </div>

        <AdminLoginForm />
      </div>
    </main>
  );
}
