import { FunnelMenuViewTracker } from "@/features/analytics/components/funnel-menu-view-tracker";
import { MenuOrderingExperience } from "@/features/menu/menu-ordering-experience";
import { StoreHero } from "@/features/menu/components/store-hero";
import type { PublicMenu } from "@/features/menu/menu.types";

type PublicMenuPageProps = {
  menu: PublicMenu;
};

export function PublicMenuPage({ menu }: PublicMenuPageProps) {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 antialiased">
      <FunnelMenuViewTracker storeSlug={menu.store.slug} />
      <StoreHero store={menu.store} />
      <MenuOrderingExperience
        storeSlug={menu.store.slug}
        storeIsOpen={menu.store.isOpen}
        minimumOrderAmountCents={menu.store.minimumOrderAmountCents}
        deliveryEnabled={menu.store.deliveryEnabled}
        menu={{
          categories: menu.categories,
          featuredProducts: menu.featuredProducts,
        }}
      />
    </main>
  );
}
