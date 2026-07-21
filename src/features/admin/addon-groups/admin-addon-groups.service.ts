import type { UserRole } from "@prisma/client";
import {
  ADMIN_PERMISSION_DENIED_MESSAGE,
  canUpdateMenuProduct,
} from "@/features/admin/auth/admin-permissions";
import {
  countActiveGroupMembershipsForAddons,
  countAddonsInStore,
  findAddonGroupInStore,
  listAddonGroupsForProduct,
  listStoreAddonCandidates,
  setAddonGroupActive,
  upsertAddonGroupRecord,
} from "@/features/admin/addon-groups/admin-addon-groups.repository";
import {
  toggleAddonGroupActiveSchema,
  upsertAddonGroupSchema,
} from "@/features/admin/addon-groups/admin-addon-groups.schema";
import type { AdminAddonGroupActionResult } from "@/features/admin/addon-groups/admin-addon-groups.types";
import { productBelongsToStore } from "@/features/admin/menu/admin-menu.repository";
import { validateAddonGroupLimits } from "@/features/orders/addon-group-selection";

export async function getProductAddonGroupsAdminData(
  storeId: string,
  productId: string,
) {
  const [groups, candidates] = await Promise.all([
    listAddonGroupsForProduct(storeId, productId),
    listStoreAddonCandidates(storeId),
  ]);
  return { groups, candidates };
}

export async function upsertAdminAddonGroup(
  context: { storeId: string; role: UserRole },
  rawInput: unknown,
): Promise<AdminAddonGroupActionResult> {
  if (!canUpdateMenuProduct(context.role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = upsertAddonGroupSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const input = parsed.data;
  const product = await productBelongsToStore(input.productId, context.storeId);
  if (!product) {
    return { ok: false, message: "Produto não encontrado." };
  }

  const uniqueOptionIds = [...new Set(input.optionAddonIds)];
  if (uniqueOptionIds.length !== input.optionAddonIds.length) {
    return {
      ok: false,
      message: "Remova opções duplicadas do grupo.",
    };
  }

  const limits = validateAddonGroupLimits({
    minSelection: input.minSelection,
    maxSelection: input.maxSelection,
    optionCount: uniqueOptionIds.length,
  });
  if (!limits.ok) {
    return limits;
  }

  const addonCount = await countAddonsInStore(context.storeId, uniqueOptionIds);
  if (addonCount !== uniqueOptionIds.length) {
    return {
      ok: false,
      message: "Uma ou mais opções não pertencem a esta loja ou estão inativas.",
    };
  }

  if (input.groupId) {
    const existing = await findAddonGroupInStore(context.storeId, input.groupId);
    if (!existing || existing.productId !== input.productId) {
      return { ok: false, message: "Grupo não encontrado." };
    }
  }

  const overlapping = await countActiveGroupMembershipsForAddons({
    storeId: context.storeId,
    productId: input.productId,
    addonIds: uniqueOptionIds,
    excludeGroupId: input.groupId,
  });
  if (overlapping > 0) {
    return {
      ok: false,
      message:
        "Um adicional só pode pertencer a um grupo ativo por produto.",
    };
  }

  const saved = await upsertAddonGroupRecord({
    storeId: context.storeId,
    productId: input.productId,
    groupId: input.groupId,
    name: input.name.trim(),
    description: input.description?.trim() ? input.description.trim() : null,
    minSelection: input.minSelection,
    maxSelection: input.maxSelection,
    sortOrder: input.sortOrder,
    active: input.isActive,
    optionAddonIds: uniqueOptionIds,
  });

  return { ok: true, groupId: saved.id };
}

export async function toggleAdminAddonGroupActive(
  context: { storeId: string; role: UserRole },
  rawInput: unknown,
): Promise<AdminAddonGroupActionResult> {
  if (!canUpdateMenuProduct(context.role)) {
    return { ok: false, message: ADMIN_PERMISSION_DENIED_MESSAGE };
  }

  const parsed = toggleAddonGroupActiveSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, message: "Dados inválidos." };
  }

  const existing = await findAddonGroupInStore(
    context.storeId,
    parsed.data.groupId,
  );
  if (!existing) {
    return { ok: false, message: "Grupo não encontrado." };
  }

  await setAddonGroupActive({
    groupId: existing.id,
    active: parsed.data.active,
  });

  return { ok: true, groupId: existing.id };
}
