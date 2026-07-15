type CategoryJumpNavigationProps = {
  categories: Array<{
    id: string;
    name: string;
  }>;
};

export function CategoryJumpNavigation({
  categories,
}: CategoryJumpNavigationProps) {
  if (categories.length < 2) {
    return null;
  }

  return (
    <nav
      aria-label="Categorias do cardápio"
      data-testid="category-jump-navigation"
      className="-mx-1"
    >
      <ul className="flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {categories.map((category) => (
          <li key={category.id} className="shrink-0">
            <a
              href={`#category-${category.id}`}
              className="inline-flex h-10 max-w-[16rem] items-center truncate rounded-xl border border-stone-700 bg-stone-900/80 px-4 text-sm font-medium text-stone-200 outline-none ring-orange-500/40 transition-colors hover:border-orange-400/50 hover:text-orange-50 focus-visible:ring-2"
            >
              {category.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
