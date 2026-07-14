"use client";

import { useState } from "react";
import { AddToCartPanel } from "@/features/cart/components/add-to-cart-panel";
import { CartSummary } from "@/features/cart/components/cart-summary";
import { useCart } from "@/features/cart/use-cart";
import { CategorySection } from "@/features/menu/components/category-section";
import { ProductCard } from "@/features/menu/components/product-card";
import type {
  PublicMenu,
  PublicMenuProduct,
} from "@/features/menu/menu.types";

type MenuOrderingExperienceProps = {
  menu: Pick<PublicMenu, "categories" | "featuredProducts">;
  storeIsOpen: boolean;
};

export function MenuOrderingExperience({
  menu,
  storeIsOpen,
}: MenuOrderingExperienceProps) {
  const { categories, featuredProducts } = menu;
  const { cart, addItem, setItemQuantity, removeItem } = useCart();
  const [selectedProduct, setSelectedProduct] =
    useState<PublicMenuProduct | null>(null);

  const hasProducts = categories.length > 0;
  const hasCartItems = cart.items.length > 0;

  return (
    <>
      <div
        className={`mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-8 sm:px-6 ${
          hasCartItems ? "pb-72" : ""
        }`}
      >
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
                      <ProductCard
                        product={product}
                        onAdd={setSelectedProduct}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {categories.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                onAddProduct={setSelectedProduct}
              />
            ))}
          </>
        )}
      </div>

      <CartSummary
        cart={cart}
        storeIsOpen={storeIsOpen}
        onIncrease={(itemId) => {
          const item = cart.items.find((entry) => entry.id === itemId);
          if (!item) return;
          setItemQuantity(itemId, item.quantity + 1);
        }}
        onDecrease={(itemId) => {
          const item = cart.items.find((entry) => entry.id === itemId);
          if (!item) return;
          setItemQuantity(itemId, item.quantity - 1);
        }}
        onRemove={removeItem}
      />

      {selectedProduct ? (
        <AddToCartPanel
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onConfirm={({ quantity, selectedAddons }) => {
            addItem({
              productId: selectedProduct.id,
              productName: selectedProduct.name,
              productDescription: selectedProduct.description,
              productPriceCents: selectedProduct.priceCents,
              selectedAddons,
              quantity,
            });
            setSelectedProduct(null);
          }}
        />
      ) : null}
    </>
  );
}
