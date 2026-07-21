export const DAILY_CLOSING_TIMEZONE = "America/Sao_Paulo" as const;

export const DEFAULT_DAILY_CLOSING_START = "17:00" as const;
export const DEFAULT_DAILY_CLOSING_END = "01:00" as const;

export type DailyClosingPaymentMethod =
  | "CASH"
  | "PIX"
  | "DEBIT_CARD"
  | "CREDIT_CARD"
  | "CARD"
  | "UNSET";

export type DailyClosingFulfillmentChannel =
  | "DELIVERY"
  | "PICKUP"
  | "COUNTER";

export type DailyClosingPeriod = {
  date: string;
  timezone: typeof DAILY_CLOSING_TIMEZONE;
  startTime: string;
  endTime: string;
  start: Date;
  endExclusive: Date;
  startIso: string;
  endExclusiveIso: string;
};

export type DailyClosingPaymentRow = {
  method: DailyClosingPaymentMethod;
  orderCount: number;
  amountCents: number;
  percentageBps: number;
};

export type DailyClosingFulfillmentRow = {
  channel: DailyClosingFulfillmentChannel;
  orderCount: number;
  productsSubtotalCents: number;
  deliveryFeesCents: number;
  totalCents: number;
};

export type DailyClosingProductRow = {
  productId: string | null;
  name: string;
  quantity: number;
  amountCents: number;
};

export type DailyClosingAddonRow = {
  addonId: string | null;
  name: string;
  quantity: number;
  amountCents: number;
};

export type DailyClosingCancelledOrder = {
  orderCode: string;
  createdAtIso: string;
  totalCents: number;
};

export type DailyClosingSummary = {
  completedOrders: number;
  cancelledOrders: number;
  openOrders: number;
  itemsSold: number;
  productsSubtotalCents: number;
  deliveryFeesCents: number;
  grossTotalCents: number;
  averageTicketCents: number;
};

export type DailyClosingReport = {
  storeName: string;
  period: DailyClosingPeriod;
  generatedAtIso: string;
  summary: DailyClosingSummary;
  payments: DailyClosingPaymentRow[];
  fulfillment: DailyClosingFulfillmentRow[];
  products: DailyClosingProductRow[];
  addons: DailyClosingAddonRow[];
  cancelledOrders: DailyClosingCancelledOrder[];
  notes: string[];
};

export type DailyClosingOrderItemAddonInput = {
  addonId: string | null;
  addonNameSnapshot: string;
  addonPriceCents: number;
};

export type DailyClosingOrderItemInput = {
  productId: string | null;
  productNameSnapshot: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  addons: DailyClosingOrderItemAddonInput[];
};

export type DailyClosingOrderInput = {
  code: string;
  status: string;
  source: string;
  deliveryType: string;
  paymentMethod:
    | "CASH"
    | "PIX"
    | "DEBIT_CARD"
    | "CREDIT_CARD"
    | "CARD"
    | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  createdAt: Date;
  items: DailyClosingOrderItemInput[];
};
