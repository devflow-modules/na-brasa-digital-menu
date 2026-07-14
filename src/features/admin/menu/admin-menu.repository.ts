import { prisma } from "@/lib/prisma";
import type {
  AdminMenuCatalog,
  AdminMenuCategory,
  AdminMenuProduct,
} from "@/features/admin/menu/admin-menu.types";

export async function getAdminMenuCatalog(
  storeId: string,
): Promise<AdminMenuCatalog> {
  const categories = await prisma.category.findMany({
    where: { storeId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      sortOrder: true,
      active: true,
      products: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          categoryId: true,
          name: true,
          description: true,
          priceCents: true,
          active: true,
          sortOrder: true,
        },
      },
    },
  });

  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder,
      active: category.active,
      products: category.products,
    })),
  };
}

export async function categoryBelongsToStore(
  categoryId: string,
  storeId: string,
): Promise<boolean> {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, storeId },
    select: { id: true },
  });
  return Boolean(category);
}

export async function productBelongsToStore(
  productId: string,
  storeId: string,
): Promise<AdminMenuProduct | null> {
  return prisma.product.findFirst({
    where: { id: productId, storeId },
    select: {
      id: true,
      categoryId: true,
      name: true,
      description: true,
      priceCents: true,
      active: true,
      sortOrder: true,
    },
  });
}

export async function createAdminCategory(
  storeId: string,
  input: { name: string; sortOrder: number; isActive: boolean },
): Promise<AdminMenuCategory> {
  const category = await prisma.category.create({
    data: {
      storeId,
      name: input.name,
      sortOrder: input.sortOrder,
      active: input.isActive,
    },
    select: {
      id: true,
      name: true,
      description: true,
      sortOrder: true,
      active: true,
    },
  });
  return { ...category, products: [] };
}

export async function updateAdminCategory(
  storeId: string,
  input: {
    categoryId: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
  },
): Promise<boolean> {
  const result = await prisma.category.updateMany({
    where: { id: input.categoryId, storeId },
    data: {
      name: input.name,
      sortOrder: input.sortOrder,
      active: input.isActive,
    },
  });
  return result.count === 1;
}

export async function createAdminProduct(
  storeId: string,
  input: {
    categoryId: string;
    name: string;
    description?: string;
    priceCents: number;
    sortOrder: number;
    isActive: boolean;
  },
): Promise<AdminMenuProduct | null> {
  const categoryOk = await categoryBelongsToStore(input.categoryId, storeId);
  if (!categoryOk) {
    return null;
  }

  return prisma.product.create({
    data: {
      storeId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description ?? null,
      priceCents: input.priceCents,
      sortOrder: input.sortOrder,
      active: input.isActive,
    },
    select: {
      id: true,
      categoryId: true,
      name: true,
      description: true,
      priceCents: true,
      active: true,
      sortOrder: true,
    },
  });
}

export async function updateAdminProduct(
  storeId: string,
  input: {
    productId: string;
    categoryId: string;
    name: string;
    description: string | null;
    priceCents: number;
    sortOrder: number;
    isActive: boolean;
  },
): Promise<boolean> {
  const categoryOk = await categoryBelongsToStore(input.categoryId, storeId);
  if (!categoryOk) {
    return false;
  }

  const result = await prisma.product.updateMany({
    where: { id: input.productId, storeId },
    data: {
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      priceCents: input.priceCents,
      sortOrder: input.sortOrder,
      active: input.isActive,
    },
  });
  return result.count === 1;
}

export async function setAdminProductActive(
  storeId: string,
  productId: string,
  active: boolean,
): Promise<boolean> {
  const result = await prisma.product.updateMany({
    where: { id: productId, storeId },
    data: { active },
  });
  return result.count === 1;
}
