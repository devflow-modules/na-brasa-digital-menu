import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDailyClosingPeriod } from "@/features/admin/reports/daily-closing-period";
import { aggregateDailyClosingReport } from "@/features/admin/reports/daily-closing.service";
import {
  escapeCsvCell,
  formatCsvMoney,
  formatCsvPercentage,
  formatDailyClosingCsv,
  protectCsvFormula,
  slugifyStoreNameForFilename,
} from "@/features/admin/reports/format-daily-closing-csv";
import type { DailyClosingReport } from "@/features/admin/reports/daily-closing.types";

function baseReport(
  overrides: Partial<DailyClosingReport> = {},
): DailyClosingReport {
  const periodResult = resolveDailyClosingPeriod({ date: "2026-07-21" });
  assert.equal(periodResult.ok, true);
  if (!periodResult.ok) {
    throw new Error("period");
  }

  const aggregated = aggregateDailyClosingReport({
    storeName: "Na Braza",
    period: periodResult.period,
    generatedAt: new Date("2026-07-22T01:15:00.000Z"),
    orders: [
      {
        code: "NB1001",
        status: "COMPLETED",
        source: "DIRECT",
        deliveryType: "DELIVERY",
        paymentMethod: "PIX",
        payments: [],
        subtotalCents: 1999,
        deliveryFeeCents: 600,
        totalCents: 2599,
        createdAt: new Date("2026-07-21T21:00:00.000Z"),
        items: [
          {
            productId: "p1",
            productNameSnapshot: "X-Burger",
            quantity: 1,
            unitPriceCents: 1999,
            totalCents: 1999,
            addons: [
              {
                addonId: "a1",
                addonNameSnapshot: "Bacon",
                addonPriceCents: 200,
              },
            ],
          },
        ],
      },
      {
        code: "NB1002",
        status: "CANCELLED",
        source: "DIRECT",
        deliveryType: "PICKUP",
        paymentMethod: "CASH",
        payments: [],
        subtotalCents: 3500,
        deliveryFeeCents: 0,
        totalCents: 3500,
        createdAt: new Date("2026-07-21T22:00:00.000Z"),
        items: [
          {
            productId: null,
            productNameSnapshot: "Cancelado",
            quantity: 1,
            unitPriceCents: 3500,
            totalCents: 3500,
            addons: [],
          },
        ],
      },
      {
        code: "NB1003",
        status: "PENDING",
        source: "DIRECT",
        deliveryType: "PICKUP",
        paymentMethod: "PIX",
        payments: [],
        subtotalCents: 5000,
        deliveryFeeCents: 0,
        totalCents: 5000,
        createdAt: new Date("2026-07-21T22:30:00.000Z"),
        items: [],
      },
    ],
  });

  return { ...aggregated, ...overrides };
}

describe("CSV helpers", () => {
  it("formats money and percentage from cents/bps", () => {
    assert.equal(formatCsvMoney(1999), "19,99");
    assert.equal(formatCsvMoney(0), "0,00");
    assert.equal(formatCsvMoney(600), "6,00");
    assert.equal(formatCsvPercentage(4938), "49,38%");
    assert.equal(formatCsvPercentage(0), "0,00%");
  });

  it("protects formula-leading cells and escapes delimiters", () => {
    assert.equal(protectCsvFormula("=2+2"), "'=2+2");
    assert.equal(protectCsvFormula("+SUM(A1:A2)"), "'+SUM(A1:A2)");
    assert.equal(protectCsvFormula("-10+20"), "'-10+20");
    assert.equal(protectCsvFormula("@IMPORTXML(...)"), "'@IMPORTXML(...)");
    assert.equal(escapeCsvCell("Produto; especial"), '"Produto; especial"');
    assert.equal(escapeCsvCell('Produto "duplo"'), '"Produto ""duplo"""');
    assert.equal(escapeCsvCell("Produto\nquebrado"), '"Produto\nquebrado"');
    assert.equal(escapeCsvCell("=HYPERLINK(...)"), "'=HYPERLINK(...)");
  });

  it("slugifies store names for filenames", () => {
    assert.equal(slugifyStoreNameForFilename("Na Braza"), "na-braza");
    assert.equal(slugifyStoreNameForFilename("Loja Açúcar & Cia"), "loja-acucar-cia");
  });
});

describe("formatDailyClosingCsv", () => {
  it("emits BOM, CRLF, semicolon delimiter and stable sections", () => {
    const csv = formatDailyClosingCsv(baseReport());
    assert.equal(csv.mimeType, "text/csv;charset=utf-8");
    assert.equal(
      csv.filename,
      "fechamento-operacional-na-braza-2026-07-21.csv",
    );
    assert.equal(csv.content.startsWith("\uFEFF"), true);
    assert.ok(csv.content.includes("\r\n"));
    assert.ok(!csv.content.includes("\n\n"));

    const body = csv.content.slice(1);
    assert.ok(body.includes("FECHAMENTO OPERACIONAL\r\n"));
    assert.ok(body.includes("RESUMO\r\n"));
    assert.ok(body.includes("PAGAMENTOS\r\n"));
    assert.ok(body.includes("MODALIDADES\r\n"));
    assert.ok(body.includes("PRODUTOS\r\n"));
    assert.ok(body.includes("ADICIONAIS\r\n"));
    assert.ok(body.includes("CANCELADOS\r\n"));
    assert.ok(body.includes("OBSERVAÇÕES\r\n"));
    assert.ok(body.includes("Loja;Na Braza"));
    assert.ok(body.includes("Data operacional;21/07/2026"));
    assert.ok(body.includes("Período;17:00–01:00"));
    assert.ok(body.includes("Timezone;America/Sao_Paulo"));
  });

  it("preserves financial values and separates fees", () => {
    const csv = formatDailyClosingCsv(baseReport());
    const body = csv.content.replace(/\u00a0/g, " ");
    assert.ok(body.includes("Subtotal de produtos;;19,99"));
    assert.ok(body.includes("Taxas de entrega;;6,00"));
    assert.ok(body.includes("Total vendido em pedidos concluídos;;25,99"));
    assert.ok(body.includes("Comandas com pagamento misto;0;"));
    assert.ok(body.includes("Pix;1;25,99;"));
    assert.ok(body.includes("X-Burger;1;19,99"));
    assert.ok(body.includes("Bacon;1;2,00"));
    assert.ok(body.includes("NB1002;"));
    assert.ok(body.includes("35,00"));
  });

  it("keeps open orders only as notes, never as revenue rows", () => {
    const csv = formatDailyClosingCsv(baseReport());
    assert.ok(csv.content.includes("Pedidos abertos;1;"));
    assert.ok(csv.content.includes("ainda aberto"));
    assert.equal(csv.content.includes("NB1003"), false);
  });

  it("handles empty completed report", () => {
    const periodResult = resolveDailyClosingPeriod({ date: "2026-07-21" });
    assert.equal(periodResult.ok, true);
    if (!periodResult.ok) return;

    const empty = aggregateDailyClosingReport({
      storeName: "Na Braza",
      period: periodResult.period,
      orders: [],
    });
    const csv = formatDailyClosingCsv(empty);
    assert.ok(csv.content.includes("Pedidos concluídos;0;"));
    assert.ok(csv.content.includes("Total vendido em pedidos concluídos;;0,00"));
    assert.ok(csv.content.includes("PRODUTOS\r\nProduto;Quantidade;Valor\r\n"));
  });

  it("never includes customer PII fields", () => {
    const csv = formatDailyClosingCsv(baseReport());
    assert.equal(csv.content.includes("customerPhone"), false);
    assert.equal(csv.content.includes("customerName"), false);
    assert.equal(csv.content.includes("deliveryAddress"), false);
    assert.equal(csv.content.includes("Telefone"), false);
  });

  it("neutralizes formula-like product names", () => {
    const report = baseReport();
    report.products = [
      {
        productId: null,
        name: "=2+2",
        quantity: 1,
        amountCents: 100,
      },
    ];
    const csv = formatDailyClosingCsv(report);
    assert.ok(csv.content.includes("'=2+2;1;1,00"));
  });
});
