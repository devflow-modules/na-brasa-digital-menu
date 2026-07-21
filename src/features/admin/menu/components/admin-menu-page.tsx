import type { UserRole } from "@prisma/client";
import type { AdminMenuCatalog } from "@/features/admin/menu/admin-menu.types";
import { MenuManagementWorkspace } from "@/features/admin/menu/components/menu-management-workspace";

type AdminMenuPageProps = {
  role: UserRole;
  catalog: AdminMenuCatalog;
};

export function AdminMenuPage({ role, catalog }: AdminMenuPageProps) {
  return <MenuManagementWorkspace role={role} catalog={catalog} />;
}
