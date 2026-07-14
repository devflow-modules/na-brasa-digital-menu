import type { StoreUserRole } from "@/features/master/users/master-store-users.types";

const ROLE_LABELS: Record<StoreUserRole, string> = {
  STORE_OWNER: "Dono da loja",
  MANAGER: "Gerente",
  OPERATOR: "Operador",
  KITCHEN: "Cozinha",
};

export function formatStoreUserRole(role: StoreUserRole): string {
  return ROLE_LABELS[role];
}
