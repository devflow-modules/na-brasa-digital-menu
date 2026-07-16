import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { getAdminSafeDestination } from "@/features/admin/chrome/admin-navigation";

type AdminAccessDeniedProps = {
  role: UserRole;
};

/**
 * Explicit access-denied UX for authenticated Store operators with valid context.
 * Does not replace notFound() for missing resources or cross-tenant concealment.
 * Renders inside AdminChrome when the (store) layout already resolved context.
 */
export function AdminAccessDenied({ role }: AdminAccessDeniedProps) {
  const destination = getAdminSafeDestination(role);

  return (
    <div
      data-testid="admin-access-denied"
      className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-12 sm:px-6"
    >
      <h1
        data-testid="admin-access-denied-title"
        className="text-2xl font-semibold text-orange-50 sm:text-3xl"
      >
        Acesso não permitido
      </h1>
      <p
        data-testid="admin-access-denied-description"
        className="text-sm text-stone-400"
      >
        Seu perfil não possui acesso a esta área.
      </p>
      <div>
        <Link
          href={destination.href}
          data-testid="admin-access-denied-safe-link"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-orange-500/50 bg-orange-500 px-4 text-sm font-semibold text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 hover:bg-orange-400"
        >
          {destination.label}
        </Link>
      </div>
    </div>
  );
}
