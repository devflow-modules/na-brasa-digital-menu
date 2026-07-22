"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  createFunnelOccurrenceId,
  trackClientFunnelEvent,
} from "@/features/analytics/track-client-funnel-event";
import { AddToCartPanel } from "@/features/cart/components/add-to-cart-panel";
import { CartSummary } from "@/features/cart/components/cart-summary";
import { useCart } from "@/features/cart/use-cart";
import { CategoryJumpNavigation } from "@/features/menu/components/category-jump-navigation";
import { CategorySection } from "@/features/menu/components/category-section";
import { ProductCard } from "@/features/menu/components/product-card";
import type {
  PublicMenu,
  PublicMenuProduct,
} from "@/features/menu/menu.types";
import { selectFeaturedProductsForDisplay } from "@/features/menu/select-featured-products-for-display";

type MenuOrderingExperienceProps = {
  menu: Pick<PublicMenu, "categories" | "featuredProducts">;
  storeSlug: string;
  storeIsOpen: boolean;
  minimumOrderAmountCents?: number;
  deliveryEnabled?: boolean;
};

export function MenuOrderingExperience({
  menu,
  storeSlug,
  storeIsOpen,
  minimumOrderAmountCents = 0,
  deliveryEnabled = false,
}: MenuOrderingExperienceProps) {
  const { categories, featuredProducts } = menu;
  const { cart, addItem, setItemQuantity, removeItem } = useCart();
  const [selectedProduct, setSelectedProduct] =
    useState<PublicMenuProduct | null>(null);

  const handleCloseAddToCart = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  const displayedFeatured = useMemo(
    () => selectFeaturedProductsForDisplay(featuredProducts),
    [featuredProducts],
  );

  // Only strip products shown in the Destaques strip (not every DB featured flag).
  const featuredProductIds = useMemo(
    () => new Set(displayedFeatured.map((product) => product.id)),
    [displayedFeatured],
  );

  const catalogCategories = useMemo(
    () =>
      categories
        .map((category) => ({
          ...category,
          products: category.products.filter(
            (product) => !featuredProductIds.has(product.id),
          ),
        }))
        .filter((category) => category.products.length > 0),
    [categories, featuredProductIds],
  );

  const jumpCategories = useMemo(() => {
    const catalogIds = new Set(catalogCategories.map((category) => category.id));
    return categories
      .filter((category) => category.products.length > 0)
      .map((category) => ({
        id: category.id,
        name: category.name,
        href: catalogIds.has(category.id)
          ? `#category-${category.id}`
          : "#menu-featured-section",
      }));
  }, [categories, catalogCategories]);

  const cartQuantityByProductId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of cart.items) {
      counts[item.productId] = (counts[item.productId] ?? 0) + item.quantity;
    }
    return counts;
  }, [cart.items]);

  const hasProducts = categories.length > 0;
  const hasCartItems = cart.items.length > 0;

  return (
    <>
      <div
        className={`mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 ${
          hasCartItems ? "pb-36" : "pb-10"
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
            <CategoryJumpNavigation categories={jumpCategories} />

            {displayedFeatured.length > 0 ? (
              <section
                id="menu-featured-section"
                data-testid="menu-featured-section"
                className="flex scroll-mt-28 flex-col gap-4"
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
                    Comece por estes — o restante está nas categorias abaixo.
                  </p>
                </div>
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {displayedFeatured.map((product) => (
                    <li key={`featured-${product.id}`}>
                      <ProductCard
                        product={product}
                        onAdd={setSelectedProduct}
                        cartQuantity={cartQuantityByProductId[product.id] ?? 0}
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
                  Navegue pelas categorias e monte seu pedido.
                </p>
              </div>

              {catalogCategories.map((category) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  onAddProduct={setSelectedProduct}
                  cartQuantityByProductId={cartQuantityByProductId}
                />
              ))}
            </section>

            <section
              data-testid="menu-closing-cta"
              className="rounded-2xl border border-orange-500/25 bg-gradient-to-br from-stone-900 to-orange-950/40 px-5 py-6 text-center"
            >
              <h2 className="text-xl font-semibold text-orange-50">
                Pronto para finalizar?
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-stone-300">
                Revise seus itens e envie o pedido pelo WhatsApp.
              </p>
              {hasCartItems && storeIsOpen ? (
                <Link
                  href="/na-brasa/checkout"
                  data-testid="menu-closing-checkout-link"
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-bold text-stone-950"
                >
                  Ver meu pedido
                </Link>
              ) : (
                <p
                  data-testid="cart-empty-hint"
                  className="mt-4 text-sm text-stone-400"
                >
                  Toque em{" "}
                  <span className="font-medium text-stone-200">Adicionar</span>{" "}
                  para montar seu pedido.
                </p>
              )}
            </section>
          </>
        )}
      </div>

      <CartSummary
        cart={cart}
        storeIsOpen={storeIsOpen}
        minimumOrderAmountCents={minimumOrderAmountCents}
        deliveryEnabled={deliveryEnabled}
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
            trackClientFunnelEvent({
              storeSlug,
              name: "product_added",
              productId: selectedProduct.id,
              quantity,
              occurrenceId: createFunnelOccurrenceId(),
            });
            handleCloseAddToCart();
          }}
        />
      ) : null}
    </>
  );
}
