import { ProductCard } from "@/features/menu/components/product-card";
import type {
  PublicMenuCategory,
  PublicMenuProduct,
} from "@/features/menu/menu.types";

type CategorySectionProps = {
  category: PublicMenuCategory;
  onAddProduct?: (product: PublicMenuProduct) => void;
  cartQuantityByProductId?: Record<string, number>;
};

export function CategorySection({
  category,
  onAddProduct,
  cartQuantityByProductId = {},
}: CategorySectionProps) {
  const sectionId = `category-${category.id}`;
  const headingId = `category-heading-${category.id}`;

  if (category.products.length === 0) {
    return (
      <section
        id={sectionId}
        className="scroll-mt-28 rounded-xl border border-dashed border-stone-700 bg-stone-900/40 px-4 py-6 text-center"
        aria-labelledby={headingId}
      >
        <h2 id={headingId} className="text-base font-semibold text-stone-300">
          {category.name}
        </h2>
        <p className="mt-2 text-sm text-stone-500">
          Nenhum item disponível nesta categoria no momento.
        </p>
      </section>
    );
  }

  return (
    <section
      id={sectionId}
      className="flex scroll-mt-28 flex-col gap-4 border-l-2 border-orange-500/35 pl-4"
      aria-labelledby={headingId}
    >
      <div className="flex flex-col gap-1">
        <h2
          id={headingId}
          className="text-xl font-semibold tracking-tight text-orange-50"
        >
          {category.name}
        </h2>
        {category.description ? (
          <p className="text-sm leading-relaxed text-stone-400">
            {category.description}
          </p>
        ) : null}
      </div>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {category.products.map((product) => (
          <li key={product.id}>
            <ProductCard
              product={product}
              onAdd={onAddProduct}
              cartQuantity={cartQuantityByProductId[product.id] ?? 0}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
