import { formatMoney } from "@/features/menu/format-money";
import { dailyClosingPaymentLabel } from "@/features/admin/reports/daily-closing-payment-labels";
import type {
  DailyClosingFulfillmentChannel,
  DailyClosingReport,
} from "@/features/admin/reports/daily-closing.types";

function formatOperationalDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
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

function pedidoCountLabel(count: number): string {
  return count === 1 ? "1 pedido" : `${count} pedidos`;
}

/** Format basis points (1% = 100 bps) as Brazilian percentage text. */
function formatWhatsappPercentage(bps: number): string {
  const whole = Math.floor(bps / 100);
  const fraction = String(bps % 100).padStart(2, "0");
  return `${whole},${fraction}%`;
}

/**
 * Pure WhatsApp-ready summary. No PII. Values from the report DTO only.
 */
export function formatDailyClosingWhatsapp(report: DailyClosingReport): string {
  const lines: string[] = [
    `🔥 *FECHAMENTO OPERACIONAL — ${report.storeName.toUpperCase()}*`,
    "",
    `📅 *Data operacional:* ${formatOperationalDate(report.period.date)}`,
    `🕒 *Período:* ${report.period.startTime}–${report.period.endTime}`,
  ];

  if (report.summary.openOrders > 0) {
    lines.push("", "⚠️ *ATENÇÃO*");
    if (report.summary.openOrders === 1) {
      lines.push(
        "Existe 1 pedido ainda aberto.",
        "O valor não está incluído no total.",
      );
    } else {
      lines.push(
        `Existem ${report.summary.openOrders} pedidos ainda abertos.`,
        "Os valores não estão incluídos no total.",
      );
    }
  }

  lines.push(
    "",
    "💰 *TOTAL VENDIDO EM PEDIDOS CONCLUÍDOS*",
    `Pedidos: ${report.summary.completedOrders}`,
    `Itens vendidos: ${report.summary.itemsSold}`,
    `Produtos: ${formatMoney(report.summary.productsSubtotalCents)}`,
    `Taxas de entrega: ${formatMoney(report.summary.deliveryFeesCents)}`,
    `*Total vendido: ${formatMoney(report.summary.grossTotalCents)}*`,
    `Ticket médio: ${formatMoney(report.summary.averageTicketCents)}`,
    `Pagamento misto: ${report.summary.splitTenderCompletedOrders}`,
  );

  if (report.payments.length > 0) {
    lines.push("", "💳 *FORMAS DE PAGAMENTO*");
    for (const row of report.payments) {
      lines.push(
        `• ${dailyClosingPaymentLabel(row.method)}: ${formatMoney(row.amountCents)} — ${pedidoCountLabel(row.orderCount)} — ${formatWhatsappPercentage(row.percentageBps)}`,
      );
    }
  }

  if (report.fulfillment.length > 0) {
    lines.push("", "🛵 *MODALIDADES*");
    for (const row of report.fulfillment) {
      lines.push(
        `• ${channelLabel(row.channel)}: ${pedidoCountLabel(row.orderCount)} — ${formatMoney(row.totalCents)}`,
      );
      if (row.deliveryFeesCents > 0) {
        lines.push(
          `  Produtos: ${formatMoney(row.productsSubtotalCents)} | Taxas: ${formatMoney(row.deliveryFeesCents)}`,
        );
      }
    }
  }

  if (report.products.length > 0) {
    lines.push("", "🍔 *PRODUTOS*");
    for (const row of report.products) {
      lines.push(
        `• ${row.quantity}x ${row.name} — ${formatMoney(row.amountCents)}`,
      );
    }
  }

  if (report.addons.length > 0) {
    lines.push("", "➕ *ADICIONAIS*");
    for (const row of report.addons) {
      lines.push(
        `• ${row.quantity}x ${row.name} — ${formatMoney(row.amountCents)}`,
      );
    }
  }

  if (report.cancelledOrders.length > 0) {
    lines.push("", "❌ *CANCELADOS*");
    for (const row of report.cancelledOrders) {
      lines.push(
        `• #${row.orderCode} — ${formatMoney(row.totalCents)}`,
      );
    }
    lines.push("Não incluídos no faturamento.");
  }

  lines.push(
    "",
    "ℹ️ *Observação*",
    "Fechamento operacional. Não representa caixa conciliado nem resultado fiscal.",
  );

  return `${lines.join("\n")}\n`;
}
