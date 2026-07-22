import { dailyClosingPaymentLabel } from "@/features/admin/reports/daily-closing-payment-labels";
import type {
  DailyClosingFulfillmentChannel,
  DailyClosingReport,
} from "@/features/admin/reports/daily-closing.types";

export type DailyClosingCsvExport = {
  filename: string;
  content: string;
  mimeType: "text/csv;charset=utf-8";
};

const UTF8_BOM = "\uFEFF";
const CRLF = "\r\n";

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

function formatOperationalDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

/** Neutralize Excel/Sheets formula injection. */
export function protectCsvFormula(value: string): string {
  if (value.length === 0) {
    return value;
  }

  const first = value[0];
  if (
    first === "=" ||
    first === "+" ||
    first === "-" ||
    first === "@" ||
    first === "\t" ||
    first === "\r"
  ) {
    return `'${value}`;
  }

  return value;
}

/**
 * Escape a CSV cell for `;` delimiter.
 * Applies formula protection first, then quotes when needed.
 */
export function escapeCsvCell(value: string | number): string {
  const raw = typeof value === "number" ? String(value) : value;
  const protectedValue = protectCsvFormula(raw);
  const needsQuotes =
    protectedValue.includes(";") ||
    protectedValue.includes('"') ||
    protectedValue.includes("\n") ||
    protectedValue.includes("\r");

  if (!needsQuotes) {
    return protectedValue;
  }

  return `"${protectedValue.replaceAll('"', '""')}"`;
}

/** Brazilian decimal without currency symbol (e.g. 19,90). */
export function formatCsvMoney(cents: number): string {
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  const sign = cents < 0 ? "-" : "";
  return `${sign}${whole},${fraction}`;
}

export function formatCsvPercentage(bps: number): string {
  const whole = Math.floor(bps / 100);
  const fraction = String(bps % 100).padStart(2, "0");
  return `${whole},${fraction}%`;
}

export function formatCsvDateTime(iso: string, timezone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  return `${map.day}/${map.month}/${map.year} ${map.hour}:${map.minute}:${map.second}`;
}

export function slugifyStoreNameForFilename(storeName: string): string {
  return storeName
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "loja";
}

export function buildDailyClosingCsvFilename(report: DailyClosingReport): string {
  const slug = slugifyStoreNameForFilename(report.storeName);
  return `fechamento-operacional-${slug}-${report.period.date}.csv`;
}

function joinRow(cells: Array<string | number>): string {
  return cells.map((cell) => escapeCsvCell(cell)).join(";");
}

function buildCsvSection(title: string, rows: Array<Array<string | number>>): string[] {
  return [title, ...rows.map((row) => joinRow(row))];
}

/**
 * Pure CSV serializer from DailyClosingReport.
 * No PII. No financial recalculation.
 */
export function formatDailyClosingCsv(
  report: DailyClosingReport,
): DailyClosingCsvExport {
  const lines: string[] = [];

  lines.push(
    ...buildCsvSection("FECHAMENTO OPERACIONAL", [
      ["Loja", report.storeName],
      ["Data operacional", formatOperationalDate(report.period.date)],
      ["Período", `${report.period.startTime}–${report.period.endTime}`],
      ["Timezone", report.period.timezone],
      [
        "Gerado em",
        formatCsvDateTime(report.generatedAtIso, report.period.timezone),
      ],
    ]),
  );
  lines.push("");

  lines.push(
    ...buildCsvSection("RESUMO", [
      ["Métrica", "Quantidade", "Valor"],
      ["Pedidos concluídos", report.summary.completedOrders, ""],
      ["Pedidos cancelados", report.summary.cancelledOrders, ""],
      ["Pedidos abertos", report.summary.openOrders, ""],
      ["Itens vendidos", report.summary.itemsSold, ""],
      [
        "Subtotal de produtos",
        "",
        formatCsvMoney(report.summary.productsSubtotalCents),
      ],
      [
        "Taxas de entrega",
        "",
        formatCsvMoney(report.summary.deliveryFeesCents),
      ],
      [
        "Total vendido em pedidos concluídos",
        "",
        formatCsvMoney(report.summary.grossTotalCents),
      ],
      ["Ticket médio", "", formatCsvMoney(report.summary.averageTicketCents)],
      [
        "Comandas com pagamento misto",
        report.summary.splitTenderCompletedOrders,
        "",
      ],
    ]),
  );
  lines.push("");

  lines.push(
    ...buildCsvSection("PAGAMENTOS", [
      ["Forma", "Pedidos", "Valor", "Percentual"],
      ...report.payments.map((row) => [
        dailyClosingPaymentLabel(row.method),
        row.orderCount,
        formatCsvMoney(row.amountCents),
        formatCsvPercentage(row.percentageBps),
      ]),
    ]),
  );
  lines.push("");

  lines.push(
    ...buildCsvSection("MODALIDADES", [
      ["Modalidade", "Pedidos", "Subtotal produtos", "Taxas de entrega", "Total"],
      ...report.fulfillment.map((row) => [
        channelLabel(row.channel),
        row.orderCount,
        formatCsvMoney(row.productsSubtotalCents),
        formatCsvMoney(row.deliveryFeesCents),
        formatCsvMoney(row.totalCents),
      ]),
    ]),
  );
  lines.push("");

  lines.push(
    ...buildCsvSection("PRODUTOS", [
      ["Produto", "Quantidade", "Valor"],
      ...report.products.map((row) => [
        row.name,
        row.quantity,
        formatCsvMoney(row.amountCents),
      ]),
    ]),
  );
  lines.push("");

  lines.push(
    ...buildCsvSection("ADICIONAIS", [
      ["Adicional", "Quantidade", "Valor"],
      ...report.addons.map((row) => [
        row.name,
        row.quantity,
        formatCsvMoney(row.amountCents),
      ]),
    ]),
  );
  lines.push("");

  lines.push(
    ...buildCsvSection("CANCELADOS", [
      ["Código", "Criado em", "Valor"],
      ...report.cancelledOrders.map((row) => [
        row.orderCode,
        formatCsvDateTime(row.createdAtIso, report.period.timezone),
        formatCsvMoney(row.totalCents),
      ]),
    ]),
  );
  lines.push("");

  lines.push(
    ...buildCsvSection("OBSERVAÇÕES", [
      ["Texto"],
      ...report.notes.map((note) => [note]),
    ]),
  );

  return {
    filename: buildDailyClosingCsvFilename(report),
    content: `${UTF8_BOM}${lines.join(CRLF)}${CRLF}`,
    mimeType: "text/csv;charset=utf-8",
  };
}
