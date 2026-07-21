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
  notes: string | null;
  addons: PreparedOrderItemAddon[];
};

export type CreateOrderPersistenceInput = {
  storeId: string;
  code: string;
  customerName: string;
  customerPhone: string | null;
  deliveryType: CreateOrderDeliveryType;
  deliveryAddress: string | null;
  paymentMethod: "PIX" | "CASH" | "DEBIT_CARD" | "CREDIT_CARD" | null;
  changeForCents: number | null;
  notes: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  source: "DIRECT" | "COUNTER";
  whatsappMessage: string | null;
  createdByUserId: string | null;
  items: PreparedOrderItem[];
};

export type CounterOrderContext = {
  storeId: string;
  createdByUserId: string;
};

export type CreateCounterOrderInput = {
  customerLabel?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    addonIds?: string[];
    notes?: string;
  }>;
};

export type CreateCounterOrderSuccess = {
  ok: true;
  orderId: string;
  orderCode: string;
};

export type CreateCounterOrderFailure = {
  ok: false;
  message: string;
};

export type CreateCounterOrderResult =
  | CreateCounterOrderSuccess
  | CreateCounterOrderFailure;
