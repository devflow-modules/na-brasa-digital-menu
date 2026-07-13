import { CategorySection } from "@/features/menu/components/category-section";
import { ProductCard } from "@/features/menu/components/product-card";
import { StoreHero } from "@/features/menu/components/store-hero";
import type { PublicMenu } from "@/features/menu/menu.repository";

type PublicMenuPageProps = {
  menu: PublicMenu;
};

export function PublicMenuPage({ menu }: PublicMenuPageProps) {
  const { store, categories, featuredProducts } = menu;
  const hasProducts = categories.length > 0;

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <StoreHero store={store} />

      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-8 sm:px-6">
        {!hasProducts ? (
          <p className="rounded-xl border border-dashed border-stone-700 bg-stone-900/50 px-4 py-8 text-center text-sm text-stone-300">
            Cardápio em atualização.
          </p>
        ) : (
          <>
            {featuredProducts.length > 0 ? (
              <section
                className="flex flex-col gap-3"
                aria-labelledby="featured-heading"
              >
                <h2
                  id="featured-heading"
                  className="text-lg font-semibold tracking-tight text-orange-50"
                >
                  Destaques
                </h2>
                <ul className="flex flex-col gap-3">
                  {featuredProducts.map((product) => (
                    <li key={`featured-${product.id}`}>
                      <ProductCard product={product} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {categories.map((category) => (
              <CategorySection key={category.id} category={category} />
            ))}
          </>
        )}

        <p className="rounded-xl border border-stone-800 bg-stone-900/60 px-4 py-3 text-center text-sm text-stone-400">
          Carrinho em breve
        </p>
      </div>
    </main>
  );
}
