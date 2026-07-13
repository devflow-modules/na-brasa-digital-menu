import { createOrderSchema } from "@/features/orders/schemas/create-order.schema";
import {
  createOrderWithItems,
  findActiveProductsForOrder,
  findStoreForOrderBySlug,
} from "@/features/orders/repositories/orders.repository";
import type {
  CreateOrderInput,
  CreateOrderPaymentMethod,
  CreateOrderResult,
  PreparedOrder,
  PreparedOrderItem,
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

  if (!store.whatsapp?.trim()) {
    return { ok: false, message: "WhatsApp da loja não configurado." };
  }

  if (input.deliveryType === "PICKUP" && !store.pickupEnabled) {
    return { ok: false, message: "Retirada não está disponível." };
  }

  if (input.deliveryType === "DELIVERY" && !store.deliveryEnabled) {
    return { ok: false, message: "Entrega não está disponível." };
  }

  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const products = await findActiveProductsForOrder(store.id, productIds);
  const productsById = new Map(products.map((product) => [product.id, product]));

  const preparedItems: PreparedOrderItem[] = [];

  for (const item of input.items) {
    const product = productsById.get(item.productId);

    if (!product) {
      return { ok: false, message: "Um ou mais produtos não foram encontrados." };
    }

    if (!product.active) {
      return {
        ok: false,
        message: `O produto "${product.name}" não está disponível.`,
      };
    }

    const addonsById = new Map(
      product.productAddons.map((link) => [link.addon.id, link.addon]),
    );

    const uniqueAddonIds = [...new Set(item.addonIds)];
    const preparedAddons = [];

    for (const addonId of uniqueAddonIds) {
      const addon = addonsById.get(addonId);

      if (!addon) {
        return {
          ok: false,
          message: `Adicional inválido para o produto "${product.name}".`,
        };
      }

      if (!addon.active) {
        return {
          ok: false,
          message: `O adicional "${addon.name}" não está disponível.`,
        };
      }

      preparedAddons.push({
        addonId: addon.id,
        addonNameSnapshot: addon.name,
        addonPriceCents: addon.priceCents,
      });
    }

    const addonsTotalCents = preparedAddons.reduce(
      (sum, addon) => sum + addon.addonPriceCents,
      0,
    );
    const unitPriceCents = product.priceCents + addonsTotalCents;
    const totalCents = unitPriceCents * item.quantity;

    preparedItems.push({
      productId: product.id,
      productNameSnapshot: product.name,
      productDescriptionSnapshot: product.description,
      quantity: item.quantity,
      unitPriceCents,
      totalCents,
      addons: preparedAddons,
    });
  }

  const subtotalCents = preparedItems.reduce(
    (sum, item) => sum + item.totalCents,
    0,
  );

  if (
    store.minimumOrderAmountCents > 0 &&
    subtotalCents < store.minimumOrderAmountCents
  ) {
    return {
      ok: false,
      message: "O pedido não atingiu o valor mínimo.",
    };
  }

  const deliveryFeeCents =
    input.deliveryType === "DELIVERY" ? store.deliveryFeeCents : 0;
  const totalCents = subtotalCents + deliveryFeeCents;

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

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateOrderCode();

    const prepared: PreparedOrder = {
      storeId: store.id,
      storeName: store.name,
      storeWhatsapp: store.whatsapp,
      code,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      deliveryType: input.deliveryType,
      deliveryAddress,
      paymentMethod: toPrismaPaymentMethod(input.paymentMethod),
      paymentLabel: label,
      changeForCents,
      notes,
      subtotalCents,
      deliveryFeeCents,
      totalCents,
      items: preparedItems,
    };

    const whatsappMessage = formatWhatsAppMessage({
      code: prepared.code,
      storeName: prepared.storeName,
      customerName: prepared.customerName,
      customerPhone: prepared.customerPhone,
      deliveryType: prepared.deliveryType,
      deliveryAddress: prepared.deliveryAddress,
      paymentLabel: prepared.paymentLabel,
      changeForCents: prepared.changeForCents,
      notes: prepared.notes,
      subtotalCents: prepared.subtotalCents,
      deliveryFeeCents: prepared.deliveryFeeCents,
      totalCents: prepared.totalCents,
      items: prepared.items.map((item) => ({
        quantity: item.quantity,
        productName: item.productNameSnapshot,
        lineTotalCents: item.totalCents,
        addons: item.addons.map((addon) => ({
          name: addon.addonNameSnapshot,
          priceCents: addon.addonPriceCents,
        })),
      })),
    });

    try {
      const created = await createOrderWithItems(prepared, whatsappMessage);
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
