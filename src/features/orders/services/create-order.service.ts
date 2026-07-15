import { createOrderSchema } from "@/features/orders/schemas/create-order.schema";
import {
  createOrderWithItems,
  findStoreForOrderBySlug,
} from "@/features/orders/repositories/orders.repository";
import { resolveAndPriceOrderItems } from "@/features/orders/services/resolve-and-price-order-items";
import type {
  CreateOrderInput,
  CreateOrderPaymentMethod,
  CreateOrderPersistenceInput,
  CreateOrderResult,
} from "@/features/orders/types";
import { generateOrderCode } from "@/features/orders/utils/order-code";
import { parseCurrencyToCents } from "@/features/orders/utils/parse-currency-to-cents";
import { createWhatsAppUrl } from "@/features/orders/whatsapp/create-whatsapp-url";
import { formatWhatsAppMessage } from "@/features/orders/whatsapp/format-whatsapp-message";

const MAX_CODE_ATTEMPTS = 5;

function paymentLabel(method: CreateOrderPaymentMethod): string {
  switch (method) {
    case "PIX":
      return "Pix";
    case "CASH":
      return "Dinheiro";
    case "DEBIT_CARD":
      return "Débito";
    case "CREDIT_CARD":
      return "Crédito";
  }
}

function toPrismaPaymentMethod(
  method: CreateOrderPaymentMethod,
): "PIX" | "CASH" | "CARD" {
  if (method === "DEBIT_CARD" || method === "CREDIT_CARD") {
    return "CARD";
  }

  return method;
}

function firstZodMessage(error: {
  issues: Array<{ message: string }>;
}): string {
  return error.issues[0]?.message ?? "Dados do pedido inválidos.";
}

export async function createOrder(
  rawInput: CreateOrderInput,
): Promise<CreateOrderResult> {
  const parsed = createOrderSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { ok: false, message: firstZodMessage(parsed.error) };
  }

  const input = parsed.data;

  const store = await findStoreForOrderBySlug(input.storeSlug);
  if (!store) {
    return { ok: false, message: "Loja não encontrada." };
  }

  if (!store.isOpen) {
    return { ok: false, message: "A loja está fechada no momento." };
  }

  if (!store.whatsapp?.trim()) {
    return { ok: false, message: "WhatsApp da loja não configurado." };
  }

  if (input.deliveryType === "PICKUP" && !store.pickupEnabled) {
    return { ok: false, message: "Retirada indisponível no momento." };
  }

  if (input.deliveryType === "DELIVERY" && !store.deliveryEnabled) {
    return { ok: false, message: "Entrega indisponível no momento." };
  }

  const priced = await resolveAndPriceOrderItems(
    store.id,
    input.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      addonIds: item.addonIds,
      notes: null,
    })),
  );

  if (!priced.ok) {
    return priced;
  }

  if (
    store.minimumOrderAmountCents > 0 &&
    priced.subtotalCents < store.minimumOrderAmountCents
  ) {
    return {
      ok: false,
      message: "O pedido não atingiu o valor mínimo.",
    };
  }

  const deliveryFeeCents =
    input.deliveryType === "DELIVERY" ? store.deliveryFeeCents : 0;
  const totalCents = priced.subtotalCents + deliveryFeeCents;

  let changeForCents: number | null = null;
  if (input.paymentMethod === "CASH" && input.changeFor) {
    const parsedChange = parseCurrencyToCents(input.changeFor);
    if (parsedChange === null) {
      return { ok: false, message: "Valor de troco inválido." };
    }
    changeForCents = parsedChange;
  }

  const deliveryAddress =
    input.deliveryType === "DELIVERY"
      ? (input.deliveryAddress?.trim() ?? null)
      : null;

  const notes = input.notes?.trim() ? input.notes.trim() : null;
  const label = paymentLabel(input.paymentMethod);
  const customerName = input.customerName.trim();
  const customerPhone = input.customerPhone.trim();
  const paymentMethod = toPrismaPaymentMethod(input.paymentMethod);

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateOrderCode();

    const whatsappMessage = formatWhatsAppMessage({
      code,
      storeName: store.name,
      customerName,
      customerPhone,
      deliveryType: input.deliveryType,
      deliveryAddress,
      paymentLabel: label,
      changeForCents,
      notes,
      subtotalCents: priced.subtotalCents,
      deliveryFeeCents,
      totalCents,
      items: priced.items.map((item) => ({
        quantity: item.quantity,
        productName: item.productNameSnapshot,
        lineTotalCents: item.totalCents,
        addons: item.addons.map((addon) => ({
          name: addon.addonNameSnapshot,
          priceCents: addon.addonPriceCents,
        })),
      })),
    });

    const persistence: CreateOrderPersistenceInput = {
      storeId: store.id,
      code,
      customerName,
      customerPhone,
      deliveryType: input.deliveryType,
      deliveryAddress,
      paymentMethod,
      changeForCents,
      notes,
      subtotalCents: priced.subtotalCents,
      deliveryFeeCents,
      totalCents,
      source: "DIRECT",
      whatsappMessage,
      createdByUserId: null,
      items: priced.items,
    };

    try {
      const created = await createOrderWithItems(persistence);
      const whatsappUrl = createWhatsAppUrl(store.whatsapp, whatsappMessage);

      return {
        ok: true,
        orderId: created.id,
        orderCode: created.code,
        whatsappUrl,
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

      console.error("[createOrder] failed to persist order");
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
