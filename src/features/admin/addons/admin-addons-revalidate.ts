import { revalidatePath } from "next/cache";

export function revalidateAddonMenuPaths(storeSlug: string) {
  revalidatePath("/admin/cardapio/adicionais");
  revalidatePath("/admin/cardapio");
  revalidatePath(`/${storeSlug}`);
}
