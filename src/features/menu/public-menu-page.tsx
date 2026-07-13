import { MenuOrderingExperience } from "@/features/menu/menu-ordering-experience";
import { StoreHero } from "@/features/menu/components/store-hero";
import type { PublicMenu } from "@/features/menu/menu.types";

type PublicMenuPageProps = {
  menu: PublicMenu;
};

export function PublicMenuPage({ menu }: PublicMenuPageProps) {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <StoreHero store={menu.store} />
      <MenuOrderingExperience
        menu={{
          categories: menu.categories,
          featuredProducts: menu.featuredProducts,
        }}
      />
    </main>
  );
}
