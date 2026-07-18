export type DeliveryMinimumDeliveryType = "PICKUP" | "DELIVERY";

/** Minimum order applies only to delivery fulfillment — not pickup or counter. */
export function requiresDeliveryMinimumOrder(
  deliveryType: DeliveryMinimumDeliveryType,
): boolean {
  return deliveryType === "DELIVERY";
}

/**
 * True when delivery minimum applies and subtotal (products + addons, before fee)
 * is below the store minimum.
 */
export function isBelowDeliveryMinimumOrder(input: {
  deliveryType: DeliveryMinimumDeliveryType;
  subtotalCents: number;
  minimumOrderAmountCents: number;
}): boolean {
  if (!requiresDeliveryMinimumOrder(input.deliveryType)) {
    return false;
  }

  if (input.minimumOrderAmountCents <= 0) {
    return false;
  }

  return input.subtotalCents < input.minimumOrderAmountCents;
}
