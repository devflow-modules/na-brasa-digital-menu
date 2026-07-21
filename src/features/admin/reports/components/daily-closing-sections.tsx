import { formatMoney } from "@/features/menu/format-money";
import { dailyClosingPaymentLabel } from "@/features/admin/reports/daily-closing-payment-labels";
import type { DailyClosingReport } from "@/features/admin/reports/daily-closing.types";

function channelLabel(
  channel: DailyClosingReport["fulfillment"][number]["channel"],
) {
  switch (channel) {
    case "DELIVERY":
      return "Entrega";
    case "PICKUP":
      return "Retirada";
    case "COUNTER":
      return "Balcão";
  }
}

type DailyClosingSectionsProps = {
  report: DailyClosingReport;
};

export function DailyClosingSections({ report }: DailyClosingSectionsProps) {
  const hasPayments = report.payments.length > 0;
  const hasFulfillment = report.fulfillment.length > 0;
  const hasProducts = report.products.length > 0;
  const hasAddons = report.addons.length > 0;
  const hasCancelled = report.cancelledOrders.length > 0;
  const hasDetailSections =
    hasPayments || hasFulfillment || hasProducts || hasAddons || hasCancelled;

  return (
    <div className="space-y-6" data-testid="daily-closing-sections">
      {report.summary.openOrders > 0 ? (
        <section
          data-testid="daily-closing-open-alert"
          className="rounded-2xl border border-amber-700/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
        >
          {report.summary.openOrders === 1
            ? "Atenção: existe 1 pedido ainda aberto no período. O valor desse pedido não está incluído no total."
            : `Atenção: existem ${report.summary.openOrders} pedidos ainda abertos no período. Os valores desses pedidos não estão incluídos no total.`}
        </section>
      ) : null}

      {hasDetailSections ? (
        <div className="space-y-6" data-testid="daily-closing-detail">
          <h2 className="text-base font-semibold tracking-wide text-stone-200">
            Detalhamento
          </h2>

          {hasPayments ? (
            <section data-testid="daily-closing-payments">
              <h3 className="text-sm font-semibold text-stone-100">
                Formas de pagamento
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-stone-200">
                {report.payments.map((row) => (
                  <li
                    key={row.method}
                    className="flex flex-wrap justify-between gap-2 border-b border-stone-800 py-2"
                  >
                    <span>{dailyClosingPaymentLabel(row.method)}</span>
                    <span>
                      {formatMoney(row.amountCents)} — {row.orderCount} pedidos
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasFulfillment ? (
            <section data-testid="daily-closing-fulfillment">
              <h3 className="text-sm font-semibold text-stone-100">
                Modalidades
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-stone-200">
                {report.fulfillment.map((row) => (
                  <li
                    key={row.channel}
                    className="flex flex-wrap justify-between gap-2 border-b border-stone-800 py-2"
                  >
                    <span>{channelLabel(row.channel)}</span>
                    <span>
                      {row.orderCount} pedidos — {formatMoney(row.totalCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasProducts ? (
            <section data-testid="daily-closing-products">
              <h3 className="text-sm font-semibold text-stone-100">
                Produtos vendidos
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-stone-200">
                {report.products.map((row) => (
                  <li
                    key={`${row.productId ?? "null"}-${row.name}`}
                    className="flex flex-wrap justify-between gap-2 border-b border-stone-800 py-2"
                  >
                    <span>{row.name}</span>
                    <span>
                      {row.quantity} — {formatMoney(row.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasAddons ? (
            <section data-testid="daily-closing-addons">
              <h3 className="text-sm font-semibold text-stone-100">
                Adicionais vendidos
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-stone-200">
                {report.addons.map((row) => (
                  <li
                    key={`${row.addonId ?? "null"}-${row.name}`}
                    className="flex flex-wrap justify-between gap-2 border-b border-stone-800 py-2"
                  >
                    <span>{row.name}</span>
                    <span>
                      {row.quantity} — {formatMoney(row.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasCancelled ? (
            <section data-testid="daily-closing-cancelled">
              <h3 className="text-sm font-semibold text-stone-100">
                Pedidos cancelados
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-stone-200">
                {report.cancelledOrders.map((row) => (
                  <li
                    key={row.orderCode}
                    className="flex flex-wrap justify-between gap-2 border-b border-stone-800 py-2"
                  >
                    <span>{row.orderCode}</span>
                    <span>{formatMoney(row.totalCents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      <section data-testid="daily-closing-notes">
        <h2 className="text-base font-semibold tracking-wide text-stone-200">
          Observações
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-300">
          {report.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
