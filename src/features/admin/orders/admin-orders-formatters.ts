import { formatMoney } from "@/features/menu/format-money";
import type {
  AdminDeliveryType,
  AdminOrderSource,
  AdminOrderStatus,
  AdminPaymentMethod,
} from "@/features/admin/orders/admin-orders.types";
import { formatPaymentMethodLabel } from "@/features/orders/payment-method";

export { formatMoney };

export function formatOrderStatus(status: AdminOrderStatus): string {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "CONFIRMED":
      return "Confirmado";
    case "PREPARING":
      return "Em preparo";
    case "READY":
      return "Pronto";
    case "OUT_FOR_DELIVERY":
      return "Saiu para entrega";
    case "COMPLETED":
      return "Concluído";
    case "CANCELLED":
      return "Cancelado";
  }
}

export function formatDeliveryType(type: AdminDeliveryType): string {
  return type === "DELIVERY" ? "Entrega" : "Retirada";
}

export function formatPaymentMethod(
  method: AdminPaymentMethod | null,
): string {
  if (method == null) {
    return "Pagamento pendente";
  }

  return formatPaymentMethodLabel(method);
}

export function formatOrderSource(source: AdminOrderSource): string {
  switch (source) {
    case "DIRECT":
      return "Online";
    case "COUNTER":
      return "Balcão";
    case "IFOOD":
      return "iFood";
    case "OTHER":
      return "Outro";
  }
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Neutral elapsed time since order creation (`now - createdAt`).
 * Not time-in-status. Uses Math.floor; future/zero → "Há pouco".
 * Pass `now` explicitly (do not rely on Date.now inside callers' tests).
 */
export function formatOrderElapsedTime(createdAt: Date, now: Date): string {
  const elapsedMs = Math.max(0, now.getTime() - createdAt.getTime());

  if (elapsedMs < MS_PER_MINUTE) {
    return "Há pouco";
  }

  const elapsedMinutes = Math.floor(elapsedMs / MS_PER_MINUTE);
  if (elapsedMinutes < 60) {
    return elapsedMinutes === 1 ? "Há 1 min" : `Há ${elapsedMinutes} min`;
  }

  const elapsedHours = Math.floor(elapsedMs / MS_PER_HOUR);
  if (elapsedHours < 24) {
    return elapsedHours === 1 ? "Há 1 h" : `Há ${elapsedHours} h`;
  }

  const elapsedDays = Math.floor(elapsedMs / MS_PER_DAY);
  return elapsedDays === 1 ? "Há 1 dia" : `Há ${elapsedDays} dias`;
}

export function formatPhone(phone: string | null): string {
  if (phone == null || phone.trim() === "") {
    return "Sem telefone";
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone;
}
