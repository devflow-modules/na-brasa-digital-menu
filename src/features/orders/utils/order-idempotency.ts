import { createHmac } from "node:crypto";
import type {
  CreateOrderDeliveryType,
  CreateOrderPaymentMethod,
  PreparedOrderItem,
} from "@/features/orders/types";

export const ORDER_IDEMPOTENCY_CONFLICT_MESSAGE =
  "Esta tentativa de pedido conflita com um envio anterior. Atualize o carrinho e tente novamente.";

export type OrderIdempotencyCanonicalPayload = {
  storeId: string;
  customerName: string;
  customerPhone: string;
  deliveryType: CreateOrderDeliveryType;
  deliveryAddress: string | null;
  paymentMethod: CreateOrderPaymentMethod;
  changeForCents: number | null;
  notes: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  items: Array<{
    productId: string;
    quantity: number;
    addonIds: string[];
    unitPriceCents: number;
    totalCents: number;
  }>;
};

export function buildOrderIdempotencyCanonicalPayload(input: {
  storeId: string;
  customerName: string;
  customerPhone: string;
  deliveryType: CreateOrderDeliveryType;
  deliveryAddress: string | null;
  paymentMethod: CreateOrderPaymentMethod;
  changeForCents: number | null;
  notes: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  pricedItems: PreparedOrderItem[];
  clientItems: Array<{
    productId: string;
    quantity: number;
    addonIds: string[];
  }>;
}): OrderIdempotencyCanonicalPayload {
  const clientItemByProductId = new Map(
    input.clientItems.map((item) => [item.productId, item] as const),
  );

  const items = input.pricedItems
    .map((priced) => {
      const client = clientItemByProductId.get(priced.productId);
      const addonIds = [...(client?.addonIds ?? priced.addons.map((a) => a.addonId))].sort();
      return {
        productId: priced.productId,
        quantity: priced.quantity,
        addonIds,
        unitPriceCents: priced.unitPriceCents,
        totalCents: priced.totalCents,
      };
    })
    .sort((a, b) => {
      const byProduct = a.productId.localeCompare(b.productId);
      if (byProduct !== 0) {
        return byProduct;
      }
      return a.quantity - b.quantity;
    });

  return {
    storeId: input.storeId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    deliveryType: input.deliveryType,
    deliveryAddress: input.deliveryAddress,
    paymentMethod: input.paymentMethod,
    changeForCents: input.changeForCents,
    notes: input.notes,
    subtotalCents: input.subtotalCents,
    deliveryFeeCents: input.deliveryFeeCents,
    totalCents: input.totalCents,
    items,
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`,
  );
  return `{${entries.join(",")}}`;
}

export function computeOrderIdempotencyFingerprint(
  secret: string,
  payload: OrderIdempotencyCanonicalPayload,
): string {
  const canonical = stableStringify(payload);
  return createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
}

export function getOrderIdempotencySecret(): string {
  const secret = process.env.ORDER_IDEMPOTENCY_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error("ORDER_IDEMPOTENCY_SECRET is not configured");
  }
  return secret;
}

export function isPrismaUniqueConstraintOn(
  error: unknown,
  fields: string[],
): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  if ((error as { code?: string }).code !== "P2002") {
    return false;
  }
  const target = (error as { meta?: { target?: string[] } }).meta?.target;
  if (!target) {
    return false;
  }
  return fields.every((field) => target.includes(field));
}
