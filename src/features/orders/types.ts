export type CreateOrderPaymentMethod =
  | "PIX"
  | "CASH"
  | "DEBIT_CARD"
  | "CREDIT_CARD";

export type CreateOrderDeliveryType = "PICKUP" | "DELIVERY";

export type CreateOrderItemInput = {
  productId: string;
  quantity: number;
  addonIds: string[];
};

export type CreateOrderInput = {
  storeSlug: string;
  customerName: string;
  customerPhone: string;
  deliveryType: CreateOrderDeliveryType;
  deliveryAddress?: string;
  paymentMethod: CreateOrderPaymentMethod;
  changeFor?: string;
  notes?: string;
  items: CreateOrderItemInput[];
};

export type CreateOrderSuccess = {
  ok: true;
  orderId: string;
  orderCode: string;
  whatsappUrl: string;
};

export type CreateOrderFailure = {
  ok: false;
  message: string;
};

export type CreateOrderResult = CreateOrderSuccess | CreateOrderFailure;

export type PreparedOrderItemAddon = {
  addonId: string;
  addonNameSnapshot: string;
  addonPriceCents: number;
};

export type PreparedOrderItem = {
  productId: string;
  productNameSnapshot: string;
  productDescriptionSnapshot: string | null;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  addons: PreparedOrderItemAddon[];
};

export type PreparedOrder = {
  storeId: string;
  storeName: string;
  storeWhatsapp: string;
  code: string;
  customerName: string;
  customerPhone: string;
  deliveryType: CreateOrderDeliveryType;
  deliveryAddress: string | null;
  paymentMethod: "PIX" | "CASH" | "CARD";
  paymentLabel: string;
  changeForCents: number | null;
  notes: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  items: PreparedOrderItem[];
};
