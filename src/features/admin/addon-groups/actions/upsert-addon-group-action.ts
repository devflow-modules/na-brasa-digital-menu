"use server";

import { requireAdminStoreContext } from "@/features/admin/auth/admin-store-context";
import { upsertAdminAddonGroup } from "@/features/admin/addon-groups/admin-addon-groups.service";
import type { AdminAddonGroupActionResult } from "@/features/admin/addon-groups/admin-addon-groups.types";
import { revalidateAddonMenuPaths } from "@/features/admin/addons/admin-addons-revalidate";

export async function upsertAddonGroupAction(
  input: unknown,
): Promise<AdminAddonGroupActionResult> {
  const context = await requireAdminStoreContext();
  const result = await upsertAdminAddonGroup(
    { storeId: context.storeId, role: context.role },
    input,
  );
  if (result.ok) {
    revalidateAddonMenuPaths(context.storeSlug);
  }
  return result;
}
