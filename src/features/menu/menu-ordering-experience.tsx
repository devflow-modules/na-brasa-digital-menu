"use client";

import { useCallback, useState } from "react";
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
  minimumOrderAmountCents?: number;
};

export function MenuOrderingExperience({
  menu,
  storeIsOpen,
  minimumOrderAmountCents = 0,
}: MenuOrderingExperienceProps) {
  const { categories, featuredProducts } = menu;
  const { cart, addItem, setItemQuantity, removeItem } = useCart();
  const [selectedProduct, setSelectedProduct] =
    useState<PublicMenuProduct | null>(null);

  const handleCloseAddToCart = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  const hasProducts = categories.length > 0;
  const hasCartItems = cart.items.length > 0;

  return (
    <>
      <div
        className={`mx-auto flex w-full max-w-lg flex-col gap-10 px-4 py-8 sm:px-6 ${
          hasCartItems ? "pb-80" : "pb-10"
        }`}
      >
        {!hasProducts ? (
          <div
            data-testid="menu-empty-state"
            className="rounded-2xl border border-dashed border-stone-700 bg-stone-900/50 px-4 py-10 text-center"
          >
            <p className="text-base font-medium text-stone-200">
              Cardápio em atualização
            </p>
            <p className="mt-2 text-sm text-stone-400">
              Volte em breve — estamos organizando os itens para você pedir pelo
              WhatsApp.
            </p>
          </div>
        ) : (
          <>
            {featuredProducts.length > 0 ? (
              <section
                className="flex flex-col gap-4"
                aria-labelledby="featured-heading"
              >
                <div className="flex flex-col gap-1">
                  <h2
                    id="featured-heading"
                    className="text-xl font-semibold tracking-tight text-orange-50"
                  >
                    Destaques
                  </h2>
                  <p className="text-sm text-stone-400">
                    Os favoritos da casa — prontos para adicionar ao pedido.
                  </p>
                </div>
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

            <section
              className="flex flex-col gap-6"
              aria-labelledby="menu-catalog-heading"
            >
              <div className="flex flex-col gap-1 border-b border-stone-800 pb-4">
                <h2
                  id="menu-catalog-heading"
                  data-testid="menu-catalog-heading"
                  className="text-2xl font-semibold tracking-tight text-orange-50"
                >
                  Cardápio
                </h2>
                <p className="text-sm leading-relaxed text-stone-400">
                  Navegue pelas categorias e monte seu pedido com calma.
                </p>
              </div>

              {categories.map((category) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  onAddProduct={setSelectedProduct}
                />
              ))}
            </section>

            {!hasCartItems && storeIsOpen ? (
              <p
                data-testid="cart-empty-hint"
                className="rounded-xl border border-stone-800 bg-stone-900/50 px-4 py-3 text-center text-sm text-stone-400"
              >
                Toque em <span className="font-medium text-stone-200">Adicionar</span>{" "}
                para montar seu pedido. Você revisa tudo antes de enviar no
                WhatsApp.
              </p>
            ) : null}
          </>
        )}
      </div>

      <CartSummary
        cart={cart}
        storeIsOpen={storeIsOpen}
        minimumOrderAmountCents={minimumOrderAmountCents}
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
          onClose={handleCloseAddToCart}
          onConfirm={({ quantity, selectedAddons }) => {
            addItem({
              productId: selectedProduct.id,
              productName: selectedProduct.name,
              productDescription: selectedProduct.description,
              productPriceCents: selectedProduct.priceCents,
              selectedAddons,
              quantity,
            });
            handleCloseAddToCart();
          }}
        />
      ) : null}
    </>
  );
}
