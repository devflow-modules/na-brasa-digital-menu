"use client";

import { useEffect, useState } from "react";

export type CategoryJumpItem = {
  id: string;
  name: string;
  /** Defaults to `#category-{id}`. Use featured anchor when the category only lives in Destaques. */
  href?: string;
};

type CategoryJumpNavigationProps = {
  categories: CategoryJumpItem[];
};

function shortCategoryLabel(name: string): string {
  if (name.toLowerCase().startsWith("lanches")) return "Lanches";
  if (name.toLowerCase().startsWith("espetinhos")) return "Espetinhos";
  return name;
}

export function CategoryJumpNavigation({
  categories,
}: CategoryJumpNavigationProps) {
  const [activeId, setActiveId] = useState<string | null>(
    categories[0]?.id ?? null,
  );

  useEffect(() => {
    if (categories.length === 0) return;

    const sectionIds = categories.map((category) => {
      const href = category.href ?? `#category-${category.id}`;
      return href.startsWith("#") ? href.slice(1) : href;
    });

    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node != null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0),
          );
        const top = visible[0]?.target;
        if (!top) return;

        if (top.id === "menu-featured-section") {
          const featuredOnly = categories.find((category) =>
            (category.href ?? "").includes("menu-featured-section"),
          );
          if (featuredOnly) {
            setActiveId(featuredOnly.id);
          }
          return;
        }

        if (top.id.startsWith("category-")) {
          setActiveId(top.id.replace("category-", ""));
        }
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0.15, 0.35, 0.6],
      },
    );

    for (const section of sections) {
      observer.observe(section);
    }

    return () => observer.disconnect();
  }, [categories]);

  if (categories.length < 2) {
    return null;
  }

  return (
    <nav
      aria-label="Categorias do cardápio"
      data-testid="category-jump-navigation"
      className="sticky top-0 z-30 -mx-4 border-b border-stone-800/90 bg-stone-950/95 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6"
    >
      <ul className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
        {categories.map((category) => {
          const active = activeId === category.id;
          const href = category.href ?? `#category-${category.id}`;
          return (
            <li key={category.id} className="shrink-0">
              <a
                href={href}
                aria-current={active ? "true" : undefined}
                className={[
                  "inline-flex h-9 max-w-[14rem] items-center truncate rounded-[10px] border px-3.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-orange-400/60",
                  active
                    ? "border-orange-500/60 bg-orange-500 text-stone-950"
                    : "border-stone-700 bg-stone-900/80 text-stone-200 hover:border-orange-400/50 hover:text-orange-50",
                ].join(" ")}
              >
                {shortCategoryLabel(category.name)}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
