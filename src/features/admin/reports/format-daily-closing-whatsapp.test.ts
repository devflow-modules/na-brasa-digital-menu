import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDailyClosingPeriod } from "@/features/admin/reports/daily-closing-period";
import { aggregateDailyClosingReport } from "@/features/admin/reports/daily-closing.service";
import { formatDailyClosingWhatsapp } from "@/features/admin/reports/format-daily-closing-whatsapp";
import type { DailyClosingOrderInput } from "@/features/admin/reports/daily-closing.types";

function buildReport(orders: DailyClosingOrderInput[], storeName = "Na Braza") {
  const periodResult = resolveDailyClosingPeriod({ date: "2026-07-21" });
  assert.equal(periodResult.ok, true);
  if (!periodResult.ok) {
    throw new Error("period failed");
  }

  return aggregateDailyClosingReport({
    storeName,
    period: periodResult.period,
    orders,
  });
}

describe("formatDailyClosingWhatsapp", () => {
  it("formats hierarchy, money, payments, channels, products and addons", () => {
    const report = buildReport([
      {
        code: "NB1001",
        status: "COMPLETED",
        source: "DIRECT",
        deliveryType: "DELIVERY",
        paymentMethod: "PIX",
        subtotalCents: 9000,
        deliveryFeeCents: 1200,
        totalCents: 10200,
        createdAt: new Date("2026-07-21T21:00:00.000Z"),
        items: [
          {
            productId: "p1",
            productNameSnapshot: "X-Burger",
            quantity: 3,
            unitPriceCents: 2000,
            totalCents: 6000,
            addons: [
              {
                addonId: "a1",
                addonNameSnapshot: "Bacon",
                addonPriceCents: 200,
              },
            ],
          },
          {
            productId: "p2",
            productNameSnapshot: "X-Salada",
            quantity: 2,
            unitPriceCents: 1500,
            totalCents: 3000,
            addons: [],
          },
        ],
      },
      {
        code: "NB1002",
        status: "COMPLETED",
        source: "DIRECT",
        deliveryType: "PICKUP",
        paymentMethod: "CASH",
        subtotalCents: 3000,
        deliveryFeeCents: 0,
        totalCents: 3000,
        createdAt: new Date("2026-07-21T22:00:00.000Z"),
        items: [
          {
            productId: "p1",
            productNameSnapshot: "X-Burger",
            quantity: 1,
            unitPriceCents: 3000,
            totalCents: 3000,
            addons: [],
          },
        ],
      },
      {
        code: "NB1003",
        status: "COMPLETED",
        source: "COUNTER",
        deliveryType: "PICKUP",
        paymentMethod: "CARD",
        subtotalCents: 3000,
        deliveryFeeCents: 0,
        totalCents: 3000,
        createdAt: new Date("2026-07-21T22:30:00.000Z"),
        items: [
          {
            productId: "p2",
            productNameSnapshot: "X-Salada",
            quantity: 2,
            unitPriceCents: 1500,
            totalCents: 3000,
            addons: [],
          },
        ],
      },
      {
        code: "NB1004",
        status: "COMPLETED",
        source: "DIRECT",
        deliveryType: "DELIVERY",
        paymentMethod: "PIX",
        subtotalCents: 0,
        deliveryFeeCents: 0,
        totalCents: 0,
        createdAt: new Date("2026-07-21T23:00:00.000Z"),
        items: [],
      },
      {
        code: "NB9999",
        status: "CANCELLED",
        source: "DIRECT",
        deliveryType: "PICKUP",
        paymentMethod: "PIX",
        subtotalCents: 3500,
        deliveryFeeCents: 0,
        totalCents: 3500,
        createdAt: new Date("2026-07-21T22:10:00.000Z"),
        items: [],
      },
      {
        code: "NBOPEN1",
        status: "PENDING",
        source: "DIRECT",
        deliveryType: "PICKUP",
        paymentMethod: "PIX",
        subtotalCents: 9999,
        deliveryFeeCents: 0,
        totalCents: 9999,
        createdAt: new Date("2026-07-21T23:30:00.000Z"),
        items: [],
      },
      {
        code: "NBOPEN2",
        status: "PREPARING",
        source: "DIRECT",
        deliveryType: "PICKUP",
        paymentMethod: "CASH",
        subtotalCents: 8888,
        deliveryFeeCents: 0,
        totalCents: 8888,
        createdAt: new Date("2026-07-21T23:40:00.000Z"),
        items: [],
      },
    ]);

    const text = formatDailyClosingWhatsapp(report);

    assert.match(text, /🔥 \*FECHAMENTO OPERACIONAL — NA BRAZA\*/);
    assert.match(text, /📅 \*Data operacional:\* 21\/07\/2026/);
    assert.match(text, /🕒 \*Período:\* 17:00–01:00/);
    assert.match(text, /⚠️ \*ATENÇÃO\*/);
    assert.match(text, /Existem 2 pedidos ainda abertos\./);
    assert.match(text, /Os valores não estão incluídos no total\./);
    assert.match(text, /💰 \*TOTAL VENDIDO EM PEDIDOS CONCLUÍDOS\*/);
    assert.match(text, /Pedidos: 4/);
    assert.match(text, /Taxas de entrega: R\$\s*12,00/);
    assert.match(text, /\*Total vendido: R\$\s*162,00\*/);
    assert.match(text, /💳 \*FORMAS DE PAGAMENTO\*/);
    assert.match(text, /• Pix: R\$\s*102,00 — 2 pedidos — /);
    assert.match(text, /%/);
    assert.match(text, /🛵 \*MODALIDADES\*/);
    assert.match(text, /• Entrega: 2 pedidos — R\$\s*102,00/);
    assert.match(text, /Produtos: R\$\s*90,00 \| Taxas: R\$\s*12,00/);
    assert.match(text, /• Retirada: 1 pedido — R\$\s*30,00/);
    assert.match(text, /🍔 \*PRODUTOS\*/);
    assert.match(text, /• 4x X-Burger — R\$\s*90,00/);
    assert.match(text, /➕ \*ADICIONAIS\*/);
    assert.match(text, /• 3x Bacon — R\$\s*6,00/);
    assert.match(text, /❌ \*CANCELADOS\*/);
    assert.match(text, /• #NB9999 — R\$\s*35,00/);
    assert.match(text, /Não incluídos no faturamento\./);
    assert.match(text, /ℹ️ \*Observação\*/);
    assert.match(
      text,
      /Fechamento operacional\. Não representa caixa conciliado nem resultado fiscal\./,
    );
    assert.equal(text.endsWith("\n"), true);
    assert.equal(text.includes("customerPhone"), false);
    assert.equal(text.includes("99,99"), false);
    assert.equal(text.includes("88,88"), false);
  });

  it("uses singular open-order warning and omits empty optional sections", () => {
    const report = buildReport([
      {
        code: "A1",
        status: "COMPLETED",
        source: "DIRECT",
        deliveryType: "PICKUP",
        paymentMethod: "PIX",
        subtotalCents: 2000,
        deliveryFeeCents: 0,
        totalCents: 2000,
        createdAt: new Date("2026-07-21T21:00:00.000Z"),
        items: [
          {
            productId: "p1",
            productNameSnapshot: "X-Burger",
            quantity: 1,
            unitPriceCents: 2000,
            totalCents: 2000,
            addons: [],
          },
        ],
      },
      {
        code: "O1",
        status: "PREPARING",
        source: "DIRECT",
        deliveryType: "PICKUP",
        paymentMethod: "PIX",
        subtotalCents: 1000,
        deliveryFeeCents: 0,
        totalCents: 1000,
        createdAt: new Date("2026-07-21T22:00:00.000Z"),
        items: [],
      },
    ]);

    const text = formatDailyClosingWhatsapp(report);

    assert.match(text, /Existe 1 pedido ainda aberto\./);
    assert.match(text, /O valor não está incluído no total\./);
    assert.equal(text.includes("ADICIONAIS"), false);
    assert.equal(text.includes("CANCELADOS"), false);
    assert.equal(text.includes("customerPhone"), false);
    assert.equal(text.includes("caixa conciliado"), true);
  });

  it("handles empty completed report without open alert when none", () => {
    const report = buildReport([]);
    const text = formatDailyClosingWhatsapp(report);

    assert.match(text, /Pedidos: 0/);
    assert.match(text, /\*Total vendido: R\$\s*0,00\*/);
    assert.equal(text.includes("ATENÇÃO"), false);
    assert.equal(text.includes("ADICIONAIS"), false);
    assert.equal(text.includes("CANCELADOS"), false);
    assert.equal(text.endsWith("\n"), true);
  });
});
