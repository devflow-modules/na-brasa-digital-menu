import type { DailyClosingPaymentMethod } from "@/features/admin/reports/daily-closing.types";
import { paymentMethodLabels } from "@/features/orders/payment-method";

export function dailyClosingPaymentLabel(
  method: DailyClosingPaymentMethod,
): string {
  if (method === "UNSET") {
    return "Não informado";
  }

  return paymentMethodLabels[method];
}
