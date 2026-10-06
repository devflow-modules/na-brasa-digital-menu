import type {
  DailyClosingAddonRow,
  DailyClosingFulfillmentChannel,
  DailyClosingFulfillmentRow,
  DailyClosingOrderInput,
  DailyClosingPaymentMethod,
  DailyClosingPaymentRow,
  DailyClosingPeriod,
  DailyClosingProductRow,
  DailyClosingReport,
} from "@/features/admin/reports/daily-closing.types";

function paymentKey(
  method: DailyClosingOrderInput["paymentMethod"],
): DailyClosingPaymentMethod {
  return method ?? "UNSET";
}

function fulfillmentChannel(
  order: DailyClosingOrderInput,
): DailyClosingFulfillmentChannel {
  if (order.source === "COUNTER") {
    return "COUNTER";
  }
  if (order.deliveryType === "DELIVERY") {
    return "DELIVERY";
  }
  return "PICKUP";
}

function compareProducts(a: DailyClosingProductRow, b: DailyClosingProductRow): number {
  if (b.quantity !== a.quantity) {
    return b.quantity - a.quantity;
  }
  if (b.amountCents !== a.amountCents) {
    return b.amountCents - a.amountCents;
  }
  return a.name.localeCompare(b.name, "pt-BR");
}

function compareAddons(a: DailyClosingAddonRow, b: DailyClosingAddonRow): number {
  if (b.quantity !== a.quantity) {
    return b.quantity - a.quantity;
  }
  if (b.amountCents !== a.amountCents) {
    return b.amountCents - a.amountCents;
  }
  return a.name.localeCompare(b.name, "pt-BR");
}

const PAYMENT_ORDER: DailyClosingPaymentMethod[] = [
  "PIX",
  "CASH",
  "DEBIT_CARD",
  "CREDIT_CARD",
  "CARD",
  "UNSET",
];

const FULFILLMENT_ORDER: DailyClosingFulfillmentChannel[] = [
  "DELIVERY",
  "PICKUP",
  "COUNTER",
];

/**
 * Pure aggregation for the daily closing report.
 * Monetary values stay in integer cents. Only COMPLETED orders enter revenue.
 */
export function aggregateDailyClosingReport(options: {
  storeName: string;
  period: DailyClosingPeriod;
  orders: DailyClosingOrderInput[];
  generatedAt?: Date;
}): DailyClosingReport {
  const generatedAt = options.generatedAt ?? new Date();
  const completed = options.orders.filter((order) => order.status === "COMPLETED");
  const cancelled = options.orders.filter((order) => order.status === "CANCELLED");
  const open = options.orders.filter(
    (order) => order.status !== "COMPLETED" && order.status !== "CANCELLED",
  );

  let itemsSold = 0;
  let productsSubtotalCents = 0;
  let deliveryFeesCents = 0;
  let grossTotalCents = 0;
  let splitTenderCompletedOrders = 0;

  const paymentMap = new Map<
    DailyClosingPaymentMethod,
    {
      orderCount: number;
      amountCents: number;
      deliveryFeesCents: number;
      products: Map<string, DailyClosingProductRow>;
    }
  >();
  const fulfillmentMap = new Map<
    DailyClosingFulfillmentChannel,
    {
      orderCount: number;
      productsSubtotalCents: number;
      deliveryFeesCents: number;
      totalCents: number;
    }
  >();
  const productMap = new Map<string, DailyClosingProductRow>();
  const addonMap = new Map<string, DailyClosingAddonRow>();

  function ensurePaymentRow(method: DailyClosingPaymentMethod) {
    const existing = paymentMap.get(method);
    if (existing) {
      return existing;
    }
    const created = {
      orderCount: 0,
      amountCents: 0,
      deliveryFeesCents: 0,
      products: new Map<string, DailyClosingProductRow>(),
    };
    paymentMap.set(method, created);
    return created;
  }

  function attributeOrderItemsToPayment(
    method: DailyClosingPaymentMethod,
    order: DailyClosingOrderInput,
  ) {
    const payRow = ensurePaymentRow(method);
    payRow.deliveryFeesCents += order.deliveryFeeCents;

    for (const item of order.items) {
      const productKey = `${item.productId ?? "null"}::${item.productNameSnapshot}`;
      const productRow = payRow.products.get(productKey) ?? {
        productId: item.productId,
        name: item.productNameSnapshot,
        quantity: 0,
        amountCents: 0,
      };
      productRow.quantity += item.quantity;
      productRow.amountCents += item.totalCents;
      payRow.products.set(productKey, productRow);
    }
  }

  for (const order of completed) {
    productsSubtotalCents += order.subtotalCents;
    deliveryFeesCents += order.deliveryFeeCents;
    grossTotalCents += order.totalCents;

    const isSplitTender = order.payments.length > 1;
    if (isSplitTender) {
      splitTenderCompletedOrders += 1;
    }

    // Exclusive: OrderPayment lines OR legacy paymentMethod — never both.
    if (order.payments.length > 0) {
      for (const payment of order.payments) {
        const pay = paymentKey(payment.method);
        const payRow = ensurePaymentRow(pay);
        payRow.orderCount += 1;
        payRow.amountCents += payment.amountCents;
      }
      // Single OrderPayment line: attribute items/fees. Split tender: amounts only.
      if (!isSplitTender) {
        attributeOrderItemsToPayment(paymentKey(order.payments[0]!.method), order);
      }
    } else {
      const pay = paymentKey(order.paymentMethod);
      const payRow = ensurePaymentRow(pay);
      payRow.orderCount += 1;
      payRow.amountCents += order.totalCents;
      attributeOrderItemsToPayment(pay, order);
    }

    const channel = fulfillmentChannel(order);
    const channelRow = fulfillmentMap.get(channel) ?? {
      orderCount: 0,
      productsSubtotalCents: 0,
      deliveryFeesCents: 0,
      totalCents: 0,
    };
    channelRow.orderCount += 1;
    channelRow.productsSubtotalCents += order.subtotalCents;
    channelRow.deliveryFeesCents += order.deliveryFeeCents;
    channelRow.totalCents += order.totalCents;
    fulfillmentMap.set(channel, channelRow);

    for (const item of order.items) {
      itemsSold += item.quantity;

      const productKey = `${item.productId ?? "null"}::${item.productNameSnapshot}`;
      const productRow = productMap.get(productKey) ?? {
        productId: item.productId,
        name: item.productNameSnapshot,
        quantity: 0,
        amountCents: 0,
      };
      productRow.quantity += item.quantity;
      productRow.amountCents += item.totalCents;
      productMap.set(productKey, productRow);

      for (const addon of item.addons) {
        const addonKey = `${addon.addonId ?? "null"}::${addon.addonNameSnapshot}`;
        const addonRow = addonMap.get(addonKey) ?? {
          addonId: addon.addonId,
          name: addon.addonNameSnapshot,
          quantity: 0,
          amountCents: 0,
        };
        // addonPriceCents is unit price; multiply by parent item quantity.
        addonRow.quantity += item.quantity;
        addonRow.amountCents += addon.addonPriceCents * item.quantity;
        addonMap.set(addonKey, addonRow);
      }
    }
  }

  const payments: DailyClosingPaymentRow[] = PAYMENT_ORDER.filter((method) =>
    paymentMap.has(method),
  ).map((method) => {
    const row = paymentMap.get(method)!;
    const percentageBps =
      grossTotalCents > 0
        ? Math.round((row.amountCents * 10_000) / grossTotalCents)
        : 0;
    return {
      method,
      orderCount: row.orderCount,
      amountCents: row.amountCents,
      percentageBps,
      products: [...row.products.values()].sort(compareProducts),
      deliveryFeesCents: row.deliveryFeesCents,
    };
  });

  const fulfillment: DailyClosingFulfillmentRow[] = FULFILLMENT_ORDER.filter(
    (channel) => fulfillmentMap.has(channel),
  ).map((channel) => {
    const row = fulfillmentMap.get(channel)!;
    return { channel, ...row };
  });

  const products = [...productMap.values()].sort(compareProducts);
  const addons = [...addonMap.values()].sort(compareAddons);

  const completedOrders = completed.length;
  const averageTicketCents =
    completedOrders > 0 ? Math.round(grossTotalCents / completedOrders) : 0;

  const notes: string[] = [
    "Fechamento operacional — não é caixa conciliado nem resultado fiscal.",
    "Pedidos online concluídos não confirmam recebimento financeiro (paidAt).",
    "Formas de pagamento: usa OrderPayment quando existir; senão paymentMethod legado (nunca as duas).",
  ];

  if (splitTenderCompletedOrders > 0) {
    notes.push(
      splitTenderCompletedOrders === 1
        ? "1 comanda concluída usou pagamento misto (mais de uma forma)."
        : `${splitTenderCompletedOrders} comandas concluídas usaram pagamento misto (mais de uma forma).`,
    );
  }

  if (open.length > 0) {
    notes.push(
      open.length === 1
        ? "Atenção: existe 1 pedido ainda aberto no período. O valor desse pedido não está incluído no total."
        : `Atenção: existem ${open.length} pedidos ainda abertos no período. Os valores desses pedidos não estão incluídos no total.`,
    );
  }

  return {
    storeName: options.storeName,
    period: options.period,
    generatedAtIso: generatedAt.toISOString(),
    summary: {
      completedOrders,
      cancelledOrders: cancelled.length,
      openOrders: open.length,
      itemsSold,
      productsSubtotalCents,
      deliveryFeesCents,
      grossTotalCents,
      averageTicketCents,
      splitTenderCompletedOrders,
    },
    payments,
    fulfillment,
    products,
    addons,
    cancelledOrders: cancelled
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((order) => ({
        orderCode: order.code,
        createdAtIso: order.createdAt.toISOString(),
        totalCents: order.totalCents,
      })),
    notes,
  };
}
