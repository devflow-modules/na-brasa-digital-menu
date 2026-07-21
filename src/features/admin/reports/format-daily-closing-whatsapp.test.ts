import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDailyClosingPeriod } from "@/features/admin/reports/daily-closing-period";
import { aggregateDailyClosingReport } from "@/features/admin/reports/daily-closing.service";
import { formatDailyClosingWhatsapp } from "@/features/admin/reports/format-daily-closing-whatsapp";

describe("formatDailyClosingWhatsapp", () => {
  it("includes operational header and completed-sales wording", () => {
    const periodResult = resolveDailyClosingPeriod({ date: "2026-07-21" });
    assert.equal(periodResult.ok, true);
    if (!periodResult.ok) return;

    const report = aggregateDailyClosingReport({
      storeName: "Na Braza",
      period: periodResult.period,
      orders: [
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
      ],
    });

    const text = formatDailyClosingWhatsapp(report);

    assert.match(text, /FECHAMENTO OPERACIONAL — NA BRAZA/);
    assert.match(text, /Data operacional: 21\/07\/2026/);
    assert.match(text, /Período: 17:00–01:00/);
    assert.match(text, /TOTAL VENDIDO EM PEDIDOS CONCLUÍDOS/);
    assert.match(text, /Atenção: existe 1 pedido ainda aberto no período\./);
    assert.match(text, /O valor desse pedido não está incluído no total\./);
    assert.equal(text.includes("customerPhone"), false);
    assert.equal(text.includes("caixa conciliado"), true);
  });
});
