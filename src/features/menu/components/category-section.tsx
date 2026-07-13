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
  return (
    <section className="flex flex-col gap-3" aria-labelledby={`category-${category.id}`}>
      <div className="flex flex-col gap-1">
        <h2
          id={`category-${category.id}`}
          className="text-lg font-semibold tracking-tight text-orange-50"
        >
          {category.name}
        </h2>
        {category.description ? (
          <p className="text-sm text-stone-400">{category.description}</p>
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
