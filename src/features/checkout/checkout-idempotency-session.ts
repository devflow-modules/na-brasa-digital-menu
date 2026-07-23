const STORAGE_PREFIX = "na-brasa:checkout-idempotency:";

export type CheckoutIdempotencyAttempt = {
  idempotencyKey: string;
  contentSignature: string;
};

export type CheckoutIdempotencyContent = {
  items: Array<{
    productId: string;
    quantity: number;
    addonIds: string[];
  }>;
  customerName: string;
  customerPhone: string;
  deliveryType: string;
  deliveryAddress?: string;
  paymentMethod: string;
  changeFor?: string;
  notes?: string;
};

function storageKey(storeSlug: string): string {
  return `${STORAGE_PREFIX}${storeSlug}`;
}

function stableSerialize(content: CheckoutIdempotencyContent): string {
  const items = [...content.items]
    .map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      addonIds: [...item.addonIds].sort(),
    }))
    .sort((a, b) => a.productId.localeCompare(b.productId));

  return JSON.stringify({
    items,
    customerName: content.customerName.trim(),
    customerPhone: content.customerPhone.trim(),
    deliveryType: content.deliveryType,
    deliveryAddress: content.deliveryAddress?.trim() ?? "",
    paymentMethod: content.paymentMethod,
    changeFor: content.changeFor?.trim() ?? "",
    notes: content.notes?.trim() ?? "",
  });
}

export function buildCheckoutContentSignature(
  content: CheckoutIdempotencyContent,
): string {
  return stableSerialize(content);
}

export function readCheckoutIdempotencyAttempt(
  storeSlug: string,
): CheckoutIdempotencyAttempt | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(storageKey(storeSlug));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CheckoutIdempotencyAttempt;
    if (
      typeof parsed.idempotencyKey !== "string" ||
      typeof parsed.contentSignature !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function resolveCheckoutIdempotencyKey(
  storeSlug: string,
  content: CheckoutIdempotencyContent,
): string {
  const contentSignature = buildCheckoutContentSignature(content);
  const existing = readCheckoutIdempotencyAttempt(storeSlug);
  if (existing && existing.contentSignature === contentSignature) {
    return existing.idempotencyKey;
  }

  const idempotencyKey = crypto.randomUUID();
  const attempt: CheckoutIdempotencyAttempt = {
    idempotencyKey,
    contentSignature,
  };
  window.sessionStorage.setItem(storageKey(storeSlug), JSON.stringify(attempt));
  return idempotencyKey;
}

export function clearCheckoutIdempotencyAttempt(storeSlug: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(storageKey(storeSlug));
}
