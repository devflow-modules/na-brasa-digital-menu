import { createOrderWithItems } from "@/features/orders/repositories/orders.repository";
import { createCounterOrderSchema } from "@/features/orders/schemas/create-counter-order.schema";
import { resolveAndPriceOrderItems } from "@/features/orders/services/resolve-and-price-order-items";
import type {
  CounterOrderContext,
  CreateCounterOrderInput,
  CreateCounterOrderResult,
  CreateOrderPersistenceInput,
} from "@/features/orders/types";
import { generateOrderCode } from "@/features/orders/utils/order-code";

const MAX_CODE_ATTEMPTS = 5;
const DEFAULT_CUSTOMER_LABEL = "Balcão";

function firstZodMessage(error: {
  issues: Array<{ message: string }>;
}): string {
  return error.issues[0]?.message ?? "Dados do pedido inválidos.";
}

export type CreateCounterOrderDeps = {
  resolveAndPriceOrderItems: typeof resolveAndPriceOrderItems;
  createOrderWithItems: typeof createOrderWithItems;
  generateOrderCode: typeof generateOrderCode;
};

const defaultDeps: CreateCounterOrderDeps = {
  resolveAndPriceOrderItems,
  createOrderWithItems,
  generateOrderCode,
};

/**
 * Authenticated COUNTER order creation.
 * storeId and createdByUserId must come from trusted admin context — never from client payload.
 */
export async function createCounterOrder(
  context: CounterOrderContext,
  rawInput: CreateCounterOrderInput | unknown,
  deps: CreateCounterOrderDeps = defaultDeps,
): Promise<CreateCounterOrderResult> {
  const parsed = createCounterOrderSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { ok: false, message: firstZodMessage(parsed.error) };
  }

  const input = parsed.data;
  const customerName =
    input.customerLabel?.trim() || DEFAULT_CUSTOMER_LABEL;
  const notes = input.notes?.trim() ? input.notes.trim() : null;

  const priced = await deps.resolveAndPriceOrderItems(
    context.storeId,
    input.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      addonIds: item.addonIds ?? [],
      notes: item.notes,
    })),
  );

  if (!priced.ok) {
    return priced;
  }

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = deps.generateOrderCode();

    const persistence: CreateOrderPersistenceInput = {
      storeId: context.storeId,
      code,
      customerName,
      customerPhone: null,
      deliveryType: "PICKUP",
      deliveryAddress: null,
      paymentMethod: null,
      changeForCents: null,
      notes,
      subtotalCents: priced.subtotalCents,
      deliveryFeeCents: 0,
      totalCents: priced.subtotalCents,
      source: "COUNTER",
      whatsappMessage: null,
      createdByUserId: context.createdByUserId,
      items: priced.items,
    };

    try {
      const created = await deps.createOrderWithItems(persistence);

      return {
        ok: true,
        orderId: created.id,
        orderCode: created.code,
      };
    } catch (error) {
      const isUniqueCodeConflict =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002";

      if (isUniqueCodeConflict && attempt < MAX_CODE_ATTEMPTS - 1) {
        continue;
      }

      console.error("[createCounterOrder] failed to persist order");
      return {
        ok: false,
        message: "Não foi possível criar o pedido. Tente novamente.",
      };
    }
  }

  return {
    ok: false,
    message: "Não foi possível criar o pedido. Tente novamente.",
  };
}
