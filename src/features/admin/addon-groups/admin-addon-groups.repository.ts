import { prisma } from "@/lib/prisma";
import type {
  AdminAddonGroup,
  AdminAddonOptionCandidate,
} from "@/features/admin/addon-groups/admin-addon-groups.types";

function mapGroup(row: {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  minSelection: number;
  maxSelection: number;
  active: boolean;
  sortOrder: number;
  options: Array<{
    sortOrder: number;
    addon: { id: string; name: string; priceCents: number };
  }>;
}): AdminAddonGroup {
  return {
    id: row.id,
    productId: row.productId,
    name: row.name,
    description: row.description,
    minSelection: row.minSelection,
    maxSelection: row.maxSelection,
    active: row.active,
    sortOrder: row.sortOrder,
    options: row.options
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((option) => ({
        addonId: option.addon.id,
        name: option.addon.name,
        priceCents: option.addon.priceCents,
        sortOrder: option.sortOrder,
      })),
  };
}

export async function listAddonGroupsForProduct(
  storeId: string,
  productId: string,
): Promise<AdminAddonGroup[]> {
  const rows = await prisma.addonGroup.findMany({
    where: { storeId, productId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      productId: true,
      name: true,
      description: true,
      minSelection: true,
      maxSelection: true,
      active: true,
      sortOrder: true,
      options: {
        select: {
          sortOrder: true,
          addon: {
            select: { id: true, name: true, priceCents: true },
          },
        },
      },
    },
  });

  return rows.map(mapGroup);
}

export async function listStoreAddonCandidates(
  storeId: string,
): Promise<AdminAddonOptionCandidate[]> {
  const rows = await prisma.addon.findMany({
    where: { storeId },
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      priceCents: true,
      active: true,
    },
  });
  return rows;
}

export async function findAddonGroupInStore(
  storeId: string,
  groupId: string,
) {
  return prisma.addonGroup.findFirst({
    where: { id: groupId, storeId },
    select: {
      id: true,
      productId: true,
      name: true,
      active: true,
      minSelection: true,
      maxSelection: true,
    },
  });
}

export async function upsertAddonGroupRecord(input: {
  storeId: string;
  productId: string;
  groupId?: string;
  name: string;
  description: string | null;
  minSelection: number;
  maxSelection: number;
  sortOrder: number;
  active: boolean;
  optionAddonIds: string[];
}): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    let groupId = input.groupId;

    if (groupId) {
      await tx.addonGroup.update({
        where: { id: groupId },
        data: {
          name: input.name,
          description: input.description,
          minSelection: input.minSelection,
          maxSelection: input.maxSelection,
          sortOrder: input.sortOrder,
          active: input.active,
        },
      });
      await tx.addonGroupOption.deleteMany({ where: { groupId } });
    } else {
      const created = await tx.addonGroup.create({
        data: {
          storeId: input.storeId,
          productId: input.productId,
          name: input.name,
          description: input.description,
          minSelection: input.minSelection,
          maxSelection: input.maxSelection,
          sortOrder: input.sortOrder,
          active: input.active,
        },
        select: { id: true },
      });
      groupId = created.id;
    }

    await tx.addonGroupOption.createMany({
      data: input.optionAddonIds.map((addonId, index) => ({
        groupId: groupId!,
        addonId,
        sortOrder: index,
      })),
    });

    // Grouped addons must not remain independent ProductAddon links for this product.
    await tx.productAddon.deleteMany({
      where: {
        productId: input.productId,
        addonId: { in: input.optionAddonIds },
      },
    });

    return { id: groupId! };
  });
}

export async function setAddonGroupActive(input: {
  groupId: string;
  active: boolean;
}): Promise<void> {
  await prisma.addonGroup.update({
    where: { id: input.groupId },
    data: { active: input.active },
  });
}

export async function countActiveGroupMembershipsForAddons(input: {
  storeId: string;
  productId: string;
  addonIds: string[];
  excludeGroupId?: string;
}): Promise<number> {
  return prisma.addonGroupOption.count({
    where: {
      addonId: { in: input.addonIds },
      group: {
        storeId: input.storeId,
        productId: input.productId,
        active: true,
        ...(input.excludeGroupId
          ? { id: { not: input.excludeGroupId } }
          : {}),
      },
    },
  });
}

export async function countAddonsInStore(
  storeId: string,
  addonIds: string[],
): Promise<number> {
  return prisma.addon.count({
    where: {
      storeId,
      id: { in: addonIds },
      active: true,
    },
  });
}
