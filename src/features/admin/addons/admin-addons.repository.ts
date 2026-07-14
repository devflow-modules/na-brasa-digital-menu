import { prisma } from "@/lib/prisma";
import type {
  AdminAddon,
  AdminAddonsCatalog,
  AdminAddonLinkProductOption,
} from "@/features/admin/addons/admin-addons.types";

export async function getAdminAddonsCatalog(
  storeId: string,
): Promise<AdminAddonsCatalog> {
  const [addons, products] = await Promise.all([
    prisma.addon.findMany({
      where: { storeId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        priceCents: true,
        active: true,
        sortOrder: true,
        productAddons: {
          select: {
            product: {
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
    prisma.product.findMany({
      where: { storeId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    addons: addons.map((addon) => ({
      id: addon.id,
      name: addon.name,
      description: addon.description,
      priceCents: addon.priceCents,
      active: addon.active,
      sortOrder: addon.sortOrder,
      linkedProducts: addon.productAddons
        .map((link) => link.product)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    })),
    products,
  };
}

export async function addonBelongsToStore(
  addonId: string,
  storeId: string,
): Promise<boolean> {
  const addon = await prisma.addon.findFirst({
    where: { id: addonId, storeId },
    select: { id: true },
  });
  return Boolean(addon);
}

export async function productBelongsToStore(
  productId: string,
  storeId: string,
): Promise<boolean> {
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId },
    select: { id: true },
  });
  return Boolean(product);
}

export async function createAdminAddon(
  storeId: string,
  input: {
    name: string;
    description?: string;
    priceCents: number;
    sortOrder: number;
    isActive: boolean;
  },
): Promise<AdminAddon> {
  const addon = await prisma.addon.create({
    data: {
      storeId,
      name: input.name,
      description: input.description ?? null,
      priceCents: input.priceCents,
      sortOrder: input.sortOrder,
      active: input.isActive,
    },
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      active: true,
      sortOrder: true,
    },
  });
  return { ...addon, linkedProducts: [] };
}

export async function updateAdminAddon(
  storeId: string,
  input: {
    addonId: string;
    name: string;
    description: string | null;
    priceCents: number;
    sortOrder: number;
    isActive: boolean;
  },
): Promise<boolean> {
  const result = await prisma.addon.updateMany({
    where: { id: input.addonId, storeId },
    data: {
      name: input.name,
      description: input.description,
      priceCents: input.priceCents,
      sortOrder: input.sortOrder,
      active: input.isActive,
    },
  });
  return result.count === 1;
}

export async function setAdminAddonActive(
  storeId: string,
  addonId: string,
  active: boolean,
): Promise<boolean> {
  const result = await prisma.addon.updateMany({
    where: { id: addonId, storeId },
    data: { active },
  });
  return result.count === 1;
}

export async function linkAdminAddonToProduct(
  storeId: string,
  addonId: string,
  productId: string,
): Promise<"linked" | "already_linked" | "not_found"> {
  const [addonOk, productOk] = await Promise.all([
    addonBelongsToStore(addonId, storeId),
    productBelongsToStore(productId, storeId),
  ]);
  if (!addonOk || !productOk) {
    return "not_found";
  }

  const existing = await prisma.productAddon.findUnique({
    where: { productId_addonId: { productId, addonId } },
    select: { productId: true },
  });
  if (existing) {
    return "already_linked";
  }

  await prisma.productAddon.create({
    data: { productId, addonId },
  });
  return "linked";
}

export async function unlinkAdminAddonFromProduct(
  storeId: string,
  addonId: string,
  productId: string,
): Promise<boolean> {
  const [addonOk, productOk] = await Promise.all([
    addonBelongsToStore(addonId, storeId),
    productBelongsToStore(productId, storeId),
  ]);
  if (!addonOk || !productOk) {
    return false;
  }

  const result = await prisma.productAddon.deleteMany({
    where: { productId, addonId },
  });
  return result.count === 1;
}

export async function listProductsForStore(
  storeId: string,
): Promise<AdminAddonLinkProductOption[]> {
  return prisma.product.findMany({
    where: { storeId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
