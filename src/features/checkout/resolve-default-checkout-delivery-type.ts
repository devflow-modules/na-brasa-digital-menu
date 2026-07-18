export type CheckoutDeliveryType = "PICKUP" | "DELIVERY";

/**
 * Resolves a valid Online checkout default modality.
 * Returns null when the Store has no public modality enabled (legacy / misconfig).
 */
export function resolveDefaultCheckoutDeliveryType(store: {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
}): CheckoutDeliveryType | null {
  if (store.pickupEnabled) {
    return "PICKUP";
  }
  if (store.deliveryEnabled) {
    return "DELIVERY";
  }
  return null;
}

export function isOnlineCheckoutAvailable(store: {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
}): boolean {
  return store.pickupEnabled || store.deliveryEnabled;
}
