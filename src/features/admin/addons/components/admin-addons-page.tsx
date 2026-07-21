import type { UserRole } from "@prisma/client";
import type { AdminAddonsCatalog } from "@/features/admin/addons/admin-addons.types";
import { AddonManagementWorkspace } from "@/features/admin/addons/components/addon-management-workspace";

type AdminAddonsPageProps = {
  role: UserRole;
  catalog: AdminAddonsCatalog;
};

export function AdminAddonsPage({ role, catalog }: AdminAddonsPageProps) {
  return <AddonManagementWorkspace role={role} catalog={catalog} />;
}
