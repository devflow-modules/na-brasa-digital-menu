import { PrismaClient } from "@prisma/client";
import {
  applyNaBrazaPilotMenu,
  NA_BRAZA_STORE_SLUG,
} from "../prisma/na-braza-pilot-menu";

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const store = await prisma.store.findUnique({
      where: { slug: NA_BRAZA_STORE_SLUG },
      select: { id: true, slug: true },
    });

    if (!store) {
      throw new Error(
        `Store with slug "${NA_BRAZA_STORE_SLUG}" not found. Run seed or create the store first.`,
      );
    }

    const summary = await applyNaBrazaPilotMenu(prisma, store.id);

    console.log(`Store id: ${summary.storeId}`);
    console.log(`Slug: ${store.slug}`);
    console.log(
      `Categories: created ${summary.categoriesCreated}, updated ${summary.categoriesUpdated}, deactivated ${summary.categoriesDeactivated}`,
    );
    console.log(
      `Products: created ${summary.productsCreated}, updated ${summary.productsUpdated}, deactivated ${summary.productsDeactivated}`,
    );
    console.log(
      `Addons: created ${summary.addonsCreated}, updated ${summary.addonsUpdated}, deactivated ${summary.addonsDeactivated}`,
    );
    console.log(
      `Burger addon links: ensured ${summary.burgerAddonLinksEnsured}, removed ${summary.burgerAddonLinksRemoved}`,
    );
    console.log("Na Braza pilot menu applied.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
