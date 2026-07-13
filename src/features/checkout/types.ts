export type CheckoutDeliveryType = "PICKUP" | "DELIVERY";

export type CheckoutPaymentMethod =
  | "PIX"
  | "CASH"
  | "DEBIT_CARD"
  | "CREDIT_CARD";

export type CheckoutStoreInfo = {
  id: string;
  name: string;
  slug: string;
  isOpen: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeeCents: number;
  minimumOrderAmountCents: number;
};
