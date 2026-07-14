import { ProductCard } from "@/features/menu/components/product-card";
import type {
  PublicMenuCategory,
  PublicMenuProduct,
} from "@/features/menu/menu.types";

type CategorySectionProps = {
  category: PublicMenuCategory;
  onAddProduct?: (product: PublicMenuProduct) => void;
};

export function CategorySection({
  category,
  onAddProduct,
}: CategorySectionProps) {
  if (category.products.length === 0) {
    return (
      <section
        className="rounded-xl border border-dashed border-stone-700 bg-stone-900/40 px-4 py-6 text-center"
        aria-labelledby={`category-${category.id}`}
      >
        <h2
          id={`category-${category.id}`}
          className="text-base font-semibold text-stone-300"
        >
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
      className="flex flex-col gap-4 border-l-2 border-orange-500/35 pl-4"
      aria-labelledby={`category-${category.id}`}
    >
      <div className="flex flex-col gap-1">
        <h2
          id={`category-${category.id}`}
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

      <ul className="flex flex-col gap-3">
        {category.products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} onAdd={onAddProduct} />
          </li>
        ))}
      </ul>
    </section>
  );
}
