import { formatMoney } from "@/features/menu/format-money";
import type {
  DailyClosingFulfillmentChannel,
  DailyClosingPaymentMethod,
  DailyClosingReport,
} from "@/features/admin/reports/daily-closing.types";

function formatOperationalDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function paymentLabel(method: DailyClosingPaymentMethod): string {
  switch (method) {
    case "PIX":
      return "Pix";
    case "CASH":
      return "Dinheiro";
    case "CARD":
      return "Cartão";
    case "UNSET":
      return "Não informado";
    default:
      return method;
  }
}

function channelLabel(channel: DailyClosingFulfillmentChannel): string {
  switch (channel) {
    case "DELIVERY":
      return "Entrega";
    case "PICKUP":
      return "Retirada";
    case "COUNTER":
      return "Balcão";
    default:
      return channel;
  }
}

/**
 * Pure WhatsApp-ready summary. No PII. Values from the report DTO only.
 */
export function formatDailyClosingWhatsapp(report: DailyClosingReport): string {
  const lines: string[] = [
    `FECHAMENTO OPERACIONAL — ${report.storeName.toUpperCase()}`,
    `Data operacional: ${formatOperationalDate(report.period.date)}`,
    `Período: ${report.period.startTime}–${report.period.endTime}`,
    "",
    "TOTAL VENDIDO EM PEDIDOS CONCLUÍDOS",
    `Pedidos concluídos: ${report.summary.completedOrders}`,
    `Itens vendidos: ${report.summary.itemsSold}`,
    `Total de produtos: ${formatMoney(report.summary.productsSubtotalCents)}`,
    `Taxas de entrega: ${formatMoney(report.summary.deliveryFeesCents)}`,
    `Total vendido: ${formatMoney(report.summary.grossTotalCents)}`,
    `Ticket médio: ${formatMoney(report.summary.averageTicketCents)}`,
    `Cancelados: ${report.summary.cancelledOrders}`,
  ];

  if (report.summary.openOrders > 0) {
    lines.push("");
    if (report.summary.openOrders === 1) {
      lines.push(
        "Atenção: existe 1 pedido ainda aberto no período.",
        "O valor desse pedido não está incluído no total.",
      );
    } else {
      lines.push(
        `Atenção: existem ${report.summary.openOrders} pedidos ainda abertos no período.`,
        "Os valores desses pedidos não estão incluídos no total.",
      );
    }
  }

  if (report.payments.length > 0) {
    lines.push("", "FORMAS DE PAGAMENTO");
    for (const row of report.payments) {
      lines.push(
        `${paymentLabel(row.method)}: ${formatMoney(row.amountCents)} — ${row.orderCount} pedidos`,
      );
    }
  }

  if (report.fulfillment.length > 0) {
    lines.push("", "MODALIDADES");
    for (const row of report.fulfillment) {
      lines.push(
        `${channelLabel(row.channel)}: ${row.orderCount} pedidos — ${formatMoney(row.totalCents)}`,
      );
    }
  }

  if (report.products.length > 0) {
    lines.push("", "PRODUTOS");
    for (const row of report.products) {
      lines.push(`${row.name}: ${row.quantity}`);
    }
  }

  if (report.cancelledOrders.length > 0) {
    lines.push("", "CANCELADOS (não incluídos no faturamento)");
    for (const row of report.cancelledOrders) {
      lines.push(`${row.orderCode}: ${formatMoney(row.totalCents)}`);
    }
  }

  lines.push(
    "",
    "Observações:",
    "- Fechamento operacional — não é caixa conciliado nem resultado fiscal.",
  );

  if (report.summary.cancelledOrders > 0) {
    lines.push(
      `- ${report.summary.cancelledOrders} pedidos cancelados não incluídos no faturamento.`,
    );
  }

  return `${lines.join("\n")}\n`;
}
