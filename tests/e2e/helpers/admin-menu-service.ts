import { updateAdminMenuProduct } from "@/features/admin/menu/admin-menu.service";

export async function attemptUpdateMenuProduct(options: {
  storeId: string;
  role: "OPERATOR" | "MANAGER" | "STORE_OWNER" | "KITCHEN" | "MASTER";
  productId: string;
  categoryId: string;
  name: string;
  priceCents: string;
}) {
  return updateAdminMenuProduct(
    {
      productId: options.productId,
      categoryId: options.categoryId,
      name: options.name,
      description: "",
      priceCents: options.priceCents,
      sortOrder: 0,
      isActive: true,
    },
    options.storeId,
    options.role,
  );
}
