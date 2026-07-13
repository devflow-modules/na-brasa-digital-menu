"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildCartState,
  removeCartItem,
  updateCartItemQuantity,
  upsertCartItem,
} from "@/features/cart/cart-utils";
import type { AddToCartInput, CartItem, CartState } from "@/features/cart/types";

const STORAGE_KEY = "na-brasa-cart-v1";

function readStoredItems(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as { items?: CartItem[] };
    if (!Array.isArray(parsed.items)) {
      return [];
    }

    return parsed.items.filter(
      (item) =>
        typeof item?.id === "string" &&
        typeof item?.productId === "string" &&
        typeof item?.quantity === "number" &&
        typeof item?.totalCents === "number",
    );
  } catch {
    return [];
  }
}

function persistItems(items: CartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStoredItems());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    persistItems(items);
  }, [items, hydrated]);

  const cart: CartState = useMemo(() => buildCartState(items), [items]);

  const addItem = useCallback((input: AddToCartInput) => {
    setItems((current) => upsertCartItem(current, input));
  }, []);

  const setItemQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity < 1) {
      setItems((current) => removeCartItem(current, itemId));
      return;
    }

    setItems((current) => updateCartItemQuantity(current, itemId, quantity));
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((current) => removeCartItem(current, itemId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  return {
    cart,
    hydrated,
    addItem,
    setItemQuantity,
    removeItem,
    clearCart,
  };
}
