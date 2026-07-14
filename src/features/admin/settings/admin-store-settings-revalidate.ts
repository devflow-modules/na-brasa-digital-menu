import { revalidatePath } from "next/cache";

export function revalidateStoreSettingsPaths(storeSlug: string) {
  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin");
  revalidatePath(`/${storeSlug}`);
  revalidatePath(`/${storeSlug}/checkout`);
}
