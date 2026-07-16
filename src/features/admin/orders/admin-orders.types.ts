export type AdminOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";

export type AdminDeliveryType = "PICKUP" | "DELIVERY";

export type AdminPaymentMethod = "CASH" | "PIX" | "CARD";

export type AdminOrderSource = "DIRECT" | "IFOOD" | "OTHER" | "COUNTER";

export type AdminOrderListItem = {
  id: string;
  code: string;
  status: AdminOrderStatus;
  source: AdminOrderSource;
  customerName: string;
  customerPhone: string | null;
  deliveryType: AdminDeliveryType;
  paymentMethod: AdminPaymentMethod | null;
  totalCents: number;
  createdAt: Date;
};

export type AdminOrderAddonDetail = {
  id: string;
  addonNameSnapshot: string;
  addonPriceCents: number;
};

export type AdminOrderItemDetail = {
  id: string;
  productNameSnapshot: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  notes: string | null;
  addons: AdminOrderAddonDetail[];
};

export type AdminOrderDetail = {
  id: string;
  code: string;
  status: AdminOrderStatus;
  source: AdminOrderSource;
  customerName: string;
  customerPhone: string | null;
  deliveryType: AdminDeliveryType;
  deliveryAddress: string | null;
  paymentMethod: AdminPaymentMethod | null;
  changeForCents: number | null;
  paidAt: Date | null;
  notes: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  whatsappMessage: string | null;
  createdAt: Date;
  items: AdminOrderItemDetail[];
};

export type AdminOrdersSummary = {
  ordersToday: number;
  pendingCount: number;
  revenueTodayCents: number;
  displayedCount: number;
};

/** Serializable cursor for admin new-order polling (DIRECT only). */
export type AdminNewOrderCursor = {
  createdAt: string;
  id: string;
};

/** Minimal payload for a new DIRECT order alert (no PII beyond display name). */
export type AdminNewOrderNotificationItem = {
  id: string;
  code: string;
  source: "DIRECT";
  status: AdminOrderStatus;
  customerName: string;
  totalCents: number;
  createdAt: string;
};
